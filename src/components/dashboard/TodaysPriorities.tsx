import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertOctagon, AlertTriangle, Clock, CheckCircle2, 
  ChevronRight, ArrowRight, ShieldAlert, Wrench, Calendar, 
  Target, Filter, CheckSquare, BellRing, Flame, Sparkles, AlertCircle
} from 'lucide-react';
import { DashboardAlertItem } from './types';

interface TodaysPrioritiesProps {
  alerts: DashboardAlertItem[];
  onNavigate?: (tab: string) => void;
}

export default function TodaysPriorities({ alerts, onNavigate }: TodaysPrioritiesProps) {
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  const filteredAlerts = alerts.filter(a => {
    if (selectedPriority === 'All') return true;
    return a.priority === selectedPriority;
  });

  const criticalCount = alerts.filter(a => a.priority === 'Critical').length;
  const highCount = alerts.filter(a => a.priority === 'High').length;
  const mediumCount = alerts.filter(a => a.priority === 'Medium').length;
  const taskAlertsCount = alerts.filter(a => a.module === 'Daily Tasks').length;

  const getPriorityStyle = (p: string, isTask: boolean) => {
    switch (p) {
      case 'Critical':
        return {
          bg: 'bg-gradient-to-br from-rose-50/90 to-white text-rose-900 border-rose-200/90 hover:border-rose-400 hover:shadow-rose-500/10',
          dot: 'bg-rose-600',
          badge: 'bg-rose-600 text-white',
          tag: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: Flame
        };
      case 'High':
        return {
          bg: 'bg-gradient-to-br from-amber-50/90 to-white text-amber-900 border-amber-200/90 hover:border-amber-400 hover:shadow-amber-500/10',
          dot: 'bg-amber-600',
          badge: 'bg-amber-600 text-white',
          tag: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: AlertTriangle
        };
      case 'Medium':
        return {
          bg: isTask 
            ? 'bg-gradient-to-br from-indigo-50/70 to-white text-indigo-950 border-indigo-200/80 hover:border-indigo-400 hover:shadow-indigo-500/10'
            : 'bg-gradient-to-br from-yellow-50/80 to-white text-yellow-900 border-yellow-200/80 hover:border-yellow-400',
          dot: isTask ? 'bg-indigo-600' : 'bg-yellow-600',
          badge: isTask ? 'bg-indigo-600 text-white' : 'bg-yellow-600 text-white',
          tag: isTask ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: isTask ? CheckSquare : Clock
        };
      default:
        return {
          bg: 'bg-white text-slate-700 border-slate-200 hover:border-slate-400',
          dot: 'bg-slate-500',
          badge: 'bg-slate-600 text-white',
          tag: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: AlertCircle
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/85 shadow-sm p-5 md:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-700 flex items-center justify-center font-bold shadow-xs shrink-0"
          >
            <BellRing className="w-5 h-5 text-amber-600" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">Today's Priorities & Action Center</h3>
              {alerts.length > 0 && (
                <span className="text-xs bg-slate-900 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  {alerts.length} Action Items
                </span>
              )}
              {taskAlertsCount > 0 && (
                <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  {taskAlertsCount} Task Alerts
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live sorted priority queue across daily operational tasks and ERP navigators requiring prompt action.
            </p>
          </div>
        </div>

        {/* Priority Filter Buttons with layout animated pill */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Critical', 'High', 'Medium'] as const).map(p => {
            const count = p === 'All' ? alerts.length : p === 'Critical' ? criticalCount : p === 'High' ? highCount : mediumCount;
            const isSelected = selectedPriority === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`relative px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{p}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actionable items list with animated transitions */}
      <AnimatePresence mode="popLayout">
        {filteredAlerts.length === 0 ? (
          <motion.div 
            key="empty-state"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="p-8 text-center bg-gradient-to-b from-emerald-50/50 to-gray-50/30 rounded-2xl border border-dashed border-emerald-200/80"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 shadow-xs"
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </motion.div>
            <div className="text-sm font-bold text-gray-900">All Clear — No Pending Alerts</div>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              There are no {selectedPriority !== 'All' ? selectedPriority.toLowerCase() : ''} urgent actionable alert items for the selected scope. All task flows and plant lines are operating on schedule.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="alert-grid"
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
          >
            {filteredAlerts.map((alert, index) => {
              const isTask = alert.module === 'Daily Tasks';
              const style = getPriorityStyle(alert.priority, isTask);
              const PriorityIcon = style.icon;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  key={alert.id}
                  onClick={() => onNavigate?.(alert.targetTab)}
                  className={`p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${style.bg} group relative overflow-hidden`}
                >
                  {isTask && (
                    <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot} ${
                          alert.priority === 'Critical' ? 'animate-ping' : ''
                        }`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${style.tag}`}>
                          <PriorityIcon className="w-2.5 h-2.5" />
                          {alert.priority}
                        </span>
                        <span className="text-[11px] font-bold text-gray-700 truncate">
                          {alert.module}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold bg-white/95 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs shrink-0">
                        {alert.badge}
                      </span>
                    </div>

                    <div className="mb-3">
                      <h4 className="font-bold text-xs text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                        {isTask && <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                        <span>{alert.title}</span>
                      </h4>
                      <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed font-normal">
                        {alert.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                    <span className="flex items-center gap-1">
                      {alert.actionText || 'Take Action'}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-white/80 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
