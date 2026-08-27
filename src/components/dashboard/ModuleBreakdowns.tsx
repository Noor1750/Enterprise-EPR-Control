import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { 
  CheckSquare, Calendar, Wrench, Target, AlertTriangle, Clock, 
  ArrowRight, Award, UserCheck, CheckCircle2, TrendingUp, Cpu
} from 'lucide-react';
import { Task } from '../../lib/taskEngine';
import { KPIRecord } from '../kpi/types';

interface ModuleBreakdownsProps {
  tasks: Task[];
  leaves: any[];
  machines: string[][];
  kpiRecords: KPIRecord[];
  breakdowns: any[];
  shifts: any[];
  onNavigate?: (tab: string) => void;
}

export default function ModuleBreakdowns({
  tasks,
  leaves,
  machines,
  kpiRecords,
  breakdowns,
  shifts,
  onNavigate
}: ModuleBreakdownsProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'leave' | 'machine' | 'kpi' | 'breakdown' | 'shifts'>('tasks');

  // --- Task Charts Data ---
  const taskStatusCounts = {
    Completed: tasks.filter(t => t.status === 'Completed').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    Pending: tasks.filter(t => t.status === 'Pending').length,
    Overdue: tasks.filter(t => t.status === 'Overdue').length,
    'On Hold': tasks.filter(t => t.status === 'On Hold').length,
  };
  const taskStatusData = Object.entries(taskStatusCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  const taskPriorityCounts = {
    Critical: tasks.filter(t => t.priority === 'Critical').length,
    High: tasks.filter(t => t.priority === 'High').length,
    Medium: tasks.filter(t => t.priority === 'Medium').length,
    Low: tasks.filter(t => t.priority === 'Low').length,
  };
  const taskPriorityData = Object.entries(taskPriorityCounts).map(([name, value]) => ({ name, value }));

  // --- Leave Charts Data ---
  const leaveStatusCounts: Record<string, number> = {};
  leaves.forEach(l => {
    const status = l[8] || 'Pending';
    leaveStatusCounts[status] = (leaveStatusCounts[status] || 0) + 1;
  });
  const leaveStatusData = Object.entries(leaveStatusCounts).map(([name, value]) => ({ name, value }));

  const leaveTypeCounts: Record<string, number> = {};
  leaves.forEach(l => {
    const type = l[18] || 'Annual Leave';
    leaveTypeCounts[type] = (leaveTypeCounts[type] || 0) + 1;
  });
  const leaveTypeData = Object.entries(leaveTypeCounts).map(([name, value]) => ({ name, value }));

  // --- Machine Charts Data (Age distribution) ---
  const now = new Date();
  const machineAgeCounts = {
    '< 1 Year': 0,
    '1 - 3 Years': 0,
    '3 - 5 Years': 0,
    '5 - 10 Years': 0,
    '10+ Years': 0,
    'Unknown': 0
  };
  let activeMachinesCount = 0;
  let obsoleteMachinesCount = 0;

  machines.forEach(m => {
    const onboard = m[24];
    const obsolete = m[25];
    if (obsolete && new Date(obsolete) <= now) {
      obsoleteMachinesCount++;
    } else {
      activeMachinesCount++;
    }

    if (onboard) {
      const d = new Date(onboard);
      const diffYears = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears < 1) machineAgeCounts['< 1 Year']++;
      else if (diffYears < 3) machineAgeCounts['1 - 3 Years']++;
      else if (diffYears < 5) machineAgeCounts['3 - 5 Years']++;
      else if (diffYears < 10) machineAgeCounts['5 - 10 Years']++;
      else machineAgeCounts['10+ Years']++;
    } else {
      machineAgeCounts['Unknown']++;
    }
  });

  const machineAgeData = Object.entries(machineAgeCounts).map(([name, value]) => ({ name, value }));

  // --- KPI Charts Data ---
  const kpiRatingCounts = { '5 Star (Excellent)': 0, '4 Star (Good)': 0, '3 Star (Average)': 0, '2 Star (Low)': 0, '1 Star (Min)': 0 };
  kpiRecords.forEach(r => {
    if (r.rating >= 5) kpiRatingCounts['5 Star (Excellent)']++;
    else if (r.rating >= 4) kpiRatingCounts['4 Star (Good)']++;
    else if (r.rating >= 3) kpiRatingCounts['3 Star (Average)']++;
    else if (r.rating >= 2) kpiRatingCounts['2 Star (Low)']++;
    else kpiRatingCounts['1 Star (Min)']++;
  });
  const kpiRatingData = Object.entries(kpiRatingCounts).map(([name, value]) => ({ name, value }));

  // Top performers
  const topPerformers = [...kpiRecords]
    .sort((a, b) => b.achievement - a.achievement)
    .slice(0, 5);

  const attentionRequiredKpi = [...kpiRecords]
    .filter(r => r.achievement < 80)
    .sort((a, b) => a.achievement - b.achievement)
    .slice(0, 5);

  // --- Breakdown Failure Modes ---
  const failureModeCounts: Record<string, number> = {};
  breakdowns.forEach(b => {
    const mode = b[18] || 'General Breakdown';
    failureModeCounts[mode] = (failureModeCounts[mode] || 0) + 1;
  });
  const failureModeData = Object.entries(failureModeCounts).map(([name, value]) => ({ name, value }));

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#E11D48', '#8B5CF6', '#06B6D4'];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 md:p-6 mb-6">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">Module Deep-Dive & Analytics Hub</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Granular charts, operational distributions, and performance breakdown.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100/90 p-1 rounded-xl overflow-x-auto text-xs font-bold">
          {[
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'leave', label: 'Leave', icon: Calendar },
            { id: 'machine', label: 'Machine Fleet', icon: Wrench },
            { id: 'kpi', label: 'KPI & Quality', icon: Target },
            { id: 'breakdown', label: 'Breakdown Log', icon: AlertTriangle },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Tasks */}
      {activeTab === 'tasks' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Task Status Breakdown
              </h4>
              <div className="h-52 w-full">
                {taskStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {taskStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">No tasks in current period</div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Task Priority Distribution
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskPriorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 text-right">
            <button
              onClick={() => onNavigate?.('tasks')}
              className="text-xs font-bold text-[#1ABB9C] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Daily Tasks Navigator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Leave */}
      {activeTab === 'leave' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Leave Status Workflow
              </h4>
              <div className="h-52 w-full">
                {leaveStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leaveStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {leaveStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">No leave records in period</div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Leave Type Breakdown
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 text-right">
            <button
              onClick={() => onNavigate?.('leave')}
              className="text-xs font-bold text-[#1ABB9C] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Leave Management Navigator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Machine Fleet */}
      {activeTab === 'machine' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Machine Age Distribution
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={machineAgeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Fleet Operational Readiness
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="text-[10px] uppercase font-bold text-emerald-600">Active Machines</div>
                    <div className="text-2xl font-black text-emerald-800 mt-1">{activeMachinesCount}</div>
                    <div className="text-[11px] text-emerald-600 font-medium">In active production</div>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <div className="text-[10px] uppercase font-bold text-amber-600">Obsolete / Decommissioned</div>
                    <div className="text-2xl font-black text-amber-800 mt-1">{obsoleteMachinesCount}</div>
                    <div className="text-[11px] text-amber-600 font-medium">Past obsolete date</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-600">
                Total Registered Equipment: <strong>{machines.length} units</strong> across all manufacturing & packaging lines.
              </div>
            </div>
          </div>

          <div className="mt-4 text-right">
            <button
              onClick={() => onNavigate?.('machine')}
              className="text-xs font-bold text-[#1ABB9C] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Machine Capacity Navigator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: KPI */}
      {activeTab === 'kpi' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Quality & Rating Distribution (1–5 Stars)
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kpiRatingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Top Performers & Leadership
              </h4>
              {topPerformers.length > 0 ? (
                <div className="space-y-2">
                  {topPerformers.map(r => (
                    <div key={r.kpiId} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 text-xs">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <strong className="text-gray-900">{r.employeeName}</strong>
                          <span className="text-gray-400 text-[10px] ml-1.5">({r.department})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-emerald-600">{r.achievement}% Achievement</span>
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                          {r.rating} ★
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 p-4 text-center">No KPI evaluations recorded yet</div>
              )}
            </div>
          </div>

          <div className="mt-4 text-right">
            <button
              onClick={() => onNavigate?.('kpi')}
              className="text-xs font-bold text-[#1ABB9C] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Monthly KPI Navigator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Breakdown */}
      {activeTab === 'breakdown' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Breakdown Failure Modes & Categories
              </h4>
              <div className="h-52 w-full">
                {failureModeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={failureModeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#E11D48" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">No breakdowns logged</div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Recent Equipment Incidents
              </h4>
              {breakdowns.length > 0 ? (
                <div className="space-y-2">
                  {breakdowns.slice(0, 4).map((b, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-gray-900 mb-0.5">
                        <span>{b[3] || 'Machine'} ({b[4] || ''})</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          b[26] === 'Closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {b[26] || 'Open'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 line-clamp-1">{b[5] || 'No description'}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Downtime: {b[14] || '—'} • Dept: {b[2]}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 p-4 text-center">Zero equipment breakdowns logged</div>
              )}
            </div>
          </div>

          <div className="mt-4 text-right">
            <button
              onClick={() => onNavigate?.('breakdown')}
              className="text-xs font-bold text-[#1ABB9C] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Breakdown Log Navigator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
