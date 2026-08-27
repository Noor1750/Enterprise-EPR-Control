import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { User } from 'firebase/auth';
import { getRange, updateRowByPrimaryKey, appendRow } from '../lib/sheets';
import { UserSecurityScope, filterAuthorizedEmployees } from '../lib/security';
import { 
  Loader2, CheckCircle2, AlertCircle, Clock, Search, 
  Download, RotateCw, CheckSquare, Shield, X, History,
  FileCheck2, Building2, UserCheck, Calendar, Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface HRPendingSettlementProps {
  spreadsheetId: string;
  user: User;
  userSecurityScope?: UserSecurityScope;
  initialTab?: 'pending' | 'history' | 'audit';
}

export default function HRPendingSettlement({ 
  spreadsheetId, 
  user, 
  userSecurityScope,
  initialTab = 'pending'
}: HRPendingSettlementProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'audit'>(initialTab);
  const [allLeaves, setAllLeaves] = useState<string[][]>([]);
  const [employees, setAllEmployees] = useState<string[][]>([]);
  const [auditLogs, setAuditLogs] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [settlementRemarks, setSettlementRemarks] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

  // Filters for HR Pending
  const [filterEmpId, setFilterEmpId] = useState('');
  const [filterEmpName, setFilterEmpName] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterLeaveType, setFilterLeaveType] = useState('All');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterAppId, setFilterAppId] = useState('');
  const [filterApprovedDate, setFilterApprovedDate] = useState('');

  // Filters for Settlement History
  const [histSearch, setHistSearch] = useState('');
  const [histDepartment, setHistDepartment] = useState('All');
  const [histLeaveType, setHistLeaveType] = useState('All');
  const [histSettledBy, setHistSettledBy] = useState('All');
  const [histDateRange, setHistDateRange] = useState({ from: '', to: '' });

  // Permissions Check
  const canSettle = useMemo(() => {
    if (!userSecurityScope) return true;
    if (userSecurityScope.isAdmin || userSecurityScope.isSuperuser) return true;
    const roleLower = (userSecurityScope.role || '').toLowerCase();
    if (roleLower === 'admin' || roleLower === 'superuser' || roleLower === 'manager' || roleLower === 'hr') return true;
    if (userSecurityScope.inputPermissions?.includes('leave') || userSecurityScope.inputPermissions?.includes('all')) return true;
    return false;
  }, [userSecurityScope]);

  const loadData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [lRaw, eRaw, aRaw] = await Promise.all([
        getRange(spreadsheetId, 'Leave!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Employees!A:Z').catch(() => []),
        getRange(spreadsheetId, 'SettlementAuditLog!A:Z').catch(() => [])
      ]);

      const loadedLeaves = lRaw.length > 1 ? lRaw.slice(1) : [];
      const loadedEmployees = eRaw.length > 1 ? eRaw.slice(1) : [];
      const loadedAudit = aRaw.length > 1 ? aRaw.slice(1) : [];

      setAllLeaves(loadedLeaves);
      setAllEmployees(loadedEmployees);
      setAuditLogs(loadedAudit);
    } catch (err) {
      console.error('Failed to load HR pending & settlement data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sheet = customEvent.detail?.sheetName || '';
      if (!sheet || ['Leave', 'Employees', 'SettlementAuditLog'].includes(sheet)) {
        loadData(false);
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, [spreadsheetId, userSecurityScope]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Security filtered employees
  const authorizedEmployees = useMemo(() => {
    return filterAuthorizedEmployees(employees, userSecurityScope);
  }, [employees, userSecurityScope]);

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e[3]) set.add(e[3]); });
    allLeaves.forEach(l => { if (l[4]) set.add(l[4]); });
    return Array.from(set).sort();
  }, [employees, allLeaves]);

  const leaveTypesList = useMemo(() => {
    const set = new Set<string>(['Annual Leave', 'Casual Leave', 'Sick Leave', 'Maternity Leave', 'Special Leave', 'Unauthorised Leave']);
    allLeaves.forEach(l => { if (l[18]) set.add(l[18]); });
    return Array.from(set);
  }, [allLeaves]);

  const renderLeaveTypeBadge = (leaveType: string) => {
    const type = (leaveType || 'Annual Leave').trim();
    const lower = type.toLowerCase();

    let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('casual')) {
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (lower.includes('sick')) {
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (lower.includes('maternity')) {
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (lower.includes('special')) {
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (lower.includes('unauthoris') || lower.includes('unauthoriz')) {
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle}`}>
        {type}
      </span>
    );
  };

  // 1. HR Pending Records
  // Rule: Fully Approved / HR Pending AND not yet settled
  const rawHRPendingLeaves = useMemo(() => {
    return allLeaves.filter(l => {
      const rawStatus = (l[8] || '').trim();
      const settlementStatus = (l[12] || '').trim();
      
      // Must NOT be settled
      if (rawStatus.toLowerCase() === 'settlement' || settlementStatus.toLowerCase() === 'settlement') {
        return false;
      }
      // Must NOT be rejected or pending supervisor
      if (rawStatus.toLowerCase() === 'rejected' || rawStatus.toLowerCase() === 'cancelled') {
        return false;
      }
      if (rawStatus.toLowerCase() === 'pending') {
        return false;
      }

      // Valid if explicitly 'HR Pending' or 'Approved'
      return rawStatus.toLowerCase() === 'hr pending' || rawStatus.toLowerCase() === 'approved' || settlementStatus.toLowerCase() === 'hr pending';
    });
  }, [allLeaves]);

  // Filtered HR Pending list
  const filteredHRPendingLeaves = useMemo(() => {
    return rawHRPendingLeaves.filter(l => {
      const appId = (l[0] || '').toLowerCase();
      const empId = (l[1] || '').toLowerCase();
      const empName = (l[2] || '').toLowerCase();
      const dept = (l[4] || '').toLowerCase();
      const fromDate = l[5] || '';
      const toDate = l[6] || '';
      const approvedDate = l[11] || '';
      const leaveType = (l[18] || l[10] || 'Annual Leave').toLowerCase();

      if (filterAppId && !appId.includes(filterAppId.toLowerCase())) return false;
      if (filterEmpId && !empId.includes(filterEmpId.toLowerCase())) return false;
      if (filterEmpName && !empName.includes(filterEmpName.toLowerCase())) return false;
      if (filterDepartment !== 'All' && dept !== filterDepartment.toLowerCase()) return false;
      if (filterLeaveType !== 'All' && !leaveType.includes(filterLeaveType.toLowerCase())) return false;
      if (filterApprovedDate && approvedDate !== filterApprovedDate) return false;
      if (filterFromDate && fromDate < filterFromDate) return false;
      if (filterToDate && toDate > filterToDate) return false;

      return true;
    });
  }, [rawHRPendingLeaves, filterAppId, filterEmpId, filterEmpName, filterDepartment, filterLeaveType, filterApprovedDate, filterFromDate, filterToDate]);

  // 2. Settlement History Records
  const settlementHistoryLeaves = useMemo(() => {
    return allLeaves.filter(l => {
      const rawStatus = (l[8] || '').trim().toLowerCase();
      const settlementStatus = (l[12] || '').trim().toLowerCase();
      return rawStatus === 'settlement' || settlementStatus === 'settlement';
    });
  }, [allLeaves]);

  const filteredHistoryLeaves = useMemo(() => {
    return settlementHistoryLeaves.filter(l => {
      const term = histSearch.toLowerCase();
      const matchSearch = !term || 
        (l[0] || '').toLowerCase().includes(term) ||
        (l[1] || '').toLowerCase().includes(term) ||
        (l[2] || '').toLowerCase().includes(term) ||
        (l[15] || '').toLowerCase().includes(term);

      if (!matchSearch) return false;
      if (histDepartment !== 'All' && (l[4] || '') !== histDepartment) return false;
      if (histLeaveType !== 'All' && !(l[18] || '').includes(histLeaveType)) return false;
      if (histSettledBy !== 'All' && (l[15] || '') !== histSettledBy) return false;
      if (histDateRange.from && (l[13] || '').slice(0, 10) < histDateRange.from) return false;
      if (histDateRange.to && (l[13] || '').slice(0, 10) > histDateRange.to) return false;

      return true;
    });
  }, [settlementHistoryLeaves, histSearch, histDepartment, histLeaveType, histSettledBy, histDateRange]);

  // Settled users list for history filter
  const settledByUsers = useMemo(() => {
    const set = new Set<string>();
    settlementHistoryLeaves.forEach(l => { if (l[15]) set.add(l[15]); });
    return Array.from(set);
  }, [settlementHistoryLeaves]);

  // Clear filters
  const handleClearPendingFilters = () => {
    setFilterEmpId('');
    setFilterEmpName('');
    setFilterDepartment('All');
    setFilterLeaveType('All');
    setFilterFromDate('');
    setFilterToDate('');
    setFilterAppId('');
    setFilterApprovedDate('');
  };

  // Select All handling (only selects currently displayed/filtered records)
  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allDisplayedIds = filteredHRPendingLeaves.map(l => l[0]);
      setSelectedIds(allDisplayedIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Confirmation Popup
  const handleOpenSettlementModal = () => {
    if (selectedIds.length === 0) return;
    setSettlementRemarks('');
    setIsConfirmModalOpen(true);
  };

  // Settle Selected Execution with Concurrency Verification
  const handleConfirmSettlement = async () => {
    if (selectedIds.length === 0) return;
    setIsSettling(true);

    try {
      // 1. Re-check latest database state to prevent duplicate settlement
      const freshLeavesRaw = await getRange(spreadsheetId, 'Leave!A:Z');
      const freshLeaves = freshLeavesRaw.length > 1 ? freshLeavesRaw.slice(1) : [];

      const settledByName = userSecurityScope?.employeeName || user.displayName || user.email || 'Admin';
      const settledById = userSecurityScope?.employeeId || 'ADMIN-001';
      const userRole = userSecurityScope?.role || 'Admin';
      
      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd');
      const timeStr = format(now, 'HH:mm');
      const fullDateTime = `${dateStr} ${timeStr}`;

      const validToSettle: string[][] = [];
      const skippedIds: string[] = [];

      for (const id of selectedIds) {
        const liveRow = freshLeaves.find(l => l[0] === id);
        if (!liveRow) {
          skippedIds.push(id);
          continue;
        }

        const currentStatus = (liveRow[8] || '').trim().toLowerCase();
        const currentSettlement = (liveRow[12] || '').trim().toLowerCase();

        // Check if already settled by another user
        if (currentStatus === 'settlement' || currentSettlement === 'settlement') {
          skippedIds.push(id);
        } else {
          validToSettle.push(liveRow);
        }
      }

      if (validToSettle.length === 0) {
        setIsConfirmModalOpen(false);
        setToastMessage({
          type: 'warning',
          text: 'All selected records were already settled by another user or are no longer valid.'
        });
        setSelectedIds([]);
        loadData(false);
        return;
      }

      // 2. Perform updates
      for (const row of validToSettle) {
        const updated = [...row];
        while (updated.length < 19) updated.push('');
        
        updated[8] = 'Settlement'; // Status
        updated[12] = 'Settlement'; // Settlement_Status
        updated[13] = fullDateTime; // Settlement_Date_Time
        updated[14] = settledById; // Settled_By_ID
        updated[15] = settledByName; // Settled_By_Name
        updated[16] = settlementRemarks || 'Settled via HR Pending module'; // Remarks

        await updateRowByPrimaryKey(spreadsheetId, 'Leave', row[0], updated);
      }

      // 3. Record in Audit Log
      const logId = `LOG-${Date.now()}`;
      const settledIdsStr = validToSettle.map(r => r[0]).join(', ');
      const auditDetails = `${userRole} ${settledByName} settled ${validToSettle.length} leave application(s) on ${format(now, 'dd-MMM-yyyy')} at ${timeStr}.${skippedIds.length > 0 ? ` (${skippedIds.length} skipped)` : ''}`;
      
      const auditRow = [
        logId,
        now.toISOString(),
        dateStr,
        timeStr,
        settledById,
        settledByName,
        userRole,
        selectedIds.length.toString(),
        validToSettle.length.toString(),
        skippedIds.length.toString(),
        settledIdsStr,
        auditDetails
      ];

      await appendRow(spreadsheetId, 'SettlementAuditLog!A:L', [auditRow]).catch(err => {
        console.warn('Audit log write error:', err);
      });

      // 4. Optimistic state cleanup & Notification
      setSelectedIds([]);
      setIsConfirmModalOpen(false);
      
      let message = `${validToSettle.length} leave record${validToSettle.length === 1 ? '' : 's'} successfully updated as Settlement.`;
      if (skippedIds.length > 0) {
        message += ` (${skippedIds.length} already settled and skipped)`;
      }

      setToastMessage({
        type: 'success',
        text: message
      });

      loadData(false);
    } catch (err: any) {
      console.error('Settlement error:', err);
      setToastMessage({
        type: 'error',
        text: `Settlement failed: ${err.message || 'Unknown database error'}`
      });
    } finally {
      setIsSettling(false);
    }
  };

  // Export HR Pending Report
  const handleExportHRPending = () => {
    if (filteredHRPendingLeaves.length === 0) {
      alert('No HR Pending records available for export.');
      return;
    }

    const headers = [
      'Leave Application ID',
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      'Leave Type',
      'Leave From',
      'Leave To',
      'Total Days',
      'Application Date',
      'Final Approval Date',
      'Approved By',
      'Current Status'
    ];

    const rows = filteredHRPendingLeaves.map(l => [
      l[0], // ID
      l[1], // Emp ID
      l[2], // Name
      l[4] || '', // Dept
      l[3] || '', // Desig
      l[18] || 'Annual Leave', // Type
      l[5], // From
      l[6], // To
      l[7], // Days
      l[17] || l[5], // App Date
      l[11] || '', // Approved Date
      l[9] || '', // Approved By
      'HR Pending' // Status
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HR_Pending_Leave_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Settlement History Report
  const handleExportHistory = () => {
    if (filteredHistoryLeaves.length === 0) {
      alert('No settlement history records available for export.');
      return;
    }

    const headers = [
      'Application ID',
      'Employee ID',
      'Employee Name',
      'Department',
      'Leave Type',
      'From Date',
      'To Date',
      'Days',
      'Approved Date',
      'Settlement Date',
      'Settled By',
      'Status',
      'Remarks'
    ];

    const rows = filteredHistoryLeaves.map(l => [
      l[0],
      l[1],
      l[2],
      l[4] || '',
      l[18] || 'Annual Leave',
      l[5],
      l[6],
      l[7],
      l[11] || '',
      l[13] || '',
      l[15] || '',
      'Settlement',
      l[16] || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Settlement_History_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for summary pills
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const settledTodayCount = useMemo(() => {
    return settlementHistoryLeaves.filter(l => (l[13] || '').startsWith(todayStr)).length;
  }, [settlementHistoryLeaves, todayStr]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1ABB9C]" />
        <p className="text-sm font-medium text-gray-500">Loading HR Pending & Settlement data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          toastMessage.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center space-x-3">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> :
             toastMessage.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" /> :
             <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            <span className="text-sm font-semibold">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Summary Bar */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-[#1ABB9C]" />
              <h1 className="text-xl font-bold text-gray-900">Leave HR Pending & Settlement Management</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Manage approved leave applications awaiting final settlement, process batch settlements, and audit historical records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-[#1ABB9C] hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3.5">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total HR Pending</div>
            <div className="text-2xl font-black text-blue-900 mt-1">{rawHRPendingLeaves.length}</div>
          </div>
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-3.5">
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Selected for Settle</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{selectedIds.length}</div>
          </div>
          <div className="bg-purple-50/80 border border-purple-100 rounded-lg p-3.5">
            <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Settled Today</div>
            <div className="text-2xl font-black text-purple-900 mt-1">{settledTodayCount}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Settled</div>
            <div className="text-2xl font-black text-gray-800 mt-1">{settlementHistoryLeaves.length}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mt-6 -mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-[#1ABB9C] text-[#1ABB9C]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            HR Pending Leave ({rawHRPendingLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#1ABB9C] text-[#1ABB9C]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            Settlement History ({settlementHistoryLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#1ABB9C] text-[#1ABB9C]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: HR PENDING LEAVE */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                <Filter className="w-4 h-4 text-gray-500" />
                Filter Pending Applications
              </div>
              <button
                onClick={handleClearPendingFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">App ID</label>
                <input
                  type="text"
                  placeholder="e.g. LV-1001"
                  value={filterAppId}
                  onChange={e => setFilterAppId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Employee ID</label>
                <input
                  type="text"
                  placeholder="e.g. EMP001"
                  value={filterEmpId}
                  onChange={e => setFilterEmpId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Employee Name</label>
                <input
                  type="text"
                  placeholder="Search name..."
                  value={filterEmpName}
                  onChange={e => setFilterEmpName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Department</label>
                <select
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                >
                  <option value="All">All Departments</option>
                  {departmentsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Leave Type</label>
                <select
                  value={filterLeaveType}
                  onChange={e => setFilterLeaveType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                >
                  <option value="All">All Types</option>
                  {leaveTypesList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={filterFromDate}
                  onChange={e => setFilterFromDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={filterToDate}
                  onChange={e => setFilterToDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Approved Date</label>
                <input
                  type="date"
                  value={filterApprovedDate}
                  onChange={e => setFilterApprovedDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">
                Displaying: <strong className="text-gray-900">{filteredHRPendingLeaves.length}</strong> record(s)
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Selected: {selectedIds.length}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleExportHRPending}
                disabled={filteredHRPendingLeaves.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-gray-600" />
                Export HR Pending
              </button>

              <button
                onClick={handleOpenSettlementModal}
                disabled={selectedIds.length === 0 || !canSettle}
                title={!canSettle ? 'You do not have authorization to process settlement' : ''}
                className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-[#1ABB9C] hover:bg-[#16A085] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Settle Selected ({selectedIds.length})
              </button>
            </div>
          </div>

          {/* HR Pending Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left w-10">
                      <input
                        type="checkbox"
                        checked={filteredHRPendingLeaves.length > 0 && selectedIds.length === filteredHRPendingLeaves.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-[#1ABB9C] focus:ring-[#1ABB9C] h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Application ID</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Designation</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Leave Type</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Period (From - To)</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Days</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">App Date</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Approved By & Date</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredHRPendingLeaves.map((l, idx) => {
                    const isSelected = selectedIds.includes(l[0]);
                    return (
                      <tr 
                        key={`${l[0] || 'pending'}-${idx}`} 
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50/60' : 'hover:bg-gray-50/80'
                        }`}
                        onClick={() => handleToggleSelect(l[0])}
                      >
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(l[0])}
                            className="rounded border-gray-300 text-[#1ABB9C] focus:ring-[#1ABB9C] h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-gray-900">{l[0]}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900">{l[2]}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{l[1]}</div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-gray-700">{l[4] || '-'}</td>
                        <td className="px-4 py-3.5 text-gray-600">{l[3] || '-'}</td>
                        <td className="px-4 py-3.5">
                          {renderLeaveTypeBadge(l[18] || 'Annual Leave')}
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">
                          {l[5]} <span className="text-gray-400">to</span> {l[6]}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                            {l[7]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500">{l[17] || l[5] || '-'}</td>
                        <td className="px-4 py-3.5 text-gray-700">
                          <div className="font-medium">{l[9] || 'Supervisor'}</div>
                          <div className="text-[10px] text-gray-400">{l[11] || '-'}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full font-bold text-[11px]">
                            <Clock className="w-3 h-3 text-blue-600" />
                            HR Pending
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredHRPendingLeaves.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                        <p className="font-bold text-gray-800 text-sm">No Pending Leave for Settlement</p>
                        <p className="text-xs text-gray-400 mt-1">
                          All approved leave applications have been settled or none match your filter criteria.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SETTLEMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Search Keywords</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search by ID, Employee, Settled By..."
                    value={histSearch}
                    onChange={e => setHistSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Department</label>
                <select
                  value={histDepartment}
                  onChange={e => setHistDepartment(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                >
                  <option value="All">All Departments</option>
                  {departmentsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Settled By</label>
                <select
                  value={histSettledBy}
                  onChange={e => setHistSettledBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                >
                  <option value="All">All Settlers</option>
                  {settledByUsers.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleExportHistory}
                  disabled={filteredHistoryLeaves.length === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-gray-600" />
                  Export History
                </button>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Application ID</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Leave Type</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Days</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Period</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Approved Date</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Settlement Date</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Settled By</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Remarks</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredHistoryLeaves.map((l, idx) => (
                    <tr key={`${l[0] || 'history'}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-900">{l[0]}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{l[2]}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{l[1]}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{l[4] || '-'}</td>
                      <td className="px-4 py-3.5">{renderLeaveTypeBadge(l[18] || 'Annual Leave')}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                          {l[7]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        {l[5]} to {l[6]}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{l[11] || '-'}</td>
                      <td className="px-4 py-3.5 font-medium text-purple-900">{l[13] || '-'}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-800">{l[15] || '-'}</td>
                      <td className="px-4 py-3.5 text-gray-500 max-w-[150px] truncate" title={l[16] || ''}>{l[16] || '-'}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-purple-600" />
                          Settlement
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredHistoryLeaves.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                        <History className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="font-bold text-gray-800 text-sm">No Settlement History Found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Settlement Transaction Audit Trail
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Every settlement action is permanently recorded for regulatory compliance and audit tracking.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Log ID</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Date & Time</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">User & Role</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Settled</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Skipped</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Record IDs</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {auditLogs.map(log => (
                    <tr key={log[0]} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-800">{log[0]}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-700">
                        {log[2]} <span className="text-gray-400 font-mono">{log[3]}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{log[5]}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">{log[6]}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-700 bg-emerald-50/40">
                        {log[8] || '1'}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-700">
                        {log[9] || '0'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-600 max-w-[200px] truncate" title={log[10] || ''}>
                        {log[10] || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{log[11] || '-'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No settlement audit logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#1ABB9C] flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 text-center">Confirm Settlement</h2>
              <p className="text-sm text-gray-600 text-center mt-2">
                Are you sure you want to update the selected leave records as <strong className="text-purple-700 font-bold">Settlement</strong>?
              </p>
              
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 my-4 text-center">
                <span className="text-2xl font-black text-emerald-800">{selectedIds.length}</span>
                <span className="text-xs font-semibold text-emerald-700 block mt-0.5">leave record(s) selected for settlement</span>
              </div>

              <div className="space-y-1.5 text-left mb-4">
                <label className="block text-xs font-bold text-gray-700">Settlement Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Approved and processed in payroll"
                  value={settlementRemarks}
                  onChange={e => setSettlementRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={isSettling}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSettling}
                  onClick={handleConfirmSettlement}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#1ABB9C] hover:bg-[#16A085] rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Yes, Update as Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
