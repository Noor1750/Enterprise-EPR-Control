import { format, parseISO, isValid, differenceInCalendarDays, subDays } from 'date-fns';
import { GembaWalkItem } from './gembaWalkEngine';
import { HolidayRecord } from './holidayEngine';
import { ensureSheetExists, batchGetRanges, updateRowByPrimaryKey } from './sheets';

export type DayOfWeek = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface DailyAuditorScheduleItem {
  dayOfWeek: DayOfWeek;
  auditorNames: string[];
  auditorIds?: string[];
  shift?: string;
  inspectionZones?: string[];
  notes?: string;
  isActive: boolean;
}

export interface GembaScheduleConfig {
  weekendDays: DayOfWeek[]; // Default: ['Friday']
  scheduledTime: string; // e.g. '11:00 AM'
  autoOverdueAfterHour: number; // e.g. 17 (5 PM)
  schedule: Record<DayOfWeek, DailyAuditorScheduleItem>;
  customHolidays?: Array<{ id: string; date: string; name: string }>;
}

export interface GembaWalkSession {
  id: string; // e.g. GWS-2026-09-04
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  status: 'Conducted' | 'Pending' | 'Overdue' | 'Weekend Off' | 'Holiday';
  conductedAt?: string;
  conductedBy: string[];
  zonesCovered: string[];
  findingsCount: number;
  notes?: string;
  cleanPass?: boolean;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GembaDayEvaluation {
  dateStr: string;
  dayOfWeek: DayOfWeek;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isScheduled: boolean;
  isConducted: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  status: 'Conducted' | 'Overdue' | 'Pending' | 'Weekend Off' | 'Holiday' | 'Upcoming';
  statusLabel: string;
  assignedAuditors: string[];
  inspectionZones: string[];
  session?: GembaWalkSession;
  findingsCount: number;
}

// User-specified schedule defaults:
// Saturday: Rakib & Jewel
// Sunday: Mamun, Noor & Tarak
// Monday: Rahim, Turab, Shakil & Alam
export const DEFAULT_GEMBA_SCHEDULE_CONFIG: GembaScheduleConfig = {
  weekendDays: ['Friday'],
  scheduledTime: '10:30 AM',
  autoOverdueAfterHour: 17,
  customHolidays: [],
  schedule: {
    Saturday: {
      dayOfWeek: 'Saturday',
      auditorNames: ['Rakib', 'Jewel'],
      shift: 'Morning Walk (10:30 AM - 11:30 AM)',
      inspectionZones: ['Sewing Line 1-4', 'Cutting Section', 'Safety Passages'],
      notes: 'Focus on 1S & 2S sorting and cable raceway safety',
      isActive: true
    },
    Sunday: {
      dayOfWeek: 'Sunday',
      auditorNames: ['Mamun', 'Noor', 'Tarak'],
      shift: 'Morning Walk (10:30 AM - 11:30 AM)',
      inspectionZones: ['Finishing Bay', 'Packing Floor', 'Steam Manifolds'],
      notes: 'Steam line condition, condensation traps & 3S shine inspection',
      isActive: true
    },
    Monday: {
      dayOfWeek: 'Monday',
      auditorNames: ['Rahim', 'Turab', 'Shakil', 'Alam'],
      shift: 'Morning Walk (10:30 AM - 11:30 AM)',
      inspectionZones: ['Main Production Floor', 'Fabric Warehouse', 'Chemical Storage'],
      notes: 'Chemical labeling, aisle clearance & visual 5S boundary markings',
      isActive: true
    },
    Tuesday: {
      dayOfWeek: 'Tuesday',
      auditorNames: ['Arif', 'Sumon', 'Faruk'],
      shift: 'Morning Walk (10:30 AM - 11:30 AM)',
      inspectionZones: ['Maintenance Workshop', 'Tool Crib', 'Compressor Room'],
      notes: 'Equipment maintenance tags, lubrication points & tool shadow boards',
      isActive: true
    },
    Wednesday: {
      dayOfWeek: 'Wednesday',
      auditorNames: ['Tanvir', 'Hasan', 'Kabir'],
      shift: 'Morning Walk (10:30 AM - 11:30 AM)',
      inspectionZones: ['Quality Assurance Lab', 'Inspection Tables', 'Rework Area'],
      notes: 'Lighting lux levels, defect bin tagging & 5S red tag quarantine area',
      isActive: true
    },
    Thursday: {
      dayOfWeek: 'Thursday',
      auditorNames: ['Shajib', 'Mizan', 'Nayeem'],
      shift: 'Morning Walk (10:30 AM - 11:30 AM)',
      inspectionZones: ['Loading Dock', 'Waste Disposal Area', 'General Canteen'],
      notes: 'Muda scrap segregation, pest barrier seals & weekly 5S sustain wrap-up',
      isActive: true
    },
    Friday: {
      dayOfWeek: 'Friday',
      auditorNames: [],
      shift: 'Weekend Off',
      inspectionZones: [],
      notes: 'Official Weekly Off - No Gemba Walk Scheduled',
      isActive: false
    }
  }
};

const SCHEDULE_STORAGE_KEY = 'erp_gemba_schedule_config';
const SESSIONS_STORAGE_KEY = 'erp_gemba_walk_sessions';

/**
 * Loads the Gemba Schedule Configuration from local storage (or fallback default)
 */
export function getLocalGembaScheduleConfig(): GembaScheduleConfig {
  if (typeof window === 'undefined') return DEFAULT_GEMBA_SCHEDULE_CONFIG;
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(DEFAULT_GEMBA_SCHEDULE_CONFIG));
      return DEFAULT_GEMBA_SCHEDULE_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GEMBA_SCHEDULE_CONFIG,
      ...parsed,
      schedule: {
        ...DEFAULT_GEMBA_SCHEDULE_CONFIG.schedule,
        ...(parsed.schedule || {})
      }
    };
  } catch (e) {
    console.warn('Failed to load Gemba Schedule config, using default:', e);
    return DEFAULT_GEMBA_SCHEDULE_CONFIG;
  }
}

/**
 * Saves Gemba Schedule Configuration to local storage and dispatches sync event
 */
export function saveLocalGembaScheduleConfig(config: GembaScheduleConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('erp-gemba-schedule-updated', { detail: config }));
  } catch (e) {
    console.warn('Failed to save Gemba Schedule config:', e);
  }
}

/**
 * Loads Gemba Walk Sessions from local storage
 */
export function getLocalGembaSessions(): GembaWalkSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load Gemba Walk sessions:', e);
    return [];
  }
}

/**
 * Saves Gemba Walk Sessions to local storage
 */
export function saveLocalGembaSessions(sessions: GembaWalkSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new CustomEvent('erp-gemba-sessions-updated', { detail: sessions }));
  } catch (e) {
    console.warn('Failed to save Gemba Walk sessions:', e);
  }
}

/**
 * Evaluates the status of any specific date for Gemba Walk
 */
export function evaluateGembaWalkDate(
  date: Date | string,
  options: {
    items?: GembaWalkItem[];
    sessions?: GembaWalkSession[];
    config?: GembaScheduleConfig;
    holidays?: HolidayRecord[];
    now?: Date;
  } = {}
): GembaDayEvaluation {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = options.now || new Date();
  const dateStr = isValid(d) ? format(d, 'yyyy-MM-dd') : String(date);
  const todayStr = format(now, 'yyyy-MM-dd');
  const dayOfWeek = (isValid(d) ? format(d, 'EEEE') : 'Friday') as DayOfWeek;

  const config = options.config || getLocalGembaScheduleConfig();
  const sessions = options.sessions || getLocalGembaSessions();
  const items = options.items || [];
  const holidays = options.holidays || [];

  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;
  const isFuture = dateStr > todayStr;

  const scheduledItem = config.schedule[dayOfWeek] || {
    dayOfWeek,
    auditorNames: [],
    isActive: false
  };

  const assignedAuditors = scheduledItem.auditorNames || [];
  const inspectionZones = scheduledItem.inspectionZones || [];

  // 1. Check Weekend Off
  const isWeekend = config.weekendDays.includes(dayOfWeek) || !scheduledItem.isActive;
  if (isWeekend) {
    return {
      dateStr,
      dayOfWeek,
      isToday,
      isPast,
      isFuture,
      isWeekend: true,
      isHoliday: false,
      isScheduled: false,
      isConducted: false,
      isOverdue: false,
      daysOverdue: 0,
      status: 'Weekend Off',
      statusLabel: 'Weekend Off - No Gemba Walk Scheduled',
      assignedAuditors,
      inspectionZones,
      findingsCount: 0
    };
  }

  // 2. Check Company / Public Holiday
  const holiday = holidays.find(h => h.date === dateStr && h.status === 'Active' && h.workType !== 'Working Holiday');
  const customHoliday = (config.customHolidays || []).find(h => h.date === dateStr);
  const holidayName = holiday?.name || customHoliday?.name;
  if (holidayName) {
    return {
      dateStr,
      dayOfWeek,
      isToday,
      isPast,
      isFuture,
      isWeekend: false,
      isHoliday: true,
      holidayName,
      isScheduled: false,
      isConducted: false,
      isOverdue: false,
      daysOverdue: 0,
      status: 'Holiday',
      statusLabel: `Holiday: ${holidayName} (No Walk Scheduled)`,
      assignedAuditors,
      inspectionZones,
      findingsCount: 0
    };
  }

  // Count findings logged for this date
  const dateFindings = items.filter(i => i.date === dateStr);
  const findingsCount = dateFindings.length;

  // 3. Check if Walk was conducted
  const session = sessions.find(s => s.date === dateStr && s.status === 'Conducted');
  const isConducted = Boolean(session) || findingsCount > 0;

  if (isConducted) {
    return {
      dateStr,
      dayOfWeek,
      isToday,
      isPast,
      isFuture,
      isWeekend: false,
      isHoliday: false,
      isScheduled: true,
      isConducted: true,
      isOverdue: false,
      daysOverdue: 0,
      status: 'Conducted',
      statusLabel: 'Walk Conducted & Completed',
      assignedAuditors: session?.conductedBy?.length ? session.conductedBy : assignedAuditors,
      inspectionZones: session?.zonesCovered?.length ? session.zonesCovered : inspectionZones,
      session,
      findingsCount: session ? session.findingsCount : findingsCount
    };
  }

  // 4. If not conducted on a scheduled workday:
  if (isPast) {
    const daysOverdue = Math.max(1, differenceInCalendarDays(now, d));
    return {
      dateStr,
      dayOfWeek,
      isToday,
      isPast,
      isFuture,
      isWeekend: false,
      isHoliday: false,
      isScheduled: true,
      isConducted: false,
      isOverdue: true,
      daysOverdue,
      status: 'Overdue',
      statusLabel: `OVERDUE (${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} missed)`,
      assignedAuditors,
      inspectionZones,
      findingsCount: 0
    };
  }

  if (isToday) {
    const currentHour = now.getHours();
    const isLateInDay = currentHour >= config.autoOverdueAfterHour;
    return {
      dateStr,
      dayOfWeek,
      isToday: true,
      isPast: false,
      isFuture: false,
      isWeekend: false,
      isHoliday: false,
      isScheduled: true,
      isConducted: false,
      isOverdue: isLateInDay,
      daysOverdue: isLateInDay ? 1 : 0,
      status: isLateInDay ? 'Overdue' : 'Pending',
      statusLabel: isLateInDay ? 'OVERDUE TODAY (Not Conducted)' : `Pending Today (Due by ${config.scheduledTime})`,
      assignedAuditors,
      inspectionZones,
      findingsCount: 0
    };
  }

  // Future scheduled workday
  return {
    dateStr,
    dayOfWeek,
    isToday: false,
    isPast: false,
    isFuture: true,
    isWeekend: false,
    isHoliday: false,
    isScheduled: true,
    isConducted: false,
    isOverdue: false,
    daysOverdue: 0,
    status: 'Upcoming',
    statusLabel: `Scheduled for ${config.scheduledTime}`,
    assignedAuditors,
    inspectionZones,
    findingsCount: 0
  };
}

/**
 * Scans the past N days to find all unconducted, overdue Gemba Walks (skipping weekends & holidays)
 */
export function getOverdueGembaWalks(
  lookbackDays = 14,
  options: {
    items?: GembaWalkItem[];
    sessions?: GembaWalkSession[];
    config?: GembaScheduleConfig;
    holidays?: HolidayRecord[];
    now?: Date;
  } = {}
): GembaDayEvaluation[] {
  const now = options.now || new Date();
  const overdueList: GembaDayEvaluation[] = [];

  for (let i = 1; i <= lookbackDays; i++) {
    const targetDate = subDays(now, i);
    const evalResult = evaluateGembaWalkDate(targetDate, options);
    if (evalResult.isOverdue) {
      overdueList.push(evalResult);
    }
  }

  // Also check if today is overdue
  const todayEval = evaluateGembaWalkDate(now, options);
  if (todayEval.isOverdue) {
    overdueList.unshift(todayEval);
  }

  return overdueList;
}

/**
 * 1-Click Action to Mark a Gemba Walk as Conducted for a specific date
 */
export async function markGembaWalkConducted(
  date: string,
  data: {
    conductedBy: string[];
    zonesCovered?: string[];
    notes?: string;
    cleanPass?: boolean;
    findingsCount?: number;
    verifiedBy?: string;
  },
  spreadsheetId?: string
): Promise<GembaWalkSession> {
  const d = parseISO(date);
  const dayOfWeek = (isValid(d) ? format(d, 'EEEE') : 'Saturday') as DayOfWeek;
  const config = getLocalGembaScheduleConfig();
  const existingSessions = getLocalGembaSessions();

  const newSession: GembaWalkSession = {
    id: `GWS-${date}`,
    date,
    dayOfWeek,
    status: 'Conducted',
    conductedAt: new Date().toISOString(),
    conductedBy: data.conductedBy.length > 0 ? data.conductedBy : (config.schedule[dayOfWeek]?.auditorNames || []),
    zonesCovered: data.zonesCovered || config.schedule[dayOfWeek]?.inspectionZones || [],
    findingsCount: data.findingsCount || 0,
    notes: data.notes || '',
    cleanPass: data.cleanPass ?? true,
    verifiedBy: data.verifiedBy || 'Auditor Sign-off',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const updatedSessions = existingSessions.filter(s => s.date !== date);
  updatedSessions.push(newSession);
  saveLocalGembaSessions(updatedSessions);

  // Sync to Google Sheets if spreadsheetId is available
  if (spreadsheetId) {
    try {
      await ensureSheetExists(spreadsheetId, 'FiveS_GembaSessions', [
        'ID', 'Date', 'Day', 'Status', 'Conducted By', 'Zones Covered', 
        'Findings Count', 'Clean Pass', 'Notes', 'Verified By', 'Conducted At'
      ]).catch(() => {});

      const rowData = [
        newSession.id,
        newSession.date,
        newSession.dayOfWeek,
        newSession.status,
        newSession.conductedBy.join(', '),
        (newSession.zonesCovered || []).join('; '),
        String(newSession.findingsCount),
        newSession.cleanPass ? 'Yes' : 'No',
        newSession.notes || '',
        newSession.verifiedBy || '',
        newSession.conductedAt || ''
      ];

      updateRowByPrimaryKey(spreadsheetId, 'FiveS_GembaSessions', newSession.id, rowData).catch(err => {
        console.warn('Failed background sync of Gemba session:', err);
      });
    } catch (e) {
      console.warn('Sheets sync error for Gemba session:', e);
    }
  }

  return newSession;
}
