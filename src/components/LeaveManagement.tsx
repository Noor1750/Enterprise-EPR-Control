import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { User } from 'firebase/auth';
import { getRange, appendRow, updateRowByPrimaryKey } from '../lib/sheets';
import { 
  Loader2, Check, X, Download, Search, Shield, Clock, 
  Calendar, CheckSquare, History, FileCheck2, Filter, 
  RotateCw, CheckCircle2, AlertCircle, PlusCircle, UserCheck,
  Edit2, Trash2, AlertTriangle, Info, CalendarDays, Ban, CreditCard
} from 'lucide-react';
import LeaveBalanceManager from './leave/LeaveBalanceManager';
import { parseISO, eachDayOfInterval, isFriday, format, isValid } from 'date-fns';
import { UserSecurityScope, filterAuthorizedEmployees, getAuthorizedEmployeeIdSet } from '../lib/security';
import { 
  validateLeaveOverlap, 
  OverlapConflictResult, 
  LeaveRecord, 
  parseLeaveRow,
  isBlockingLeaveStatus,
  normalizeDateStr
} from '../lib/leaveValidation';
import AdminDeleteConfirmModal from './common/AdminDeleteConfirmModal';
import { resolvePaletteForModule } from '../lib/colorPalettes';

interface LeaveManagementProps {
  spreadsheetId: string;
  user: User;
  view?: 'apply' | 'approve' | 'both';
  userSecurityScope?: UserSecurityScope;
}

type TabType = 'apply' | 'approval' | 'hrPending' | 'history' | 'audit' | 'balances';

export default function LeaveManagement({ 
  spreadsheetId, 
  user, 
  userSecurityScope 
}: LeaveManagementProps) {
  // Determine smart default tab based on user role and permissions
  const getInitialTab = (): TabType => {
    if (userSecurityScope?.isAdmin || userSecurityScope?.isSuperuser) return 'hrPending';
    if (userSecurityScope?.isSupervisor) return 'approval';
    return 'apply';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [leaves, setLeaves] = useState<string[][]>([]);
  const [allEmployees, setAllEmployees] = useState<string[][]>([]);
  const [holidays, setHolidays] = useState<string[][]>([]);
  const [auditLogs, setAuditLogs] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

  // --- TAB 1: APPLY FOR LEAVE STATE ---
  const [form, setForm] = useState({ 
    id: '', 
    from: '', 
    to: '', 
    reason: '', 
    leaveType: 'Annual Leave' 
  });
  const [applySearch, setApplySearch] = useState('');
  const [applyStatusFilter, setApplyStatusFilter] = useState<'All' | 'Pending' | 'HR Pending' | 'Settlement' | 'Rejected' | 'Cancelled'>('All');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Edit Pending Leave Modal state
  const [editingLeave, setEditingLeave] = useState<string[] | null>(null);
  const [editForm, setEditForm] = useState({
    leaveId: '',
    id: '',
    from: '',
    to: '',
    reason: '',
    leaveType: 'Annual Leave'
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [cancellingLeave, setCancellingLeave] = useState<string[] | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // --- TAB 2: SUPERVISOR APPROVAL STATE ---
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<string[]>([]);
  const [isApprovingBulk, setIsApprovingBulk] = useState(false);
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalDeptFilter, setApprovalDeptFilter] = useState('All');

  // --- TAB 3: HR PENDING & SETTLEMENT STATE ---
  const [selectedHRPendingIds, setSelectedHRPendingIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [settlementRemarks, setSettlementRemarks] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  // Filters for HR Pending
  const [hrFilterAppId, setHrFilterAppId] = useState('');
  const [hrFilterEmpId, setHrFilterEmpId] = useState('');
  const [hrFilterEmpName, setHrFilterEmpName] = useState('');
  const [hrFilterDept, setHrFilterDept] = useState('All');
  const [hrFilterLeaveType, setHrFilterLeaveType] = useState('All');
  const [hrFilterFromDate, setHrFilterFromDate] = useState('');
  const [hrFilterToDate, setHrFilterToDate] = useState('');
  const [hrFilterApprovedDate, setHrFilterApprovedDate] = useState('');

  // --- TAB 4: SETTLEMENT HISTORY STATE ---
  const [histSearch, setHistSearch] = useState('');
  const [histDepartment, setHistDepartment] = useState('All');
  const [histLeaveType, setHistLeaveType] = useState('All');
  const [histSettledBy, setHistSettledBy] = useState('All');
  const [histDateRange, setHistDateRange] = useState({ from: '', to: '' });

  // Security filtered employees for assignment & viewing
  const employees = useMemo(() => {
    return filterAuthorizedEmployees(allEmployees, userSecurityScope);
  }, [allEmployees, userSecurityScope]);

  const authorizedIdSet = useMemo(() => {
    return getAuthorizedEmployeeIdSet(allEmployees, userSecurityScope);
  }, [allEmployees, userSecurityScope]);

  const isRestrictedScope = useMemo(() => {
    return Boolean(userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all');
  }, [userSecurityScope]);

  // Permissions Check for Settlement
  const canSettle = useMemo(() => {
    if (!userSecurityScope) return true;
    if (userSecurityScope.isAdmin || userSecurityScope.isSuperuser) return true;
    const roleLower = (userSecurityScope.role || '').toLowerCase();
    if (roleLower === 'admin' || roleLower === 'superuser' || roleLower === 'manager' || roleLower === 'hr') return true;
    if (userSecurityScope.inputPermissions?.includes('leave') || userSecurityScope.inputPermissions?.includes('all')) return true;
    return false;
  }, [userSecurityScope]);

  const canApprove = useMemo(() => {
    if (!userSecurityScope) return true;
    if (userSecurityScope.isAdmin || userSecurityScope.isSuperuser || userSecurityScope.isSupervisor) return true;
    const roleLower = (userSecurityScope.role || '').toLowerCase();
    if (roleLower === 'admin' || roleLower === 'superuser' || roleLower === 'manager' || roleLower === 'supervisor') return true;
    return false;
  }, [userSecurityScope]);

  // Load Data
  const loadData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [lRaw, eRaw, hRaw, aRaw] = await Promise.all([
        getRange(spreadsheetId, 'Leave!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Employees!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Holidays!A:Z').catch(() => []),
        getRange(spreadsheetId, 'SettlementAuditLog!A:Z').catch(() => [])
      ]);

      const rawEmployees = eRaw.length > 1 ? eRaw.slice(1) : [];
      setAllEmployees(rawEmployees);
      
      const loadedLeaves = lRaw.length > 1 ? lRaw.slice(1) : [];
      setLeaves(loadedLeaves);
      setHolidays(hRaw.length > 1 ? hRaw.slice(1) : []);
      setAuditLogs(aRaw.length > 1 ? aRaw.slice(1) : []);
    } catch (err) {
      console.error('Failed to load leave data:', err);
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
      if (!sheet || ['Leave', 'Employees', 'Holidays', 'SettlementAuditLog'].includes(sheet)) {
        loadData(false);
      }
    };

    const handleContext = (e: any) => {
      if (e.detail?.moduleId === 'leave') {
        if (e.detail.action === 'apply') {
          setActiveTab('apply');
        } else if (e.detail.action === 'approval') {
          setActiveTab('approval');
        } else if (e.detail.action === 'hr-pending' || e.detail.action === 'hrPending') {
          setActiveTab('hrPending');
        } else if (e.detail.action === 'history') {
          setActiveTab('history');
        }
        if (e.detail.search) {
          setApplySearch(e.detail.search);
          setApprovalSearch(e.detail.search);
        }
      }
    };

    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('erp-module-context', handleContext);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('erp-module-context', handleContext);
    };
  }, [spreadsheetId, userSecurityScope]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Departments List
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    allEmployees.forEach(e => { if (e[3]) set.add(e[3]); });
    leaves.forEach(l => { if (l[4]) set.add(l[4]); });
    return Array.from(set).sort();
  }, [allEmployees, leaves]);

  const leaveTypesList = useMemo(() => {
    const set = new Set<string>(['Annual Leave', 'Casual Leave', 'Sick Leave', 'Maternity Leave', 'Special Leave', 'Unauthorised Leave']);
    leaves.forEach(l => { if (l[18]) set.add(l[18]); });
    return Array.from(set);
  }, [leaves]);

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

  // --- WORKFLOW METRIC COUNTS ---
  const counts = useMemo(() => {
    let pendingApproval = 0;
    let hrPending = 0;
    let settled = 0;
    let rejected = 0;

    leaves.forEach(l => {
      const status = (l[8] || '').trim();
      const settlementStatus = (l[12] || '').trim();

      if (status === 'Settlement' || settlementStatus === 'Settlement') {
        settled += 1;
      } else if (status === 'Rejected' || status === 'Cancelled') {
        rejected += 1;
      } else if (status === 'Pending') {
        pendingApproval += 1;
      } else if (status === 'HR Pending' || status === 'Approved' || settlementStatus === 'HR Pending') {
        hrPending += 1;
      }
    });

    return {
      total: leaves.length,
      pendingApproval,
      hrPending,
      settled,
      rejected
    };
  }, [leaves]);

  // Working days calculator helper (accounts for weekends and holidays)
  const calculateWorkingDays = (fromDateStr: string, toDateStr: string) => {
    if (!fromDateStr || !toDateStr || fromDateStr > toDateStr) return 0;
    try {
      const fromDate = parseISO(fromDateStr);
      const toDate = parseISO(toDateStr);
      if (!isValid(fromDate) || !isValid(toDate)) return 0;

      const daysInInterval = eachDayOfInterval({ start: fromDate, end: toDate });
      const holidayDates = new Set(holidays.map(h => (h[0] || '').trim()));

      return daysInInterval.filter(day => {
        const isWknd = isFriday(day);
        const isHol = holidayDates.has(format(day, 'yyyy-MM-dd'));
        return !isWknd && !isHol;
      }).length;
    } catch {
      return 0;
    }
  };

  // Real-time conflict validation for new leave application
  const liveConflict = useMemo(() => {
    if (!form.id || !form.from || !form.to) return { hasConflict: false, conflictingLeaves: [] };
    return validateLeaveOverlap(leaves, form.id, form.from, form.to);
  }, [leaves, form.id, form.from, form.to]);

  const calculatedDays = useMemo(() => {
    return calculateWorkingDays(form.from, form.to);
  }, [form.from, form.to, holidays]);

  // Real-time conflict validation for editing pending leave
  const editLiveConflict = useMemo(() => {
    if (!editingLeave || !editForm.id || !editForm.from || !editForm.to) {
      return { hasConflict: false, conflictingLeaves: [] };
    }
    return validateLeaveOverlap(leaves, editForm.id, editForm.from, editForm.to, editForm.leaveId);
  }, [leaves, editingLeave, editForm.id, editForm.from, editForm.to, editForm.leaveId]);

  const editCalculatedDays = useMemo(() => {
    return calculateWorkingDays(editForm.from, editForm.to);
  }, [editForm.from, editForm.to, holidays]);

  // Selected Employee Leave Profile / Summary
  const selectedEmpLeaveSummary = useMemo(() => {
    if (!form.id) return null;
    const targetEmpId = form.id.trim().toUpperCase();
    const empLeaves = leaves.filter(l => (l[1] || '').trim().toUpperCase() === targetEmpId);
    
    let settledDays = 0;
    let pendingDays = 0;
    let hrPendingDays = 0;

    const activeLeaves: string[][] = [];

    empLeaves.forEach(l => {
      const status = (l[8] || 'Pending').trim();
      const settlementStatus = (l[12] || '').trim();
      const days = parseFloat(l[7] || '0') || 0;

      if (status.toLowerCase() === 'settlement' || settlementStatus.toLowerCase() === 'settlement') {
        settledDays += days;
        activeLeaves.push(l);
      } else if (status.toLowerCase() === 'hr pending' || status.toLowerCase() === 'approved' || settlementStatus.toLowerCase() === 'hr pending') {
        hrPendingDays += days;
        activeLeaves.push(l);
      } else if (status.toLowerCase() === 'pending') {
        pendingDays += days;
        activeLeaves.push(l);
      }
    });

    return {
      settledDays,
      hrPendingDays,
      pendingDays,
      activeLeaves
    };
  }, [leaves, form.id]);

  // --- SUB-DATA: 1. APPLICATIONS LIST FOR "APPLY" TAB ---
  const myScopedLeaves = useMemo(() => {
    if (userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all') {
      return leaves.filter(l => {
        const empId = (l[1] || '').toUpperCase();
        const empName = (l[2] || '').toLowerCase();
        const userIdentifier = (user?.displayName || user?.email || '').toLowerCase();
        return authorizedIdSet.has(empId) || empName === userIdentifier || empId === userIdentifier.toUpperCase();
      });
    }
    return leaves;
  }, [leaves, userSecurityScope, authorizedIdSet, user]);

  const filteredMyLeaves = useMemo(() => {
    return myScopedLeaves.filter(l => {
      const q = applySearch.toLowerCase();
      const matchSearch = !q || 
        (l[0] || '').toLowerCase().includes(q) ||
        (l[1] || '').toLowerCase().includes(q) ||
        (l[2] || '').toLowerCase().includes(q) ||
        (l[4] || '').toLowerCase().includes(q) ||
        (l[10] || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      const rawStatus = l[8] || 'Pending';
      if (applyStatusFilter === 'All') return true;
      if (applyStatusFilter === 'Pending') return rawStatus === 'Pending';
      if (applyStatusFilter === 'HR Pending') return rawStatus === 'HR Pending' || (rawStatus === 'Approved' && l[12] !== 'Settlement');
      if (applyStatusFilter === 'Settlement') return rawStatus === 'Settlement' || l[12] === 'Settlement';
      if (applyStatusFilter === 'Cancelled') return rawStatus === 'Cancelled' || l[12] === 'Cancelled';
      return rawStatus === applyStatusFilter;
    });
  }, [myScopedLeaves, applySearch, applyStatusFilter]);

  // --- SUB-DATA: 2. SUPERVISOR APPROVAL LIST ---
  const pendingApprovalLeaves = useMemo(() => {
    return leaves.filter(l => (l[8] || '').trim() === 'Pending');
  }, [leaves]);

  const filteredApprovalLeaves = useMemo(() => {
    return pendingApprovalLeaves.filter(l => {
      const q = approvalSearch.toLowerCase();
      const matchSearch = !q || 
        (l[0] || '').toLowerCase().includes(q) ||
        (l[1] || '').toLowerCase().includes(q) ||
        (l[2] || '').toLowerCase().includes(q) ||
        (l[4] || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (approvalDeptFilter !== 'All' && (l[4] || '').toLowerCase() !== approvalDeptFilter.toLowerCase()) return false;
      return true;
    });
  }, [pendingApprovalLeaves, approvalSearch, approvalDeptFilter]);

  // --- SUB-DATA: 3. HR PENDING SETTLEMENT LIST ---
  const rawHRPendingLeaves = useMemo(() => {
    return leaves.filter(l => {
      const rawStatus = (l[8] || '').trim();
      const settlementStatus = (l[12] || '').trim();
      
      if (rawStatus.toLowerCase() === 'settlement' || settlementStatus.toLowerCase() === 'settlement') return false;
      if (rawStatus.toLowerCase() === 'rejected' || rawStatus.toLowerCase() === 'cancelled') return false;
      if (rawStatus.toLowerCase() === 'pending') return false;

      return rawStatus.toLowerCase() === 'hr pending' || rawStatus.toLowerCase() === 'approved' || settlementStatus.toLowerCase() === 'hr pending';
    });
  }, [leaves]);

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

      if (hrFilterAppId && !appId.includes(hrFilterAppId.toLowerCase())) return false;
      if (hrFilterEmpId && !empId.includes(hrFilterEmpId.toLowerCase())) return false;
      if (hrFilterEmpName && !empName.includes(hrFilterEmpName.toLowerCase())) return false;
      if (hrFilterDept !== 'All' && dept !== hrFilterDept.toLowerCase()) return false;
      if (hrFilterLeaveType !== 'All' && !leaveType.includes(hrFilterLeaveType.toLowerCase())) return false;
      if (hrFilterApprovedDate && approvedDate !== hrFilterApprovedDate) return false;
      if (hrFilterFromDate && fromDate < hrFilterFromDate) return false;
      if (hrFilterToDate && toDate > hrFilterToDate) return false;

      return true;
    });
  }, [rawHRPendingLeaves, hrFilterAppId, hrFilterEmpId, hrFilterEmpName, hrFilterDept, hrFilterLeaveType, hrFilterApprovedDate, hrFilterFromDate, hrFilterToDate]);

  // --- SUB-DATA: 4. SETTLEMENT HISTORY LIST ---
  const settlementHistoryLeaves = useMemo(() => {
    return leaves.filter(l => {
      const rawStatus = (l[8] || '').trim().toLowerCase();
      const settlementStatus = (l[12] || '').trim().toLowerCase();
      return rawStatus === 'settlement' || settlementStatus === 'settlement';
    });
  }, [leaves]);

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

  const settledByUsers = useMemo(() => {
    const set = new Set<string>();
    settlementHistoryLeaves.forEach(l => { if (l[15]) set.add(l[15]); });
    return Array.from(set);
  }, [settlementHistoryLeaves]);

  // ================= ACTION HANDLERS =================

  // 1. Submit Application
  const handleApply = async (e: any) => {
    e.preventDefault();
    if (isSubmittingLeave) return;

    if (!form.id) {
      setToastMessage({ type: 'warning', text: 'Please select an employee.' });
      return;
    }

    const emp = employees.find(e => e[0]?.trim().toUpperCase() === form.id.trim().toUpperCase());
    if (!emp) {
      setToastMessage({ type: 'error', text: 'Employee ID not found in authorized employee directory.' });
      return;
    }

    if (!form.from || !form.to) {
      setToastMessage({ type: 'warning', text: 'Both Start Date and End Date are required.' });
      return;
    }

    if (form.from > form.to) {
      setToastMessage({ type: 'error', text: 'End date cannot be earlier than start date.' });
      return;
    }

    // Check UI conflict first
    if (liveConflict.hasConflict) {
      setToastMessage({ 
        type: 'error', 
        text: liveConflict.message || 'Cannot submit: Requested period overlaps with an existing leave record.' 
      });
      return;
    }

    setIsSubmittingLeave(true);

    try {
      // Fetch fresh data from sheet to guarantee no race condition / double reservation
      const freshLeavesRaw = await getRange(spreadsheetId, 'Leave!A:Z');
      const freshLeaves = freshLeavesRaw.length > 1 ? freshLeavesRaw.slice(1) : [];

      const freshConflict = validateLeaveOverlap(freshLeaves, form.id, form.from, form.to);
      if (freshConflict.hasConflict) {
        setToastMessage({ 
          type: 'error', 
          text: `Submission blocked: ${freshConflict.message}` 
        });
        setIsSubmittingLeave(false);
        // Refresh local cache to show latest conflicting records
        setLeaves(freshLeaves);
        return;
      }

      const days = calculateWorkingDays(form.from, form.to);

      const leaveId = `LV-${Date.now().toString().slice(-6)}`;
      const now = format(new Date(), 'yyyy-MM-dd');

      const values = [
        leaveId, 
        form.id.trim().toUpperCase(), 
        emp[1], 
        emp[2], 
        emp[3], 
        form.from, 
        form.to, 
        days.toString(), 
        'Pending', 
        '', 
        form.reason,
        '', // Approval_Date
        '', // Settlement_Status
        '', // Settlement_Date
        '', // Settled_By_ID
        '', // Settled_By_Name
        '', // Settlement_Remarks
        now, // Created_At
        form.leaveType // Leave_Type
      ];

      await appendRow(spreadsheetId, 'Leave!A:S', [values]);
      setForm({ id: '', from: '', to: '', reason: '', leaveType: 'Annual Leave' });
      setToastMessage({ 
        type: 'success', 
        text: `Leave application ${leaveId} (${days} working day(s): ${form.from} to ${form.to}) submitted successfully.` 
      });
      loadData(false);
    } catch (err: any) { 
      console.error('Failed to submit leave application:', err);
      setToastMessage({ type: 'error', text: `Failed to submit leave application: ${err.message || 'Unknown error'}` });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Edit Pending Application Handlers
  const handleOpenEdit = (leaveRow: string[]) => {
    setEditingLeave(leaveRow);
    setEditForm({
      leaveId: leaveRow[0] || '',
      id: leaveRow[1] || '',
      from: leaveRow[5] || '',
      to: leaveRow[6] || '',
      reason: leaveRow[10] || '',
      leaveType: leaveRow[18] || 'Annual Leave'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLeave) return;
    if (!editForm.from || !editForm.to) {
      setToastMessage({ type: 'warning', text: 'Start Date and End Date are required.' });
      return;
    }
    if (editForm.from > editForm.to) {
      setToastMessage({ type: 'error', text: 'End date cannot be earlier than start date.' });
      return;
    }

    if (editLiveConflict.hasConflict) {
      setToastMessage({ type: 'error', text: editLiveConflict.message || 'Date conflict detected.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const freshLeavesRaw = await getRange(spreadsheetId, 'Leave!A:Z');
      const freshLeaves = freshLeavesRaw.length > 1 ? freshLeavesRaw.slice(1) : [];

      const freshConflict = validateLeaveOverlap(
        freshLeaves, 
        editForm.id, 
        editForm.from, 
        editForm.to, 
        editForm.leaveId
      );

      if (freshConflict.hasConflict) {
        setToastMessage({ 
          type: 'error', 
          text: `Save blocked: ${freshConflict.message}` 
        });
        setIsSavingEdit(false);
        setLeaves(freshLeaves);
        return;
      }

      const days = calculateWorkingDays(editForm.from, editForm.to);
      const updatedValues = [...editingLeave];
      while (updatedValues.length < 19) updatedValues.push('');

      updatedValues[5] = editForm.from;
      updatedValues[6] = editForm.to;
      updatedValues[7] = days.toString();
      updatedValues[10] = editForm.reason;
      updatedValues[18] = editForm.leaveType;

      await updateRowByPrimaryKey(spreadsheetId, 'Leave', editForm.leaveId, updatedValues);
      setToastMessage({ type: 'success', text: `Leave application ${editForm.leaveId} updated successfully.` });
      setEditingLeave(null);
      loadData(false);
    } catch (err: any) {
      console.error('Failed to update leave application:', err);
      setToastMessage({ type: 'error', text: `Failed to update application: ${err.message}` });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Cancel Pending Leave Application Handler
  const handleCancelLeave = async () => {
    if (!cancellingLeave) return;
    setIsCancelling(true);
    try {
      const leaveId = cancellingLeave[0];
      const updatedValues = [...cancellingLeave];
      while (updatedValues.length < 19) updatedValues.push('');

      updatedValues[8] = 'Cancelled';
      updatedValues[12] = 'Cancelled';

      await updateRowByPrimaryKey(spreadsheetId, 'Leave', leaveId, updatedValues);
      setToastMessage({ 
        type: 'success', 
        text: `Leave application ${leaveId} cancelled. The dates (${cancellingLeave[5]} to ${cancellingLeave[6]}) are now available.` 
      });
      setCancellingLeave(null);
      loadData(false);
    } catch (err: any) {
      console.error('Failed to cancel leave application:', err);
      setToastMessage({ type: 'error', text: `Failed to cancel application: ${err.message}` });
    } finally {
      setIsCancelling(false);
    }
  };

  // 2. Single Supervisor Action (Approve / Reject)
  const handleSupervisorAction = async (leave: string[], status: 'Approved' | 'Rejected') => {
    try {
      const newValues = [...leave];
      while (newValues.length < 19) newValues.push('');
      
      const targetStatus = status === 'Approved' ? 'HR Pending' : 'Rejected';
      const approver = userSecurityScope?.employeeName || user.displayName || user.email || 'Supervisor';
      const now = format(new Date(), 'yyyy-MM-dd');

      newValues[8] = targetStatus; 
      newValues[9] = approver; 
      newValues[11] = now; 
      newValues[12] = status === 'Approved' ? 'HR Pending' : ''; 

      await updateRowByPrimaryKey(spreadsheetId, 'Leave', leave[0], newValues);
      setToastMessage({ 
        type: 'success', 
        text: status === 'Approved' 
          ? `Application ${leave[0]} approved and moved to HR Pending list.` 
          : `Application ${leave[0]} rejected.` 
      });
      loadData(false);
    } catch (err: any) {
      console.error('Supervisor action error:', err);
      setToastMessage({ type: 'error', text: `Action failed: ${err.message}` });
    }
  };

  // 3. Bulk Supervisor Action
  const handleBulkSupervisorAction = async (status: 'Approved' | 'Rejected') => {
    if (selectedApprovalIds.length === 0) return;
    setIsApprovingBulk(true);
    try {
      const targetStatus = status === 'Approved' ? 'HR Pending' : 'Rejected';
      const approver = userSecurityScope?.employeeName || user.displayName || user.email || 'Supervisor';
      const now = format(new Date(), 'yyyy-MM-dd');

      for (const leaveId of selectedApprovalIds) {
        const leave = leaves.find(l => l[0] === leaveId);
        if (leave && leave[8] === 'Pending') {
          const newValues = [...leave];
          while (newValues.length < 19) newValues.push('');
          newValues[8] = targetStatus;
          newValues[9] = approver;
          newValues[11] = now;
          newValues[12] = status === 'Approved' ? 'HR Pending' : '';
          await updateRowByPrimaryKey(spreadsheetId, 'Leave', leave[0], newValues);
        }
      }
      setSelectedApprovalIds([]);
      setToastMessage({ 
        type: 'success', 
        text: `${selectedApprovalIds.length} leave application(s) processed as ${targetStatus}.` 
      });
      loadData(false);
    } catch (err) {
      setToastMessage({ type: 'error', text: 'Failed to process bulk approval.' });
    } finally {
      setIsApprovingBulk(false);
    }
  };

  // 4. Settle Selected Confirmation & Execution (HR Pending)
  const handleConfirmSettlement = async () => {
    if (selectedHRPendingIds.length === 0) return;
    setIsSettling(true);

    try {
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

      for (const id of selectedHRPendingIds) {
        const liveRow = freshLeaves.find(l => l[0] === id);
        if (!liveRow) {
          skippedIds.push(id);
          continue;
        }

        const currentStatus = (liveRow[8] || '').trim().toLowerCase();
        const currentSettlement = (liveRow[12] || '').trim().toLowerCase();

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
          text: 'Selected records were already settled by another user or are no longer valid.'
        });
        setSelectedHRPendingIds([]);
        loadData(false);
        return;
      }

      for (const row of validToSettle) {
        const updated = [...row];
        while (updated.length < 19) updated.push('');
        
        updated[8] = 'Settlement';
        updated[12] = 'Settlement';
        updated[13] = fullDateTime;
        updated[14] = settledById;
        updated[15] = settledByName;
        updated[16] = settlementRemarks || 'Settled via HR Leave module';

        await updateRowByPrimaryKey(spreadsheetId, 'Leave', row[0], updated);
      }

      // Record Audit Log
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
        selectedHRPendingIds.length.toString(),
        validToSettle.length.toString(),
        skippedIds.length.toString(),
        settledIdsStr,
        auditDetails
      ];

      await appendRow(spreadsheetId, 'SettlementAuditLog!A:L', [auditRow]).catch(e => console.warn(e));

      setSelectedHRPendingIds([]);
      setIsConfirmModalOpen(false);
      
      let message = `${validToSettle.length} leave record${validToSettle.length === 1 ? '' : 's'} successfully updated as Settlement.`;
      if (skippedIds.length > 0) message += ` (${skippedIds.length} already settled and skipped)`;

      setToastMessage({ type: 'success', text: message });
      loadData(false);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Settlement failed: ${err.message}` });
    } finally {
      setIsSettling(false);
    }
  };

  // --- EXPORT HELPERS ---
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportHRPending = () => {
    if (filteredHRPendingLeaves.length === 0) return alert('No HR Pending records to export.');
    exportToCSV(
      'HR_Pending_Leave',
      ['Application ID', 'Employee ID', 'Name', 'Department', 'Designation', 'Leave Type', 'From Date', 'To Date', 'Days', 'App Date', 'Approved By', 'Status'],
      filteredHRPendingLeaves.map(l => [l[0], l[1], l[2], l[4], l[3], l[18] || 'Annual Leave', l[5], l[6], l[7], l[17] || l[5], l[9], 'HR Pending'])
    );
  };

  const handleExportHistory = () => {
    if (filteredHistoryLeaves.length === 0) return alert('No settlement history records to export.');
    exportToCSV(
      'Settlement_History',
      ['Application ID', 'Employee ID', 'Name', 'Department', 'Leave Type', 'From Date', 'To Date', 'Days', 'Approved Date', 'Settlement Date', 'Settled By', 'Status', 'Remarks'],
      filteredHistoryLeaves.map(l => [l[0], l[1], l[2], l[4], l[18] || 'Annual Leave', l[5], l[6], l[7], l[11], l[13], l[15], 'Settlement', l[16]])
    );
  };

  const handleExportApplications = () => {
    if (filteredMyLeaves.length === 0) return alert('No applications to export.');
    exportToCSV(
      'Leave_Applications',
      ['Application ID', 'Employee ID', 'Name', 'Department', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Supervisor Signoff', 'Reason'],
      filteredMyLeaves.map(l => [l[0], l[1], l[2], l[4], l[18] || 'Annual Leave', l[5], l[6], l[7], l[8], l[9], l[10]])
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1ABB9C]" />
        <p className="text-sm font-medium text-gray-500">Loading Leave Management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
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

      {/* Security Scope Banner */}
      {isRestrictedScope && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between text-amber-900 text-sm">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Security Access Scoped:</strong> You have authorization for <strong>{employees.length} assigned employee{employees.length !== 1 ? 's' : ''}</strong>
              {userSecurityScope?.supervisorName ? ` under Supervisor "${userSecurityScope.supervisorName}"` : ''}
              {userSecurityScope?.accessLimitType === 'department' && userSecurityScope?.assignedDepartment ? ` in Department "${userSecurityScope.assignedDepartment}"` : ''}.
            </span>
          </div>
          <span className="bg-amber-200/80 text-amber-800 text-xs px-2.5 py-1 rounded font-bold uppercase">
            {userSecurityScope?.accessLimitType} Mode
          </span>
        </div>
      )}

      {/* Header Banner & Workflow Pipeline Metrics */}
      {(() => {
        const palette = resolvePaletteForModule('leave');
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: `${palette.primaryHex}15`,
                      color: palette.primaryHex
                    }}
                  >
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-black text-gray-900">Leave Management Hub</h1>
                      <span 
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: palette.pillBg,
                          color: palette.pillText
                        }}
                      >
                        HR & Staffing
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      End-to-end leave lifecycle: Application → Supervisor Approval → HR Pending Settlement → Archive.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadData(false)}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors cursor-pointer group"
                  style={{ color: isRefreshing ? palette.primaryHex : undefined }}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Workflow Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
              <div 
                onClick={() => setActiveTab('apply')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'apply' ? 'bg-gray-100/90 border-gray-400 ring-2 ring-gray-400/30' : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100/50'
                }`}
              >
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Applied</div>
                <div className="text-2xl font-black text-gray-900 mt-0.5">{counts.total}</div>
              </div>

              <div 
                onClick={() => setActiveTab('approval')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'approval' ? 'bg-yellow-100/70 border-yellow-400 ring-2 ring-yellow-400/30' : 'bg-yellow-50/60 border-yellow-200 hover:bg-yellow-100/40'
                }`}
              >
                <div className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Pending Review</span>
                  {counts.pendingApproval > 0 && (
                    <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {counts.pendingApproval}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-yellow-900 mt-0.5">{counts.pendingApproval}</div>
              </div>

              <div 
                onClick={() => setActiveTab('hrPending')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'hrPending' ? 'bg-blue-100/70 border-blue-400 ring-2 ring-blue-400/30' : 'bg-blue-50/60 border-blue-200 hover:bg-blue-100/40'
                }`}
              >
                <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center justify-between">
                  <span>HR Pending</span>
                  {counts.hrPending > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {counts.hrPending}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-blue-900 mt-0.5">{counts.hrPending}</div>
              </div>

              <div 
                onClick={() => setActiveTab('history')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'history' ? 'bg-purple-100/70 border-purple-400 ring-2 ring-purple-400/30' : 'bg-purple-50/60 border-purple-200 hover:bg-purple-100/40'
                }`}
              >
                <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Settled</div>
                <div className="text-2xl font-black text-purple-900 mt-0.5">{counts.settled}</div>
              </div>

              <div className="p-3.5 rounded-xl border bg-rose-50/50 border-rose-200">
                <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Rejected</div>
                <div className="text-2xl font-black text-rose-900 mt-0.5">{counts.rejected}</div>
              </div>
            </div>

            {/* Consolidated Smart Tab Bar */}
            <div className="flex border-b border-gray-200 mt-6 -mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('apply')}
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer group ${
                  activeTab === 'apply'
                    ? 'border-current font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === 'apply' ? { color: palette.primaryHex, borderColor: palette.primaryHex } : undefined}
              >
                <PlusCircle className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90 group-hover-icon-anim" />
                Apply & My Leaves
              </button>

              <button
                onClick={() => setActiveTab('approval')}
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer group ${
                  activeTab === 'approval'
                    ? 'border-current font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === 'approval' ? { color: palette.primaryHex, borderColor: palette.primaryHex } : undefined}
              >
                <UserCheck className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" />
                Supervisor Approval
                {counts.pendingApproval > 0 && (
                  <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {counts.pendingApproval}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('hrPending')}
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer group ${
                  activeTab === 'hrPending'
                    ? 'border-current font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === 'hrPending' ? { color: palette.primaryHex, borderColor: palette.primaryHex } : undefined}
              >
                <Clock className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" />
            HR Pending Settlement
            {counts.hrPending > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {counts.hrPending}
              </span>
            )}
          </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer group ${
                  activeTab === 'history'
                    ? 'border-current font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === 'history' ? { color: palette.primaryHex, borderColor: palette.primaryHex } : undefined}
              >
                <History className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" />
                Settlement History
              </button>

              <button
                onClick={() => setActiveTab('balances')}
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer group ${
                  activeTab === 'balances'
                    ? 'border-current font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === 'balances' ? { color: palette.primaryHex, borderColor: palette.primaryHex } : undefined}
              >
                <CreditCard className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" />
                Leave Balances & Quotas
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer group ${
                  activeTab === 'audit'
                    ? 'border-current font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === 'audit' ? { color: palette.primaryHex, borderColor: palette.primaryHex } : undefined}
              >
                <Shield className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" />
                Audit Trail
              </button>
            </div>
          </div>
        );
      })()}

      {/* ================= TAB 1: APPLY & MY LEAVES ================= */}
      {activeTab === 'apply' && (
        <div className="space-y-6">
          {/* Application Form */}
          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#1ABB9C]" />
                  New Leave Application
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Submit a leave request. Duplicate or overlapping dates with existing pending, approved, or consumed leaves are strictly blocked.
                </p>
              </div>
              {form.from && form.to && form.from <= form.to && !liveConflict.hasConflict && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {calculatedDays} Working Day{calculatedDays !== 1 ? 's' : ''} Calculated
                </div>
              )}
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Employee ID <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    list="employees-list-leave"
                    required 
                    value={form.id} 
                    onChange={e => setForm({...form, id: e.target.value})} 
                    placeholder="e.g. EMP001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]" 
                  />
                  <datalist id="employees-list-leave">
                    {employees.map(e => (
                      <option key={e[0]} value={e[0]}>
                        {e[0]} - {e[1]} ({e[3]} • {e[2]})
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Leave Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.leaveType}
                    onChange={e => setForm({...form, leaveType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                  >
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Special Leave">Special Leave</option>
                    <option value="Unauthorised Leave">Unauthorised Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    From Date <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    required 
                    type="date" 
                    value={form.from} 
                    onChange={e => setForm({...form, from: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    To Date <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    required 
                    type="date" 
                    value={form.to} 
                    onChange={e => setForm({...form, to: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Reason / Notes <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={form.reason} 
                    onChange={e => setForm({...form, reason: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]" 
                    placeholder="Reason for leave" 
                  />
                </div>
              </div>

              {/* REAL-TIME VALIDATION FEEDBACK BANNERS */}
              {form.from && form.to && form.from > form.to && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Invalid Date Range:</span> End date ({form.to}) cannot be earlier than start date ({form.from}).
                  </div>
                </div>
              )}

              {liveConflict.hasConflict && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 w-full">
                    <div>
                      <h4 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                        <Ban className="w-4 h-4 text-rose-600" />
                        Leave Overlap Conflict Detected
                      </h4>
                      <p className="mt-0.5 text-rose-800 leading-relaxed font-medium">
                        {liveConflict.message}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {liveConflict.conflictingLeaves.map((c, i) => (
                        <div key={i} className="bg-white/90 border border-rose-200 rounded-lg p-2.5 text-[11px] space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between font-bold text-gray-900">
                            <span className="font-mono text-rose-700">{c.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              c.status === 'HR Pending' || c.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="text-gray-700 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-gray-400" />
                            <strong>{c.fromDate}</strong> to <strong>{c.toDate}</strong> ({c.days}d)
                          </div>
                          <div className="text-gray-500 truncate text-[10px]">
                            {c.leaveType} • {c.employeeName} ({c.employeeId})
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-rose-700 bg-rose-100/60 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      Please adjust the requested dates or cancel/edit the existing pending leave.
                    </div>
                  </div>
                </div>
              )}

              {form.from && form.to && form.from <= form.to && !liveConflict.hasConflict && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="font-bold text-emerald-950">Dates available:</strong> {form.from} to {form.to} ({calculatedDays} working days calculated, excluding weekend/holidays).
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    No Overlaps
                  </span>
                </div>
              )}

              {/* Employee Information & Active Leave Profile Strip */}
              {form.id && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {employees.find(e => e[0] === form.id)?.[1] || 'Employee'}
                    </span>
                    <span className="text-gray-500 font-mono text-[11px]">({form.id})</span>
                    {employees.find(e => e[0] === form.id)?.[3] && (
                      <span className="bg-gray-200/80 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-medium">
                        {employees.find(e => e[0] === form.id)?.[3]}
                      </span>
                    )}
                  </div>

                  {selectedEmpLeaveSummary && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                      <span className="text-gray-600">
                        Pending: <strong className="text-amber-700">{selectedEmpLeaveSummary.pendingDays}d</strong>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">
                        HR Pending: <strong className="text-blue-700">{selectedEmpLeaveSummary.hrPendingDays}d</strong>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">
                        Settled/Consumed: <strong className="text-purple-700">{selectedEmpLeaveSummary.settledDays}d</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={
                    isSubmittingLeave || 
                    liveConflict.hasConflict || 
                    (Boolean(form.from && form.to && form.from > form.to)) || 
                    !form.id || 
                    !form.from || 
                    !form.to
                  }
                  className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    liveConflict.hasConflict || (form.from && form.to && form.from > form.to)
                      ? 'bg-rose-400 text-white cursor-not-allowed opacity-80'
                      : isSubmittingLeave || !form.id || !form.from || !form.to
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-[#1ABB9C] hover:bg-[#16A085] text-white'
                  }`}
                >
                  {isSubmittingLeave ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Overlaps & Submitting...
                    </>
                  ) : liveConflict.hasConflict ? (
                    <>
                      <Ban className="w-4 h-4" />
                      Submission Blocked (Overlap Conflict)
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Leave Applications Log</h3>
                <p className="text-xs text-gray-500">Track application statuses across the approval and settlement lifecycle.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search by ID, Name, Dept..."
                    value={applySearch}
                    onChange={e => setApplySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                  />
                </div>

                <select
                  value={applyStatusFilter}
                  onChange={e => setApplyStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg font-medium text-gray-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending Review</option>
                  <option value="HR Pending">HR Pending</option>
                  <option value="Settlement">Settlement</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <button
                  onClick={handleExportApplications}
                  disabled={filteredMyLeaves.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">App ID</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Leave Type</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Period</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase">Days</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Reason</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Supervisor</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredMyLeaves.map((l, idx) => {
                    const status = l[8] || 'Pending';
                    const isHRPending = status === 'HR Pending' || (status === 'Approved' && l[12] !== 'Settlement');
                    const isSettlement = status === 'Settlement' || l[12] === 'Settlement';
                    const isCancelled = status === 'Cancelled' || l[12] === 'Cancelled';
                    const isPending = status === 'Pending';

                    return (
                      <tr key={`${l[0] || 'leave'}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{l[0]}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{l[2]}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{l[1]}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{l[4] || '-'}</td>
                        <td className="px-4 py-3">{renderLeaveTypeBadge(l[18] || 'Annual Leave')}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l[5]} to {l[6]}</td>
                        <td className="px-4 py-3 text-center font-black text-gray-900">{l[7]}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate" title={l[10] || ''}>{l[10] || '-'}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isHRPending ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            isSettlement ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            isCancelled ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                            status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isHRPending ? 'HR Pending' : isSettlement ? 'Settlement' : isCancelled ? 'Cancelled' : status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-[11px]">{l[9] || '-'}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isPending ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(l)}
                                title="Edit Dates / Details"
                                className="p-1 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setCancellingLeave(l)}
                                title="Cancel Application"
                                className="p-1 text-gray-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMyLeaves.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                        No leave applications match current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SUPERVISOR APPROVAL ================= */}
      {activeTab === 'approval' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-800">
                Pending Supervisor Review: <span className="text-yellow-700 font-black">{filteredApprovalLeaves.length}</span>
              </span>
              {selectedApprovalIds.length > 0 && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Selected: {selectedApprovalIds.length}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search ID, Name, Dept..."
                  value={approvalSearch}
                  onChange={e => setApprovalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>

              <select
                value={approvalDeptFilter}
                onChange={e => setApprovalDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg font-medium text-gray-700"
              >
                <option value="All">All Departments</option>
                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {selectedApprovalIds.length > 0 && canApprove && (
                <>
                  <button
                    onClick={() => handleBulkSupervisorAction('Approved')}
                    disabled={isApprovingBulk}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve to HR Pending ({selectedApprovalIds.length})
                  </button>
                  <button
                    onClick={() => handleBulkSupervisorAction('Rejected')}
                    disabled={isApprovingBulk}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject ({selectedApprovalIds.length})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left w-10">
                      <input
                        type="checkbox"
                        checked={filteredApprovalLeaves.length > 0 && selectedApprovalIds.length === filteredApprovalLeaves.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedApprovalIds(filteredApprovalLeaves.map(l => l[0]));
                          else setSelectedApprovalIds([]);
                        }}
                        className="rounded border-gray-300 text-[#1ABB9C] focus:ring-[#1ABB9C] h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">App ID</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Leave Type</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Period</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Days</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Reason</th>
                    <th className="px-4 py-3.5 text-right font-bold text-gray-600 uppercase">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredApprovalLeaves.map((l, idx) => {
                    const isSelected = selectedApprovalIds.includes(l[0]);
                    return (
                      <tr key={`${l[0] || 'approval'}-${idx}`} className={`hover:bg-gray-50/80 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}>
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedApprovalIds(prev => 
                                prev.includes(l[0]) ? prev.filter(id => id !== l[0]) : [...prev, l[0]]
                              );
                            }}
                            className="rounded border-gray-300 text-[#1ABB9C] focus:ring-[#1ABB9C] h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-gray-900">{l[0]}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900">{l[2]}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{l[1]}</div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-700">{l[4] || '-'}</td>
                        <td className="px-4 py-3.5">{renderLeaveTypeBadge(l[18] || 'Annual Leave')}</td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{l[5]} to {l[6]}</td>
                        <td className="px-4 py-3.5 text-center font-black text-gray-900">{l[7]}</td>
                        <td className="px-4 py-3.5 text-gray-500 max-w-[180px] truncate" title={l[10] || ''}>{l[10] || '-'}</td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSupervisorAction(l, 'Approved')}
                              title="Approve to HR Pending"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleSupervisorAction(l, 'Rejected')}
                              title="Reject application"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredApprovalLeaves.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-gray-800 text-sm">All Clear! No Pending Approvals</p>
                        <p className="text-xs text-gray-400 mt-1">All leave applications have been reviewed.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: HR PENDING & SETTLEMENT ================= */}
      {activeTab === 'hrPending' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                <Filter className="w-4 h-4 text-gray-500" />
                Filter HR Pending Applications
              </div>
              <button
                onClick={() => {
                  setHrFilterAppId('');
                  setHrFilterEmpId('');
                  setHrFilterEmpName('');
                  setHrFilterDept('All');
                  setHrFilterLeaveType('All');
                  setHrFilterFromDate('');
                  setHrFilterToDate('');
                  setHrFilterApprovedDate('');
                }}
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
                  value={hrFilterAppId}
                  onChange={e => setHrFilterAppId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Employee ID</label>
                <input
                  type="text"
                  placeholder="e.g. EMP001"
                  value={hrFilterEmpId}
                  onChange={e => setHrFilterEmpId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Employee Name</label>
                <input
                  type="text"
                  placeholder="Search name..."
                  value={hrFilterEmpName}
                  onChange={e => setHrFilterEmpName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Department</label>
                <select
                  value={hrFilterDept}
                  onChange={e => setHrFilterDept(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                >
                  <option value="All">All Departments</option>
                  {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Leave Type</label>
                <select
                  value={hrFilterLeaveType}
                  onChange={e => setHrFilterLeaveType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                >
                  <option value="All">All Types</option>
                  {leaveTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={hrFilterFromDate}
                  onChange={e => setHrFilterFromDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={hrFilterToDate}
                  onChange={e => setHrFilterToDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Approved Date</label>
                <input
                  type="date"
                  value={hrFilterApprovedDate}
                  onChange={e => setHrFilterApprovedDate(e.target.value)}
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
                Selected: {selectedHRPendingIds.length}
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
                onClick={() => {
                  if (selectedHRPendingIds.length === 0) return;
                  setSettlementRemarks('');
                  setIsConfirmModalOpen(true);
                }}
                disabled={selectedHRPendingIds.length === 0 || !canSettle}
                title={!canSettle ? 'You do not have authorization to process settlement' : ''}
                className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-[#1ABB9C] hover:bg-[#16A085] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Settle Selected ({selectedHRPendingIds.length})
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
                        checked={filteredHRPendingLeaves.length > 0 && selectedHRPendingIds.length === filteredHRPendingLeaves.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedHRPendingIds(filteredHRPendingLeaves.map(l => l[0]));
                          else setSelectedHRPendingIds([]);
                        }}
                        className="rounded border-gray-300 text-[#1ABB9C] focus:ring-[#1ABB9C] h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">App ID</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Leave Type</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Period</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Days</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">App Date</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Approved By</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredHRPendingLeaves.map((l, idx) => {
                    const isSelected = selectedHRPendingIds.includes(l[0]);
                    return (
                      <tr 
                        key={`${l[0] || 'hr-pending'}-${idx}`} 
                        className={`transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50/60' : 'hover:bg-gray-50/80'}`}
                        onClick={() => {
                          setSelectedHRPendingIds(prev => 
                            prev.includes(l[0]) ? prev.filter(id => id !== l[0]) : [...prev, l[0]]
                          );
                        }}
                      >
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedHRPendingIds(prev => 
                                prev.includes(l[0]) ? prev.filter(id => id !== l[0]) : [...prev, l[0]]
                              );
                            }}
                            className="rounded border-gray-300 text-[#1ABB9C] focus:ring-[#1ABB9C] h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-gray-900">{l[0]}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900">{l[2]}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{l[1]}</div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-gray-700">{l[4] || '-'}</td>
                        <td className="px-4 py-3.5">{renderLeaveTypeBadge(l[18] || 'Annual Leave')}</td>
                        <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{l[5]} to {l[6]}</td>
                        <td className="px-4 py-3.5 text-center font-black text-gray-900">{l[7]}</td>
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
                      <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                        <p className="font-bold text-gray-800 text-sm">No Pending Leave for Settlement</p>
                        <p className="text-xs text-gray-400 mt-1">All approved leave applications have been settled.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: SETTLEMENT HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
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
                  {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
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
                  {settledByUsers.map(u => <option key={u} value={u}>{u}</option>)}
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">App ID</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Leave Type</th>
                    <th className="px-4 py-3.5 text-center font-bold text-gray-600 uppercase">Days</th>
                    <th className="px-4 py-3.5 text-left font-bold text-gray-600 uppercase">Period</th>
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
                      <td className="px-4 py-3.5 text-center font-black text-gray-900">{l[7]}</td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{l[5]} to {l[6]}</td>
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
                      <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
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

      {/* ================= TAB 5: AUDIT TRAIL ================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Settlement Transaction Audit Trail
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Every settlement action is permanently logged with timestamps, operator identity, and batch details.
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
                  {auditLogs.map((log, idx) => (
                    <tr key={`${log[0] || 'audit'}-${idx}`} className="hover:bg-gray-50/80">
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

      {/* ================= TAB 6: LEAVE BALANCES & QUOTAS ================= */}
      {activeTab === 'balances' && (
        <LeaveBalanceManager
          spreadsheetId={spreadsheetId}
          employees={allEmployees}
          leaves={leaves}
          userSecurityScope={userSecurityScope}
          onRefreshLeaves={() => loadData(false)}
        />
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
                <span className="text-2xl font-black text-emerald-800">{selectedHRPendingIds.length}</span>
                <span className="text-xs font-semibold text-emerald-700 block mt-0.5">leave record(s) selected for settlement</span>
              </div>

              <div className="space-y-1.5 text-left mb-4">
                <label className="block text-xs font-bold text-gray-700">Settlement Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Approved and adjusted in payroll"
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

      {/* EDIT PENDING LEAVE MODAL */}
      {editingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#1ABB9C] flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Edit Leave Application</h3>
                    <p className="text-xs text-gray-500 font-mono">ID: {editForm.leaveId} • {editingLeave[2]} ({editForm.id})</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingLeave(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Leave Type</label>
                  <select
                    value={editForm.leaveType}
                    onChange={e => setEditForm({...editForm, leaveType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                  >
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Special Leave">Special Leave</option>
                    <option value="Unauthorised Leave">Unauthorised Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">From Date</label>
                    <input 
                      type="date"
                      required
                      value={editForm.from}
                      onChange={e => setEditForm({...editForm, from: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">To Date</label>
                    <input 
                      type="date"
                      required
                      value={editForm.to}
                      onChange={e => setEditForm({...editForm, to: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason / Notes</label>
                  <input 
                    type="text"
                    required
                    value={editForm.reason}
                    onChange={e => setEditForm({...editForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:border-[#1ABB9C] focus:ring-1 focus:ring-[#1ABB9C]"
                  />
                </div>

                {/* Conflict Warnings */}
                {editForm.from && editForm.to && editForm.from > editForm.to && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>End date cannot be earlier than start date.</span>
                  </div>
                )}

                {editLiveConflict.hasConflict && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-rose-950">Overlap Conflict Detected:</strong>
                      <span className="text-rose-800">{editLiveConflict.message}</span>
                    </div>
                  </div>
                )}

                {editForm.from && editForm.to && editForm.from <= editForm.to && !editLiveConflict.hasConflict && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {editCalculatedDays} working day(s) calculated ({editForm.from} to {editForm.to})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingLeave(null)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit || editLiveConflict.hasConflict || (Boolean(editForm.from && editForm.to && editForm.from > editForm.to))}
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#1ABB9C] hover:bg-[#16A085] disabled:opacity-50 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL PENDING LEAVE MODAL (ADMIN PASSWORD PROTECTED) */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(cancellingLeave)}
        title="Cancel & Delete Leave Application"
        itemName={cancellingLeave ? `Application ${cancellingLeave[0]} — ${cancellingLeave[2]} (${cancellingLeave[1]})` : undefined}
        itemDetails={cancellingLeave ? `Period: ${cancellingLeave[5]} to ${cancellingLeave[6]} (${cancellingLeave[7]} days) | Type: ${cancellingLeave[18] || 'Annual Leave'} | Reason: ${cancellingLeave[10] || 'N/A'}` : undefined}
        warningMessage="Cancelling this leave application will remove the reservation and release these calendar dates for new applications. Enter the Admin Deletion Password to confirm."
        confirmButtonText="Verify & Cancel Leave"
        onConfirm={handleCancelLeave}
        onClose={() => setCancellingLeave(null)}
      />
    </div>
  );
}

