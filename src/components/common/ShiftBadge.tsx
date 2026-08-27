import React from 'react';
import { Sun, Moon, Briefcase, Clock } from 'lucide-react';
import { ShiftType } from '../../lib/shiftEngine';

export interface ShiftVisualConfig {
  label: string;
  type: ShiftType;
  icon: React.ReactNode;
  iconName: 'Sun' | 'Moon' | 'Briefcase' | 'Clock';
  bg: string;
  text: string;
  border: string;
  badge: string;
  dot: string;
  timeRange: string;
  shortCode: string;
}

export function getShiftVisualConfig(shift: string | ShiftType): ShiftVisualConfig {
  const s = (shift || '').toString().trim();
  const lower = s.toLowerCase();

  if (lower.includes('day') || lower === 'a' || lower.includes('shift a')) {
    return {
      label: s || 'Day Shift',
      type: 'Day Shift',
      icon: <Sun className="w-3.5 h-3.5 text-amber-600 fill-amber-400/30 shrink-0" />,
      iconName: 'Sun',
      bg: 'bg-amber-50/80',
      text: 'text-amber-900',
      border: 'border-amber-200/90',
      badge: 'bg-amber-500 text-white',
      dot: 'bg-amber-500',
      timeRange: '09:00 AM – 06:00 PM',
      shortCode: 'DAY'
    };
  }

  if (lower.includes('night') || lower === 'b' || lower.includes('shift b')) {
    return {
      label: s || 'Night Shift',
      type: 'Night Shift',
      icon: <Moon className="w-3.5 h-3.5 text-indigo-600 fill-indigo-400/30 shrink-0" />,
      iconName: 'Moon',
      bg: 'bg-indigo-50/80',
      text: 'text-indigo-900',
      border: 'border-indigo-200/90',
      badge: 'bg-indigo-600 text-white',
      dot: 'bg-indigo-500',
      timeRange: '08:00 PM – 05:00 AM',
      shortCode: 'NIGHT'
    };
  }

  // General Shift / Fixed Duty
  return {
    label: s || 'General Shift',
    type: 'General',
    icon: <Briefcase className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
    iconName: 'Briefcase',
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-200',
    badge: 'bg-slate-600 text-white',
    dot: 'bg-slate-400',
    timeRange: '09:00 AM – 06:00 PM',
    shortCode: 'GEN'
  };
}

export function ShiftIcon({
  shift,
  className = 'w-4 h-4'
}: {
  shift: string | ShiftType;
  className?: string;
}) {
  const config = getShiftVisualConfig(shift);
  if (config.type === 'Day Shift') {
    return <Sun className={`${className} text-amber-500 fill-amber-400/20 shrink-0`} />;
  }
  if (config.type === 'Night Shift') {
    return <Moon className={`${className} text-indigo-600 fill-indigo-400/20 shrink-0`} />;
  }
  return <Briefcase className={`${className} text-slate-600 shrink-0`} />;
}

interface ShiftBadgeProps {
  shift: string | ShiftType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTime?: boolean;
  showDot?: boolean;
  className?: string;
}

export const ShiftBadge: React.FC<ShiftBadgeProps> = ({
  shift,
  size = 'sm',
  showIcon = true,
  showTime = false,
  showDot = false,
  className = ''
}) => {
  const config = getShiftVisualConfig(shift);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-[11px] gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
    lg: 'px-3.5 py-2 text-sm gap-2.5'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5'
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border shadow-2xs transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} />
      )}
      {showIcon && (
        <ShiftIcon shift={shift} className={iconSizes[size]} />
      )}
      <span className="whitespace-nowrap">{config.label}</span>
      {showTime && (
        <span className="text-[10px] opacity-75 font-normal whitespace-nowrap">
          ({config.timeRange})
        </span>
      )}
    </span>
  );
};

export default ShiftBadge;
