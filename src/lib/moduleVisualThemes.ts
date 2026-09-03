import React from 'react';
import { 
  CheckSquare, 
  Briefcase, 
  Calendar, 
  AlertTriangle, 
  Target, 
  Sparkles, 
  Award, 
  Clock, 
  Bell,
  Wrench,
  LucideIcon
} from 'lucide-react';
import { AssignmentModuleType } from './universalAssignmentNotifier';

export interface ModuleTheme {
  name: string;
  navigatorId: string;
  icon: LucideIcon;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  toastGradient: string;
  accentColor: string;
  modalGradient: string;
}

export const MODULE_THEMES: Record<AssignmentModuleType, ModuleTheme> = {
  'tasks': {
    name: 'Daily Tasks',
    navigatorId: 'tasks',
    icon: CheckSquare,
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    toastGradient: 'from-emerald-500 to-teal-600',
    accentColor: 'text-emerald-600',
    modalGradient: 'from-slate-900 via-emerald-950 to-slate-900'
  },
  'shifts': {
    name: 'Shift Assignments',
    navigatorId: 'shifts',
    icon: Briefcase,
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-700 dark:text-blue-400',
    badgeBorder: 'border-blue-500/30',
    toastGradient: 'from-blue-600 to-indigo-700',
    accentColor: 'text-blue-600',
    modalGradient: 'from-slate-900 via-blue-950 to-slate-900'
  },
  'leave': {
    name: 'Leave Management',
    navigatorId: 'leave',
    icon: Calendar,
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-700 dark:text-violet-400',
    badgeBorder: 'border-violet-500/30',
    toastGradient: 'from-violet-600 to-purple-700',
    accentColor: 'text-violet-600',
    modalGradient: 'from-slate-900 via-violet-950 to-slate-900'
  },
  'breakdown': {
    name: 'Breakdown Log',
    navigatorId: 'breakdown',
    icon: AlertTriangle,
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-500/30',
    toastGradient: 'from-rose-600 to-red-700',
    accentColor: 'text-rose-600',
    modalGradient: 'from-slate-900 via-rose-950 to-slate-900'
  },
  'kpi': {
    name: 'KPI Performance',
    navigatorId: 'kpi',
    icon: Target,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeBorder: 'border-amber-500/30',
    toastGradient: 'from-amber-500 to-orange-600',
    accentColor: 'text-amber-600',
    modalGradient: 'from-slate-900 via-amber-950 to-slate-900'
  },
  '5s-management': {
    name: '5S & Visual Mgmt',
    navigatorId: '5s-management',
    icon: Sparkles,
    badgeBg: 'bg-teal-500/10',
    badgeText: 'text-teal-700 dark:text-teal-400',
    badgeBorder: 'border-teal-500/30',
    toastGradient: 'from-teal-600 to-cyan-700',
    accentColor: 'text-teal-600',
    modalGradient: 'from-slate-900 via-teal-950 to-slate-900'
  },
  'skill-dashboard': {
    name: 'Skill Matrix',
    navigatorId: 'skill-dashboard',
    icon: Target,
    badgeBg: 'bg-fuchsia-500/10',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-400',
    badgeBorder: 'border-fuchsia-500/30',
    toastGradient: 'from-fuchsia-600 to-purple-700',
    accentColor: 'text-fuchsia-600',
    modalGradient: 'from-slate-900 via-fuchsia-950 to-slate-900'
  },
  'practices': {
    name: 'Best Practices',
    navigatorId: 'practices',
    icon: Award,
    badgeBg: 'bg-lime-500/10',
    badgeText: 'text-lime-700 dark:text-lime-400',
    badgeBorder: 'border-lime-500/30',
    toastGradient: 'from-emerald-600 to-green-700',
    accentColor: 'text-emerald-600',
    modalGradient: 'from-slate-900 via-emerald-950 to-slate-900'
  },
  'overtime': {
    name: 'Overtime Calendar',
    navigatorId: 'overtime',
    icon: Clock,
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-700 dark:text-sky-400',
    badgeBorder: 'border-sky-500/30',
    toastGradient: 'from-sky-600 to-blue-700',
    accentColor: 'text-sky-600',
    modalGradient: 'from-slate-900 via-sky-950 to-slate-900'
  },
  'general': {
    name: 'Operations Notice',
    navigatorId: 'dashboard',
    icon: Bell,
    badgeBg: 'bg-slate-500/10',
    badgeText: 'text-slate-700 dark:text-slate-400',
    badgeBorder: 'border-slate-500/30',
    toastGradient: 'from-slate-700 to-slate-900',
    accentColor: 'text-indigo-600',
    modalGradient: 'from-slate-900 via-indigo-950 to-slate-900'
  }
};

export function getModuleTheme(module: AssignmentModuleType): ModuleTheme {
  return MODULE_THEMES[module] || MODULE_THEMES.general;
}
