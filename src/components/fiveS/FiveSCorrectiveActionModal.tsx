import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, ShieldCheck, Camera, 
  User, Calendar, Briefcase, Save, RefreshCw 
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { 
  FiveSCorrectiveAction, 
  FiveSCategoryKey, 
  FIVE_S_CATEGORIES 
} from '../../lib/fiveSEngine';
import { format } from 'date-fns';

interface FiveSCorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: FiveSCorrectiveAction) => Promise<void>;
  employees: Employee[];
  initialAction?: FiveSCorrectiveAction | null;
  currentUserEmail: string;
  currentUserName: string;
}

export default function FiveSCorrectiveActionModal({
  isOpen,
  onClose,
  onSave,
  employees,
  initialAction,
  currentUserEmail,
  currentUserName
}: FiveSCorrectiveActionModalProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [category, setCategory] = useState<FiveSCategoryKey>('sort');
  const [observation, setObservation] = useState<string>('');
  const [nonConformance, setNonConformance] = useState<string>('');
  const [rootCause, setRootCause] = useState<string>('');
  const [correctiveActionPlan, setCorrectiveActionPlan] = useState<string>('');
  const [responsiblePerson, setResponsiblePerson] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [status, setStatus] = useState<'Open' | 'In Progress' | 'Completed' | 'Verified' | 'Closed'>('Open');
  const [closureDate, setClosureDate] = useState<string>('');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId) || null;

  useEffect(() => {
    if (!isOpen) return;

    if (initialAction) {
      setSelectedEmpId(initialAction.employeeId);
      setCategory(initialAction.category as FiveSCategoryKey);
      setObservation(initialAction.observation);
      setNonConformance(initialAction.nonConformance || '');
      setRootCause(initialAction.rootCause || '');
      setCorrectiveActionPlan(initialAction.correctiveAction);
      setResponsiblePerson(initialAction.responsiblePerson);
      setTargetDate(initialAction.targetDate);
      setStatus(initialAction.status);
      setClosureDate(initialAction.closureDate || '');
      setVerificationNotes(initialAction.verificationNotes || '');
      setBeforePhoto(initialAction.beforePhoto || '');
      setAfterPhoto(initialAction.afterPhoto || '');
    } else {
      if (!selectedEmpId && employees.length > 0) {
        setSelectedEmpId(employees[0].id);
        setResponsiblePerson(employees[0].name);
      }
      setCategory('sort');
      setObservation('');
      setNonConformance('');
      setRootCause('');
      setCorrectiveActionPlan('');
      setTargetDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
      setStatus('Open');
      setClosureDate('');
      setVerificationNotes('');
      setBeforePhoto('');
      setAfterPhoto('');
    }
  }, [isOpen, initialAction, employees]);

  const handleImageUpload = (field: 'before' | 'after', file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (field === 'before') setBeforePhoto(reader.result as string);
      else setAfterPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert('Please select an employee.');
      return;
    }

    setIsSubmitting(true);
    try {
      const actionId = initialAction?.id || `ACT-${Date.now().toString().slice(-6)}`;
      const resolvedClosureDate = (status === 'Closed' || status === 'Completed' || status === 'Verified') 
        ? (closureDate || todayStr) 
        : '';

      const updatedAction: FiveSCorrectiveAction = {
        id: actionId,
        assessmentId: initialAction?.assessmentId || 'MANUAL-ENTRY',
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        department: selectedEmployee.department || 'Production',
        section: (selectedEmployee as any).workingArea || 'Floor 1',
        category,
        observation: observation.trim(),
        nonConformance: nonConformance.trim(),
        rootCause: rootCause.trim(),
        correctiveAction: correctiveActionPlan.trim(),
        responsiblePerson: responsiblePerson.trim() || selectedEmployee.name,
        targetDate,
        status,
        closureDate: resolvedClosureDate,
        closedBy: resolvedClosureDate ? currentUserName : undefined,
        verificationNotes: verificationNotes.trim(),
        beforePhoto,
        afterPhoto,
        isCritical: initialAction?.isCritical || false,
        createdBy: initialAction?.createdBy || currentUserEmail,
        createdAt: initialAction?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(updatedAction);
      onClose();
    } catch (err) {
      console.error('Error saving action:', err);
      alert('Failed to save corrective action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {initialAction ? 'Edit 5S Corrective Action' : 'New 5S / Housekeeping Action'}
              </h2>
              <p className="text-xs text-slate-400">
                Non-Conformance Tracking, Root Cause Analysis & Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Employee *
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  const emp = employees.find(x => x.id === e.target.value);
                  if (emp && !responsiblePerson) setResponsiblePerson(emp.name);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                required
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.id} - {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                5S Category Pillar *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FiveSCategoryKey)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {FIVE_S_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.japaneseName})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observation & Non-Conformance Description *
            </label>
            <textarea
              rows={2}
              required
              placeholder="E.g., Cutting table 3 covered with scrap cloth, scissors missing from shadow rack."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Root Cause Analysis (Why did this occur?)
              </label>
              <input
                type="text"
                placeholder="E.g., Lack of standard bin nearby, shadow hook broken"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Corrective Action / Improvement Plan *
              </label>
              <input
                type="text"
                required
                placeholder="E.g., Relocate fabric waste bin, replace hook and label"
                value={correctiveActionPlan}
                onChange={(e) => setCorrectiveActionPlan(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Responsible Person *
              </label>
              <input
                type="text"
                required
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Date *
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Verified">Verified</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Verification & Closure details */}
          {(status === 'Completed' || status === 'Verified' || status === 'Closed') && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Closure & Verification Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Closure / Verification Date</label>
                  <input
                    type="date"
                    value={closureDate || todayStr}
                    onChange={(e) => setClosureDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Verification Findings / Notes</label>
                  <input
                    type="text"
                    placeholder="Verified on shop floor audit by supervisor..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Before & After Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="border border-dashed border-slate-300 p-3 rounded-xl text-center space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Before Improvement Photo</span>
              {beforePhoto ? (
                <div className="relative inline-block">
                  <img src={beforePhoto} alt="Before" className="h-28 rounded-lg object-cover mx-auto border" />
                  <button
                    type="button"
                    onClick={() => setBeforePhoto('')}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Upload Before Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload('before', e.target.files[0])}
                  />
                </label>
              )}
            </div>

            <div className="border border-dashed border-slate-300 p-3 rounded-xl text-center space-y-2">
              <span className="text-xs font-bold text-slate-700 block">After Improvement Photo</span>
              {afterPhoto ? (
                <div className="relative inline-block">
                  <img src={afterPhoto} alt="After" className="h-28 rounded-lg object-cover mx-auto border" />
                  <button
                    type="button"
                    onClick={() => setAfterPhoto('')}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Upload After Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload('after', e.target.files[0])}
                  />
                </label>
              )}
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !observation || !correctiveActionPlan}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Corrective Action</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
