import { SystemNavigator } from '../../lib/navigators';
import { Task } from '../../lib/taskEngine';
import { KPIRecord, Employee } from '../kpi/types';

export type DashboardDateFilter = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'prev_month'
  | 'this_quarter'
  | 'this_year'
  | 'all'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export type NavigatorHealthStatus = 'Excellent' | 'Good' | 'Attention' | 'Critical';

export interface NavigatorHealthMetric {
  id: string;
  name: string;
  category: string;
  iconName: string;
  totalItems: number;
  activeOrPending: number;
  completedOrSettled: number;
  attentionCount: number;
  attentionReason?: string;
  health: NavigatorHealthStatus;
  primaryMetricLabel: string;
  primaryMetricValue: string | number;
  secondaryMetricLabel?: string;
  secondaryMetricValue?: string | number;
}

export interface DashboardAlertItem {
  id: string;
  title: string;
  subtitle: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Normal';
  module: string;
  targetTab: string;
  timestamp?: string;
  badge: string;
  actionText?: string;
}

export interface DepartmentMetric {
  department: string;
  employeeCount: number;
  taskCount: number;
  tasksCompleted: number;
  tasksOverdue: number;
  tasksPending: number;
  leaveCount: number;
  machineCount: number;
  dailyCapacity: number;
  breakdownCount: number;
  breakdownHours: number;
  avgKpiScore: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'task' | 'leave' | 'machine' | 'breakdown' | 'kpi' | 'shift' | 'system';
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  timeAgo: string;
  statusBadge?: {
    text: string;
    variant: 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate' | 'purple';
  };
  targetTab?: string;
}

export interface OperationalVitalSign {
  id: string;
  label: string;
  value: string;
  subValue: string;
  status: 'normal' | 'warning' | 'critical' | 'optimal';
  progress: number; // 0 to 100
  trend?: string;
  iconName: string;
}

export type DashboardExecutiveTab = 
  | 'overview' 
  | 'workforce' 
  | 'manufacturing' 
  | 'tasks' 
  | 'kpi' 
  | 'activity';

