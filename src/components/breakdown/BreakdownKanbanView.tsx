import React, { useState, useMemo } from 'react';
import { BreakdownRecord, BreakdownStatus } from '../../types/breakdown';
import { UserSecurityScope } from '../../lib/security';
import { 
  Wrench, AlertTriangle, Clock, CheckCircle2, UserCheck, 
  Layers, Lock, Sparkles, ArrowRight, Activity, DollarSign,
  Zap, Package, Check, ChevronRight, Edit, Eye, Filter, User
} from 'lucide-react';
import { calculateWorkingHourLost } from '../../lib/breakdownUtils';

interface BreakdownKanbanViewProps {
  records: BreakdownRecord[];
  machinesList: string[][];
  employeesList: string[][];
  holidaysList?: string[][];
  overridesList?: string[][];
  shiftsList?: string[][];
  userSecurityScope?: UserSecurityScope;
  onOpenRecord: (record: BreakdownRecord, mode?: 'report' | 'maintenance') => void;
  onOpenCalculationDetails: (record: BreakdownRecord) => void;
  onQuickStatusChange: (record: BreakdownRecord, newStatus: BreakdownStatus) => void;
  onQuickAssignTech: (record: BreakdownRecord) => void;
}

interface ColumnDefinition {
  id: BreakdownStatus;
  title: string;
  subtitle: string;
  icon: any;
  headerBg: string;
  badgeBg: string;
  borderColor: string;
  nextStatus?: BreakdownStatus;
  nextActionLabel?: string;
}

const KANBAN_COLUMNS: ColumnDefinition[] = [
  {
    id: 'Open',
    title: 'Reported / Open',
    subtitle: 'Awaiting technician response',
    icon: AlertTriangle,
    headerBg: 'bg-rose-50/80 text-rose-900',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    borderColor: 'border-rose-300',
    nextStatus: 'Maintenance in Progress',
    nextActionLabel: 'Start Repair'
  },
  {
    id: 'Under Investigation',
    title: 'Under Investigation',
    subtitle: 'Diagnosing root cause',
    icon: Activity,
    headerBg: 'bg-blue-50/80 text-blue-900',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    nextStatus: 'Maintenance in Progress',
    nextActionLabel: 'Begin Work'
  },
  {
    id: 'Maintenance in Progress',
    title: 'In Progress',
    subtitle: 'Active repair & calibration',
    icon: Wrench,
    headerBg: 'bg-indigo-50/80 text-indigo-900',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    borderColor: 'border-indigo-300',
    nextStatus: 'Completed',
    nextActionLabel: 'Mark Fixed'
  },
  {
    id: 'Waiting for Spare Parts',
    title: 'Waiting for Parts / Service',
    subtitle: 'Blocked on parts or vendor',
    icon: Layers,
    headerBg: 'bg-purple-50/80 text-purple-900',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-300',
    nextStatus: 'Maintenance in Progress',
    nextActionLabel: 'Parts Received'
  },
  {
    id: 'Completed',
    title: 'Completed & Testing',
    subtitle: 'Repaired & machine restarted',
    icon: CheckCircle2,
    headerBg: 'bg-emerald-50/80 text-emerald-900',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-300',
    nextStatus: 'Closed',
    nextActionLabel: 'Verify & Close'
  },
  {
    id: 'Closed',
    title: 'Closed & Verified',
    subtitle: 'Finalized in logbook',
    icon: Lock,
    headerBg: 'bg-slate-100 text-slate-800',
    badgeBg: 'bg-slate-200 text-slate-700 border-slate-300',
    borderColor: 'border-slate-300'
  }
];

export default function BreakdownKanbanView({
  records,
  machinesList,
  employeesList,
  holidaysList = [],
  overridesList = [],
  shiftsList = [],
  userSecurityScope,
  onOpenRecord,
  onOpenCalculationDetails,
  onQuickStatusChange,
  onQuickAssignTech
}: BreakdownKanbanViewProps) {
  
  // Group records by column
  const columnData = useMemo(() => {
    const map = new Map<BreakdownStatus, BreakdownRecord[]>();
    KANBAN_COLUMNS.forEach(col => map.set(col.id, []));

    records.forEach(r => {
      // Map 'Waiting for Service' into 'Waiting for Spare Parts' column for compact view
      const targetCol = r.status === 'Waiting for Service' ? 'Waiting for Spare Parts' : r.status;
      const list = map.get(targetCol);
      if (list) {
        list.push(r);
      } else {
        const openList = map.get('Open');
        if (openList) openList.push(r);
      }
    });

    return map;
  }, [records]);

  return (
    <div className="space-y-4">
      {/* Workflow Guidance Strip */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            Visual Maintenance Workflow Board:
          </span>
          <span className="text-slate-500">
            Track tickets across stages, advance status with 1-click, and monitor active downtime.
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Red = Production Stopped</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Green = Machine Running</span>
          </div>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {KANBAN_COLUMNS.map(col => {
          const items = columnData.get(col.id) || [];
          const IconComponent = col.icon;

          return (
            <div 
              key={col.id}
              className="bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-xs flex flex-col min-h-[580px]"
            >
              {/* Column Header */}
              <div className={`p-3 rounded-t-xl border-b ${col.headerBg} border-slate-200/80`}>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <h3 className="font-black text-xs tracking-tight">{col.title}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${col.badgeBg}`}>
                    {items.length}
                  </span>
                </div>
                <p className="text-[10px] opacity-75 mt-0.5 font-medium">{col.subtitle}</p>
              </div>

              {/* Column Body / Cards List */}
              <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[750px] custom-scrollbar">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs italic">
                    No tickets in this stage
                  </div>
                ) : (
                  items.map(record => {
                    // Calculate downtime & lost pcs
                    const calc = calculateWorkingHourLost(
                      record.date,
                      record.reportAt,
                      record.machineStartDate || record.date,
                      record.machineStartAt,
                      record.productionStop,
                      holidaysList,
                      overridesList,
                      record.machineName,
                      machinesList,
                      record.department,
                      shiftsList
                    );

                    const hours = calc.decimalHours || (Number(record.hourLostHours) || 0);
                    const lostPcs = calc.lostPcs;
                    const isStopped = record.productionStop === 'Yes';
                    const hasTech = Boolean(record.attendByName || record.attendById);

                    return (
                      <div
                        key={record.id}
                        className={`bg-white rounded-xl p-3 border shadow-xs hover:shadow-md transition-all relative group flex flex-col justify-between ${
                          isStopped && record.status !== 'Closed' && record.status !== 'Completed'
                            ? 'border-rose-300 ring-1 ring-rose-200/50'
                            : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {/* Card Header: ID & Dept & Stop Pill */}
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <button
                              onClick={() => onOpenCalculationDetails(record)}
                              className="font-mono text-xs font-black text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1"
                              title="View Calculation Math"
                            >
                              <span>{record.id}</span>
                              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                            </button>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {record.department}
                            </span>
                          </div>

                          {/* Machine & Production Stop Banner */}
                          <div className="mb-2">
                            <div className="font-black text-xs text-slate-900 flex items-center justify-between">
                              <span className="truncate" title={record.machineName}>{record.machineName}</span>
                              {record.machineNo && (
                                <span className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1 py-0.5 rounded ml-1">
                                  {record.machineNo}
                                </span>
                              )}
                            </div>

                            {/* Stoppage Alert */}
                            {isStopped ? (
                              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                                <span>PRODUCTION STOPPED</span>
                              </div>
                            ) : (
                              <div className="mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-md inline-block">
                                🟢 Running with defect
                              </div>
                            )}
                          </div>

                          {/* Problem Description */}
                          <p className="text-xs text-slate-700 line-clamp-2 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                            {record.problemDescription}
                          </p>

                          {/* Timing & Metrics Strip */}
                          <div className="grid grid-cols-2 gap-1.5 py-1.5 border-y border-slate-100 text-[11px] mb-2">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase block">Reported At</span>
                              <span className="font-mono font-bold text-slate-700">{record.date} {record.reportAt}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase block">Hours Lost</span>
                              <span className={`font-mono font-black ${hours > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                                {calc.formatted}
                              </span>
                            </div>
                          </div>

                          {/* Production Loss & Cost if any */}
                          {(lostPcs > 0 || Number(record.totalCost || 0) > 0) && (
                            <div className="flex items-center justify-between text-[10px] font-bold mb-2 px-2 py-1 bg-amber-50/60 rounded border border-amber-200/60 text-amber-900">
                              {lostPcs > 0 && (
                                <span>📉 Lost: {lostPcs.toLocaleString()} {calc.standardUnit}</span>
                              )}
                              {Number(record.totalCost || 0) > 0 && (
                                <span className="text-emerald-800">Cost: ${Number(record.totalCost).toFixed(2)}</span>
                              )}
                            </div>
                          )}

                          {/* Attended By / Assign Tech */}
                          <div className="flex items-center justify-between text-[11px] mb-3">
                            <span className="text-[10px] text-slate-400 font-medium">Technician:</span>
                            {hasTech ? (
                              <span className="font-bold text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                <UserCheck className="w-3 h-3 text-blue-600" />
                                {record.attendByName || record.attendById}
                              </span>
                            ) : (
                              <button
                                onClick={() => onQuickAssignTech(record)}
                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition"
                              >
                                + Assign Tech
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          {/* Left: View / Edit */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onOpenRecord(record, 'maintenance')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                              title="Open Full Maintenance Workflow Modal"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenCalculationDetails(record)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                              title="Calculation Transparency"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            </button>
                          </div>

                          {/* Right: Advance Stage Action */}
                          {col.nextStatus && (
                            <button
                              onClick={() => onQuickStatusChange(record, col.nextStatus!)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition active:scale-95"
                              title={`Advance to ${col.nextStatus}`}
                            >
                              <span>{col.nextActionLabel || 'Next'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
