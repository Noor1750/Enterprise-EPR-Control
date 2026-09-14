import React, { useState, useEffect } from 'react';
import { 
  PowerOff, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Users, 
  PackageX, 
  Layers, 
  Sparkles,
  Check
} from 'lucide-react';
import { MachineStatusType } from '../../types/machinePlan';

export interface MachineOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    machineModel: string;
    department: string;
    date: string;
    reason: string;
    notes: string;
    setPlanHoursZero: boolean;
    status: MachineStatusType;
  }) => Promise<void>;
  preselectedMachine?: {
    model: string;
    department: string;
  } | null;
  machineOptions: Array<{
    model: string;
    department: string;
    uom: string;
  }>;
  currentDate?: string;
}

export const COMMON_OFF_REASONS = [
  { id: 'no_order', label: 'No Production Order / Work Order (NPO)', icon: PackageX, description: 'No active job scheduled for this line' },
  { id: 'manpower', label: 'Operator / Skilled Manpower Shortage', icon: Users, description: 'Operators absent or reassigned to priority line' },
  { id: 'pm', label: 'Scheduled Preventive Maintenance (PM)', icon: Wrench, description: 'Routine mechanical overhaul or oil change' },
  { id: 'breakdown', label: 'Mechanical / Electrical Breakdown', icon: AlertTriangle, description: 'Unplanned downtime, waiting for technician/parts' },
  { id: 'materials', label: 'Raw Material Shortage / Fabric Delay', icon: Layers, description: 'Yarn, fabric, label tape, or ink delay' },
  { id: 'changeover', label: 'Mold / Tooling / Pattern Changeover', icon: Clock, description: 'Extended setup or plate change in progress' },
  { id: 'cleaning', label: 'Quality Inspection / Cleaning / Sanitation', icon: Sparkles, description: 'Audit preparation or sanitization cycle' },
  { id: 'power', label: 'Utility / Power / Compressor Outage', icon: PowerOff, description: 'Facility air pressure or generator maintenance' },
  { id: 'holiday', label: 'Weekly Off / Factory Holiday', icon: Clock, description: 'Scheduled plant closure or weekend' },
  { id: 'other', label: 'Other Custom Reason', icon: AlertTriangle, description: 'Specific floor situation' }
];

export default function MachineOffModal({
  isOpen,
  onClose,
  onConfirm,
  preselectedMachine,
  machineOptions,
  currentDate
}: MachineOffModalProps) {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [selectedReasonId, setSelectedReasonId] = useState<string>('no_order');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [setPlanHoursZero, setSetPlanHoursZero] = useState<boolean>(true);
  const [statusType, setStatusType] = useState<MachineStatusType>('Off');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setDate(currentDate || new Date().toISOString().substring(0, 10));
      if (preselectedMachine) {
        setSelectedModel(preselectedMachine.model);
        setSelectedDept(preselectedMachine.department);
      } else if (machineOptions.length > 0) {
        setSelectedModel(machineOptions[0].model);
        setSelectedDept(machineOptions[0].department);
      }
      setSelectedReasonId('no_order');
      setCustomReason('');
      setNotes('');
      setSetPlanHoursZero(true);
      setStatusType('Off');
    }
  }, [isOpen, preselectedMachine, machineOptions, currentDate]);

  if (!isOpen) return null;

  const handleMachineChange = (model: string) => {
    setSelectedModel(model);
    const found = machineOptions.find(m => m.model === model);
    if (found) {
      setSelectedDept(found.department);
    }
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReasonId(reasonId);
    if (reasonId === 'breakdown') {
      setStatusType('Breakdown');
    } else if (reasonId === 'pm') {
      setStatusType('Maintenance');
    } else if (reasonId === 'holiday') {
      setStatusType('Holiday');
    } else {
      setStatusType('Off');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) {
      setErrorMsg('Please select a machine model.');
      return;
    }

    let finalReason = '';
    if (selectedReasonId === 'other') {
      if (!customReason.trim()) {
        setErrorMsg('Please enter a custom reason for turning the machine OFF.');
        return;
      }
      finalReason = customReason.trim();
    } else {
      const found = COMMON_OFF_REASONS.find(r => r.id === selectedReasonId);
      finalReason = found ? found.label : 'Machine OFF';
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onConfirm({
        machineModel: selectedModel,
        department: selectedDept || 'General',
        date: date || new Date().toISOString().substring(0, 10),
        reason: finalReason,
        notes: notes.trim(),
        setPlanHoursZero,
        status: statusType
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to update machine status to OFF.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <PowerOff className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-white">Put Machine OFF with Reason</h3>
              <p className="text-xs text-slate-400">Log machine downtime reason and stop target allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Machine & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Machine Model <span className="text-rose-500">*</span>
              </label>
              {preselectedMachine ? (
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono">
                  {preselectedMachine.model}
                </div>
              ) : (
                <select
                  value={selectedModel}
                  onChange={e => handleMachineChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                >
                  <option value="">-- Select Machine --</option>
                  {machineOptions.map((m, idx) => (
                    <option key={`${m.model}-${idx}`} value={m.model}>
                      {m.model} ({m.department})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Department
              </label>
              <input
                type="text"
                readOnly
                value={selectedDept || 'General'}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl text-slate-700 outline-none"
              />
            </div>
          </div>

          {/* Date & Machine Status Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Effective Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Log Status As
              </label>
              <select
                value={statusType}
                onChange={e => setStatusType(e.target.value as MachineStatusType)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Off">OFF (Stopped / Offline)</option>
                <option value="Idle">Idle (Waiting for Work)</option>
                <option value="Maintenance">Maintenance (PM / Scheduled)</option>
                <option value="Breakdown">Breakdown (Unplanned Fault)</option>
                <option value="Holiday">Holiday (Plant Closed)</option>
              </select>
            </div>
          </div>

          {/* Select Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
              <span>Select OFF Reason <span className="text-rose-500">*</span></span>
              <span className="text-[11px] font-normal text-slate-500">Factory Downtime Categorization</span>
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {COMMON_OFF_REASONS.map(item => {
                const Icon = item.icon;
                const isSelected = selectedReasonId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleReasonSelect(item.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-rose-50/80 border-rose-300 text-rose-900 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-rose-200 text-rose-800' : 'bg-white text-slate-500'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold leading-tight">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-rose-600 shrink-0 self-center" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Reason Input if "other" is selected */}
          {selectedReasonId === 'other' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Custom Reason Details <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Specify reason machine is turned off..."
                className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Additional Notes / Supervisor Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Expected back online by 2:00 PM, awaiting parts from warehouse..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
            />
          </div>

          {/* Zero Plan Hours Option */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="set-zero-hours"
                checked={setPlanHoursZero}
                onChange={e => setSetPlanHoursZero(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="set-zero-hours" className="text-xs font-bold text-slate-700 cursor-pointer">
                Reset Plan Hours to 0 (Target Output = 0)
              </label>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Recommended</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PowerOff className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Put Machine OFF'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
