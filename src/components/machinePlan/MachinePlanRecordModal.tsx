import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Calculator, 
  AlertCircle, 
  Check, 
  Cpu, 
  Layers, 
  Clock, 
  Target, 
  TrendingUp,
  FileText
} from 'lucide-react';
import { MachinePlanRecord, MachineStatusType } from '../../types/machinePlan';
import { 
  calculateTargetOutput, 
  calculateAchievementPct, 
  cleanParseNumber, 
  formatNumeric 
} from '../../lib/machinePlanEngine';

interface MachineOption {
  model: string;
  department: string;
  uom: string;
  speed: number;
  utilization: number;
}

interface MachinePlanRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: MachinePlanRecord, isNew: boolean) => Promise<void>;
  initialRecord: MachinePlanRecord | null;
  machineOptions: MachineOption[];
  isSaving: boolean;
}

const QUICK_REMARKS = [
  'Normal Run',
  'Material Shortage',
  'Machine Breakdown',
  'Operator Shortage',
  'Quality Issue',
  'Mould / Tool Changeover',
  'Maintenance Scheduled',
  'Power / Steam Fluctuation',
  'Waiting for Approval'
];

export default function MachinePlanRecordModal({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  machineOptions,
  isSaving
}: MachinePlanRecordModalProps) {
  const isNew = !initialRecord || !initialRecord.id;

  const [date, setDate] = useState(initialRecord?.date || new Date().toISOString().substring(0, 10));
  const [department, setDepartment] = useState(initialRecord?.department || 'General');
  const [uom, setUom] = useState(initialRecord?.uom || 'PCS');
  const [machineModel, setMachineModel] = useState(initialRecord?.machineModel || '');
  const [specSpeedPerHour, setSpecSpeedPerHour] = useState<number>(initialRecord?.specSpeedPerHour || 2000);
  const [avWorkingHours, setAvWorkingHours] = useState<number>(initialRecord?.avWorkingHours || 8);
  const [totalCapacityBasis, setTotalCapacityBasis] = useState<number>(initialRecord?.totalCapacityBasis || 8);
  const [capacityImplementPerHour, setCapacityImplementPerHour] = useState<number>(
    initialRecord?.capacityImplementPerHour || Math.round(2000 * 0.9)
  );
  const [planHours, setPlanHours] = useState<number>(initialRecord?.planHours || 8);
  const [machineStatus, setMachineStatus] = useState<MachineStatusType>(initialRecord?.machineStatus || 'Running');
  const [targetOutput, setTargetOutput] = useState<number>(initialRecord?.targetOutput || 0);
  const [actualOutput, setActualOutput] = useState<number>(initialRecord?.actualOutput || 0);
  const [sku, setSku] = useState(initialRecord?.sku || '');
  const [mo, setMo] = useState(initialRecord?.mo || '');
  const [totalUeePct, setTotalUeePct] = useState<string>(
    initialRecord?.totalUeePct !== null && initialRecord?.totalUeePct !== undefined 
      ? String(initialRecord.totalUeePct) 
      : ''
  );
  const [isUeeNA, setIsUeeNA] = useState<boolean>(initialRecord?.totalUeePct === null || initialRecord?.totalUeePct === undefined);
  const [remarks, setRemarks] = useState(initialRecord?.remarks || '');
  const [error, setError] = useState<string | null>(null);

  // Sync state if initialRecord changes
  useEffect(() => {
    if (initialRecord) {
      setDate(initialRecord.date);
      setDepartment(initialRecord.department);
      setUom(initialRecord.uom);
      setMachineModel(initialRecord.machineModel);
      setSpecSpeedPerHour(initialRecord.specSpeedPerHour);
      setAvWorkingHours(initialRecord.avWorkingHours);
      setTotalCapacityBasis(initialRecord.totalCapacityBasis);
      setCapacityImplementPerHour(initialRecord.capacityImplementPerHour);
      setPlanHours(initialRecord.planHours);
      setMachineStatus(initialRecord.machineStatus);
      setTargetOutput(initialRecord.targetOutput);
      setActualOutput(initialRecord.actualOutput);
      setSku(initialRecord.sku);
      setMo(initialRecord.mo);
      setIsUeeNA(initialRecord.totalUeePct === null);
      setTotalUeePct(initialRecord.totalUeePct !== null ? String(initialRecord.totalUeePct) : '');
      setRemarks(initialRecord.remarks);
    } else if (machineOptions.length > 0 && !machineModel) {
      // Pick first machine by default
      const first = machineOptions[0];
      setMachineModel(first.model);
      setDepartment(first.department);
      setUom(first.uom);
      setSpecSpeedPerHour(first.speed);
      const cap = Math.round(first.speed * (first.utilization / 100));
      setCapacityImplementPerHour(cap);
      setTargetOutput(calculateTargetOutput(8, cap));
    }
  }, [initialRecord]);

  // When machine model is selected from options, auto-populate properties
  const handleMachineSelect = (modelName: string) => {
    setMachineModel(modelName);
    const opt = machineOptions.find(o => o.model === modelName);
    if (opt) {
      setDepartment(opt.department);
      setUom(opt.uom);
      setSpecSpeedPerHour(opt.speed);
      const cap = Math.round(opt.speed * (opt.utilization / 100));
      setCapacityImplementPerHour(cap);
      setTargetOutput(calculateTargetOutput(planHours, cap));
    }
  };

  // Recompute target output whenever planHours or capacityImplementPerHour changes
  const handlePlanHoursChange = (val: number) => {
    setPlanHours(val);
    setTargetOutput(calculateTargetOutput(val, capacityImplementPerHour));
  };

  const handleCapacityImplementChange = (val: number) => {
    setCapacityImplementPerHour(val);
    setTargetOutput(calculateTargetOutput(planHours, val));
  };

  // Live achievement preview
  const liveAchievement = calculateAchievementPct(actualOutput, targetOutput);

  // Form validation & submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!machineModel.trim()) {
      setError('Machine Model is required');
      return;
    }
    if (!date.trim()) {
      setError('Date is required');
      return;
    }
    if (planHours < 0) {
      setError('Plan Hours cannot be negative');
      return;
    }
    if (actualOutput < 0) {
      setError('Actual Output cannot be negative');
      return;
    }

    let parsedUee: number | null = null;
    if (!isUeeNA && totalUeePct.trim() !== '') {
      const num = parseFloat(totalUeePct);
      if (isNaN(num) || num < 0 || num > 100) {
        setError('Total UEE% must be a valid percentage between 0 and 100, or marked as N/A');
        return;
      }
      parsedUee = Math.round(num * 10) / 10;
    }

    const recordId = initialRecord?.id || `MPA-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const record: MachinePlanRecord = {
      id: recordId,
      date,
      department,
      uom,
      machineModel,
      specSpeedPerHour,
      specSpeedDisplay: `${formatNumeric(specSpeedPerHour)} ${uom}/H`,
      avWorkingHours,
      totalCapacityBasis,
      capacityImplementPerHour,
      planHours,
      machineStatus,
      targetOutput,
      actualOutput,
      sku: sku.trim(),
      mo: mo.trim(),
      totalUeePct: parsedUee,
      remarks: remarks.trim(),
      shift: initialRecord?.shift || 'Day Shift',
      createdAt: initialRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await onSave(record, isNew);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save record. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden my-8 animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isNew ? 'Create Machine Production Plan' : `Edit Machine Plan (${machineModel})`}
              </h3>
              <p className="text-xs text-slate-300">
                Daily machine capacity, target scheduling, actual output and UEE tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identification & Machine Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Machine Model */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Machine Model <span className="text-rose-500">*</span>
              </label>
              {machineOptions.length > 0 ? (
                <select
                  id="modal-machine-model-select"
                  value={machineModel}
                  onChange={e => handleMachineSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select machine model...</option>
                  {machineOptions.map(m => (
                    <option key={m.model} value={m.model}>
                      {m.model} ({m.department} - {formatNumeric(m.speed)} {m.uom}/H)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={machineModel}
                  onChange={e => setMachineModel(e.target.value)}
                  placeholder="e.g. CL-326IE"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Production Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="modal-date-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* UOM */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UOM</label>
              <input
                type="text"
                value={uom}
                onChange={e => setUom(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Specification Speed / H */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Specification Speed/H</label>
              <input
                type="number"
                min="0"
                value={specSpeedPerHour}
                onChange={e => {
                  const s = cleanParseNumber(e.target.value);
                  setSpecSpeedPerHour(s);
                  const cap = Math.round(s * 0.9);
                  setCapacityImplementPerHour(cap);
                  setTargetOutput(calculateTargetOutput(planHours, cap));
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Capacity Implement / H */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity Imp./H</label>
              <input
                type="number"
                min="0"
                value={capacityImplementPerHour}
                onChange={e => handleCapacityImplementChange(cleanParseNumber(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Hours & Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Av. Working Hrs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Av. Working Hrs</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={avWorkingHours}
                onChange={e => {
                  const h = cleanParseNumber(e.target.value);
                  setAvWorkingHours(h);
                  setTotalCapacityBasis(h);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Total */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Basis</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={totalCapacityBasis}
                onChange={e => setTotalCapacityBasis(cleanParseNumber(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Plan Hours */}
            <div>
              <label className="block text-xs font-semibold text-indigo-900 mb-1">Plan Hours</label>
              <input
                id="modal-plan-hours-input"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={planHours}
                onChange={e => handlePlanHoursChange(cleanParseNumber(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-indigo-50/50 border border-indigo-200 rounded-lg text-indigo-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Machine Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Machine Status</label>
              <select
                id="modal-machine-status-select"
                value={machineStatus}
                onChange={e => setMachineStatus(e.target.value as MachineStatusType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Running">Running</option>
                <option value="Planned">Planned</option>
                <option value="Off">OFF</option>
                <option value="Idle">Idle</option>
                <option value="Breakdown">Breakdown</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Holiday">Holiday</option>
                <option value="Completed">Completed</option>
                <option value="Partially Completed">Partially Completed</option>
                <option value="No Plan">No Plan</option>
              </select>
            </div>
          </div>

          {/* Section 3: Target, Actual Output & Live Achievement */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target Output */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-purple-900">Target Output</label>
                  <span className="text-[10px] text-purple-600 font-mono">Auto (Plan × Cap)</span>
                </div>
                <input
                  id="modal-target-output-input"
                  type="number"
                  min="0"
                  value={targetOutput}
                  onChange={e => setTargetOutput(cleanParseNumber(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-lg text-purple-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Actual Output */}
              <div>
                <label className="block text-xs font-semibold text-teal-900 mb-1">Actual Output</label>
                <input
                  id="modal-actual-output-input"
                  type="number"
                  min="0"
                  value={actualOutput}
                  onChange={e => setActualOutput(cleanParseNumber(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-teal-200 rounded-lg text-teal-900 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Live Achievement & Gap Box */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Live Achievement & Gap
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-bold text-slate-900">
                    {liveAchievement !== null ? `${liveAchievement}%` : 'N/A'}
                  </span>
                  <span className={`text-xs font-semibold ${actualOutput >= targetOutput ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {actualOutput >= targetOutput ? `+${formatNumeric(actualOutput - targetOutput)}` : formatNumeric(actualOutput - targetOutput)} {uom}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: SKU, MO & Total UEE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Item Style</label>
              <input
                type="text"
                placeholder="e.g. SKU-RFID-902"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* MO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">MO (Manufacturing Order)</label>
              <input
                type="text"
                placeholder="e.g. MO-2026-0881"
                value={mo}
                onChange={e => setMo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Total UEE% */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Total UEE %</label>
                <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUeeNA}
                    onChange={e => {
                      setIsUeeNA(e.target.checked);
                      if (e.target.checked) setTotalUeePct('');
                    }}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>N/A (No Data)</span>
                </label>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                disabled={isUeeNA}
                placeholder={isUeeNA ? 'N/A' : '0 - 100%'}
                value={totalUeePct}
                onChange={e => setTotalUeePct(e.target.value)}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isUeeNA 
                    ? 'bg-slate-100 border-slate-200 text-slate-400' 
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Section 5: Remarks with Quick Shortcut Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Remarks</label>
            <input
              type="text"
              placeholder="e.g. Smooth run / Material shortage / Line stoppage..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REMARKS.map(q => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setRemarks(prev => prev ? `${prev}; ${q}` : q)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  + {q}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="modal-save-machine-plan-btn"
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Record...' : isNew ? 'Save Machine Plan' : 'Update Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
