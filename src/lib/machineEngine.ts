import { isValid, parseISO, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from 'date-fns';

export function parseCleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  // Clean string: allow digits, decimal point, minus at start
  const cleaned = String(val).trim().replace(/[^0-9.-]/g, '');
  if (!cleaned) return 0;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export interface MachineCapacityCalculation {
  speedVal: number;
  utilVal: number;
  convVal: number;
  capacity16Unit: number;
  capacity16Pcs: number;
  multiplier: number;
  existCapUnit: number;
  existCapPcs: number;
}

export function calculateMachineCapacity(
  machineName: string,
  speedPerMin: any,
  specPerMin: any,
  utilization: any,
  conversionRatio: any,
  manpowerAllocation: string
): MachineCapacityCalculation {
  let speedVal = parseCleanNumber(speedPerMin);
  if (speedVal === 0) {
    speedVal = parseCleanNumber(specPerMin);
  }
  
  let utilVal = parseCleanNumber(utilization);
  // If user entered 0.88 instead of 88, convert to 88
  if (utilVal > 0 && utilVal <= 1) {
    utilVal = utilVal * 100;
  }
  
  const convVal = parseCleanNumber(conversionRatio) || 1;
  const isKonica = (machineName || '').toLowerCase().includes('konica');
  
  // 16 Hours Capacity calculation
  const capacity16Unit = isKonica 
    ? (speedVal / 2) * 60 * 16 * (utilVal / 100)
    : speedVal * 60 * 16 * (utilVal / 100);
    
  const capacity16Pcs = capacity16Unit * convVal;
  
  // Manpower Allocation multiplier
  const alloc = (manpowerAllocation || '').toLowerCase().trim();
  let multiplier = 0;
  if (alloc.includes('both') || alloc.includes('2') || alloc.includes('double') || alloc === 'all') {
    multiplier = 1;
  } else if (alloc.includes('one') || alloc.includes('1') || alloc.includes('single') || alloc.includes('day') || alloc.includes('night') || alloc.includes('general')) {
    multiplier = 0.5;
  } else if (alloc === 'vacancy' || alloc === 'none' || alloc === '0') {
    multiplier = 0;
  } else {
    multiplier = 1;
  }
  
  const existCapUnit = capacity16Unit * multiplier;
  const existCapPcs = capacity16Pcs * multiplier;
  
  return {
    speedVal,
    utilVal,
    convVal,
    capacity16Unit: Math.round(capacity16Unit),
    capacity16Pcs: Math.round(capacity16Pcs),
    multiplier,
    existCapUnit: Math.round(existCapUnit),
    existCapPcs: Math.round(existCapPcs)
  };
}

export function calculateMachineAge(onboardDateStr: string, currentDateStr: string) {
  if (!onboardDateStr) return { years: 0, months: 0, days: 0, formatted: 'Not Available' };
  
  const onboardDate = typeof onboardDateStr === 'string' ? parseISO(onboardDateStr) : onboardDateStr;
  const currentDate = typeof currentDateStr === 'string' ? parseISO(currentDateStr) : currentDateStr;
  
  if (!isValid(onboardDate) || !isValid(currentDate)) {
    return { years: 0, months: 0, days: 0, formatted: 'Not Available' };
  }
  
  const years = differenceInYears(currentDate, onboardDate);
  const dateAfterYears = addYears(onboardDate, years);
  const months = differenceInMonths(currentDate, dateAfterYears);
  const dateAfterMonths = addMonths(dateAfterYears, months);
  const days = differenceInDays(currentDate, dateAfterMonths);
  
  let formatted = '';
  if (years > 0) formatted += `${years} Years`;
  if (months > 0) {
    if (formatted) formatted += ', ';
    formatted += `${months} Months`;
  }
  if (days > 0 || (!years && !months)) {
    if (formatted) formatted += ', ';
    formatted += `${days} Days`;
  }
  
  return {
    years,
    months,
    days,
    formatted
  };
}

export function getMachineStatus(onboardDateStr: string | null | undefined, obsoleteDateStr: string | null | undefined, currentDateStr: string) {
  if (obsoleteDateStr) {
     const obsoleteDate = parseISO(obsoleteDateStr);
     const currentDate = parseISO(currentDateStr);
     if (isValid(obsoleteDate) && isValid(currentDate)) {
       // Using >= implies that on the obsolete date it becomes obsolete.
       if (currentDate.getTime() >= obsoleteDate.getTime()) {
         return 'Obsolete';
       }
     }
  }
  return 'Active';
}
