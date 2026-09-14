import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  PowerOff, 
  Calendar, 
  Search, 
  Plus, 
  CheckCircle2, 
  Layers, 
  Building2, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  RefreshCw,
  Cpu,
  Info
} from 'lucide-react';
import { MachinePlanRecord, MachineStatusType } from '../../types/machinePlan';
import { formatNumeric, cleanParseNumber } from '../../lib/machinePlanEngine';

interface UnplannedMachineItem {
  model: string;
  department: string;
  uom: string;
  speed: number;
  utilization: number;
  existingRecord?: MachinePlanRecord;
  unplannedType: 'No Record' | 'Zero Plan Hours' | 'Turned OFF' | 'Idle / Standby';
  offReason?: string;
}

interface UnplannedMachinesViewProps {
  machineOptions: Array<{
    model: string;
    department: string;
    uom: string;
    speed: number;
    utilization: number;
  }>;
  records: MachinePlanRecord[];
  currentDate: string;
  onSelectDate: (date: string) => void;
  onPlanMachine: (machineModel: string, date: string) => void;
  onPutMachineOff: (machine: { model: string; department: string }) => void;
  departments: string[];
}

export default function UnplannedMachinesView({
  machineOptions,
  records,
  currentDate,
  onSelectDate,
  onPlanMachine,
  onPutMachineOff,
  departments
}: UnplannedMachinesViewProps) {
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'All' | 'No Record' | 'Turned OFF' | 'Zero Plan Hours'>('All');

  // Compute unplanned machines for the selected currentDate
  const { unplannedList, totalFleetCount, plannedCount, offCount } = useMemo(() => {
    const list: UnplannedMachineItem[] = [];
    let planned = 0;
    let off = 0;

    // Filter records for the target date
    const dateRecords = records.filter(r => r.date === currentDate);
    const dateRecordMap = new Map<string, MachinePlanRecord>();
    dateRecords.forEach(r => {
      dateRecordMap.set(r.machineModel.toLowerCase().trim(), r);
    });

    machineOptions.forEach(m => {
      const existing = dateRecordMap.get(m.model.toLowerCase().trim());

      if (!existing) {
        // Absolutely no plan record found for this date
        list.push({
          model: m.model,
          department: m.department || 'General',
          uom: m.uom || 'PCS',
          speed: m.speed || 2000,
          utilization: m.utilization || 90,
          unplannedType: 'No Record'
        });
      } else {
        const isPlanZero = existing.planHours <= 0;
        const isOff = existing.machineStatus === 'Off';
        const isIdle = existing.machineStatus === 'Idle' || existing.machineStatus === 'No Plan';

        if (isOff) {
          off++;
          list.push({
            model: m.model,
            department: existing.department || m.department || 'General',
            uom: existing.uom || m.uom || 'PCS',
            speed: existing.specSpeedPerHour || m.speed || 2000,
            utilization: m.utilization || 90,
            existingRecord: existing,
            unplannedType: 'Turned OFF',
            offReason: existing.offReason || (existing.remarks?.startsWith('[OFF:') ? existing.remarks : undefined)
          });
        } else if (isPlanZero || isIdle) {
          list.push({
            model: m.model,
            department: existing.department || m.department || 'General',
            uom: existing.uom || m.uom || 'PCS',
            speed: existing.specSpeedPerHour || m.speed || 2000,
            utilization: m.utilization || 90,
            existingRecord: existing,
            unplannedType: 'Zero Plan Hours'
          });
        } else {
          planned++;
        }
      }
    });

    return {
      unplannedList: list,
      totalFleetCount: machineOptions.length,
      plannedCount: planned,
      offCount: off
    };
  }, [machineOptions, records, currentDate]);

  // Filtered displayed unplanned machines
  const filteredList = useMemo(() => {
    return unplannedList.filter(item => {
      if (selectedDept !== 'All' && item.department.toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }
      if (filterType !== 'All' && item.unplannedType !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchModel = item.model.toLowerCase().includes(q);
        const matchDept = item.department.toLowerCase().includes(q);
        const matchReason = (item.offReason || '').toLowerCase().includes(q);
        return matchModel || matchDept || matchReason;
      }
      return true;
    });
  }, [unplannedList, selectedDept, filterType, searchQuery]);

  return (
    <div className="space-y-4" id="unplanned-machines-view-root">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Unplanned Machines & Standby Fleet
            </h2>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {unplannedList.length} Unplanned
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Machines with no plan record, 0 plan hours, or marked OFF for {currentDate}. Plan them or assign downtime reasons.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Date:</label>
          <div className="relative">
            <input
              type="date"
              value={currentDate}
              onChange={e => onSelectDate(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Fleet */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Fleet Capacity</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalFleetCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total registered machines</div>
        </div>

        {/* Planned */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Planned Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{plannedCount}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Active production schedules</div>
        </div>

        {/* Unplanned (Highlighted) */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Unplanned Fleet</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{unplannedList.length}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Needs plan or OFF reason</div>
        </div>

        {/* Turned OFF */}
        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Marked OFF</span>
            <PowerOff className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">{offCount}</div>
          <div className="text-[11px] text-rose-700 mt-0.5">Logged with reason</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Status:</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="All">All Unplanned ({unplannedList.length})</option>
              <option value="No Record">No Plan Record</option>
              <option value="Turned OFF">Turned OFF</option>
              <option value="Zero Plan Hours">Zero Plan Hours</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search unplanned machine..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Unplanned Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Showing <strong>{filteredList.length}</strong> unplanned machine{filteredList.length !== 1 ? 's' : ''} for {currentDate}
          </span>
          <span className="text-[11px] text-slate-500">
            Click "Plan Now" to schedule or "Put OFF" to document downtime reason
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3.5 w-12 text-center">SL</th>
                <th className="py-3 px-3.5">Machine Model</th>
                <th className="py-3 px-3.5">Department</th>
                <th className="py-3 px-3.5">Standard UOM</th>
                <th className="py-3 px-3.5 text-right">Spec Speed / H</th>
                <th className="py-3 px-3.5">Current Status</th>
                <th className="py-3 px-3.5">Logged Reason</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-slate-800 text-sm">All Machines Planned!</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      No unplanned or unassigned machines found matching this filter.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  const isOff = item.unplannedType === 'Turned OFF';
                  return (
                    <tr 
                      key={`${item.model}-${index}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOff ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* SL */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-semibold">
                        {index + 1}
                      </td>

                      {/* Machine Model */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 font-mono">{item.model}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-slate-700">{item.department}</span>
                      </td>

                      {/* UOM */}
                      <td className="py-3 px-3.5 font-mono text-slate-600">
                        {item.uom}
                      </td>

                      {/* Spec Speed */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-700">
                        {formatNumeric(item.speed)} {item.uom}/H
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3.5">
                        {isOff ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <PowerOff className="w-3 h-3" />
                            Turned OFF
                          </span>
                        ) : item.unplannedType === 'Zero Plan Hours' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            0 Plan Hours
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            No Plan Record
                          </span>
                        )}
                      </td>

                      {/* Logged Reason */}
                      <td className="py-3 px-3.5">
                        {item.offReason ? (
                          <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 block max-w-xs truncate" title={item.offReason}>
                            {item.offReason}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No reason logged</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPlanMachine(item.model, currentDate)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Schedule Daily Plan"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Plan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onPutMachineOff({ model: item.model, department: item.department })}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            title="Put Machine OFF with Reason"
                          >
                            <PowerOff className="w-3 h-3" />
                            <span>Put OFF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
