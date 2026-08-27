import React from 'react';
import { motion } from 'motion/react';
import { 
  History, CheckSquare, Calendar, Wrench, Target, 
  Clock, AlertTriangle, ArrowRight, ShieldCheck, UserCheck, Sparkles 
} from 'lucide-react';
import { RecentActivityItem } from './types';

interface RecentActivityProps {
  activities: RecentActivityItem[];
  onNavigate?: (tab: string) => void;
}

export default function RecentActivity({ activities, onNavigate }: RecentActivityProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckSquare;
      case 'leave': return Calendar;
      case 'machine': return Wrench;
      case 'breakdown': return AlertTriangle;
      case 'kpi': return Target;
      case 'shift': return Clock;
      default: return History;
    }
  };

  const getBadgeStyle = (variant?: string) => {
    switch (variant) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="bg-white rounded-2xl border border-gray-200/85 shadow-sm p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Recent Enterprise Activity & Audit Trail</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Live chronological feed of task completions, leave approvals, maintenance logs, and roster modifications.
            </p>
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
          <div className="text-sm font-bold text-gray-600">No Recent Activity Records</div>
          <p className="text-xs text-gray-400 mt-1">Actions performed across tasks and the ERP will stream live into this feed.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {activities.map((act, index) => {
            const Icon = getIcon(act.type);
            const isTask = act.type === 'task';

            return (
              <motion.div 
                key={act.id} 
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className={`py-3 px-3 flex items-start justify-between gap-3 hover:bg-slate-50/90 rounded-xl transition-all cursor-pointer group ${
                  isTask ? 'hover:bg-indigo-50/40' : ''
                }`}
                onClick={() => act.targetTab && onNavigate?.(act.targetTab)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 mt-0.5 shadow-2xs ${
                    isTask 
                      ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' 
                      : 'bg-gray-100 text-gray-700 group-hover:bg-emerald-600 group-hover:text-white'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {act.title}
                      </span>
                      {act.statusBadge && (
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getBadgeStyle(act.statusBadge.variant)}`}>
                          {act.statusBadge.text}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
                      {act.description}
                    </p>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2 font-mono">
                      <span>By: <strong className="text-gray-600">{act.actor}</strong></span>
                      <span>•</span>
                      <span>{act.timeAgo}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 group-hover:bg-white border border-transparent group-hover:border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-all">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
