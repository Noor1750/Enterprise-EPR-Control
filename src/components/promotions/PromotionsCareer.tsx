import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Award, Calendar, Search, Filter, Download, Plus, 
  ArrowRight, FileText, CheckCircle2, User, Building, Sparkles, 
  RotateCw, Printer, Trash2, Edit3, Eye, Clock, Check, AlertCircle,
  Briefcase, ChevronRight, DollarSign, Layers, BarChart2
} from 'lucide-react';
import { 
  EmployeePromotionRecord, 
  fetchEmployeePromotions, 
  deleteEmployeePromotion,
  saveLocalPromotions
} from '../../lib/promotionEngine';
import { Employee } from '../kpi/types';
import { EmployeeShiftState } from '../../lib/shiftEngine';
import { getRange } from '../../lib/sheets';
import { UserSecurityScope, canUserPerformAction } from '../../lib/security';
import EmployeePromotionModal from '../employee/EmployeePromotionModal';
import PromotionLetterModal from '../employee/PromotionLetterModal';
import EmployeeProfileModal from '../employee/EmployeeProfileModal';
import { calculateTenure } from '../employee/employeeTypes';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface PromotionsCareerProps {
  spreadsheetId: string;
  userSecurityScope?: UserSecurityScope;
  adminDisplayName?: string;
  onNavigate?: (tab: string, extra?: any) => void;
}

type TabType = 'registry' | 'timeline' | 'eligibility' | 'analytics';
type ViewMode = 'table' | 'cards';

export default function PromotionsCareer({
  spreadsheetId,
  userSecurityScope,
  adminDisplayName,
  onNavigate
}: PromotionsCareerProps) {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data State
  const [promotions, setPromotions] = useState<EmployeePromotionRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'increment-desc'>('date-desc');

  // Modals State
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);
  const [editingPromotionRecord, setEditingPromotionRecord] = useState<EmployeePromotionRecord | null>(null);
  const [preselectedEmp, setPreselectedEmp] = useState<Employee | null>(null);
  const [selectedLetterRecord, setSelectedLetterRecord] = useState<EmployeePromotionRecord | null>(null);
  const [profileModalEmployee, setProfileModalEmployee] = useState<Employee | null>(null);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<EmployeePromotionRecord | null>(null);

  // Permission Check
  const canEdit = useMemo(() => {
    if (!userSecurityScope) return true;
    if (userSecurityScope.isAdmin) return true;
    return canUserPerformAction(userSecurityScope, 'employee_directory', 'edit') ||
           canUserPerformAction(userSecurityScope, 'promotions', 'edit');
  }, [userSecurityScope]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load Data
  const loadData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Fetch Promotions
      const promRes = await fetchEmployeePromotions(spreadsheetId);
      setPromotions(Array.isArray(promRes) ? promRes : []);

      // 2. Fetch Employees Directory
      let empList: Employee[] = [];
      try {
        const cached = localStorage.getItem('erp_employees_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            empList = parsed;
          }
        }
      } catch {
        // ignore
      }

      if (empList.length === 0 && spreadsheetId && spreadsheetId !== 'local-storage-db') {
        try {
          const raw = await getRange(spreadsheetId, 'Employees!A2:Z');
          if (raw && raw.length > 0) {
            empList = raw.map(r => ({
              id: String(r[0] || '').trim(),
              name: String(r[1] || '').trim(),
              designation: String(r[2] || '').trim(),
              department: String(r[3] || '').trim(),
              dateOfJoin: String(r[4] || '').trim(),
              category: (r[5] || 'Non-Management') as any,
              email: String(r[8] || '').trim(),
              status: (r[9] || 'Active') as any,
              phone: String(r[11] || '').trim(),
              profilePicture: String(r[16] || '').trim(),
              dateOfBirth: String(r[21] || '').trim()
            })).filter(e => e.id && e.name);
          }
        } catch (e) {
          console.warn('Could not load Employees sheet:', e);
        }
      }

      setEmployees(empList);
    } catch (err) {
      console.error('Failed to load promotions & career data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const handleUpdate = () => {
      loadData(false);
    };

    window.addEventListener('erp-promotions-updated', handleUpdate);
    window.addEventListener('erp-db-updated', handleUpdate);

    // Listen for command palette action
    const handleCommandAction = (e: any) => {
      if (e.detail?.module === 'promotions') {
        if (e.detail.action === 'record-promotion') {
          setEditingPromotionRecord(null);
          setPreselectedEmp(null);
          setIsPromotionModalOpen(true);
        }
      }
    };
    window.addEventListener('erp-command-action', handleCommandAction);

    return () => {
      window.removeEventListener('erp-promotions-updated', handleUpdate);
      window.removeEventListener('erp-db-updated', handleUpdate);
      window.removeEventListener('erp-command-action', handleCommandAction);
    };
  }, [spreadsheetId]);

  // Compute Available Years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    promotions.forEach(p => {
      if (p.promotionYear) years.add(p.promotionYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [promotions]);

  // Compute Available Departments
  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    promotions.forEach(p => {
      if (p.department) depts.add(p.department.trim());
    });
    employees.forEach(e => {
      if (e.department) depts.add(e.department.trim());
    });
    return ['All', ...Array.from(depts).sort()];
  }, [promotions, employees]);

  // Promotion Categories
  const promotionTypes = [
    'All',
    'Performance Based',
    'Annual Appraisal',
    'Merit / Tenure',
    'Designation Upgrade',
    'Special Role Change'
  ];

  // Filtered & Sorted Promotions
  const filteredPromotions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let result = promotions.filter(p => {
      if (q) {
        const match = 
          p.id.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          p.employeeName.toLowerCase().includes(q) ||
          p.newDesignation.toLowerCase().includes(q) ||
          p.previousDesignation.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          (p.approvedBy && p.approvedBy.toLowerCase().includes(q)) ||
          (p.remarks && p.remarks.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedYear !== 'All' && String(p.promotionYear) !== selectedYear) return false;
      if (selectedDept !== 'All' && p.department !== selectedDept) return false;
      if (selectedType !== 'All' && p.promotionType !== selectedType) return false;
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.promotionDate).getTime() - new Date(b.promotionDate).getTime();
      }
      if (sortBy === 'name-asc') {
        return a.employeeName.localeCompare(b.employeeName);
      }
      if (sortBy === 'increment-desc') {
        const incA = computeIncrementPercent(a.previousSalary, a.newSalary);
        const incB = computeIncrementPercent(b.previousSalary, b.newSalary);
        return incB - incA;
      }
      return 0;
    });

    return result;
  }, [promotions, searchTerm, selectedYear, selectedDept, selectedType, sortBy]);

  // Helper: compute increment percentage
  function computeIncrementPercent(prev?: string, next?: string): number {
    const p = parseFloat(String(prev || '0').replace(/[^0-9.]/g, ''));
    const n = parseFloat(String(next || '0').replace(/[^0-9.]/g, ''));
    if (!p || !n || n <= p) return 0;
    return ((n - p) / p) * 100;
  }

  // Summary Metrics
  const currentYear = new Date().getFullYear();
  const metrics = useMemo(() => {
    const totalPromotions = promotions.length;
    const thisYearCount = promotions.filter(p => p.promotionYear === currentYear).length;
    const uniqueEmployees = new Set(promotions.map(p => p.employeeId.trim().toUpperCase())).size;

    // Average increment
    let totalPct = 0;
    let validIncCount = 0;
    let totalAmtInc = 0;

    promotions.forEach(p => {
      const pNum = parseFloat(String(p.previousSalary || '0').replace(/[^0-9.]/g, ''));
      const nNum = parseFloat(String(p.newSalary || '0').replace(/[^0-9.]/g, ''));
      if (pNum > 0 && nNum > pNum) {
        totalPct += ((nNum - pNum) / pNum) * 100;
        totalAmtInc += (nNum - pNum);
        validIncCount++;
      }
    });

    const avgIncrementPct = validIncCount > 0 ? (totalPct / validIncCount).toFixed(1) : '0';
    const avgIncrementAmt = validIncCount > 0 ? Math.round(totalAmtInc / validIncCount).toLocaleString() : '0';

    // Eligible for review: Active staff with service > 1 year who haven't had promotion in last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const eligibleCount = employees.filter(e => {
      if (e.status && e.status !== 'Active') return false;
      if (!e.dateOfJoin) return false;
      const joinDate = new Date(e.dateOfJoin);
      if (joinDate > oneYearAgo) return false; // less than 1 yr tenure

      const empProms = promotions.filter(p => p.employeeId.trim().toUpperCase() === e.id.trim().toUpperCase());
      if (empProms.length === 0) return true; // never promoted & >1 yr service

      // Check most recent promotion date
      const latestProm = empProms.sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime())[0];
      const promDate = new Date(latestProm.promotionDate);
      return promDate < oneYearAgo;
    }).length;

    return {
      totalPromotions,
      thisYearCount,
      uniqueEmployees,
      avgIncrementPct,
      avgIncrementAmt,
      eligibleCount
    };
  }, [promotions, employees, currentYear]);

  // Handle Record / Edit Completion
  const handlePromotionRecorded = (newRecord: EmployeePromotionRecord) => {
    setPromotions(prev => [newRecord, ...prev]);
    showToast(`🎉 Promotion recorded for ${newRecord.employeeName} to ${newRecord.newDesignation}!`);
  };

  const handlePromotionUpdated = (updatedRecord: EmployeePromotionRecord) => {
    setPromotions(prev => prev.map(p => p.id === updatedRecord.id ? updatedRecord : p));
    showToast(`✓ Promotion record ${updatedRecord.id} updated successfully.`);
  };

  // Handle Delete Record
  const confirmDelete = async () => {
    if (!deleteConfirmRecord) return;
    try {
      await deleteEmployeePromotion(deleteConfirmRecord.id, spreadsheetId);
      setPromotions(prev => prev.filter(p => p.id !== deleteConfirmRecord.id));
      showToast(`Record ${deleteConfirmRecord.id} deleted successfully.`);
      setDeleteConfirmRecord(null);
    } catch (err) {
      console.error('Failed to delete promotion record:', err);
      showToast('Failed to delete promotion record.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredPromotions.map(p => {
      const prevSal = parseFloat(String(p.previousSalary || '0').replace(/[^0-9.]/g, ''));
      const nextSal = parseFloat(String(p.newSalary || '0').replace(/[^0-9.]/g, ''));
      const incPct = prevSal > 0 && nextSal > prevSal ? `${(((nextSal - prevSal) / prevSal) * 100).toFixed(1)}%` : '—';
      const incAmt = prevSal > 0 && nextSal > prevSal ? (nextSal - prevSal).toLocaleString() : '—';

      return {
        'Promotion ID': p.id,
        'Staff ID': p.employeeId,
        'Staff Name': p.employeeName,
        'Department': p.department,
        'Promotion Year': p.promotionYear,
        'Promotion Date': p.promotionDate,
        'Previous Title': p.previousDesignation,
        'New Title': p.newDesignation,
        'Previous Salary': p.previousSalary || '—',
        'New Salary': p.newSalary || '—',
        'Increment %': incPct,
        'Increment Amount': incAmt,
        'Promotion Category': p.promotionType,
        'Approved By': p.approvedBy,
        'Remarks': p.remarks || '',
        'Created At': p.createdAt
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promotions Registry');
    XLSX.writeFile(wb, `Promotions_Registry_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Print View
  const handlePrint = () => {
    window.print();
  };

  // Grouped Promotions by Employee for Timeline Tab
  const employeeTimelines = useMemo(() => {
    const map = new Map<string, { employee: { id: string; name: string; department: string }; history: EmployeePromotionRecord[] }>();

    promotions.forEach(p => {
      const cleanId = p.employeeId.trim().toUpperCase();
      if (!map.has(cleanId)) {
        map.set(cleanId, {
          employee: { id: p.employeeId, name: p.employeeName, department: p.department },
          history: []
        });
      }
      map.get(cleanId)!.history.push(p);
    });

    // Sort history chronologically (earliest to latest)
    const result = Array.from(map.values()).map(item => ({
      ...item,
      history: [...item.history].sort((a, b) => new Date(a.promotionDate).getTime() - new Date(b.promotionDate).getTime())
    }));

    // Sort by employee name
    return result.sort((a, b) => a.employee.name.localeCompare(b.employee.name));
  }, [promotions]);

  // Candidates for Eligibility Tab
  const eligibilityCandidates = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return employees.map(emp => {
      const empProms = promotions
        .filter(p => p.employeeId.trim().toUpperCase() === emp.id.trim().toUpperCase())
        .sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());

      const latestPromotion = empProms[0] || null;
      const joinDate = emp.dateOfJoin ? new Date(emp.dateOfJoin) : null;
      const tenureStr = emp.dateOfJoin ? calculateTenure(emp.dateOfJoin) : 'Unknown';

      // Status
      let status: 'due' | 'eligible' | 'recent' | 'new';
      let statusLabel: string;
      let statusColor: string;

      if (!joinDate || joinDate > oneYearAgo) {
        status = 'new';
        statusLabel = 'New Staff (<1 yr)';
        statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
      } else if (latestPromotion) {
        const lastDate = new Date(latestPromotion.promotionDate);
        if (lastDate < oneYearAgo) {
          status = 'due';
          statusLabel = 'Eligible for Appraisal';
          statusColor = 'bg-amber-100 text-amber-800 border-amber-300';
        } else {
          status = 'recent';
          statusLabel = `Promoted ${latestPromotion.promotionYear}`;
          statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        }
      } else {
        status = 'due';
        statusLabel = 'Due for Career Review';
        statusColor = 'bg-rose-100 text-rose-800 border-rose-300';
      }

      return {
        emp,
        tenureStr,
        promotionsCount: empProms.length,
        latestPromotion,
        status,
        statusLabel,
        statusColor
      };
    }).sort((a, b) => {
      // Prioritize due candidates
      if (a.status === 'due' && b.status !== 'due') return -1;
      if (a.status !== 'due' && b.status === 'due') return 1;
      return a.emp.name.localeCompare(b.emp.name);
    });
  }, [employees, promotions]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-rose-500/40 text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Promotions & Career Progression
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                {promotions.length} Records Logged
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              Comprehensive management of staff advancements, designation upgrades, salary increments & official appointment letters.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh promotion records"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Export full promotions registry to Microsoft Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Print registry report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {canEdit && (
            <button
              onClick={() => {
                setEditingPromotionRecord(null);
                setPreselectedEmp(null);
                setIsPromotionModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F87C6C] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
              title="Record a new employee promotion and designation upgrade"
            >
              <Plus className="w-4 h-4" />
              <span>Record Promotion</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-2xs font-bold uppercase tracking-wider">Total Promotions</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{metrics.totalPromotions}</div>
            <p className="text-3xs text-slate-400 font-medium mt-0.5">All-time corporate records</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-2xs font-bold uppercase tracking-wider">Promoted in {currentYear}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">{metrics.thisYearCount}</div>
            <p className="text-3xs text-slate-400 font-medium mt-0.5">Active year advancements</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-2xs font-bold uppercase tracking-wider">Unique Staff Advanced</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{metrics.uniqueEmployees}</div>
            <p className="text-3xs text-slate-400 font-medium mt-0.5">Individual talent recognized</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-2xs font-bold uppercase tracking-wider">Avg Salary Increment</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">+{metrics.avgIncrementPct}%</div>
            <p className="text-3xs text-slate-400 font-medium mt-0.5">Avg +৳{metrics.avgIncrementAmt} / mo</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-2xs font-bold uppercase tracking-wider">Appraisal Candidates</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{metrics.eligibleCount}</div>
            <p className="text-3xs text-slate-400 font-medium mt-0.5">&gt;1 yr tenure eligible for review</p>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('registry')}
            className={`pb-3 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'registry'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Promotions Registry</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-extrabold bg-slate-100 text-slate-700">
              {filteredPromotions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Career Timelines</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-extrabold bg-slate-100 text-slate-700">
              {employeeTimelines.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('eligibility')}
            className={`pb-3 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'eligibility'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Appraisal Candidates</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-extrabold bg-rose-100 text-rose-800">
              {metrics.eligibleCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics & Trends</span>
          </button>
        </div>

        {/* View Mode Switcher (Visible on Registry Tab) */}
        {activeTab === 'registry' && (
          <div className="flex items-center gap-1 pb-2 shrink-0">
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: PROMOTIONS REGISTRY */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search Query */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, title, approver..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 font-medium text-slate-800"
                />
              </div>

              {/* Year Filter */}
              <div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 font-semibold text-slate-800"
                >
                  <option value="All">All Promotion Years</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={String(yr)}>Year {yr}</option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 font-semibold text-slate-800"
                >
                  {availableDepts.map(dept => (
                    <option key={dept} value={dept}>
                      {dept === 'All' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Promotion Category */}
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 font-semibold text-slate-800"
                >
                  {promotionTypes.map(t => (
                    <option key={t} value={t}>
                      {t === 'All' ? 'All Promotion Types' : t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Chips & Active Filters Indicator */}
            <div className="flex items-center justify-between text-2xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-400">Sort By:</span>
                <button
                  onClick={() => setSortBy('date-desc')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    sortBy === 'date-desc' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'hover:bg-slate-100'
                  }`}
                >
                  Newest First
                </button>
                <button
                  onClick={() => setSortBy('date-asc')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    sortBy === 'date-asc' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'hover:bg-slate-100'
                  }`}
                >
                  Oldest First
                </button>
                <button
                  onClick={() => setSortBy('increment-desc')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    sortBy === 'increment-desc' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'hover:bg-slate-100'
                  }`}
                >
                  Highest Increment %
                </button>
                <button
                  onClick={() => setSortBy('name-asc')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    sortBy === 'name-asc' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'hover:bg-slate-100'
                  }`}
                >
                  Employee Name
                </button>
              </div>

              {(searchTerm || selectedYear !== 'All' || selectedDept !== 'All' || selectedType !== 'All') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedYear('All');
                    setSelectedDept('All');
                    setSelectedType('All');
                  }}
                  className="font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-3xs">
                      <th className="py-3 px-4">Ref & Date</th>
                      <th className="py-3 px-4">Employee Details</th>
                      <th className="py-3 px-4">Career Advancement</th>
                      <th className="py-3 px-4">Salary Revision</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Approved By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPromotions.length > 0 ? (
                      filteredPromotions.map((record) => {
                        const prevSal = parseFloat(String(record.previousSalary || '0').replace(/[^0-9.]/g, ''));
                        const nextSal = parseFloat(String(record.newSalary || '0').replace(/[^0-9.]/g, ''));
                        const incPct = prevSal > 0 && nextSal > prevSal ? (((nextSal - prevSal) / prevSal) * 100).toFixed(1) : null;

                        return (
                          <tr key={record.id} className="hover:bg-slate-50/70 transition-colors group">
                            {/* Ref & Date */}
                            <td className="py-3 px-4">
                              <div className="font-mono text-3xs font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                {record.id}
                              </div>
                              <div className="text-2xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{record.promotionDate}</span>
                              </div>
                            </td>

                            {/* Employee */}
                            <td className="py-3 px-4">
                              <div 
                                onClick={() => {
                                  const matched = employees.find(e => e.id.toLowerCase() === record.employeeId.toLowerCase());
                                  if (matched) setProfileModalEmployee(matched);
                                }}
                                className="font-bold text-slate-900 text-xs hover:text-rose-600 transition cursor-pointer flex items-center gap-1.5"
                              >
                                <span>{record.employeeName}</span>
                              </div>
                              <div className="text-3xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                  {record.employeeId}
                                </span>
                                <span>•</span>
                                <span className="font-medium">{record.department}</span>
                              </div>
                            </td>

                            {/* Designation Change */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-500 font-medium text-2xs line-through opacity-80">
                                  {record.previousDesignation}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-slate-900 font-black text-xs bg-rose-50 text-rose-900 px-2 py-0.5 rounded-md border border-rose-200">
                                  {record.newDesignation}
                                </span>
                              </div>
                              {record.remarks && (
                                <p className="text-3xs text-slate-500 mt-1 italic line-clamp-1 max-w-xs">
                                  &ldquo;{record.remarks}&rdquo;
                                </p>
                              )}
                            </td>

                            {/* Salary Change */}
                            <td className="py-3 px-4">
                              {nextSal > 0 ? (
                                <div>
                                  <div className="font-bold text-slate-900 text-2xs flex items-center gap-1">
                                    <span>৳{nextSal.toLocaleString()}</span>
                                    {incPct && (
                                      <span className="text-3xs font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        +{incPct}%
                                      </span>
                                    )}
                                  </div>
                                  {prevSal > 0 && (
                                    <span className="text-3xs text-slate-400 block font-normal">
                                      from ৳{prevSal.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-3xs text-slate-400 font-medium">Designation Only</span>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                <span>{record.promotionType}</span>
                              </span>
                            </td>

                            {/* Approved By */}
                            <td className="py-3 px-4">
                              <div className="text-2xs font-semibold text-slate-800">
                                {record.approvedBy || 'HR Admin'}
                              </div>
                              <span className="text-3xs text-slate-400 block">Authority</span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setSelectedLetterRecord(record)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="View and Print Official Appointment Letter"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>

                                {canEdit && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingPromotionRecord(record);
                                        setIsPromotionModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                                      title="Edit Promotion Details"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => setDeleteConfirmRecord(record)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-600">No promotion records match your filter criteria.</p>
                          <p className="text-3xs text-slate-400 mt-0.5">Try adjusting your search keywords or resetting filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPromotions.length > 0 ? (
                filteredPromotions.map((record) => {
                  const prevSal = parseFloat(String(record.previousSalary || '0').replace(/[^0-9.]/g, ''));
                  const nextSal = parseFloat(String(record.newSalary || '0').replace(/[^0-9.]/g, ''));
                  const incPct = prevSal > 0 && nextSal > prevSal ? (((nextSal - prevSal) / prevSal) * 100).toFixed(1) : null;

                  return (
                    <div
                      key={record.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Top Meta Bar */}
                        <div className="flex items-center justify-between text-2xs mb-3">
                          <span className="font-mono text-3xs font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {record.id}
                          </span>
                          <span className="text-3xs font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {record.promotionDate}
                          </span>
                        </div>

                        {/* Employee Details */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                            {record.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 
                              onClick={() => {
                                const matched = employees.find(e => e.id.toLowerCase() === record.employeeId.toLowerCase());
                                if (matched) setProfileModalEmployee(matched);
                              }}
                              className="text-sm font-bold text-slate-900 truncate hover:text-rose-600 cursor-pointer"
                            >
                              {record.employeeName}
                            </h3>
                            <div className="text-3xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                {record.employeeId}
                              </span>
                              <span>•</span>
                              <span className="font-medium truncate">{record.department}</span>
                            </div>
                          </div>
                        </div>

                        {/* Designation Upgrade Box */}
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                          <div className="text-3xs uppercase font-bold text-slate-400">Designation Escalation</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-2xs text-slate-500 line-through">
                              {record.previousDesignation}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-black text-rose-900 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                              {record.newDesignation}
                            </span>
                          </div>

                          {/* Salary Information */}
                          {nextSal > 0 && (
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-2xs">
                              <span className="text-slate-500 font-medium">New Salary:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900">৳{nextSal.toLocaleString()}</span>
                                {incPct && (
                                  <span className="text-3xs font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    +{incPct}%
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {record.remarks && (
                          <p className="text-3xs text-slate-500 italic mt-3 line-clamp-2">
                            &ldquo;{record.remarks}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
                        <span className="text-3xs font-bold text-slate-400 truncate max-w-[130px]">
                          By {record.approvedBy}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedLetterRecord(record)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-3xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Letter</span>
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPromotionRecord(record);
                                  setIsPromotionModalOpen(true);
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmRecord(record)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No promotion records match your filter criteria.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAREER PROGRESSION TIMELINES */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-sm font-black text-slate-900">Career Progression Pathways</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual roadmap of internal staff advancements from initial recruitment to current executive or lead titles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employeeTimelines.map(group => {
              const matchedEmp = employees.find(e => e.id.toLowerCase() === group.employee.id.toLowerCase());
              return (
                <div key={group.employee.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                  {/* Employee Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center justify-center text-sm">
                        {group.employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 
                          onClick={() => matchedEmp && setProfileModalEmployee(matchedEmp)}
                          className="text-xs font-bold text-slate-900 hover:text-rose-600 cursor-pointer"
                        >
                          {group.employee.name}
                        </h3>
                        <div className="text-3xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                            {group.employee.id}
                          </span>
                          <span>•</span>
                          <span>{group.employee.department}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-3xs font-extrabold bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                      {group.history.length} {group.history.length === 1 ? 'Promotion' : 'Promotions'}
                    </span>
                  </div>

                  {/* Vertical Progression Path */}
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-rose-200">
                    {group.history.map((h, idx) => (
                      <div key={h.id} className="relative">
                        {/* Milestone dot */}
                        <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-rose-500 flex items-center justify-center shadow-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        </div>

                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-3xs">
                            <span className="font-bold text-rose-700">{h.promotionDate}</span>
                            <span className="font-mono text-slate-400">{h.id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-3xs text-slate-400 line-through">{h.previousDesignation}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            <span className="text-xs font-black text-slate-900">{h.newDesignation}</span>
                          </div>
                          {h.newSalary && (
                            <div className="text-3xs text-emerald-700 font-bold">
                              Salary: ৳{parseFloat(h.newSalary.replace(/[^0-9.]/g, '')).toLocaleString()}
                            </div>
                          )}
                          {h.remarks && (
                            <p className="text-3xs text-slate-500 italic mt-1">&ldquo;{h.remarks}&rdquo;</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => {
                          setEditingPromotionRecord(null);
                          setPreselectedEmp(matchedEmp || null);
                          setIsPromotionModalOpen(true);
                        }}
                        className="text-3xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Promote Further</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: APPRAISAL CANDIDATES */}
      {activeTab === 'eligibility' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-sm font-black text-slate-900">Appraisal & Career Advancement Review</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active company employees analyzed by service tenure and last promotion date. Staff with over 1 year of tenure are flagged for appraisal reviews.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-3xs">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Current Designation</th>
                    <th className="py-3 px-4">Date of Join & Tenure</th>
                    <th className="py-3 px-4">Last Promotion</th>
                    <th className="py-3 px-4">Appraisal Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligibilityCandidates.map(({ emp, tenureStr, promotionsCount, latestPromotion, statusLabel, statusColor }) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div 
                          onClick={() => setProfileModalEmployee(emp)}
                          className="font-bold text-slate-900 hover:text-rose-600 cursor-pointer"
                        >
                          {emp.name}
                        </div>
                        <div className="text-3xs text-slate-500 font-mono mt-0.5">{emp.id} • {emp.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{emp.designation || 'Staff'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-2xs font-semibold text-slate-800">{emp.dateOfJoin || '—'}</div>
                        <div className="text-3xs text-slate-400 font-medium">{tenureStr}</div>
                      </td>
                      <td className="py-3 px-4">
                        {latestPromotion ? (
                          <div>
                            <span className="font-bold text-slate-800 text-2xs">{latestPromotion.promotionDate}</span>
                            <span className="text-3xs text-slate-400 block">{latestPromotion.newDesignation}</span>
                          </div>
                        ) : (
                          <span className="text-3xs text-slate-400 font-medium">Never Promoted</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-3xs font-extrabold border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingPromotionRecord(null);
                              setPreselectedEmp(emp);
                              setIsPromotionModalOpen(true);
                            }}
                            className="px-3 py-1 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-lg text-3xs font-bold shadow-2xs transition cursor-pointer"
                          >
                            Promote
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS & TRENDS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-sm font-black text-slate-900">Promotion Demographics & Distribution</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of advancement milestones across corporate departments and appraisal categories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Promotions by Department</h3>
              <div className="space-y-2.5">
                {availableDepts.filter(d => d !== 'All').map(dept => {
                  const count = promotions.filter(p => p.department === dept).length;
                  const pct = promotions.length > 0 ? ((count / promotions.length) * 100).toFixed(0) : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between text-2xs font-semibold text-slate-700">
                        <span>{dept}</span>
                        <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Promotion Types Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Promotions by Category</h3>
              <div className="space-y-2.5">
                {promotionTypes.filter(t => t !== 'All').map(type => {
                  const count = promotions.filter(p => p.promotionType === type).length;
                  const pct = promotions.length > 0 ? ((count / promotions.length) * 100).toFixed(0) : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-2xs font-semibold text-slate-700">
                        <span>{type}</span>
                        <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD OR EDIT PROMOTION */}
      <EmployeePromotionModal
        isOpen={isPromotionModalOpen}
        onClose={() => {
          setIsPromotionModalOpen(false);
          setEditingPromotionRecord(null);
          setPreselectedEmp(null);
        }}
        employees={employees}
        preselectedEmployee={preselectedEmp}
        editRecord={editingPromotionRecord}
        spreadsheetId={spreadsheetId}
        adminUserName={adminDisplayName}
        onPromotionRecorded={handlePromotionRecorded}
        onPromotionUpdated={handlePromotionUpdated}
        onViewLetter={(record) => setSelectedLetterRecord(record)}
      />

      {/* MODAL 2: OFFICIAL PROMOTION LETTER */}
      <PromotionLetterModal
        isOpen={Boolean(selectedLetterRecord)}
        onClose={() => setSelectedLetterRecord(null)}
        promotion={selectedLetterRecord}
      />

      {/* MODAL 3: EMPLOYEE PROFILE */}
      <EmployeeProfileModal
        employee={profileModalEmployee as any}
        spreadsheetId={spreadsheetId}
        onClose={() => setProfileModalEmployee(null)}
        onEdit={() => {}}
        onOpenShift={() => {}}
        onOpenHistory={() => {}}
        onPromote={(emp) => {
          setProfileModalEmployee(null);
          setEditingPromotionRecord(null);
          setPreselectedEmp(emp as any);
          setIsPromotionModalOpen(true);
        }}
      />

      {/* MODAL 4: DELETE CONFIRMATION DIALOG */}
      {deleteConfirmRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 text-center">Delete Promotion Record?</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to remove promotion record <strong className="font-mono text-slate-800">{deleteConfirmRecord.id}</strong> for <strong>{deleteConfirmRecord.employeeName}</strong>? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRecord(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
