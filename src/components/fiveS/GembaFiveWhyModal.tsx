import React, { useState } from 'react';
import { 
  X, HelpCircle, ArrowDown, Sparkles, Check, 
  ShieldCheck, AlertCircle, RefreshCw, Save 
} from 'lucide-react';
import { GembaWalkItem, FiveWhyAnalysis, runGembaSmartAssist } from '../../lib/gembaWalkEngine';

interface GembaFiveWhyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GembaWalkItem | null;
  onUpdateItem: (updated: GembaWalkItem) => Promise<void>;
}

export default function GembaFiveWhyModal({
  isOpen,
  onClose,
  item,
  onUpdateItem
}: GembaFiveWhyModalProps) {
  if (!isOpen || !item) return null;

  const [fiveWhy, setFiveWhy] = useState<FiveWhyAnalysis>(item.fiveWhy || {
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    rootCauseSummary: item.rootCause || '',
    systemicCountermeasure: ''
  });

  const [rootCause, setRootCause] = useState<string>(item.rootCause || '');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleAiRegenerate = async () => {
    setIsAiLoading(true);
    try {
      const result = await runGembaSmartAssist({
        observation: item.observationFinding,
        locationAsset: item.locationAsset,
        category: item.category,
        imageData: item.beforePhoto || undefined
      });

      if (result) {
        setFiveWhy(result.fiveWhy);
        setRootCause(result.rootCause);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated: GembaWalkItem = {
        ...item,
        rootCause: rootCause.trim() || fiveWhy.rootCauseSummary || item.rootCause,
        fiveWhy: {
          ...fiveWhy,
          rootCauseSummary: rootCause.trim() || fiveWhy.rootCauseSummary
        },
        updatedAt: new Date().toISOString()
      };
      await onUpdateItem(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (e) {
      alert('Failed to save 5-Why analysis');
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { num: 1, label: 'Why 1 (Direct Physical Symptom)', value: fiveWhy.why1, setter: (val: string) => setFiveWhy({ ...fiveWhy, why1: val }) },
    { num: 2, label: 'Why 2 (Immediate Operational Cause)', value: fiveWhy.why2, setter: (val: string) => setFiveWhy({ ...fiveWhy, why2: val }) },
    { num: 3, label: 'Why 3 (Process / Maintenance Condition)', value: fiveWhy.why3, setter: (val: string) => setFiveWhy({ ...fiveWhy, why3: val }) },
    { num: 4, label: 'Why 4 (Procedural Standard Gap)', value: fiveWhy.why4, setter: (val: string) => setFiveWhy({ ...fiveWhy, why4: val }) },
    { num: 5, label: 'Why 5 (Policy / Systemic Root Cause)', value: fiveWhy.why5, setter: (val: string) => setFiveWhy({ ...fiveWhy, why5: val }) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                5-Why Root Cause Investigation Tree
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {item.locationAsset} • {item.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAiRegenerate}
              disabled={isAiLoading}
              className="px-3 py-1.5 text-xs font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Analyzing...' : 'AI Re-Analyze 5-Why'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Finding Banner */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 text-2xs block uppercase font-extrabold tracking-wider">Initial Gemba Observation</span>
            <p className="font-bold text-slate-950 mt-0.5">
              "{item.observationFinding}"
            </p>
          </div>

          {/* 5-Why Cascade */}
          <div className="space-y-2 relative before:absolute before:left-5 before:top-6 before:bottom-6 before:w-0.5 before:bg-purple-200">
            {steps.map((step, idx) => (
              <div key={step.num} className="relative pl-12">
                <div className="absolute left-2.5 top-2.5 w-5 h-5 rounded-full bg-purple-600 text-white text-2xs font-bold flex items-center justify-center shadow-xs z-10">
                  {step.num}
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-2xs font-bold text-slate-600 uppercase tracking-wide">
                    <span>{step.label}</span>
                  </div>
                  <input
                    type="text"
                    value={step.value}
                    onChange={(e) => step.setter(e.target.value)}
                    placeholder={`Enter explanation for Step ${step.num}...`}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-950 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Root Cause Conclusion */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
            <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>True Root Cause (5-Why Hint Summary)</span>
            </label>
            <input
              type="text"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Concise, actionable root cause summary phrase..."
              className="w-full px-3 py-2 text-xs border border-purple-300 rounded-lg bg-white text-slate-950 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Systemic Visual Countermeasure */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
            <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Systemic 5S Visual Countermeasure</span>
            </label>
            <input
              type="text"
              value={fiveWhy.systemicCountermeasure || ''}
              onChange={(e) => setFiveWhy({ ...fiveWhy, systemicCountermeasure: e.target.value })}
              placeholder="e.g. Implement pre-startup sign-off checklist and color-coded visual boundary..."
              className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg bg-white text-slate-950 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save 5-Why Ladder</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
