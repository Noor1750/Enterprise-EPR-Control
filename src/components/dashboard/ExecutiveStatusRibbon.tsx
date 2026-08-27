import React from 'react';
import { motion } from 'motion/react';
import { 
  Activity, CheckCircle2, AlertTriangle, Clock, Wrench, 
  TrendingUp, Award, Calendar, Users, Cpu, ShieldCheck
} from 'lucide-react';
import { OperationalVitalSign } from './types';

interface ExecutiveStatusRibbonProps {
  vitalSigns: OperationalVitalSign[];
  onSelectVital?: (id: string) => void;
}

export default function ExecutiveStatusRibbon({ vitalSigns, onSelectVital }: ExecutiveStatusRibbonProps) {
  const getStatusStyles = (status: OperationalVitalSign['status']) => {
    switch (status) {
      case 'optimal':
        return {
          bg: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950 hover:border-emerald-400 hover:shadow-emerald-500/10',
          badge: 'bg-emerald-500 text-white',
          bar: 'bg-emerald-500',
          dot: 'bg-emerald-500'
        };
      case 'normal':
        return {
          bg: 'bg-blue-50/70 border-blue-200/80 text-blue-950 hover:border-blue-400 hover:shadow-blue-500/10',
          badge: 'bg-blue-600 text-white',
          bar: 'bg-blue-600',
          dot: 'bg-blue-600'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/70 border-amber-200/80 text-amber-950 hover:border-amber-400 hover:shadow-amber-500/10',
          badge: 'bg-amber-500 text-white',
          bar: 'bg-amber-500',
          dot: 'bg-amber-500'
        };
      case 'critical':
        return {
          bg: 'bg-rose-50/70 border-rose-200/80 text-rose-950 hover:border-rose-400 hover:shadow-rose-500/10',
          badge: 'bg-rose-500 text-white',
          bar: 'bg-rose-500',
          dot: 'bg-rose-500'
        };
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Cpu': return Cpu;
      case 'CheckCircle2': return CheckCircle2;
      case 'Calendar': return Calendar;
      case 'Users': return Users;
      case 'Clock': return Clock;
      case 'Award': return Award;
      default: return Activity;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">
            Enterprise Live Operational Vitals
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-gray-400">
          Real-time Engine Synchronized
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {vitalSigns.map((item, index) => {
          const style = getStatusStyles(item.status);
          const IconComponent = getIcon(item.iconName);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              onClick={() => onSelectVital?.(item.id)}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md flex flex-col justify-between ${style.bg}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 truncate">
                    {item.label}
                  </span>
                  <IconComponent className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-lg font-black text-gray-900 tracking-tight">
                    {item.value}
                  </span>
                  {item.trend && (
                    <span className="text-[10px] font-semibold text-gray-500">
                      {item.trend}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-gray-500 truncate mt-0.5">
                  {item.subValue}
                </div>
              </div>

              {/* Micro Progress Bar with Motion */}
              <div className="mt-3">
                <div className="w-full h-1.5 bg-gray-200/70 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(5, item.progress))}%` }}
                    transition={{ duration: 0.7, delay: 0.15 + index * 0.04 }}
                    className={`h-full rounded-full ${style.bar}`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
