import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRange } from './sheets';
import { parseISO, isToday, isWithinInterval, startOfDay, endOfDay, isValid } from 'date-fns';

export interface EmployeeKpiSummary {
  records: Array<{
    id: string;
    month: string;
    date: string;
    plan: number;
    achievement: number;
    rating: number;
  }>;
  latestScore: number;
  latestRating: number;
  latestMonth: string;
  averageScore: number;
  averageRating: number;
  totalRecords: number;
}

export interface EmployeeSkillSummary {
  skills: Array<{
    machineJob: string;
    skillLevel: string;
    levelNumber: number;
  }>;
  totalSkills: number;
  highestLevel: string;
  highestLevelNumber: number;
}

export interface Employee5SSummary {
  assessments: Array<{
    id: string;
    date: string;
    month: string;
    sortScore: number;
    setInOrderScore: number;
    shineScore: number;
    standardizeScore: number;
    sustainScore: number;
    total5SScore: number;
    visualScore: number;
    finalScore: number;
    rating: string;
    remarks?: string;
    section?: string;
  }>;
  latestScore: number;
  latestRating: string;
  latestDate: string;
  averageScore: number;
  totalAssessments: number;
}

export interface EmployeeTaskSummary {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
    progress: number;
    dueDate: string;
    dueTime: string;
  }>;
  openCount: number;
  completedCount: number;
  urgentCount: number;
  totalCount: number;
}

export interface EmployeeBestPracticeSummary {
  items: Array<{
    id: string;
    date: string;
    details: string;
    savingsUSD: number;
  }>;
  totalSavingsUSD: number;
  totalCount: number;
}

export interface EmployeeLeaveSummary {
  leaves: Array<{
    id: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    days: number;
    status: string;
    reason: string;
  }>;
  totalDaysTaken: number;
  pendingCount: number;
  activeLeaveToday: boolean;
  currentLeaveStatus?: string;
}

export interface EmployeeOvertimeSummary {
  entries: Array<{
    id: string;
    date: string;
    hours: number;
  }>;
  totalHours: number;
}

export interface EmployeeBreakdownSummary {
  reported: Array<{
    id: string;
    date: string;
    machineName: string;
    problem: string;
    productionStop: boolean;
    status: string;
  }>;
  attended: Array<{
    id: string;
    date: string;
    machineName: string;
    responseTimeMin: number;
    hoursLost: number;
    activity: string;
    status: string;
  }>;
  totalAttendedCount: number;
  totalReportedCount: number;
}

export interface EmployeeFullAggregatedData {
  employeeId: string;
  kpi: EmployeeKpiSummary;
  skills: EmployeeSkillSummary;
  fiveS: Employee5SSummary;
  tasks: EmployeeTaskSummary;
  bestPractices: EmployeeBestPracticeSummary;
  leave: EmployeeLeaveSummary;
  overtime: EmployeeOvertimeSummary;
  breakdown: EmployeeBreakdownSummary;
}

// In-memory cache for all cross-module employee records
let memoryCache: {
  spreadsheetId: string;
  dataMap: Record<string, EmployeeFullAggregatedData>;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh cache

/**
 * Parses numeric skill level (e.g. "Level 4", "4", "Level 5 - Expert" -> 4)
 */
function parseSkillLevelNumber(str: string): number {
  const match = String(str || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

/**
 * Loads all sheets in parallel and builds a comprehensive index map for all employees
 */
export async function fetchAllEmployeeData(spreadsheetId: string, forceRefresh = false): Promise<Record<string, EmployeeFullAggregatedData>> {
  if (!spreadsheetId) return {};

  const now = Date.now();
  if (!forceRefresh && memoryCache && memoryCache.spreadsheetId === spreadsheetId && (now - memoryCache.timestamp < CACHE_TTL_MS)) {
    return memoryCache.dataMap;
  }

  try {
    const [
      kpiRaw,
      skillsRaw,
      fiveSRaw,
      tasksRaw,
      bpRaw,
      leaveRaw,
      otRaw,
      breakdownRaw
    ] = await Promise.all([
      getRange(spreadsheetId, 'KPI!A:Z').catch(() => []),
      getRange(spreadsheetId, 'SkillMatrix!A:Z').catch(() => []),
      getRange(spreadsheetId, 'FiveS_Assessments!A:AG').catch(() => []),
      getRange(spreadsheetId, 'Tasks!A:Z').catch(() => []),
      getRange(spreadsheetId, 'BestPractices!A:Z').catch(() => []),
      getRange(spreadsheetId, 'Leave!A:Z').catch(() => []),
      getRange(spreadsheetId, 'Overtime!A:Z').catch(() => []),
      getRange(spreadsheetId, 'BreakdownLog!A:Z').catch(() => [])
    ]);

    const dataMap: Record<string, EmployeeFullAggregatedData> = {};

    const getOrCreate = (empId: string): EmployeeFullAggregatedData => {
      const cleanId = String(empId || '').trim().toUpperCase();
      if (!dataMap[cleanId]) {
        dataMap[cleanId] = {
          employeeId: cleanId,
          kpi: { records: [], latestScore: 0, latestRating: 0, latestMonth: '', averageScore: 0, averageRating: 0, totalRecords: 0 },
          skills: { skills: [], totalSkills: 0, highestLevel: 'None', highestLevelNumber: 0 },
          fiveS: { assessments: [], latestScore: 0, latestRating: 'Not Assessed', latestDate: '', averageScore: 0, totalAssessments: 0 },
          tasks: { tasks: [], openCount: 0, completedCount: 0, urgentCount: 0, totalCount: 0 },
          bestPractices: { items: [], totalSavingsUSD: 0, totalCount: 0 },
          leave: { leaves: [], totalDaysTaken: 0, pendingCount: 0, activeLeaveToday: false },
          overtime: { entries: [], totalHours: 0 },
          breakdown: { reported: [], attended: [], totalAttendedCount: 0, totalReportedCount: 0 }
        };
      }
      return dataMap[cleanId];
    };

    // 1. Process KPI
    if (kpiRaw && kpiRaw.length > 1) {
      kpiRaw.slice(1).forEach(row => {
        const empId = String(row[1] || '').trim();
        if (!empId) return;
        const entry = getOrCreate(empId);
        const achievement = Number(row[7]) || 0;
        const rating = Number(row[8]) || 0;
        entry.kpi.records.push({
          id: String(row[0] || ''),
          month: String(row[4] || ''),
          date: String(row[5] || ''),
          plan: Number(row[6]) || 0,
          achievement,
          rating
        });
      });
    }

    // 2. Process Skill Matrix
    if (skillsRaw && skillsRaw.length > 1) {
      skillsRaw.slice(1).forEach(row => {
        const empId = String(row[0] || '').trim();
        if (!empId) return;
        const entry = getOrCreate(empId);
        const machineJob = String(row[1] || '').trim();
        const skillLevel = String(row[2] || 'Level 1').trim();
        const levelNumber = parseSkillLevelNumber(skillLevel);
        entry.skills.skills.push({ machineJob, skillLevel, levelNumber });
      });
    }

    // 3. Process 5S Assessments
    if (fiveSRaw && fiveSRaw.length > 1) {
      fiveSRaw.slice(1).forEach(row => {
        const empId = String(row[4] || '').trim();
        if (!empId) return;
        const entry = getOrCreate(empId);
        const finalScore = Number(row[22]) || Number(row[20]) || 0;
        const rating = String(row[23] || (finalScore >= 90 ? 'Excellent' : finalScore >= 80 ? 'Good' : finalScore >= 70 ? 'Satisfactory' : 'Needs Improvement')).trim();
        entry.fiveS.assessments.push({
          id: String(row[0] || ''),
          date: String(row[1] || ''),
          month: String(row[2] || ''),
          section: String(row[7] || ''),
          sortScore: Number(row[15]) || 0,
          setInOrderScore: Number(row[16]) || 0,
          shineScore: Number(row[17]) || 0,
          standardizeScore: Number(row[18]) || 0,
          sustainScore: Number(row[19]) || 0,
          total5SScore: Number(row[20]) || 0,
          visualScore: Number(row[21]) || 0,
          finalScore,
          rating,
          remarks: String(row[25] || '')
        });
      });
    }

    // 4. Process Tasks
    if (tasksRaw && tasksRaw.length > 1) {
      tasksRaw.slice(1).forEach(row => {
        const isDeleted = String(row[23] || '').toLowerCase() === 'true';
        if (isDeleted) return;
        const empId = String(row[3] || '').trim();
        if (!empId) return;
        const entry = getOrCreate(empId);
        const priority = (row[12] || 'Medium') as any;
        let status = (row[13] || 'Pending') as any;
        const progress = Number(row[14]) || (status === 'Completed' ? 100 : 0);
        const dueDate = String(row[10] || '');
        const dueTime = String(row[11] || '');

        // Calculate overdue status if passed
        if (status !== 'Completed' && dueDate) {
          try {
            const parsed = parseISO(dueDate);
            if (isValid(parsed) && parsed < startOfDay(new Date())) {
              status = 'Overdue';
            }
          } catch (e) { /* ignore */ }
        }

        entry.tasks.tasks.push({
          id: String(row[0] || ''),
          title: String(row[1] || 'Task'),
          description: String(row[2] || ''),
          category: String(row[8] || 'General'),
          priority,
          status,
          progress,
          dueDate,
          dueTime
        });
      });
    }

    // 5. Process Best Practices
    if (bpRaw && bpRaw.length > 1) {
      bpRaw.slice(1).forEach(row => {
        const empId = String(row[2] || '').trim();
        if (!empId) return;
        const entry = getOrCreate(empId);
        const savingsUSD = Number(row[7]) || 0;
        entry.bestPractices.items.push({
          id: String(row[0] || ''),
          date: String(row[1] || ''),
          details: String(row[6] || ''),
          savingsUSD
        });
      });
    }

    // 6. Process Leave
    const today = new Date();
    if (leaveRaw && leaveRaw.length > 1) {
      leaveRaw.slice(1).forEach(row => {
        const empId = String(row[1] || '').trim();
        if (!empId) return;
        const entry = getOrCreate(empId);
        const days = Number(row[7]) || 1;
        const status = String(row[8] || 'Pending').trim();
        const fromDate = String(row[5] || '');
        const toDate = String(row[6] || fromDate);
        const leaveType = String(row[18] || 'Annual Leave').trim();

        // Check if currently on approved leave today
        if (status === 'Approved' || status === 'Settlement' || status === 'HR Pending') {
          try {
            const start = startOfDay(parseISO(fromDate));
            const end = endOfDay(parseISO(toDate));
            if (isValid(start) && isValid(end) && isWithinInterval(today, { start, end })) {
              entry.leave.activeLeaveToday = true;
              entry.leave.currentLeaveStatus = `${leaveType} (${status})`;
            }
          } catch (e) { /* ignore */ }
        }

        entry.leave.leaves.push({
          id: String(row[0] || ''),
          leaveType,
          fromDate,
          toDate,
          days,
          status,
          reason: String(row[10] || '')
        });
      });
    }

    // 7. Process Overtime
    if (otRaw && otRaw.length > 1) {
      otRaw.slice(1).forEach(row => {
        const empId = String(row[2] || '').trim();
        if (!empId) return;
        const entry = getOrCreate(empId);
        const hours = Number(row[6]) || 0;
        entry.overtime.entries.push({
          id: String(row[0] || ''),
          date: String(row[1] || ''),
          hours
        });
      });
    }

    // 8. Process Breakdown Log
    if (breakdownRaw && breakdownRaw.length > 1) {
      breakdownRaw.slice(1).forEach(row => {
        const reporterId = String(row[8] || '').trim();
        const attendeeId = String(row[15] || '').trim();
        const machineName = String(row[3] || 'Machine');
        const problem = String(row[5] || '');
        const productionStop = String(row[6] || '').toLowerCase() === 'yes';
        const responseTimeMin = Number(row[11]) || 0;
        const hoursLost = Number(row[13]) || 0;
        const activity = String(row[20] || 'Maintenance');
        const status = String(row[26] || 'Closed');
        const date = String(row[1] || '');
        const bId = String(row[0] || '');

        if (reporterId) {
          const repEntry = getOrCreate(reporterId);
          repEntry.breakdown.reported.push({
            id: bId,
            date,
            machineName,
            problem,
            productionStop,
            status
          });
        }

        if (attendeeId) {
          const attEntry = getOrCreate(attendeeId);
          attEntry.breakdown.attended.push({
            id: bId,
            date,
            machineName,
            responseTimeMin,
            hoursLost,
            activity,
            status
          });
        }
      });
    }

    // Finalize all aggregated calculations
    Object.values(dataMap).forEach(entry => {
      // Finalize KPI
      entry.kpi.totalRecords = entry.kpi.records.length;
      if (entry.kpi.records.length > 0) {
        const sumScore = entry.kpi.records.reduce((acc, r) => acc + r.achievement, 0);
        const sumRating = entry.kpi.records.reduce((acc, r) => acc + r.rating, 0);
        entry.kpi.averageScore = Math.round(sumScore / entry.kpi.records.length);
        entry.kpi.averageRating = Number((sumRating / entry.kpi.records.length).toFixed(1));
        const latest = entry.kpi.records[entry.kpi.records.length - 1];
        entry.kpi.latestScore = latest.achievement;
        entry.kpi.latestRating = latest.rating;
        entry.kpi.latestMonth = latest.month;
      }

      // Finalize Skills
      entry.skills.totalSkills = entry.skills.skills.length;
      if (entry.skills.skills.length > 0) {
        const maxLevel = Math.max(...entry.skills.skills.map(s => s.levelNumber));
        entry.skills.highestLevelNumber = maxLevel;
        const maxItem = entry.skills.skills.find(s => s.levelNumber === maxLevel);
        entry.skills.highestLevel = maxItem ? maxItem.skillLevel : `Level ${maxLevel}`;
      }

      // Finalize 5S
      entry.fiveS.totalAssessments = entry.fiveS.assessments.length;
      if (entry.fiveS.assessments.length > 0) {
        const sumScore = entry.fiveS.assessments.reduce((acc, a) => acc + a.finalScore, 0);
        entry.fiveS.averageScore = Math.round(sumScore / entry.fiveS.assessments.length);
        const latest = entry.fiveS.assessments[entry.fiveS.assessments.length - 1];
        entry.fiveS.latestScore = latest.finalScore;
        entry.fiveS.latestRating = latest.rating;
        entry.fiveS.latestDate = latest.date;
      }

      // Finalize Tasks
      entry.tasks.totalCount = entry.tasks.tasks.length;
      entry.tasks.openCount = entry.tasks.tasks.filter(t => t.status !== 'Completed').length;
      entry.tasks.completedCount = entry.tasks.tasks.filter(t => t.status === 'Completed').length;
      entry.tasks.urgentCount = entry.tasks.tasks.filter(t => t.status !== 'Completed' && (t.priority === 'Urgent' || t.priority === 'High' || t.status === 'Overdue')).length;

      // Finalize Best Practices
      entry.bestPractices.totalCount = entry.bestPractices.items.length;
      entry.bestPractices.totalSavingsUSD = entry.bestPractices.items.reduce((acc, i) => acc + i.savingsUSD, 0);

      // Finalize Leave
      entry.leave.totalDaysTaken = entry.leave.leaves
        .filter(l => l.status === 'Approved' || l.status === 'Settlement')
        .reduce((acc, l) => acc + l.days, 0);
      entry.leave.pendingCount = entry.leave.leaves.filter(l => l.status === 'Pending' || l.status === 'HR Pending').length;

      // Finalize Overtime
      entry.overtime.totalHours = Number(entry.overtime.entries.reduce((acc, o) => acc + o.hours, 0).toFixed(1));

      // Finalize Breakdowns
      entry.breakdown.totalAttendedCount = entry.breakdown.attended.length;
      entry.breakdown.totalReportedCount = entry.breakdown.reported.length;
    });

    memoryCache = {
      spreadsheetId,
      dataMap,
      timestamp: Date.now()
    };

    return dataMap;
  } catch (err) {
    console.error('Failed to load employee cross-module data:', err);
    return {};
  }
}

/**
 * Custom React Hook for live employee cross-module aggregated data
 */
export function useEmployeeCrossModuleHub(spreadsheetId: string) {
  const [dataMap, setDataMap] = useState<Record<string, EmployeeFullAggregatedData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async (force = false) => {
    if (!spreadsheetId) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await fetchAllEmployeeData(spreadsheetId, force);
      setDataMap(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [spreadsheetId]);

  useEffect(() => {
    load();

    const handleDbUpdate = () => {
      load(true);
    };

    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, [load]);

  return { dataMap, isLoading, reload: () => load(true) };
}
