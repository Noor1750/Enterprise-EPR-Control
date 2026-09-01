import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Calendar, Clock, Award, Star, CheckCircle2, AlertCircle, 
  HelpCircle, ChevronRight, Save, RotateCcw, Building, Briefcase, 
  Sparkles, Check, Info, ShieldCheck, ArrowRight
} from 'lucide-react';
import { 
  Employee, PerformanceEvaluationRecord, EvaluationScores, 
  EvaluationPeriodType, EVALUATION_CRITERIA_LIST, 
  calculateEvaluationSummary, calculateYearOfService, 
  generateEvaluationPeriodOptions 
} from '../types';

interface EvaluationFormProps {
  employees: Employee[];
  initialData?: PerformanceEvaluationRecord | null;
  onSave: (record: Partial<PerformanceEvaluationRecord>) => Promise<boolean>;
  onCancel?: () => void;
  currentUserEmail?: string;
}

const DEFAULT_SCORES: EvaluationScores = {
  jobKnowledge: 4,
  quantityOfOutput: 4,
  qualityOfWork: 4,
  attendanceCommitment: 4,
  initiativeImprovement: 3,
  dependability: 4,
  attitude: 4,
  creativityAnalytical: 3,
  communicationSkills: 4,
  teamworkRelationship: 4,
};

export default function EvaluationForm({
  employees,
  initialData,
  onSave,
  onCancel,
  currentUserEmail = 'Supervisor'
}: EvaluationFormProps) {
  // Employee Selection State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialData?.employeeId || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Period & Metadata State
  const [evaluationType, setEvaluationType] = useState<EvaluationPeriodType>(initialData?.evaluationType || 'Quarterly');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(initialData?.periodKey || '2026-Q1');
  const [evaluationDate, setEvaluationDate] = useState<string>(
    initialData?.evaluationDate || new Date().toISOString().substring(0, 10)
  );
  const [evaluatedBy, setEvaluatedBy] = useState<string>(initialData?.evaluatedBy || currentUserEmail);

  // Manual Overrides for Employee Metadata if needed
  const [customDateJoined, setCustomDateJoined] = useState<string>(initialData?.dateJoined || '');
  const [customYearOfService, setCustomYearOfService] = useState<string>(initialData?.yearOfService || '');

  // 10 Points Scoring State
  const [scores, setScores] = useState<EvaluationScores>(initialData?.scores || DEFAULT_SCORES);
  
  // Qualitative Feedback State
  const [strengths, setStrengths] = useState<string>(initialData?.strengths || '');
  const [areasOfImprovement, setAreasOfImprovement] = useState<string>(initialData?.areasOfImprovement || '');
  const [recommendation, setRecommendation] = useState<string>(
    initialData?.recommendation || 'Regular Confirmed (Satisfactory Performance)'
  );
  const [comments, setComments] = useState<string>(initialData?.comments || '');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeRubricCriterion, setActiveRubricCriterion] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Period Options generator
  const periodOptions = useMemo(() => generateEvaluationPeriodOptions(), []);
  
  const filteredPeriods = useMemo(() => {
    return periodOptions.filter(p => p.type === evaluationType);
  }, [periodOptions, evaluationType]);

  // Selected Employee Details
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id.toLowerCase() === selectedEmpId.toLowerCase());
  }, [employees, selectedEmpId]);

  // Auto-fill employee info when selected
  useEffect(() => {
    if (selectedEmployee) {
      if (selectedEmployee.dateOfJoin) {
        setCustomDateJoined(selectedEmployee.dateOfJoin);
      }
    }
  }, [selectedEmployee]);

  // Compute Year of Service automatically from Date Joined
  const computedService = useMemo(() => {
    const dj = customDateJoined || selectedEmployee?.dateOfJoin || '';
    return calculateYearOfService(dj, evaluationDate);
  }, [customDateJoined, selectedEmployee, evaluationDate]);

  useEffect(() => {
    if (!initialData && computedService.display !== '—') {
      setCustomYearOfService(computedService.display);
    }
  }, [computedService, initialData]);

  // Live Score & Grade Calculations
  const evaluationSummary = useMemo(() => {
    return calculateEvaluationSummary(scores);
  }, [scores]);

  // Handle Score Change for any point (1-5)
  const handleScoreChange = (key: keyof EvaluationScores, value: number) => {
    setScores(prev => ({
      ...prev,
      [key]: Math.min(5, Math.max(1, value))
    }));
  };

  // Quick preset button handler (e.g. Set all to 5, 4, 3)
  const handleSetAllScores = (val: number) => {
    const updated: any = {};
    EVALUATION_CRITERIA_LIST.forEach(c => {
      updated[c.key] = val;
    });
    setScores(updated);
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedEmpId) {
      setValidationError('Please select an employee to evaluate.');
      return;
    }

    const matchedPeriod = filteredPeriods.find(p => p.periodKey === selectedPeriodKey) || filteredPeriods[0];
    const periodLabel = matchedPeriod ? matchedPeriod.label : selectedPeriodKey;
    const currentYear = matchedPeriod ? matchedPeriod.year : new Date().getFullYear();

    const empName = selectedEmployee?.name || initialData?.employeeName || 'Staff Member';
    const empDesignation = selectedEmployee?.designation || initialData?.designation || '';
    const empDepartment = selectedEmployee?.department || initialData?.department || 'Production';
    const empDateJoined = customDateJoined || selectedEmployee?.dateOfJoin || initialData?.dateJoined || '2024-01-01';
    const empYearOfService = customYearOfService || computedService.display || '1 Year';

    const evaluationRecord: Partial<PerformanceEvaluationRecord> = {
      id: initialData?.id || `EVAL-${currentYear}-${selectedPeriodKey.split('-')[1] || 'EVAL'}-${selectedEmpId}`,
      employeeId: selectedEmpId,
      employeeName: empName,
      designation: empDesignation,
      department: empDepartment,
      dateJoined: empDateJoined,
      yearOfService: empYearOfService,
      evaluationType,
      period: periodLabel,
      periodKey: selectedPeriodKey,
      year: currentYear,
      evaluationDate,
      evaluatedBy: evaluatedBy.trim() || 'Evaluator / Supervisor',
      scores,
      totalScore: evaluationSummary.totalScore,
      totalPossible: evaluationSummary.totalPossible,
      averageRating: evaluationSummary.averageRating,
      percentage: evaluationSummary.percentage,
      ratingGrade: evaluationSummary.ratingGrade,
      strengths: strengths.trim(),
      areasOfImprovement: areasOfImprovement.trim(),
      recommendation: recommendation.trim(),
      comments: comments.trim(),
      status: 'Submitted',
      updatedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      const ok = await onSave(evaluationRecord);
      if (ok) {
        setSuccessToast(`Performance evaluation for ${empName} (${selectedEmpId}) saved successfully!`);
        setTimeout(() => setSuccessToast(null), 4000);
        if (!initialData) {
          // Reset form for next entry
          setSelectedEmpId('');
          setSearchTerm('');
          setScores(DEFAULT_SCORES);
          setStrengths('');
          setAreasOfImprovement('');
          setComments('');
        }
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save evaluation record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter employee list by search term
  const searchableEmployees = useMemo(() => {
    if (!searchTerm) return employees.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return employees.filter(e => 
      e.id.toLowerCase().includes(term) ||
      e.name.toLowerCase().includes(term) ||
      (e.department && e.department.toLowerCase().includes(term)) ||
      (e.designation && e.designation.toLowerCase().includes(term))
    ).slice(0, 50);
  }, [employees, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Toasts */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="font-semibold text-sm">{successToast}</div>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="font-semibold text-sm">{validationError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: Evaluation Period & Employee Data */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Evaluation Scope & Employee Profile
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select assessment frequency (Quarterly, Half Yearly, Yearly) and link employee master records.
              </p>
            </div>

            {/* Evaluation Frequency Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              {(['Quarterly', 'Half Yearly', 'Yearly'] as EvaluationPeriodType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setEvaluationType(type);
                    const opt = periodOptions.find(p => p.type === type);
                    if (opt) setSelectedPeriodKey(opt.periodKey);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    evaluationType === type
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Period Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Evaluation Period
              </label>
              <select
                value={selectedPeriodKey}
                onChange={(e) => setSelectedPeriodKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {filteredPeriods.map(p => (
                  <option key={p.periodKey} value={p.periodKey}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Evaluation Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Evaluation Date
              </label>
              <input
                type="date"
                value={evaluationDate}
                onChange={(e) => setEvaluationDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Evaluator / Supervisor */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Evaluator / Supervisor Name
              </label>
              <input
                type="text"
                value={evaluatedBy}
                onChange={(e) => setEvaluatedBy(e.target.value)}
                placeholder="e.g. Operations Manager / Shift Incharge"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

          </div>

          {/* Employee Selection & Auto-fill Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Employee ID Search & Select */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Select Employee ID *</span>
                  <span className="text-[10px] text-slate-500 font-normal">({employees.length} Staff)</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search by ID, Name or Dept..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <select
                    value={selectedEmpId}
                    onChange={(e) => {
                      setSelectedEmpId(e.target.value);
                      const emp = employees.find(x => x.id === e.target.value);
                      if (emp?.dateOfJoin) setCustomDateJoined(emp.dateOfJoin);
                    }}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Choose Employee --</option>
                    {searchableEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.id} - {emp.name} ({emp.department || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employee Information Display / Verification */}
              <div className="md:col-span-2 bg-white rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Employee Name:</span>
                  <strong className="text-slate-900 text-sm font-bold block truncate">
                    {selectedEmployee?.name || initialData?.employeeName || '—'}
                  </strong>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Designation:</span>
                  <strong className="text-slate-800 block truncate">
                    {selectedEmployee?.designation || initialData?.designation || '—'}
                  </strong>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Department:</span>
                  <strong className="text-slate-800 block truncate">
                    {selectedEmployee?.department || initialData?.department || '—'}
                  </strong>
                </div>

                {/* Date Joined */}
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Date Joined:</span>
                  <input
                    type="date"
                    value={customDateJoined}
                    onChange={(e) => setCustomDateJoined(e.target.value)}
                    className="mt-0.5 w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs font-semibold text-slate-800"
                  />
                </div>

                {/* Year of Service */}
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Year of Service:</span>
                  <input
                    type="text"
                    value={customYearOfService}
                    onChange={(e) => setCustomYearOfService(e.target.value)}
                    placeholder="e.g. 3.5 Years"
                    className="mt-0.5 w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Status:</span>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                    {selectedEmployee?.status || 'Active Staff'}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 2: Live Summary Sticky Scorecard */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-slate-100">Live Evaluation Calculation (50 Marks Total)</h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Each of the 10 criteria carries 5 marks. Final Average Rating is scored out of 5.00.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Set All:</span>
              <button
                type="button"
                onClick={() => handleSetAllScores(5)}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-emerald-300 transition"
              >
                5★ All Max
              </button>
              <button
                type="button"
                onClick={() => handleSetAllScores(4)}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-blue-300 transition"
              >
                4★ Standard
              </button>
              <button
                type="button"
                onClick={() => handleSetAllScores(3)}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-yellow-300 transition"
              >
                3★ Average
              </button>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/60 text-center">
            
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Score
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                {evaluationSummary.totalScore}
                <span className="text-xs text-slate-400 font-normal"> / 50</span>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Average Rating
              </span>
              <div className="flex items-center justify-center gap-1 text-2xl font-black text-amber-400 mt-0.5">
                <Star className="w-5 h-5 fill-amber-400" />
                {evaluationSummary.averageRating.toFixed(2)}
                <span className="text-xs text-slate-400 font-normal"> / 5.0</span>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Percentage
              </span>
              <div className="text-2xl font-black text-blue-400 mt-0.5">
                {evaluationSummary.percentage}%
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Appraisal Grade
              </span>
              <div className="text-sm font-bold text-emerald-300 mt-1 truncate">
                {evaluationSummary.ratingGrade}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: 10 Evaluation Points (Each 5 Marks) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                10-Point Performance Criteria Assessment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rate each competency from 1 (Unsatisfactory) to 5 (Outstanding).
              </p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
              5 Marks Per Point • 10 Points
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {EVALUATION_CRITERIA_LIST.map((criterion, index) => {
              const currentVal = scores[criterion.key] || 3;
              const isRubricOpen = activeRubricCriterion === criterion.id;

              return (
                <div 
                  key={criterion.id}
                  className={`rounded-xl border transition-all p-4 ${
                    currentVal >= 4 ? 'border-slate-200 bg-white hover:border-indigo-300' :
                    currentVal === 3 ? 'border-slate-200 bg-slate-50/40' : 'border-amber-200 bg-amber-50/20'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    
                    {/* Left: Criteria Title, Description & Number */}
                    <div className="space-y-1 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {criterion.id}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">
                          {criterion.title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActiveRubricCriterion(isRubricOpen ? null : criterion.id)}
                          className="text-slate-400 hover:text-indigo-600 transition p-0.5"
                          title="View benchmark scoring rubric"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 ml-8 leading-relaxed">
                        {criterion.description}
                      </p>
                    </div>

                    {/* Right: Interactive 1-5 Rating Selector */}
                    <div className="flex items-center gap-1.5 ml-8 md:ml-0 shrink-0">
                      {[1, 2, 3, 4, 5].map(mark => (
                        <button
                          key={mark}
                          type="button"
                          onClick={() => handleScoreChange(criterion.key, mark)}
                          className={`w-10 h-10 rounded-xl font-black text-sm transition-all flex flex-col items-center justify-center border ${
                            currentVal === mark
                              ? mark === 5 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105' :
                                mark === 4 ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105' :
                                mark === 3 ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105' :
                                mark === 2 ? 'bg-amber-600 text-white border-amber-600 shadow-sm scale-105' :
                                'bg-rose-600 text-white border-rose-600 shadow-sm scale-105'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span>{mark}</span>
                          <span className="text-[9px] font-normal opacity-80 -mt-1">
                            {mark === 5 ? 'Exc' : mark === 4 ? 'Good' : mark === 3 ? 'Avg' : mark === 2 ? 'Low' : 'Min'}
                          </span>
                        </button>
                      ))}

                      {/* Current Score Tag */}
                      <div className="ml-2 pl-3 border-l border-slate-200 text-right min-w-[70px]">
                        <span className="text-xs font-bold text-slate-900 block">
                          {currentVal} / 5
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {currentVal === 5 ? 'Outstanding' : currentVal === 4 ? 'Very Good' : currentVal === 3 ? 'Satisfactory' : currentVal === 2 ? 'Fair' : 'Poor'}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Expandable Rubric Guide */}
                  {isRubricOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs bg-slate-50 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div 
                          key={level} 
                          onClick={() => handleScoreChange(criterion.key, level)}
                          className={`p-2 rounded-md cursor-pointer transition border ${
                            currentVal === level ? 'bg-white border-indigo-400 font-semibold shadow-2xs' : 'border-transparent text-slate-600 hover:bg-white/80'
                          }`}
                        >
                          <span className="font-bold text-[11px] block text-slate-800">
                            {level} Mark{level > 1 ? 's' : ''}:
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {criterion.rubric[level as 1 | 2 | 3 | 4 | 5]}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Qualitative Observations & Recommendations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Qualitative Feedback & Recommendations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Document strengths, development opportunities, and career progression action items.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Key Strengths */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Key Strengths & Notable Achievements
              </label>
              <textarea
                rows={3}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="e.g. Excellent machine speed adherence, zero customer rejections, proactive team assistance..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Areas of Improvement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Areas for Development & Training Needs
              </label>
              <textarea
                rows={3}
                value={areasOfImprovement}
                onChange={(e) => setAreasOfImprovement(e.target.value)}
                placeholder="e.g. Further cross-training on automatic setup, reducing changeover scrap..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Manager / HR Recommendation
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Promotion to Senior Role / Lead">Promotion to Senior Role / Lead</option>
                <option value="Salary Increment / Performance Bonus">Salary Increment / Performance Bonus</option>
                <option value="Special Training & Multi-Skilling">Special Training & Multi-Skilling</option>
                <option value="Regular Confirmed (Satisfactory Performance)">Regular Confirmed (Satisfactory Performance)</option>
                <option value="Performance Improvement Plan (PIP - 30 Days)">Performance Improvement Plan (PIP - 30 Days)</option>
                <option value="Follow-up Review next Quarter">Follow-up Review next Quarter</option>
              </select>
            </div>

            {/* General Comments */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                General Remarks / Additional Notes
              </label>
              <input
                type="text"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Additional management remarks..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving Evaluation...' : initialData ? 'Update Performance Evaluation' : 'Save Performance Evaluation'}
          </button>
        </div>

      </form>
    </div>
  );
}
