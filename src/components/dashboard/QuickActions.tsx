import React from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, CheckSquare, Calendar, Wrench, AlertTriangle, 
  Target, Clock, Users, FileText, Settings, Shield, Sparkles
} from 'lucide-react';
import { UserSecurityScope } from '../../lib/security';

interface QuickActionsProps {
  userSecurityScope?: UserSecurityScope;
  onNavigate?: (tab: string) => void;
}

export default function QuickActions({ userSecurityScope, onNavigate }: QuickActionsProps) {
  const isAdminOrManager = userSecurityScope?.isAdmin || userSecurityScope?.isSupervisor || userSecurityScope?.role === 'Manager';

  const actions = [
    {
      label: 'New Daily Task',
      desc: 'Assign operational task',
      icon: CheckSquare,
      targetTab: 'tasks',
      color: 'hover:border-indigo-400 hover:bg-indigo-50/60 text-indigo-700 hover:shadow-indigo-500/10',
      iconBg: 'group-hover:bg-indigo-600 group-hover:text-white',
      featured: true
    },
    {
      label: 'Apply Leave',
      desc: 'Submit leave request',
      icon: Calendar,
      targetTab: 'leave',
      color: 'hover:border-teal-400 hover:bg-teal-50/60 text-teal-700',
      iconBg: 'group-hover:bg-teal-600 group-hover:text-white'
    },
    {
      label: 'Log Breakdown',
      desc: 'Report line stoppage',
      icon: AlertTriangle,
      targetTab: 'breakdown',
      color: 'hover:border-rose-400 hover:bg-rose-50/60 text-rose-700',
      iconBg: 'group-hover:bg-rose-600 group-hover:text-white'
    },
    ...(isAdminOrManager ? [
      {
        label: 'Register Machine',
        desc: 'Add plant machinery',
        icon: Wrench,
        targetTab: 'machine',
        color: 'hover:border-emerald-400 hover:bg-emerald-50/60 text-emerald-700',
        iconBg: 'group-hover:bg-emerald-600 group-hover:text-white'
      },
      {
        label: 'Enter Monthly KPI',
        desc: 'Record performance score',
        icon: Target,
        targetTab: 'kpi',
        color: 'hover:border-amber-400 hover:bg-amber-50/60 text-amber-700',
        iconBg: 'group-hover:bg-amber-600 group-hover:text-white'
      },
      {
        label: 'Shift Assignments',
        desc: 'Weekly roster rotations',
        icon: Clock,
        targetTab: 'shifts',
        color: 'hover:border-purple-400 hover:bg-purple-50/60 text-purple-700',
        iconBg: 'group-hover:bg-purple-600 group-hover:text-white'
      },
      {
        label: 'Employee Directory',
        desc: 'Personnel & rosters',
        icon: Users,
        targetTab: 'directory',
        color: 'hover:border-blue-400 hover:bg-blue-50/60 text-blue-700',
        iconBg: 'group-hover:bg-blue-600 group-hover:text-white'
      },
      {
        label: 'Executive Reports',
        desc: 'Export data & insights',
        icon: FileText,
        targetTab: 'reports',
        color: 'hover:border-slate-400 hover:bg-slate-50/60 text-slate-700',
        iconBg: 'group-hover:bg-slate-700 group-hover:text-white'
      }
    ] : [])
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 md:p-6 mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Quick Navigation & Action Triggers</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            1-click shortcuts directly into core ERP creation workflows and registers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate?.(action.targetTab)}
              className={`p-3 rounded-xl border border-gray-200/85 bg-white transition-all text-left flex flex-col justify-between group shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden ${action.color} ${
                action.featured ? 'ring-1 ring-indigo-500/30' : ''
              }`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gray-50 border border-gray-200/60 flex items-center justify-center mb-2 text-current transition-all duration-200 ${action.iconBg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-current leading-tight flex items-center justify-between gap-1">
                  <span>{action.label}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                  {action.desc}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
