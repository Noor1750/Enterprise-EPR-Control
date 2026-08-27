import { 
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, 
  startOfYear, endOfYear, isWithinInterval, parseISO, isValid, format, formatDistanceToNow 
} from 'date-fns';
import { DashboardDateFilter, DateRange } from './types';

export function calculateDateRange(
  filter: DashboardDateFilter, 
  customStart?: string, 
  customEnd?: string, 
  referenceDate: Date = new Date()
): DateRange {
  switch (filter) {
    case 'today':
      return {
        start: startOfDay(referenceDate),
        end: endOfDay(referenceDate),
        label: 'Today (' + format(referenceDate, 'dd MMM yyyy') + ')'
      };
    case 'yesterday': {
      const yesterday = subDays(referenceDate, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        label: 'Yesterday (' + format(yesterday, 'dd MMM yyyy') + ')'
      };
    }
    case 'this_week':
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 6 }), // Saturday in Bangladesh ERP
        end: endOfWeek(referenceDate, { weekStartsOn: 6 }),
        label: 'This Week'
      };
    case 'this_month':
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate),
        label: format(referenceDate, 'MMMM yyyy')
      };
    case 'prev_month': {
      const prev = subMonths(referenceDate, 1);
      return {
        start: startOfMonth(prev),
        end: endOfMonth(prev),
        label: 'Previous Month (' + format(prev, 'MMMM yyyy') + ')'
      };
    }
    case 'this_quarter':
      return {
        start: startOfQuarter(referenceDate),
        end: endOfQuarter(referenceDate),
        label: 'This Quarter (' + format(referenceDate, 'QQQ yyyy') + ')'
      };
    case 'this_year':
      return {
        start: startOfYear(referenceDate),
        end: endOfYear(referenceDate),
        label: 'This Year (' + format(referenceDate, 'yyyy') + ')'
      };
    case 'custom':
      if (customStart && customEnd) {
        const s = parseISO(customStart);
        const e = parseISO(customEnd);
        if (isValid(s) && isValid(e)) {
          return {
            start: startOfDay(s),
            end: endOfDay(e),
            label: `${format(s, 'dd MMM')} – ${format(e, 'dd MMM yyyy')}`
          };
        }
      }
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate),
        label: format(referenceDate, 'MMMM yyyy')
      };
    case 'all':
    default:
      return {
        start: new Date(2020, 0, 1),
        end: new Date(2035, 11, 31),
        label: 'All Time Records'
      };
  }
}

export function isDateInInterval(dateStr: string | null | undefined, interval: { start: Date; end: Date }): boolean {
  if (!dateStr) return false;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return false;
    return isWithinInterval(d, interval);
  } catch {
    return false;
  }
}

export function formatSafeTimeAgo(timestampStr: string | null | undefined): string {
  if (!timestampStr) return 'Recently';
  try {
    const d = parseISO(timestampStr);
    if (!isValid(d)) return timestampStr;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return timestampStr;
  }
}
