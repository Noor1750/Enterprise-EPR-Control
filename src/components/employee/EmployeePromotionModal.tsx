import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Award, Calendar, User, Briefcase, TrendingUp, DollarSign, 
  CheckCircle2, AlertCircle, Sparkles, ShieldCheck, ArrowRight, Save 
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { EmployeeShiftState } from '../../lib/shiftEngine';
import { 
  EmployeePromotionRecord, 
  recordEmployeePromotion,
  updateEmployeePromotion 
} from '../../lib/promotionEngine';
import { calculateTenure } from './employeeTypes';
import { format } from 'date-fns';

interface EmployeePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: (Employee | EmployeeShiftState)[];
  preselectedEmployee?: (Employee | EmployeeShiftState) | null;
  editRecord?: EmployeePromotionRecord | null;
  spreadsheetId?: string;
  adminUserName?: string;
  onPromotionRecorded: (newRecord: EmployeePromotionRecord) => void;
  onPromotionUpdated?: (updatedRecord: EmployeePromotionRecord) => void;
  onViewLetter?: (record: EmployeePromotionRecord) => void;
}

// Helper to format a professional human display name from email/username/input
export function formatAdminDisplayName(
  input?: string | null,
  employeesList?: (Employee | EmployeeShiftState)[]
): string {
  if (!input || !input.trim()) return 'Admin Authority';
  const val = input.trim();

  // 1. Check if input matches an employee email or ID
  if (employeesList && employeesList.length > 0) {
    const matched = employeesList.find(e => 
      ((e as any).email && (e as any).email.toLowerCase() === val.toLowerCase()) ||
      (e.id && e.id.toLowerCase() === val.toLowerCase())
    );
    if (matched && matched.name) return matched.name;
  }

  // 2. If it's an email address like noor.alam1750@gmail.com
  if (val.includes('@')) {
    const local = val.split('@')[0];
    // Remove numbers and separate on dots, dashes, underscores
    const cleaned = local.replace(/[0-9]+/g, ' ').replace(/[._-]+/g, ' ').trim();
    if (cleaned) {
      return cleaned
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // 3. If dot-separated like noor.alam
  if (val.includes('.') && !val.includes(' ')) {
    const cleaned = val.replace(/[0-9]+/g, ' ').replace(/[._-]+/g, ' ').trim();
    if (cleaned) {
      return cleaned
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return val;
}

export default function EmployeePromotionModal({
  isOpen,
  onClose,
  employees,
  preselectedEmployee,
  editRecord,
  spreadsheetId,
  adminUserName = 'Management Admin',
  onPromotionRecorded,
  onPromotionUpdated,
  onViewLetter
}: EmployeePromotionModalProps) {
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Format admin display name to ensure it's a real person's name, never a raw email address
  const resolvedAdminName = useMemo(() => {
    return formatAdminDisplayName(adminUserName, employees);
  }, [adminUserName, employees]);

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [promotionDate, setPromotionDate] = useState<string>(todayStr);
  const [promotionYear, setPromotionYear] = useState<number>(currentYear);
  const [newDesignation, setNewDesignation] = useState<string>('');
  const [promotionType, setPromotionType] = useState<EmployeePromotionRecord['promotionType']>('Performance Based');
  const [newSalary, setNewSalary] = useState<string>('');
  const [approvedBy, setApprovedBy] = useState<string>(resolvedAdminName);
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize preselected employee or editRecord
  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setSelectedEmpId(editRecord.employeeId);
        setPromotionDate(editRecord.promotionDate || todayStr);
        setPromotionYear(editRecord.promotionYear || currentYear);
        setNewDesignation(editRecord.newDesignation || '');
        setPromotionType(editRecord.promotionType || 'Performance Based');
        setNewSalary(editRecord.newSalary || '');
        setApprovedBy(editRecord.approvedBy || resolvedAdminName);
        setRemarks(editRecord.remarks || '');
      } else if (preselectedEmployee) {
        setSelectedEmpId(preselectedEmployee.id);
        setPromotionDate(todayStr);
        setPromotionYear(currentYear);
        setNewDesignation('');
        setPromotionType('Performance Based');
        setNewSalary('');
        setApprovedBy(resolvedAdminName);
        setRemarks('');
      } else if (employees.length > 0 && !selectedEmpId) {
        setSelectedEmpId(employees[0].id);
        setPromotionDate(todayStr);
        setPromotionYear(currentYear);
        setNewDesignation('');
        setPromotionType('Performance Based');
        setNewSalary('');
        setApprovedBy(resolvedAdminName);
        setRemarks('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, editRecord, preselectedEmployee, employees, resolvedAdminName, todayStr, currentYear]);

  const activeEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || preselectedEmployee || null;
  }, [employees, selectedEmpId, preselectedEmployee]);

  // When date changes, update year
  const handleDateChange = (val: string) => {
    setPromotionDate(val);
    try {
      const parsedYear = new Date(val).getFullYear();
      if (!isNaN(parsedYear)) {
        setPromotionYear(parsedYear);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee && !editRecord) {
      setErrorMsg('Please select an employee to promote.');
      return;
    }
    if (!newDesignation.trim()) {
      setErrorMsg('Please enter the New Designation / Title.');
      return;
    }
    const currentDesig = activeEmployee?.designation || editRecord?.previousDesignation || '';
    if (newDesignation.trim().toLowerCase() === currentDesig.trim().toLowerCase()) {
      setErrorMsg('New designation must differ from the previous designation.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (editRecord) {
        const updated = await updateEmployeePromotion({
          ...editRecord,
          promotionYear,
          promotionDate,
          newDesignation: newDesignation.trim(),
          newSalary: newSalary.trim(),
          promotionType,
          approvedBy: approvedBy.trim() || adminUserName,
          remarks: remarks.trim()
        }, spreadsheetId);

        if (onPromotionUpdated) {
          onPromotionUpdated(updated);
        }
        setIsSaving(false);
        onClose();
      } else {
        const record = await recordEmployeePromotion({
          employeeId: activeEmployee!.id,
          employeeName: activeEmployee!.name,
          department: activeEmployee!.department,
          promotionYear,
          promotionDate,
          previousDesignation: activeEmployee!.designation || 'Staff',
          newDesignation: newDesignation.trim(),
          previousSalary: (activeEmployee as any)?.salary || '',
          newSalary: newSalary.trim(),
          promotionType,
          approvedBy: approvedBy.trim() || adminUserName,
          remarks: remarks.trim()
        }, spreadsheetId);

        onPromotionRecorded(record);
        setIsSaving(false);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to submit promotion:', err);
      setErrorMsg(err?.message || 'Failed to save promotion. Please try again.');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const tenure = activeEmployee ? calculateTenure(activeEmployee.dateOfJoin) : '—';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with crisp pure white background */}
        <div className="bg-white p-5 sm:p-6 border-b border-slate-200 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {editRecord ? `Edit Promotion Record (${editRecord.id})` : 'Promote Employee & Upgrade Designation'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {editRecord ? 'Update Record' : 'Career Progression'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {editRecord ? 'Modify promotion terms, increment, designation or approvals.' : 'Official career promotion workflow, year registry & designation escalation.'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Employee Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Employee to Promote <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              disabled={Boolean(preselectedEmployee)}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 disabled:opacity-75 disabled:bg-slate-50"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.id} - {emp.name} ({emp.department} • {emp.designation})
                </option>
              ))}
            </select>
          </div>

          {/* Current Profile Summary Card */}
          {activeEmployee && (
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Employee Name</span>
                <span className="font-bold text-slate-900 truncate block mt-0.5 text-xs">{activeEmployee.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Department</span>
                <span className="font-semibold text-slate-800 truncate block mt-0.5 text-xs">{activeEmployee.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Current Role</span>
                <span className="font-bold text-indigo-700 truncate block mt-0.5 text-xs">{activeEmployee.designation}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Tenure</span>
                <span className="font-bold text-emerald-700 truncate block mt-0.5 text-xs">{tenure}</span>
              </div>
            </div>
          )}

          {/* New Designation & Promotion Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                New Designation / Role <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Machine Operator"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Promotion Type
              </label>
              <select
                value={promotionType}
                onChange={(e) => setPromotionType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900"
              >
                <option value="Performance Based">Performance Based</option>
                <option value="Annual Appraisal">Annual Appraisal</option>
                <option value="Merit / Tenure">Merit / Tenure</option>
                <option value="Designation Upgrade">Designation Upgrade</option>
                <option value="Special Role Change">Special Role Change</option>
              </select>
            </div>
          </div>

          {/* Promotion Date & Promotion Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Effective Promotion Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={promotionDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                <span>Promoted Year</span>
                <span className="text-[10px] text-indigo-600 font-bold">Auto-derived</span>
              </label>
              <input
                type="number"
                value={promotionYear}
                onChange={(e) => setPromotionYear(parseInt(e.target.value, 10) || currentYear)}
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          </div>

          {/* Salary / Increment & Approved By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                New Salary / Grade (BDT) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 28000"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Approved By
              </label>
              <input
                type="text"
                placeholder="Admin / Plant Manager"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Remarks & Kaizen Justification */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Promotion Citation & Achievement Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Consistently met 95%+ efficiency targets and spearheaded 5S floor improvements."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4.5 py-2 bg-gradient-to-r from-[#F87C6C] to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{editRecord ? 'Updating Record...' : 'Recording Promotion...'}</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 text-amber-200" />
                  <span>{editRecord ? 'Save Changes' : 'Confirm & Apply Promotion'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
