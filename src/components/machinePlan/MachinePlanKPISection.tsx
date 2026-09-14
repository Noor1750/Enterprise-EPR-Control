import React from 'react';
import { 
  Cpu, 
  Clock, 
  Activity, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  TrendingDown,
  Percent,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { MachinePlanSummaryKPIs, MachinePlanThresholds } from '../../types/machinePlan';
import { formatNumeric } from '../../lib/machinePlanEngine';

interface MachinePlanKPISectionProps {
  kpis: MachinePlanSummaryKPIs;
  thresholds: MachinePlanThresholds;
  onFilterAttention?: () => void;
  isAttentionFiltered?: boolean;
}

export default function MachinePlanKPISection({
  kpis,
  thresholds,
  onFilterAttention,
  isAttentionFiltered
}: MachinePlanKPISectionProps) {
  // Achievement tier styling
  const getAchievementColor = (pct: number | null) => {
    if (pct === null) return 'text-slate-500 bg-slate-50 border-slate-200';
    if (pct >= thresholds.achievementExcellent) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (pct >= thresholds.achievementGood) return 'text-sky-700 bg-sky-50 border-sky-200';
    if (pct >= thresholds.achievementAttention) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  // UEE tier styling
  const getUeeColor = (uee: number | null) => {
    if (uee === null) return 'text-slate-500 bg-slate-50 border-slate-200';
    if (uee >= thresholds.ueeHigh) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (uee >= thresholds.ueeMedium) return 'text-sky-700 bg-sky-50 border-sky-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const gapColor = kpis.productionGap >= 0
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="space-y-3" id="machine-plan-kpis-container">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {/* 1. Total Machines */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Machines</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.totalMachines}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
            Installed Active Fleet
          </div>
        </div>

        {/* 2. Planned Machines */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Planned</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{kpis.plannedMachines}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.totalMachines > 0 
              ? `${Math.round((kpis.plannedMachines / kpis.totalMachines) * 100)}% of total fleet` 
              : '0% allocated'}
          </div>
        </div>

        {/* 3. Running Machines */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Running</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{kpis.runningMachines}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {kpis.idleMachines > 0 ? `${kpis.idleMachines} Idle` : '0 Idle'}
            {kpis.breakdownMachines > 0 && <span className="text-rose-600 font-medium ml-1">· {kpis.breakdownMachines} Broken</span>}
          </div>
        </div>

        {/* 4. Total Plan Hours */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Plan Hours</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-900">{kpis.totalPlanHours}h</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg {(kpis.plannedMachines > 0 ? (kpis.totalPlanHours / kpis.plannedMachines).toFixed(1) : '0')}h / machine
          </div>
        </div>

        {/* 5. Target Output */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Target Output</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-900">{formatNumeric(kpis.totalTargetOutput)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Scheduled production</div>
        </div>

        {/* 6. Actual Output */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Actual Output</span>
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-teal-900">{formatNumeric(kpis.totalActualOutput)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Floor logged output</div>
        </div>

        {/* 7. Achievement % */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Achievement %</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.overallAchievementPct !== null ? `${kpis.overallAchievementPct}%` : 'N/A'}
            </span>
          </div>
          <div className="mt-1">
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getAchievementColor(kpis.overallAchievementPct)}`}>
              {kpis.overallAchievementPct === null ? 'No Target' :
                kpis.overallAchievementPct >= thresholds.achievementExcellent ? 'On Target' :
                kpis.overallAchievementPct >= thresholds.achievementGood ? 'Near Target' :
                kpis.overallAchievementPct >= thresholds.achievementAttention ? 'Attention' : 'Critical'}
            </span>
          </div>
        </div>

        {/* 8. Average UEE % */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Average UEE %</span>
            <Percent className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {kpis.averageUeePct !== null ? `${kpis.averageUeePct}%` : 'N/A'}
          </div>
          <div className="mt-1">
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getUeeColor(kpis.averageUeePct)}`}>
              {kpis.averageUeePct === null ? 'N/A (No Data)' :
                kpis.averageUeePct >= thresholds.ueeHigh ? 'World Class' :
                kpis.averageUeePct >= thresholds.ueeMedium ? 'Normal Band' : 'Low Efficiency'}
            </span>
          </div>
        </div>

        {/* 9. Production Gap */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Production Gap</span>
            {kpis.productionGap >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className={`text-2xl font-bold ${kpis.productionGap >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {kpis.productionGap > 0 ? `+${formatNumeric(kpis.productionGap)}` : formatNumeric(kpis.productionGap)}
          </div>
          <div className="text-[11px] mt-1 font-medium">
            {kpis.gapPct !== null ? (
              <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded ${gapColor}`}>
                {kpis.gapPct >= 0 ? `+${kpis.gapPct}%` : `${kpis.gapPct}%`}
              </span>
            ) : (
              <span className="text-slate-400">Zero Target</span>
            )}
          </div>
        </div>
      </div>

      {/* Exception & Attention Required Alert Banner */}
      {kpis.attentionCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Action Required ({kpis.attentionCount} {kpis.attentionCount === 1 ? 'Machine' : 'Machines'})
              </span>
              <p className="text-xs text-amber-700">
                Machines flagged with achievement &lt;{thresholds.achievementAttention}%, UEE &lt;{thresholds.ueeMedium}%, breakdowns, or zero output during planned hours.
              </p>
            </div>
          </div>
          {onFilterAttention && (
            <button
              id="filter-attention-btn"
              onClick={onFilterAttention}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                isAttentionFiltered 
                  ? 'bg-amber-600 text-white hover:bg-amber-700' 
                  : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100/60'
              }`}
            >
              {isAttentionFiltered ? 'Showing Attention Items (Click to Clear)' : 'Focus On Attention Machines'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
