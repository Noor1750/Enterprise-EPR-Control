import React from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, CheckSquare, Calendar, Wrench, AlertTriangle, 
  Target, Clock, Users, FileText, Settings, Shield, Sparkles
} from 'lucide-react';
import { UserSecurityScope } from '../../lib/security';
import { resolvePaletteForModule } from '../../lib/colorPalettes';

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
      featured: true
    },
    {
      label: 'Apply Leave',
      desc: 'Submit leave request',
      icon: Calendar,
      targetTab: 'leave'
    },
    {
      label: 'Log Breakdown',
      desc: 'Report line stoppage',
      icon: AlertTriangle,
      targetTab: 'breakdown'
    },
    ...(isAdminOrManager ? [
      {
        label: 'Register Machine',
        desc: 'Add plant machinery',
        icon: Wrench,
        targetTab: 'machine'
      },
      {
        label: 'Enter Monthly KPI',
        desc: 'Record performance score',
        icon: Target,
        targetTab: 'kpi'
      },
      {
        label: 'Shift Assignments',
        desc: 'Weekly roster rotations',
        icon: Clock,
        targetTab: 'shifts'
      },
      {
        label: 'Employee Directory',
        desc: 'Personnel & rosters',
        icon: Users,
        targetTab: 'directory'
      },
      {
        label: 'Executive Reports',
        desc: 'Export data & insights',
        icon: FileText,
        targetTab: 'reports'
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
          const pal = resolvePaletteForModule(action.targetTab);
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate?.(action.targetTab)}
              className="p-3 rounded-xl border border-gray-200/85 bg-white transition-all text-left flex flex-col justify-between group shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden"
              style={{
                borderColor: undefined
              }}
            >
              {/* Top Accent Strip */}
              <div 
                className="absolute top-0 inset-x-0 h-1"
                style={{ background: `linear-gradient(to right, ${pal.primaryHex}, ${pal.secondaryHex})` }}
              />

              <div 
                className="w-8 h-8 rounded-lg border flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110 shadow-2xs"
                style={{ 
                  backgroundColor: pal.secondaryHex, 
                  borderColor: `${pal.primaryHex}40`,
                  color: pal.primaryHex
                }}
              >
                <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-125 group-hover-icon-anim" />
              </div>
              <div>
                <div 
                  className="text-xs font-extrabold text-gray-900 leading-tight flex items-center justify-between gap-1 transition-colors"
                >
                  <span>{action.label}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 font-medium">
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
