import { parseISO, isValid, format, isToday, isThisWeek, isThisMonth } from 'date-fns';

export type CelebrationType = 'birthday' | 'anniversary';

export interface CelebrationRecord {
  id: string; // unique key e.g. emp001-birthday or emp001-anniversary
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  category: string;
  status: string;
  profilePicture?: string;
  phone?: string;
  type: CelebrationType;
  originalDate: string;
  originalDateFormatted: string;
  celebrationDateThisYear: string;
  celebrationDisplayDate: string;
  yearsCount: number; // Completed years for anniversary, turning age for birthday
  metricLabel: string;
  daysUntil: number; // 0 = today, >0 upcoming
  isToday: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
  isMilestone: boolean;
}

// Retain AnniversaryRecord for backwards compatibility
export interface AnniversaryRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  category: string;
  status: string;
  profilePicture?: string;
  dateOfJoin: string;
  anniversaryDateThisYear: string;
  anniversaryDisplayDate: string;
  completedYears: number;
  daysUntilAnniversary: number;
  isToday: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
  isMilestone: boolean;
}

/**
 * Parses a flexible date string (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, etc.)
 */
function parseFlexibleDate(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // Try standard ISO
  try {
    const iso = parseISO(s);
    if (isValid(iso)) return iso;
  } catch {
    // continue
  }

  // Try custom regex matching YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  const slashParts = s.split(/[/\-.]/);
  if (slashParts.length === 3) {
    // Check if YYYY-MM-DD
    if (slashParts[0].length === 4) {
      const y = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10) - 1;
      const d = parseInt(slashParts[2], 10);
      const dObj = new Date(y, m, d);
      if (isValid(dObj)) return dObj;
    }
    // Check if DD-MM-YYYY
    if (slashParts[2].length === 4) {
      const d = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10) - 1;
      const y = parseInt(slashParts[2], 10);
      const dObj = new Date(y, m, d);
      if (isValid(dObj)) return dObj;
    }
  }

  const general = new Date(s);
  if (isValid(general)) return general;

  return null;
}

/**
 * Calculates normalized celebration details for a given date of event
 */
function calculateCelebrationDetail(
  eventDate: Date,
  type: CelebrationType,
  referenceDate: Date = new Date()
): {
  celebrationDateThisYear: string;
  celebrationDisplayDate: string;
  yearsCount: number;
  metricLabel: string;
  daysUntil: number;
  isToday: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
  isMilestone: boolean;
} {
  const currentYear = referenceDate.getFullYear();
  const eventYear = eventDate.getFullYear();
  const eventMonth = eventDate.getMonth();
  const eventDay = eventDate.getDate();

  // Celebration date in current year (normalized to midnight)
  let targetCelebration = new Date(currentYear, eventMonth, eventDay, 0, 0, 0, 0);
  const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);

  // Compute difference in calendar days
  let diffDays = Math.round((targetCelebration.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24));
  
  // If the celebration has already passed earlier this year by more than 1 day, calculate days until next year's celebration for sorting
  if (diffDays < 0) {
    const nextYearCelebration = new Date(currentYear + 1, eventMonth, eventDay, 0, 0, 0, 0);
    diffDays = Math.round((nextYearCelebration.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24));
  }

  const isTodayEvent = isToday(targetCelebration);
  const isWeekEvent = isThisWeek(targetCelebration, { weekStartsOn: 6 });
  const isMonthEvent = isThisMonth(targetCelebration);

  if (type === 'anniversary') {
    const completedYears = Math.max(1, currentYear - eventYear);
    const isMilestone = [1, 3, 5, 10, 15, 20, 25, 30, 35, 40].includes(completedYears);
    const suffix = getOrdinalSuffix(completedYears);

    return {
      celebrationDateThisYear: format(targetCelebration, 'yyyy-MM-dd'),
      celebrationDisplayDate: format(targetCelebration, 'dd MMM'),
      yearsCount: completedYears,
      metricLabel: `${completedYears}${suffix} Work Anniversary (${completedYears} ${completedYears === 1 ? 'Year' : 'Years'} of Service)`,
      daysUntil: isTodayEvent ? 0 : diffDays,
      isToday: isTodayEvent,
      isThisWeek: isWeekEvent,
      isThisMonth: isMonthEvent,
      isMilestone
    };
  } else {
    // Birthday
    const turningAge = Math.max(1, currentYear - eventYear);
    const isMilestone = turningAge % 5 === 0 || turningAge === 18 || turningAge === 21;
    const suffix = getOrdinalSuffix(turningAge);

    return {
      celebrationDateThisYear: format(targetCelebration, 'yyyy-MM-dd'),
      celebrationDisplayDate: format(targetCelebration, 'dd MMM'),
      yearsCount: turningAge,
      metricLabel: `${turningAge}${suffix} Birthday (Turning ${turningAge})`,
      daysUntil: isTodayEvent ? 0 : diffDays,
      isToday: isTodayEvent,
      isThisWeek: isWeekEvent,
      isThisMonth: isMonthEvent,
      isMilestone
    };
  }
}

function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export interface EmployeeCelebrationInput {
  id: string;
  name: string;
  department: string;
  designation: string;
  category?: string;
  status?: string;
  profilePicture?: string;
  phone?: string;
  dateOfJoin?: string;
  dateOfBirth?: string;
}

/**
 * Computes unified celebration records (Birthdays + Anniversaries) for all employees
 */
export function computeAllCelebrations(
  employees: EmployeeCelebrationInput[],
  referenceDate: Date = new Date()
): CelebrationRecord[] {
  const records: CelebrationRecord[] = [];

  employees
    .filter(e => (e.status || 'Active').toLowerCase() === 'active' && e.id && e.id.trim())
    .forEach(emp => {
      // 1. Process Work Anniversary
      if (emp.dateOfJoin && emp.dateOfJoin.trim()) {
        const joinDate = parseFlexibleDate(emp.dateOfJoin);
        if (joinDate && joinDate <= referenceDate) {
          const detail = calculateCelebrationDetail(joinDate, 'anniversary', referenceDate);
          records.push({
            id: `${emp.id.trim()}-anniversary`,
            employeeId: emp.id.trim(),
            employeeName: emp.name || 'Unknown',
            department: emp.department || 'General',
            designation: emp.designation || 'Staff',
            category: emp.category || 'Non-Management',
            status: emp.status || 'Active',
            profilePicture: emp.profilePicture,
            phone: emp.phone,
            type: 'anniversary',
            originalDate: emp.dateOfJoin,
            originalDateFormatted: format(joinDate, 'dd-MMM-yyyy'),
            celebrationDateThisYear: detail.celebrationDateThisYear,
            celebrationDisplayDate: detail.celebrationDisplayDate,
            yearsCount: detail.yearsCount,
            metricLabel: detail.metricLabel,
            daysUntil: detail.daysUntil,
            isToday: detail.isToday,
            isThisWeek: detail.isThisWeek,
            isThisMonth: detail.isThisMonth,
            isMilestone: detail.isMilestone
          });
        }
      }

      // 2. Process Birthday
      if (emp.dateOfBirth && emp.dateOfBirth.trim()) {
        const birthDate = parseFlexibleDate(emp.dateOfBirth);
        if (birthDate && birthDate <= referenceDate) {
          const detail = calculateCelebrationDetail(birthDate, 'birthday', referenceDate);
          records.push({
            id: `${emp.id.trim()}-birthday`,
            employeeId: emp.id.trim(),
            employeeName: emp.name || 'Unknown',
            department: emp.department || 'General',
            designation: emp.designation || 'Staff',
            category: emp.category || 'Non-Management',
            status: emp.status || 'Active',
            profilePicture: emp.profilePicture,
            phone: emp.phone,
            type: 'birthday',
            originalDate: emp.dateOfBirth,
            originalDateFormatted: format(birthDate, 'dd-MMM-yyyy'),
            celebrationDateThisYear: detail.celebrationDateThisYear,
            celebrationDisplayDate: detail.celebrationDisplayDate,
            yearsCount: detail.yearsCount,
            metricLabel: detail.metricLabel,
            daysUntil: detail.daysUntil,
            isToday: detail.isToday,
            isThisWeek: detail.isThisWeek,
            isThisMonth: detail.isThisMonth,
            isMilestone: detail.isMilestone
          });
        }
      }
    });

  // Sort: Today first, then ascending by days until celebration
  return records.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    return a.daysUntil - b.daysUntil;
  });
}

/**
 * Backwards compatibility helper
 */
export function computeAllAnniversaries(
  employees: Array<{
    id: string;
    name: string;
    department: string;
    designation: string;
    category?: string;
    status: string;
    profilePicture?: string;
    dateOfJoin?: string;
  }>,
  referenceDate: Date = new Date()
): AnniversaryRecord[] {
  const celebrations = computeAllCelebrations(employees, referenceDate);
  return celebrations
    .filter(c => c.type === 'anniversary')
    .map(c => ({
      employeeId: c.employeeId,
      employeeName: c.employeeName,
      department: c.department,
      designation: c.designation,
      category: c.category,
      status: c.status,
      profilePicture: c.profilePicture,
      dateOfJoin: c.originalDateFormatted,
      anniversaryDateThisYear: c.celebrationDateThisYear,
      anniversaryDisplayDate: c.celebrationDisplayDate,
      completedYears: c.yearsCount,
      daysUntilAnniversary: c.daysUntil,
      isToday: c.isToday,
      isThisWeek: c.isThisWeek,
      isThisMonth: c.isThisMonth,
      isMilestone: c.isMilestone
    }));
}
