import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, Sparkles, Gift, ShieldCheck, UserCheck, 
  Calendar as CalendarIcon, RefreshCw, Layers, Users, Wrench, CheckSquare, Target, Activity, Clock
} from 'lucide-react';
import { getRange } from '../lib/sheets';
import { 
  format, parseISO, isValid, isToday, isBefore, isWithinInterval, 
  startOfMonth, endOfMonth, eachDayOfInterval 
} from 'date-fns';
import { UserSecurityScope, filterAuthorizedEmployees, getAuthorizedEmployeeIdSet } from '../lib/security';
import { getSaturdayWeekRange, parseEmployeeShiftState } from '../lib/shiftEngine';
import { 
  Task, parseTaskRow, filterAuthorizedTasks, getCalculatedTaskStatus, isUserManagerOrAdmin 
} from '../lib/taskEngine';
import { KPIRecord, parsePercentage } from './kpi/types';

// Subcomponents
import DashboardHeader from './dashboard/DashboardHeader';
import ExecutiveStatusRibbon from './dashboard/ExecutiveStatusRibbon';
import ExecutiveBriefingModal from './dashboard/ExecutiveBriefingModal';
import DashboardDrilldownModal from './dashboard/DashboardDrilldownModal';
import ExecutiveSummary from './dashboard/ExecutiveSummary';
import KPICards from './dashboard/KPICards';
import { calculatePerformanceRating } from '../lib/kpiEngine';
import TodaysPriorities from './dashboard/TodaysPriorities';
import NavigatorOverview from './dashboard/NavigatorOverview';
import DepartmentMatrix from './dashboard/DepartmentMatrix';
import ModuleBreakdowns from './dashboard/ModuleBreakdowns';
import RecentActivity from './dashboard/RecentActivity';
import QuickActions from './dashboard/QuickActions';
import { 
  DashboardDateFilter, DashboardExecutiveTab, DateRange, NavigatorHealthMetric, 
  DashboardAlertItem, DepartmentMetric, RecentActivityItem, OperationalVitalSign 
} from './dashboard/types';
import { calculateDateRange, isDateInInterval, formatSafeTimeAgo } from './dashboard/dashboardUtils';

interface DashboardProps {
  spreadsheetId: string;
  user?: any;
  accessLevels?: string[];
  userSecurityScope?: UserSecurityScope;
  onNavigate?: (tab: string) => void;
}

export default function Dashboard({ 
  spreadsheetId, 
  user, 
  accessLevels, 
  userSecurityScope,
  onNavigate
}: DashboardProps) {
  // Raw Data States
  const [machines, setMachines] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [leaves, setLeaves] = useState<string[][]>([]);
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [breakdowns, setBreakdowns] = useState<string[][]>([]);
  const [shiftHistory, setShiftHistory] = useState<string[][]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawKpis, setRawKpis] = useState<KPIRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<string[][]>([]);
  
  // UI & Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeExecutiveTab, setActiveExecutiveTab] = useState<DashboardExecutiveTab>('overview');

  // Modals
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [drilldownModal, setDrilldownModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    type: 'tasks' | 'leaves' | 'machines' | 'breakdowns' | 'kpis' | 'employees';
    data: any[];
  }>({
    isOpen: false,
    title: '',
    type: 'tasks',
    data: []
  });

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Calculate Active Date Interval
  const activeDateRange: DateRange = useMemo(() => {
    return calculateDateRange(dateFilter, customStartDate, customEndDate);
  }, [dateFilter, customStartDate, customEndDate]);

  // Load all ERP datasets from database
  const loadData = async (silent: boolean = false) => {
    if (!spreadsheetId) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [
        mRaw, eRaw, lRaw, sRaw, bRaw, hRaw, tRaw, kRaw, salRaw
      ] = await Promise.all([
        getRange(spreadsheetId, 'MachineCapacity').catch(() => []),
        getRange(spreadsheetId, 'Employees').catch(() => []),
        getRange(spreadsheetId, 'Leave').catch(() => []),
        getRange(spreadsheetId, 'Supervisors').catch(() => []),
        getRange(spreadsheetId, 'BreakdownLog').catch(() => []),
        getRange(spreadsheetId, 'ShiftHistory').catch(() => []),
        getRange(spreadsheetId, 'Tasks!A:Z').catch(() => []),
        getRange(spreadsheetId, 'KPI').catch(() => []),
        getRange(spreadsheetId, 'SettlementAuditLog').catch(() => [])
      ]);

      setMachines(mRaw.length > 1 ? mRaw.slice(1) : []);
      setEmployees(eRaw.length > 1 ? eRaw.slice(1) : []);
      setLeaves(lRaw.length > 1 ? lRaw.slice(1) : []);
      setSupervisors(sRaw.length > 1 ? sRaw.slice(1) : []);
      setBreakdowns(bRaw.length > 1 ? bRaw.slice(1) : []);
      setShiftHistory(hRaw.length > 1 ? hRaw.slice(1) : []);
      
      const parsedTasks = tRaw.length > 1 ? tRaw.slice(1).filter(r => !!r[0]).map(parseTaskRow) : [];
      setRawTasks(parsedTasks);

      const parsedKpis: KPIRecord[] = kRaw.length > 1 
        ? kRaw.slice(1).filter(r => !!r[0]).map(r => ({
            kpiId: r[0] || '',
            employeeId: r[1] || '',
            employeeName: r[2] || '',
            department: r[3] || '',
            month: r[4] || '',
            date: r[5] || '',
            plan: parsePercentage(r[6]),
            achievement: parsePercentage(r[7]),
            rating: calculatePerformanceRating(parsePercentage(r[7])),
            createdAt: r[9] || '',
            updatedAt: r[10] || ''
          }))
        : [];
      setRawKpis(parsedKpis);

      setAuditLogs(salRaw.length > 1 ? salRaw.slice(1) : []);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (!err?.message?.includes('Database (Spreadsheet) not found')) {
        console.error('Failed to load dashboard data:', err);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sheet = customEvent.detail?.sheetName || '';
      if (!sheet || ['Leave', 'Employees', 'MachineCapacity', 'Tasks', 'KPI', 'BreakdownLog', 'ShiftHistory', 'Overtime'].includes(sheet)) {
        loadData(true);
      }
    };

    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, [spreadsheetId]);

  // Security Filtering
  const authorizedEmployees = useMemo(() => {
    const objEmployees = employees.map(e => ({
      id: e[0] || '',
      name: e[1] || '',
      designation: e[2] || '',
      department: e[3] || '',
      status: e[9] || 'Active'
    }));
    return filterAuthorizedEmployees(objEmployees, userSecurityScope);
  }, [employees, userSecurityScope]);

  const authorizedIdSet = useMemo(() => {
    return new Set(authorizedEmployees.map(e => e.id.toUpperCase()));
  }, [authorizedEmployees]);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => {
      if (e[9] === 'Inactive') return false;
      if (userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all') {
        return authorizedIdSet.has((e[0] || '').toUpperCase());
      }
      return true;
    });
  }, [employees, userSecurityScope, authorizedIdSet]);

  const inactiveEmployees = useMemo(() => {
    return employees.filter(e => e[9] === 'Inactive');
  }, [employees]);

  // Authorized and Calculated Tasks
  const authorizedTasks = useMemo(() => {
    const filtered = filterAuthorizedTasks(
      rawTasks,
      userSecurityScope,
      user?.email,
      userSecurityScope?.employeeName || user?.displayName
    ).map(task => {
      const calculatedStatus = getCalculatedTaskStatus(task);
      return calculatedStatus !== task.status ? { ...task, status: calculatedStatus } : task;
    });

    if (dateFilter === 'all') return filtered;
    return filtered.filter(t => {
      const targetDate = t.dueDate || t.startDate || t.createdAt;
      return isDateInInterval(targetDate, activeDateRange);
    });
  }, [rawTasks, userSecurityScope, user, dateFilter, activeDateRange]);

  // Date Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const empId = (l[1] || '').toUpperCase();
      if (userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all') {
        if (!authorizedIdSet.has(empId)) return false;
      }

      if (dateFilter === 'all') return true;
      const from = l[5];
      const to = l[6] || l[5];
      return isDateInInterval(from, activeDateRange) || isDateInInterval(to, activeDateRange);
    });
  }, [leaves, userSecurityScope, authorizedIdSet, dateFilter, activeDateRange]);

  // Date Filtered Breakdowns
  const filteredBreakdowns = useMemo(() => {
    if (dateFilter === 'all') return breakdowns;
    return breakdowns.filter(b => isDateInInterval(b[1], activeDateRange));
  }, [breakdowns, dateFilter, activeDateRange]);

  // Date Filtered KPIs
  const filteredKpis = useMemo(() => {
    return rawKpis.filter(k => {
      if (userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all') {
        if (!authorizedIdSet.has(k.employeeId.toUpperCase())) return false;
      }
      if (dateFilter === 'all') return true;
      return isDateInInterval(k.date || k.createdAt, activeDateRange);
    });
  }, [rawKpis, userSecurityScope, authorizedIdSet, dateFilter, activeDateRange]);

  // Task Statistics
  const taskStats = useMemo(() => {
    const total = authorizedTasks.length;
    const completed = authorizedTasks.filter(t => t.status === 'Completed').length;
    const inProgress = authorizedTasks.filter(t => t.status === 'In Progress').length;
    const pending = authorizedTasks.filter(t => t.status === 'Pending').length;
    const overdue = authorizedTasks.filter(t => t.status === 'Overdue').length;
    const todayDue = authorizedTasks.filter(t => t.dueDate && isValid(parseISO(t.dueDate)) && isToday(parseISO(t.dueDate))).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      todayDue,
      inProgress,
      pending,
      completed,
      overdue,
      completionRate
    };
  }, [authorizedTasks]);

  // Leave Statistics
  const leaveStats = useMemo(() => {
    let pendingApproval = 0;
    let hrPending = 0;
    let settled = 0;
    let rejected = 0;

    filteredLeaves.forEach(l => {
      const rawStatus = (l[8] || '').trim().toLowerCase();
      const settlementStatus = (l[12] || '').trim().toLowerCase();

      if (rawStatus === 'settlement' || settlementStatus === 'settlement') {
        settled += 1;
      } else if (rawStatus === 'pending') {
        pendingApproval += 1;
      } else if (rawStatus === 'hr pending' || rawStatus === 'approved' || settlementStatus === 'hr pending') {
        hrPending += 1;
      } else if (rawStatus === 'rejected') {
        rejected += 1;
      }
    });

    return {
      total: filteredLeaves.length,
      pendingApproval,
      hrPending,
      settled,
      rejected
    };
  }, [filteredLeaves]);

  // Machine Statistics
  const machineStats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let obsolete = 0;
    let totalDailyCapacity = 0;

    machines.forEach(m => {
      const obsoleteDate = m[25];
      const dailyCap = Number(m[10]) || 0;
      const countPcs = m[17] || 'Yes';

      if (obsoleteDate && new Date(obsoleteDate) <= now) {
        obsolete += 1;
      } else {
        active += 1;
      }

      if (countPcs !== 'No') {
        totalDailyCapacity += dailyCap;
      }
    });

    return {
      total: machines.length,
      active,
      obsolete,
      totalDailyCapacity
    };
  }, [machines]);

  // Breakdown Statistics
  const breakdownStats = useMemo(() => {
    let activeDownCount = 0;
    let hoursLost = 0;
    let totalCost = 0;

    filteredBreakdowns.forEach(b => {
      const status = (b[26] || '').trim();
      const stop = (b[6] || '').trim();
      const hrs = Number(b[13]) || 0;
      const cost = Number(b[25]) || 0;

      hoursLost += hrs;
      totalCost += cost;

      if (stop === 'Yes' && status !== 'Closed' && status !== 'Completed' && status !== 'Cancelled') {
        activeDownCount += 1;
      }
    });

    return {
      total: filteredBreakdowns.length,
      activeDownCount,
      hoursLost: Math.round(hoursLost * 10) / 10,
      totalCost: Math.round(totalCost)
    };
  }, [filteredBreakdowns]);

  // KPI Statistics
  const kpiStats = useMemo(() => {
    const totalEvaluated = filteredKpis.length;
    if (totalEvaluated === 0) {
      return {
        totalEvaluated: 0,
        avgAchievement: 0,
        avgRating: 0,
        belowTargetCount: 0
      };
    }

    const sumAch = filteredKpis.reduce((acc, r) => acc + r.achievement, 0);
    const sumRat = filteredKpis.reduce((acc, r) => acc + r.rating, 0);
    const belowTargetCount = filteredKpis.filter(r => r.achievement < 80).length;

    return {
      totalEvaluated,
      avgAchievement: sumAch / totalEvaluated,
      avgRating: sumRat / totalEvaluated,
      belowTargetCount
    };
  }, [filteredKpis]);

  // Shift Rostering Statistics
  const shiftStats = useMemo(() => {
    const todayDate = new Date();
    const currentSatWeek = getSaturdayWeekRange(todayDate);
    const historyRecords = shiftHistory.map(row => ({
      historyId: row[0] || '',
      employeeId: row[1] || '',
      employeeName: row[2] || '',
      previousShift: row[3] || '',
      newShift: row[4] || '',
      effectiveDate: row[5] || '',
      assignmentType: row[6] || 'Automatic Rotation',
      changedBy: row[7] || '',
      changedAt: row[8] || '',
      remarks: row[9] || ''
    }));

    let aShiftCount = 0;
    let bShiftCount = 0;
    let generalCount = 0;
    let overrideCount = 0;

    activeEmployees.forEach(row => {
      const state = parseEmployeeShiftState(row, todayDate, historyRecords as any);
      if (state.currentShift === 'Day Shift') aShiftCount++;
      else if (state.currentShift === 'Night Shift') bShiftCount++;
      else generalCount++;

      if (state.shiftMode === 'Manual Override') overrideCount++;
    });

    return {
      aShiftCount,
      bShiftCount,
      generalCount,
      overrideCount,
      weekLabel: currentSatWeek.label
    };
  }, [activeEmployees, shiftHistory]);

  // Operational Vital Signs (Live Ribbon)
  const vitalSigns: OperationalVitalSign[] = useMemo(() => {
    const plantAvail = machineStats.total > 0 ? Math.round((machineStats.active / machineStats.total) * 100) : 100;
    const taskVelocity = taskStats.completionRate;
    const leaveResolution = leaveStats.total > 0 ? Math.round((leaveStats.settled / leaveStats.total) * 100) : 100;
    const avgKpi = Math.round(kpiStats.avgAchievement);

    return [
      {
        id: 'plant',
        label: 'Fleet Active',
        value: `${plantAvail}%`,
        subValue: `${machineStats.active} / ${machineStats.total} Units`,
        status: plantAvail >= 90 ? 'optimal' : plantAvail >= 75 ? 'normal' : 'critical',
        progress: plantAvail,
        trend: `${machineStats.totalDailyCapacity.toLocaleString()} pcs`,
        iconName: 'Cpu'
      },
      {
        id: 'tasks',
        label: 'Task Velocity',
        value: `${taskVelocity}%`,
        subValue: `${taskStats.completed} / ${taskStats.total} Done`,
        status: taskStats.overdue > 0 ? 'warning' : 'optimal',
        progress: taskVelocity,
        trend: taskStats.overdue > 0 ? `${taskStats.overdue} Overdue` : 'On Track',
        iconName: 'CheckCircle2'
      },
      {
        id: 'leave',
        label: 'Leave Settled',
        value: `${leaveResolution}%`,
        subValue: `${leaveStats.settled} / ${leaveStats.total} Settled`,
        status: (leaveStats.pendingApproval + leaveStats.hrPending) > 3 ? 'warning' : 'optimal',
        progress: leaveResolution,
        trend: `${leaveStats.pendingApproval + leaveStats.hrPending} Pending`,
        iconName: 'Calendar'
      },
      {
        id: 'shifts',
        label: 'Roster Coverage',
        value: `${shiftStats.aShiftCount + shiftStats.bShiftCount}`,
        subValue: `Day: ${shiftStats.aShiftCount} | Night: ${shiftStats.bShiftCount}`,
        status: 'normal',
        progress: 95,
        trend: shiftStats.overrideCount > 0 ? `${shiftStats.overrideCount} Overrides` : 'Balanced',
        iconName: 'Clock'
      },
      {
        id: 'breakdowns',
        label: 'Total Downtime',
        value: `${breakdownStats.hoursLost}h`,
        subValue: `${breakdownStats.total} Incident(s)`,
        status: breakdownStats.activeDownCount > 0 ? 'critical' : breakdownStats.hoursLost > 10 ? 'warning' : 'optimal',
        progress: breakdownStats.activeDownCount > 0 ? 35 : 95,
        trend: `৳${breakdownStats.totalCost.toLocaleString()}`,
        iconName: 'Wrench'
      },
      {
        id: 'kpi',
        label: 'Quality Score',
        value: kpiStats.totalEvaluated > 0 ? `${avgKpi}%` : '—',
        subValue: `${kpiStats.totalEvaluated} Staff Reviewed`,
        status: avgKpi >= 85 ? 'optimal' : avgKpi >= 70 ? 'normal' : 'warning',
        progress: avgKpi || 50,
        trend: kpiStats.avgRating > 0 ? `${kpiStats.avgRating.toFixed(1)} ★` : undefined,
        iconName: 'Award'
      }
    ];
  }, [machineStats, taskStats, leaveStats, shiftStats, breakdownStats, kpiStats]);

  // Actionable Priorities / Alert Center List
  const alertItems: DashboardAlertItem[] = useMemo(() => {
    const list: DashboardAlertItem[] = [];

    // 1. Overdue Tasks (Critical)
    authorizedTasks
      .filter(t => t.status === 'Overdue')
      .slice(0, 4)
      .forEach(t => {
        list.push({
          id: `task-overdue-${t.id}`,
          title: `Overdue Task: ${t.title}`,
          subtitle: `Assigned to ${t.assigneeName} (${t.assigneeDepartment}) • Due: ${t.dueDate || 'Immediate'}`,
          priority: 'Critical',
          module: 'Daily Tasks',
          targetTab: 'tasks',
          badge: 'Overdue',
          actionText: 'Review Task'
        });
      });

    // 2. Active Down Machines (Critical)
    filteredBreakdowns
      .filter(b => (b[6] || '').trim() === 'Yes' && b[26] !== 'Closed' && b[26] !== 'Completed' && b[26] !== 'Cancelled')
      .slice(0, 3)
      .forEach((b, idx) => {
        list.push({
          id: `bd-down-${b[0] || idx}`,
          title: `Line Down: ${b[3] || 'Machine'} (${b[4] || 'MC'})`,
          subtitle: `Issue: ${b[5] || 'Breakdown reported'} in ${b[2]} dept`,
          priority: 'Critical',
          module: 'Breakdown Log',
          targetTab: 'breakdown',
          badge: 'Stoppage',
          actionText: 'Inspect Maintenance'
        });
      });

    // 3. Tasks Due Today (High)
    authorizedTasks
      .filter(t => t.status !== 'Completed' && t.dueDate && isValid(parseISO(t.dueDate)) && isToday(parseISO(t.dueDate)))
      .slice(0, 3)
      .forEach(t => {
        list.push({
          id: `task-today-${t.id}`,
          title: `Due Today: ${t.title}`,
          subtitle: `Assignee: ${t.assigneeName} • Priority: ${t.priority}`,
          priority: 'High',
          module: 'Daily Tasks',
          targetTab: 'tasks',
          badge: 'Today Due',
          actionText: 'Track Progress'
        });
      });

    // 4. Pending Leave Approvals (High)
    filteredLeaves
      .filter(l => (l[8] || '').trim().toLowerCase() === 'pending' || (l[8] || '').trim().toLowerCase() === 'hr pending')
      .slice(0, 3)
      .forEach((l, idx) => {
        list.push({
          id: `leave-pending-${l[0] || idx}`,
          title: `Leave Sign-off Required: ${l[2]} (${l[4]})`,
          subtitle: `${l[7]} Day(s) from ${l[5]} to ${l[6]} • Reason: ${l[10] || 'Personal'}`,
          priority: 'High',
          module: 'Leave Management',
          targetTab: 'leave',
          badge: l[8] || 'Pending',
          actionText: 'Approve / Reject'
        });
      });

    // 5. Staff with Low KPI Achievement (Medium)
    filteredKpis
      .filter(k => k.achievement < 75)
      .slice(0, 3)
      .forEach(k => {
        list.push({
          id: `kpi-low-${k.kpiId}`,
          title: `Performance Gap: ${k.employeeName} (${k.department})`,
          subtitle: `Achievement recorded at ${k.achievement}% against monthly plan`,
          priority: 'Medium',
          module: 'Monthly KPI',
          targetTab: 'kpi',
          badge: `${k.achievement}%`,
          actionText: 'Review KPI'
        });
      });

    return list;
  }, [authorizedTasks, filteredBreakdowns, filteredLeaves, filteredKpis]);

  // Navigator-by-Navigator Health Matrix
  const navigatorMetrics: NavigatorHealthMetric[] = useMemo(() => {
    const taskHealth = taskStats.overdue > 2 ? 'Critical' : taskStats.overdue > 0 ? 'Attention' : 'Excellent';
    const leaveHealth = (leaveStats.pendingApproval + leaveStats.hrPending) > 5 ? 'Attention' : 'Excellent';
    const machineHealth = machineStats.obsolete > 5 ? 'Attention' : 'Excellent';
    const breakdownHealth = breakdownStats.activeDownCount > 0 ? 'Critical' : breakdownStats.hoursLost > 10 ? 'Attention' : 'Excellent';
    const kpiHealth = kpiStats.belowTargetCount > 3 ? 'Attention' : 'Good';
    const shiftHealth = shiftStats.overrideCount > 10 ? 'Attention' : 'Good';

    return [
      {
        id: 'tasks',
        name: 'Daily Tasks Management',
        category: 'Operations',
        iconName: 'CheckSquare',
        totalItems: taskStats.total,
        activeOrPending: taskStats.inProgress + taskStats.pending,
        completedOrSettled: taskStats.completed,
        attentionCount: taskStats.overdue,
        attentionReason: taskStats.overdue > 0 ? `${taskStats.overdue} task(s) overdue` : undefined,
        health: taskHealth,
        primaryMetricLabel: 'Completion Rate',
        primaryMetricValue: `${taskStats.completionRate}%`
      },
      {
        id: 'leave',
        name: 'Leave Applications & Workflow',
        category: 'HR Management',
        iconName: 'Calendar',
        totalItems: leaveStats.total,
        activeOrPending: leaveStats.pendingApproval + leaveStats.hrPending,
        completedOrSettled: leaveStats.settled,
        attentionCount: leaveStats.pendingApproval + leaveStats.hrPending,
        attentionReason: (leaveStats.pendingApproval + leaveStats.hrPending) > 0 ? `${leaveStats.pendingApproval + leaveStats.hrPending} awaiting sign-off` : undefined,
        health: leaveHealth,
        primaryMetricLabel: 'Settled Leaves',
        primaryMetricValue: leaveStats.settled
      },
      {
        id: 'machine',
        name: 'Machine Capacity & Planning',
        category: 'Manufacturing',
        iconName: 'Wrench',
        totalItems: machineStats.total,
        activeOrPending: machineStats.active,
        completedOrSettled: machineStats.active,
        attentionCount: machineStats.obsolete,
        attentionReason: machineStats.obsolete > 0 ? `${machineStats.obsolete} obsolete units` : undefined,
        health: machineHealth,
        primaryMetricLabel: 'Nominal Daily Pcs',
        primaryMetricValue: machineStats.totalDailyCapacity.toLocaleString()
      },
      {
        id: 'breakdown',
        name: 'Breakdown Log & Maintenance',
        category: 'Engineering',
        iconName: 'AlertTriangle',
        totalItems: breakdownStats.total,
        activeOrPending: breakdownStats.activeDownCount,
        completedOrSettled: breakdownStats.total - breakdownStats.activeDownCount,
        attentionCount: breakdownStats.activeDownCount,
        attentionReason: breakdownStats.activeDownCount > 0 ? `${breakdownStats.activeDownCount} machine(s) stopped` : undefined,
        health: breakdownHealth,
        primaryMetricLabel: 'Downtime Hours',
        primaryMetricValue: `${breakdownStats.hoursLost} hrs`
      },
      {
        id: 'kpi',
        name: 'Monthly KPI & Performance',
        category: 'Quality & HR',
        iconName: 'Target',
        totalItems: kpiStats.totalEvaluated,
        activeOrPending: kpiStats.totalEvaluated,
        completedOrSettled: kpiStats.totalEvaluated - kpiStats.belowTargetCount,
        attentionCount: kpiStats.belowTargetCount,
        attentionReason: kpiStats.belowTargetCount > 0 ? `${kpiStats.belowTargetCount} staff below 80%` : undefined,
        health: kpiHealth,
        primaryMetricLabel: 'Avg Achievement',
        primaryMetricValue: kpiStats.totalEvaluated > 0 ? `${Math.round(kpiStats.avgAchievement)}%` : '—'
      },
      {
        id: 'shifts',
        name: 'Shift Assignments & Rotations',
        category: 'Workforce',
        iconName: 'Clock',
        totalItems: activeEmployees.length,
        activeOrPending: shiftStats.aShiftCount + shiftStats.bShiftCount,
        completedOrSettled: shiftStats.generalCount,
        attentionCount: shiftStats.overrideCount,
        attentionReason: shiftStats.overrideCount > 0 ? `${shiftStats.overrideCount} manual overrides` : undefined,
        health: shiftHealth,
        primaryMetricLabel: 'Day / Night Roster',
        primaryMetricValue: `${shiftStats.aShiftCount} / ${shiftStats.bShiftCount}`
      },
      {
        id: 'directory',
        name: 'Employee Directory & Master',
        category: 'Personnel',
        iconName: 'Users',
        totalItems: employees.length,
        activeOrPending: activeEmployees.length,
        completedOrSettled: activeEmployees.length,
        attentionCount: inactiveEmployees.length,
        attentionReason: inactiveEmployees.length > 0 ? `${inactiveEmployees.length} inactive staff` : undefined,
        health: 'Excellent',
        primaryMetricLabel: 'Active Headcount',
        primaryMetricValue: activeEmployees.length
      }
    ];
  }, [taskStats, leaveStats, machineStats, breakdownStats, kpiStats, shiftStats, employees, activeEmployees, inactiveEmployees]);

  // Department Operations Matrix
  const departmentMetrics: DepartmentMetric[] = useMemo(() => {
    const deptMap: Record<string, DepartmentMetric> = {};

    const getOrInitDept = (deptName: string): DepartmentMetric => {
      const clean = (deptName || 'General').trim();
      if (!deptMap[clean]) {
        deptMap[clean] = {
          department: clean,
          employeeCount: 0,
          taskCount: 0,
          tasksCompleted: 0,
          tasksOverdue: 0,
          tasksPending: 0,
          leaveCount: 0,
          machineCount: 0,
          dailyCapacity: 0,
          breakdownCount: 0,
          breakdownHours: 0,
          avgKpiScore: 0
        };
      }
      return deptMap[clean];
    };

    activeEmployees.forEach(e => {
      const d = getOrInitDept(e[3]);
      d.employeeCount++;
    });

    authorizedTasks.forEach(t => {
      const d = getOrInitDept(t.assigneeDepartment);
      d.taskCount++;
      if (t.status === 'Completed') d.tasksCompleted++;
      else if (t.status === 'Overdue') d.tasksOverdue++;
      else d.tasksPending++;
    });

    filteredLeaves.forEach(l => {
      const d = getOrInitDept(l[4]);
      d.leaveCount++;
    });

    machines.forEach(m => {
      const d = getOrInitDept(m[1]);
      d.machineCount++;
      if ((m[17] || 'Yes') !== 'No') {
        d.dailyCapacity += Number(m[10]) || 0;
      }
    });

    filteredBreakdowns.forEach(b => {
      const d = getOrInitDept(b[2]);
      d.breakdownCount++;
      d.breakdownHours += Number(b[13]) || 0;
    });

    const deptKpiSums: Record<string, { sum: number; count: number }> = {};
    filteredKpis.forEach(k => {
      const dName = (k.department || 'General').trim();
      if (!deptKpiSums[dName]) deptKpiSums[dName] = { sum: 0, count: 0 };
      deptKpiSums[dName].sum += k.achievement;
      deptKpiSums[dName].count += 1;
    });

    Object.keys(deptMap).forEach(dName => {
      const kInfo = deptKpiSums[dName];
      if (kInfo && kInfo.count > 0) {
        deptMap[dName].avgKpiScore = kInfo.sum / kInfo.count;
      }
      deptMap[dName].breakdownHours = Math.round(deptMap[dName].breakdownHours * 10) / 10;
    });

    return Object.values(deptMap).sort((a, b) => b.employeeCount - a.employeeCount);
  }, [activeEmployees, authorizedTasks, filteredLeaves, machines, filteredBreakdowns, filteredKpis]);

  // Recent Enterprise Activity Stream
  const recentActivities: RecentActivityItem[] = useMemo(() => {
    const list: RecentActivityItem[] = [];

    auditLogs.slice(0, 5).forEach((sal, idx) => {
      list.push({
        id: `sal-${sal[0] || idx}`,
        type: 'leave',
        title: `Leave Settlement Processed`,
        description: sal[11] || `Settled ${sal[8] || 1} leave records`,
        actor: sal[5] || 'HR Administrator',
        timestamp: sal[1] || '',
        timeAgo: formatSafeTimeAgo(sal[1]),
        statusBadge: { text: 'Settlement', variant: 'emerald' },
        targetTab: 'leave'
      });
    });

    filteredBreakdowns.slice(0, 4).forEach((b, idx) => {
      list.push({
        id: `act-bd-${b[0] || idx}`,
        type: 'breakdown',
        title: `Breakdown Reported: ${b[3] || 'Machine'}`,
        description: `${b[5] || 'Stoppage logged'} in ${b[2]} (${b[18] || 'Mechanical'})`,
        actor: b[9] || 'Maintenance Reporter',
        timestamp: b[29] || b[1] || '',
        timeAgo: formatSafeTimeAgo(b[29] || b[1]),
        statusBadge: { text: b[26] || 'Open', variant: b[26] === 'Closed' ? 'emerald' : 'rose' },
        targetTab: 'breakdown'
      });
    });

    authorizedTasks.slice(0, 4).forEach((t) => {
      list.push({
        id: `act-task-${t.id}`,
        type: 'task',
        title: `Task: ${t.title}`,
        description: `Assigned to ${t.assigneeName} • Priority: ${t.priority}`,
        actor: t.createdByName || 'Supervisor',
        timestamp: t.createdAt || '',
        timeAgo: formatSafeTimeAgo(t.createdAt),
        statusBadge: { 
          text: t.status, 
          variant: t.status === 'Completed' ? 'emerald' : t.status === 'Overdue' ? 'rose' : 'indigo' 
        },
        targetTab: 'tasks'
      });
    });

    filteredKpis.slice(0, 3).forEach((k) => {
      list.push({
        id: `act-kpi-${k.kpiId}`,
        type: 'kpi',
        title: `KPI Evaluation: ${k.employeeName}`,
        description: `Score: ${k.achievement}% (${k.rating} Stars) in ${k.department}`,
        actor: 'Department Manager',
        timestamp: k.createdAt || '',
        timeAgo: formatSafeTimeAgo(k.createdAt),
        statusBadge: { text: `${k.achievement}%`, variant: 'amber' },
        targetTab: 'kpi'
      });
    });

    return list.slice(0, 10);
  }, [auditLogs, filteredBreakdowns, authorizedTasks, filteredKpis]);

  // Birthday list for current month
  const currentMonthBirthdays = useMemo(() => {
    const today = new Date();
    const list = activeEmployees.filter(e => {
      if (!e[21]) return false;
      try {
        const dob = new Date(e[21]);
        return dob.getMonth() === today.getMonth();
      } catch {
        return false;
      }
    });
    list.sort((a, b) => new Date(a[21]).getDate() - new Date(b[21]).getDate());
    return list;
  }, [activeEmployees]);

  const uniqueSupervisors = useMemo(() => {
    const ids = Array.from(new Set(supervisors.map(s => s[1]).filter(Boolean)));
    return ids.map(id => {
      const emp = employees.find(e => e[0] === id);
      return emp ? emp[1] : id;
    });
  }, [supervisors, employees]);

  // Handle drilldown from KPI cards or status ribbon
  const handleDrilldown = (type: 'tasks' | 'leaves' | 'machines' | 'breakdowns' | 'kpis' | 'employees', title: string) => {
    let data: any[] = [];
    let subtitle = '';

    if (type === 'tasks') {
      data = authorizedTasks;
      subtitle = `${authorizedTasks.length} active tasks for ${activeDateRange.label}`;
    } else if (type === 'leaves') {
      data = filteredLeaves;
      subtitle = `${filteredLeaves.length} leave application records`;
    } else if (type === 'machines') {
      data = machines;
      subtitle = `${machines.length} fleet units in registry`;
    } else if (type === 'breakdowns') {
      data = filteredBreakdowns;
      subtitle = `${filteredBreakdowns.length} maintenance stoppage records`;
    } else if (type === 'kpis') {
      data = filteredKpis;
      subtitle = `${filteredKpis.length} employee evaluation scores`;
    } else if (type === 'employees') {
      data = activeEmployees;
      subtitle = `${activeEmployees.length} active staff on roster`;
    }

    setDrilldownModal({
      isOpen: true,
      title,
      subtitle,
      type,
      data
    });
  };

  const handleSelectVital = (id: string) => {
    if (id === 'plant') handleDrilldown('machines', 'Machine Fleet Registry');
    else if (id === 'tasks') handleDrilldown('tasks', 'Operational Tasks Queue');
    else if (id === 'leave') handleDrilldown('leaves', 'Leave Applications & Workflow');
    else if (id === 'shifts') handleDrilldown('employees', 'Active Shift Rostering');
    else if (id === 'breakdowns') handleDrilldown('breakdowns', 'Breakdown Stoppage Logs');
    else if (id === 'kpi') handleDrilldown('kpis', 'Monthly KPI Evaluations');
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2A3F54] to-[#1ABB9C] flex items-center justify-center shadow-lg mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h3 className="text-base font-bold text-gray-800">Initializing ERP Executive Dashboard...</h3>
        <p className="text-xs text-gray-500 mt-1">Aggregating live cross-navigator operational datasets</p>
      </div>
    );
  }

  const uniqueDepartmentsCount = Array.from(new Set(activeEmployees.map(e => e[3]).filter(Boolean))).length;

  return (
    <div className="p-4 md:p-8 w-full max-w-full mx-auto space-y-6">
      {/* 1. Header with Live Clock, User Profile, Perspective Tabs & Date Filter */}
      <DashboardHeader
        userSecurityScope={userSecurityScope}
        user={user}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        dateRangeLabel={activeDateRange.label}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
        lastUpdated={lastUpdated}
        onNavigate={onNavigate}
        activeExecutiveTab={activeExecutiveTab}
        setActiveExecutiveTab={setActiveExecutiveTab}
        onOpenBriefing={() => setIsBriefingModalOpen(true)}
        alertCount={alertItems.length}
      />

      {/* 2. Executive Status Ribbon (Live Operational Vital Signs) */}
      <ExecutiveStatusRibbon
        vitalSigns={vitalSigns}
        onSelectVital={handleSelectVital}
      />

      {/* Domain Perspective Views */}
      {activeExecutiveTab === 'overview' && (
        <>
          {/* Executive Narrative Summary */}
          <ExecutiveSummary
            taskStats={taskStats}
            leaveStats={leaveStats}
            machineStats={machineStats}
            breakdownStats={breakdownStats}
            kpiStats={kpiStats}
            employeeCount={activeEmployees.length}
            dateRangeLabel={activeDateRange.label}
            onNavigate={onNavigate}
          />

          {/* Executive KPI Cards with Click-through Navigation & Drilldown */}
          <KPICards
            employeeCount={activeEmployees.length}
            inactiveEmployeeCount={inactiveEmployees.length}
            departmentCount={uniqueDepartmentsCount}
            taskStats={taskStats}
            leaveStats={leaveStats}
            machineStats={machineStats}
            kpiStats={kpiStats}
            breakdownStats={breakdownStats}
            shiftStats={shiftStats}
            onNavigate={onNavigate}
            onDrilldown={handleDrilldown}
          />

          {/* Today's Action Center & Priorities Queue */}
          <TodaysPriorities
            alerts={alertItems}
            onNavigate={onNavigate}
          />

          {/* Navigator-by-Navigator Health Scores & Workload Chart */}
          <NavigatorOverview
            navigatorMetrics={navigatorMetrics}
            onNavigate={onNavigate}
          />

          {/* Cross-Department Operations Matrix */}
          <DepartmentMatrix
            departmentMetrics={departmentMetrics}
            onNavigate={onNavigate}
          />

          {/* Quick Navigation & Creation Shortcuts */}
          <QuickActions
            userSecurityScope={userSecurityScope}
            onNavigate={onNavigate}
          />

          {/* Grid with Recent Enterprise Activity & Birthday Celebrations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentActivity
                activities={recentActivities}
                onNavigate={onNavigate}
              />
            </div>

            {/* Celebrations & Supervisors Widget */}
            <div className="space-y-6">
              {/* Birthdays */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 md:p-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-rose-500" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Birthdays This Month ({format(new Date(), 'MMMM')})
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    {currentMonthBirthdays.length} Staff
                  </span>
                </div>

                {currentMonthBirthdays.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No birthdays recorded this month.</p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {currentMonthBirthdays.map((e, idx) => {
                      const bday = new Date(e[21]);
                      const isTodayBday = bday.getDate() === new Date().getDate();
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                            isTodayBday
                              ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                              : 'bg-gray-50 border-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <div>
                              <span className="font-bold text-gray-900">{e[1]}</span>
                              <span className="text-gray-400 text-[10px] ml-1.5">({e[3]})</span>
                            </div>
                          </div>
                          <div className="font-mono text-xs font-semibold text-rose-600">
                            {format(bday, 'dd MMM')}
                            {isTodayBday && ' 🎂'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Supervisors on Duty */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 md:p-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#1ABB9C]" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Supervisors & Line Leads
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {uniqueSupervisors.length} Leads
                  </span>
                </div>

                {uniqueSupervisors.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No supervisor records mapped.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueSupervisors.map((name, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium px-2.5 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Workforce Perspective */}
      {activeExecutiveTab === 'workforce' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Active Headcount</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{activeEmployees.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">{uniqueDepartmentsCount} Departments Covered</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Shift Coverage</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{shiftStats.aShiftCount} / {shiftStats.bShiftCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Day Shift / Night Shift</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Leave Pipeline</div>
              <div className="text-2xl font-black text-teal-700 mt-1">{leaveStats.settled} Settled</div>
              <div className="text-xs text-amber-600 font-bold mt-0.5">{leaveStats.pendingApproval + leaveStats.hrPending} Action Required</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Supervisors on Roster</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{uniqueSupervisors.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Active Line Leads</div>
            </div>
          </div>

          <ModuleBreakdowns
            tasks={authorizedTasks}
            leaves={filteredLeaves}
            machines={machines}
            kpiRecords={filteredKpis}
            breakdowns={filteredBreakdowns}
            shifts={activeEmployees}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* Manufacturing Perspective */}
      {activeExecutiveTab === 'manufacturing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Nominal Output</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{machineStats.totalDailyCapacity.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-0.5">Pcs / Day Capacity</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Fleet Health</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{machineStats.active} Active</div>
              <div className="text-xs text-amber-600 font-bold mt-0.5">{machineStats.obsolete} Obsolete Units</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Line Stoppages</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{breakdownStats.activeDownCount} Down Now</div>
              <div className="text-xs text-gray-500 mt-0.5">{breakdownStats.total} Total Incidents</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Downtime Hours Lost</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{breakdownStats.hoursLost} hrs</div>
              <div className="text-xs text-gray-500 mt-0.5">Cost: ৳{breakdownStats.totalCost.toLocaleString()}</div>
            </div>
          </div>

          <DepartmentMatrix
            departmentMetrics={departmentMetrics}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* Tasks Perspective */}
      {activeExecutiveTab === 'tasks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Task Delivery Rate</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">{taskStats.completionRate}%</div>
              <div className="text-xs text-gray-500 mt-0.5">{taskStats.completed} of {taskStats.total} Completed</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Due Today</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{taskStats.todayDue}</div>
              <div className="text-xs text-gray-500 mt-0.5">Scheduled for today</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Overdue Tasks</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{taskStats.overdue}</div>
              <div className="text-xs text-rose-600 font-bold mt-0.5">Requires immediate action</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">In Progress</div>
              <div className="text-2xl font-black text-blue-600 mt-1">{taskStats.inProgress}</div>
              <div className="text-xs text-gray-500 mt-0.5">Active execution</div>
            </div>
          </div>

          <TodaysPriorities
            alerts={alertItems.filter(a => a.module === 'Daily Tasks')}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* KPI & Quality Perspective */}
      {activeExecutiveTab === 'kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Avg Achievement</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{kpiStats.totalEvaluated > 0 ? `${Math.round(kpiStats.avgAchievement)}%` : '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Against targets</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Average Star Rating</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{kpiStats.avgRating > 0 ? `${kpiStats.avgRating.toFixed(1)} / 5.0` : '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Enterprise average</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Evaluated Personnel</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{kpiStats.totalEvaluated}</div>
              <div className="text-xs text-gray-500 mt-0.5">Staff recorded</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase">Underperforming (&lt;80%)</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{kpiStats.belowTargetCount}</div>
              <div className="text-xs text-rose-600 font-bold mt-0.5">Coaching needed</div>
            </div>
          </div>

          <DepartmentMatrix
            departmentMetrics={departmentMetrics}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* Activity Timeline Perspective */}
      {activeExecutiveTab === 'activity' && (
        <div className="space-y-6">
          <RecentActivity
            activities={recentActivities}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* Executive Briefing Modal */}
      <ExecutiveBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        dateRangeLabel={activeDateRange.label}
        employeeCount={activeEmployees.length}
        taskStats={taskStats}
        leaveStats={leaveStats}
        machineStats={machineStats}
        breakdownStats={breakdownStats}
        kpiStats={kpiStats}
        departmentMetrics={departmentMetrics}
        alerts={alertItems}
        userSecurityScope={userSecurityScope}
      />

      {/* Drilldown Inspector Modal */}
      <DashboardDrilldownModal
        isOpen={drilldownModal.isOpen}
        onClose={() => setDrilldownModal({ ...drilldownModal, isOpen: false })}
        title={drilldownModal.title}
        subtitle={drilldownModal.subtitle}
        type={drilldownModal.type}
        data={drilldownModal.data}
        onNavigate={onNavigate}
      />
    </div>
  );
}

