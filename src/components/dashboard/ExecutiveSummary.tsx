import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, AlertTriangle, CheckCircle2, Clock, 
  ArrowRight, ShieldAlert, Cpu, Award, Users, AlertOctagon, CheckSquare
} from 'lucide-react';

interface ExecutiveSummaryProps {
  taskStats: {
    total: number;
    todayDue: number;
    overdue: number;
    pending: number;
    inProgress: number;
    completed: number;
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
  employeeCount: number;
  dateRangeLabel: string;
  onNavigate?: (tab: string) => void;
}

export default function ExecutiveSummary({
  taskStats,
  leaveStats,
  machineStats,
  breakdownStats,
  kpiStats,
  employeeCount,
  dateRangeLabel,
  onNavigate
}: ExecutiveSummaryProps) {
  // Construct dynamic real-data narrative
  const summarySentences: string[] = [];

  // Employee count
  summarySentences.push(`Tracking ${employeeCount} active staff across operational departments.`);

  // Tasks sentence
  if (taskStats.total > 0) {
    if (taskStats.overdue > 0) {
      summarySentences.push(`${taskStats.total} daily tasks recorded with ${taskStats.overdue} overdue and ${taskStats.todayDue} due today.`);
    } else {
      summarySentences.push(`${taskStats.total} daily tasks recorded with ${taskStats.completed} completed and 0 overdue.`);
    }
  }

  // Leaves sentence
  const pendingLeaves = leaveStats.pendingApproval + leaveStats.hrPending;
  if (pendingLeaves > 0) {
    summarySentences.push(`${pendingLeaves} leave application(s) require supervisor or HR action.`);
  } else {
    summarySentences.push(`All leave submissions are up-to-date with ${leaveStats.settled} settled.`);
  }

  // Machines & Breakdowns sentence
  if (breakdownStats.activeDownCount > 0) {
    summarySentences.push(`${breakdownStats.activeDownCount} machine(s) are currently under breakdown downtime out of ${machineStats.total} fleet units.`);
  } else {
    summarySentences.push(`Fleet operations are stable across ${machineStats.active} active machines (${machineStats.totalDailyCapacity.toLocaleString()} pcs/day nominal capacity).`);
  }

  // KPI sentence
  if (kpiStats.totalEvaluated > 0) {
    summarySentences.push(`Average KPI achievement is ${Math.round(kpiStats.avgAchievement)}% (${kpiStats.belowTargetCount} staff require performance attention).`);
  }

  const hasUrgentAttention = taskStats.overdue > 0 || breakdownStats.activeDownCount > 0 || pendingLeaves > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className={`rounded-2xl p-5 md:p-6 mb-6 border transition-all ${
        hasUrgentAttention
          ? 'bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-white border-amber-200/90 shadow-xs'
          : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white border-emerald-200/90 shadow-xs'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasUrgentAttention ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Executive Operations Summary ({dateRangeLabel})
            </h2>
          </div>

          <p className="text-sm md:text-[15px] font-medium text-gray-800 leading-relaxed">
            {summarySentences.join(' ')}
          </p>
        </div>

        {/* Quick Action Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {taskStats.overdue > 0 ? (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate?.('tasks')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100/90 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl border border-rose-300 transition-colors shadow-xs cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              <span>{taskStats.overdue} Overdue Tasks</span>
              <ArrowRight className="w-3 h-3 text-rose-600" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate?.('tasks')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors shadow-xs cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>{taskStats.completed}/{taskStats.total} Tasks Done</span>
              <ArrowRight className="w-3 h-3 text-indigo-600" />
            </motion.button>
          )}

          {pendingLeaves > 0 && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate?.('leave')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/90 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-colors shadow-xs cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>{pendingLeaves} Pending Leave</span>
              <ArrowRight className="w-3 h-3 text-amber-700" />
            </motion.button>
          )}

          {breakdownStats.activeDownCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate?.('breakdown')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100/90 hover:bg-rose-200 text-rose-900 text-xs font-bold rounded-xl border border-rose-300 transition-colors shadow-xs cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-rose-700" />
              <span>{breakdownStats.activeDownCount} Machine Down</span>
              <ArrowRight className="w-3 h-3 text-rose-700" />
            </motion.button>
          )}

          {kpiStats.belowTargetCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate?.('kpi')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100/90 hover:bg-yellow-200 text-yellow-900 text-xs font-bold rounded-xl border border-yellow-300 transition-colors shadow-xs cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-yellow-700" />
              <span>{kpiStats.belowTargetCount} Below Target</span>
              <ArrowRight className="w-3 h-3 text-yellow-700" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
