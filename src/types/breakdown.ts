export type BreakdownStatus = 
  | 'Open' 
  | 'Under Investigation' 
  | 'Maintenance in Progress' 
  | 'Waiting for Spare Parts' 
  | 'Waiting for Service' 
  | 'Completed' 
  | 'Closed' 
  | 'Cancelled';

export interface DailyCalculationBreakdown {
  date: string; // YYYY-MM-DD
  dayName: string; // Thursday, Friday, Saturday, etc.
  calendarStatus: 'Working Day' | 'Friday Weekly Off' | 'Official Non-Working Holiday' | 'Working Holiday' | 'Working Override';
  holidayName?: string;
  isWorkingDay: boolean;
  scheduledWorkingHours: number; // e.g. 16, 8, or 0
  activeShifts: string[]; // e.g. ['Day Shift (08:00-16:00)', 'Night Shift (20:00-04:00)']
  calendarDowntimeHours: number; // Calendar elapsed time on this date
  workingHoursLost: number; // Actual overlap with scheduled shifts (max 16h)
  excludedHours: number;
  lostPcs: number;
  notes: string;
}

export interface BreakdownCalculationDetails {
  totalElapsedHours: number; // Calendar duration
  totalWorkingHoursLost: number; // Valid working hours lost (decimal)
  formattedWorkingHoursLost: string; // e.g. "8h 00m (8.00 Hrs)"
  formattedElapsed: string; // e.g. "36h 00m (36.00 Elapsed Hrs)"
  totalLostPcs: number;
  hourlyCapacityPcs: number;
  standardUnit: string;
  totalLostMachineUnits: number;
  
  // Exclusions summary
  fridayExcludedHours: number;
  holidayExcludedHours: number;
  offShiftExcludedHours: number;
  totalExcludedHours: number;
  
  // Day-by-day audit breakdown
  dailyDetails: DailyCalculationBreakdown[];
  
  // Status summary
  calendarStatusSummary: string;
  shiftSummary: string;
  isValid: boolean;
  error?: string;
}

export interface BreakdownRecord {
  id: string; // Breakdown ID: e.g. BD-2026-00001
  date: string; // YYYY-MM-DD
  department: string;
  machineName: string;
  machineNo: string;
  problemDescription: string;
  productionStop: 'Yes' | 'No';
  reportAt: string; // e.g. "10:35" or "10:35 AM"
  reporterId: string;
  reporterName: string;
  attendAt: string; // e.g. "10:47"
  responseTimeMin: number; // in minutes
  machineStartAt: string; // e.g. "12:15"
  hourLostHours: number; // decimal hours, e.g. 1.67
  hourLostFormatted: string; // e.g. "1 Hour 40 Minutes"
  attendById: string; // Primary Technician ID
  attendByName: string; // Primary Technician Name
  attendByAll: string[]; // All attending technician IDs / names
  failureMode: string;
  category: string;
  activity: string;
  sparePartsService: string;
  quantity: number;
  uom: string;
  unitCost: number;
  totalCost: number;
  status: BreakdownStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;

  // Enriched Calculation Properties (computed or persisted)
  machineStartDate?: string;
  workingHoursLost?: number;
  actualElapsedHours?: number;
  lostPcs?: number;
  lostPcsFormatted?: string;
  hourlyCapacity?: number;
  capacityPerHour?: number;
  capacityPerDay?: number;
  unitStandard?: string;
  calendarStatus?: string;
  shiftInfo?: string;
  calculationDetails?: BreakdownCalculationDetails;
}

export interface BreakdownAuditLogEntry {
  logId: string;
  breakdownId: string;
  timestamp: string;
  date: string;
  time: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
}

export interface BreakdownMasterSetting {
  id: string;
  type: 'FailureMode' | 'Category' | 'Activity' | 'SparePart' | 'UOM';
  value: string;
  description?: string;
  status: 'Active' | 'Inactive';
}

export interface MachineHealthStatus {
  machineName: string;
  machineNo: string;
  department: string;
  status: 'Running' | 'Breakdown' | 'Maintenance';
  activeBreakdownId?: string;
  problemSummary?: string;
  downtimeElapsedMinutes?: number;
  reportAt?: string;
}

