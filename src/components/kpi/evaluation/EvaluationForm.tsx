import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  User, Calendar, Clock, Award, Star, CheckCircle2, AlertCircle, 
  HelpCircle, ChevronRight, Save, RotateCcw, Building, Briefcase, 
  Sparkles, Check, Info, ShieldCheck, ArrowRight, Search, ChevronDown, 
  X, FileCheck, AlertTriangle, ExternalLink
} from 'lucide-react';
import { 
  Employee, PerformanceEvaluationRecord, EvaluationScores, 
  EvaluationPeriodType, EVALUATION_CRITERIA_LIST, 
  calculateEvaluationSummary, calculateYearOfService, 
  generateEvaluationPeriodOptions 
} from '../types';
import PerformanceRatingScheme, { KPI_RATING_SCHEME } from './PerformanceRatingScheme';

interface EvaluationFormProps {
  employees: Employee[];
  allEmployees?: Employee[];
  initialData?: PerformanceEvaluationRecord | null;
  existingRecords?: PerformanceEvaluationRecord[];
  onSave: (record: Partial<PerformanceEvaluationRecord>) => Promise<boolean>;
  onCancel?: () => void;
  currentUserEmail?: string;
  userSecurityScope?: any;
  onSelectExistingForEdit?: (record: PerformanceEvaluationRecord) => void;
}

const DEFAULT_SCORES: EvaluationScores = {
  jobKnowledge: 0,
  quantityOfOutput: 0,
  qualityOfWork: 0,
  attendanceCommitment: 0,
  initiativeImprovement: 0,
  dependability: 0,
  attitude: 0,
  creativityAnalytical: 0,
  communicationSkills: 0,
  teamworkRelationship: 0,
};

export default function EvaluationForm({
  employees,
  allEmployees,
  initialData,
  existingRecords = [],
  onSave,
  onCancel,
  currentUserEmail = 'Supervisor',
  userSecurityScope,
  onSelectExistingForEdit
}: EvaluationFormProps) {
  // Employee Selection State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialData?.employeeId || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Evaluator / Supervisor Directory Selection State
  const [evaluatedBy, setEvaluatedBy] = useState<string>(initialData?.evaluatedBy || currentUserEmail);
  const [evaluatorSearchTerm, setEvaluatorSearchTerm] = useState<string>('');
  const [isEvaluatorDropdownOpen, setIsEvaluatorDropdownOpen] = useState<boolean>(false);
  const evaluatorDropdownRef = useRef<HTMLDivElement>(null);
  
  // Period & Metadata State
  const [evaluationType, setEvaluationType] = useState<EvaluationPeriodType>(initialData?.evaluationType || 'Quarterly');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(initialData?.periodKey || '2026-Q1');
  const [evaluationDate, setEvaluationDate] = useState<string>(
    initialData?.evaluationDate || new Date().toISOString().substring(0, 10)
  );

  // Manual Overrides for Employee Metadata if needed
  const [customDateJoined, setCustomDateJoined] = useState<string>(initialData?.dateJoined || '');
  const [customYearOfService, setCustomYearOfService] = useState<string>(initialData?.yearOfService || '');

  // 10 Points Scoring State (Defaults to 0 / Unselected for pending employees)
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

  // Full Directory for Evaluator selection
  const directoryEmployees = useMemo(() => {
    return allEmployees && allEmployees.length > 0 ? allEmployees : employees;
  }, [allEmployees, employees]);

  // Period Options generator
  const periodOptions = useMemo(() => generateEvaluationPeriodOptions(), []);
  
  const filteredPeriods = useMemo(() => {
    return periodOptions.filter(p => p.type === evaluationType);
  }, [periodOptions, evaluationType]);

  const currentPeriodLabel = useMemo(() => {
    const matched = filteredPeriods.find(p => p.periodKey === selectedPeriodKey);
    return matched ? matched.label : selectedPeriodKey;
  }, [filteredPeriods, selectedPeriodKey]);

  // Selected Employee Details
  const selectedEmployee = useMemo(() => {
    return directoryEmployees.find(e => e.id.toLowerCase() === (selectedEmpId || '').toLowerCase()) ||
           employees.find(e => e.id.toLowerCase() === (selectedEmpId || '').toLowerCase());
  }, [directoryEmployees, employees, selectedEmpId]);

  // Check if selected employee has an existing completed/finalized evaluation for this selected period
  const existingEvaluationForPeriod = useMemo(() => {
    if (!selectedEmpId || !existingRecords || existingRecords.length === 0) return null;
    return existingRecords.find(
      r => r.employeeId.toLowerCase() === selectedEmpId.toLowerCase() && 
           r.periodKey === selectedPeriodKey &&
           r.id !== initialData?.id
    ) || null;
  }, [selectedEmpId, selectedPeriodKey, existingRecords, initialData]);

  // Other evaluations on file for this employee
  const otherEvaluationsForEmployee = useMemo(() => {
    if (!selectedEmpId || !existingRecords || existingRecords.length === 0) return [];
    return existingRecords.filter(
      r => r.employeeId.toLowerCase() === selectedEmpId.toLowerCase() &&
           r.periodKey !== selectedPeriodKey
    );
  }, [selectedEmpId, selectedPeriodKey, existingRecords]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (evaluatorDropdownRef.current && !evaluatorDropdownRef.current.contains(event.target as Node)) {
        setIsEvaluatorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fill employee info and automatically select assigned supervisor when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      if (selectedEmployee.dateOfJoin) {
        setCustomDateJoined(selectedEmployee.dateOfJoin);
      }
      // Auto-assign supervisor if creating a new evaluation
      if (!initialData) {
        if (selectedEmployee.supervisor && selectedEmployee.supervisor.trim()) {
          setEvaluatedBy(selectedEmployee.supervisor.trim());
        } else if (selectedEmployee.manager && selectedEmployee.manager.trim()) {
          setEvaluatedBy(selectedEmployee.manager.trim());
        } else if (userSecurityScope?.employeeName) {
          setEvaluatedBy(userSecurityScope.employeeName);
        } else if (currentUserEmail) {
          setEvaluatedBy(currentUserEmail);
        }
      }
    }
  }, [selectedEmployee, initialData, userSecurityScope, currentUserEmail]);

  // Load existing evaluation data if requested
  const handleLoadExistingEvaluation = (evalRecord: PerformanceEvaluationRecord) => {
    if (onSelectExistingForEdit) {
      onSelectExistingForEdit(evalRecord);
      return;
    }
    setSelectedEmpId(evalRecord.employeeId);
    setSelectedPeriodKey(evalRecord.periodKey);
    setEvaluationType(evalRecord.evaluationType);
    setScores(evalRecord.scores || DEFAULT_SCORES);
    setStrengths(evalRecord.strengths || '');
    setAreasOfImprovement(evalRecord.areasOfImprovement || '');
    setRecommendation(evalRecord.recommendation || 'Regular Confirmed (Satisfactory Performance)');
    setComments(evalRecord.comments || '');
    setEvaluationDate(evalRecord.evaluationDate || new Date().toISOString().substring(0, 10));
    setEvaluatedBy(evalRecord.evaluatedBy || currentUserEmail);
    if (evalRecord.dateJoined) setCustomDateJoined(evalRecord.dateJoined);
    if (evalRecord.yearOfService) setCustomYearOfService(evalRecord.yearOfService);
    setSuccessToast(`Loaded existing finalized evaluation (${evalRecord.period}) for ${evalRecord.employeeName}. You can now review or update it.`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

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

    // Strict check: 10-Point Performance Criteria Assessment must all be rated (not 0 / unselected)
    const unratedCriteria = EVALUATION_CRITERIA_LIST.filter(c => !scores[c.key] || scores[c.key] === 0);
    if (unratedCriteria.length > 0) {
      const missingList = unratedCriteria.map(c => `#${c.id} ${c.title}`).join(', ');
      setValidationError(`Please complete assessment for all 10 Performance Criteria before submitting. Unselected (${unratedCriteria.length}/10): ${missingList}`);
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

  // Filter employee list by search term for target employee selection
  const searchableEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    const term = searchTerm.toLowerCase().trim();
    return employees.filter(e => 
      (e.id && e.id.toLowerCase().includes(term)) ||
      (e.name && e.name.toLowerCase().includes(term)) ||
      (e.department && e.department.toLowerCase().includes(term)) ||
      (e.designation && e.designation.toLowerCase().includes(term)) ||
      (e.supervisor && e.supervisor.toLowerCase().includes(term))
    );
  }, [employees, searchTerm]);

  // Filter directory list for Evaluator / Supervisor selection
  const searchableEvaluators = useMemo(() => {
    if (!evaluatorSearchTerm) return directoryEmployees;
    const term = evaluatorSearchTerm.toLowerCase().trim();
    return directoryEmployees.filter(e => 
      (e.id && e.id.toLowerCase().includes(term)) ||
      (e.name && e.name.toLowerCase().includes(term)) ||
      (e.department && e.department.toLowerCase().includes(term)) ||
      (e.designation && e.designation.toLowerCase().includes(term))
    );
  }, [directoryEmployees, evaluatorSearchTerm]);

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
              >
              </input>
            </div>

            {/* Evaluator / Supervisor (Searchable Dropdown as per Employee Directory) */}
            <div className="sm:col-span-2 relative" ref={evaluatorDropdownRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Evaluator / Supervisor Name *</span>
                {selectedEmployee?.supervisor && (
                  <span className="text-[10px] text-indigo-600 font-medium">
                    Assigned: {selectedEmployee.supervisor}
                  </span>
                )}
              </label>

              {/* Evaluator Combobox / Search Trigger */}
              <div className="relative">
                <div 
                  onClick={() => setIsEvaluatorDropdownOpen(true)}
                  className={`w-full bg-white border rounded-xl transition-all shadow-2xs flex items-center justify-between px-3 py-2 cursor-pointer ${
                    isEvaluatorDropdownOpen 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                      : evaluatedBy 
                        ? 'border-slate-300 bg-slate-50/50' 
                        : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={evaluatedBy}
                      onChange={(e) => {
                        setEvaluatedBy(e.target.value);
                        setEvaluatorSearchTerm(e.target.value);
                        setIsEvaluatorDropdownOpen(true);
                      }}
                      onFocus={() => setIsEvaluatorDropdownOpen(true)}
                      placeholder="Search ID, Name or type evaluator..."
                      className="w-full bg-transparent border-none p-0 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {evaluatedBy && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEvaluatedBy('');
                          setEvaluatorSearchTerm('');
                          setIsEvaluatorDropdownOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
                        title="Clear Evaluator"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEvaluatorDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </div>
                </div>

                {/* Dropdown Floating Menu for Evaluator Directory Search */}
                {isEvaluatorDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in max-h-72 flex flex-col">
                    
                    {/* Search Input in Dropdown */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search Evaluator by ID, Name or Dept..."
                        value={evaluatorSearchTerm}
                        onChange={(e) => setEvaluatorSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                        autoFocus
                      />
                      {evaluatorSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setEvaluatorSearchTerm('')}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Quick Suggestions / Assigned Supervisor */}
                    {selectedEmployee?.supervisor && (
                      <div 
                        onClick={() => {
                          setEvaluatedBy(selectedEmployee.supervisor!);
                          setIsEvaluatorDropdownOpen(false);
                          setEvaluatorSearchTerm('');
                        }}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100/80 cursor-pointer border-b border-indigo-100 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          <span className="text-xs font-bold text-indigo-900">
                            Assigned Supervisor: {selectedEmployee.supervisor}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                          Auto-Assigned
                        </span>
                      </div>
                    )}

                    {/* Directory List Items */}
                    <div className="overflow-y-auto max-h-56 divide-y divide-slate-100">
                      {searchableEvaluators.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No matching staff found. You can type a custom evaluator name above.
                        </div>
                      ) : (
                        searchableEvaluators.map((emp) => {
                          const isSelected = evaluatedBy.toLowerCase() === emp.name.toLowerCase() || evaluatedBy.toLowerCase().includes(emp.id.toLowerCase());
                          return (
                            <div
                              key={`evaluator-${emp.id}`}
                              onClick={() => {
                                setEvaluatedBy(`${emp.name} (${emp.id})`);
                                setIsEvaluatorDropdownOpen(false);
                                setEvaluatorSearchTerm('');
                              }}
                              className={`p-2.5 hover:bg-indigo-50/60 cursor-pointer transition flex items-center justify-between gap-2 ${
                                isSelected ? 'bg-indigo-50/90' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                                  {emp.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs truncate text-slate-900">
                                      {emp.name}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                      {emp.id}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                                    <span>{emp.department || 'General'}</span>
                                    {emp.designation && <span>• {emp.designation}</span>}
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer Directory Count */}
                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center justify-between">
                      <span>{searchableEvaluators.length} Staff in Directory</span>
                      <span>Select Evaluator</span>
                    </div>

                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Employee Selection & Auto-fill Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Employee ID Or Name Search & Dropdown */}
              <div className="md:col-span-1 relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Select Employee ID Or Name *</span>
                  <span className="text-[10px] text-slate-500 font-normal">({employees.length} Staff)</span>
                </label>

                {/* Combobox Search Trigger */}
                <div className="relative">
                  <div 
                    onClick={() => setIsDropdownOpen(true)}
                    className={`w-full bg-white border rounded-xl transition-all shadow-2xs flex items-center justify-between px-3 py-2 cursor-pointer ${
                      isDropdownOpen 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                        : selectedEmployee 
                          ? 'border-indigo-300 bg-indigo-50/20' 
                          : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      {selectedEmployee ? (
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px] shrink-0">
                            {selectedEmployee.id}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {selectedEmployee.name}
                          </span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Search by ID, Name, Dept..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsDropdownOpen(true);
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          className="w-full bg-transparent border-none p-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {selectedEmployee && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmpId('');
                            setSearchTerm('');
                            setIsDropdownOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
                          title="Clear Selection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                    </div>
                  </div>

                  {/* Dropdown Floating Menu as per Employee Directory */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in max-h-80 flex flex-col">
                      
                      {/* Search Filter Header */}
                      <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type to filter directory..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-transparent border-none p-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="p-0.5 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Employee List Items */}
                      <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                        {searchableEmployees.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 font-medium">
                            No employees found matching "{searchTerm}".
                          </div>
                        ) : (
                          searchableEmployees.map((emp) => {
                            const isSelected = emp.id.toLowerCase() === selectedEmpId.toLowerCase();
                            
                            // Check if this employee already evaluated for current period
                            const hasPeriodEval = existingRecords.some(
                              r => r.employeeId.toLowerCase() === emp.id.toLowerCase() && r.periodKey === selectedPeriodKey
                            );

                            return (
                              <div
                                key={emp.id}
                                onClick={() => {
                                  setSelectedEmpId(emp.id);
                                  if (emp.dateOfJoin) setCustomDateJoined(emp.dateOfJoin);
                                  setIsDropdownOpen(false);
                                  setSearchTerm('');
                                }}
                                className={`p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition ${
                                  isSelected 
                                    ? 'bg-indigo-50/90 text-indigo-900' 
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Avatar Initials */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white' 
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                  </div>

                                  {/* Info */}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs truncate text-slate-900">
                                        {emp.name}
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                        {emp.id}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                                      <span>{emp.department || 'General'}</span>
                                      {emp.designation && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate">{emp.designation}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Status & Evaluation Badges */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {hasPeriodEval && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" />
                                      Evaluated
                                    </span>
                                  )}
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-indigo-600" />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Directory Count */}
                      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center justify-between">
                        <span>Showing {searchableEmployees.length} of {employees.length} employees</span>
                        <span>Employee Directory</span>
                      </div>

                    </div>
                  )}
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

            {/* MESSAGE BANNER: If selected employee evaluation is already completed / finalized */}
            {existingEvaluationForPeriod && (
              <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 text-emerald-950 shadow-xs animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-emerald-950">
                          Evaluation Completed & Finalized for {currentPeriodLabel}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 border border-emerald-300">
                          ID: {existingEvaluationForPeriod.id}
                        </span>
                      </div>
                      
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        A performance evaluation for <strong>{selectedEmployee?.name || existingEvaluationForPeriod.employeeName} ({existingEvaluationForPeriod.employeeId})</strong> has already been completed and finalized for <strong>{currentPeriodLabel}</strong> on <strong>{existingEvaluationForPeriod.evaluationDate}</strong> by <strong>{existingEvaluationForPeriod.evaluatedBy}</strong>.
                      </p>

                      {/* Performance Summary Snapshot */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-emerald-200/80 text-xs">
                        <span className="px-2.5 py-1 bg-white rounded-lg font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                          Total Score: <strong>{existingEvaluationForPeriod.totalScore} / 50</strong>
                        </span>
                        <span className="px-2.5 py-1 bg-white rounded-lg font-bold text-amber-700 border border-amber-200 shadow-2xs flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          Rating: <strong>{existingEvaluationForPeriod.averageRating.toFixed(2)} / 5.0</strong>
                        </span>
                        <span className="px-2.5 py-1 bg-white rounded-lg font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                          Grade: <strong>{existingEvaluationForPeriod.ratingGrade}</strong>
                        </span>
                        {existingEvaluationForPeriod.recommendation && (
                          <span className="px-2.5 py-1 bg-white rounded-lg text-slate-700 border border-emerald-200 shadow-2xs truncate max-w-xs">
                            Rec: <strong>{existingEvaluationForPeriod.recommendation}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Load / Edit */}
                  <button
                    type="button"
                    onClick={() => handleLoadExistingEvaluation(existingEvaluationForPeriod)}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 self-start"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Load & Edit Record
                  </button>
                </div>
              </div>
            )}

            {/* Past Evaluations Record Note */}
            {!existingEvaluationForPeriod && otherEvaluationsForEmployee.length > 0 && (
              <div className="mt-2 px-3 py-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Employee has <strong>{otherEvaluationsForEmployee.length}</strong> previous evaluation record(s) on file in other periods.
                </span>
                <span className="text-[11px] text-indigo-700 font-semibold">
                  Latest: {otherEvaluationsForEmployee[0].period} ({otherEvaluationsForEmployee[0].averageRating.toFixed(2)} ★)
                </span>
              </div>
            )}

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

        {/* SECTION 2.5: Official 1-5 Performance Evaluation Rating Scheme */}
        <PerformanceRatingScheme 
          collapsible={true}
          defaultExpanded={true}
          interactive={true}
          onSelectPoint={(point) => handleSetAllScores(point)}
          title="Performance Evaluation Rating Scheme (1 – 5 Rating Scale)"
          subtitle="Click any Point card below to apply benchmark preset or reference performance standards"
        />

        {/* SECTION 3: 10 Evaluation Points (Each 5 Marks) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                10-Point Performance Criteria Assessment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rate each competency from 1 (Unsatisfactory) to 5 (Excellent) based on the official rating scheme.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
              5 Marks Per Point • 10 Points
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {EVALUATION_CRITERIA_LIST.map((criterion, index) => {
              const currentVal = scores[criterion.key] || 0;
              const isRubricOpen = activeRubricCriterion === criterion.id;

              return (
                <div 
                  key={criterion.id}
                  className={`rounded-xl border transition-all p-4 ${
                    currentVal === 5 ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300' :
                    currentVal === 4 ? 'border-teal-200 bg-teal-50/20 hover:border-teal-300' :
                    currentVal === 3 ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300' :
                    currentVal === 2 ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300' :
                    currentVal === 1 ? 'border-red-200 bg-red-50/30 hover:border-red-300' :
                    'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    
                    {/* Left: Criteria Title, Description & Number */}
                    <div className="space-y-1 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          currentVal > 0 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
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

                    {/* Right: Interactive 1-5 Rating Selector with Picture 1 Color Coding */}
                    <div className="flex items-center gap-1.5 ml-8 md:ml-0 shrink-0">
                      {[
                        { val: 1, label: 'Unsatisfactory', short: 'Unsat', color: '#E50914', bg: 'bg-[#E50914]' },
                        { val: 2, label: 'Below Average', short: 'Below', color: '#FF5A60', bg: 'bg-[#FF5A60]' },
                        { val: 3, label: 'Average', short: 'Avg', color: '#F7B928', bg: 'bg-[#F7B928]' },
                        { val: 4, label: 'Good', short: 'Good', color: '#38C1B6', bg: 'bg-[#38C1B6]' },
                        { val: 5, label: 'Excellent', short: 'Excel', color: '#00A843', bg: 'bg-[#00A843]' },
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => handleScoreChange(criterion.key, item.val)}
                          style={currentVal === item.val ? { backgroundColor: item.color, borderColor: item.color } : undefined}
                          className={`w-11 h-11 rounded-xl font-black text-sm transition-all flex flex-col items-center justify-center border ${
                            currentVal === item.val
                              ? 'text-white shadow-sm scale-105'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="leading-tight">{item.val}</span>
                          <span className="text-[8px] font-bold tracking-tight opacity-90 -mt-0.5 uppercase">
                            {item.short}
                          </span>
                        </button>
                      ))}

                      {/* Current Score Tag / Unselected State */}
                      <div className="ml-2 pl-3 border-l border-slate-200 text-right min-w-[105px]">
                        {currentVal > 0 ? (
                          <>
                            <span className="text-xs font-bold text-slate-900 block">
                              Point {currentVal} / 5
                            </span>
                            <span 
                              className="text-[10px] font-bold block"
                              style={{
                                color: currentVal === 5 ? '#00A843' :
                                       currentVal === 4 ? '#0D9488' :
                                       currentVal === 3 ? '#D97706' :
                                       currentVal === 2 ? '#FF5A60' : '#E50914'
                              }}
                            >
                              {currentVal === 5 ? 'Excellent' :
                               currentVal === 4 ? 'Good' :
                               currentVal === 3 ? 'Average' :
                               currentVal === 2 ? 'Below Average' : 'Unsatisfactory'}
                            </span>
                          </>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Unselected
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              0 / 5 (Pending)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Expandable Rubric Guide */}
                  {isRubricOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs bg-slate-50 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {[
                        { level: 1, label: 'Unsatisfactory', color: '#E50914', lightBg: '#FEF2F2' },
                        { level: 2, label: 'Below Average', color: '#FF5A60', lightBg: '#FFF1F2' },
                        { level: 3, label: 'Average', color: '#F7B928', lightBg: '#FFFBEB' },
                        { level: 4, label: 'Good', color: '#38C1B6', lightBg: '#F0FDFA' },
                        { level: 5, label: 'Excellent', color: '#00A843', lightBg: '#F0FDF4' }
                      ].map(({ level, label, color, lightBg }) => (
                        <div 
                          key={level} 
                          onClick={() => handleScoreChange(criterion.key, level)}
                          style={currentVal === level ? { borderColor: color, backgroundColor: lightBg } : undefined}
                          className={`p-2.5 rounded-lg cursor-pointer transition border ${
                            currentVal === level ? 'shadow-2xs font-semibold' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span 
                              className="w-4 h-4 rounded text-white text-[10px] font-black flex items-center justify-center"
                              style={{ backgroundColor: color }}
                            >
                              {level}
                            </span>
                            <span className="font-bold text-[11px]" style={{ color }}>
                              {label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
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
