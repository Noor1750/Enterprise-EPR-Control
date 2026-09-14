import React, { useState, useMemo } from 'react';
import { 
  X, 
  Save, 
  Sliders, 
  RotateCcw, 
  Check, 
  Target, 
  Layers, 
  Search, 
  Cpu, 
  AlertCircle,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { MachinePlanSettings } from '../../types/machinePlan';
import { DEFAULT_MACHINE_PLAN_SETTINGS, DEFAULT_DEPARTMENT_UOMS, getDepartmentUom } from '../../lib/machinePlanEngine';
import { STANDARD_SCRAP_UOMS } from '../../lib/scrapReportEngine';

interface MachinePlanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MachinePlanSettings;
  onSaveSettings: (newSettings: MachinePlanSettings) => void;
  machineOptions?: Array<{ model: string; department: string }>;
  departments?: string[];
}

export default function MachinePlanSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  machineOptions = [],
  departments = []
}: MachinePlanSettingsModalProps) {
  const [formData, setFormData] = useState<MachinePlanSettings>(() => ({
    ...DEFAULT_MACHINE_PLAN_SETTINGS,
    ...settings,
    thresholds: {
      ...DEFAULT_MACHINE_PLAN_SETTINGS.thresholds,
      ...(settings.thresholds || {})
    },
    machineUeeTargets: {
      ...DEFAULT_MACHINE_PLAN_SETTINGS.machineUeeTargets,
      ...(settings.machineUeeTargets || {})
    },
    departmentScrapTargets: {
      ...DEFAULT_MACHINE_PLAN_SETTINGS.departmentScrapTargets,
      ...(settings.departmentScrapTargets || {})
    },
    departmentUoms: {
      ...DEFAULT_MACHINE_PLAN_SETTINGS.departmentUoms,
      ...(settings.departmentUoms || {})
    }
  }));

  const [activeTab, setActiveTab] = useState<'uee' | 'scrap' | 'general'>('uee');
  const [machineSearch, setMachineSearch] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // Sync formData when settings prop changes and modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        ...DEFAULT_MACHINE_PLAN_SETTINGS,
        ...settings,
        thresholds: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.thresholds,
          ...(settings.thresholds || {})
        },
        machineUeeTargets: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.machineUeeTargets,
          ...(settings.machineUeeTargets || {})
        },
        departmentScrapTargets: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.departmentScrapTargets,
          ...(settings.departmentScrapTargets || {})
        },
        departmentUoms: {
          ...DEFAULT_MACHINE_PLAN_SETTINGS.departmentUoms,
          ...(settings.departmentUoms || {})
        }
      });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleResetToDefaults = () => {
    setFormData(DEFAULT_MACHINE_PLAN_SETTINGS);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 500);
  };

  // Distinct departments combining list + existing keys
  const allDepts = Array.from(
    new Set([
      'Offset',
      'PFL',
      'Woven',
      'RFID',
      'Cutting',
      'Sewing',
      'Packaging',
      'Screen Printing',
      'Heat Transfer',
      'Screen',
      'Thermal',
      ...departments,
      ...Object.keys(formData.departmentScrapTargets || {}),
      ...Object.keys(formData.departmentUoms || {})
    ])
  ).filter(d => d.trim() !== '' && d.toLowerCase() !== 'all' && d.toLowerCase() !== 'department');

  // Filtered machine options for UEE targets
  const filteredMachines = machineOptions.filter(m => {
    const q = machineSearch.toLowerCase().trim();
    if (!q) return true;
    return m.model.toLowerCase().includes(q) || m.department.toLowerCase().includes(q);
  });

  const handleMachineTargetChange = (model: string, val: string) => {
    const num = parseFloat(val);
    setFormData(prev => ({
      ...prev,
      machineUeeTargets: {
        ...(prev.machineUeeTargets || {}),
        [model]: isNaN(num) ? (prev.defaultMachineUeeTarget ?? 85) : num
      }
    }));
  };

  const handleDeptScrapTargetChange = (dept: string, val: string) => {
    const num = parseFloat(val);
    setFormData(prev => ({
      ...prev,
      departmentScrapTargets: {
        ...(prev.departmentScrapTargets || {}),
        [dept]: isNaN(num) ? (prev.defaultDeptScrapTarget ?? 3.0) : num
      }
    }));
  };

  const handleDeptUomChange = (dept: string, uom: string) => {
    setFormData(prev => ({
      ...prev,
      departmentUoms: {
        ...(prev.departmentUoms || {}),
        [dept]: uom
      }
    }));
  };

  const handleApplyDefaultUeeToAll = () => {
    const defaultVal = formData.defaultMachineUeeTarget ?? 85;
    const newTargets: Record<string, number> = {};
    machineOptions.forEach(m => {
      newTargets[m.model] = defaultVal;
    });
    setFormData(prev => ({
      ...prev,
      machineUeeTargets: newTargets
    }));
  };

  const handleApplyDefaultScrapToAll = () => {
    const defaultVal = formData.defaultDeptScrapTarget ?? 3.0;
    const newTargets: Record<string, number> = {};
    allDepts.forEach(d => {
      newTargets[d] = defaultVal;
    });
    setFormData(prev => ({
      ...prev,
      departmentScrapTargets: newTargets
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">UEE & Scrap Targets & Settings</h3>
              <p className="text-xs text-slate-300">
                Machine-wise target UEE %, Department-wise target Scrap %, and benchmarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Color Rule Callout Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Red Rule:
            </span>
            <span>
              Scrap &gt; Target % <strong>(Over Scrap)</strong> OR UEE &lt; Target % <strong>(Under Target)</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Green Rule:
            </span>
            <span>
              Scrap ≤ Target % &amp; UEE ≥ Target % <strong>(Target Met)</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('uee')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'uee'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Machine Target UEE %</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scrap')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'scrap'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Department Target Scrap %</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>General Benchmarks &amp; Shifts</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: Machine Target UEE % */}
          {activeTab === 'uee' && (
            <div className="space-y-4">
              {/* Default Target UEE Control */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-indigo-950 block">
                    Default Machine Target UEE %
                  </label>
                  <p className="text-[11px] text-indigo-700">
                    Baseline threshold applied to machines without an individual target
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-indigo-200 rounded-lg px-2.5 py-1">
                    <input
                      type="number"
                      step="0.5"
                      min="10"
                      max="100"
                      value={formData.defaultMachineUeeTarget ?? 85}
                      onChange={e => setFormData({
                        ...formData,
                        defaultMachineUeeTarget: parseFloat(e.target.value) || 85
                      })}
                      className="w-16 text-xs font-black text-slate-900 outline-none text-right"
                    />
                    <span className="text-xs font-bold text-slate-500 ml-1">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyDefaultUeeToAll}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Apply to All
                  </button>
                </div>
              </div>

              {/* Machine Search & Counter */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search machines by model or department..."
                    value={machineSearch}
                    onChange={e => setMachineSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  {filteredMachines.length} machines
                </span>
              </div>

              {/* Machine List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Machine Model</th>
                      <th className="p-2.5">Department</th>
                      <th className="p-2.5 text-right w-36">Target UEE %</th>
                      <th className="p-2.5 text-center w-24">Rule Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMachines.map(m => {
                      const currentVal = formData.machineUeeTargets?.[m.model] ?? (formData.defaultMachineUeeTarget ?? 85);
                      return (
                        <tr key={m.model} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-800">
                            {m.model}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                              {m.department}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="10"
                                max="100"
                                value={currentVal}
                                onChange={e => handleMachineTargetChange(m.model, e.target.value)}
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-right font-bold text-slate-900 text-xs focus:border-indigo-500 outline-none"
                              />
                              <span className="text-slate-400 font-semibold text-xs">%</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ≥{currentVal}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMachines.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400 text-xs">
                          No machine models found matching "{machineSearch}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Department Target Scrap % */}
          {activeTab === 'scrap' && (
            <div className="space-y-4">
              {/* Default Target Scrap Control */}
              <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-rose-950 block">
                    Default Department Target Scrap %
                  </label>
                  <p className="text-[11px] text-rose-700">
                    Maximum scrap rate allowed before flagging in red
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-rose-200 rounded-lg px-2.5 py-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="30"
                      value={formData.defaultDeptScrapTarget ?? 3.0}
                      onChange={e => setFormData({
                        ...formData,
                        defaultDeptScrapTarget: parseFloat(e.target.value) || 3.0
                      })}
                      className="w-16 text-xs font-black text-slate-900 outline-none text-right"
                    />
                    <span className="text-xs font-bold text-slate-500 ml-1">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyDefaultScrapToAll}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Apply to All
                  </button>
                </div>
              </div>

              {/* Department Scrap Target Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Production Department</th>
                      <th className="p-2.5 w-32">Fixed UOM</th>
                      <th className="p-2.5 text-right w-32">Target Scrap %</th>
                      <th className="p-2.5 text-center w-36">Color Status Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allDepts.map(dept => {
                      const currentVal = formData.departmentScrapTargets?.[dept] ?? (formData.defaultDeptScrapTarget ?? 3.0);
                      const currentUom = formData.departmentUoms?.[dept] || getDepartmentUom(dept, formData);

                      return (
                        <tr key={dept} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-800 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-rose-500" />
                            <span>{dept}</span>
                          </td>
                          <td className="p-2.5">
                            <select
                              value={currentUom}
                              onChange={e => handleDeptUomChange(dept, e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-rose-500"
                            >
                              {STANDARD_SCRAP_UOMS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="30"
                                value={currentVal}
                                onChange={e => handleDeptScrapTargetChange(dept, e.target.value)}
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-right font-bold text-slate-900 text-xs focus:border-rose-500 outline-none"
                              />
                              <span className="text-slate-400 font-semibold text-xs">%</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Over &gt; {currentVal}% = <strong className="text-rose-600">Red</strong>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: General Plan Thresholds & Shifts */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Achievement % Thresholds */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Achievement % Thresholds
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                      On Target (≥%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="50"
                      max="150"
                      value={formData.thresholds.achievementExcellent}
                      onChange={e => setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          achievementExcellent: parseFloat(e.target.value) || 100
                        }
                      })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sky-700 mb-1">
                      Near Target (≥%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="50"
                      max="150"
                      value={formData.thresholds.achievementGood}
                      onChange={e => setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          achievementGood: parseFloat(e.target.value) || 95
                        }
                      })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-700 mb-1">
                      Attention (≥%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="40"
                      max="100"
                      value={formData.thresholds.achievementAttention}
                      onChange={e => setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          achievementAttention: parseFloat(e.target.value) || 85
                        }
                      })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Standards */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Factory Operating Standards
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Standard Shift Working Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="4"
                      max="24"
                      value={formData.standardShiftHours}
                      onChange={e => setFormData({
                        ...formData,
                        standardShiftHours: parseFloat(e.target.value) || 8
                      })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Default Implementation Efficiency %
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="50"
                      max="100"
                      value={formData.defaultEfficiencyPct}
                      onChange={e => setFormData({
                        ...formData,
                        defaultEfficiencyPct: parseFloat(e.target.value) || 90
                      })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Refresh */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">5-Minute Auto Refresh</span>
                    <span className="text-[11px] text-slate-500">
                      Automatically syncs production floor data in background
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoRefreshEnabled}
                      onChange={e => setFormData({ ...formData, autoRefreshEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-xs cursor-pointer ${
                  isSaved ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-black'
                }`}
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Saved Successfully!' : 'Save & Apply Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
