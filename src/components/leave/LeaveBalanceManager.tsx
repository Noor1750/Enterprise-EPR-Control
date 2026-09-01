import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Plus, Search, Filter, RefreshCw, Download, 
  Calendar, CheckCircle2, AlertCircle, TrendingUp, User, 
  Layers, ArrowUpRight, ArrowDownRight, Clock, Shield, Sparkles, X, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  LeaveBalanceSummary, 
  LeaveBalanceTransaction, 
  LeaveTypeMaster, 
  DEFAULT_LEAVE_TYPES,
  getLeaveBalanceTransactions,
  calculateEmployeeLeaveBalances,
  recordLeaveBalanceTransaction
} from '../../lib/leaveBalanceEngine';
import { UserSecurityScope } from '../../lib/security';
import { withGlobalLoading } from '../../lib/loadingEngine';

interface LeaveBalanceManagerProps {
  spreadsheetId: string;
  employees: string[][]; // Raw employee rows
  leaves: string[][]; // Raw leave rows
  userSecurityScope?: UserSecurityScope;
  onRefreshLeaves?: () => void;
}

export default function LeaveBalanceManager({
  spreadsheetId,
  employees,
  leaves,
  userSecurityScope,
  onRefreshLeaves
}: LeaveBalanceManagerProps) {
  const [transactions, setTransactions] = useState<LeaveBalanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedLeaveType, setSelectedLeaveType] = useState('All');
  const [viewMode, setViewMode] = useState<'balances' | 'transactions'>('balances');

  // Modal State for Add / Adjust
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'single' | 'department'>('single');
  const [formData, setFormData] = useState<{
    employeeId: string;
    department: string;
    leaveType: string;
    transactionType: 'Opening Balance' | 'Quota Addition' | 'Adjustment' | 'Carry Forward' | 'Special Grant';
    days: number;
    effectiveDate: string;
    reason: string;
  }>({
    employeeId: '',
    department: '',
    leaveType: 'Annual Leave',
    transactionType: 'Quota Addition',
    days: 14,
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    reason: 'Annual Quota Allocation'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      const dept = e[3]?.trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Load Transactions from Google Sheets
  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const txs = await getLeaveBalanceTransactions(spreadsheetId);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load leave transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (spreadsheetId) {
      loadTransactions();
    }
  }, [spreadsheetId]);

  // Compute live balances
  const balanceSummaries = useMemo(() => {
    return calculateEmployeeLeaveBalances(employees, leaves, transactions);
  }, [employees, leaves, transactions]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return balanceSummaries.filter(b => {
      const matchSearch = !searchQuery || 
        b.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchDept = selectedDept === 'All' || b.department === selectedDept;
      const matchType = selectedLeaveType === 'All' || b.leaveType === selectedLeaveType;

      return matchSearch && matchDept && matchType;
    });
  }, [balanceSummaries, searchQuery, selectedDept, selectedLeaveType]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = !searchQuery || 
        t.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reason.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchDept = selectedDept === 'All' || t.department === selectedDept;
      const matchType = selectedLeaveType === 'All' || t.leaveType === selectedLeaveType;

      return matchSearch && matchDept && matchType;
    });
  }, [transactions, searchQuery, selectedDept, selectedLeaveType]);

  // High-Level KPIs
  const stats = useMemo(() => {
    const totalAllocated = balanceSummaries.reduce((acc, b) => acc + b.openingBalance + b.leaveAdded + b.leaveAdjustment, 0);
    const totalUsed = balanceSummaries.reduce((acc, b) => acc + b.leaveUsed, 0);
    const totalAvailable = balanceSummaries.reduce((acc, b) => acc + b.currentBalance, 0);
    const utilizationRate = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

    return { totalAllocated, totalUsed, totalAvailable, utilizationRate };
  }, [balanceSummaries]);

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.days || formData.days === 0) {
      setToast({ type: 'error', message: 'Days must be a non-zero number.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await withGlobalLoading(
        async () => {
          const currentUserName = userSecurityScope?.employeeName || 'System Admin';
          const currentUserId = userSecurityScope?.employeeId || 'ADMIN';

          if (modalMode === 'single') {
            const emp = employees.find(e => e[0]?.trim().toUpperCase() === formData.employeeId.trim().toUpperCase());
            if (!emp) throw new Error('Employee not found');

            await recordLeaveBalanceTransaction(spreadsheetId, {
              employeeId: emp[0].trim(),
              employeeName: emp[1]?.trim() || '',
              department: emp[3]?.trim() || '',
              leaveType: formData.leaveType,
              transactionType: formData.transactionType,
              days: Number(formData.days),
              leaveAddedDate: format(new Date(), 'yyyy-MM-dd'),
              effectiveDate: formData.effectiveDate,
              reason: formData.reason,
              addedById: currentUserId,
              addedByName: currentUserName
            });
          } else {
            // Apply to all employees in selected department
            const targetEmployees = formData.department === 'All' 
              ? employees 
              : employees.filter(e => e[3]?.trim() === formData.department);

            if (targetEmployees.length === 0) throw new Error('No employees in selected department');

            for (const emp of targetEmployees) {
              await recordLeaveBalanceTransaction(spreadsheetId, {
                employeeId: emp[0].trim(),
                employeeName: emp[1]?.trim() || '',
                department: emp[3]?.trim() || '',
                leaveType: formData.leaveType,
                transactionType: formData.transactionType,
                days: Number(formData.days),
                leaveAddedDate: format(new Date(), 'yyyy-MM-dd'),
                effectiveDate: formData.effectiveDate,
                reason: `${formData.reason} (Batch: ${formData.department})`,
                addedById: currentUserId,
                addedByName: currentUserName
              });
            }
          }
        },
        'Saving Leave Balance Adjustment',
        'Syncing entitlement records with Google Sheets cloud storage...'
      );

      setToast({ type: 'success', message: 'Leave balance adjustment successfully saved!' });
      setIsModalOpen(false);
      loadTransactions();
      if (onRefreshLeaves) onRefreshLeaves();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to save transaction.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Leave Type', 'Opening Balance', 'Added Quota', 'Used', 'Adjustment', 'Available Balance'];
    const rows = filteredSummaries.map(b => [
      `"${b.employeeId}"`,
      `"${b.employeeName}"`,
      `"${b.department}"`,
      `"${b.leaveType}"`,
      b.openingBalance,
      b.leaveAdded,
      b.leaveUsed,
      b.leaveAdjustment,
      b.currentBalance
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leave_Balances_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
          'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Entitlements</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalAllocated.toFixed(1)} <span className="text-xs font-semibold text-slate-400">days</span></div>
          <div className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Statutory & added leave pools
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leaves Consumed</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalUsed.toFixed(1)} <span className="text-xs font-semibold text-slate-400">days</span></div>
          <div className="text-xs text-amber-600 font-semibold mt-1">
            Approved & settled time-off
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Balance</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{stats.totalAvailable.toFixed(1)} <span className="text-xs font-semibold text-slate-400">days</span></div>
          <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready for employee application
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilization Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.utilizationRate}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${Math.min(stats.utilizationRate, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('balances')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'balances' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Employee Balances ({balanceSummaries.length})
          </button>
          <button
            onClick={() => setViewMode('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'transactions' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Transaction History ({transactions.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-48 sm:w-56"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none cursor-pointer"
          >
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={selectedLeaveType}
            onChange={(e) => setSelectedLeaveType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none cursor-pointer"
          >
            <option value="All">All Leave Types</option>
            {DEFAULT_LEAVE_TYPES.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {(userSecurityScope?.isAdmin || userSecurityScope?.isSuperuser || userSecurityScope?.role === 'Manager') && (
            <button
              onClick={() => {
                setFormData({
                  employeeId: employees[0]?.[0] || '',
                  department: 'All',
                  leaveType: 'Annual Leave',
                  transactionType: 'Quota Addition',
                  days: 14,
                  effectiveDate: format(new Date(), 'yyyy-MM-dd'),
                  reason: 'Annual Quota Allocation'
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add / Adjust Balance</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table View */}
      {viewMode === 'balances' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-3">Department</th>
                  <th className="py-3.5 px-3">Leave Type</th>
                  <th className="py-3.5 px-3 text-right">Opening</th>
                  <th className="py-3.5 px-3 text-right text-indigo-600">Added Quota</th>
                  <th className="py-3.5 px-3 text-right text-amber-600">Used (Days)</th>
                  <th className="py-3.5 px-3 text-right">Adjustment</th>
                  <th className="py-3.5 px-4 text-right text-emerald-600 font-black">Available Balance</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                      No leave balance records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((item, idx) => (
                    <tr key={`${item.employeeId}-${item.leaveType}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{item.employeeName}</div>
                        <div className="font-mono text-[11px] text-slate-400 font-semibold">{item.employeeId}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        {item.department || 'General'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          {item.leaveType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-500">
                        {item.openingBalance}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-indigo-600">
                        +{item.leaveAdded}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-600">
                        {item.leaveUsed > 0 ? `-${item.leaveUsed}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {item.leaveAdjustment > 0 ? `+${item.leaveAdjustment}` : item.leaveAdjustment}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                          item.currentBalance > 3 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.currentBalance > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.currentBalance.toFixed(1)} days
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setModalMode('single');
                            setFormData({
                              employeeId: item.employeeId,
                              department: item.department,
                              leaveType: item.leaveType,
                              transactionType: 'Adjustment',
                              days: 0,
                              effectiveDate: format(new Date(), 'yyyy-MM-dd'),
                              reason: `Adjustment for ${item.employeeName}`
                            });
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tx ID</th>
                  <th className="py-3.5 px-3">Employee</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Transaction</th>
                  <th className="py-3.5 px-3 text-right">Days</th>
                  <th className="py-3.5 px-3">Effective Date</th>
                  <th className="py-3.5 px-3">Reason / Remarks</th>
                  <th className="py-3.5 px-4 text-right">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                      No balance adjustment transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.txId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 font-semibold">
                        {tx.txId}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{tx.employeeName}</div>
                        <div className="font-mono text-[11px] text-slate-400">{tx.employeeId}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {tx.leaveType}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {tx.days > 0 ? `+${tx.days}` : tx.days}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {tx.effectiveDate || tx.leaveAddedDate}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={tx.reason}>
                        {tx.reason || '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-medium">
                        <div>{tx.addedByName}</div>
                        <div className="text-[10px] text-slate-400">{tx.createdAt ? format(new Date(tx.createdAt), 'dd-MMM HH:mm') : ''}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add or Adjust Balance */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Leave Balance Entry & Adjustment</h3>
                  <p className="text-xs text-slate-400">Add annual quotas, carry forwards or manual corrections</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              {/* Target Selector */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalMode('single')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                    modalMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Single Employee
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('department')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                    modalMode === 'department' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Department / Batch
                </button>
              </div>

              {modalMode === 'single' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Employee</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white outline-none"
                  >
                    {employees.map(emp => (
                      <option key={emp[0]} value={emp[0]}>
                        {emp[0]} - {emp[1]} ({emp[3] || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white outline-none"
                  >
                    <option value="All">All Departments ({employees.length} Employees)</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Leave Type</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white outline-none"
                  >
                    {DEFAULT_LEAVE_TYPES.map(t => (
                      <option key={t.id} value={t.name}>{t.name} (Std: {t.defaultQuota}d)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Nature</label>
                  <select
                    value={formData.transactionType}
                    onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white outline-none"
                  >
                    <option value="Quota Addition">Quota Addition</option>
                    <option value="Opening Balance">Opening Balance</option>
                    <option value="Adjustment">Adjustment (Add/Deduct)</option>
                    <option value="Carry Forward">Carry Forward</option>
                    <option value="Special Grant">Special Grant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Days Count (Use negative for deduction)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.days}
                    onChange={(e) => setFormData(prev => ({ ...prev, days: parseFloat(e.target.value) || 0 }))}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Authorization Notes</label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Annual policy quota, management approved bonus leave, or correction"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Post Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
