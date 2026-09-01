import { getRange, appendRow, updateRowByPrimaryKey } from './sheets';
import { format } from 'date-fns';

export interface LeaveTypeMaster {
  id: string;
  name: string;
  defaultQuota: number; // e.g. 14 days annual, 10 days casual, 14 days sick
  isPaid: boolean;
  carryForwardAllowed: boolean;
  description: string;
  status: 'Active' | 'Inactive';
}

export const DEFAULT_LEAVE_TYPES: LeaveTypeMaster[] = [
  { id: 'LT-01', name: 'Annual Leave', defaultQuota: 14, isPaid: true, carryForwardAllowed: true, description: 'Statutory annual earned leave', status: 'Active' },
  { id: 'LT-02', name: 'Casual Leave', defaultQuota: 10, isPaid: true, carryForwardAllowed: false, description: 'Short notice personal/unforeseen emergency leave', status: 'Active' },
  { id: 'LT-03', name: 'Sick Leave', defaultQuota: 14, isPaid: true, carryForwardAllowed: false, description: 'Certified medical illness/health leave', status: 'Active' },
  { id: 'LT-04', name: 'Maternity Leave', defaultQuota: 112, isPaid: true, carryForwardAllowed: false, description: 'Statutory 16 weeks maternity leave benefit', status: 'Active' },
  { id: 'LT-05', name: 'Paternity Leave', defaultQuota: 5, isPaid: true, carryForwardAllowed: false, description: 'Paternity support leave for new fathers', status: 'Active' },
  { id: 'LT-06', name: 'Earned Leave', defaultQuota: 18, isPaid: true, carryForwardAllowed: true, description: 'Accrued service performance leave', status: 'Active' },
  { id: 'LT-07', name: 'Special Leave', defaultQuota: 3, isPaid: true, carryForwardAllowed: false, description: 'Company approved special event/bereavement leave', status: 'Active' },
  { id: 'LT-08', name: 'Unpaid Leave', defaultQuota: 0, isPaid: false, carryForwardAllowed: false, description: 'Authorized leave without pay / salary deduction', status: 'Active' }
];

export interface LeaveBalanceSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  openingBalance: number;
  leaveAdded: number;
  leaveUsed: number;
  leaveAdjustment: number;
  currentBalance: number;
  effectiveYear: string;
  lastUpdated: string;
}

export interface LeaveBalanceTransaction {
  txId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  transactionType: 'Opening Balance' | 'Quota Addition' | 'Adjustment' | 'Carry Forward' | 'Special Grant';
  days: number;
  leaveAddedDate: string;
  effectiveDate: string;
  reason: string;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

// Load Leave Types Master
export async function getLeaveTypesMaster(spreadsheetId: string): Promise<LeaveTypeMaster[]> {
  try {
    const raw = await getRange(spreadsheetId, 'LeaveTypesMaster!A2:F');
    if (raw && raw.length > 0) {
      return raw.map((r, idx) => ({
        id: r[0] || `LT-${idx + 1}`,
        name: r[1] || 'Annual Leave',
        defaultQuota: parseFloat(r[2]) || 0,
        isPaid: r[3] !== 'false' && r[3] !== 'No',
        carryForwardAllowed: r[4] === 'true' || r[4] === 'Yes',
        description: r[5] || '',
        status: (r[6] === 'Inactive' ? 'Inactive' : 'Active')
      }));
    }
  } catch (err) {
    console.warn('Using default leave types master fallback:', err);
  }
  return DEFAULT_LEAVE_TYPES;
}

// Load all historical transactions
export async function getLeaveBalanceTransactions(spreadsheetId: string): Promise<LeaveBalanceTransaction[]> {
  try {
    const raw = await getRange(spreadsheetId, 'LeaveBalanceTransactions!A2:L');
    if (raw && raw.length > 0) {
      return raw.map(r => ({
        txId: r[0] || '',
        employeeId: (r[1] || '').trim(),
        employeeName: r[2] || '',
        department: r[3] || '',
        leaveType: r[4] || 'Annual Leave',
        transactionType: (r[5] as any) || 'Quota Addition',
        days: parseFloat(r[6]) || 0,
        leaveAddedDate: r[7] || '',
        effectiveDate: r[8] || '',
        reason: r[9] || '',
        addedById: r[10] || '',
        addedByName: r[11] || '',
        createdAt: r[12] || ''
      })).filter(t => t.employeeId);
    }
  } catch (err) {
    console.warn('No LeaveBalanceTransactions sheet found yet, initializing empty:', err);
  }
  return [];
}

// Compute Employee-Wise Balances integrating Transactions and Approved/Settled Leaves
export function calculateEmployeeLeaveBalances(
  employeesInput: Array<{ id: string; name: string; department: string }> | string[][],
  leaves: string[][],
  transactions: LeaveBalanceTransaction[],
  leaveTypes: LeaveTypeMaster[] = DEFAULT_LEAVE_TYPES,
  targetYear: string = new Date().getFullYear().toString()
): LeaveBalanceSummary[] {
  const result: LeaveBalanceSummary[] = [];

  // Normalize employees
  const normalizedEmployees: Array<{ id: string; name: string; department: string }> = Array.isArray(employeesInput)
    ? employeesInput.map(e => {
        if (Array.isArray(e)) {
          return { id: e[0] || '', name: e[1] || '', department: e[3] || '' };
        }
        return e;
      }).filter(e => e && e.id)
    : [];

  // Group approved/settled leaves by EmployeeID + LeaveType
  const leaveUsageMap: Record<string, number> = {};
  leaves.forEach(l => {
    const empId = (l[1] || '').trim().toUpperCase();
    const status = (l[8] || '').trim();
    const settlementStatus = (l[12] || '').trim();
    const leaveType = (l[18] || 'Annual Leave').trim();
    const days = parseFloat(l[7]) || 0;
    const fromDate = l[5] || '';

    // Only count approved / settled / HR pending leaves in target year
    const isApprovedOrSettled = ['Approved', 'HR Pending', 'Settlement'].includes(status) || settlementStatus === 'Settlement';
    const isTargetYear = fromDate.startsWith(targetYear);

    if (isApprovedOrSettled && isTargetYear && empId) {
      const key = `${empId}__${leaveType.toUpperCase()}`;
      leaveUsageMap[key] = (leaveUsageMap[key] || 0) + days;
    }
  });

  // Calculate for each employee and each active leave type
  normalizedEmployees.forEach(emp => {
    if (!emp.id) return;
    const empUpper = emp.id.trim().toUpperCase();

    // Find all transactions for this employee
    const empTxs = transactions.filter(t => t.employeeId.toUpperCase() === empUpper);

    // Identify all unique leave types used by employee or default active types
    const relevantTypes = Array.from(new Set([
      ...leaveTypes.filter(lt => lt.status === 'Active').map(lt => lt.name),
      ...empTxs.map(t => t.leaveType)
    ]));

    relevantTypes.forEach(ltName => {
      const txsForType = empTxs.filter(t => t.leaveType.toLowerCase() === ltName.toLowerCase());

      let openingBalance = 0;
      let leaveAdded = 0;
      let leaveAdjustment = 0;

      if (txsForType.length > 0) {
        txsForType.forEach(t => {
          if (t.transactionType === 'Opening Balance') {
            openingBalance += t.days;
          } else if (t.transactionType === 'Adjustment') {
            leaveAdjustment += t.days;
          } else {
            leaveAdded += t.days;
          }
        });
      } else {
        // Fallback to default quota as opening balance if no custom transaction exists
        const masterType = leaveTypes.find(m => m.name.toLowerCase() === ltName.toLowerCase());
        openingBalance = masterType ? masterType.defaultQuota : 0;
      }

      const usageKey = `${empUpper}__${ltName.toUpperCase()}`;
      const leaveUsed = leaveUsageMap[usageKey] || 0;
      const currentBalance = Math.max(0, openingBalance + leaveAdded + leaveAdjustment - leaveUsed);

      result.push({
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        leaveType: ltName,
        openingBalance,
        leaveAdded,
        leaveUsed,
        leaveAdjustment,
        currentBalance,
        effectiveYear: targetYear,
        lastUpdated: txsForType[txsForType.length - 1]?.createdAt || format(new Date(), 'yyyy-MM-dd HH:mm')
      });
    });
  });

  return result;
}

// Record Single Leave Balance Entry / Adjustment
export async function addLeaveBalanceTransaction(
  spreadsheetId: string,
  tx: Omit<LeaveBalanceTransaction, 'txId' | 'createdAt'>
): Promise<{ success: boolean; txId: string }> {
  const txId = `LBTX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date().toISOString();

  const row = [
    txId,
    tx.employeeId,
    tx.employeeName,
    tx.department,
    tx.leaveType,
    tx.transactionType,
    tx.days.toString(),
    tx.leaveAddedDate,
    tx.effectiveDate,
    tx.reason,
    tx.addedById,
    tx.addedByName,
    createdAt
  ];

  await appendRow(spreadsheetId, 'LeaveBalanceTransactions!A:M', [row]);
  return { success: true, txId };
}

export const recordLeaveBalanceTransaction = addLeaveBalanceTransaction;

// Bulk Leave Balance Entry
export async function addBulkLeaveBalanceTransactions(
  spreadsheetId: string,
  employees: Array<{ id: string; name: string; department: string }>,
  details: {
    leaveType: string;
    transactionType: 'Opening Balance' | 'Quota Addition' | 'Adjustment' | 'Carry Forward' | 'Special Grant';
    days: number;
    leaveAddedDate: string;
    effectiveDate: string;
    reason: string;
    addedById: string;
    addedByName: string;
  },
  onProgress?: (percent: number, currentEmpName: string) => void
): Promise<{ successCount: number; failedCount: number; failures: Array<{ id: string; reason: string }> }> {
  let successCount = 0;
  let failedCount = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    try {
      if (onProgress) {
        onProgress(Math.round(((i + 1) / employees.length) * 100), emp.name);
      }

      await addLeaveBalanceTransaction(spreadsheetId, {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        leaveType: details.leaveType,
        transactionType: details.transactionType,
        days: details.days,
        leaveAddedDate: details.leaveAddedDate,
        effectiveDate: details.effectiveDate,
        reason: details.reason,
        addedById: details.addedById,
        addedByName: details.addedByName
      });
      successCount++;
    } catch (err: any) {
      failedCount++;
      failures.push({ id: emp.id, reason: err?.message || 'Database write error' });
    }
  }

  return { successCount, failedCount, failures };
}
