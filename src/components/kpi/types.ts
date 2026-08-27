export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  status: string;
  profilePicture?: string;
  category?: 'Management' | 'Non-Management' | string;
  dateOfJoin?: string;
  inactiveDate?: string;
  shift?: string;
  manager?: string;
  profilePicture?: string;
  tShirtSize?: string;
  shoeSize?: string;
  volunteer?: string;
  workingArea?: string;
  phone?: string;
  emergency?: string;
  bloodGroup?: string;
  remarks?: string;
}

export interface KPIRecord {
  kpiId: string; // EmployeeID_Month
  employeeId: string;
  employeeName: string;
  department: string;
  month: string; // e.g. "January 2026"
  date: string; // e.g. "2026-01-31"
  plan: number; // 0 - 100 (%)
  achievement: number; // 0 - 100 (%)
  rating: number; // 1 - 5 numeric
  createdAt?: string;
  updatedAt?: string;
  rowIndex?: number; // Sheet row index for direct update
}

export interface KPIValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ExcelImportRow {
  rowNumber: number;
  rawEmployeeId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  month: string;
  date: string;
  plan: number;
  achievement: number;
  rating: number;
  status: 'matched_new' | 'matched_update' | 'unmatched' | 'invalid';
  validationErrors: string[];
  matchedEmployee?: Employee;
  existingKpi?: KPIRecord;
}

export interface ExcelImportSummary {
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  newCount: number;
  updateCount: number;
  invalidCount: number;
  unmatchedEmployeeIds: string[];
  rows: ExcelImportRow[];
}

export const RATING_DESCRIPTIONS: Record<number, { label: string; color: string; bg: string; text: string }> = {
  1: { label: 'Minimum', color: '#E74C3C', bg: 'bg-red-50', text: 'text-red-600' },
  2: { label: 'Low', color: '#E67E22', bg: 'bg-orange-50', text: 'text-orange-600' },
  3: { label: 'Average', color: '#F39C12', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  4: { label: 'Good', color: '#3498DB', bg: 'bg-blue-50', text: 'text-blue-600' },
  5: { label: 'Excellent', color: '#27AE60', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

export function getRatingInfo(rating: number) {
  if (rating >= 4.5) return RATING_DESCRIPTIONS[5];
  if (rating >= 3.5) return RATING_DESCRIPTIONS[4];
  if (rating >= 2.5) return RATING_DESCRIPTIONS[3];
  if (rating >= 2.0) return RATING_DESCRIPTIONS[2];
  return RATING_DESCRIPTIONS[1];
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function isKpiHiddenForEmployee(employeeId: string, hiddenEmployeeIds: string[] = []): boolean {
  if (!employeeId || !hiddenEmployeeIds || hiddenEmployeeIds.length === 0) return false;
  const target = employeeId.trim().toUpperCase();
  return hiddenEmployeeIds.some(id => id.trim().toUpperCase() === target);
}

export function normalizeMonth(input: any): string {
  if (!input) return '';
  const str = String(input).trim();
  
  // Format YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [year, monthNum] = str.split('-');
    const mIndex = parseInt(monthNum, 10) - 1;
    if (mIndex >= 0 && mIndex < 12) {
      return `${MONTH_NAMES[mIndex]} ${year}`;
    }
  }

  // Format Month Year (e.g. January 2026 or Jan 2026 or Jan-26)
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const full = MONTH_NAMES[i];
    const short = full.substring(0, 3);
    const regex = new RegExp(`(${full}|${short})[\\s\\-_/]*(\\d{2,4})`, 'i');
    const match = str.match(regex);
    if (match) {
      let year = match[2];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${full} ${year}`;
    }
  }

  // If Date object or Excel date serial number
  if (typeof input === 'number') {
    // Excel date serial
    const utc_days = Math.floor(input - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return `${MONTH_NAMES[date_info.getMonth()]} ${date_info.getFullYear()}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  return str;
}

export function normalizeDate(input: any, defaultMonth?: string): string {
  if (!input) {
    if (defaultMonth) {
      // try to derive date from month
      const parts = defaultMonth.split(' ');
      if (parts.length === 2) {
        const mIndex = MONTH_NAMES.indexOf(parts[0]);
        if (mIndex >= 0) {
          const year = parseInt(parts[1], 10);
          const lastDay = new Date(year, mIndex + 1, 0).getDate();
          return `${year}-${String(mIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }
      }
    }
    return new Date().toISOString().substring(0, 10);
  }

  if (typeof input === 'number') {
    // Excel date serial
    const utc_days = Math.floor(input - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().substring(0, 10);
  }

  const str = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().substring(0, 10);
  }

  return new Date().toISOString().substring(0, 10);
}

export function parsePercentage(input: any): number {
  if (input === undefined || input === null || input === '') return 0;
  if (typeof input === 'number') {
    // If it's a decimal like 0.95 from Excel format, convert to 95
    if (input > 0 && input <= 1) {
      return Math.round(input * 100);
    }
    return Math.round(input);
  }
  const str = String(input).replace('%', '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  if (num > 0 && num <= 1 && String(input).indexOf('%') === -1) {
    return Math.round(num * 100);
  }
  return Math.round(num);
}


export function generateMonthList(pastMonths = 18, futureMonths = 6): string[] {
  const result: string[] = [];
  const current = new Date();
  
  // Go back pastMonths
  const start = new Date(current.getFullYear(), current.getMonth() - pastMonths, 1);
  const total = pastMonths + futureMonths + 1;
  
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    result.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
  }
  
  return result.reverse(); // Most recent first
}
