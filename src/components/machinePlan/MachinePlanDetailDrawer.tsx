import React from 'react';
import { 
  X, 
  Cpu, 
  Target, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Layers, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Edit3, 
  FileText,
  Activity
} from 'lucide-react';
import { CalculatedMachinePlanItem, MachinePlanThresholds } from '../../types/machinePlan';
import { formatNumeric } from '../../lib/machinePlanEngine';

interface MachinePlanDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: CalculatedMachinePlanItem | null;
  onEdit: (item: CalculatedMachinePlanItem) => void;
  canEdit: boolean;
  thresholds: MachinePlanThresholds;
}

export default function MachinePlanDetailDrawer({
  isOpen,
  onClose,
  item,
  onEdit,
  canEdit,
  thresholds
}: MachinePlanDetailDrawerProps) {
  if (!isOpen || !item) return null;

  const achievementColor = item.achievementPct === null ? 'text-slate-500 bg-slate-50 border-slate-200' :
    item.achievementPct >= thresholds.achievementExcellent ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    item.achievementPct >= thresholds.achievementGood ? 'text-sky-700 bg-sky-50 border-sky-200' :
    item.achievementPct >= thresholds.achievementAttention ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-rose-700 bg-rose-50 border-rose-200';

  const ueeColor = item.totalUeePct === null ? 'text-slate-500 bg-slate-50 border-slate-200' :
    item.totalUeePct >= thresholds.ueeHigh ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    item.totalUeePct >= thresholds.ueeMedium ? 'text-sky-700 bg-sky-50 border-sky-200' :
    'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideLeft overflow-y-auto"
        id="machine-plan-detail-drawer"
      >
        {/* Drawer Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                SL #{item.sl}
              </span>
              <span className="text-xs text-slate-400 font-mono">{item.id}</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {item.machineModel}
              {item.machineNo && <span className="text-xs font-normal text-slate-400">({item.machineNo})</span>}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {item.department} Department
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {item.date}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Edit Plan"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status & Achievement Highlight */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Machine Status
              </span>
              <span className="text-sm font-bold text-slate-900">{item.machineStatus}</span>
            </div>

            <div className={`p-3.5 rounded-xl border ${achievementColor}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1">
                Achievement %
              </span>
              <span className="text-base font-bold">
                {item.achievementPct !== null ? `${item.achievementPct}%` : 'N/A'}
              </span>
              <span className="text-[10px] block mt-0.5 opacity-80">
                {item.achievementTier} Tier
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border ${ueeColor}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1">
                Total UEE %
              </span>
              <span className="text-base font-bold">
                {item.totalUeePct !== null ? `${item.totalUeePct}%` : 'N/A'}
              </span>
              <span className="text-[10px] block mt-0.5 opacity-80">
                {item.ueeTier} Efficiency
              </span>
            </div>
          </div>

          {/* Target vs Actual Progress Visualization */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Production Target Fulfillment</span>
              <span className="text-slate-500 font-normal">
                {item.achievementPct !== null ? `${item.achievementPct}% achieved` : 'No Target Set'}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  item.achievementPct === null ? 'bg-slate-400' :
                  item.achievementPct >= thresholds.achievementExcellent ? 'bg-emerald-500' :
                  item.achievementPct >= thresholds.achievementGood ? 'bg-sky-500' :
                  item.achievementPct >= thresholds.achievementAttention ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, item.achievementPct || 0))}%` }}
              />
            </div>

            {/* Target vs Actual Comparison numbers */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Target Output</span>
                <span className="text-sm font-bold text-purple-900">{formatNumeric(item.targetOutput)} {item.uom}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Actual Output</span>
                <span className="text-sm font-bold text-teal-900">{formatNumeric(item.actualOutput)} {item.uom}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Production Gap</span>
                <span className={`text-sm font-bold ${item.outputGap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {item.outputGap >= 0 ? `+${formatNumeric(item.outputGap)}` : formatNumeric(item.outputGap)} {item.uom}
                </span>
              </div>
            </div>
          </div>

          {/* Machine Speed & Capacity Basis Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Capacity & Shift Specifications
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">Specification Speed / Hour:</span>
                <p className="font-semibold text-slate-800">{formatNumeric(item.specSpeedPerHour)} {item.uom}/H</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">Capacity Implement / Hour:</span>
                <p className="font-semibold text-slate-800">{formatNumeric(item.capacityImplementPerHour)} {item.uom}/H</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">Available Working Hours:</span>
                <p className="font-semibold text-slate-800">{item.avWorkingHours.toFixed(1)} Hours</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">Total Capacity Basis:</span>
                <p className="font-semibold text-slate-800">{item.totalCapacityBasis.toFixed(1)} Hours</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">Planned Hours for Order:</span>
                <p className="font-bold text-indigo-900">{item.planHours.toFixed(1)} Hours</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">Shift Type:</span>
                <p className="font-semibold text-slate-800">{item.shift || 'Day Shift'}</p>
              </div>
            </div>
          </div>

          {/* Order & SKU Identifiers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Order & Manufacturing References
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">SKU / Item Style:</span>
                <p className="font-mono font-bold text-slate-800">{item.sku || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="text-slate-500">Manufacturing Order (MO):</span>
                <p className="font-mono font-bold text-slate-800">{item.mo || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Remarks & Operational Context */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Operational Remarks & Downtime Notes
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              {item.remarks ? (
                <p className="leading-relaxed">{item.remarks}</p>
              ) : (
                <p className="text-slate-400 italic">No special remarks or downtime logged for this machine run.</p>
              )}
            </div>
          </div>

          {/* Audit Timestamp Footnote */}
          {item.updatedAt && (
            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              Last updated: {new Date(item.updatedAt).toLocaleString()}
              {item.updatedBy && ` by ${item.updatedBy}`}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Unit: <strong className="text-slate-800">{item.uom}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors"
            >
              Close
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Record</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
