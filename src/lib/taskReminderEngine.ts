/**
 * Smart Daily Task Reminder Engine with Bangladesh Timezone & Holiday Awareness
 * 
 * Features:
 * - Individual employee configuration (sound, schedule, snooze, volume).
 * - Defaults to Bangladesh Time (BST, UTC+6) Saturday to Thursday morning 10:00 AM.
 * - Automatically excludes Weekends (Friday in Bangladesh) and Official Holidays.
 * - Employee task review acknowledgement logging.
 * - Flexible snooze and custom reminder time setters.
 */

import { TaskSoundType } from './taskSoundEngine';
import { Task } from './taskEngine';
import { HolidayRecord, DEFAULT_2026_HOLIDAYS, isWeeklyOff, getHolidayForDate } from './holidayEngine';
import { format, parseISO, isValid, addMinutes, isAfter } from 'date-fns';

export interface EmployeeReminderConfig {
  employeeId: string;
  employeeName: string;
  enabled: boolean;
  soundKey: TaskSoundType;
  soundVolume: number; // 0.1 to 1.0
  defaultTime: string; // "10:00"
  customReminderTimes: string[]; // e.g. ["10:00", "14:00"]
  excludeWeekends: boolean; // default true (Friday in Bangladesh)
  excludeHolidays: boolean; // default true (official non-working holidays)
  snoozeUntil: string | null; // ISO timestamp
  lastAcknowledgedDate: string | null; // YYYY-MM-DD
  lastAcknowledgedTimestamp: string | null; // ISO timestamp
  lastAcknowledgedTaskCount: number;
  lastTriggeredSlot: string | null; // e.g. "2026-09-02_10:00"
}

export interface TaskAcknowledgementLog {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  timestamp: string;
  taskCount: number;
  note?: string;
}

export interface BangladeshTimeInfo {
  date: Date;
  dateString: string;       // YYYY-MM-DD
  timeString: string;       // HH:mm (24-hour)
  formattedTime12: string;  // e.g. 10:00 AM
  formattedDate: string;    // e.g. Wednesday, Sep 2, 2026
  dayOfWeek: number;        // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  dayName: string;          // e.g. "Wednesday"
  isFridayWeekend: boolean; // Friday in Bangladesh
  hours: number;
  minutes: number;
}

/**
 * Returns current accurate Bangladesh Standard Time (UTC+6)
 */
export function getBangladeshDateTime(baseDate: Date = new Date()): BangladeshTimeInfo {
  // Use Intl to parse Bangladesh time zone reliably
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long'
  });

  const parts = formatter.formatToParts(baseDate);
  const map: Record<string, string> = {};
  parts.forEach(p => {
    map[p.type] = p.value;
  });

  const year = parseInt(map.year || '2026', 10);
  const month = parseInt(map.month || '1', 10);
  const day = parseInt(map.day || '1', 10);
  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);

  // Construct representation
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Calculate day of week
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = map.weekday || 'Wednesday';
  const dayOfWeek = weekdayNames.indexOf(dayName) !== -1 ? weekdayNames.indexOf(dayName) : 3;

  const isFriday = dayOfWeek === 5; // Friday is the official weekend in Bangladesh

  // 12-hour format string
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedTime12 = `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`;

  let formattedDate = `${dayName}, ${dateStr}`;
  try {
    const d = new Date(year, month - 1, day);
    formattedDate = format(d, 'EEEE, MMM d, yyyy');
  } catch {
    // fallback
  }

  return {
    date: new Date(year, month - 1, day, hour, minute),
    dateString: dateStr,
    timeString: timeStr,
    formattedTime12,
    formattedDate,
    dayOfWeek,
    dayName,
    isFridayWeekend: isFriday,
    hours: hour,
    minutes: minute
  };
}

/**
 * Checks if a given Bangladesh date is a weekend or holiday
 */
export function checkBangladeshHolidayOrWeekend(
  bdInfo: BangladeshTimeInfo,
  holidays: HolidayRecord[] = [],
  excludeWeekends: boolean = true,
  excludeHolidays: boolean = true
): { isNonWorking: boolean; reason: string | null } {
  // 1. Weekend check (Friday in Bangladesh)
  if (excludeWeekends && bdInfo.isFridayWeekend) {
    return {
      isNonWorking: true,
      reason: 'Bangladesh Weekend (Friday Weekly Off)'
    };
  }

  // 2. Official Holiday check
  if (excludeHolidays) {
    const list = holidays && holidays.length > 0 ? holidays : (DEFAULT_2026_HOLIDAYS as HolidayRecord[]);
    const hol = list.find(h => h.date === bdInfo.dateString && h.status !== 'Inactive');
    if (hol && hol.workType !== 'Working Holiday') {
      return {
        isNonWorking: true,
        reason: `Official Holiday: ${hol.name} (${hol.type || 'Non-Working'})`
      };
    }
  }

  return {
    isNonWorking: false,
    reason: null
  };
}

const STORAGE_KEY_PREFIX = 'erp_daily_task_reminder_';
const ACK_LOG_KEY_PREFIX = 'erp_task_ack_logs_';

/**
 * Loads or initializes an individual employee's reminder configuration
 */
export function getEmployeeReminderConfig(
  employeeId: string,
  employeeName: string = ''
): EmployeeReminderConfig {
  const defaultEmpId = employeeId ? employeeId.toUpperCase().trim() : 'DEFAULT';
  const storageKey = `${STORAGE_KEY_PREFIX}${defaultEmpId}`;

  const defaultConfig: EmployeeReminderConfig = {
    employeeId: defaultEmpId,
    employeeName: employeeName || 'Employee',
    enabled: true,
    soundKey: 'gentle-chime',
    soundVolume: 0.8,
    defaultTime: '10:00', // 10:00 AM Bangladesh Time
    customReminderTimes: ['10:00'],
    excludeWeekends: true, // Friday in Bangladesh excluded
    excludeHolidays: true, // Non-working holidays excluded
    snoozeUntil: null,
    lastAcknowledgedDate: null,
    lastAcknowledgedTimestamp: null,
    lastAcknowledgedTaskCount: 0,
    lastTriggeredSlot: null
  };

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultConfig,
        ...parsed,
        employeeId: defaultEmpId,
        employeeName: employeeName || parsed.employeeName || defaultConfig.employeeName
      };
    }
  } catch (e) {
    console.warn('Error reading employee reminder config from localStorage:', e);
  }

  return defaultConfig;
}

/**
 * Saves employee's reminder configuration and broadcasts an update event
 */
export function saveEmployeeReminderConfig(config: EmployeeReminderConfig): void {
  try {
    const defaultEmpId = config.employeeId ? config.employeeId.toUpperCase().trim() : 'DEFAULT';
    const storageKey = `${STORAGE_KEY_PREFIX}${defaultEmpId}`;
    localStorage.setItem(storageKey, JSON.stringify(config));

    // Dispatch event so all open tabs / components update reactively
    window.dispatchEvent(new CustomEvent('erp-task-reminder-config-updated', {
      detail: { employeeId: config.employeeId, config }
    }));
  } catch (e) {
    console.error('Failed to save employee reminder config:', e);
  }
}

/**
 * Records an employee's acknowledgement of their daily tasks and resets snooze
 */
export function acknowledgeEmployeeTasks(
  config: EmployeeReminderConfig,
  taskCount: number,
  note?: string
): EmployeeReminderConfig {
  const bdInfo = getBangladeshDateTime();
  const nowIso = new Date().toISOString();

  const updatedConfig: EmployeeReminderConfig = {
    ...config,
    snoozeUntil: null, // Clear active snooze
    lastAcknowledgedDate: bdInfo.dateString,
    lastAcknowledgedTimestamp: nowIso,
    lastAcknowledgedTaskCount: taskCount
  };

  saveEmployeeReminderConfig(updatedConfig);

  // Store acknowledgement history
  try {
    const ackKey = `${ACK_LOG_KEY_PREFIX}${config.employeeId}`;
    const rawLogs = localStorage.getItem(ackKey);
    const logs: TaskAcknowledgementLog[] = rawLogs ? JSON.parse(rawLogs) : [];
    
    const newLog: TaskAcknowledgementLog = {
      id: `ACK-${Date.now()}`,
      employeeId: config.employeeId,
      employeeName: config.employeeName,
      date: bdInfo.dateString,
      timestamp: nowIso,
      taskCount,
      note: note || `Acknowledged ${taskCount} daily task(s) at ${bdInfo.formattedTime12} (BST)`
    };

    logs.unshift(newLog);
    // Keep last 50 logs
    localStorage.setItem(ackKey, JSON.stringify(logs.slice(0, 50)));

    window.dispatchEvent(new CustomEvent('erp-task-acknowledged', {
      detail: { log: newLog, config: updatedConfig }
    }));
  } catch (err) {
    console.warn('Failed to save acknowledgement log:', err);
  }

  return updatedConfig;
}

/**
 * Sets a snooze time for the employee's daily tasks
 */
export function snoozeEmployeeTasks(
  config: EmployeeReminderConfig,
  snoozeMinutesOrTargetTime: number | string
): EmployeeReminderConfig {
  let snoozeUntilIso: string;
  const now = new Date();

  if (typeof snoozeMinutesOrTargetTime === 'number') {
    const target = addMinutes(now, snoozeMinutesOrTargetTime);
    snoozeUntilIso = target.toISOString();
  } else if (typeof snoozeMinutesOrTargetTime === 'string') {
    // If it's a time string like "14:30"
    if (snoozeMinutesOrTargetTime.includes(':')) {
      const [hStr, mStr] = snoozeMinutesOrTargetTime.split(':');
      const target = new Date(now);
      target.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
      if (target.getTime() <= now.getTime()) {
        // If target time has already passed today, set for tomorrow
        target.setDate(target.getDate() + 1);
      }
      snoozeUntilIso = target.toISOString();
    } else {
      // Direct ISO string
      snoozeUntilIso = snoozeMinutesOrTargetTime;
    }
  } else {
    snoozeUntilIso = addMinutes(now, 30).toISOString();
  }

  const updatedConfig: EmployeeReminderConfig = {
    ...config,
    snoozeUntil: snoozeUntilIso
  };

  saveEmployeeReminderConfig(updatedConfig);

  window.dispatchEvent(new CustomEvent('erp-task-snoozed', {
    detail: { employeeId: config.employeeId, snoozeUntil: snoozeUntilIso }
  }));

  return updatedConfig;
}

/**
 * Evaluates whether the daily task popup message should be presented to the employee
 */
export function evaluateDailyTaskPopupTrigger(
  config: EmployeeReminderConfig,
  employeeTasks: Task[],
  holidays: HolidayRecord[] = []
): {
  shouldTrigger: boolean;
  reason: string;
  relevantTasks: Task[];
  dueTodayCount: number;
  overdueCount: number;
  isSnoozeTrigger: boolean;
  bdInfo: BangladeshTimeInfo;
} {
  const bdInfo = getBangladeshDateTime();

  // 1. Check if reminders are globally disabled for this employee
  if (!config.enabled) {
    return {
      shouldTrigger: false,
      reason: 'Reminders are disabled in employee settings',
      relevantTasks: [],
      dueTodayCount: 0,
      overdueCount: 0,
      isSnoozeTrigger: false,
      bdInfo
    };
  }

  // 2. Filter tasks assigned to this employee that require attention
  const activeTasks = employeeTasks.filter(t => t.deleted !== 'TRUE' && t.status !== 'Completed' && t.status !== 'Cancelled');

  const todayStr = bdInfo.dateString;
  const dueTodayTasks = activeTasks.filter(t => t.dueDate === todayStr);
  const overdueTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    return t.dueDate < todayStr || t.status === 'Overdue';
  });

  const relevantTasks = [...overdueTasks, ...dueTodayTasks, ...activeTasks.filter(t => !dueTodayTasks.includes(t) && !overdueTasks.includes(t))];

  // If employee has zero pending or overdue tasks, nothing to alert
  if (relevantTasks.length === 0) {
    return {
      shouldTrigger: false,
      reason: 'No pending or overdue tasks for this employee',
      relevantTasks: [],
      dueTodayCount: 0,
      overdueCount: 0,
      isSnoozeTrigger: false,
      bdInfo
    };
  }

  // 3. Weekend and Holiday Check: "weekend and holidays will not remain"
  const holidayCheck = checkBangladeshHolidayOrWeekend(
    bdInfo, 
    holidays, 
    config.excludeWeekends, 
    config.excludeHolidays
  );

  if (holidayCheck.isNonWorking) {
    return {
      shouldTrigger: false,
      reason: holidayCheck.reason || 'Weekend or Holiday: notifications are suppressed',
      relevantTasks,
      dueTodayCount: dueTodayTasks.length,
      overdueCount: overdueTasks.length,
      isSnoozeTrigger: false,
      bdInfo
    };
  }

  // 4. Check active Snooze
  const now = new Date();
  if (config.snoozeUntil) {
    const snoozeDate = parseISO(config.snoozeUntil);
    if (isValid(snoozeDate)) {
      if (now.getTime() < snoozeDate.getTime()) {
        // Snooze is still active
        return {
          shouldTrigger: false,
          reason: `Snoozed until ${format(snoozeDate, 'hh:mm a')}`,
          relevantTasks,
          dueTodayCount: dueTodayTasks.length,
          overdueCount: overdueTasks.length,
          isSnoozeTrigger: false,
          bdInfo
        };
      } else {
        // Snooze has expired! Should trigger now!
        return {
          shouldTrigger: true,
          reason: 'Snooze reminder time reached',
          relevantTasks,
          dueTodayCount: dueTodayTasks.length,
          overdueCount: overdueTasks.length,
          isSnoozeTrigger: true,
          bdInfo
        };
      }
    }
  }

  // 5. Check if already acknowledged today
  if (config.lastAcknowledgedDate === todayStr) {
    return {
      shouldTrigger: false,
      reason: `Already acknowledged today (${config.lastAcknowledgedTimestamp ? format(parseISO(config.lastAcknowledgedTimestamp), 'hh:mm a') : 'Today'})`,
      relevantTasks,
      dueTodayCount: dueTodayTasks.length,
      overdueCount: overdueTasks.length,
      isSnoozeTrigger: false,
      bdInfo
    };
  }

  // 6. Check Schedule Time (Default 10:00 AM Bangladesh Time Saturday to Thursday)
  const reminderTimes = (config.customReminderTimes && config.customReminderTimes.length > 0)
    ? config.customReminderTimes
    : [config.defaultTime || '10:00'];

  // Current BD time in minutes from midnight
  const currentBdMinutes = bdInfo.hours * 60 + bdInfo.minutes;

  // Find any slot that has arrived today
  let matchedSlot: string | null = null;
  for (const slot of reminderTimes) {
    const [hStr, mStr] = slot.split(':');
    const slotMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
    // If current time is past or at the scheduled slot
    if (currentBdMinutes >= slotMinutes) {
      const slotId = `${todayStr}_${slot}`;
      // Has this specific slot already triggered today?
      if (config.lastTriggeredSlot !== slotId) {
        matchedSlot = slotId;
        break;
      }
    }
  }

  if (matchedSlot) {
    return {
      shouldTrigger: true,
      reason: `Scheduled daily reminder reached (${reminderTimes.join(', ')} BST)`,
      relevantTasks,
      dueTodayCount: dueTodayTasks.length,
      overdueCount: overdueTasks.length,
      isSnoozeTrigger: false,
      bdInfo
    };
  }

  return {
    shouldTrigger: false,
    reason: `Waiting for scheduled reminder time (${reminderTimes.join(', ')} BST). Current BD time: ${bdInfo.formattedTime12}`,
    relevantTasks,
    dueTodayCount: dueTodayTasks.length,
    overdueCount: overdueTasks.length,
    isSnoozeTrigger: false,
    bdInfo
  };
}
