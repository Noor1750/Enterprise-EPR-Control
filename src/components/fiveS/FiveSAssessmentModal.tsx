import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, AlertTriangle, Sparkles, Eye, Camera, ShieldCheck, 
  Info, Layers, User, Calendar, Briefcase, Award, Save, RefreshCw, AlertCircle
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { 
  FiveSAssessment, 
  ChecklistResponse, 
  FiveSCategoryKey, 
  FIVE_S_CATEGORIES, 
  ComplianceStatus, 
  getFiveSSettings, 
  calculateAssessmentScores,
  AssessmentFrequency
} from '../../lib/fiveSEngine';
import { format } from 'date-fns';

interface FiveSAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assessment: FiveSAssessment, newActionsToCreate?: any[]) => Promise<void>;
  employees: Employee[];
  initialAssessment?: FiveSAssessment | null;
  existingAssessments?: FiveSAssessment[];
  currentUserEmail: string;
  currentUserName: string;
  currentUserId?: string;
}

export default function FiveSAssessmentModal({
  isOpen,
  onClose,
  onSave,
  employees,
  initialAssessment,
  existingAssessments = [],
  currentUserEmail,
  currentUserName,
  currentUserId = 'ADMIN-001'
}: FiveSAssessmentModalProps) {
  const settings = useMemo(() => getFiveSSettings(), []);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const currentMonthStr = useMemo(() => format(new Date(), 'yyyy-MM'), []);

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [assessmentDate, setAssessmentDate] = useState<string>(todayStr);
  const [assessmentMonth, setAssessmentMonth] = useState<string>(currentMonthStr);
  const [frequency, setFrequency] = useState<AssessmentFrequency>('Monthly');
  const [remarks, setRemarks] = useState<string>('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<FiveSCategoryKey>('sort');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Checklist responses state
  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>({});

  // Corrective action drafts generated from low scores / deviations
  const [actionDrafts, setActionDrafts] = useState<Record<string, {
    observation: string;
    rootCause: string;
    correctiveAction: string;
    targetDate: string;
    responsiblePerson: string;
  }>>({});

  // Selected Employee object from Master list
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Initialize or reset form when modal opens or initialAssessment changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialAssessment) {
      setSelectedEmpId(initialAssessment.employeeId);
      setAssessmentDate(initialAssessment.date || todayStr);
      setAssessmentMonth(initialAssessment.month || initialAssessment.period || currentMonthStr);
      setFrequency(initialAssessment.frequency || 'Monthly');
      setRemarks(initialAssessment.remarks || '');

      const respMap: Record<string, ChecklistResponse> = {};
      if (initialAssessment.checklistResponses && initialAssessment.checklistResponses.length > 0) {
        initialAssessment.checklistResponses.forEach(r => {
          respMap[r.itemId] = r;
        });
      } else {
        // Initialize from criteria
        settings.checklistCriteria.forEach(c => {
          respMap[c.id] = {
            itemId: c.id,
            category: c.category,
            score: c.maxScore,
            maxScore: c.maxScore,
            status: 'Compliant',
            remarks: ''
          };
        });
      }
      setResponses(respMap);
    } else {
      // Default to first employee if not set
      if (!selectedEmpId && employees.length > 0) {
        setSelectedEmpId(employees[0].id);
      }
      setAssessmentDate(todayStr);
      setAssessmentMonth(currentMonthStr);
      setFrequency('Monthly');
      setRemarks('');

      const defaultResponses: Record<string, ChecklistResponse> = {};
      settings.checklistCriteria.forEach(c => {
        defaultResponses[c.id] = {
          itemId: c.id,
          category: c.category,
          score: c.maxScore,
          maxScore: c.maxScore,
          status: 'Compliant',
          remarks: ''
        };
      });
      setResponses(defaultResponses);
    }
    setActionDrafts({});
  }, [isOpen, initialAssessment, employees, settings, todayStr, currentMonthStr]);

  // Check for duplicate assessments
  useEffect(() => {
    if (!selectedEmpId || !assessmentMonth || initialAssessment) {
      setDuplicateWarning(null);
      return;
    }
    const existing = existingAssessments.find(a => 
      a.employeeId === selectedEmpId && a.month === assessmentMonth
    );
    if (existing) {
      setDuplicateWarning(
        `Note: An assessment already exists for ${existing.employeeName} in ${assessmentMonth} (Score: ${existing.finalScore}%). Submitting will create an additional audit record.`
      );
    } else {
      setDuplicateWarning(null);
    }
  }, [selectedEmpId, assessmentMonth, existingAssessments, initialAssessment]);

  // Live score calculation
  const calculatedScores = useMemo(() => {
    const responseArray: ChecklistResponse[] = Object.values(responses);
    return calculateAssessmentScores(responseArray, settings);
  }, [responses, settings]);

  const handleScoreChange = (itemId: string, category: FiveSCategoryKey, newScore: number, maxScore: number) => {
    const safeScore = Math.max(0, Math.min(maxScore, newScore));
    let status: ComplianceStatus = 'Compliant';
    if (safeScore === maxScore) status = 'Compliant';
    else if (safeScore >= maxScore * 0.7) status = 'Minor Deviation';
    else status = 'Major Deviation';

    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { itemId, category, maxScore }),
        score: safeScore,
        status,
        requiresAction: safeScore < maxScore * 0.8
      }
    }));

    // Auto-prepare corrective action draft if deviation occurs
    if (safeScore < maxScore * 0.8 && !actionDrafts[itemId]) {
      const crit = settings.checklistCriteria.find(c => c.id === itemId);
      setActionDrafts(prev => ({
        ...prev,
        [itemId]: {
          observation: `Score ${safeScore}/${maxScore} on ${crit?.standard || 'housekeeping item'}.`,
          rootCause: '',
          correctiveAction: `Improve ${crit?.standard || '5S compliance'} to meet required standards.`,
          targetDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          responsiblePerson: selectedEmployee?.name || currentUserName
        }
      }));
    }
  };

  const handleStatusChange = (itemId: string, category: FiveSCategoryKey, status: ComplianceStatus, maxScore: number) => {
    let score = maxScore;
    if (status === 'Compliant') score = maxScore;
    else if (status === 'Minor Deviation') score = Math.round(maxScore * 0.7);
    else if (status === 'Major Deviation') score = Math.round(maxScore * 0.3);
    else if (status === 'N/A') score = maxScore;

    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { itemId, category, maxScore }),
        score,
        status,
        requiresAction: status === 'Minor Deviation' || status === 'Major Deviation'
      }
    }));
  };

  const handleItemRemarksChange = (itemId: string, category: FiveSCategoryKey, text: string, maxScore: number) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { itemId, category, maxScore, score: maxScore, status: 'Compliant' }),
        remarks: text
      }
    }));
  };

  const handleEvidencePhotoUpload = (itemId: string, category: FiveSCategoryKey, file: File, maxScore: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setResponses(prev => ({
        ...prev,
        [itemId]: {
          ...(prev[itemId] || { itemId, category, maxScore, score: maxScore, status: 'Compliant' }),
          evidencePhoto: base64
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleActionDraftChange = (itemId: string, field: string, value: string) => {
    setActionDrafts(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          observation: '',
          rootCause: '',
          correctiveAction: '',
          targetDate: todayStr,
          responsiblePerson: selectedEmployee?.name || ''
        }),
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert('Please select a valid employee.');
      return;
    }

    setIsSubmitting(true);
    try {
      const assessmentId = initialAssessment?.id || `5S-${assessmentMonth}-${Date.now().toString().slice(-6)}`;
      const responseList: ChecklistResponse[] = Object.values(responses);

      // Collect new corrective actions to spawn
      const generatedActions: any[] = [];
      (Object.entries(actionDrafts) as [string, { observation: string; rootCause: string; correctiveAction: string; targetDate: string; responsiblePerson: string }][]).forEach(([itemId, draft], idx) => {
        const resp = responses[itemId];
        if (resp && resp.requiresAction && draft.correctiveAction.trim()) {
          const crit = settings.checklistCriteria.find(c => c.id === itemId);
          generatedActions.push({
            id: `ACT-${Date.now().toString().slice(-6)}-${idx + 1}`,
            assessmentId,
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name,
            department: selectedEmployee.department || 'Production',
            section: (selectedEmployee as any).workingArea || 'Floor 1',
            category: resp.category,
            observation: draft.observation || `Deviation observed in ${crit?.standard || resp.category}`,
            nonConformance: crit?.requirement || 'Standard not fully met',
            rootCause: draft.rootCause || 'Under review during shift audit',
            correctiveAction: draft.correctiveAction,
            responsiblePerson: draft.responsiblePerson || selectedEmployee.name,
            targetDate: draft.targetDate || todayStr,
            status: 'Open',
            isCritical: crit?.isCritical || false,
            createdBy: currentUserEmail,
            createdAt: new Date().toISOString()
          });
        }
      });

      const newAssessment: FiveSAssessment = {
        id: assessmentId,
        date: assessmentDate,
        month: assessmentMonth,
        period: assessmentMonth,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        department: selectedEmployee.department || 'Production',
        section: (selectedEmployee as any).workingArea || (selectedEmployee as any).section || 'Floor 1',
        designation: selectedEmployee.designation || 'Operator',
        supervisorName: (selectedEmployee as any).supervisor || 'Sarah Connor',
        managerName: (selectedEmployee as any).manager || 'Michael Scott',
        shift: (selectedEmployee as any).shift || 'Day Shift',
        assessorId: currentUserId,
        assessorName: currentUserName,
        assessorEmail: currentUserEmail,
        frequency,
        sortScore: calculatedScores.sortScore,
        setInOrderScore: calculatedScores.setInOrderScore,
        shineScore: calculatedScores.shineScore,
        standardizeScore: calculatedScores.standardizeScore,
        sustainScore: calculatedScores.sustainScore,
        total5SScore: calculatedScores.total5SScore,
        visualScore: calculatedScores.visualScore,
        finalScore: calculatedScores.finalScore,
        rating: calculatedScores.rating.label,
        ratingLabel: calculatedScores.rating.label,
        ratingColor: calculatedScores.rating.color,
        badgeClass: calculatedScores.rating.badgeClass,
        checklistResponses: responseList,
        remarks: remarks.trim() || '5S assessment completed.',
        correctiveActionsCount: generatedActions.length,
        criticalViolationsCount: calculatedScores.criticalViolationsCount,
        status: 'Approved',
        createdBy: initialAssessment?.createdBy || currentUserEmail,
        createdAt: initialAssessment?.createdAt || new Date().toISOString(),
        updatedBy: currentUserEmail,
        updatedAt: new Date().toISOString()
      };

      await onSave(newAssessment, generatedActions);
      onClose();
    } catch (err) {
      console.error('Failed to submit 5S assessment:', err);
      alert('Error saving assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentTabCriteria = settings.checklistCriteria.filter(c => c.category === activeCategoryTab);
  const activeCategoryMeta = FIVE_S_CATEGORIES.find(c => c.id === activeCategoryTab) || FIVE_S_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {initialAssessment ? 'Edit 5S & Visual Assessment' : 'New 5S & Visual Management Assessment'}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  {settings.fiveSWeight}% 5S + {settings.visualWeight}% Visual
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditor: <span className="text-slate-200 font-semibold">{currentUserName}</span> | Standard Housekeeping & Visual Control Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Score Summary Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Total 5S Score</span>
              <span className="text-xl font-black text-slate-800">{calculatedScores.total5SScore}%</span>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Visual Mgmt</span>
              <span className="text-xl font-black text-slate-800">{calculatedScores.visualScore}%</span>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Final Weighted</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-blue-600">{calculatedScores.finalScore}%</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${calculatedScores.rating.badgeClass}`}>
                  {calculatedScores.rating.label}
                </span>
              </div>
            </div>
          </div>

          {calculatedScores.criticalViolationsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{calculatedScores.criticalViolationsCount} Critical Safety/5S Violation(s)</span>
            </div>
          )}
        </div>

        {duplicateWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-800 text-xs font-medium shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Employee & Audit Information */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              1. Employee & Audit Parameters (Linked to Employee Master)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Employee *
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  disabled={!!initialAssessment}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100"
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.id} - {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assessment Month *
                </label>
                <input
                  type="month"
                  value={assessmentMonth}
                  onChange={(e) => setAssessmentMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audit Date *
                </label>
                <input
                  type="date"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audit Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as AssessmentFrequency)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="Monthly">Monthly Evaluation</option>
                  <option value="Weekly">Weekly Housekeeping Check</option>
                  <option value="Daily">Daily Floor Routine</option>
                  <option value="Special">Special / Surprise Audit</option>
                </select>
              </div>
            </div>

            {/* Resolved Employee Master Card */}
            {selectedEmployee && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Department</span>
                  <span className="font-bold text-slate-800">{selectedEmployee.department || 'Cutting'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Designation</span>
                  <span className="font-bold text-slate-800">{selectedEmployee.designation || 'Operator'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Section / Floor</span>
                  <span className="font-bold text-slate-800">{(selectedEmployee as any).workingArea || 'Floor 1'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Shift</span>
                  <span className="font-bold text-slate-800">{(selectedEmployee as any).shift || 'Day Shift'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Supervisor</span>
                  <span className="font-bold text-slate-800">{(selectedEmployee as any).supervisor || 'Sarah Connor'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Manager</span>
                  <span className="font-bold text-slate-800">{(selectedEmployee as any).manager || 'Michael Scott'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: 5S & Visual Management Checklist */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                2. Standard 5S & Visual Management Checklist Criteria
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Click category tabs to score each criteria
              </span>
            </div>

            {/* Category Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {FIVE_S_CATEGORIES.map(cat => {
                const isActive = activeCategoryTab === cat.id;
                const catScore = cat.id === 'sort' ? calculatedScores.sortScore :
                                 cat.id === 'setInOrder' ? calculatedScores.setInOrderScore :
                                 cat.id === 'shine' ? calculatedScores.shineScore :
                                 cat.id === 'standardize' ? calculatedScores.standardizeScore :
                                 cat.id === 'sustain' ? calculatedScores.sustainScore :
                                 calculatedScores.visualScore;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryTab(cat.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isActive
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">{cat.name}</span>
                      <span className={`text-xs font-extrabold ${catScore >= 80 ? 'text-emerald-600' : catScore >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {catScore}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate">{cat.japaneseName}</span>
                  </button>
                );
              })}
            </div>

            {/* Category Header Card */}
            <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-200/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                {activeCategoryMeta.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">{activeCategoryMeta.name} — {activeCategoryMeta.japaneseName}</span>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{activeCategoryMeta.description}</p>
              </div>
            </div>

            {/* Criteria Evaluation Rows */}
            <div className="space-y-3">
              {currentTabCriteria.map((item, idx) => {
                const resp = responses[item.id] || {
                  itemId: item.id,
                  category: item.category,
                  score: item.maxScore,
                  maxScore: item.maxScore,
                  status: 'Compliant' as ComplianceStatus,
                  remarks: ''
                };

                const currentScore = resp.score;
                const status = resp.status;
                const draft = actionDrafts[item.id];

                return (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      resp.status === 'Major Deviation' ? 'bg-rose-50/40 border-rose-200' :
                      resp.status === 'Minor Deviation' ? 'bg-amber-50/30 border-amber-200' :
                      'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Criteria info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{item.standard}</h4>
                          {item.isCritical && (
                            <span className="px-2 py-0.2 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Critical Standard
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed pl-7">
                          {item.requirement}
                        </p>
                      </div>

                      {/* Right: Compliance Buttons & Score Slider */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                        {/* Status Chips */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          {(['Compliant', 'Minor Deviation', 'Major Deviation', 'N/A'] as ComplianceStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(item.id, item.category, st, item.maxScore)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                status === st
                                  ? st === 'Compliant' ? 'bg-emerald-600 text-white shadow-xs' :
                                    st === 'Minor Deviation' ? 'bg-amber-500 text-white shadow-xs' :
                                    st === 'Major Deviation' ? 'bg-rose-600 text-white shadow-xs' :
                                    'bg-slate-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-200/70'
                              }`}
                            >
                              {st === 'Compliant' ? 'Compliant' : st === 'Minor Deviation' ? 'Minor Dev' : st === 'Major Deviation' ? 'Major Dev' : 'N/A'}
                            </button>
                          ))}
                        </div>

                        {/* Numeric Score control */}
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                          <label className="text-[10px] font-bold uppercase text-slate-500">Score:</label>
                          <input
                            type="number"
                            min={0}
                            max={item.maxScore}
                            value={currentScore}
                            onChange={(e) => handleScoreChange(item.id, item.category, Number(e.target.value), item.maxScore)}
                            className="w-12 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold text-slate-800"
                          />
                          <span className="text-xs text-slate-400 font-medium">/ {item.maxScore}</span>
                        </div>
                      </div>
                    </div>

                    {/* Remarks & Photo Evidence row */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Specific audit observation or note (optional)..."
                        value={resp.remarks || ''}
                        onChange={(e) => handleItemRemarksChange(item.id, item.category, e.target.value, item.maxScore)}
                        className="flex-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                      />

                      <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0">
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        <span>{resp.evidencePhoto ? 'Photo Attached' : 'Attach Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleEvidencePhotoUpload(item.id, item.category, e.target.files[0], item.maxScore);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Auto-Triggered Corrective Action Draft for deviations */}
                    {(status === 'Minor Deviation' || status === 'Major Deviation') && draft && (
                      <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-700" />
                            Corrective Action Assignment
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold uppercase">Action will be logged upon submission</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Observation / Finding</label>
                            <input
                              type="text"
                              value={draft.observation}
                              onChange={(e) => handleActionDraftChange(item.id, 'observation', e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded text-xs text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Corrective Action Plan</label>
                            <input
                              type="text"
                              value={draft.correctiveAction}
                              onChange={(e) => handleActionDraftChange(item.id, 'correctiveAction', e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded text-xs text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Responsible Person</label>
                            <input
                              type="text"
                              value={draft.responsiblePerson}
                              onChange={(e) => handleActionDraftChange(item.id, 'responsiblePerson', e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded text-xs text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Target Completion Date</label>
                            <input
                              type="date"
                              value={draft.targetDate}
                              onChange={(e) => handleActionDraftChange(item.id, 'targetDate', e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded text-xs text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Overall Auditor Remarks */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-500" />
              3. Auditor Overall Summary & Kaizen Recommendation
            </h3>
            <textarea
              rows={3}
              placeholder="Provide general remarks, noteworthy Kaizen ideas, praise for cleanliness, or recurring housekeeping instructions..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedEmployee}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Assessment...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Submit & Declare Score ({calculatedScores.finalScore}%)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
