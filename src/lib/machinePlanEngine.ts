import { 
  MachinePlanRecord, 
  CalculatedMachinePlanItem, 
  MachinePlanSettings, 
  MachinePlanFilterState, 
  MachinePlanSummaryKPIs, 
  MachinePlanAuditEntry,
  AchievementTier,
  UEETier,
  MachineStatusType
} from '../types/machinePlan';
import { getBangladeshDateTime } from './taskReminderEngine';
import { getRange, appendRow, updateRange, invalidateCache } from './sheets';
import { UserSecurityScope } from './security';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';

export const DEFAULT_MACHINE_PLAN_SETTINGS: MachinePlanSettings = {
  thresholds: {
    achievementExcellent: 100,
    achievementGood: 95,
    achievementAttention: 85,
    ueeHigh: 85,
    ueeMedium: 75
  },
  standardShiftHours: 8,
  defaultEfficiencyPct: 90,
  autoRefreshEnabled: true,
  autoRefreshIntervalSeconds: 300, // 5 minutes
  defaultMachineUeeTarget: 85,
  machineUeeTargets: {},
  defaultDeptScrapTarget: 3.0,
  departmentScrapTargets: {
    'Offset': 3.0,
    'PFL': 2.5,
    'Screen': 3.0,
    'Thermal': 2.0,
    'RFID': 1.5,
    'Woven': 3.5,
    'Heat Transfer': 2.5,
    'Cutting': 2.0,
    'Sewing': 2.5,
    'Packaging': 1.5
  },
  departmentUoms: {
    'Offset': 'Sheets',
    'PFL': 'Mtr',
    'Woven': 'Mtr',
    'RFID': 'Pcs',
    'Cutting': 'Pcs',
    'Sewing': 'Pcs',
    'Packaging': 'Pcs',
    'Screen Printing': 'Pcs',
    'Screen': 'Pcs',
    'Heat Transfer': 'Pcs',
    'Thermal': 'Pcs'
  }
};

export const DEFAULT_DEPARTMENT_UOMS: Record<string, string> = {
  'Offset': 'Sheets',
  'PFL': 'Mtr',
  'Woven': 'Mtr',
  'RFID': 'Pcs',
  'Cutting': 'Pcs',
  'Sewing': 'Pcs',
  'Packaging': 'Pcs',
  'Screen Printing': 'Pcs',
  'Screen': 'Pcs',
  'Heat Transfer': 'Pcs',
  'Thermal': 'Pcs'
};

// Local storage key for custom settings
const SETTINGS_KEY = 'sml_machine_plan_settings';

export function getMachinePlanSettings(): MachinePlanSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_MACHINE_PLAN_SETTINGS,
        ...parsed,
        thresholds: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.thresholds,
          ...(parsed.thresholds || {})
        },
        machineUeeTargets: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.machineUeeTargets,
          ...(parsed.machineUeeTargets || {})
        },
        departmentScrapTargets: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.departmentScrapTargets,
          ...(parsed.departmentScrapTargets || {})
        },
        departmentUoms: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.departmentUoms,
          ...(parsed.departmentUoms || {})
        }
      };
    }
  } catch (_) {}
  return DEFAULT_MACHINE_PLAN_SETTINGS;
}

export function saveMachinePlanSettings(settings: MachinePlanSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving machine plan settings:', err);
  }
}

// Get specific Target UEE % for a machine model (with fallback to default)
export function getMachineTargetUee(model: string, settings?: MachinePlanSettings): number {
  if (!settings) return 85;
  if (settings.machineUeeTargets) {
    const normalized = model.toLowerCase().trim();
    const key = Object.keys(settings.machineUeeTargets).find(
      k => k.toLowerCase().trim() === normalized
    );
    if (key && typeof settings.machineUeeTargets[key] === 'number') {
      return settings.machineUeeTargets[key];
    }
  }
  return settings.defaultMachineUeeTarget ?? 85;
}

// Get specific Target Scrap % for a department (with fallback to default)
export function getDepartmentTargetScrap(department: string, settings?: MachinePlanSettings): number {
  if (!settings) return 3.0;
  if (settings.departmentScrapTargets) {
    const normalized = department.toLowerCase().trim();
    const key = Object.keys(settings.departmentScrapTargets).find(
      k => k.toLowerCase().trim() === normalized
    );
    if (key && typeof settings.departmentScrapTargets[key] === 'number') {
      return settings.departmentScrapTargets[key];
    }
  }
  return settings.defaultDeptScrapTarget ?? 3.0;
}

// Get configured fixed UOM for a department as per settings (or standard fallback)
export function getDepartmentUom(department: string, settings?: MachinePlanSettings): string {
  if (settings?.departmentUoms) {
    const normalized = department.toLowerCase().trim();
    const key = Object.keys(settings.departmentUoms).find(
      k => k.toLowerCase().trim() === normalized
    );
    if (key && settings.departmentUoms[key]) {
      return settings.departmentUoms[key];
    }
  }
  const normalized = department.toLowerCase().trim();
  const defKey = Object.keys(DEFAULT_DEPARTMENT_UOMS).find(
    k => k.toLowerCase().trim() === normalized
  );
  if (defKey) return DEFAULT_DEPARTMENT_UOMS[defKey];
  return 'Pcs';
}

// Get sanitized, deduplicated production departments from settings & standard list
// Rigorously filters out "Department", "All", empty strings, etc.
export function getConfiguredDepartments(settings?: MachinePlanSettings, additionalDepts: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const candidates = [
    ...Object.keys(settings?.departmentScrapTargets || {}),
    ...Object.keys(settings?.departmentUoms || {}),
    'Offset',
    'PFL',
    'Woven',
    'RFID',
    'Cutting',
    'Sewing',
    'Packaging',
    'Screen Printing',
    'Heat Transfer',
    ...additionalDepts
  ];

  for (const c of candidates) {
    if (!c) continue;
    const trimmed = c.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || lower === 'department' || lower === 'all' || lower === 'general') continue;
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }

  return result;
}

// Color checks based on target:
// For UEE: if target is over actual (target > actual, or actual failed target) -> RED, otherwise -> GREEN
export function isUeeFailed(
  actualUeeOrModel: number | string | null | undefined, 
  targetUeeOrActual: number | null | undefined, 
  settings?: MachinePlanSettings
): boolean {
  if (typeof actualUeeOrModel === 'string') {
    const actual = targetUeeOrActual;
    if (actual === null || actual === undefined || isNaN(actual)) return false;
    const target = settings ? getMachineTargetUee(actualUeeOrModel, settings) : 85;
    return actual < target;
  }
  const actualUee = typeof actualUeeOrModel === 'number' ? actualUeeOrModel : 0;
  const targetUee = typeof targetUeeOrActual === 'number' ? targetUeeOrActual : 85;
  if (actualUee === null || actualUee === undefined || isNaN(actualUee)) return false;
  return actualUee < targetUee;
}

// For Scrap: if actual scrap is over target percentage -> RED, otherwise -> GREEN
export function isScrapOverTarget(
  deptOrActualScrap: string | number | null | undefined, 
  actualOrTargetScrap: number | null | undefined, 
  settings?: MachinePlanSettings
): boolean {
  if (typeof deptOrActualScrap === 'string') {
    const actual = actualOrTargetScrap;
    if (actual === null || actual === undefined || isNaN(actual)) return false;
    const target = settings ? getDepartmentTargetScrap(deptOrActualScrap, settings) : 3.0;
    return actual > target;
  }
  const actualScrap = typeof deptOrActualScrap === 'number' ? deptOrActualScrap : 0;
  const targetScrap = typeof actualOrTargetScrap === 'number' ? actualOrTargetScrap : 3.0;
  if (actualScrap === null || actualScrap === undefined || isNaN(actualScrap)) return false;
  return actualScrap > targetScrap;
}

// Format numbers with commas and decimals safely
export function formatNumeric(val: number | null | undefined, decimals = 0): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Clean number parser
export function cleanParseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim().replace(/[^0-9.-]/g, '');
  if (!str) return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Calculation logic
export function calculateTargetOutput(planHours: number, capacityImplementPerHour: number): number {
  const h = Math.max(0, cleanParseNumber(planHours));
  const c = Math.max(0, cleanParseNumber(capacityImplementPerHour));
  return Math.round(h * c);
}

export function calculateAchievementPct(actual: number, target: number): number | null {
  const a = cleanParseNumber(actual);
  const t = cleanParseNumber(target);
  if (t <= 0) return null; // Safe handling: null when target is zero
  const pct = (a / t) * 100;
  if (isNaN(pct) || !isFinite(pct)) return null;
  return Math.round(pct * 100) / 100; // 2 decimal precision
}

export function calculateOutputGap(actual: number, target: number): number {
  return Math.round(cleanParseNumber(actual) - cleanParseNumber(target));
}

export function calculateGapPct(gap: number, target: number): number | null {
  const t = cleanParseNumber(target);
  if (t <= 0) return null;
  const pct = (gap / t) * 100;
  if (isNaN(pct) || !isFinite(pct)) return null;
  return Math.round(pct * 100) / 100;
}

export function getAchievementTier(
  pct: number | null, 
  thresholds = DEFAULT_MACHINE_PLAN_SETTINGS.thresholds
): AchievementTier {
  if (pct === null) return 'No Target';
  if (pct >= thresholds.achievementExcellent) return 'Excellent';
  if (pct >= thresholds.achievementGood) return 'Good';
  if (pct >= thresholds.achievementAttention) return 'Attention';
  return 'Critical';
}

export function getUEETier(
  uee: number | null, 
  thresholds = DEFAULT_MACHINE_PLAN_SETTINGS.thresholds
): UEETier {
  if (uee === null || isNaN(uee)) return 'N/A';
  if (uee >= thresholds.ueeHigh) return 'High';
  if (uee >= thresholds.ueeMedium) return 'Medium';
  return 'Low';
}

// Parse string rows from Google Sheet into MachinePlanRecord
export function parseMachinePlanRow(row: string[], index: number): MachinePlanRecord {
  const id = row[0]?.trim() || `MPA-${row[1]?.replace(/[^0-9]/g, '') || 'REC'}-${String(index + 1).padStart(3, '0')}`;
  const date = row[1]?.trim() || getBangladeshDateTime().dateString;
  const department = row[2]?.trim() || 'General';
  const uom = row[3]?.trim() || 'PCS';
  const machineModel = row[4]?.trim() || `Machine-${index + 1}`;
  const specSpeedPerHour = cleanParseNumber(row[5]) || 2000;
  const avWorkingHours = cleanParseNumber(row[6]) || 8;
  const totalCapacityBasis = cleanParseNumber(row[7]) || (avWorkingHours * 1);
  const capacityImplementPerHour = cleanParseNumber(row[8]) || Math.round(specSpeedPerHour * 0.9);
  const planHours = cleanParseNumber(row[9]) || avWorkingHours;
  const rawStatus = (row[10]?.trim() || 'Running') as MachineStatusType;
  const machineStatus: MachineStatusType = [
    'Running', 'Planned', 'Idle', 'Breakdown', 'Maintenance', 
    'Holiday', 'No Plan', 'Completed', 'Partially Completed', 'Off'
  ].includes(rawStatus) ? rawStatus : (rawStatus.toLowerCase() === 'off' || rawStatus.toLowerCase() === 'offline' ? 'Off' : 'Running');

  const targetOutput = cleanParseNumber(row[11]) || calculateTargetOutput(planHours, capacityImplementPerHour);
  const actualOutput = cleanParseNumber(row[12]);
  const sku = row[13]?.trim() || '';
  const mo = row[14]?.trim() || '';
  
  const rawUee = row[15]?.trim();
  let totalUeePct: number | null = null;
  if (rawUee && rawUee.toUpperCase() !== 'N/A' && rawUee !== '-') {
    const parsed = cleanParseNumber(rawUee);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      totalUeePct = parsed;
    }
  }

  const remarks = row[16]?.trim() || '';
  let offReason: string | undefined = undefined;
  if (remarks.startsWith('[OFF:')) {
    const match = remarks.match(/\[OFF:\s*([^\]]+)\]/i);
    if (match && match[1]) {
      offReason = match[1].trim();
    }
  }
  const shift = row[17]?.trim() || 'Day Shift';
  const createdBy = row[18]?.trim() || '';
  const createdAt = row[19]?.trim() || '';
  const updatedBy = row[20]?.trim() || '';
  const updatedAt = row[21]?.trim() || '';

  return {
    id,
    date,
    department,
    uom,
    machineModel,
    specSpeedPerHour,
    specSpeedDisplay: `${formatNumeric(specSpeedPerHour)} ${uom}/H`,
    avWorkingHours,
    totalCapacityBasis,
    capacityImplementPerHour,
    planHours,
    machineStatus,
    offReason,
    targetOutput,
    actualOutput,
    sku,
    mo,
    totalUeePct,
    remarks,
    shift,
    createdBy,
    createdAt,
    updatedBy,
    updatedAt
  };
}

// Convert MachinePlanRecord into Sheet Row
export function serializeMachinePlanRow(rec: MachinePlanRecord): string[] {
  return [
    rec.id,
    rec.date,
    rec.department,
    rec.uom,
    rec.machineModel,
    String(rec.specSpeedPerHour),
    String(rec.avWorkingHours),
    String(rec.totalCapacityBasis),
    String(rec.capacityImplementPerHour),
    String(rec.planHours),
    rec.machineStatus,
    String(rec.targetOutput),
    String(rec.actualOutput),
    rec.sku,
    rec.mo,
    rec.totalUeePct !== null ? String(rec.totalUeePct) : 'N/A',
    rec.offReason && !rec.remarks?.includes(`[OFF: ${rec.offReason}]`)
      ? `[OFF: ${rec.offReason}] ${rec.remarks || ''}`.trim()
      : (rec.remarks || ''),
    rec.shift || 'Day Shift',
    rec.createdBy || '',
    rec.createdAt || new Date().toISOString(),
    rec.updatedBy || '',
    rec.updatedAt || new Date().toISOString()
  ];
}

// Calculate all fields for an item
export function calculateMachinePlanItem(
  record: MachinePlanRecord, 
  sl: number, 
  thresholds = DEFAULT_MACHINE_PLAN_SETTINGS.thresholds
): CalculatedMachinePlanItem {
  const achievementPct = calculateAchievementPct(record.actualOutput, record.targetOutput);
  const outputGap = calculateOutputGap(record.actualOutput, record.targetOutput);
  const gapPct = calculateGapPct(outputGap, record.targetOutput);
  const achievementTier = getAchievementTier(achievementPct, thresholds);
  const ueeTier = getUEETier(record.totalUeePct, thresholds);

  return {
    ...record,
    sl,
    achievementPct,
    outputGap,
    gapPct,
    achievementTier,
    ueeTier
  };
}

// Aggregate summary KPIs
export function aggregateMachinePlanKPIs(
  items: CalculatedMachinePlanItem[], 
  thresholds = DEFAULT_MACHINE_PLAN_SETTINGS.thresholds
): MachinePlanSummaryKPIs {
  const totalMachines = items.length;
  let plannedMachines = 0;
  let runningMachines = 0;
  let idleMachines = 0;
  let breakdownMachines = 0;
  let maintenanceMachines = 0;
  let totalPlanHours = 0;
  let totalTargetOutput = 0;
  let totalActualOutput = 0;
  let ueeSum = 0;
  let ueeCount = 0;
  let attentionCount = 0;

  items.forEach(item => {
    if (item.planHours > 0) plannedMachines++;
    if (item.machineStatus === 'Running') runningMachines++;
    else if (item.machineStatus === 'Idle') idleMachines++;
    else if (item.machineStatus === 'Breakdown') breakdownMachines++;
    else if (item.machineStatus === 'Maintenance') maintenanceMachines++;

    totalPlanHours += item.planHours;
    totalTargetOutput += item.targetOutput;
    totalActualOutput += item.actualOutput;

    if (item.totalUeePct !== null && item.totalUeePct >= 0) {
      ueeSum += item.totalUeePct;
      ueeCount++;
    }

    if (
      item.machineStatus === 'Breakdown' || 
      (item.achievementPct !== null && item.achievementPct < thresholds.achievementAttention) ||
      (item.totalUeePct !== null && item.totalUeePct < thresholds.ueeMedium) ||
      (item.planHours > 0 && item.actualOutput === 0)
    ) {
      attentionCount++;
    }
  });

  const overallAchievementPct = totalTargetOutput > 0
    ? Math.round((totalActualOutput / totalTargetOutput) * 10000) / 100
    : null;

  const averageUeePct = ueeCount > 0
    ? Math.round((ueeSum / ueeCount) * 10) / 10
    : null;

  const productionGap = totalActualOutput - totalTargetOutput;
  const gapPct = totalTargetOutput > 0
    ? Math.round((productionGap / totalTargetOutput) * 10000) / 100
    : null;

  return {
    totalMachines,
    plannedMachines,
    runningMachines,
    idleMachines,
    breakdownMachines,
    maintenanceMachines,
    totalPlanHours: Math.round(totalPlanHours * 10) / 10,
    totalTargetOutput: Math.round(totalTargetOutput),
    totalActualOutput: Math.round(totalActualOutput),
    overallAchievementPct,
    averageUeePct,
    productionGap,
    gapPct,
    attentionCount
  };
}

// Compute date ranges based on presets using Bangladesh local time
export function getDateRangeForPreset(preset: string): { start: string; end: string } {
  const bdNow = getBangladeshDateTime();
  const todayStr = bdNow.dateString;
  const todayDate = parseISO(todayStr);

  switch (preset) {
    case 'today':
      return { start: todayStr, end: todayStr };
    case 'yesterday': {
      const y = format(subDays(todayDate, 1), 'yyyy-MM-dd');
      return { start: y, end: y };
    }
    case 'this_week': {
      const s = format(startOfWeek(todayDate, { weekStartsOn: 6 }), 'yyyy-MM-dd'); // Week starts Saturday in Bangladesh
      const e = format(endOfWeek(todayDate, { weekStartsOn: 6 }), 'yyyy-MM-dd');
      return { start: s, end: e };
    }
    case 'this_month': {
      const s = format(startOfMonth(todayDate), 'yyyy-MM-dd');
      const e = format(endOfMonth(todayDate), 'yyyy-MM-dd');
      return { start: s, end: e };
    }
    default:
      return { start: todayStr, end: todayStr };
  }
}

// Filter and sort items
export function filterAndSortMachinePlan(
  records: MachinePlanRecord[],
  filter: MachinePlanFilterState,
  sortField: keyof CalculatedMachinePlanItem | 'sl',
  sortDirection: 'asc' | 'desc',
  thresholds = DEFAULT_MACHINE_PLAN_SETTINGS.thresholds
): CalculatedMachinePlanItem[] {
  let filtered = records.filter(rec => {
    // Date filter
    if (filter.startDate && filter.endDate) {
      if (rec.date < filter.startDate || rec.date > filter.endDate) return false;
    } else if (filter.startDate) {
      if (rec.date !== filter.startDate) return false;
    }

    // Department
    if (filter.department && filter.department !== 'All') {
      if (rec.department.toLowerCase() !== filter.department.toLowerCase()) return false;
    }

    // Machine Model
    if (filter.machineModel && filter.machineModel !== 'All') {
      if (rec.machineModel.toLowerCase() !== filter.machineModel.toLowerCase()) return false;
    }

    // Machine Status
    if (filter.machineStatus && filter.machineStatus !== 'All') {
      if (rec.machineStatus.toLowerCase() !== filter.machineStatus.toLowerCase()) return false;
    }

    // UOM
    if (filter.uom && filter.uom !== 'All') {
      if (rec.uom.toLowerCase() !== filter.uom.toLowerCase()) return false;
    }

    // SKU
    if (filter.sku && filter.sku.trim()) {
      if (!rec.sku.toLowerCase().includes(filter.sku.toLowerCase().trim())) return false;
    }

    // MO
    if (filter.mo && filter.mo.trim()) {
      if (!rec.mo.toLowerCase().includes(filter.mo.toLowerCase().trim())) return false;
    }

    // Achievement status tier
    if (filter.achievementStatus && filter.achievementStatus !== 'All') {
      const ach = calculateAchievementPct(rec.actualOutput, rec.targetOutput);
      const tier = getAchievementTier(ach, thresholds);
      if (filter.achievementStatus.toLowerCase() !== tier.toLowerCase()) return false;
    }

    // UEE range
    if (filter.ueeRange && filter.ueeRange !== 'all') {
      const uee = rec.totalUeePct;
      const tier = getUEETier(uee, thresholds);
      if (filter.ueeRange.toLowerCase() !== tier.toLowerCase()) return false;
    }

    // Universal Search
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      const match = 
        rec.machineModel.toLowerCase().includes(q) ||
        rec.department.toLowerCase().includes(q) ||
        rec.sku.toLowerCase().includes(q) ||
        rec.mo.toLowerCase().includes(q) ||
        rec.remarks.toLowerCase().includes(q) ||
        rec.uom.toLowerCase().includes(q) ||
        rec.machineStatus.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Calculate items with serial number
  const calculatedItems = filtered.map((rec, idx) => 
    calculateMachinePlanItem(rec, idx + 1, thresholds)
  );

  // Sorting
  calculatedItems.sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (aVal === null || aVal === undefined) aVal = -Infinity;
    if (bVal === null || bVal === undefined) bVal = -Infinity;

    if (typeof aVal === 'string') {
      const cmp = aVal.localeCompare(String(bVal));
      return sortDirection === 'asc' ? cmp : -cmp;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Re-number SL after sorting so SL remains stable 1, 2, 3...
  return calculatedItems.map((item, idx) => ({ ...item, sl: idx + 1 }));
}

// Generate synthesized baseline records from MachineCapacity master if no records exist for a date
export function synthesizeBaselineRecords(
  dateStr: string,
  machineRows: string[][],
  breakdownRows: string[][] = [],
  holidayRows: string[][] = []
): MachinePlanRecord[] {
  if (!Array.isArray(machineRows) || machineRows.length <= 1) return [];

  // Check if date is a holiday or Friday
  const dateObj = parseISO(dateStr);
  const isValidDate = isValid(dateObj);
  const isFriday = isValidDate && dateObj.getDay() === 5; // Friday
  const isHoliday = holidayRows.some(h => h[2] === dateStr && h[7]?.toLowerCase() === 'active');
  const defaultHours = (isFriday || isHoliday) ? 0 : 8;

  // Active breakdowns for this date
  const activeBreakdowns = new Set<string>();
  breakdownRows.forEach(row => {
    if (row[1] === dateStr && row[26] !== 'Closed') {
      activeBreakdowns.add((row[3] || '').trim().toLowerCase());
    }
  });

  const header = machineRows[0] || [];
  const nameIdx = header.indexOf('Machine Name') !== -1 ? header.indexOf('Machine Name') : 4;
  const deptIdx = header.indexOf('Department') !== -1 ? header.indexOf('Department') : 1;
  const uomIdx = header.indexOf('Standard Unit') !== -1 ? header.indexOf('Standard Unit') : 5;
  const speedIdx = header.indexOf('Standard Speed Per Minutes') !== -1 ? header.indexOf('Standard Speed Per Minutes') : 7;
  const utilIdx = header.indexOf('Utilization %') !== -1 ? header.indexOf('Utilization %') : 8;
  const machineNoIdx = header.indexOf('Machine No') !== -1 ? header.indexOf('Machine No') : 20;
  const ueeIdx = header.indexOf('Calculate UEE') !== -1 ? header.indexOf('Calculate UEE') : 26;

  const records: MachinePlanRecord[] = [];

  for (let i = 1; i < machineRows.length; i++) {
    const row = machineRows[i];
    if (!row || row.length === 0) continue;
    const name = row[nameIdx]?.trim();
    if (!name) continue;

    // Filter by Calculate UEE: only include machines where Calculate UEE is Yes
    const ueeVal = (row[ueeIdx] !== undefined && row[ueeIdx] !== '') ? String(row[ueeIdx]).trim().toLowerCase() : 'yes';
    if (ueeVal === 'no') continue;

    const dept = row[deptIdx]?.trim() || 'General';
    const uom = row[uomIdx]?.trim() || 'PCS';
    const rawSpeed = cleanParseNumber(row[speedIdx]);
    // Standard speed per hour
    const specSpeedPerHour = rawSpeed > 0 ? rawSpeed : 2000;
    const utilPct = cleanParseNumber(row[utilIdx]) || 90;
    const efficiencyFactor = utilPct > 0 ? (utilPct > 1 ? utilPct / 100 : utilPct) : 0.9;
    const capacityImplementPerHour = Math.round(specSpeedPerHour * efficiencyFactor);
    const machineNo = row[machineNoIdx]?.trim() || `MC-${i}`;

    const isBroken = activeBreakdowns.has(name.toLowerCase());
    let machineStatus: MachineStatusType = isBroken 
      ? 'Breakdown' 
      : defaultHours === 0 
        ? 'Holiday' 
        : 'Running';

    const planHours = defaultHours;
    const targetOutput = calculateTargetOutput(planHours, capacityImplementPerHour);
    // Baseline realistic actual output (approx 92-98% of target)
    const actualOutput = defaultHours > 0 
      ? (isBroken ? 0 : Math.round(targetOutput * (0.88 + (i % 4) * 0.04)))
      : 0;

    const totalUeePct = defaultHours > 0 && !isBroken 
      ? Math.round((78 + (i % 5) * 3) * 10) / 10 
      : null;

    records.push({
      id: `MPA-${dateStr.replace(/-/g, '')}-${String(i).padStart(3, '0')}`,
      date: dateStr,
      department: dept,
      uom,
      machineModel: name,
      machineNo,
      specSpeedPerHour,
      specSpeedDisplay: `${formatNumeric(specSpeedPerHour)} ${uom}/H`,
      avWorkingHours: defaultHours,
      totalCapacityBasis: defaultHours,
      capacityImplementPerHour,
      planHours,
      machineStatus,
      targetOutput,
      actualOutput,
      sku: `SKU-${dept.toUpperCase()}-${100 + i * 12}`,
      mo: `MO-2026-${String(800 + i * 5).padStart(4, '0')}`,
      totalUeePct,
      remarks: isBroken ? 'Downtime logged in Breakdown registry' : (defaultHours === 0 ? 'Official Weekend / Holiday' : 'Standard production plan running smoothly'),
      shift: 'Day Shift',
      createdAt: new Date().toISOString(),
      createdBy: 'System Auto-Planner'
    });
  }

  return records;
}
