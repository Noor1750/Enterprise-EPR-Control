import { 
  BreakdownRecord, 
  BreakdownStatus, 
  BreakdownCalculationDetails, 
  DailyCalculationBreakdown 
} from '../types/breakdown';
import { 
  HolidayRecord, 
  HolidayOverride, 
  parseHolidayRow, 
  parseOverrideRow, 
  evaluateDateWorkingStatus,
  getDayName,
  isWeeklyOff
} from './holidayEngine';
import { format, parseISO, isValid, addDays, differenceInMinutes } from 'date-fns';
import * as XLSX from 'xlsx';

/**
 * Standard default options for Breakdown Master Settings
 */
export const DEFAULT_FAILURE_MODES = [
  'Mechanical',
  'Electrical',
  'Electronic',
  'Software',
  'RFID / Encoding',
  'Sensor',
  'Pneumatic',
  'Hydraulic',
  'Printing',
  'Cutting',
  'Communication',
  'Network',
  'Other'
];

export const DEFAULT_CATEGORIES = [
  'Breakdown',
  'Preventive Maintenance',
  'Corrective Maintenance',
  'Calibration',
  'Inspection',
  'Setup',
  'Other'
];

export const DEFAULT_ACTIVITIES = [
  'Sensor adjustment',
  'Sensor replacement',
  'Print head cleaning',
  'Print head replacement',
  'Belt replacement',
  'Motor checking',
  'Software restart',
  'Electrical connection checking',
  'Machine alignment',
  'RFID reader replacement',
  'Calibration',
  'Troubleshooting',
  'Cleaning',
  'Other'
];

export const DEFAULT_SPARE_PARTS = [
  { name: 'Sensor', defaultCost: 45, uom: 'PCS' },
  { name: 'Motor', defaultCost: 180, uom: 'PCS' },
  { name: 'Bearing', defaultCost: 25, uom: 'PCS' },
  { name: 'Belt', defaultCost: 35, uom: 'PCS' },
  { name: 'Print Head', defaultCost: 220, uom: 'PCS' },
  { name: 'RFID Reader', defaultCost: 310, uom: 'PCS' },
  { name: 'Cable', defaultCost: 15, uom: 'METER' },
  { name: 'Power Supply', defaultCost: 95, uom: 'PCS' },
  { name: 'Software Service', defaultCost: 150, uom: 'SERVICE' },
  { name: 'External Technician Service', defaultCost: 200, uom: 'HOUR' },
  { name: 'Other', defaultCost: 0, uom: 'PCS' }
];

export const DEFAULT_UOMS = [
  'PCS',
  'SET',
  'METER',
  'KG',
  'LITER',
  'HOUR',
  'SERVICE',
  'OTHER'
];

export const BREAKDOWN_STATUSES: BreakdownStatus[] = [
  'Open',
  'Under Investigation',
  'Maintenance in Progress',
  'Waiting for Spare Parts',
  'Waiting for Service',
  'Completed',
  'Closed',
  'Cancelled'
];

/**
 * Converts a time string (e.g. "10:35", "10:35 AM", "2:20 PM", "14:20") to total minutes from midnight (0-1439).
 */
export function timeStringToMinutes(timeStr?: string): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const trimmed = timeStr.trim().toUpperCase();

  // Match 24hr or 12hr formats: "HH:MM", "H:MM", "HH:MM AM/PM"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3];

  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes >= 60) return null;

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  if (hours < 0 || hours >= 24) return null;

  return hours * 60 + minutes;
}

/**
 * Formats standard 24h minutes into clean HH:MM string (or 12h formatted)
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculate response time in minutes: Attend At - Report At
 */
export function calculateResponseTime(reportAt?: string, attendAt?: string): { minutes: number; isValid: boolean; error?: string } {
  if (!reportAt || !attendAt) {
    return { minutes: 0, isValid: true };
  }

  const reportMin = timeStringToMinutes(reportAt);
  const attendMin = timeStringToMinutes(attendAt);

  if (reportMin === null || attendMin === null) {
    return { minutes: 0, isValid: false, error: 'Invalid time format' };
  }

  let diff = attendMin - reportMin;
  // If breakdown started near midnight (e.g. 23:50 and attended 00:10)
  if (diff < 0 && (attendMin + 1440 - reportMin) <= 720) {
    diff += 1440;
  }

  if (diff < 0) {
    return { minutes: 0, isValid: false, error: 'Attend At cannot be earlier than Report At' };
  }

  return { minutes: diff, isValid: true };
}

/**
 * Normalizes raw or typed holidays list into typed HolidayRecord[]
 */
export function normalizeHolidays(rawHolidays?: any[]): HolidayRecord[] {
  if (!rawHolidays || rawHolidays.length === 0) return [];
  if (typeof rawHolidays[0] === 'object' && 'date' in rawHolidays[0] && 'workType' in rawHolidays[0]) {
    return rawHolidays as HolidayRecord[];
  }
  return rawHolidays.map((row, idx) => {
    if (Array.isArray(row)) {
      return parseHolidayRow(row, idx);
    }
    return row as HolidayRecord;
  }).filter(h => h && h.date);
}

/**
 * Normalizes raw or typed overrides list into typed HolidayOverride[]
 */
export function normalizeOverrides(rawOverrides?: any[]): HolidayOverride[] {
  if (!rawOverrides || rawOverrides.length === 0) return [];
  if (typeof rawOverrides[0] === 'object' && 'date' in rawOverrides[0] && 'workingHours' in rawOverrides[0]) {
    return rawOverrides as HolidayOverride[];
  }
  return rawOverrides.map((row, idx) => {
    if (Array.isArray(row)) {
      return parseOverrideRow(row, idx);
    }
    return row as HolidayOverride;
  }).filter(o => o && o.date);
}

/**
 * Shift Window Structure
 */
interface ShiftWindow {
  name: string; // 'Day Shift' | 'Night Shift'
  start: Date;
  end: Date;
  scheduledHours: number; // 8.0
}

/**
 * Builds scheduled shift time windows for a specific working date
 * - Day Shift: 08:00 to 16:00 (8h)
 * - Night Shift: 20:00 to 04:00 (next morning) (8h) (or 22:00 to 06:00)
 * - Total daily capacity: 16.0 hours
 */
function getShiftWindowsForDate(
  dateStr: string,
  manpowerAllocation: string = 'Both Shift',
  overrideShift?: string,
  overrideHours?: number,
  shiftsList: string[][] = []
): ShiftWindow[] {
  const [y, m, d] = dateStr.split('-').map(v => parseInt(v, 10));
  if (!y || !m || !d) return [];

  // Look for custom shift definitions from Shifts sheet if present
  let dayStartHHMM = '08:00';
  let dayEndHHMM = '16:00';
  let nightStartHHMM = '20:00';
  let nightEndHHMM = '04:00';

  if (shiftsList && shiftsList.length > 0) {
    const dayRow = shiftsList.find(s => s[1] && s[1].toLowerCase().includes('day'));
    if (dayRow && dayRow[2] && dayRow[3]) {
      dayStartHHMM = dayRow[2].trim();
      dayEndHHMM = dayRow[3].trim();
    }
    const nightRow = shiftsList.find(s => s[1] && s[1].toLowerCase().includes('night'));
    if (nightRow && nightRow[2] && nightRow[3]) {
      nightStartHHMM = nightRow[2].trim();
      nightEndHHMM = nightRow[3].trim();
    }
  }

  const parseHHMM = (baseDate: Date, timeStr: string, addDaysCount = 0): Date => {
    const mins = timeStringToMinutes(timeStr) || 0;
    const target = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + addDaysCount, 0, 0, 0, 0);
    target.setMinutes(mins);
    return target;
  };

  const baseDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  const windows: ShiftWindow[] = [];

  const dayStart = parseHHMM(baseDate, dayStartHHMM, 0);
  const dayEnd = parseHHMM(baseDate, dayEndHHMM, 0);

  const nightStartMins = timeStringToMinutes(nightStartHHMM) || 1200;
  const nightEndMins = timeStringToMinutes(nightEndHHMM) || 240;
  const nightCrossesMidnight = nightEndMins <= nightStartMins;

  const nightStart = parseHHMM(baseDate, nightStartHHMM, 0);
  const nightEnd = parseHHMM(baseDate, nightEndHHMM, nightCrossesMidnight ? 1 : 0);

  // Check if specific override applies
  if (overrideShift && overrideShift !== 'All') {
    if (overrideShift.toLowerCase().includes('day')) {
      windows.push({
        name: 'Day Shift',
        start: dayStart,
        end: dayEnd,
        scheduledHours: overrideHours || 8
      });
      return windows;
    }
    if (overrideShift.toLowerCase().includes('night')) {
      windows.push({
        name: 'Night Shift',
        start: nightStart,
        end: nightEnd,
        scheduledHours: overrideHours || 8
      });
      return windows;
    }
  }

  // Machine Manpower Allocation check
  if (manpowerAllocation === 'One Shift' || manpowerAllocation === 'Day Shift') {
    windows.push({
      name: 'Day Shift',
      start: dayStart,
      end: dayEnd,
      scheduledHours: overrideHours || 8
    });
    return windows;
  }

  // Standard Factory: Both Shifts (16 Hours Production Schedule)
  windows.push({
    name: 'Day Shift',
    start: dayStart,
    end: dayEnd,
    scheduledHours: 8
  });

  windows.push({
    name: 'Night Shift',
    start: nightStart,
    end: nightEnd,
    scheduledHours: 8
  });

  return windows;
}

/**
 * Enhanced calculation of Working Hours Lost and Production Loss (Lost PCS)
 * 
 * Main Rules:
 * 1. Counts ONLY actual scheduled working hours (Factory Standard: 16h/day max = Day Shift 8h + Night Shift 8h).
 * 2. Excludes:
 *    - Friday weekly off (0 hours lost)
 *    - Official Non-Working Holidays (0 hours lost)
 *    - Off-shift / non-working hours between scheduled shifts
 * 3. Priority Order:
 *    1. Specific Machine / Department Working Override (HolidayOverrides)
 *    2. Working Holiday (Holidays with workType === 'Working Holiday')
 *    3. Official Non-Working Holiday (Holidays with workType !== 'Working Holiday') -> 0 hours
 *    4. Friday Weekly Off -> 0 hours
 *    5. Normal Working Day -> Scheduled shifts (up to 16h/day)
 * 4. Cross-Midnight & Multi-Day breakdown handling:
 *    Accurately computes interval overlap for each scheduled shift window.
 * 5. Production Loss:
 *    Lost PCS = Valid Working Hours Lost × Standard Hourly Capacity (0 if Working Hours Lost = 0).
 */
export function calculateWorkingHourLost(
  reportDate?: string,
  reportAt?: string, 
  machineStartDate?: string,
  machineStartAt?: string, 
  productionStop: 'Yes' | 'No' = 'Yes',
  holidaysInput: any[] = [],
  overridesInput: any[] = [],
  machineName?: string,
  machinesList: string[][] = [],
  department?: string,
  shiftsList: string[][] = []
): { 
  minutes: number; 
  decimalHours: number; 
  formatted: string; 
  isValid: boolean; 
  error?: string;
  elapsedMinutes: number;
  elapsedHours: number;
  formattedElapsed: string;
  lostPcs: number;
  hourlyCapacityPcs: number;
  standardUnit: string;
  fridayExcludedHours: number;
  holidayExcludedHours: number;
  offShiftExcludedHours: number;
  totalExcludedHours: number;
  dailyBreakdowns: DailyCalculationBreakdown[];
  calendarSummary: string;
  shiftSummary: string;
  calculationDetails: BreakdownCalculationDetails;
} {
  // Default Empty Result Builder
  const buildEmptyResult = (errMsg?: string, isValidState = true) => {
    const details: BreakdownCalculationDetails = {
      totalElapsedHours: 0,
      totalWorkingHoursLost: 0,
      formattedWorkingHoursLost: '0h 00m (0.00 Hrs)',
      formattedElapsed: '0h 00m (0.00 Elapsed Hrs)',
      totalLostPcs: 0,
      hourlyCapacityPcs: 0,
      standardUnit: 'PCS',
      totalLostMachineUnits: 0,
      fridayExcludedHours: 0,
      holidayExcludedHours: 0,
      offShiftExcludedHours: 0,
      totalExcludedHours: 0,
      dailyDetails: [],
      calendarStatusSummary: errMsg || 'No Production Stop',
      shiftSummary: 'Day & Night Shifts (16h)',
      isValid: isValidState,
      error: errMsg
    };

    return {
      minutes: 0,
      decimalHours: 0,
      formatted: '0 Hours (No Stop)',
      isValid: isValidState,
      error: errMsg,
      elapsedMinutes: 0,
      elapsedHours: 0,
      formattedElapsed: '0 Hours',
      lostPcs: 0,
      hourlyCapacityPcs: 0,
      standardUnit: 'PCS',
      fridayExcludedHours: 0,
      holidayExcludedHours: 0,
      offShiftExcludedHours: 0,
      totalExcludedHours: 0,
      dailyBreakdowns: [],
      calendarSummary: 'No Stop',
      shiftSummary: 'Standard 16h',
      calculationDetails: details
    };
  };

  if (productionStop === 'No') {
    return buildEmptyResult();
  }

  if (!reportAt || !machineStartAt) {
    const res = buildEmptyResult();
    res.formatted = '—';
    return res;
  }

  const reportMin = timeStringToMinutes(reportAt);
  const startMin = timeStringToMinutes(machineStartAt);

  if (reportMin === null || startMin === null) {
    const res = buildEmptyResult('Invalid time format', false);
    res.formatted = '—';
    return res;
  }

  const rDateStr = (reportDate && reportDate.trim()) || new Date().toISOString().substring(0, 10);
  const sDateStr = (machineStartDate && machineStartDate.trim()) || rDateStr;

  const rParts = rDateStr.split('-').map(v => parseInt(v, 10));
  const sParts = sDateStr.split('-').map(v => parseInt(v, 10));

  if (rParts.length !== 3 || sParts.length !== 3) {
    const res = buildEmptyResult('Invalid date format', false);
    res.formatted = '—';
    return res;
  }

  const breakdownStartTime = new Date(rParts[0], rParts[1] - 1, rParts[2], 0, 0, 0, 0);
  breakdownStartTime.setMinutes(reportMin);

  const breakdownEndTime = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0);
  breakdownEndTime.setMinutes(startMin);

  // If start and end are on the same day and end time < start time, assume crossing midnight (next day)
  if (rDateStr === sDateStr && breakdownEndTime.getTime() < breakdownStartTime.getTime()) {
    breakdownEndTime.setDate(breakdownEndTime.getDate() + 1);
  }

  if (breakdownEndTime.getTime() < breakdownStartTime.getTime()) {
    const res = buildEmptyResult('Machine Start time cannot be earlier than Report time', false);
    res.formatted = '—';
    return res;
  }

  // Normalize Holidays & Overrides
  const holidays = normalizeHolidays(holidaysInput);
  const overrides = normalizeOverrides(overridesInput);

  // Machine Capacity
  const machineCap = getMachineCapacityMetrics(machineName, machinesList);
  const hourlyCap = machineCap.hourlyCapacityPcs || 0;

  // Determine Machine Manpower Allocation (e.g. 'Both Shift' vs 'One Shift')
  let manpowerAllocation = 'Both Shift';
  if (machineName && machinesList.length > 0) {
    const matched = machinesList.find(m => 
      (m[4] && m[4].toLowerCase() === machineName.toLowerCase()) ||
      (m[0] && m[0].toLowerCase() === machineName.toLowerCase())
    );
    if (matched && matched[15]) {
      manpowerAllocation = matched[15];
    }
  }

  // Calendar Elapsed Duration
  const totalElapsedMs = breakdownEndTime.getTime() - breakdownStartTime.getTime();
  const totalElapsedMinutes = Math.max(0, Math.round(totalElapsedMs / 60000));
  const totalElapsedHours = Math.round((totalElapsedMinutes / 60) * 100) / 100;

  // Day-by-Day Iteration
  const dailyBreakdowns: DailyCalculationBreakdown[] = [];
  let totalWorkingMinutesLost = 0;
  let totalFridayExcludedMinutes = 0;
  let totalHolidayExcludedMinutes = 0;
  let totalOffShiftExcludedMinutes = 0;

  // Get range of dates from breakdown start date to breakdown end date
  let curDate = new Date(breakdownStartTime.getFullYear(), breakdownStartTime.getMonth(), breakdownStartTime.getDate(), 0, 0, 0, 0);
  const endCalendarDate = new Date(breakdownEndTime.getFullYear(), breakdownEndTime.getMonth(), breakdownEndTime.getDate(), 0, 0, 0, 0);

  // Also include the next day if a night shift extends into it
  const maxIterationDate = new Date(endCalendarDate);
  maxIterationDate.setDate(maxIterationDate.getDate() + 1);

  while (curDate <= maxIterationDate) {
    const dateString = format(curDate, 'yyyy-MM-dd');
    const dayName = getDayName(curDate);
    
    // Evaluate working status using Centralized Holiday & Override Engine
    const evalStatus = evaluateDateWorkingStatus(curDate, holidays, overrides, department);

    // Calculate calendar downtime overlap with this 24-hour day
    const dayStart = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate(), 23, 59, 59, 999);

    const calOverlapStart = Math.max(breakdownStartTime.getTime(), dayStart.getTime());
    const calOverlapEnd = Math.min(breakdownEndTime.getTime(), dayEnd.getTime() + 1);
    const calDowntimeMin = calOverlapEnd > calOverlapStart ? Math.round((calOverlapEnd - calOverlapStart) / 60000) : 0;
    const calDowntimeHours = Math.round((calDowntimeMin / 60) * 100) / 100;

    let calendarStatus: DailyCalculationBreakdown['calendarStatus'] = 'Working Day';
    let holidayName = evalStatus.holidayName;
    let scheduledHours = 16;
    let activeShiftsLabels: string[] = ['Day Shift (08:00-16:00)', 'Night Shift (20:00-04:00)'];
    let dayWorkingMinutesLost = 0;
    let notes = '';

    if (evalStatus.override) {
      calendarStatus = 'Working Override';
      scheduledHours = evalStatus.override.workingHours || 16;
      activeShiftsLabels = [
        evalStatus.override.shift && evalStatus.override.shift !== 'All'
          ? `${evalStatus.override.shift} (${scheduledHours}h)`
          : `Approved Override (${scheduledHours}h)`
      ];
      notes = `Approved Override: ${evalStatus.override.remarks || 'Working Schedule Approved'}`;
    } else if (evalStatus.holiday && evalStatus.holiday.workType === 'Working Holiday') {
      calendarStatus = 'Working Holiday';
      scheduledHours = 16;
      activeShiftsLabels = ['Day Shift (08:00-16:00)', 'Night Shift (20:00-04:00)'];
      notes = `Working Holiday: ${evalStatus.holiday.name}`;
    } else if (evalStatus.holiday && evalStatus.holiday.workType !== 'Working Holiday') {
      calendarStatus = 'Official Non-Working Holiday';
      scheduledHours = 0;
      activeShiftsLabels = ['None (Holiday Closure)'];
      notes = `Excluded: ${evalStatus.holiday.name} (Official Non-Working Holiday)`;
      totalHolidayExcludedMinutes += calDowntimeMin;
    } else if (evalStatus.isWeeklyOff) {
      calendarStatus = 'Friday Weekly Off';
      scheduledHours = 0;
      activeShiftsLabels = ['None (Weekend Off)'];
      notes = 'Excluded: Friday Weekly Off';
      totalFridayExcludedMinutes += calDowntimeMin;
    } else {
      calendarStatus = 'Working Day';
      if (manpowerAllocation === 'One Shift' || manpowerAllocation === 'Day Shift') {
        scheduledHours = 8;
        activeShiftsLabels = ['Day Shift (08:00-16:00)'];
        notes = 'Single Shift Allocation (8h)';
      } else {
        scheduledHours = 16;
        activeShiftsLabels = ['Day Shift (08:00-16:00)', 'Night Shift (20:00-04:00)'];
        notes = 'Normal 2-Shift Production (16h)';
      }
    }

    // If it's a working day, calculate overlap with active scheduled shifts
    if (evalStatus.isWorkingDay && scheduledHours > 0) {
      const shiftWindows = getShiftWindowsForDate(
        dateString,
        manpowerAllocation,
        evalStatus.override?.shift,
        evalStatus.override?.workingHours,
        shiftsList
      );

      let shiftOverlapsMin = 0;
      shiftWindows.forEach(win => {
        const winStart = win.start.getTime();
        const winEnd = win.end.getTime();

        const overlapStart = Math.max(breakdownStartTime.getTime(), winStart);
        const overlapEnd = Math.min(breakdownEndTime.getTime(), winEnd);

        if (overlapEnd > overlapStart) {
          const overlapMin = Math.round((overlapEnd - overlapStart) / 60000);
          shiftOverlapsMin += overlapMin;
        }
      });

      // Cap single day's lost working time to scheduled daily working hours (e.g. 16h = 960m)
      const maxScheduledMinutes = scheduledHours * 60;
      dayWorkingMinutesLost = Math.min(maxScheduledMinutes, shiftOverlapsMin);

      // Off-shift downtime excluded
      const offShiftMin = Math.max(0, calDowntimeMin - dayWorkingMinutesLost);
      totalOffShiftExcludedMinutes += offShiftMin;
    }

    const dayWorkingHoursLost = Math.round((dayWorkingMinutesLost / 60) * 100) / 100;
    const dayLostPcs = Math.round(dayWorkingHoursLost * hourlyCap);
    const dayExcludedHours = Math.round((Math.max(0, calDowntimeHours - dayWorkingHoursLost)) * 100) / 100;

    // Only push to dailyBreakdowns if there was calendar downtime or it's within the main breakdown date span
    if (calDowntimeMin > 0 || (curDate >= breakdownStartTime && curDate <= breakdownEndTime)) {
      dailyBreakdowns.push({
        date: dateString,
        dayName,
        calendarStatus,
        holidayName,
        isWorkingDay: evalStatus.isWorkingDay,
        scheduledWorkingHours: scheduledHours,
        activeShifts: activeShiftsLabels,
        calendarDowntimeHours: calDowntimeHours,
        workingHoursLost: dayWorkingHoursLost,
        excludedHours: dayExcludedHours,
        lostPcs: dayLostPcs,
        notes
      });
      totalWorkingMinutesLost += dayWorkingMinutesLost;
    }

    curDate.setDate(curDate.getDate() + 1);
  }

  const decimalHours = Math.round((totalWorkingMinutesLost / 60) * 100) / 100;
  const lostHours = Math.floor(totalWorkingMinutesLost / 60);
  const lostMins = totalWorkingMinutesLost % 60;

  let formatted = '';
  if (lostHours > 0 && lostMins > 0) {
    formatted = `${lostHours}h ${lostMins}m (${decimalHours.toFixed(2)} Hrs)`;
  } else if (lostHours > 0) {
    formatted = `${lostHours}h (${decimalHours.toFixed(2)} Hrs)`;
  } else if (lostMins > 0) {
    formatted = `${lostMins}m (${decimalHours.toFixed(2)} Hrs)`;
  } else {
    formatted = `0 Hours (0.00 Hrs)`;
  }

  // Total Lost PCS calculation
  const totalLostPcs = decimalHours > 0 ? Math.round(decimalHours * hourlyCap) : 0;
  const totalLostMachineUnits = Math.round(decimalHours * (machineCap.hourlyCapacityMachineUnit || 0) * 100) / 100;

  const elapsedH = Math.floor(totalElapsedMinutes / 60);
  const elapsedM = totalElapsedMinutes % 60;
  const formattedElapsed = `${elapsedH}h ${elapsedM}m (${totalElapsedHours.toFixed(2)} Elapsed Hrs)`;

  const fridayExcludedHours = Math.round((totalFridayExcludedMinutes / 60) * 100) / 100;
  const holidayExcludedHours = Math.round((totalHolidayExcludedMinutes / 60) * 100) / 100;
  const offShiftExcludedHours = Math.round((totalOffShiftExcludedMinutes / 60) * 100) / 100;
  const totalExcludedHours = Math.round((fridayExcludedHours + holidayExcludedHours + offShiftExcludedHours) * 100) / 100;

  // Build Status & Shift Summaries
  const uniqueStatuses = Array.from(new Set(dailyBreakdowns.map(d => d.calendarStatus)));
  const calendarSummary = uniqueStatuses.join(' + ') || 'Working Day';
  const shiftSummary = manpowerAllocation === 'One Shift' ? 'Single Shift (8h/day)' : '2-Shift Schedule (16h/day)';

  const calculationDetails: BreakdownCalculationDetails = {
    totalElapsedHours,
    totalWorkingHoursLost: decimalHours,
    formattedWorkingHoursLost: formatted,
    formattedElapsed,
    totalLostPcs,
    hourlyCapacityPcs: Math.round(hourlyCap),
    standardUnit: machineCap.standardUnit || 'PCS',
    totalLostMachineUnits,
    fridayExcludedHours,
    holidayExcludedHours,
    offShiftExcludedHours,
    totalExcludedHours,
    dailyDetails: dailyBreakdowns,
    calendarStatusSummary: calendarSummary,
    shiftSummary,
    isValid: true
  };

  return {
    minutes: totalWorkingMinutesLost,
    decimalHours,
    formatted,
    isValid: true,
    elapsedMinutes: totalElapsedMinutes,
    elapsedHours: totalElapsedHours,
    formattedElapsed,
    lostPcs: totalLostPcs,
    hourlyCapacityPcs: Math.round(hourlyCap),
    standardUnit: machineCap.standardUnit || 'PCS',
    fridayExcludedHours,
    holidayExcludedHours,
    offShiftExcludedHours,
    totalExcludedHours,
    dailyBreakdowns,
    calendarSummary,
    shiftSummary,
    calculationDetails
  };
}

/**
 * Calculate production downtime / hour lost: Machine Start At - Report At (Simple fallback)
 */
export function calculateHourLost(
  reportAt?: string, 
  machineStartAt?: string, 
  productionStop: 'Yes' | 'No' = 'Yes'
): { 
  minutes: number; 
  decimalHours: number; 
  formatted: string; 
  isValid: boolean; 
  error?: string 
} {
  if (productionStop === 'No') {
    return { minutes: 0, decimalHours: 0, formatted: '0 Hours 0 Minutes', isValid: true };
  }

  if (!reportAt || !machineStartAt) {
    return { minutes: 0, decimalHours: 0, formatted: '—', isValid: true };
  }

  const reportMin = timeStringToMinutes(reportAt);
  const startMin = timeStringToMinutes(machineStartAt);

  if (reportMin === null || startMin === null) {
    return { minutes: 0, decimalHours: 0, formatted: '—', isValid: false, error: 'Invalid time format' };
  }

  let diff = startMin - reportMin;
  // Crossing midnight support
  if (diff < 0 && (startMin + 1440 - reportMin) <= 1440) {
    diff += 1440;
  }

  if (diff < 0) {
    return { minutes: 0, decimalHours: 0, formatted: '—', isValid: false, error: 'Machine Start At cannot be earlier than Report At' };
  }

  // Cap at 16h per day
  const cappedDiff = Math.min(960, diff);
  const decimalHours = Math.round((cappedDiff / 60) * 100) / 100;
  const hours = Math.floor(cappedDiff / 60);
  const mins = cappedDiff % 60;
  
  let formatted = '';
  if (hours > 0 && mins > 0) {
    formatted = `${hours} Hour${hours > 1 ? 's' : ''} ${mins} Minute${mins > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    formatted = `${hours} Hour${hours > 1 ? 's' : ''}`;
  } else {
    formatted = `${mins} Minute${mins > 1 ? 's' : ''}`;
  }

  return {
    minutes: cappedDiff,
    decimalHours,
    formatted: `${formatted} (${decimalHours.toFixed(2)} Hrs)`,
    isValid: true
  };
}

/**
 * Checks if a specific date string (YYYY-MM-DD) is a working day.
 * Respects Friday weekly off and Official Holidays from Holidays sheet.
 */
export function isWorkingDay(dateStr?: string, holidaysList: any[] = [], overridesList: any[] = []): boolean {
  if (!dateStr || !dateStr.trim()) return true;
  const holidays = normalizeHolidays(holidaysList);
  const overrides = normalizeOverrides(overridesList);
  const evalRes = evaluateDateWorkingStatus(dateStr, holidays, overrides);
  return evalRes.isWorkingDay;
}

/**
 * Extracts capacity metrics for a given machine from MachineCapacity sheet data
 */
export function getMachineCapacityMetrics(
  machineName?: string,
  machinesList: string[][] = []
): {
  found: boolean;
  standardUnit: string;
  capacity16Pcs: number;
  capacity16MachineUnit: number;
  hourlyCapacityPcs: number;
  hourlyCapacityMachineUnit: number;
  speedPerMin: number;
  utilization: string;
  manpowerAllocation: string;
} {
  if (!machineName || !machineName.trim() || machinesList.length === 0) {
    return {
      found: false,
      standardUnit: 'PCS',
      capacity16Pcs: 0,
      capacity16MachineUnit: 0,
      hourlyCapacityPcs: 0,
      hourlyCapacityMachineUnit: 0,
      speedPerMin: 0,
      utilization: '0%',
      manpowerAllocation: 'Both Shift'
    };
  }

  const nameTrim = machineName.trim().toLowerCase();
  const matched = machinesList.find(m => 
    (m[4] && m[4].trim().toLowerCase() === nameTrim) ||
    (m[0] && m[0].trim().toLowerCase() === nameTrim) ||
    (m[4] && m[4].trim().toLowerCase().includes(nameTrim)) ||
    (m[0] && m[0].trim().toLowerCase().includes(nameTrim))
  );

  if (!matched) {
    return {
      found: false,
      standardUnit: 'PCS',
      capacity16Pcs: 0,
      capacity16MachineUnit: 0,
      hourlyCapacityPcs: 0,
      hourlyCapacityMachineUnit: 0,
      speedPerMin: 0,
      utilization: '0%',
      manpowerAllocation: 'Both Shift'
    };
  }

  const standardUnit = matched[5] || 'PCS';
  const speedPerMin = parseFloat(matched[7] || '0') || 0;
  const utilization = matched[8] || '85%';
  const capacity16Pcs = parseFloat(matched[10] || '0') || (speedPerMin * 60 * 16 * 0.85);
  const capacity16MachineUnit = parseFloat(matched[11] || '0') || (capacity16Pcs > 0 ? capacity16Pcs : 16);
  const manpowerAllocation = matched[15] || 'Both Shift';

  // Standard Hourly Capacity is capacity per 16h / 16
  const hourlyCapacityPcs = capacity16Pcs > 0 ? capacity16Pcs / 16 : (speedPerMin * 60 * 0.85);
  const hourlyCapacityMachineUnit = capacity16MachineUnit > 0 ? capacity16MachineUnit / 16 : 1;

  return {
    found: true,
    standardUnit,
    capacity16Pcs,
    capacity16MachineUnit,
    hourlyCapacityPcs,
    hourlyCapacityMachineUnit,
    speedPerMin,
    utilization,
    manpowerAllocation
  };
}

/**
 * Calculates lost pieces (PCS) and lost machine units based on valid working hours lost and machine capacity
 */
export function calculateLostProduction(
  hourLostHours: number = 0,
  machineName?: string,
  machinesList: string[][] = []
): {
  lostPcs: number;
  lostMachineUnits: number;
  standardUnit: string;
  hourlyCapacityPcs: number;
  hourlyCapacityMachineUnit: number;
} {
  if (hourLostHours <= 0) {
    const cap = getMachineCapacityMetrics(machineName, machinesList);
    return {
      lostPcs: 0,
      lostMachineUnits: 0,
      standardUnit: cap.standardUnit || 'PCS',
      hourlyCapacityPcs: Math.round(cap.hourlyCapacityPcs),
      hourlyCapacityMachineUnit: Math.round(cap.hourlyCapacityMachineUnit * 100) / 100
    };
  }

  const cap = getMachineCapacityMetrics(machineName, machinesList);
  const lostPcs = Math.round(hourLostHours * cap.hourlyCapacityPcs);
  const lostMachineUnits = Math.round(hourLostHours * cap.hourlyCapacityMachineUnit * 100) / 100;

  return {
    lostPcs,
    lostMachineUnits,
    standardUnit: cap.standardUnit || 'PCS',
    hourlyCapacityPcs: Math.round(cap.hourlyCapacityPcs),
    hourlyCapacityMachineUnit: Math.round(cap.hourlyCapacityMachineUnit * 100) / 100
  };
}

/**
 * Generates next unique Breakdown ID e.g. BD-2026-00001
 */
export function generateBreakdownId(existingIds: string[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `BD-${currentYear}-`;

  let maxSeq = 0;
  existingIds.forEach(id => {
    if (id && id.startsWith(prefix)) {
      const numPart = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    } else if (id && id.startsWith('BD-')) {
      const parts = id.split('-');
      const numPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
}

/**
 * Converts a raw string[] from Google Sheets BreakdownLog into a typed BreakdownRecord object
 */
export function mapRowToBreakdownRecord(row: string[]): BreakdownRecord {
  const id = row[0] || '';
  const date = row[1] || '';
  const department = row[2] || '';
  const machineName = row[3] || '';
  const machineNo = row[4] || '';
  const problemDescription = row[5] || '';
  const productionStop = (row[6] === 'No' ? 'No' : 'Yes') as 'Yes' | 'No';
  const reportAt = row[7] || '';
  const reporterId = row[8] || '';
  const reporterName = row[9] || '';
  const attendAt = row[10] || '';
  const responseTimeMin = parseFloat(row[11] || '0') || 0;
  const machineStartAt = row[12] || '';
  const hourLostHours = parseFloat(row[13] || '0') || 0;
  const hourLostFormatted = row[14] || '';
  const attendById = row[15] || '';
  const attendByName = row[16] || '';
  const attendByAll = row[17] ? row[17].split(',').map(s => s.trim()).filter(Boolean) : [];
  const failureMode = row[18] || '';
  const category = row[19] || '';
  const activity = row[20] || '';
  const sparePartsService = row[21] || '';
  const quantity = parseFloat(row[22] || '0') || 0;
  const uom = row[23] || 'PCS';
  const unitCost = parseFloat(row[24] || '0') || 0;
  const totalCost = parseFloat(row[25] || '0') || (quantity * unitCost);
  const status = (row[26] || 'Open') as BreakdownStatus;
  const remarks = row[27] || '';
  const createdBy = row[28] || '';
  const createdAt = row[29] || '';
  const updatedBy = row[30] || '';
  const updatedAt = row[31] || '';

  return {
    id,
    date,
    department,
    machineName,
    machineNo,
    problemDescription,
    productionStop,
    reportAt,
    reporterId,
    reporterName,
    attendAt,
    responseTimeMin,
    machineStartAt,
    hourLostHours,
    hourLostFormatted: hourLostFormatted || (hourLostHours > 0 ? `${hourLostHours} Hours` : '0 Hours'),
    attendById,
    attendByName,
    attendByAll,
    failureMode,
    category,
    activity,
    sparePartsService,
    quantity,
    uom,
    unitCost,
    totalCost,
    status,
    remarks,
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
  };
}

/**
 * Converts a typed BreakdownRecord object into a sheet row array
 */
export function mapBreakdownRecordToRow(record: BreakdownRecord): string[] {
  return [
    record.id,
    record.date,
    record.department,
    record.machineName,
    record.machineNo,
    record.problemDescription,
    record.productionStop,
    record.reportAt,
    record.reporterId,
    record.reporterName,
    record.attendAt,
    String(record.responseTimeMin || 0),
    record.machineStartAt,
    String(record.hourLostHours || 0),
    record.hourLostFormatted,
    record.attendById,
    record.attendByName,
    record.attendByAll.join(', '),
    record.failureMode,
    record.category,
    record.activity,
    record.sparePartsService,
    String(record.quantity || 0),
    record.uom,
    String(record.unitCost || 0),
    String(record.totalCost || 0),
    record.status,
    record.remarks,
    record.createdBy,
    record.createdAt,
    record.updatedBy,
    record.updatedAt,
  ];
}

/**
 * Status color and badge helper
 */
export function getBreakdownStatusBadge(status: BreakdownStatus) {
  switch (status) {
    case 'Open':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        label: 'Open'
      };
    case 'Under Investigation':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
        label: 'Under Investigation'
      };
    case 'Maintenance in Progress':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        label: 'In Progress'
      };
    case 'Waiting for Spare Parts':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
        label: 'Waiting Parts'
      };
    case 'Waiting for Service':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
        label: 'Waiting Service'
      };
    case 'Completed':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Completed'
      };
    case 'Closed':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dot: 'bg-slate-500',
        label: 'Closed'
      };
    case 'Cancelled':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-500',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
        label: 'Cancelled'
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        label: status
      };
  }
}

/**
 * Export Breakdown Records to CSV
 */
export function exportBreakdownsToCSV(records: BreakdownRecord[], filename = 'Machine_Breakdown_Report.csv') {
  const headers = [
    'Breakdown ID',
    'Date',
    'Department',
    'Name of Machine',
    'Machine No',
    'Description of Problem',
    'Production Stop',
    'Report At',
    'Reporter ID',
    'Name of Reporter',
    'Attend At',
    'Response Time (Minutes)',
    'Machine Start At',
    'Hour Lost (Decimal Hrs)',
    'Hour Lost (Formatted)',
    'Attend By (Lead ID)',
    'Attend By (Lead Name)',
    'All Attending Technicians',
    'Failure Mode',
    'Category',
    'Activity',
    'Spare Parts / Service',
    'Quantity',
    'UOM',
    'Unit Cost ($)',
    'Total Cost ($)',
    'Status',
    'Remarks',
    'Created By',
    'Created At',
    'Updated By',
    'Updated At'
  ];

  const rows = records.map(r => [
    r.id,
    r.date,
    r.department,
    `"${(r.machineName || '').replace(/"/g, '""')}"`,
    r.machineNo,
    `"${(r.problemDescription || '').replace(/"/g, '""')}"`,
    r.productionStop,
    r.reportAt,
    r.reporterId,
    `"${(r.reporterName || '').replace(/"/g, '""')}"`,
    r.attendAt,
    r.responseTimeMin,
    r.machineStartAt,
    r.hourLostHours,
    `"${(r.hourLostFormatted || '').replace(/"/g, '""')}"`,
    r.attendById,
    `"${(r.attendByName || '').replace(/"/g, '""')}"`,
    `"${(r.attendByAll || []).join('; ').replace(/"/g, '""')}"`,
    r.failureMode,
    r.category,
    r.activity,
    `"${(r.sparePartsService || '').replace(/"/g, '""')}"`,
    r.quantity,
    r.uom,
    r.unitCost,
    r.totalCost,
    r.status,
    `"${(r.remarks || '').replace(/"/g, '""')}"`,
    r.createdBy,
    r.createdAt,
    r.updatedBy,
    r.updatedAt
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export Breakdown Records to Excel
 */
export function exportBreakdownsToExcel(records: BreakdownRecord[], filename = 'Machine_Breakdown_Report.xlsx') {
  const headers = [
    'Breakdown ID',
    'Date',
    'Department',
    'Name of Machine',
    'Machine No',
    'Description of Problem',
    'Production Stop',
    'Report At',
    'Reporter ID',
    'Name of Reporter',
    'Attend At',
    'Response Time (Minutes)',
    'Machine Start At',
    'Hour Lost (Decimal Hrs)',
    'Hour Lost (Formatted)',
    'Attend By (Lead ID)',
    'Attend By (Lead Name)',
    'All Attending Technicians',
    'Failure Mode',
    'Category',
    'Activity',
    'Spare Parts / Service',
    'Quantity',
    'UOM',
    'Unit Cost ($)',
    'Total Cost ($)',
    'Status',
    'Remarks',
    'Created By',
    'Created At',
    'Updated By',
    'Updated At'
  ];

  const dataRows = records.map(r => [
    r.id,
    r.date,
    r.department,
    r.machineName,
    r.machineNo,
    r.problemDescription,
    r.productionStop,
    r.reportAt,
    r.reporterId,
    r.reporterName,
    r.attendAt,
    r.responseTimeMin,
    r.machineStartAt,
    r.hourLostHours,
    r.hourLostFormatted,
    r.attendById,
    r.attendByName,
    r.attendByAll.join('; '),
    r.failureMode,
    r.category,
    r.activity,
    r.sparePartsService,
    r.quantity,
    r.uom,
    r.unitCost,
    r.totalCost,
    r.status,
    r.remarks,
    r.createdBy,
    r.createdAt,
    r.updatedBy,
    r.updatedAt
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Breakdown Log');
  XLSX.writeFile(workbook, filename);
}

// Aliases for convenience
export const rawRowToBreakdownRecord = mapRowToBreakdownRecord;
export const breakdownRecordToRow = mapBreakdownRecordToRow;
export const generateNextBreakdownId = generateBreakdownId;
