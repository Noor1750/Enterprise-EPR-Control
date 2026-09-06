import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Sparkles, AlertTriangle, ShieldAlert, CheckCircle, Camera, 
  Upload, User, Calendar, MapPin, Tag, Wrench, HelpCircle, ArrowRight,
  RefreshCw, Check, Clock, Eye, AlertCircle, Trash2, Sliders
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { 
  GembaWalkItem, 
  GembaCategory, 
  GembaSeverity, 
  GembaStatus,
  GEMBA_CATEGORIES, 
  FiveWhyAnalysis, 
  runGembaSmartAssist,
  dispatchGembaAssignmentNotification
} from '../../lib/gembaWalkEngine';
import { format, addDays } from 'date-fns';

interface GembaWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: GembaWalkItem) => Promise<void>;
  employees: Employee[];
  initialItem?: GembaWalkItem | null;
  currentUserEmail?: string;
  currentUserName?: string;
}

export default function GembaWalkModal({
  isOpen,
  onClose,
  onSave,
  employees,
  initialItem,
  currentUserEmail,
  currentUserName
}: GembaWalkModalProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultTargetDate = format(addDays(new Date(), 5), 'yyyy-MM-dd');

  // Form Fields matching all points in uploaded image:
  // 1. Date
  const [date, setDate] = useState<string>(todayStr);
  // 2. Location / Asset
  const [locationAsset, setLocationAsset] = useState<string>('');
  // 3. Picture (before)
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  // 4. Observation / Finding
  const [observationFinding, setObservationFinding] = useState<string>('');
  // 5. Category
  const [category, setCategory] = useState<GembaCategory>('Safety & Hazard');
  // 6. Risk / Impact
  const [riskImpact, setRiskImpact] = useState<string>('');
  // 7. Severity
  const [severity, setSeverity] = useState<GembaSeverity>('Medium');
  // 8. Root Cause (5-Why hint)
  const [rootCause, setRootCause] = useState<string>('');
  const [fiveWhy, setFiveWhy] = useState<FiveWhyAnalysis>({
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    rootCauseSummary: '',
    systemicCountermeasure: ''
  });
  const [showFiveWhyDetail, setShowFiveWhyDetail] = useState<boolean>(false);
  // 9. Immediate Action Taken/Status
  const [immediateAction, setImmediateAction] = useState<string>('');
  // 10. Responsible
  const [responsible, setResponsible] = useState<string>('');
  const [responsibleId, setResponsibleId] = useState<string>('');
  // 11. Target Date
  const [targetDate, setTargetDate] = useState<string>(defaultTargetDate);
  // 12. Picture (after)
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  // 13. Status
  const [status, setStatus] = useState<GembaStatus>('Open');

  // Verification
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [closureDate, setClosureDate] = useState<string>('');

  // AI State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialItem) {
      setDate(initialItem.date || todayStr);
      setLocationAsset(initialItem.locationAsset || '');
      setBeforePhoto(initialItem.beforePhoto || '');
      setObservationFinding(initialItem.observationFinding || '');
      setCategory(initialItem.category || 'Safety & Hazard');
      setRiskImpact(initialItem.riskImpact || '');
      setSeverity(initialItem.severity || 'Medium');
      setRootCause(initialItem.rootCause || '');
      setFiveWhy(initialItem.fiveWhy || {
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        rootCauseSummary: initialItem.rootCause || '',
        systemicCountermeasure: ''
      });
      setShowFiveWhyDetail(Boolean(initialItem.fiveWhy?.why1));
      setImmediateAction(initialItem.immediateAction || '');
      setResponsible(initialItem.responsible || '');
      setResponsibleId(initialItem.responsibleId || '');
      setTargetDate(initialItem.targetDate || defaultTargetDate);
      setAfterPhoto(initialItem.afterPhoto || '');
      setStatus(initialItem.status || 'Open');
      setVerificationNotes(initialItem.verificationNotes || '');
      setClosureDate(initialItem.closureDate || '');
    } else {
      setDate(todayStr);
      setLocationAsset('');
      setBeforePhoto('');
      setObservationFinding('');
      setCategory('Safety & Hazard');
      setRiskImpact('');
      setSeverity('Medium');
      setRootCause('');
      setFiveWhy({
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        rootCauseSummary: '',
        systemicCountermeasure: ''
      });
      setShowFiveWhyDetail(false);
      setImmediateAction('');
      if (employees.length > 0) {
        setResponsible(employees[0].name);
        setResponsibleId(employees[0].id);
      } else {
        setResponsible('');
        setResponsibleId('');
      }
      setTargetDate(defaultTargetDate);
      setAfterPhoto('');
      setStatus('Open');
      setVerificationNotes('');
      setClosureDate('');
    }
    setAiSuccessMessage(null);
  }, [isOpen, initialItem, employees]);

  // Handle Photo Upload & Base64 Conversion
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo is too large (max 5MB). Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'before') {
        setBeforePhoto(dataUrl);
      } else {
        setAfterPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run AI Smart 5-Why & Risk Analysis
  const handleRunAiSmartAssist = async () => {
    if (!observationFinding.trim() && !locationAsset.trim()) {
      alert('Please enter an Observation / Finding or Location / Asset first so the AI can analyze it.');
      return;
    }

    setIsAiLoading(true);
    setAiSuccessMessage(null);

    try {
      const result = await runGembaSmartAssist({
        observation: observationFinding,
        locationAsset,
        category,
        imageData: beforePhoto || undefined
      });

      if (result) {
        setCategory(result.category);
        setRiskImpact(result.riskImpact);
        setSeverity(result.severity);
        setRootCause(result.rootCause);
        setFiveWhy(result.fiveWhy);
        setShowFiveWhyDetail(true);
        if (!immediateAction.trim() && result.immediateAction) {
          setImmediateAction(result.immediateAction);
        }
        if (result.suggestedTargetDays) {
          setTargetDate(format(addDays(new Date(), result.suggestedTargetDays), 'yyyy-MM-dd'));
        }

        setAiSuccessMessage(
          result.source === 'gemini' 
            ? '✨ Gemini AI performed 5-Why analysis & risk rating!' 
            : '⚡ Smart Lean Manufacturing heuristics applied!'
        );
        setTimeout(() => setAiSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Smart assist error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle Employee selection
  const handleEmployeeChange = (empName: string) => {
    setResponsible(empName);
    const matched = employees.find(e => e.name === empName);
    if (matched) {
      setResponsibleId(matched.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationAsset.trim()) {
      alert('Please enter Location / Asset.');
      return;
    }
    if (!observationFinding.trim()) {
      alert('Please enter Observation / Finding.');
      return;
    }
    if (!responsible.trim()) {
      alert('Please assign a Responsible person.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemToSave: GembaWalkItem = {
        id: initialItem?.id || `GW-${format(new Date(), 'yyyy')}-${String(Math.floor(100 + Math.random() * 900))}`,
        date,
        locationAsset: locationAsset.trim(),
        beforePhoto: beforePhoto || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=60',
        observationFinding: observationFinding.trim(),
        category,
        riskImpact: riskImpact.trim() || 'General 5S & visual standard non-conformance.',
        severity,
        rootCause: rootCause.trim() || fiveWhy.rootCauseSummary || 'Root cause under investigation.',
        fiveWhy: {
          ...fiveWhy,
          rootCauseSummary: rootCause.trim() || fiveWhy.rootCauseSummary
        },
        immediateAction: immediateAction.trim() || 'Immediate visual tagging and area perimeter containment.',
        responsible: responsible.trim(),
        responsibleId,
        targetDate,
        afterPhoto: afterPhoto || undefined,
        status,
        closureDate: (status === 'Resolved' || status === 'Verified & Closed') ? (closureDate || todayStr) : undefined,
        closedBy: (status === 'Resolved' || status === 'Verified & Closed') ? (currentUserName || 'Gemba Lead') : undefined,
        verificationNotes: verificationNotes.trim() || undefined,
        walkerName: initialItem?.walkerName || currentUserName || 'Md. Noor Alam',
        walkerId: initialItem?.walkerId || currentUserEmail || 'ADMIN-001',
        createdAt: initialItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(itemToSave);

      // Dispatch universal notification if assigning to someone
      if (itemToSave.responsible) {
        dispatchGembaAssignmentNotification(itemToSave, currentUserEmail, currentUserName);
      }

      onClose();
    } catch (err: any) {
      alert('Failed to save Gemba Walk finding: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header - Crisp White Background matching clean standard */}
        <div className="p-5 sm:p-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  {initialItem ? 'Edit Gemba Walk Finding' : 'Log New Gemba Walk Finding'}
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {initialItem ? initialItem.id : '13-Point Audit'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                13-Point Visual Gemba Audit with Smart 5-Why Root Cause & Risk Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Quick Banner */}
        <div className="px-6 py-2.5 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span>
              <strong className="text-rose-700">Smart Gemba Engine:</strong> Auto-evaluate 5-Why root causes, hazard severity, risk impact, and instant countermeasures.
            </span>
          </div>

          <button
            type="button"
            onClick={handleRunAiSmartAssist}
            disabled={isAiLoading || (!observationFinding.trim() && !locationAsset.trim())}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Analyzing...' : 'Smart 5-Why & Risk Analysis'}</span>
          </button>
        </div>

        {aiSuccessMessage && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* Scrollable Form Body - Pure White Background */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          
          {/* Row 1: Date & Location / Asset */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Location / Asset <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Sewing Floor A - Line 4 Station 12 / CNC Machine #2 / Raw Material Bay C"
                  value={locationAsset}
                  onChange={(e) => setLocationAsset(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Picture (before) & Picture (after) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* 3. Picture (before) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-rose-500" />
                  <span>3. Picture (before)</span>
                </label>
                {beforePhoto && (
                  <button
                    type="button"
                    onClick={() => setBeforePhoto('')}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {beforePhoto ? (
                <div className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  <img src={beforePhoto} alt="Before" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputBeforeRef.current?.click()}
                      className="px-2.5 py-1 text-xs bg-white text-slate-900 rounded font-medium shadow-xs cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputBeforeRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-lg p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 aspect-video bg-white"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-medium text-slate-700">
                    Upload Before Condition Photo
                  </span>
                  <span className="text-[10px] text-slate-400">Click or drag & drop PNG/JPG (Max 5MB)</span>
                </div>
              )}
              <input
                ref={fileInputBeforeRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, 'before')}
              />
            </div>

            {/* 12. Picture (after) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>12. Picture (after) <span className="text-slate-400 font-normal">(Post-Resolution)</span></span>
                </label>
                {afterPhoto && (
                  <button
                    type="button"
                    onClick={() => setAfterPhoto('')}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {afterPhoto ? (
                <div className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  <img src={afterPhoto} alt="After" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputAfterRef.current?.click()}
                      className="px-2.5 py-1 text-xs bg-white text-slate-900 rounded font-medium shadow-xs cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputAfterRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-lg p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 aspect-video bg-white"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-medium text-slate-700">
                    Upload After Improvement Photo
                  </span>
                  <span className="text-[10px] text-slate-400">Shows standardized visual 5S resolution</span>
                </div>
              )}
              <input
                ref={fileInputAfterRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, 'after')}
              />
            </div>
          </div>

          {/* Row 3: 4. Observation / Finding */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                4. Observation / Finding <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleRunAiSmartAssist}
                disabled={isAiLoading || !observationFinding.trim()}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill 5-Why & Risk
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Detail the shop-floor anomaly, safety concern, or 5S non-conformance observed during Gemba walk..."
              value={observationFinding}
              onChange={(e) => setObservationFinding(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Row 4: 5. Category | 6. Risk / Impact | 7. Severity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 5. Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                5. Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GembaCategory)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              >
                {GEMBA_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* 7. Severity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                7. Severity <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['Low', 'Medium', 'High', 'Critical'] as GembaSeverity[]).map(sev => {
                  const isSelected = severity === sev;
                  let colorClasses = 'border-slate-300 text-slate-600 hover:bg-slate-50';
                  if (isSelected) {
                    if (sev === 'Critical') colorClasses = 'bg-rose-600 border-rose-600 text-white font-bold shadow-xs';
                    else if (sev === 'High') colorClasses = 'bg-orange-600 border-orange-600 text-white font-bold shadow-xs';
                    else if (sev === 'Medium') colorClasses = 'bg-amber-600 border-amber-600 text-white font-bold shadow-xs';
                    else colorClasses = 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs';
                  }
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-2 px-1 text-[11px] rounded-lg border text-center transition cursor-pointer ${colorClasses}`}
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 13. Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                13. Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GembaStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-medium"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Verified & Closed">Verified & Closed</option>
              </select>
            </div>
          </div>

          {/* 6. Risk / Impact */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              6. Risk / Impact Assessment
            </label>
            <input
              type="text"
              placeholder="e.g. Operator trip injury danger, downtime risk, material contamination, or production delay"
              value={riskImpact}
              onChange={(e) => setRiskImpact(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          {/* 8. Root Cause (5-Why hint) & Interactive 5-Why Tree */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>8. Root Cause (5-Why hint)</span>
              </label>
              
              <button
                type="button"
                onClick={() => setShowFiveWhyDetail(!showFiveWhyDetail)}
                className="text-[11px] text-purple-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>{showFiveWhyDetail ? 'Hide 5-Why Progression' : 'Expand Full 5-Why Tree'}</span>
              </button>
            </div>

            <input
              type="text"
              placeholder="Summary of systemic root cause (e.g. Workstation layout changed without MOC 5S electrical clearance sign-off)"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />

            {/* Expandable 5-Why Interactive Stepper */}
            {showFiveWhyDetail && (
              <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                <p className="text-slate-500 italic text-[11px]">
                  Drill down step-by-step from direct physical symptom to managerial/process root cause:
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-slate-700 shrink-0 text-[11px]">Why 1:</span>
                    <input
                      type="text"
                      placeholder="Why did this symptom occur?"
                      value={fiveWhy.why1}
                      onChange={(e) => setFiveWhy({ ...fiveWhy, why1: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-slate-700 shrink-0 text-[11px]">Why 2:</span>
                    <input
                      type="text"
                      placeholder="Why did the cause in Why 1 happen?"
                      value={fiveWhy.why2}
                      onChange={(e) => setFiveWhy({ ...fiveWhy, why2: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-slate-700 shrink-0 text-[11px]">Why 3:</span>
                    <input
                      type="text"
                      placeholder="Why was that condition allowed?"
                      value={fiveWhy.why3}
                      onChange={(e) => setFiveWhy({ ...fiveWhy, why3: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-slate-700 shrink-0 text-[11px]">Why 4:</span>
                    <input
                      type="text"
                      placeholder="Why did the system or standard fail to prevent it?"
                      value={fiveWhy.why4}
                      onChange={(e) => setFiveWhy({ ...fiveWhy, why4: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-slate-700 shrink-0 text-[11px]">Why 5:</span>
                    <input
                      type="text"
                      placeholder="Why does our policy or training allow this gap? (True Root Cause)"
                      value={fiveWhy.why5}
                      onChange={(e) => setFiveWhy({ ...fiveWhy, why5: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  {fiveWhy.systemicCountermeasure && (
                    <div className="p-2.5 bg-purple-50 rounded-lg text-purple-900 border border-purple-200 text-xs">
                      <strong>Systemic Visual Countermeasure:</strong> {fiveWhy.systemicCountermeasure}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Row 5: 9. Immediate Action Taken/Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              9. Immediate Action Taken / Status <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Containment action taken on the spot during walk (e.g. Cordoned off area, taped cable bridge, cleaned puddle, red tagged)"
              value={immediateAction}
              onChange={(e) => setImmediateAction(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          {/* Row 6: 10. Responsible & 11. Target Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                10. Responsible Person <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={responsible}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                >
                  <option value="">Select Responsible Person...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.id}) - {emp.department}
                    </option>
                  ))}
                  {/* Fallback if responsible isn't in employees */}
                  {responsible && !employees.some(e => e.name === responsible) && (
                    <option value={responsible}>{responsible}</option>
                  )}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Will trigger automatic universal assignment notification alert with sound chime.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                11. Target Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Optional Closure / Verification Section if status is resolved/verified */}
          {(status === 'Resolved' || status === 'Verified & Closed') && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Verification & Closure Notes</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Closure / Sign-off Date
                  </label>
                  <input
                    type="date"
                    value={closureDate || todayStr}
                    onChange={(e) => setClosureDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-emerald-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Verification Standard Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified on shop-floor; 5S standard sustained for 3 consecutive shifts."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-emerald-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

        </form>

        {/* Modal Footer - White Background matching Breakdown Log */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunAiSmartAssist}
              disabled={isAiLoading || (!observationFinding.trim() && !locationAsset.trim())}
              className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Re-Analyze</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-2xs transition flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{initialItem ? 'Update Gemba Finding' : 'Save & Dispatch Action'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
