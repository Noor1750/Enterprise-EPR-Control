import { parseISO, isAfter, isBefore, isValid, format } from 'date-fns';

export const STANDARD_LEAVE_TYPES = [
  'Annual Leave',
  'Casual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Special Leave',
  'Unauthorised Leave'
] as const;

export type StandardLeaveType = typeof STANDARD_LEAVE_TYPES[number];

export interface LeaveRecord {
  id: string; // Leave_ID (e.g. LV-1001)
  employeeId: string; // ID_No (e.g. EMP001)
  employeeName: string; // Name
  department?: string; // Department
  designation?: string; // Designation
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  days: number;
  status: string; // Pending, HR Pending, Approved, Settlement, Rejected, Cancelled
  leaveType: string; // Annual Leave, Casual Leave, Sick Leave, Maternity Leave, Special Leave, Unauthorised Leave
  reason?: string;
  supervisorSignoff?: string;
  approvalDate?: string;
  settlementStatus?: string;
  settlementDate?: string;
  settledById?: string;
  settledByName?: string;
  settlementRemarks?: string;
  createdAt?: string;
  rawRow?: string[];
}

export interface OverlapConflictResult {
  hasConflict: boolean;
  message?: string;
  conflictingLeaves: LeaveRecord[];
}

/**
 * Normalizes a raw 2D spreadsheet row from Leave!A:Z into a structured LeaveRecord
 */
export function parseLeaveRow(row: string[]): LeaveRecord {
  return {
    id: (row[0] || '').trim(),
    employeeId: (row[1] || '').trim(),
    employeeName: (row[2] || '').trim(),
    designation: (row[3] || '').trim(),
    department: (row[4] || '').trim(),
    fromDate: (row[5] || '').trim(),
    toDate: (row[6] || '').trim(),
    days: parseFloat(row[7] || '0') || 0,
    status: (row[8] || 'Pending').trim(),
    supervisorSignoff: (row[9] || '').trim(),
    reason: (row[10] || '').trim(),
    approvalDate: (row[11] || '').trim(),
    settlementStatus: (row[12] || '').trim(),
    settlementDate: (row[13] || '').trim(),
    settledById: (row[14] || '').trim(),
    settledByName: (row[15] || '').trim(),
    settlementRemarks: (row[16] || '').trim(),
    createdAt: (row[17] || '').trim(),
    leaveType: (row[18] || 'Annual Leave').trim(),
    rawRow: row
  };
}

/**
 * Checks if a status represents an active, blocking reservation of dates.
 * Blocking statuses:
 * - Pending
 * - HR Pending
 * - Approved
 * - Settlement
 * Non-blocking statuses:
 * - Rejected
 * - Cancelled
 */
export function isBlockingLeaveStatus(status: string, settlementStatus?: string): boolean {
  const s = (status || '').toLowerCase().trim();
  const setS = (settlementStatus || '').toLowerCase().trim();

  // Explicitly non-blocking
  if (s === 'rejected' || s === 'cancelled' || setS === 'rejected' || setS === 'cancelled') {
    return false;
  }

  // Active blocking statuses
  if (
    s === 'pending' ||
    s === 'hr pending' ||
    s === 'approved' ||
    s === 'settlement' ||
    setS === 'settlement' ||
    setS === 'hr pending' ||
    setS === 'approved'
  ) {
    return true;
  }

  // If status is empty or unspecified, treat as active/pending to be safe
  return s !== 'rejected' && s !== 'cancelled';
}

/**
 * Safely normalizes date string to YYYY-MM-DD
 */
export function normalizeDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  try {
    // If already in YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = parseISO(trimmed);
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-M-D
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // D-M-YYYY or M-D-YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  } catch {
    // fallback
  }
  return trimmed;
}

/**
 * Standard Date Overlap condition:
 * NewStartDate <= ExistingEndDate AND NewEndDate >= ExistingStartDate
 */
export function checkDateOverlap(
  newFromDate: string,
  newToDate: string,
  existingFromDate: string,
  existingToDate: string
): boolean {
  const nStart = normalizeDateStr(newFromDate);
  const nEnd = normalizeDateStr(newToDate);
  const eStart = normalizeDateStr(existingFromDate);
  const eEnd = normalizeDateStr(existingToDate);

  if (!nStart || !nEnd || !eStart || !eEnd) return false;

  // Normalize order if user entered reversed dates
  const actualNStart = nStart <= nEnd ? nStart : nEnd;
  const actualNEnd = nStart <= nEnd ? nEnd : nStart;
  const actualEStart = eStart <= eEnd ? eStart : eEnd;
  const actualEEnd = eStart <= eEnd ? eEnd : eStart;

  return actualNStart <= actualEEnd && actualNEnd >= actualEStart;
}

/**
 * Validates whether a new or edited leave application for an employee overlaps
 * with any of their existing active leave records.
 *
 * @param allLeavesList Raw rows or parsed LeaveRecords
 * @param targetEmployeeId Employee ID to validate for (case-insensitive)
 * @param newFromDate Start date in YYYY-MM-DD
 * @param newToDate End date in YYYY-MM-DD
 * @param excludeLeaveId Optional Leave_ID to ignore (when editing existing application)
 */
export function validateLeaveOverlap(
  allLeavesList: (string[] | LeaveRecord)[],
  targetEmployeeId: string,
  newFromDate: string,
  newToDate: string,
  excludeLeaveId?: string
): OverlapConflictResult {
  if (!targetEmployeeId || !newFromDate || !newToDate) {
    return { hasConflict: false, conflictingLeaves: [] };
  }

  const normalizedEmpId = targetEmployeeId.trim().toUpperCase();
  const nFrom = newFromDate.trim();
  const nTo = newToDate.trim();

  // Basic date validation
  if (nFrom > nTo) {
    return {
      hasConflict: true,
      message: 'End date cannot be earlier than start date.',
      conflictingLeaves: []
    };
  }

  const conflictingLeaves: LeaveRecord[] = [];

  for (const item of allLeavesList) {
    const record: LeaveRecord = Array.isArray(item) ? parseLeaveRow(item) : item;

    // Must match the exact employee (case-insensitive)
    if (record.employeeId.toUpperCase() !== normalizedEmpId) {
      continue;
    }

    // Skip the record itself if editing
    if (excludeLeaveId && record.id && record.id.toUpperCase() === excludeLeaveId.trim().toUpperCase()) {
      continue;
    }

    // Must be an active / blocking status
    if (!isBlockingLeaveStatus(record.status, record.settlementStatus)) {
      continue;
    }

    // Check overlap
    if (checkDateOverlap(nFrom, nTo, record.fromDate, record.toDate)) {
      conflictingLeaves.push(record);
    }
  }

  if (conflictingLeaves.length > 0) {
    const first = conflictingLeaves[0];
    const statusLabel = 
      first.status === 'Settlement' || first.settlementStatus === 'Settlement' ? 'Settled / Consumed' :
      first.status === 'HR Pending' || first.settlementStatus === 'HR Pending' || first.status === 'Approved' ? 'Approved / HR Pending' :
      'Pending Review';

    const message = `Leave application conflict: Employee already has ${statusLabel} leave (${first.leaveType || 'Leave'}) for period ${first.fromDate} to ${first.toDate} (App ID: ${first.id || 'N/A'}). Please select a different date range.`;

    return {
      hasConflict: true,
      message,
      conflictingLeaves
    };
  }

  return {
    hasConflict: false,
    conflictingLeaves: []
  };
}
