export type MachineStatusType = 
  | 'Running' 
  | 'Planned' 
  | 'Idle' 
  | 'Breakdown' 
  | 'Maintenance' 
  | 'Holiday' 
  | 'No Plan' 
  | 'Completed' 
  | 'Partially Completed'
  | 'Off';

export type AchievementTier = 'Excellent' | 'Good' | 'Attention' | 'Critical' | 'No Target';
export type UEETier = 'High' | 'Medium' | 'Low' | 'N/A';

export interface MachinePlanRecord {
  id: string; // Primary key (e.g. MPA-20260912-001)
  date: string; // YYYY-MM-DD
  department: string; // e.g. FRU, BT, BD, RFID, Woven, Offset, Sewing, Cutting, PFL, Packaging
  uom: string; // e.g. PCS, Meter, Roll, Sheets, Boxes
  machineModel: string; // e.g. CL-326IE, ZSM108, RIM601H, Single Needle, Cutter 5000
  machineNo?: string; // Optional asset tag / machine no (e.g. MC-RFID-01)
  specSpeedPerHour: number; // Numeric specification speed per hour
  specSpeedDisplay?: string; // Formatted speed string (e.g. "2,000 PCS/H")
  avWorkingHours: number; // Average / available working hours (e.g. 8.0, 16.0)
  totalCapacityBasis: number; // Machine capacity basis: Available Machine Count × Av. Working Hrs
  capacityImplementPerHour: number; // Specification speed/H × efficiency/implementation factor
  planHours: number; // Hours planned for the machine/date/order
  machineStatus: MachineStatusType; // Running, Planned, Idle, Breakdown, Maintenance, Holiday, Off, etc.
  offReason?: string; // Reason if machine is turned OFF or stopped
  targetOutput: number; // Plan Hours × Capacity Implement/Hrs
  actualOutput: number; // Actual production quantity achieved
  sku: string; // Production SKU/style/item identifier
  mo: string; // Manufacturing Order / order number
  totalUeePct: number | null; // Total UEE percentage (0-100) or null if N/A
  remarks: string; // Operational remarks / downtime reasons
  
  // Optional tracking and breakdown
  shift?: string; // Day Shift, Night Shift, General, Both Shift
  operatorId?: string;
  operatorName?: string;
  hourlyBreakdown?: Array<{
    hour: string;
    target: number;
    actual: number;
    notes?: string;
  }>;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CalculatedMachinePlanItem extends MachinePlanRecord {
  sl: number; // 1-based display serial number
  achievementPct: number | null; // (actualOutput / targetOutput) * 100 or null if target is 0
  outputGap: number; // actualOutput - targetOutput
  gapPct: number | null; // (outputGap / targetOutput) * 100 or null
  achievementTier: AchievementTier;
  ueeTier: UEETier;
}

export type DateFilterPreset = 
  | 'today' 
  | 'yesterday' 
  | 'specific' 
  | 'range' 
  | 'this_week' 
  | 'this_month';

export interface MachinePlanFilterState {
  datePreset: DateFilterPreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  department: string; // 'All' or specific department
  machineModel: string; // 'All' or specific model
  machineStatus: string; // 'All' or specific status
  sku: string;
  mo: string;
  uom: string; // 'All' or specific UOM
  achievementStatus: string; // 'All', 'on_target', 'near_target', 'attention', 'critical'
  ueeRange: string; // 'all', 'high', 'medium', 'low', 'na'
  searchQuery: string;
}

export interface MachinePlanThresholds {
  achievementExcellent: number; // e.g. 100
  achievementGood: number; // e.g. 95
  achievementAttention: number; // e.g. 85
  ueeHigh: number; // e.g. 85
  ueeMedium: number; // e.g. 75
}

export interface MachinePlanSettings {
  thresholds: MachinePlanThresholds;
  standardShiftHours: number; // default 8
  defaultEfficiencyPct: number; // default 90%
  autoRefreshEnabled: boolean;
  autoRefreshIntervalSeconds: number; // default 300 (5 minutes)
  // Machine-wise target UEE percentage
  defaultMachineUeeTarget?: number; // e.g. 85%
  machineUeeTargets?: Record<string, number>; // machineModel -> target UEE %
  // Department-wise scrap target percentage
  defaultDeptScrapTarget?: number; // e.g. 3.0%
  departmentScrapTargets?: Record<string, number>; // department -> target Scrap %
  // Department-wise default / fixed UOM
  departmentUoms?: Record<string, string>; // department -> fixed UOM (Sheets, Mtr, Pcs, etc.)
}

export interface MachinePlanSummaryKPIs {
  totalMachines: number;
  plannedMachines: number;
  runningMachines: number;
  idleMachines: number;
  breakdownMachines: number;
  maintenanceMachines: number;
  totalPlanHours: number;
  totalTargetOutput: number;
  totalActualOutput: number;
  overallAchievementPct: number | null;
  averageUeePct: number | null;
  productionGap: number;
  gapPct: number | null;
  attentionCount: number; // Machines with critical achievement or breakdown
}

export interface MachinePlanAuditEntry {
  id: string;
  planId: string;
  timestamp: string;
  date: string;
  userEmail: string;
  userName: string;
  userRole: string;
  action: 'Created' | 'Updated' | 'Status Changed' | 'Deleted';
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  details: string;
}
