import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';
import { CalculatedMachinePlanItem, MachinePlanSummaryKPIs, MachinePlanThresholds } from '../../types/machinePlan';
import { formatNumeric } from '../../lib/machinePlanEngine';

interface MachinePlanVisualDashboardProps {
  items: CalculatedMachinePlanItem[];
  kpis: MachinePlanSummaryKPIs;
  thresholds: MachinePlanThresholds;
}

const STATUS_COLORS: Record<string, string> = {
  'Running': '#10b981', // emerald
  'Planned': '#3b82f6', // blue
  'Idle': '#f59e0b', // amber
  'Breakdown': '#ef4444', // red
  'Maintenance': '#f97316', // orange
  'Holiday': '#64748b', // slate
  'No Plan': '#94a3b8',
  'Completed': '#059669',
  'Partially Completed': '#8b5cf6'
};

export default function MachinePlanVisualDashboard({
  items,
  kpis,
  thresholds
}: MachinePlanVisualDashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Machine Target vs Actual data (limit to top 10 for readability)
  const machineChartData = items.slice(0, 10).map(item => ({
    name: item.machineModel.length > 12 ? `${item.machineModel.substring(0, 10)}...` : item.machineModel,
    fullName: item.machineModel,
    target: item.targetOutput,
    actual: item.actualOutput,
    uom: item.uom,
    achievement: item.achievementPct
  }));

  // Machine Status Pie data
  const statusCounts: Record<string, number> = {};
  items.forEach(item => {
    statusCounts[item.machineStatus] = (statusCounts[item.machineStatus] || 0) + 1;
  });

  const pieData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status],
    color: STATUS_COLORS[status] || '#64748b'
  }));

  // Department aggregate
  const deptMap = new Map<string, { target: number; actual: number; count: number; ueeSum: number; ueeCount: number }>();
  items.forEach(item => {
    const existing = deptMap.get(item.department) || { target: 0, actual: 0, count: 0, ueeSum: 0, ueeCount: 0 };
    existing.target += item.targetOutput;
    existing.actual += item.actualOutput;
    existing.count += 1;
    if (item.totalUeePct !== null) {
      existing.ueeSum += item.totalUeePct;
      existing.ueeCount += 1;
    }
    deptMap.set(item.department, existing);
  });

  const deptData = Array.from(deptMap.entries()).map(([dept, data]) => {
    const ach = data.target > 0 ? Math.round((data.actual / data.target) * 100) : 0;
    const avgUee = data.ueeCount > 0 ? (data.ueeSum / data.ueeCount).toFixed(1) : 'N/A';
    return {
      department: dept,
      target: data.target,
      actual: data.actual,
      achievement: ach,
      avgUee,
      count: data.count
    };
  });

  // Top & Bottom performers by achievement % (min target > 0)
  const rankedItems = [...items]
    .filter(i => i.targetOutput > 0 && i.achievementPct !== null)
    .sort((a, b) => (b.achievementPct || 0) - (a.achievementPct || 0));

  const topPerformers = rankedItems.slice(0, 3);
  const bottomPerformers = rankedItems.filter(i => (i.achievementPct || 0) < thresholds.achievementAttention).slice(-3);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden" id="machine-plan-visual-dashboard">
      {/* Header with collapse button */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-all select-none"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Visual Analytics & Machine Fleet Distribution
          </span>
          <span className="text-[11px] text-slate-500 font-normal ml-2">
            Target vs Actual Comparison · Fleet Status · Department Performance
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          <span className="text-xs font-medium">{isCollapsed ? 'Expand Charts' : 'Collapse'}</span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Bar Chart: Target vs Actual (7 cols) */}
          <div className="lg:col-span-6 bg-slate-50/40 p-3.5 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-800">Plan Target vs Actual Output</span>
              <span className="text-[11px] text-slate-500">Top 10 Machines</span>
            </div>
            <div className="h-56 w-full">
              {machineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={machineChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      angle={-20} 
                      textAnchor="end"
                      height={35}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any, name: any) => [formatNumeric(val), name === 'target' ? 'Target Output' : 'Actual Output']}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${item.fullName} (${item.achievement !== null ? `${item.achievement}% achieved` : 'No target'})` : label;
                      }}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} 
                      formatter={(val) => val === 'target' ? 'Target Output' : 'Actual Output'}
                    />
                    <Bar dataKey="target" fill="#93c5fd" radius={[4, 4, 0, 0]} name="target" />
                    <Bar dataKey="actual" fill="#2563eb" radius={[4, 4, 0, 0]} name="actual" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No machine production data available for selected filter
                </div>
              )}
            </div>
          </div>

          {/* Machine Status Distribution (3 cols) */}
          <div className="lg:col-span-3 bg-slate-50/40 p-3.5 rounded-xl border border-slate-200/60 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">Fleet Machine Status</span>
              <PieIcon className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="h-44 w-full relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={62}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any, name: any) => [`${val} Machines`, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No status data
                </div>
              )}
            </div>
            {/* Status Legend Pills */}
            <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-slate-200/60">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1 text-[11px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200/70">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span>{d.name}:</span>
                  <span className="font-semibold text-slate-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Performance & Ranking (3 cols) */}
          <div className="lg:col-span-3 bg-slate-50/40 p-3.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Department Overview</span>
                <Layers className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {deptData.slice(0, 4).map(d => (
                  <div key={d.department} className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800">{d.department}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        d.achievement >= thresholds.achievementExcellent ? 'bg-emerald-50 text-emerald-700' :
                        d.achievement >= thresholds.achievementGood ? 'bg-sky-50 text-sky-700' :
                        d.achievement >= thresholds.achievementAttention ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {d.achievement}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          d.achievement >= thresholds.achievementExcellent ? 'bg-emerald-500' :
                          d.achievement >= thresholds.achievementGood ? 'bg-sky-500' :
                          d.achievement >= thresholds.achievementAttention ? 'bg-amber-500' : 'bg-rose-500'
                        }`} 
                        style={{ width: `${Math.min(100, Math.max(0, d.achievement))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>{formatNumeric(d.actual)} / {formatNumeric(d.target)}</span>
                      <span>Avg UEE: {d.avgUee !== 'N/A' ? `${d.avgUee}%` : 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick attention footnote */}
            {bottomPerformers.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 text-[10px] text-rose-600 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Underperforming: {bottomPerformers.map(b => b.machineModel).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
