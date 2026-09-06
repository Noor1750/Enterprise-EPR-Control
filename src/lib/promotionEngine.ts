import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from './sheets';
import { Employee } from '../components/kpi/types';

export interface EmployeePromotionRecord {
  id: string; // e.g. PROM-2026-001
  employeeId: string;
  employeeName: string;
  department: string;
  promotionYear: number; // e.g. 2026
  promotionDate: string; // YYYY-MM-DD
  previousDesignation: string;
  newDesignation: string;
  previousSalary?: string;
  newSalary?: string;
  promotionType: 'Annual Appraisal' | 'Performance Based' | 'Merit / Tenure' | 'Designation Upgrade' | 'Special Role Change';
  approvedBy: string; // Name of Manager / Admin
  approvedByEmail?: string;
  remarks?: string;
  createdAt: string;
}

const STORAGE_KEY = 'erp_employee_promotions';

// Initial sample promotions for realistic display
const DEFAULT_PROMOTIONS: EmployeePromotionRecord[] = [
  {
    id: 'PROM-2026-001',
    employeeId: 'EMP001',
    employeeName: 'Mohammad Rahim',
    department: 'Printing',
    promotionYear: 2026,
    promotionDate: '2026-01-15',
    previousDesignation: 'Machine Operator',
    newDesignation: 'Senior Machine Operator',
    previousSalary: '22000',
    newSalary: '26500',
    promotionType: 'Performance Based',
    approvedBy: 'Md. Noor Alam',
    remarks: 'Demonstrated superior uptime and zero defect printing performance throughout 2025.',
    createdAt: '2026-01-15T09:00:00Z'
  },
  {
    id: 'PROM-2025-004',
    employeeId: 'EMP001',
    employeeName: 'Mohammad Rahim',
    department: 'Printing',
    promotionYear: 2024,
    promotionDate: '2024-06-01',
    previousDesignation: 'Junior Operator',
    newDesignation: 'Machine Operator',
    previousSalary: '18000',
    newSalary: '22000',
    promotionType: 'Annual Appraisal',
    approvedBy: 'Mamunur Rashid',
    remarks: 'Completed 2-year operator qualification with distinction.',
    createdAt: '2024-06-01T10:00:00Z'
  },
  {
    id: 'PROM-2026-002',
    employeeId: 'EMP002',
    employeeName: 'Fatema Begum',
    department: 'Sewing',
    promotionYear: 2026,
    promotionDate: '2026-02-01',
    previousDesignation: 'Sewing Operator',
    newDesignation: 'Line Quality Inspector',
    previousSalary: '20500',
    newSalary: '24000',
    promotionType: 'Merit / Tenure',
    approvedBy: 'Jewel Rana',
    remarks: 'Consistent top score in 5S and quality audit inspections.',
    createdAt: '2026-02-01T11:00:00Z'
  },
  {
    id: 'PROM-2025-007',
    employeeId: 'EMP003',
    employeeName: 'Tarak Rahman',
    department: 'Cutting',
    promotionYear: 2025,
    promotionDate: '2025-07-01',
    previousDesignation: 'Assistant Cutter',
    newDesignation: 'Master Cutter',
    previousSalary: '24000',
    newSalary: '29000',
    promotionType: 'Designation Upgrade',
    approvedBy: 'Md. Noor Alam',
    remarks: 'Mastery over high-speed Gerber cutting systems.',
    createdAt: '2025-07-01T08:30:00Z'
  }
];

export function getLocalPromotions(): EmployeePromotionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse local promotions:', err);
  }
  // Initialize with defaults if empty
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROMOTIONS));
  return DEFAULT_PROMOTIONS;
}

export function saveLocalPromotions(promotions: EmployeePromotionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
    window.dispatchEvent(new CustomEvent('erp-promotions-updated', { detail: { count: promotions.length } }));
  } catch (err) {
    console.error('Failed to save local promotions:', err);
  }
}

/**
 * Fetches all promotion records from Google Sheets (sheet: EmployeePromotions) or local storage
 */
export async function fetchEmployeePromotions(spreadsheetId?: string): Promise<EmployeePromotionRecord[]> {
  const localList = getLocalPromotions();
  if (!spreadsheetId || spreadsheetId === 'local-storage-db') {
    return localList;
  }

  try {
    const rows = await getRange(spreadsheetId, 'EmployeePromotions!A:M');
    if (rows && rows.length > 1) {
      const parsedFromSheet: EmployeePromotionRecord[] = rows.slice(1).map(r => ({
        id: String(r[0] || '').trim(),
        employeeId: String(r[1] || '').trim(),
        employeeName: String(r[2] || '').trim(),
        department: String(r[3] || '').trim(),
        promotionYear: parseInt(String(r[4] || '0'), 10) || new Date().getFullYear(),
        promotionDate: String(r[5] || '').trim(),
        previousDesignation: String(r[6] || '').trim(),
        newDesignation: String(r[7] || '').trim(),
        previousSalary: String(r[8] || '').trim(),
        newSalary: String(r[9] || '').trim(),
        promotionType: (String(r[10] || 'Performance Based').trim()) as any,
        approvedBy: String(r[11] || '').trim(),
        remarks: String(r[12] || '').trim(),
        createdAt: String(r[13] || new Date().toISOString()).trim()
      })).filter(p => p.id && p.employeeId);

      if (parsedFromSheet.length > 0) {
        saveLocalPromotions(parsedFromSheet);
        return parsedFromSheet;
      }
    }
  } catch (err) {
    console.warn('Could not load EmployeePromotions sheet, using cached storage:', err);
  }

  return localList;
}

/**
 * Records a new employee promotion, updating both the promotion registry
 * and the employee's current designation in the master employee directory.
 */
export async function recordEmployeePromotion(
  promotion: Omit<EmployeePromotionRecord, 'id' | 'createdAt'>,
  spreadsheetId?: string
): Promise<EmployeePromotionRecord> {
  const allPromotions = getLocalPromotions();
  const year = promotion.promotionYear || new Date(promotion.promotionDate).getFullYear() || new Date().getFullYear();
  const newId = `PROM-${year}-${Date.now().toString().slice(-4)}`;

  const fullRecord: EmployeePromotionRecord = {
    ...promotion,
    id: newId,
    promotionYear: year,
    createdAt: new Date().toISOString()
  };

  const updatedList = [fullRecord, ...allPromotions];
  saveLocalPromotions(updatedList);

  // Sync to Google Sheet if connected
  if (spreadsheetId && spreadsheetId !== 'local-storage-db') {
    try {
      const row = [
        fullRecord.id,
        fullRecord.employeeId,
        fullRecord.employeeName,
        fullRecord.department,
        fullRecord.promotionYear.toString(),
        fullRecord.promotionDate,
        fullRecord.previousDesignation,
        fullRecord.newDesignation,
        fullRecord.previousSalary || '',
        fullRecord.newSalary || '',
        fullRecord.promotionType,
        fullRecord.approvedBy,
        fullRecord.remarks || '',
        fullRecord.createdAt
      ];
      await appendRow(spreadsheetId, 'EmployeePromotions!A:N', [row]);

      // Also update employee's designation in the Employees sheet
      if (promotion.newDesignation) {
        try {
          const empRows = await getRange(spreadsheetId, 'Employees!A:Z');
          if (empRows && empRows.length > 0) {
            const empRow = empRows.find(r => (r[0] || '').trim().toUpperCase() === promotion.employeeId.trim().toUpperCase());
            if (empRow) {
              const updatedRow = [...empRow];
              updatedRow[2] = promotion.newDesignation; // Col 2 is Designation
              if (promotion.newSalary) {
                updatedRow[11] = promotion.newSalary; // Col 11 is Salary if present
              }
              await updateRowByPrimaryKey(spreadsheetId, 'Employees', promotion.employeeId, updatedRow);
            }
          }
        } catch (empUpdateErr) {
          console.warn('Failed to update employee designation in Employees sheet:', empUpdateErr);
        }
      }
    } catch (err) {
      console.warn('Failed to sync promotion to Google Sheets:', err);
    }
  }

  return fullRecord;
}

/**
 * Returns all promotion records for a specific employee, sorted newest first
 */
export function getEmployeePromotionHistory(
  employeeId: string,
  allPromotions: EmployeePromotionRecord[]
): EmployeePromotionRecord[] {
  if (!employeeId) return [];
  const cleanId = employeeId.trim().toUpperCase();
  return allPromotions
    .filter(p => p.employeeId.trim().toUpperCase() === cleanId)
    .sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());
}

/**
 * Returns an array of distinct years in which an employee was promoted, e.g. [2026, 2024]
 */
export function getEmployeePromotedYears(
  employeeId: string,
  allPromotions: EmployeePromotionRecord[]
): number[] {
  const history = getEmployeePromotionHistory(employeeId, allPromotions);
  const yearsSet = new Set<number>();
  history.forEach(p => {
    if (p.promotionYear) {
      yearsSet.add(p.promotionYear);
    }
  });
  return Array.from(yearsSet).sort((a, b) => b - a);
}

/**
 * Updates an existing promotion record
 */
export async function updateEmployeePromotion(
  updatedRecord: EmployeePromotionRecord,
  spreadsheetId?: string
): Promise<EmployeePromotionRecord> {
  const allPromotions = getLocalPromotions();
  const updatedList = allPromotions.map(p => p.id === updatedRecord.id ? updatedRecord : p);
  saveLocalPromotions(updatedList);

  if (spreadsheetId && spreadsheetId !== 'local-storage-db') {
    try {
      const row = [
        updatedRecord.id,
        updatedRecord.employeeId,
        updatedRecord.employeeName,
        updatedRecord.department,
        updatedRecord.promotionYear.toString(),
        updatedRecord.promotionDate,
        updatedRecord.previousDesignation,
        updatedRecord.newDesignation,
        updatedRecord.previousSalary || '',
        updatedRecord.newSalary || '',
        updatedRecord.promotionType,
        updatedRecord.approvedBy,
        updatedRecord.remarks || '',
        updatedRecord.createdAt
      ];
      await updateRowByPrimaryKey(spreadsheetId, 'EmployeePromotions', updatedRecord.id, row);
    } catch (err) {
      console.warn('Failed to update promotion in Google Sheets:', err);
    }
  }

  return updatedRecord;
}

/**
 * Deletes a promotion record by ID
 */
export async function deleteEmployeePromotion(
  promotionId: string,
  spreadsheetId?: string
): Promise<void> {
  const allPromotions = getLocalPromotions();
  const filtered = allPromotions.filter(p => p.id !== promotionId);
  saveLocalPromotions(filtered);

  if (spreadsheetId && spreadsheetId !== 'local-storage-db') {
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'EmployeePromotions', promotionId);
    } catch (err) {
      console.warn('Failed to delete promotion from Google Sheets:', err);
    }
  }
}

