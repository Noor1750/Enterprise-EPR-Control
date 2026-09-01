import { format } from 'date-fns';
import { appendRow, updateRowByPrimaryKey } from './sheets';
import { UserSecurityScope } from './security';

export type ShiftType = 'Day Shift' | 'Night Shift' | 'General';
export type ShiftMode = 'Automatic Rotation' | 'Manual Override';

export interface WeekRangeInfo {
  startDate: Date;
  endDate: Date;
  offDate: Date;
  startStr: string; // YYYY-MM-DD (Saturday)
  endStr: string;   // YYYY-MM-DD (Thursday)
  offStr: string;   // YYYY-MM-DD (Friday)
  label: string;    // "Saturday, 22-Aug-2026 → Thursday, 27-Aug-2026"
  shortLabel: string; // "22-Aug → 27-Aug"
}

export interface EmployeeShiftState {
  id: string;
  name: string;
  department: string;
  workingArea: string; // Section / Floor
  designation: string;
  position: string;
  category: 'Management' | 'Non-Management' | string;
  supervisor: string;
  status: string; // 'Active' | 'Inactive'
  inactiveDate: string;
  dateOfJoin: string;
  dateOfBirth: string;
  phone: string;
  emergency: string;
  bloodGroup: string;
  manager: string;
  profilePicture: string;
  tShirtSize: string;
  shoeSize: string;
  volunteer: string;
  overtimeRate: string;
  salary: string;
  
  // Personal & Address Information
  maritalStatus?: string;
  nationalId?: string;
  presentAddress?: string;
  presentThana?: string;
  presentDistrict?: string;
  permanentAddress?: string;
  permanentThana?: string;
  permanentDistrict?: string;
  education?: string;

  // Current Dynamic Shift Values for target week
  currentShift: ShiftType;
  nextWeekShift: ShiftType;
  
  // Stored / Configured values
  shiftMode: ShiftMode;
  effectiveDate: string; // YYYY-MM-DD
  rotationStartingShift: ShiftType;
  remarks: string;
  
  // Target Week Bounds
  currentWeek: WeekRangeInfo;
  nextWeek: WeekRangeInfo;
  
  // Historical / Audit metadata
  lastChangedBy?: string;
  lastChangedAt?: string;
  
  // Raw row preservation
  rawRow: string[];
}

export interface ShiftHistoryRecord {
  historyId: string;
  employeeId: string;
  employeeName: string;
  previousShift: string;
  newShift: string;
  effectiveDate: string;
  assignmentType: ShiftMode;
  changedBy: string;
  changedAt: string;
  remarks: string;
}

/**
 * Standardizes shift strings into 'Day Shift', 'Night Shift', or 'General'
 */
export function normalizeShift(rawShift?: string): ShiftType {
  if (!rawShift) return 'General';
  const s = String(rawShift).trim().toLowerCase();
  if (s === 'a' || s === 'a shift' || s === 'shift a' || s.startsWith('a ') || s.startsWith('day') || s === 'a_shift' || s === 'morn') {
    return 'Day Shift';
  }
  if (s === 'b' || s === 'b shift' || s === 'shift b' || s.startsWith('b ') || s.startsWith('night') || s === 'b_shift' || s === 'eve') {
    return 'Night Shift';
  }
  if (s.includes('gen') || s === 'general' || s === 'general shift' || s === 'g') {
    return 'General';
  }
  return 'General';
}

/**
 * Standardizes shift mode string
 */
export function normalizeShiftMode(rawMode?: string): ShiftMode {
  if (!rawMode) return 'Automatic Rotation';
  const s = String(rawMode).trim().toLowerCase();
  if (s.includes('manual') || s.includes('override')) {
    return 'Manual Override';
  }
  return 'Automatic Rotation';
}

/**
 * Calculates the start date (Saturday 00:00:00) for the working week of any given date.
 * Working week runs Saturday -> Thursday. Friday is the weekly off day belonging to this week.
 */
export function getSaturdayWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0: Sunday, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  // Saturday = day 6 -> daysSinceSaturday = 0
  // Sunday = day 0 -> daysSinceSaturday = 1
  // Monday = day 1 -> daysSinceSaturday = 2
  // Tuesday = day 2 -> daysSinceSaturday = 3
  // Wednesday = day 3 -> daysSinceSaturday = 4
  // Thursday = day 4 -> daysSinceSaturday = 5
  // Friday = day 5 -> daysSinceSaturday = 6
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  d.setDate(d.getDate() - daysSinceSaturday);
  return d;
}

/**
 * Returns formatted working week interval (Saturday -> Thursday + Friday off)
 */
export function getSaturdayWeekRange(date: Date): WeekRangeInfo {
  const start = getSaturdayWeekStart(date);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 5); // Thursday
  
  const off = new Date(start);
  off.setDate(off.getDate() + 6); // Friday
  
  return {
    startDate: start,
    endDate: end,
    offDate: off,
    startStr: format(start, 'yyyy-MM-dd'),
    endStr: format(end, 'yyyy-MM-dd'),
    offStr: format(off, 'yyyy-MM-dd'),
    label: `${format(start, 'EEE, dd-MMM-yyyy')} → ${format(end, 'EEE, dd-MMM-yyyy')}`,
    shortLabel: `${format(start, 'dd-MMM')} → ${format(end, 'dd-MMM-yyyy')}`
  };
}

/**
 * Returns previous working week (Saturday -> Thursday)
 */
export function getPreviousSaturdayWeekRange(date: Date): WeekRangeInfo {
  const curStart = getSaturdayWeekStart(date);
  const prevDate = new Date(curStart);
  prevDate.setDate(prevDate.getDate() - 7);
  return getSaturdayWeekRange(prevDate);
}

/**
 * Returns next working week (Saturday -> Thursday)
 */
export function getNextSaturdayWeekRange(date: Date): WeekRangeInfo {
  const curStart = getSaturdayWeekStart(date);
  const nextDate = new Date(curStart);
  nextDate.setDate(nextDate.getDate() + 7);
  return getSaturdayWeekRange(nextDate);
}

/**
 * Calculates whole number of working weeks between two dates.
 */
export function getWeeksDiff(fromDate: Date, toDate: Date): number {
  const startFrom = getSaturdayWeekStart(fromDate).getTime();
  const startTo = getSaturdayWeekStart(toDate).getTime();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((startTo - startFrom) / msPerWeek);
}

/**
 * Pure function: calculates the dynamic shift assignment for an employee for a target reference date.
 */
export function calculateDynamicShift(
  rotationStartingShift: ShiftType,
  effectiveDateStr: string,
  mode: ShiftMode,
  targetDate: Date = new Date()
): { currentShift: ShiftType; nextWeekShift: ShiftType; currentWeekDiff: number } {
  // General employees always stay General unless manually changed
  if (rotationStartingShift === 'General') {
    return {
      currentShift: 'General',
      nextWeekShift: 'General',
      currentWeekDiff: 0
    };
  }

  // Manual Override retains its set shift indefinitely until resumed/changed
  if (mode === 'Manual Override') {
    return {
      currentShift: rotationStartingShift,
      nextWeekShift: rotationStartingShift,
      currentWeekDiff: 0
    };
  }

  // Parse effective date
  let effectiveDate: Date;
  try {
    if (effectiveDateStr && effectiveDateStr.trim()) {
      const parts = effectiveDateStr.trim().split('-');
      if (parts.length === 3) {
        effectiveDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
      } else {
        effectiveDate = new Date(effectiveDateStr);
      }
    } else {
      effectiveDate = new Date(2026, 7, 1); // 2026-08-01 default anchor
    }
  } catch {
    effectiveDate = new Date(2026, 7, 1);
  }

  if (isNaN(effectiveDate.getTime())) {
    effectiveDate = new Date(2026, 7, 1);
  }

  const weeksDiff = getWeeksDiff(effectiveDate, targetDate);
  const isEvenWeeks = Math.abs(weeksDiff) % 2 === 0;

  let currentShift: ShiftType;
  if (rotationStartingShift === 'Day Shift') {
    currentShift = isEvenWeeks ? 'Day Shift' : 'Night Shift';
  } else if (rotationStartingShift === 'Night Shift') {
    currentShift = isEvenWeeks ? 'Night Shift' : 'Day Shift';
  } else {
    currentShift = 'General';
  }

  // Next week's rotation
  let nextWeekShift: ShiftType;
  if (currentShift === 'Day Shift') nextWeekShift = 'Night Shift';
  else if (currentShift === 'Night Shift') nextWeekShift = 'Day Shift';
  else nextWeekShift = 'General';

  return {
    currentShift,
    nextWeekShift,
    currentWeekDiff: weeksDiff
  };
}

/**
 * Parses raw employee row into strongly-typed EmployeeShiftState
 */
export function parseEmployeeShiftState(
  row: string[],
  targetDate: Date = new Date(),
  historyRecords: ShiftHistoryRecord[] = []
): EmployeeShiftState {
  const id = (row[0] || '').trim();
  const name = (row[1] || '').trim();
  const designation = (row[2] || '').trim();
  const department = (row[3] || '').trim();
  const dateOfJoin = (row[4] || '').trim();
  const position = (row[5] || '').trim();
  const category = (row[5] || '').trim().toLowerCase().includes('non') ? 'Non-Management' : (row[5] || '').trim().toLowerCase().includes('manage') ? 'Management' : (row[5] || 'Non-Management').trim();
  const supervisor = (row[6] || '').trim();
  const salary = (row[7] || '').trim();
  const overtimeRate = (row[8] || '').trim();
  const status = (row[9] || 'Active').trim();
  const inactiveDate = (row[10] || '').trim();
  const phone = (row[11] || '').trim();
  const emergency = (row[12] || '').trim();
  const bloodGroup = (row[14] || '').trim();
  const workingArea = (row[15] || '').trim();
  const profilePicture = (row[16] || '').trim();
  const manager = (row[17] || '').trim();
  const tShirtSize = (row[18] || '').trim();
  const shoeSize = (row[19] || '').trim();
  const volunteer = (row[20] || '').trim();
  const dateOfBirth = (row[21] || '').trim();

  // Shift specific columns
  const rawShift = (row[13] || '').trim();
  const rawMode = (row[22] || '').trim();
  const rawEffectiveDate = (row[23] || '').trim();
  const rawStartingShift = (row[24] || '').trim();
  const rawRemarks = (row[25] || '').trim();

  // Extended Personal & Address fields
  const maritalStatus = (row[26] || '').trim();
  const nationalId = (row[27] || '').trim();
  const presentAddress = (row[28] || '').trim();
  const presentThana = (row[29] || '').trim();
  const presentDistrict = (row[30] || '').trim();
  const permanentAddress = (row[31] || '').trim();
  const permanentThana = (row[32] || '').trim();
  const permanentDistrict = (row[33] || '').trim();
  const education = (row[34] || '').trim();

  const shiftMode: ShiftMode = normalizeShiftMode(rawMode);
  
  // Starting shift fallback
  let rotationStartingShift: ShiftType = normalizeShift(rawStartingShift || rawShift);
  
  // Effective date fallback: default to 2026-08-01 or date of join if missing
  let effectiveDate = rawEffectiveDate;
  if (!effectiveDate) {
    effectiveDate = '2026-08-01';
  }

  const currentWeek = getSaturdayWeekRange(targetDate);
  const nextWeek = getNextSaturdayWeekRange(targetDate);

  const { currentShift, nextWeekShift } = calculateDynamicShift(
    rotationStartingShift,
    effectiveDate,
    shiftMode,
    targetDate
  );

  // Find latest audit history for this employee if available
  const latestHistory = historyRecords.find(h => h.employeeId.toUpperCase() === id.toUpperCase());

  return {
    id,
    name,
    department,
    workingArea,
    designation,
    position: position || category,
    category,
    supervisor,
    status,
    inactiveDate,
    dateOfJoin,
    dateOfBirth,
    phone,
    emergency,
    bloodGroup,
    manager,
    profilePicture,
    tShirtSize,
    shoeSize,
    volunteer,
    salary,
    overtimeRate,
    maritalStatus,
    nationalId,
    presentAddress,
    presentThana,
    presentDistrict,
    permanentAddress,
    permanentThana,
    permanentDistrict,
    education,
    currentShift,
    nextWeekShift,
    shiftMode,
    effectiveDate,
    rotationStartingShift,
    remarks: rawRemarks || (latestHistory?.remarks || ''),
    currentWeek,
    nextWeek,
    lastChangedBy: latestHistory?.changedBy || '',
    lastChangedAt: latestHistory?.changedAt || '',
    rawRow: row
  };
}

/**
 * Updates an employee's shift assignment in the database and creates an audit history entry.
 */
export async function updateEmployeeShiftAssignment(
  spreadsheetId: string,
  employee: EmployeeShiftState,
  newStartingShift: ShiftType,
  newMode: ShiftMode,
  newEffectiveDate: string,
  remarks: string,
  userSecurityScope?: UserSecurityScope,
  allEmployeesRaw: string[][] = []
): Promise<void> {
  const changedBy = userSecurityScope?.employeeName || userSecurityScope?.username || 'Admin';
  const changedAt = new Date().toISOString();
  
  // Ensure array has enough elements to store extended shift columns (up to index 25)
  const fullRow = [...employee.rawRow];
  while (fullRow.length < 26) {
    fullRow.push('');
  }

  // Calculate current dynamic shift resulting from this new assignment
  const { currentShift } = calculateDynamicShift(
    newStartingShift,
    newEffectiveDate,
    newMode,
    new Date()
  );

  // Update employee row fields
  fullRow[13] = currentShift;             // Current Shift representation
  fullRow[22] = newMode;                  // Shift_Mode
  fullRow[23] = newEffectiveDate;         // Shift_Effective_Date
  fullRow[24] = newStartingShift;         // Rotation_Starting_Shift
  fullRow[25] = remarks || '';            // Shift_Remarks

  // 1. Update Employees table
  await updateRowByPrimaryKey(spreadsheetId, 'Employees', employee.id, fullRow);

  // 2. Append to ShiftHistory table
  const historyId = `SHIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const historyRow = [
    historyId,
    employee.id,
    employee.name,
    employee.currentShift,
    currentShift,
    newEffectiveDate,
    newMode,
    changedBy,
    changedAt,
    remarks || (newMode === 'Automatic Rotation' ? 'Automatic rotation initialized' : 'Manual shift override assigned')
  ];

  try {
    await appendRow(spreadsheetId, 'ShiftHistory!A:J', [historyRow]);
  } catch (err) {
    console.warn('Could not append to ShiftHistory sheet, will proceed:', err);
  }

  // Dispatch database update event
  window.dispatchEvent(new CustomEvent('erp-db-updated', { 
    detail: { sheetName: 'Employees' } 
  }));
}

/**
 * Resumes automatic weekly rotation for an employee from a selected starting shift and effective date.
 */
export async function resumeAutomaticRotation(
  spreadsheetId: string,
  employee: EmployeeShiftState,
  desiredStartingShift: ShiftType = 'Day Shift',
  effectiveDate: string = format(getSaturdayWeekStart(new Date()), 'yyyy-MM-dd'),
  userSecurityScope?: UserSecurityScope,
  remarks: string = 'Resumed automatic weekly rotation'
): Promise<void> {
  await updateEmployeeShiftAssignment(
    spreadsheetId,
    employee,
    desiredStartingShift,
    'Automatic Rotation',
    effectiveDate,
    remarks,
    userSecurityScope
  );
}

/**
 * UI Badge styles helper for shifts
 */
export function getShiftBadgeStyles(shift: ShiftType) {
  switch (shift) {
    case 'Day Shift':
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badge: 'bg-emerald-600 text-white',
        dot: 'bg-emerald-500',
        label: 'Day Shift',
        subtext: '06:00 - 14:00 (Day A)'
      };
    case 'Night Shift':
      return {
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        badge: 'bg-indigo-600 text-white',
        dot: 'bg-indigo-500',
        label: 'Night Shift',
        subtext: '14:00 - 22:00 (Day/Night B)'
      };
    case 'General':
    default:
      return {
        bg: 'bg-slate-50 text-slate-800 border-slate-200',
        badge: 'bg-slate-600 text-white',
        dot: 'bg-slate-500',
        label: 'General',
        subtext: '09:00 - 18:00 (Duty)'
      };
  }
}

/**
 * UI Badge styles helper for Shift Mode
 */
export function getShiftModeBadgeStyles(mode: ShiftMode) {
  if (mode === 'Manual Override') {
    return {
      bg: 'bg-amber-50 text-amber-900 border-amber-300',
      badge: 'bg-amber-500 text-white',
      dot: 'bg-amber-500',
      label: 'Manual Override'
    };
  }
  return {
    bg: 'bg-blue-50 text-blue-900 border-blue-200',
    badge: 'bg-blue-600 text-white',
    dot: 'bg-blue-500',
    label: 'Automatic Rotation'
  };
}
