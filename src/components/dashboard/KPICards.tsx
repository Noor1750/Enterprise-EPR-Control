import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, CheckSquare, Calendar, Wrench, Target, 
  AlertTriangle, Clock, TrendingUp, TrendingDown, ArrowUpRight,
  ShieldCheck, AlertOctagon, CheckCircle2, ChevronRight, Briefcase, Sparkles
} from 'lucide-react';

interface KPICardsProps {
  employeeCount: number;
  inactiveEmployeeCount: number;
  departmentCount: number;
  taskStats: {
    total: number;
    todayDue: number;
    inProgress: number;
    pending: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  leaveStats: {
    total: number;
    pendingApproval: number;
    hrPending: number;
    settled: number;
    rejected: number;
  };
  machineStats: {
    total: number;
    active: number;
    obsolete: number;
    totalDailyCapacity: number;
  };
  kpiStats: {
    totalEvaluated: number;
    avgAchievement: number;
    avgRating: number;
    belowTargetCount: number;
  };
  breakdownStats: {
    total: number;
    activeDownCount: number;
    hoursLost: number;
    totalCost: number;
  };
  shiftStats: {
    aShiftCount: number;
    bShiftCount: number;
    generalCount: number;
    overrideCount: number;
    weekLabel: string;
  };
  onNavigate?: (tab: string) => void;
  onDrilldown?: (type: 'tasks' | 'leaves' | 'machines' | 'breakdowns' | 'kpis' | 'employees', title: string) => void;
}

export default function KPICards({
  employeeCount,
  inactiveEmployeeCount,
  departmentCount,
  taskStats,
  leaveStats,
  machineStats,
  kpiStats,
  breakdownStats,
  shiftStats,
  onNavigate,
  onDrilldown
}: KPICardsProps) {
  const cards = [
    {
      id: 'directory',
      drillType: 'employees' as const,
      title: 'Total Employees',
      mainValue: employeeCount.toLocaleString(),
      subLabel: `${departmentCount} Departments`,
      badge: inactiveEmployeeCount > 0 ? `${inactiveEmployeeCount} Inactive` : '100% Active',
      badgeType: 'neutral' as const,
      progress: Math.min(100, (employeeCount / Math.max(1, employeeCount + inactiveEmployeeCount)) * 100),
      icon: Users,
      accentColor: 'text-blue-600',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      hoverBorder: 'hover:border-blue-400',
      progressBarColor: 'bg-blue-600',
      details: [
        { label: 'Active Staff', value: employeeCount },
        { label: 'Depts Covered', value: departmentCount },
      ],
      targetTab: 'directory'
    },
    {
      id: 'tasks',
      drillType: 'tasks' as const,
      title: 'Daily Tasks',
      mainValue: taskStats.total.toLocaleString(),
      subLabel: `${taskStats.completionRate}% Completion`,
      badge: taskStats.overdue > 0 ? `${taskStats.overdue} Overdue` : taskStats.todayDue > 0 ? `${taskStats.todayDue} Due Today` : `${taskStats.completed} Done`,
      badgeType: taskStats.overdue > 0 ? ('danger' as const) : taskStats.todayDue > 0 ? ('warning' as const) : ('success' as const),
      progress: taskStats.completionRate,
      icon: CheckSquare,
      accentColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      hoverBorder: 'hover:border-indigo-400 ring-indigo-500/20',
      progressBarColor: taskStats.overdue > 0 ? 'bg-gradient-to-r from-amber-500 to-indigo-600' : 'bg-indigo-600',
      isTaskFeatured: true,
      details: [
        { label: 'In Progress', value: taskStats.inProgress },
        { label: 'Completed', value: taskStats.completed }
      ],
      targetTab: 'tasks'
    },
    {
      id: 'leave',
      drillType: 'leaves' as const,
      title: 'Leave Applications',
      mainValue: leaveStats.total.toLocaleString(),
      subLabel: `${leaveStats.settled} Settled`,
      badge: (leaveStats.pendingApproval + leaveStats.hrPending) > 0 
        ? `${leaveStats.pendingApproval + leaveStats.hrPending} Action Req.` 
        : 'All Clear',
      badgeType: (leaveStats.pendingApproval + leaveStats.hrPending) > 0 ? ('warning' as const) : ('success' as const),
      progress: leaveStats.total > 0 ? Math.round((leaveStats.settled / leaveStats.total) * 100) : 100,
      icon: Calendar,
      accentColor: 'text-teal-600',
      iconBg: 'bg-teal-50 text-teal-600 border-teal-200/60',
      hoverBorder: 'hover:border-teal-400',
      progressBarColor: 'bg-teal-600',
      details: [
        { label: 'Pending Review', value: leaveStats.pendingApproval },
        { label: 'HR Pending', value: leaveStats.hrPending }
      ],
      targetTab: 'leave'
    },
    {
      id: 'machine',
      drillType: 'machines' as const,
      title: 'Machine Capacity',
      mainValue: `${machineStats.active} Active`,
      subLabel: `${machineStats.totalDailyCapacity.toLocaleString()} pcs/day`,
      badge: machineStats.obsolete > 0 ? `${machineStats.obsolete} Obsolete` : 'Fleet 100% Active',
      badgeType: machineStats.obsolete > 0 ? ('warning' as const) : ('success' as const),
      progress: machineStats.total > 0 ? Math.round((machineStats.active / machineStats.total) * 100) : 100,
      icon: Wrench,
      accentColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      hoverBorder: 'hover:border-emerald-400',
      progressBarColor: 'bg-emerald-600',
      details: [
        { label: 'Total Fleet', value: `${machineStats.total} Units` },
        { label: 'Daily Nominal', value: `${machineStats.totalDailyCapacity.toLocaleString()} pcs` }
      ],
      targetTab: 'machine'
    },
    {
      id: 'kpi',
      drillType: 'kpis' as const,
      title: 'Monthly KPI Score',
      mainValue: kpiStats.totalEvaluated > 0 ? `${Math.round(kpiStats.avgAchievement)}%` : '—',
      subLabel: kpiStats.totalEvaluated > 0 ? `Rating: ${kpiStats.avgRating.toFixed(1)} / 5.0` : 'No evaluations',
      badge: kpiStats.belowTargetCount > 0 ? `${kpiStats.belowTargetCount} Below Target` : 'Target Achieved',
      badgeType: kpiStats.belowTargetCount > 0 ? ('warning' as const) : ('success' as const),
      progress: kpiStats.totalEvaluated > 0 ? Math.round(kpiStats.avgAchievement) : 0,
      icon: Target,
      accentColor: 'text-amber-600',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      hoverBorder: 'hover:border-amber-400',
      progressBarColor: 'bg-amber-600',
      details: [
        { label: 'Evaluated Staff', value: kpiStats.totalEvaluated },
        { label: 'Avg Rating', value: kpiStats.avgRating > 0 ? `${kpiStats.avgRating.toFixed(1)} / 5.0` : '—' }
      ],
      targetTab: 'kpi'
    },
    {
      id: 'breakdown',
      drillType: 'breakdowns' as const,
      title: 'Equipment Downtime',
      mainValue: `${breakdownStats.hoursLost} hrs`,
      subLabel: `${breakdownStats.total} Incident(s)`,
      badge: breakdownStats.activeDownCount > 0 ? `${breakdownStats.activeDownCount} Down Now` : 'All Running',
      badgeType: breakdownStats.activeDownCount > 0 ? ('danger' as const) : ('success' as const),
      progress: breakdownStats.activeDownCount > 0 ? 30 : 95,
      icon: AlertTriangle,
      accentColor: 'text-rose-600',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200/60',
      hoverBorder: 'hover:border-rose-400',
      progressBarColor: 'bg-rose-600',
      details: [
        { label: 'Maintenance Cost', value: `৳${breakdownStats.totalCost.toLocaleString()}` },
        { label: 'Active Down', value: breakdownStats.activeDownCount }
      ],
      targetTab: 'breakdown'
    },
    {
      id: 'shifts',
      drillType: 'employees' as const,
      title: 'Shift Rostering',
      mainValue: `${shiftStats.aShiftCount + shiftStats.bShiftCount + shiftStats.generalCount} Roster`,
      subLabel: shiftStats.weekLabel || 'Current Rotation',
      badge: shiftStats.overrideCount > 0 ? `${shiftStats.overrideCount} Overrides` : 'Balanced Schedule',
      badgeType: 'neutral' as const,
      progress: 90,
      icon: Clock,
      accentColor: 'text-purple-600',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/60',
      hoverBorder: 'hover:border-purple-400',
      progressBarColor: 'bg-purple-600',
      details: [
        { label: 'Day / Night', value: `${shiftStats.aShiftCount} / ${shiftStats.bShiftCount}` },
        { label: 'General Duty', value: shiftStats.generalCount }
      ],
      targetTab: 'shifts'
    }
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              onClick={() => {
                if (onDrilldown) {
                  onDrilldown(card.drillType, card.title);
                } else {
                  onNavigate?.(card.targetTab);
                }
              }}
              className={`bg-white rounded-2xl p-4 border border-gray-200/85 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${card.hoverBorder} ${
                card.isTaskFeatured ? 'ring-1 ring-indigo-500/30 shadow-indigo-500/5' : ''
              }`}
            >
              {/* Subtle top glow accent for task & featured cards */}
              {card.isTaskFeatured && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
              )}

              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-200 shrink-0 group-hover:scale-110 ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition-all ${
                  card.badgeType === 'danger'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-extrabold'
                    : card.badgeType === 'warning'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : card.badgeType === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {card.badge}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate flex items-center gap-1" title={card.title}>
                  <span>{card.title}</span>
                  {card.isTaskFeatured && (
                    <Sparkles className="w-3 h-3 text-indigo-500 inline shrink-0" />
                  )}
                </div>
                <div className="text-xl font-black text-gray-900 tracking-tight mt-0.5 group-hover:text-indigo-600 transition-colors">
                  {card.mainValue}
                </div>
                <div className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">
                  {card.subLabel}
                </div>
              </div>

              {/* Micro Progress Line with Motion */}
              <div className="my-2.5">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(5, card.progress))}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.05, ease: 'easeOut' }}
                    className={`h-full rounded-full ${card.progressBarColor}`}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-1 text-[10px]">
                {card.details.map((d, i) => (
                  <div key={i} className="truncate">
                    <div className="text-gray-400 font-medium truncate">{d.label}</div>
                    <div className="font-bold text-gray-700 truncate">{d.value}</div>
                  </div>
                ))}
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

