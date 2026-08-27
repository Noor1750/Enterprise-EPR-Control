import React, { useState } from 'react';
import { 
  Save, RefreshCw, Plus, Trash2, Sliders, ShieldCheck, 
  Award, Check, AlertTriangle, HelpCircle, Layers, CheckSquare
} from 'lucide-react';
import { 
  FiveSSettingsConfig, 
  FiveSCriteriaItem, 
  FIVE_S_CATEGORIES, 
  FiveSCategoryKey, 
  saveFiveSSettings, 
  getFiveSSettings 
} from '../../lib/fiveSEngine';

interface FiveSSettingsTabProps {
  settings: FiveSSettingsConfig;
  onSaveSettings: (newSettings: FiveSSettingsConfig) => void;
  canConfigure: boolean;
}

export default function FiveSSettingsTab({
  settings,
  onSaveSettings,
  canConfigure
}: FiveSSettingsTabProps) {
  const [formData, setFormData] = useState<FiveSSettingsConfig>(settings);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<FiveSCategoryKey>('sort');
  const [isSaved, setIsSaved] = useState(false);

  const handle5SWeightChange = (new5SWeight: number) => {
    const safe5S = Math.max(0, Math.min(100, new5SWeight));
    setFormData(prev => ({
      ...prev,
      fiveSWeight: safe5S,
      visualWeight: 100 - safe5S
    }));
  };

  const handleAddCriteria = (category: FiveSCategoryKey) => {
    const newId = `crit-${Date.now().toString().slice(-6)}`;
    const newItem: FiveSCriteriaItem = {
      id: newId,
      category,
      standard: 'New Standard Item',
      requirement: 'Describe specific shop floor housekeeping requirement here...',
      maxScore: 5,
      weight: 1,
      isCritical: false,
      order: formData.checklistCriteria.length + 1
    };
    setFormData(prev => ({
      ...prev,
      checklistCriteria: [...prev.checklistCriteria, newItem]
    }));
  };

  const handleRemoveCriteria = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklistCriteria: prev.checklistCriteria.filter(c => c.id !== id)
    }));
  };

  const handleUpdateCriteria = (id: string, field: keyof FiveSCriteriaItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      checklistCriteria: prev.checklistCriteria.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfigure) return;

    saveFiveSSettings(formData);
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all 5S criteria and weight formulas to factory standard defaults?')) {
      localStorage.removeItem('erp_5s_settings_config');
      const defaults = getFiveSSettings();
      setFormData(defaults);
      onSaveSettings(defaults);
    }
  };

  const currentCategoryCriteria = formData.checklistCriteria.filter(c => c.category === selectedCategoryTab);

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* Header card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            5S & Visual Management Formula & Criteria Settings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure scoring weightings, minimum eligibility criteria for Top 3, and factory audit checklists.
          </p>
        </div>

        {canConfigure && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Reset Defaults
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Saved Successfully!' : 'Save Configuration'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Weighting & Scoring Rules Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-500" />
          1. Scoring Weight Distribution & Top 3 Winner Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Weight Sliders */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                5S Category Weight: <span className="text-blue-600 text-sm font-extrabold">{formData.fiveSWeight}%</span>
              </label>
              <label className="text-xs font-bold text-slate-800">
                Visual Mgmt Weight: <span className="text-emerald-600 text-sm font-extrabold">{formData.visualWeight}%</span>
              </label>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={!canConfigure}
              value={formData.fiveSWeight}
              onChange={(e) => handle5SWeightChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[11px] text-slate-500">
              Formula: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-700">
                Final = (Total 5S × {formData.fiveSWeight}%) + (Visual Mgmt × {formData.visualWeight}%)
              </code>
            </p>
          </div>

          {/* Minimum Top 3 Qualifying Score */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Minimum Qualifying Score for Top 3 (Default: 80%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={50}
                  max={100}
                  disabled={!canConfigure}
                  value={formData.minQualifyingScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, minQualifyingScore: Number(e.target.value) }))}
                  className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
                <span className="text-xs text-slate-500 font-medium">
                  Employees scoring below this threshold cannot be declared Top 3 winners.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="disqualifyCritical"
                disabled={!canConfigure}
                checked={formData.disqualifyOnCriticalViolation}
                onChange={(e) => setFormData(prev => ({ ...prev, disqualifyOnCriticalViolation: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="disqualifyCritical" className="text-xs font-bold text-slate-700 cursor-pointer">
                Disqualify employee from Top 3 if any critical safety/5S violation is logged
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* Rating Ranges Band Editor */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          2. Score Performance Rating Bands
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {formData.ratingRanges.map((range, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border inline-block ${range.badgeClass}`}>
                {range.label}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">{range.min}%</span>
                <span className="text-slate-300 font-bold">to</span>
                <span className="text-slate-500 font-semibold">{range.max}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist Criteria Item Manager */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-500" />
              3. Checklist Item Criteria by 5S Pillar ({formData.checklistCriteria.length} items total)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize standard audit questions, requirements, max scores, and critical flags.
            </p>
          </div>

          {canConfigure && (
            <button
              type="button"
              onClick={() => handleAddCriteria(selectedCategoryTab)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Criteria Item</span>
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
          {FIVE_S_CATEGORIES.map(cat => {
            const count = formData.checklistCriteria.filter(c => c.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryTab(cat.id)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  selectedCategoryTab === cat.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold block truncate">{cat.name}</span>
                <span className="text-[10px] opacity-80">{count} items</span>
              </button>
            );
          })}
        </div>

        {/* Criteria List for Selected Category */}
        <div className="space-y-3 pt-2">
          {currentCategoryCriteria.map((item, idx) => (
            <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      disabled={!canConfigure}
                      value={item.standard}
                      onChange={(e) => handleUpdateCriteria(item.id, 'standard', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Criteria Title / Standard..."
                    />
                  </div>

                  <textarea
                    rows={2}
                    disabled={!canConfigure}
                    value={item.requirement}
                    onChange={(e) => handleUpdateCriteria(item.id, 'requirement', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden pl-8"
                    placeholder="Specific requirement and compliance check details..."
                  />
                </div>

                {canConfigure && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCriteria(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Max Score:</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      disabled={!canConfigure}
                      value={item.maxScore}
                      onChange={(e) => handleUpdateCriteria(item.id, 'maxScore', Number(e.target.value))}
                      className="w-14 px-2 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold text-slate-800"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canConfigure}
                      checked={item.isCritical || false}
                      onChange={(e) => handleUpdateCriteria(item.id, 'isCritical', e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-rose-600 border-slate-300 focus:ring-rose-500"
                    />
                    <span className="text-[11px] font-bold text-rose-700">Flag as Critical Standard</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </form>
  );
}
