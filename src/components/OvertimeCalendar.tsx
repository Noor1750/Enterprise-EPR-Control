import { useState, useEffect, useMemo, FormEvent } from 'react';
import { User } from 'firebase/auth';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { 
  Loader2, ChevronLeft, ChevronRight, Plus, Trash2, Shield, 
  Search, RefreshCw, Clock, Users, Calendar as CalendarIcon,
  Filter, AlertCircle, Upload
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isFriday } from 'date-fns';
import { UserSecurityScope, filterAuthorizedEmployees, getAuthorizedEmployeeIdSet, canUserInput } from '../lib/security';
import { BulkUploadOTModal } from './overtime/BulkUploadOTModal';
import AdminDeleteConfirmModal from './common/AdminDeleteConfirmModal';

interface OvertimeCalendarProps {
  spreadsheetId: string;
  user: User;
  userSecurityScope?: UserSecurityScope;
}

interface EmployeeOtRow {
  id: string;
  name: string;
  designation: string;
  section: string;
  days: Record<number, number>;
  total: number;
  otRate: number;
}

export default function OvertimeCalendar({ spreadsheetId, user, userSecurityScope }: OvertimeCalendarProps) {
  const [otData, setOtData] = useState<string[][]>([]);
  const [allEmployees, setAllEmployees] = useState<string[][]>([]);
  const [holidays, setHolidays] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [showOnlyRecorded, setShowOnlyRecorded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    otId: string;
    date: string;
    empName: string;
    empId: string;
    hours: string;
  } | null>(null);
  
  // Log OT Form
  const [form, setForm] = useState({ date: '', hours: '' });

  // Security filtered employees
  const employees = useMemo(() => {
    return filterAuthorizedEmployees(allEmployees, userSecurityScope);
  }, [allEmployees, userSecurityScope]);

  const isRestrictedScope = useMemo(() => {
    return Boolean(userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all');
  }, [userSecurityScope]);

  const canEdit = useMemo(() => {
    return canUserInput(userSecurityScope, 'overtime');
  }, [userSecurityScope]);

  // Extract unique departments from authorized employees
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      const dept = (e[3] || '').trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort();
  }, [employees]);

  const loadData = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);
    try {
      const [oRaw, eRaw, hRaw] = await Promise.all([
        getRange(spreadsheetId, 'Overtime').catch(() => []),
        getRange(spreadsheetId, 'Employees').catch(() => []),
        getRange(spreadsheetId, 'Holidays').catch(() => []),
      ]);

      const rawEmployees = Array.isArray(eRaw) && eRaw.length > 1 ? eRaw.slice(1) : [];
      setAllEmployees(rawEmployees);
      
      const loadedOt = Array.isArray(oRaw) && oRaw.length > 1 ? oRaw.slice(1) : [];
      const authSet = getAuthorizedEmployeeIdSet(rawEmployees, userSecurityScope);

      let filteredOt = loadedOt;
      if (userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all') {
        filteredOt = loadedOt.filter(o => {
          const empId = (o[2] || '').trim().toUpperCase();
          const empName = (o[3] || '').trim().toLowerCase();
          const userIdentifier = (userSecurityScope.employeeName || user?.displayName || userSecurityScope.username || user?.email || '').toLowerCase();
          return authSet.has(empId) || (empName && empName === userIdentifier) || (userSecurityScope.employeeId && empId === userSecurityScope.employeeId.toUpperCase());
        });
      }
      setOtData(filteredOt);
      setHolidays(Array.isArray(hRaw) && hRaw.length > 1 ? hRaw.slice(1) : []);
    } catch (err: any) {
      console.error('Failed to load overtime data:', err);
      setErrorMsg(err?.message || 'Failed to load overtime records from Google Sheets.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, [spreadsheetId, userSecurityScope]);

  const handleDeleteOT = () => {
    if (!canEdit) {
      alert('You do not have permission to delete overtime records.');
      return;
    }
    const existingOT = otData.find(ot => (ot[2] || '').toUpperCase() === selectedEmp.toUpperCase() && ot[1] === form.date);
    if (existingOT) {
      const emp = allEmployees.find(e => (e[0] || '').toUpperCase() === selectedEmp.toUpperCase()) || 
                  employees.find(e => (e[0] || '').toUpperCase() === selectedEmp.toUpperCase());
      setDeleteTarget({
        otId: existingOT[0],
        date: form.date,
        empName: emp ? emp[1] : (existingOT[3] || selectedEmp),
        empId: selectedEmp,
        hours: existingOT[6] || form.hours
      });
    }
  };

  const handleExecuteConfirmedDeleteOT = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Overtime', deleteTarget.otId);
      setForm({ ...form, hours: '' });
      setSelectedEmp('');
      setShowModal(false);
      setDeleteTarget(null);
      await loadData(true);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete overtime entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCellClick = (empId: string, date: string, currentHours: number) => {
    if (!canEdit) return;
    setSelectedEmp(empId);
    setForm({ date, hours: currentHours ? currentHours.toString() : '' });
    setShowModal(true);
  };

  const handleLogOT = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert('You do not have permission to log overtime records.');
      return;
    }
    if (!selectedEmp) return alert('Select an employee first');
    const emp = allEmployees.find(e => (e[0] || '').toUpperCase() === selectedEmp.toUpperCase()) || 
                employees.find(e => (e[0] || '').toUpperCase() === selectedEmp.toUpperCase());
    if (!emp) return alert(`Employee ID "${selectedEmp}" not found in directory.`);

    setIsSubmitting(true);
    const existingOT = otData.find(ot => (ot[2] || '').toUpperCase() === selectedEmp.toUpperCase() && ot[1] === form.date);
    if (existingOT) {
      const newValues = [...existingOT];
      newValues[6] = form.hours;
      try {
        await updateRowByPrimaryKey(spreadsheetId, 'Overtime', existingOT[0], newValues);
        setForm({ ...form, hours: '' });
        setSelectedEmp('');
        setShowModal(false);
        await loadData(true);
      } catch (err) { 
        alert('Failed to update overtime record.'); 
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const otId = `OT-${Date.now()}`;
    const values = [otId, form.date, emp[0], emp[1], emp[2], emp[3], form.hours];
    
    try {
      await appendRow(spreadsheetId, 'Overtime!A:G', [values]);
      setForm({ ...form, hours: '' });
      setSelectedEmp('');
      setShowModal(false);
      await loadData(true);
    } catch (err) { 
      alert('Failed to log overtime record.'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  const currentMonthStr = format(currentDate, 'yyyy-MM');
  
  // Filter month overtime records safely
  const monthOt = useMemo(() => {
    return otData.filter(ot => {
      const dateStr = ot[1] || '';
      if (dateStr.startsWith(currentMonthStr)) return true;
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return format(d, 'yyyy-MM') === currentMonthStr;
        }
      } catch {}
      return false;
    });
  }, [otData, currentMonthStr]);

  // Group by employee and build table rows
  const { tableData, totalMonthlyHours, totalMonthlyCost, employeeCountWithOt } = useMemo(() => {
    const empOtMap = new Map<string, EmployeeOtRow>();

    // 1. Build records for all authorized employees or employees with recorded OT
    if (!showOnlyRecorded) {
      employees.forEach(emp => {
        const empId = (emp[0] || '').trim();
        if (!empId) return;
        const otRate = parseFloat(emp[8] || '0') || 0;
        empOtMap.set(empId.toUpperCase(), {
          id: empId,
          name: emp[1] || '',
          designation: emp[2] || '',
          section: emp[3] || '',
          days: {},
          total: 0,
          otRate: otRate
        });
      });
    }

    // 2. Populate overtime hours
    monthOt.forEach(ot => {
      const empId = (ot[2] || '').trim();
      if (!empId) return;
      const hours = parseFloat(ot[6] || '0');
      if (isNaN(hours) || hours <= 0) return;

      const upperId = empId.toUpperCase();
      if (!empOtMap.has(upperId)) {
        const empData = allEmployees.find(e => (e[0] || '').trim().toUpperCase() === upperId) || 
                        employees.find(e => (e[0] || '').trim().toUpperCase() === upperId);
        const otRate = parseFloat(empData?.[8] || '0') || 0;
        empOtMap.set(upperId, {
          id: empId,
          name: ot[3] || empData?.[1] || '',
          designation: ot[4] || empData?.[2] || '',
          section: ot[5] || empData?.[3] || '',
          days: {},
          total: 0,
          otRate: otRate
        });
      }

      // Extract day number safely
      let day = 0;
      const dateStr = ot[1] || '';
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) day = parseInt(parts[2], 10);
          else if (parts[2].length === 4) day = parseInt(parts[0], 10);
        }
      }
      if (!day) {
        try {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) day = parsed.getDate();
        } catch {}
      }

      if (day >= 1 && day <= 31) {
        const row = empOtMap.get(upperId)!;
        row.days[day] = (row.days[day] || 0) + hours;
        row.total += hours;
      }
    });

    let allRows = Array.from(empOtMap.values());

    // Calculate totals across ALL matched records before search filter
    let sumHours = 0;
    let sumCost = 0;
    let countWithOt = 0;

    allRows.forEach(r => {
      sumHours += r.total;
      sumCost += r.total * (r.otRate || 0);
      if (r.total > 0) countWithOt++;
    });

    // Apply Department filter
    if (selectedDepartment !== 'ALL') {
      allRows = allRows.filter(r => (r.section || '').trim().toLowerCase() === selectedDepartment.toLowerCase());
    }

    // Apply Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      allRows = allRows.filter(r => 
        (r.id || '').toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.designation || '').toLowerCase().includes(q) ||
        (r.section || '').toLowerCase().includes(q)
      );
    }

    // If show only recorded is checked or if rows filtered
    if (showOnlyRecorded) {
      allRows = allRows.filter(r => r.total > 0);
    }

    allRows.sort((a, b) => a.id.localeCompare(b.id));

    return {
      tableData: allRows,
      totalMonthlyHours: sumHours,
      totalMonthlyCost: sumCost,
      employeeCountWithOt: countWithOt
    };
  }, [employees, allEmployees, monthOt, selectedDepartment, searchQuery, showOnlyRecorded]);

  const holidayDates = useMemo(() => {
    return new Set(holidays.map(h => h[0]));
  }, [holidays]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#337AB7]" />
        <p className="text-sm font-medium text-slate-500">Loading Overtime Roster & Calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Security Scope Banner */}
      {isRestrictedScope && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between text-amber-900 text-sm shadow-xs">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Security Access Scoped:</strong> You have overtime logging & view permissions for <strong>{employees.length} employee{employees.length !== 1 ? 's' : ''}</strong>
              {userSecurityScope?.supervisorName ? ` under Supervisor "${userSecurityScope.supervisorName}"` : ''}
              {userSecurityScope?.accessLimitType === 'department' && userSecurityScope?.assignedDepartment ? ` in Department "${userSecurityScope.assignedDepartment}"` : ''}.
            </span>
          </div>
          <span className="bg-amber-200/80 text-amber-800 text-xs px-2.5 py-0.5 rounded font-semibold uppercase tracking-wider">
            {userSecurityScope?.accessLimitType} Mode
          </span>
        </div>
      )}

      {/* Error Alert if any */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg flex items-center gap-2.5 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">{errorMsg}</div>
          <button onClick={() => loadData(true)} className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold rounded text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Header & Month Navigation */}
      <div className="bg-white border border-[#E6E9ED] p-4 rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#337AB7] rounded-lg border border-blue-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-200">
                {daysInMonth.length} Days
              </span>
            </div>
            <p className="text-xs text-slate-500">Monthly overtime logging, daily matrix & payable calculations</p>
          </div>

          <div className="flex items-center space-x-1.5 ml-2">
            <button 
              type="button"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))} 
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={() => setCurrentDate(new Date())} 
              className="px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Current
            </button>
            <button 
              type="button"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))} 
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => loadData(true)} 
            disabled={isRefreshing}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#337AB7]' : ''}`} />
          </button>
          
          {canEdit && (
            <>
              <button 
                type="button"
                onClick={() => setIsBulkUploadOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center shadow-xs"
              >
                <Upload className="w-4 h-4 mr-1.5" /> Bulk Upload
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSelectedEmp('');
                  setForm({ date: '', hours: '' });
                  setShowModal(true);
                }}
                className="bg-[#337AB7] hover:bg-[#286090] text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center shadow-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Log Overtime
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E6E9ED] p-3.5 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total OT Hours</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {totalMonthlyHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
        </div>

        <div className="bg-white border border-[#E6E9ED] p-3.5 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Estimated Payable</span>
            <span className="text-emerald-500 font-bold text-base">৳</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono">
            {totalMonthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white border border-[#E6E9ED] p-3.5 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Staff with Overtime</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {employeeCountWithOt} <span className="text-xs font-normal text-slate-500">/ {employees.length}</span>
          </div>
        </div>

        <div className="bg-white border border-[#E6E9ED] p-3.5 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Avg OT / Person</span>
            <CalendarIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {employeeCountWithOt > 0 ? (totalMonthlyHours / employeeCountWithOt).toFixed(1) : '0.0'} <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E6E9ED] p-3.5 rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ID, employee name, section..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#337AB7]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select 
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-xs focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={showOnlyRecorded}
              onChange={e => setShowOnlyRecorded(e.target.checked)}
              className="rounded text-[#337AB7] focus:ring-0"
            />
            <span>Show Only Recorded OT</span>
          </label>
          <span className="text-xs text-slate-400 font-mono font-medium">
            Showing {tableData.length} records
          </span>
        </div>
      </div>

      {/* Main Overtime Grid Table */}
      <div className="bg-white border border-[#E6E9ED] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-max w-full divide-y divide-slate-200 table-auto border-collapse text-left">
            <thead className="bg-[#F9F9F9] border-b border-slate-200 text-[#73879C]">
              <tr>
                <th className="px-3 py-2.5 border-r border-slate-200 text-center text-[12px] font-bold uppercase tracking-wider w-12">SL</th>
                <th className="px-3 py-2.5 border-r border-slate-200 text-left text-[12px] font-bold uppercase tracking-wider">ID No</th>
                <th className="px-3 py-2.5 border-r border-slate-200 text-left text-[12px] font-bold uppercase tracking-wider min-w-[140px]">Employee Name</th>
                <th className="px-3 py-2.5 border-r border-slate-200 text-left text-[12px] font-bold uppercase tracking-wider">Designation</th>
                <th className="px-3 py-2.5 border-r border-slate-200 text-left text-[12px] font-bold uppercase tracking-wider">Section</th>
                {daysInMonth.map(d => {
                  const isWknd = isFriday(d);
                  const isHol = holidayDates.has(format(d, 'yyyy-MM-dd'));
                  let headerBg = 'bg-[#F9F9F9] text-slate-700';
                  if (isHol) headerBg = 'bg-rose-100 text-rose-800 font-bold';
                  else if (isWknd) headerBg = 'bg-sky-100 text-sky-800 font-bold';
                  return (
                    <th 
                      key={d.toString()} 
                      className={`px-1.5 py-2 border-r border-slate-200 text-center text-[11px] font-semibold w-8 ${headerBg}`}
                      title={format(d, 'EEEE, MMM d, yyyy') + (isHol ? ' (Holiday)' : isWknd ? ' (Weekend)' : '')}
                    >
                      {format(d, 'd')}
                    </th>
                  );
                })}
                <th className="px-3 py-2.5 border-r border-slate-200 text-center text-[12px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">Total</th>
                <th className="px-3 py-2.5 border-r border-slate-200 text-center text-[12px] font-bold uppercase tracking-wider">OT Rate</th>
                <th className="px-3 py-2.5 text-center text-[12px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800">Payable</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
              {tableData.map((row, i) => (
                <tr key={`${row.id}-${i}`} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-3 py-2 border-r border-slate-200 text-center text-xs text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-xs font-mono font-bold text-indigo-700 whitespace-nowrap">{row.id}</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-xs font-semibold text-slate-900 whitespace-nowrap">{row.name}</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-xs text-slate-600 whitespace-nowrap">{row.designation}</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-xs text-slate-600 whitespace-nowrap">{row.section}</td>
                  {daysInMonth.map(d => {
                    const dayNum = parseInt(format(d, 'd'), 10);
                    const hours = row.days[dayNum];
                    const isWknd = isFriday(d);
                    const isHol = holidayDates.has(format(d, 'yyyy-MM-dd'));
                    
                    let cellBg = '';
                    if (hours && hours > 0) {
                      cellBg = 'bg-indigo-50/80 font-bold text-indigo-800';
                    } else if (isHol) {
                      cellBg = 'bg-rose-50/50 text-rose-300';
                    } else if (isWknd) {
                      cellBg = 'bg-sky-50/50 text-sky-300';
                    }

                    return (
                      <td 
                        key={d.toString()} 
                        onClick={() => handleCellClick(row.id, format(d, 'yyyy-MM-dd'), hours || 0)}
                        className={`px-1 py-1.5 border-r border-slate-200 text-center text-xs transition-colors ${cellBg} ${canEdit ? 'cursor-pointer hover:bg-amber-100 hover:text-amber-900' : ''}`}
                        title={canEdit ? `Click to log/edit OT for ${row.name} on ${format(d, 'MMM d, yyyy')}` : undefined}
                      >
                        {hours ? hours : ''}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 border-r border-slate-200 text-center text-xs font-mono font-bold text-slate-900 bg-slate-50/80">
                    {row.total > 0 ? row.total.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 text-center text-xs font-mono text-slate-600">
                    {(row.otRate || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-mono font-bold text-emerald-700 bg-emerald-50/50">
                    {row.total > 0 ? ((row.total || 0) * (row.otRate || 0)).toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={8 + daysInMonth.length} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">No overtime records found for {format(currentDate, 'MMMM yyyy')}.</p>
                      {canEdit && (
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedEmp(employees[0]?.[0] || '');
                            setForm({ date: format(currentDate, 'yyyy-MM-dd'), hours: '' });
                            setShowModal(true);
                          }}
                          className="mt-1 text-xs font-semibold text-[#337AB7] hover:underline"
                        >
                          + Log an Overtime entry now
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {tableData.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800 text-xs">
                <tr>
                  <td colSpan={5} className="px-3 py-2.5 text-right font-bold uppercase tracking-wider border-r border-slate-300">
                    Monthly Total:
                  </td>
                  {daysInMonth.map(d => {
                    const dayNum = parseInt(format(d, 'd'), 10);
                    let daySum = 0;
                    tableData.forEach(r => {
                      daySum += r.days[dayNum] || 0;
                    });
                    return (
                      <td key={d.toString()} className="px-1 py-2 text-center font-mono border-r border-slate-200 text-[11px]">
                        {daySum > 0 ? daySum.toFixed(0) : ''}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-indigo-900 border-r border-slate-300 bg-indigo-50">
                    {totalMonthlyHours.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-slate-400 border-r border-slate-300">-</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-800 bg-emerald-100/80">
                    {totalMonthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Log / Edit Overtime Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#337AB7] rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {otData.find(ot => (ot[2] || '').toUpperCase() === selectedEmp.toUpperCase() && ot[1] === form.date) ? 'Update Overtime' : 'Log Overtime'}
                  </h2>
                  <p className="text-xs text-slate-500">Record daily staff overtime hours</p>
                </div>
              </div>
              {otData.find(ot => (ot[2] || '').toUpperCase() === selectedEmp.toUpperCase() && ot[1] === form.date) && (
                <button 
                  type="button" 
                  onClick={handleDeleteOT} 
                  disabled={isSubmitting}
                  className="text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50" 
                  title="Delete this Overtime Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleLogOT} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <input 
                  list="employees-list"
                  required
                  value={selectedEmp} 
                  onChange={e => setSelectedEmp(e.target.value)} 
                  placeholder="Type ID or Name..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#337AB7]" 
                />
                <datalist id="employees-list">
                  {employees.map((e, idx) => (
                    <option key={`${e[0]}-${idx}`} value={e[0]}>{e[0]} - {e[1]} ({e[2]} • {e[3]})</option>
                  ))}
                </datalist>

                {selectedEmp && (
                  <div className="mt-1.5 p-2 bg-slate-50 rounded-md border border-slate-200 text-xs">
                    {(() => {
                      const emp = allEmployees.find(e => (e[0] || '').toUpperCase() === selectedEmp.toUpperCase()) || 
                                  employees.find(e => (e[0] || '').toUpperCase() === selectedEmp.toUpperCase());
                      if (emp) {
                        return (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-900">{emp[1]}</span>
                              <span className="text-slate-500 ml-1.5 font-mono">({emp[2]} • {emp[3]})</span>
                            </div>
                            <span className="font-mono text-indigo-600 font-semibold">Rate: {parseFloat(emp[8] || '0').toFixed(2)}</span>
                          </div>
                        );
                      }
                      return <span className="text-amber-700">Employee ID not found in roster</span>;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input 
                  required 
                  type="date" 
                  value={form.date} 
                  onChange={e => setForm({...form, date: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#337AB7]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  OT Hours <span className="text-rose-500">*</span>
                </label>
                <input 
                  required 
                  type="number" 
                  step="0.5" 
                  min="0.5"
                  max="24"
                  value={form.hours} 
                  onChange={e => setForm({...form, hours: e.target.value})} 
                  placeholder="e.g. 2 or 2.5"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#337AB7] font-mono" 
                />
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#337AB7] hover:bg-[#286090] text-white font-semibold text-xs rounded-lg transition-colors flex items-center shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    'Save Overtime'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isBulkUploadOpen && (
        <BulkUploadOTModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          spreadsheetId={spreadsheetId}
          allEmployees={allEmployees}
          otData={otData}
          onSuccess={() => {
            setIsBulkUploadOpen(false);
            loadData(true);
          }}
        />
      )}

      {/* Admin Password Protected Deletion Modal */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Overtime Entry"
        itemName={deleteTarget ? `${deleteTarget.empName} (${deleteTarget.empId})` : undefined}
        itemDetails={deleteTarget ? `Date: ${deleteTarget.date} | Logged Hours: ${deleteTarget.hours} hrs` : undefined}
        warningMessage="Deleting this overtime record will remove it from the payroll and overtime calculations. Enter the Admin Deletion Password to confirm."
        confirmButtonText="Verify & Delete Overtime"
        onConfirm={handleExecuteConfirmedDeleteOT}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

