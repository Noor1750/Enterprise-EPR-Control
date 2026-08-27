import React from 'react';
import { Clock, CheckCircle2, X } from 'lucide-react';
import { 
  EmployeeShiftState, 
  ShiftType, 
  ShiftMode, 
  getShiftBadgeStyles, 
  getShiftModeBadgeStyles 
} from '../../lib/shiftEngine';
import ShiftBadge, { ShiftIcon } from '../common/ShiftBadge';

interface QuickShiftModalProps {
  employee: EmployeeShiftState | null;
  newShiftValue: ShiftType;
  setNewShiftValue: (val: ShiftType) => void;
  newShiftMode: ShiftMode;
  setNewShiftMode: (val: ShiftMode) => void;
  overrideEffectiveDate: string;
  setOverrideEffectiveDate: (val: string) => void;
  overrideRemarks: string;
  setOverrideRemarks: (val: string) => void;
  isSavingShift: boolean;
  onSave: () => void;
  onResumeRotation: () => void;
  onClose: () => void;
}

export default function QuickShiftModal({
  employee,
  newShiftValue,
  setNewShiftValue,
  newShiftMode,
  setNewShiftMode,
  overrideEffectiveDate,
  setOverrideEffectiveDate,
  overrideRemarks,
  setOverrideRemarks,
  isSavingShift,
  onSave,
  onResumeRotation,
  onClose
}: QuickShiftModalProps) {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Shift Assignment</h3>
              <p className="text-xs text-slate-500">
                {employee.name} ({employee.id}) • {employee.department}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Current Status Pill */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 font-medium uppercase mb-1">Currently Effective Shift</div>
              <ShiftBadge shift={employee.currentShift} size="sm" />
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-medium uppercase mb-1">Current Mode</div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getShiftModeBadgeStyles(employee.shiftMode).bg}`}>
                {employee.shiftMode}
              </span>
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Shift Assignment Mode *</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => setNewShiftMode('Automatic Rotation')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${newShiftMode === 'Automatic Rotation' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-1 ring-indigo-500' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center justify-between">
                  <span>Automatic Rotation</span>
                  {newShiftMode === 'Automatic Rotation' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <span className="text-[10px] font-normal text-slate-500 mt-1">Weekly Saturday–Thursday rotation</span>
              </button>

              <button 
                type="button"
                onClick={() => setNewShiftMode('Manual Override')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${newShiftMode === 'Manual Override' ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-bold ring-1 ring-amber-500' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center justify-between">
                  <span>Manual Override</span>
                  {newShiftMode === 'Manual Override' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <span className="text-[10px] font-normal text-slate-500 mt-1">Pin to fixed shift without auto-rotating</span>
              </button>
            </div>
          </div>

          {/* Shift Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              {newShiftMode === 'Automatic Rotation' ? 'Rotation Starting Shift *' : 'Fixed Assigned Shift *'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Day Shift', 'Night Shift', 'General'] as ShiftType[]).map((sh) => {
                const isSelected = newShiftValue === sh;
                const style = getShiftBadgeStyles(sh);
                return (
                  <button
                    key={sh}
                    type="button"
                    onClick={() => setNewShiftValue(sh)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition ${isSelected ? `${style.bg} ring-2 ring-indigo-500 font-bold shadow-xs` : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    <ShiftIcon shift={sh} className="w-5 h-5 mb-1.5" />
                    <span className="font-bold text-slate-800 text-xs">{sh}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{style.subtext.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Effective Date & Remarks */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective Date *</label>
              <input 
                type="date"
                value={overrideEffectiveDate}
                onChange={e => setOverrideEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Change Reason / Audit Remarks</label>
              <input 
                type="text"
                placeholder="e.g. Approved production overtime requirement"
                value={overrideRemarks}
                onChange={e => setOverrideRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {employee.shiftMode === 'Manual Override' ? (
              <button 
                type="button"
                onClick={onResumeRotation}
                disabled={isSavingShift}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold underline"
              >
                Resume Auto Rotation
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={onSave}
                disabled={isSavingShift}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                {isSavingShift ? 'Saving...' : 'Apply Shift Changes'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
