import { format, parseISO, isBefore, isAfter, isSameDay, addDays, getYear, getMonth, startOfMonth, endOfMonth, eachDayOfInterval, isValid } from 'date-fns';
import { getRange } from './sheets';

export type HolidayType = 
  | 'Public Holiday' 
  | 'Company Holiday' 
  | 'Festival Holiday' 
  | 'Special Holiday' 
  | 'Emergency Holiday' 
  | 'Weekly Off' 
  | 'Other';

export type HolidayWorkType = 'Non-Working Holiday' | 'Working Holiday';
export type HolidayStatus = 'Active' | 'Inactive';

export interface HolidayCalendarData {
  holidays: HolidayRecord[];
  overrides: HolidayOverride[];
  settings?: CalendarSettings;
}

export interface HolidayRecord {
  id: string;             // Holiday_ID (e.g. HOL-2026-001)
  name: string;           // Holiday_Name (e.g. Independence Day)
  date: string;           // Holiday_Date (YYYY-MM-DD)
  day: string;            // Day (e.g. Thursday)
  type: HolidayType;      // Holiday_Type
  workType: HolidayWorkType; // Work_Type ('Non-Working Holiday' | 'Working Holiday')
  description: string;    // Description / Remarks
  status: HolidayStatus;  // Status ('Active' | 'Inactive')
  createdBy: string;      // Created_By
  createdDate: string;    // Created_Date
  updatedBy: string;      // Updated_By
  updatedDate: string;    // Updated_Date
  rawRow?: string[];
}

export interface HolidayOverride {
  id: string;             // Override_ID
  date: string;           // YYYY-MM-DD
  holidayName: string;    // Reference holiday name
  department: string;     // 'All' or specific department
  section: string;        // 'All' or specific section
  workingHours: number;   // e.g. 8
  shift: string;          // 'Day Shift' | 'Night Shift' | 'Both Shift' | 'General' | 'All'
  remarks: string;        // Explanation why working
  approvedBy: string;     // Supervisor / Admin name
  createdAt: string;      // Timestamp
  rawRow?: string[];
}

export interface HolidayAuditRecord {
  id: string;             // Audit_ID
  holidayId: string;      // Holiday_ID
  holidayName: string;    // Holiday_Name
  action: 'Created' | 'Edited' | 'Activated' | 'Deactivated' | 'Deleted' | 'WorkType Changed' | 'Override Added';
  previousValue: string;  // JSON / Summary
  newValue: string;       // JSON / Summary
  changedBy: string;      // User
  changedAt: string;      // Timestamp
  remarks: string;        // Notes
}

export interface HolidayTypeConfig {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  status: 'Active' | 'Inactive';
}

export interface CalendarSettings {
  workingDaysPerWeek: number; // 6 (Saturday to Thursday)
  weeklyOffDay: string;       // 'Friday'
  updatedBy?: string;
  updatedAt?: string;
}

export const DEFAULT_HOLIDAY_TYPES: HolidayTypeConfig[] = [
  { id: 'HT-01', name: 'Public Holiday', description: 'National and government declared public holidays', status: 'Active' },
  { id: 'HT-02', name: 'Company Holiday', description: 'Company specific annual and founder holidays', status: 'Active' },
  { id: 'HT-03', name: 'Festival Holiday', description: 'Religious and cultural festival holidays', status: 'Active' },
  { id: 'HT-04', name: 'Special Holiday', description: 'One-off special corporate and management declared holidays', status: 'Active' },
  { id: 'HT-05', name: 'Emergency Holiday', description: 'Unplanned emergency or safety closure', status: 'Active' },
  { id: 'HT-06', name: 'Weekly Off', description: 'Scheduled weekly weekend off (Friday)', status: 'Active' },
  { id: 'HT-07', name: 'Other', description: 'General or unspecified holiday classification', status: 'Active' }
];

export const DEFAULT_2026_HOLIDAYS: Partial<HolidayRecord>[] = [
  { id: 'HOL-2026-001', name: 'New Year Day', date: '2026-01-01', day: 'Thursday', type: 'Public Holiday', workType: 'Non-Working Holiday', description: 'International New Year celebration', status: 'Active' },
  { id: 'HOL-2026-002', name: 'Shab-e-Barat', date: '2026-02-04', day: 'Wednesday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Holy night of forgiveness', status: 'Active' },
  { id: 'HOL-2026-003', name: 'International Mother Language Day', date: '2026-02-21', day: 'Saturday', type: 'Public Holiday', workType: 'Non-Working Holiday', description: 'Martyrs Day & Mother Language Day', status: 'Active' },
  { id: 'HOL-2026-004', name: 'Independence & National Day', date: '2026-03-26', day: 'Thursday', type: 'Public Holiday', workType: 'Non-Working Holiday', description: 'National Independence Day of Bangladesh', status: 'Active' },
  { id: 'HOL-2026-005', name: 'Jumatul Bida', date: '2026-03-20', day: 'Friday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Last Friday of Ramadan (Weekly Off)', status: 'Active' },
  { id: 'HOL-2026-006', name: 'Shab-e-Qadr', date: '2026-03-17', day: 'Tuesday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Night of Power', status: 'Active' },
  { id: 'HOL-2026-007', name: 'Eid-ul-Fitr Day 1', date: '2026-03-21', day: 'Saturday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Eid-ul-Fitr Holy Celebration', status: 'Active' },
  { id: 'HOL-2026-008', name: 'Eid-ul-Fitr Day 2', date: '2026-03-22', day: 'Sunday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Eid-ul-Fitr Holiday', status: 'Active' },
  { id: 'HOL-2026-009', name: 'Pahela Baishakh (Bengali New Year)', date: '2026-04-14', day: 'Tuesday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Bangla Noboborsho Festival', status: 'Active' },
  { id: 'HOL-2026-010', name: 'May Day (International Workers Day)', date: '2026-05-01', day: 'Friday', type: 'Public Holiday', workType: 'Non-Working Holiday', description: 'Labour rights & international solidarity', status: 'Active' },
  { id: 'HOL-2026-011', name: 'Buddha Purnima', date: '2026-05-31', day: 'Sunday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Gautama Buddha Birthday celebration', status: 'Active' },
  { id: 'HOL-2026-012', name: 'Eid-ul-Adha Day 1', date: '2026-05-28', day: 'Thursday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Feast of the Sacrifice Holy Holiday', status: 'Active' },
  { id: 'HOL-2026-013', name: 'Eid-ul-Adha Day 2', date: '2026-05-29', day: 'Friday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Eid-ul-Adha Celebration (Weekly Off)', status: 'Active' },
  { id: 'HOL-2026-014', name: 'Ashura', date: '2026-06-26', day: 'Friday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: '10th day of Muharram (Weekly Off)', status: 'Active' },
  { id: 'HOL-2026-015', name: 'National Mourning Day', date: '2026-08-15', day: 'Saturday', type: 'Public Holiday', workType: 'Non-Working Holiday', description: 'National remembrance day', status: 'Active' },
  { id: 'HOL-2026-016', name: 'Janmashtami', date: '2026-09-04', day: 'Friday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Lord Krishna celebration (Weekly Off)', status: 'Active' },
  { id: 'HOL-2026-017', name: 'Eid-e-Miladunnabi', date: '2026-08-27', day: 'Thursday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Holy Birthday of Prophet Muhammad (PBUH)', status: 'Active' },
  { id: 'HOL-2026-018', name: 'Durga Puja (Bijoya Dashami)', date: '2026-10-21', day: 'Wednesday', type: 'Festival Holiday', workType: 'Non-Working Holiday', description: 'Grand Hindu Durga Puja Festival', status: 'Active' },
  { id: 'HOL-2026-019', name: 'Victory Day (Bijoy Dibos)', date: '2026-12-16', day: 'Wednesday', type: 'Public Holiday', workType: 'Non-Working Holiday', description: 'Victory in Liberation War 1971', status: 'Active' },
  { id: 'HOL-2026-020', name: 'Christmas Day', date: '2026-12-25', day: 'Friday', type: 'Public Holiday', workType: 'Non-Working Holiday', description: 'Holy Christmas celebration (Weekly Off)', status: 'Active' }
];

/**
 * Parses raw sheet rows into strong HolidayRecord objects.
 * Handles both legacy 3-column format [Date, Type, Desc] and modern 12-column format.
 */
export function parseHolidayRow(row: string[], index: number = 0): HolidayRecord {
  // If row has 12 columns
  if (row.length >= 8) {
    const dateStr = String(row[2] || '').trim();
    let dayName = String(row[3] || '').trim();
    if (!dayName && dateStr) {
      try {
        dayName = format(parseISO(dateStr), 'EEEE');
      } catch {
        dayName = '';
      }
    }
    return {
      id: String(row[0] || `HOL-${index + 1}`).trim(),
      name: String(row[1] || 'Holiday').trim(),
      date: dateStr,
      day: dayName,
      type: (row[4] || 'Public Holiday') as HolidayType,
      workType: (row[5] || 'Non-Working Holiday') as HolidayWorkType,
      description: String(row[6] || '').trim(),
      status: (row[7] || 'Active') as HolidayStatus,
      createdBy: String(row[8] || 'Admin').trim(),
      createdDate: String(row[9] || '').trim(),
      updatedBy: String(row[10] || '').trim(),
      updatedDate: String(row[11] || '').trim(),
      rawRow: row
    };
  }

  // Legacy format: [Date, Type, Desc]
  const dateStr = String(row[0] || '').trim();
  let dayName = '';
  if (dateStr) {
    try {
      dayName = format(parseISO(dateStr), 'EEEE');
    } catch {
      dayName = '';
    }
  }
  const rawType = String(row[1] || '').trim();
  let mappedType: HolidayType = 'Public Holiday';
  if (rawType.toLowerCase().includes('weekend') || rawType.toLowerCase().includes('off')) {
    mappedType = 'Weekly Off';
  } else if (rawType.toLowerCase().includes('special')) {
    mappedType = 'Special Holiday';
  } else if (rawType.toLowerCase().includes('company')) {
    mappedType = 'Company Holiday';
  } else if (rawType.toLowerCase().includes('festival')) {
    mappedType = 'Festival Holiday';
  }

  return {
    id: `HOL-LEG-${index + 1}`,
    name: String(row[2] || row[1] || 'Company Holiday').trim(),
    date: dateStr,
    day: dayName,
    type: mappedType,
    workType: 'Non-Working Holiday',
    description: String(row[2] || '').trim(),
    status: 'Active',
    createdBy: 'Admin',
    createdDate: new Date().toISOString(),
    updatedBy: 'Admin',
    updatedDate: new Date().toISOString(),
    rawRow: row
  };
}

export function buildHolidayRow(h: HolidayRecord): string[] {
  return [
    h.id,
    h.name,
    h.date,
    h.day || getDayName(h.date),
    h.type,
    h.workType,
    h.description,
    h.status,
    h.createdBy,
    h.createdDate,
    h.updatedBy,
    h.updatedDate
  ];
}

export function parseOverrideRow(row: string[], index: number = 0): HolidayOverride {
  return {
    id: String(row[0] || `OVR-${index + 1}`).trim(),
    date: String(row[1] || '').trim(),
    holidayName: String(row[2] || '').trim(),
    department: String(row[3] || 'All').trim(),
    section: String(row[4] || 'All').trim(),
    workingHours: Number(row[5]) || 8,
    shift: String(row[6] || 'All').trim(),
    remarks: String(row[7] || '').trim(),
    approvedBy: String(row[8] || 'Admin').trim(),
    createdAt: String(row[9] || '').trim(),
    rawRow: row
  };
}

export function buildOverrideRow(o: HolidayOverride): string[] {
  return [
    o.id,
    o.date,
    o.holidayName,
    o.department,
    o.section,
    String(o.workingHours),
    o.shift,
    o.remarks,
    o.approvedBy,
    o.createdAt
  ];
}

export function parseAuditRow(row: string[]): HolidayAuditRecord {
  return {
    id: row[0] || '',
    holidayId: row[1] || '',
    holidayName: row[2] || '',
    action: (row[3] || 'Edited') as any,
    previousValue: row[4] || '',
    newValue: row[5] || '',
    changedBy: row[6] || '',
    changedAt: row[7] || '',
    remarks: row[8] || ''
  };
}

export function buildAuditRow(a: HolidayAuditRecord): string[] {
  return [
    a.id,
    a.holidayId,
    a.holidayName,
    a.action,
    a.previousValue,
    a.newValue,
    a.changedBy,
    a.changedAt,
    a.remarks
  ];
}

/**
 * Checks if a given date is the official Weekly Off (Friday in Bangladesh working schedule).
 */
export function isWeeklyOff(date: Date | string): boolean {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return false;
    return d.getDay() === 5; // 5 is Friday
  } catch {
    return false;
  }
}

export function getDayName(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return format(d, 'EEEE');
  } catch {
    return '';
  }
}

/**
 * Retrieves the holiday record for a date, if active.
 */
export function getHolidayForDate(
  date: Date | string,
  holidays: HolidayRecord[]
): HolidayRecord | null {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  const found = holidays.find(h => h.date === dateStr && h.status === 'Active');
  return found || null;
}

/**
 * Checks if a date has an active Working Override for a specific department/section.
 */
export function getWorkingOverride(
  date: Date | string,
  overrides: HolidayOverride[] = [],
  department?: string,
  section?: string
): HolidayOverride | null {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  const found = overrides.find(o => {
    if (o.date !== dateStr) return false;
    if (department && o.department !== 'All' && o.department.toLowerCase() !== department.toLowerCase()) {
      return false;
    }
    if (section && o.section !== 'All' && o.section.toLowerCase() !== section.toLowerCase()) {
      return false;
    }
    return true;
  });
  return found || null;
}

/**
 * Centralized Working Day Calculation.
 * Standard working schedule: Saturday to Thursday (Friday = Weekly Off).
 * Returns true if the day is a normal working day (or has a working override), false if Friday or active non-working holiday.
 */
export function isWorkingDay(
  date: Date | string,
  holidays: HolidayRecord[] = [],
  overrides: HolidayOverride[] = [],
  department?: string,
  section?: string
): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return false;

  const dateStr = format(d, 'yyyy-MM-dd');
  const override = getWorkingOverride(dateStr, overrides, department, section);
  if (override) {
    return true; // Explicitly overridden as a working day
  }

  // Check if Friday (weekly off)
  if (d.getDay() === 5) {
    return false;
  }

  // Check if active official holiday
  const hol = getHolidayForDate(dateStr, holidays);
  if (hol) {
    if (hol.workType === 'Working Holiday') {
      return true;
    }
    return false; // Non-working holiday
  }

  return true;
}

/**
 * Calculates the next recommended working day after (or starting on) a target date.
 */
export function getNextWorkingDay(
  startDate: Date | string,
  holidays: HolidayRecord[] = [],
  overrides: HolidayOverride[] = [],
  department?: string,
  section?: string
): string {
  let curr = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);
  if (!isValid(curr)) curr = new Date();

  // If the initial date is not a working day, increment
  let attempts = 0;
  while (attempts < 30) {
    curr = addDays(curr, 1);
    if (isWorkingDay(curr, holidays, overrides, department, section)) {
      return format(curr, 'yyyy-MM-dd');
    }
    attempts++;
  }
  return format(addDays(curr, 1), 'yyyy-MM-dd');
}

/**
 * Returns holiday details and working status for a specific date.
 */
export function evaluateDateWorkingStatus(
  date: Date | string,
  holidays: HolidayRecord[] = [],
  overrides: HolidayOverride[] = [],
  department?: string,
  section?: string
): {
  dateStr: string;
  dayName: string;
  isWorkingDay: boolean;
  isWeeklyOff: boolean;
  holiday: HolidayRecord | null;
  override: HolidayOverride | null;
  recommendedNextWorkingDay: string;
  statusLabel: string;
  holidayName?: string;
  holidayType?: HolidayType | string;
  isWorkingOverride?: boolean;
} {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const dateStr = isValid(d) ? format(d, 'yyyy-MM-dd') : String(date);
  const dayName = getDayName(d);
  const weeklyOff = isWeeklyOff(d);
  const hol = getHolidayForDate(dateStr, holidays);
  const override = getWorkingOverride(dateStr, overrides, department, section);
  const working = isWorkingDay(d, holidays, overrides, department, section);
  const nextWork = working ? dateStr : getNextWorkingDay(d, holidays, overrides, department, section);

  let statusLabel = 'Working Day';
  if (override) {
    statusLabel = `Working Override (${override.workingHours}h)`;
  } else if (hol) {
    statusLabel = `${hol.name} (${hol.workType})`;
  } else if (weeklyOff) {
    statusLabel = 'Weekly Off (Friday)';
  }

  return {
    dateStr,
    dayName,
    isWorkingDay: working,
    isWeeklyOff: weeklyOff,
    holiday: hol,
    override,
    recommendedNextWorkingDay: nextWork,
    statusLabel,
    holidayName: hol?.name,
    holidayType: hol ? hol.type : weeklyOff ? 'Weekend' : undefined,
    isWorkingOverride: Boolean(override)
  };
}

/**
 * Loads the complete central holiday dataset from Google Sheets / Local DB.
 */
export async function fetchHolidayCalendarData(spreadsheetId: string): Promise<HolidayCalendarData> {
  try {
    const [hRaw, oRaw] = await Promise.all([
      getRange(spreadsheetId, 'Holidays!A:Z').catch(() => []),
      getRange(spreadsheetId, 'HolidayDepartmentOverrides!A:Z').catch(() => [])
    ]);

    const rawHolidays = (hRaw.length > 1 ? hRaw.slice(1) : []).map((row, idx) => parseHolidayRow(row, idx));
    const overrides = (oRaw.length > 1 ? oRaw.slice(1) : []).map((row, idx) => parseOverrideRow(row, idx));

    const seen = new Set();
    const holidays = rawHolidays.filter(h => {
      if (seen.has(h.id)) return false;
      seen.add(h.id);
      return true;
    });

    return {
      holidays,
      overrides
    };
  } catch (err) {
    console.error('Error in fetchHolidayCalendarData:', err);
    return {
      holidays: [],
      overrides: []
    };
  }
}

/**
 * Returns working days count and holiday details for a specific month.
 */
export function getMonthWorkingStatistics(
  year: number,
  monthIndex: number, // 0 = Jan, 11 = Dec
  holidays: HolidayRecord[] = [],
  overrides: HolidayOverride[] = []
): {
  totalDaysInMonth: number;
  workingDaysCount: number;
  holidaysCount: number;
  weeklyOffCount: number;
  workingHolidaysCount: number;
  monthHolidays: HolidayRecord[];
} {
  const start = startOfMonth(new Date(year, monthIndex, 1));
  const end = endOfMonth(new Date(year, monthIndex, 1));
  const days = eachDayOfInterval({ start, end });

  let workingDaysCount = 0;
  let weeklyOffCount = 0;
  let holidaysCount = 0;
  let workingHolidaysCount = 0;
  const monthHolidays: HolidayRecord[] = [];

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const hol = getHolidayForDate(dateStr, holidays);
    const isFriday = day.getDay() === 5;
    const isWorking = isWorkingDay(day, holidays, overrides);

    if (isWorking) {
      workingDaysCount++;
    }
    if (isFriday) {
      weeklyOffCount++;
    }
    if (hol) {
      monthHolidays.push(hol);
      if (hol.workType === 'Working Holiday') {
        workingHolidaysCount++;
      } else {
        holidaysCount++;
      }
    }
  });

  return {
    totalDaysInMonth: days.length,
    workingDaysCount,
    holidaysCount,
    weeklyOffCount,
    workingHolidaysCount,
    monthHolidays
  };
}

/**
 * Calculates effective working days in a standard Saturday-to-Thursday shift week (6 regular days).
 * Subtracts non-working official holidays, adds working overrides.
 */
export function calculateEffectiveWorkingDaysInWeek(
  weekSaturday: Date,
  holidays: HolidayRecord[] = [],
  overrides: HolidayOverride[] = [],
  department?: string
): {
  workingDays: number;
  holidayDays: number;
  holidayNames: string[];
  hasWorkingOverride: boolean;
} {
  let workingDays = 0;
  let holidayDays = 0;
  const holidayNames: string[] = [];
  let hasWorkingOverride = false;

  for (let i = 0; i < 6; i++) { // Saturday(0), Sunday(1), Monday(2), Tuesday(3), Wednesday(4), Thursday(5)
    const d = addDays(weekSaturday, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const hol = getHolidayForDate(dateStr, holidays);
    const override = getWorkingOverride(dateStr, overrides, department);

    if (override) {
      workingDays++;
      hasWorkingOverride = true;
    } else if (hol && hol.workType === 'Non-Working Holiday') {
      holidayDays++;
      holidayNames.push(`${hol.name} (${format(d, 'EEE dd-MMM')})`);
    } else {
      workingDays++;
    }
  }

  return {
    workingDays,
    holidayDays,
    holidayNames,
    hasWorkingOverride
  };
}

/**
 * Gets the immediate next upcoming official holiday from today.
 */
export function getNextUpcomingHoliday(
  holidays: HolidayRecord[],
  fromDate: Date = new Date()
): { holiday: HolidayRecord; daysRemaining: number } | null {
  const activeHolidays = holidays
    .filter(h => h.status === 'Active')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const todayStr = format(fromDate, 'yyyy-MM-dd');
  const upcoming = activeHolidays.find(h => h.date >= todayStr);

  if (!upcoming) return null;

  const targetDate = parseISO(upcoming.date);
  const todayDate = parseISO(todayStr);
  const diffTime = targetDate.getTime() - todayDate.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return {
    holiday: upcoming,
    daysRemaining
  };
}
