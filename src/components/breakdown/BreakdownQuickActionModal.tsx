import React, { useState } from 'react';
import { BreakdownRecord, BreakdownStatus } from '../../types/breakdown';
import { UserSecurityScope } from '../../lib/security';
import { 
  X, Wrench, CheckCircle2, Clock, AlertTriangle, 
  UserCheck, Layers, Lock, Sparkles, Check, DollarSign
} from 'lucide-react';
import TimeSelectDropdown, { getCurrentTimeHHMM } from '../common/TimeSelectDropdown';
import SearchableSelect from '../common/SearchableSelect';
import { BREAKDOWN_STATUSES } from '../../lib/breakdownUtils';

interface BreakdownQuickActionModalProps {
  record: BreakdownRecord | null;
  employeesList: string[][];
  masterFailureModes: string[];
  masterActivities: string[];
  masterSpareParts: { name: string; defaultCost: number; uom: string }[];
  userSecurityScope?: UserSecurityScope;
  onClose: () => void;
  onSave: (record: BreakdownRecord, auditNote?: string) => Promise<void>;
}

export default function BreakdownQuickActionModal({
  record,
  employeesList,
  masterFailureModes,
  masterActivities,
  masterSpareParts,
  userSecurityScope,
  onClose,
  onSave
}: BreakdownQuickActionModalProps) {
  if (!record) return null;

  const [status, setStatus] = useState<BreakdownStatus>(record.status);
  const [attendAt, setAttendAt] = useState<string>(record.attendAt || getCurrentTimeHHMM());
  const [attendById, setAttendById] = useState<string>(
    record.attendById || userSecurityScope?.employeeId || ''
  );
  const [attendByName, setAttendByName] = useState<string>(
    record.attendByName || userSecurityScope?.employeeName || ''
  );
  const [machineStartAt, setMachineStartAt] = useState<string>(
    record.machineStartAt || getCurrentTimeHHMM()
  );
  const [failureMode, setFailureMode] = useState<string>(record.failureMode || '');
  const [activity, setActivity] = useState<string>(record.activity || '');
  const [sparePartsService, setSparePartsService] = useState<string>(record.sparePartsService || 'None');
  const [unitCost, setUnitCost] = useState<number>(record.unitCost || 0);
  const [quantity, setQuantity] = useState<number>(record.quantity || 1);
  const [quickNote, setQuickNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee options for technician assignment
  const employeeOptions = employeesList.map(e => ({
    value: e[0],
    label: `${e[0]} - ${e[1]} (${e[3] || 'Staff'})`
  }));

  const handleSelectTech = (empId: string) => {
    setAttendById(empId);
    const emp = employeesList.find(e => e[0] === empId);
    if (emp) {
      setAttendByName(emp[1]);
    }
  };

  const handleSparePartChange = (partName: string) => {
    setSparePartsService(partName);
    const part = masterSpareParts.find(p => p.name === partName);
    if (part) {
      setUnitCost(part.defaultCost);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const totalCost = (quantity || 0) * (unitCost || 0);

      const updatedRecord: BreakdownRecord = {
        ...record,
        status,
        attendAt: attendAt || record.attendAt,
        attendById: attendById || record.attendById,
        attendByName: attendByName || record.attendByName,
        machineStartAt: status === 'Completed' || status === 'Closed' ? machineStartAt : record.machineStartAt,
        failureMode: failureMode || record.failureMode,
        activity: activity || record.activity,
        sparePartsService: sparePartsService !== 'None' ? sparePartsService : record.sparePartsService,
        quantity: sparePartsService !== 'None' ? quantity : record.quantity,
        unitCost: sparePartsService !== 'None' ? unitCost : record.unitCost,
        totalCost: sparePartsService !== 'None' ? totalCost : record.totalCost,
        remarks: quickNote ? `${record.remarks ? record.remarks + ' | ' : ''}${quickNote}` : record.remarks,
        updatedAt: nowIso,
        updatedBy: userSecurityScope?.employeeName || userSecurityScope?.username || 'User'
      };

      const auditMsg = `Quick status update to '${status}'. Tech: ${attendByName || 'N/A'}${quickNote ? `. Note: ${quickNote}` : ''}`;
      await onSave(updatedRecord, auditMsg);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error updating breakdown record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Wrench className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base">Quick Maintenance Action</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                  {record.id}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {record.machineName} ({record.department}) • Reported: {record.date} {record.reportAt}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* Status Selector Pills */}
          <div>
            <label className="font-bold text-slate-700 block uppercase tracking-wider mb-2">
              Update Ticket Status:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BREAKDOWN_STATUSES.filter(s => s !== 'Cancelled').map(s => {
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-2 px-3 rounded-xl border font-bold text-left transition flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{s}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Technician & Attendance Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Attending Technician:
              </label>
              <SearchableSelect
                options={employeeOptions}
                value={attendById}
                onChange={handleSelectTech}
                placeholder="Assign Technician..."
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Attendance Time (HH:MM):
              </label>
              <TimeSelectDropdown
                value={attendAt}
                onChange={setAttendAt}
              />
            </div>
          </div>

          {/* Machine Restart Timing if completed */}
          {(status === 'Completed' || status === 'Closed') && (
            <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-3">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Machine Restart & Recovery Verification</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Machine Restart Time (HH:MM):
                  </label>
                  <TimeSelectDropdown
                    value={machineStartAt}
                    onChange={setMachineStartAt}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Failure Mode / Root Cause:
                  </label>
                  <select
                    value={failureMode}
                    onChange={(e) => setFailureMode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                  >
                    <option value="">Select Root Cause...</option>
                    {masterFailureModes.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Quick Spare Part Tagging */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Spare Part Used (Optional):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={sparePartsService}
                onChange={(e) => handleSparePartChange(e.target.value)}
                className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
              >
                <option value="None">None / No Spare Part</option>
                {masterSpareParts.map(p => (
                  <option key={p.name} value={p.name}>{p.name} (${p.defaultCost})</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="Qty"
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 text-center"
              />
            </div>
          </div>

          {/* Quick Note / Action Remarks */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Action Notes / Findings:
            </label>
            <textarea
              rows={2}
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="e.g. Replaced sensor cable and calibrated optical alignment..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Update Breakdown</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
