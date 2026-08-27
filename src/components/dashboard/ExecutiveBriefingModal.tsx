import React from 'react';
import { 
  X, Printer, Download, Sparkles, Building2, CheckSquare, 
  Calendar, Wrench, Target, Users, Clock, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { getErpName } from '../../lib/appSettings';
import { format } from 'date-fns';
import { DepartmentMetric, DashboardAlertItem } from './types';

interface ExecutiveBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRangeLabel: string;
  employeeCount: number;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  leaveStats: {
    total: number;
    pendingApproval: number;
    hrPending: number;
    settled: number;
  };
  machineStats: {
    total: number;
    active: number;
    obsolete: number;
    totalDailyCapacity: number;
  };
  breakdownStats: {
    total: number;
    activeDownCount: number;
    hoursLost: number;
    totalCost: number;
  };
  kpiStats: {
    totalEvaluated: number;
    avgAchievement: number;
    avgRating: number;
    belowTargetCount: number;
  };
  departmentMetrics: DepartmentMetric[];
  alerts: DashboardAlertItem[];
  userSecurityScope?: any;
}

export default function ExecutiveBriefingModal({
  isOpen,
  onClose,
  dateRangeLabel,
  employeeCount,
  taskStats,
  leaveStats,
  machineStats,
  breakdownStats,
  kpiStats,
  departmentMetrics,
  alerts,
  userSecurityScope
}: ExecutiveBriefingModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const criticalAlerts = alerts.filter(a => a.priority === 'Critical' || a.priority === 'High');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1ABB9C] to-emerald-400 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Executive Management Briefing</h2>
              <p className="text-xs text-slate-300">Period: {dateRangeLabel} • Generated {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Briefing</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-gray-800 print:p-0">
          {/* Executive Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                Enterprise Operations Report
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                {getErpName().toUpperCase()} • EXECUTIVE STATUS BRIEF
              </h1>
              <p className="text-xs text-gray-500">
                Prepared for: {userSecurityScope?.employeeName || 'Executive Leadership'} ({userSecurityScope?.role || 'Administrator'})
              </p>
            </div>
            <div className="text-right text-xs text-gray-500 font-mono">
              <div>Date: {format(new Date(), 'yyyy-MM-dd')}</div>
              <div>Interval: {dateRangeLabel}</div>
            </div>
          </div>

          {/* Core Macro Highlights (4 Box Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold uppercase text-slate-500">Workforce</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{employeeCount}</div>
              <div className="text-xs text-slate-600 font-medium">{departmentMetrics.length} Departments</div>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold uppercase text-slate-500">Task Velocity</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{taskStats.completionRate}%</div>
              <div className="text-xs text-slate-600 font-medium">{taskStats.completed} / {taskStats.total} Completed</div>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold uppercase text-slate-500">Nominal Capacity</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{machineStats.totalDailyCapacity.toLocaleString()}</div>
              <div className="text-xs text-slate-600 font-medium">{machineStats.active} Active Fleet Units</div>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold uppercase text-slate-500">KPI Quality</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{kpiStats.totalEvaluated > 0 ? `${Math.round(kpiStats.avgAchievement)}%` : '—'}</div>
              <div className="text-xs text-slate-600 font-medium">{kpiStats.totalEvaluated} Staff Evaluated</div>
            </div>
          </div>

          {/* Critical Operational Attention Items */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5 border-b pb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Priorities & Actionable Bottlenecks ({criticalAlerts.length})
            </h3>
            {criticalAlerts.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                All major operations are within standard operating parameters. No high-priority bottlenecks detected.
              </p>
            ) : (
              <div className="space-y-2">
                {criticalAlerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-950 mr-2">[{alert.module}]</span>
                      <span className="font-semibold text-slate-800">{alert.title}</span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">{alert.subtitle}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 shrink-0">
                      {alert.badge}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Breakdown Table */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5 border-b pb-1">
              <Building2 className="w-4 h-4 text-slate-700" />
              Department Operations Snapshot
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-2 text-right">Staff</th>
                    <th className="py-2 px-2 text-right">Tasks</th>
                    <th className="py-2 px-2 text-right">Done %</th>
                    <th className="py-2 px-2 text-right">Capacity (pcs)</th>
                    <th className="py-2 px-2 text-right">Downtime (hrs)</th>
                    <th className="py-2 px-2 text-right">KPI Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {departmentMetrics.map(dept => {
                    const taskDoneRate = dept.taskCount > 0 ? Math.round((dept.tasksCompleted / dept.taskCount) * 100) : 100;
                    return (
                      <tr key={dept.department} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{dept.department}</td>
                        <td className="py-2 px-2 text-right font-mono">{dept.employeeCount}</td>
                        <td className="py-2 px-2 text-right font-mono">{dept.taskCount}</td>
                        <td className="py-2 px-2 text-right font-mono">{taskDoneRate}%</td>
                        <td className="py-2 px-2 text-right font-mono">{dept.dailyCapacity.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono text-rose-600">{dept.breakdownHours}h</td>
                        <td className="py-2 px-2 text-right font-mono font-bold">{dept.avgKpiScore > 0 ? `${Math.round(dept.avgKpiScore)}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plant & Equipment Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-600" />
                Fleet Maintenance & Downtime
              </h4>
              <p className="text-slate-600 text-[11px]">
                Total recorded downtime is <strong>{breakdownStats.hoursLost} hours</strong> across <strong>{breakdownStats.total} incident(s)</strong>, with an estimated maintenance expenditure of <strong>৳{breakdownStats.totalCost.toLocaleString()}</strong>.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                HR & Leave Management
              </h4>
              <p className="text-slate-600 text-[11px]">
                Total recorded leave applications is <strong>{leaveStats.total}</strong> with <strong>{leaveStats.settled} settled</strong> and <strong>{leaveStats.pendingApproval + leaveStats.hrPending} pending sign-off</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0 print:hidden">
          <span className="text-xs text-gray-500">Official Operational Briefing Document</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
          >
            Close Briefing
          </button>
        </div>
      </div>
    </div>
  );
}
