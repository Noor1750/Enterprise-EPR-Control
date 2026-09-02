import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Award, Calendar, CheckCircle2, Clock, AlertTriangle, Plus, Search, 
  Filter, UserCheck, Star, Sparkles, RefreshCw, ChevronRight, X,
  Layers, BarChart3, AlertCircle, FileText, Send, User, Building,
  Lock, ShieldCheck, ShieldAlert, Check, ChevronDown
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  getPerformanceReviews, getPerformanceReviewTypes, createPerformanceReview,
  bulkAssignPerformanceReviews, updatePerformanceReview, PerformanceReviewItem, 
  PerformanceReviewType, ReviewStatus, syncReviewsWithEvaluations, matchEvaluationToReview 
} from '../../lib/performanceReviewEngine';
import { 
  getRange, getHiddenKpiEmployeeIds, ensureKpiPrivacySheet, 
  ensurePerformanceEvaluationSheet, saveHiddenKpiEmployeeIds,
  appendRow
} from '../../lib/sheets';
import { UserSecurityScope, filterAuthorizedEmployees, getAuthorizedEmployeeIdSet, SUPER_ADMIN_EMAILS } from '../../lib/security';
import { PerformanceEvaluationRecord, EvaluationScores, calculateEvaluationSummary, isKpiHiddenForEmployee } from '../kpi/types';
import KPIPrivacyManager from '../kpi/KPIPrivacyManager';
import { resolvePaletteForModule } from '../../lib/colorPalettes';
import { format } from 'date-fns';

interface PerformanceReviewsProps {
  spreadsheetId: string;
  user?: FirebaseUser;
  userSecurityScope?: UserSecurityScope;
}

const EVALUATION_LOCAL_KEY = 'erp_performance_evaluations_v1';

export default function PerformanceReviews({ spreadsheetId, user, userSecurityScope }: PerformanceReviewsProps) {
  const [activeTab, setActiveTab] = useState<'reviews' | 'privacy'>('reviews');
  const [reviews, setReviews] = useState<PerformanceReviewItem[]>([]);
  const [evaluations, setEvaluations] = useState<PerformanceEvaluationRecord[]>([]);
  const [reviewTypes, setReviewTypes] = useState<PerformanceReviewType[]>([]);
  const [employeesRaw, setEmployeesRaw] = useState<string[][]>([]);
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [selectedVisibility, setSelectedVisibility] = useState<'All' | 'Visible' | 'Hidden'>('All');

  // Reviewer Name resolution helper (Displays Full Name instead of raw email)
  const formatReviewer = (rawReviewer: string) => {
    if (!rawReviewer) return 'Admin';
    const trimmed = rawReviewer.trim();
    if (!trimmed.includes('@')) return trimmed;
    const match = employeesRaw.find(e => (e[8] || '').toLowerCase() === trimmed.toLowerCase() || (e[0] || '').toLowerCase() === trimmed.toLowerCase());
    if (match && match[1]) return match[1];
    const namePart = trimmed.split('@')[0].replace(/[0-9_]+/g, ' ').replace(/\./g, ' ').trim();
    return namePart ? namePart.replace(/\b\w/g, l => l.toUpperCase()) : trimmed;
  };

  const defaultReviewerName = useMemo(() => {
    if (userSecurityScope?.employeeName) return userSecurityScope.employeeName;
    if (user?.displayName) return user.displayName;
    if (user?.email) {
      const namePart = user.email.split('@')[0].replace(/[0-9_]+/g, ' ').replace(/\./g, ' ').trim();
      return namePart.replace(/\b\w/g, l => l.toUpperCase());
    }
    return userSecurityScope?.username || 'Admin';
  }, [userSecurityScope, user]);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReviewForAction, setSelectedReviewForAction] = useState<PerformanceReviewItem | null>(null);
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');

  // Assign Form State
  const [assignMode, setAssignMode] = useState<'individual' | 'bulk'>('individual');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [assignDeptFilter, setAssignDeptFilter] = useState('All');
  const [assignSupervisorFilter, setAssignSupervisorFilter] = useState('All');
  const [assignSearch, setAssignSearch] = useState('');
  const [formReviewType, setFormReviewType] = useState('Annual Performance Review');
  const [formReviewerName, setFormReviewerName] = useState(userSecurityScope?.employeeName || user?.displayName || 'Admin');
  const [formBeginOn, setFormBeginOn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formDueBy, setFormDueBy] = useState(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignProgress, setAssignProgress] = useState(0);

  // Reviewer Searchable Dropdown State
  const [isReviewerDropdownOpen, setIsReviewerDropdownOpen] = useState(false);
  const [reviewerSearchTerm, setReviewerSearchTerm] = useState('');
  const reviewerDropdownRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close reviewer dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reviewerDropdownRef.current && !reviewerDropdownRef.current.contains(event.target as Node)) {
        setIsReviewerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Conduct/Score Form State
  const [scoreVal, setScoreVal] = useState<number>(85);
  const [ratingVal, setRatingVal] = useState<number>(4);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [newStatus, setNewStatus] = useState<ReviewStatus>('Completed');
  const [isSavingScore, setIsSavingScore] = useState(false);

  const palette = resolvePaletteForModule('kpi');

  // Security Check: Only Managers and Admins can assign reviews
  const isAdmin = Boolean(userSecurityScope?.isAdmin);
  const isAdminOrManager = useMemo(() => {
    if (!userSecurityScope) return false;
    const roleLower = (userSecurityScope.role || '').toLowerCase();
    const emailLower = (user?.email || userSecurityScope.username || '').toLowerCase();
    const isSuperEmail = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower);
    
    return Boolean(
      userSecurityScope.isAdmin ||
      userSecurityScope.isManager ||
      userSecurityScope.isSuperuser ||
      isSuperEmail ||
      roleLower === 'admin' ||
      roleLower === 'manager' ||
      roleLower === 'superuser'
    );
  }, [userSecurityScope, user]);

  const calculateRatingFromScore = (score: number): number => {
    if (score >= 90) return 5;
    if (score >= 75) return 4;
    if (score >= 60) return 3;
    if (score >= 40) return 2;
    return 1;
  };

  const handleScoreChange = (raw: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(raw) ? 0 : raw));
    setScoreVal(clamped);
    setRatingVal(calculateRatingFromScore(clamped));
  };

  // Toggle Hidden Status Handler
  const handleToggleHide = async (employeeId: string) => {
    const isCurrentlyHidden = hiddenEmployeeIds.some(id => id.toUpperCase() === employeeId.toUpperCase());
    const updated = isCurrentlyHidden
      ? hiddenEmployeeIds.filter(id => id.toUpperCase() !== employeeId.toUpperCase())
      : Array.from(new Set([...hiddenEmployeeIds, employeeId.toUpperCase()]));
    
    setHiddenEmployeeIds(updated);

    if (spreadsheetId) {
      try {
        await saveHiddenKpiEmployeeIds(spreadsheetId, updated, user?.email || userSecurityScope?.username || 'Admin');
      } catch (err) {
        console.warn('Failed to save KPI privacy list to sheet:', err);
      }
    }
  };

  // Batch Save Hidden List
  const handleBatchSaveHidden = async (newHiddenIds: string[]) => {
    const uppercaseList = Array.from(new Set(newHiddenIds.map(id => id.toUpperCase())));
    setHiddenEmployeeIds(uppercaseList);

    if (spreadsheetId) {
      try {
        await saveHiddenKpiEmployeeIds(spreadsheetId, uppercaseList, user?.email || userSecurityScope?.username || 'Admin');
      } catch (err: any) {
        console.warn('Failed to batch save KPI privacy list:', err);
      }
    }
  };

  const loadData = async (initial = false) => {
    if (initial) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      await Promise.all([
        ensureKpiPrivacySheet(spreadsheetId),
        ensurePerformanceEvaluationSheet(spreadsheetId)
      ]);

      const [revs, types, emps, hiddenIds, rawEvals] = await Promise.all([
        getPerformanceReviews(spreadsheetId),
        getPerformanceReviewTypes(spreadsheetId),
        getRange(spreadsheetId, 'Employees!A2:Z'),
        getHiddenKpiEmployeeIds(spreadsheetId),
        getRange(spreadsheetId, 'Performance_Evaluations!A:AF')
      ]);

      // Parse Performance Evaluations
      let parsedEvals: PerformanceEvaluationRecord[] = [];
      if (rawEvals && rawEvals.length > 1) {
        parsedEvals = rawEvals.slice(1).map((row, idx) => {
          const scores: EvaluationScores = {
            jobKnowledge: Number(row[13]) || 3,
            quantityOfOutput: Number(row[14]) || 3,
            qualityOfWork: Number(row[15]) || 3,
            attendanceCommitment: Number(row[16]) || 3,
            initiativeImprovement: Number(row[17]) || 3,
            dependability: Number(row[18]) || 3,
            attitude: Number(row[19]) || 3,
            creativityAnalytical: Number(row[20]) || 3,
            communicationSkills: Number(row[21]) || 3,
            teamworkRelationship: Number(row[22]) || 3,
          };
          const totalScore = Number(row[23]) || Object.values(scores).reduce((a, b) => a + b, 0);
          const averageRating = Number(row[24]) || totalScore / 10;
          const summary = calculateEvaluationSummary(scores);

          return {
            id: String(row[0] || `EVAL-${idx + 1}`),
            employeeId: String(row[1] || ''),
            employeeName: String(row[2] || ''),
            designation: String(row[3] || ''),
            department: String(row[4] || ''),
            dateJoined: String(row[5] || ''),
            yearOfService: String(row[6] || ''),
            evaluationType: (row[7] as any) || 'Quarterly',
            period: String(row[8] || ''),
            periodKey: String(row[9] || ''),
            year: Number(row[10]) || 2026,
            evaluationDate: String(row[11] || ''),
            evaluatedBy: String(row[12] || ''),
            scores,
            totalScore,
            totalPossible: 50,
            averageRating,
            percentage: summary.percentage,
            ratingGrade: (row[25] as any) || summary.ratingGrade,
            strengths: String(row[26] || ''),
            areasOfImprovement: String(row[27] || ''),
            recommendation: String(row[28] || ''),
            comments: String(row[29] || ''),
            createdAt: String(row[30] || new Date().toISOString()),
            updatedAt: String(row[31] || new Date().toISOString()),
            rowIndex: idx + 2
          };
        }).filter(e => e.employeeId);
      }

      // Check local storage cache for additional/recent evaluations
      try {
        const cached = localStorage.getItem(EVALUATION_LOCAL_KEY);
        if (cached) {
          const localEvals: PerformanceEvaluationRecord[] = JSON.parse(cached);
          // Merge avoiding duplicate IDs
          const existingIds = new Set(parsedEvals.map(e => e.id));
          for (const le of localEvals) {
            if (!existingIds.has(le.id)) {
              parsedEvals.push(le);
              existingIds.add(le.id);
            }
          }
        }
      } catch {
        // Continue with parsedEvals
      }

      setEvaluations(parsedEvals);

      // Synchronize Reviews with Single Source of Truth from Performance Evaluations!
      const syncedRevs = syncReviewsWithEvaluations(revs, parsedEvals);

      setReviews(syncedRevs);
      setReviewTypes(types);
      setEmployeesRaw(emps || []);
      setHiddenEmployeeIds(hiddenIds || []);
    } catch (err) {
      console.error('Failed to load performance review dataset:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [spreadsheetId]);

  // Authorized employees list
  const authorizedEmployees = useMemo(() => {
    return filterAuthorizedEmployees(employeesRaw, userSecurityScope).map(r => ({
      id: r[0] || '',
      name: r[1] || '',
      designation: r[2] || '',
      department: r[3] || '',
      supervisor: r[6] || '',
      status: r[9] || 'Active'
    })).filter(e => e.id && e.status.toLowerCase() === 'active');
  }, [employeesRaw, userSecurityScope]);

  // Available departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    authorizedEmployees.forEach(e => { if (e.department) set.add(e.department); });
    return ['All', ...Array.from(set).sort()];
  }, [authorizedEmployees]);

  // Available supervisors for filter in assign modal
  const assignSupervisors = useMemo(() => {
    const set = new Set<string>();
    authorizedEmployees.forEach(e => {
      if (e.supervisor && e.supervisor.trim()) {
        set.add(e.supervisor.trim());
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [authorizedEmployees]);

  // Filtered employees for Assign Reviews modal
  const assignFilteredEmployees = useMemo(() => {
    return authorizedEmployees.filter(emp => {
      if (assignDeptFilter !== 'All' && emp.department !== assignDeptFilter) return false;
      if (assignSupervisorFilter !== 'All' && emp.supervisor.trim() !== assignSupervisorFilter) return false;
      if (assignSearch.trim()) {
        const q = assignSearch.trim().toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesId = emp.id.toLowerCase().includes(q);
        const matchesDept = emp.department.toLowerCase().includes(q);
        const matchesDesig = emp.designation.toLowerCase().includes(q);
        const matchesSup = emp.supervisor.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesDept && !matchesDesig && !matchesSup) return false;
      }
      return true;
    });
  }, [authorizedEmployees, assignDeptFilter, assignSupervisorFilter, assignSearch]);

  // Searchable Evaluators / Reviewers from full Employee Directory
  const searchableReviewers = useMemo(() => {
    const list = employeesRaw.map(r => ({
      id: r[0] || '',
      name: r[1] || '',
      designation: r[2] || '',
      department: r[3] || '',
      email: r[8] || '',
      status: r[9] || 'Active',
      supervisor: r[6] || '',
      manager: r[17] || ''
    })).filter(e => e.id && e.name);

    if (!reviewerSearchTerm.trim()) return list;
    const q = reviewerSearchTerm.toLowerCase().trim();
    return list.filter(e => 
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q)
    );
  }, [employeesRaw, reviewerSearchTerm]);

  // Auto-detect supervisor for selected employee(s) in Assign Reviews modal
  useEffect(() => {
    if (selectedEmpIds.length === 0) return;
    const selectedEmps = authorizedEmployees.filter(e => selectedEmpIds.includes(e.id));
    if (selectedEmps.length === 1) {
      const sup = selectedEmps[0].supervisor;
      if (sup && sup.trim()) {
        setFormReviewerName(sup.trim());
      }
    } else if (selectedEmps.length > 1) {
      const sups = Array.from(new Set(selectedEmps.map(e => e.supervisor?.trim()).filter(Boolean)));
      if (sups.length === 1 && sups[0]) {
        setFormReviewerName(sups[0]);
      }
    }
  }, [selectedEmpIds, authorizedEmployees]);

  // Privacy Scoped Reviews based on User Security Access Scope
  const isRestrictedScope = useMemo(() => {
    return Boolean(userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all');
  }, [userSecurityScope]);

  const authorizedIdSet = useMemo(() => {
    return getAuthorizedEmployeeIdSet(employeesRaw, userSecurityScope);
  }, [employeesRaw, userSecurityScope]);

  // Privacy-filtered reviews matching user's assigned scope or where user is reviewer
  const scopedReviews = useMemo(() => {
    if (!isRestrictedScope) return reviews;
    return reviews.filter(r => 
      authorizedIdSet.has((r.employeeId || '').toUpperCase()) ||
      (r.reviewerName && userSecurityScope?.employeeName && r.reviewerName.toLowerCase().includes(userSecurityScope.employeeName.toLowerCase()))
    );
  }, [reviews, isRestrictedScope, authorizedIdSet, userSecurityScope]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = scopedReviews.length;
    const scheduled = scopedReviews.filter(r => r.calculatedStatus === 'Scheduled').length;
    const notStarted = scopedReviews.filter(r => r.calculatedStatus === 'Not Started').length;
    const inProgress = scopedReviews.filter(r => r.calculatedStatus === 'In Progress').length;
    const submitted = scopedReviews.filter(r => r.calculatedStatus === 'Submitted').length;
    const completed = scopedReviews.filter(r => r.calculatedStatus === 'Completed').length;
    const overdue = scopedReviews.filter(r => r.calculatedStatus === 'Overdue').length;

    return { total, scheduled, notStarted, inProgress, submitted, completed, overdue };
  }, [scopedReviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return scopedReviews.filter(r => {
      const isHidden = isKpiHiddenForEmployee(r.employeeId, hiddenEmployeeIds);

      // Admin Visibility Filter
      if (selectedVisibility === 'Visible' && isHidden) return false;
      if (selectedVisibility === 'Hidden' && !isHidden) return false;

      if (statusFilter !== 'All' && r.calculatedStatus !== statusFilter) return false;
      if (typeFilter !== 'All' && r.reviewType !== typeFilter) return false;
      if (deptFilter !== 'All' && r.department !== deptFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return r.employeeName.toLowerCase().includes(q) ||
               r.employeeId.toLowerCase().includes(q) ||
               r.department.toLowerCase().includes(q) ||
               r.reviewerName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [scopedReviews, selectedVisibility, hiddenEmployeeIds, statusFilter, typeFilter, deptFilter, search]);

  // Handle Assign Submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrManager) {
      alert('Permission Denied: Only Managers and Administrators can assign performance reviews.');
      setShowAssignModal(false);
      return;
    }

    if (selectedEmpIds.length === 0) {
      alert('Please select at least one employee.');
      return;
    }

    setIsAssigning(true);
    setAssignProgress(5);

    try {
      const targetEmps = authorizedEmployees.filter(e => selectedEmpIds.includes(e.id));
      await bulkAssignPerformanceReviews(
        spreadsheetId,
        targetEmps,
        {
          reviewType: formReviewType,
          reviewerId: userSecurityScope?.username || 'Admin',
          reviewerName: formReviewerName,
          beginOn: formBeginOn,
          dueBy: formDueBy,
          createdBy: userSecurityScope?.username || 'Admin'
        },
        (percent) => setAssignProgress(percent)
      );

      setShowAssignModal(false);
      setSelectedEmpIds([]);
      await loadData(false);
    } catch (err) {
      console.error('Failed to assign performance reviews:', err);
      alert('Error saving review assignments. Please retry.');
    } finally {
      setIsAssigning(false);
      setAssignProgress(0);
    }
  };

  // Handle Action / Conduct / Submit
  const handleOpenActionModal = (rev: PerformanceReviewItem) => {
    const isHidden = isKpiHiddenForEmployee(rev.employeeId, hiddenEmployeeIds);
    if (isHidden && !isAdmin) {
      alert('Access Restricted: This employee KPI rating is confidential under Admin Privacy Controls.');
      return;
    }
    const empEvals = evaluations.filter(
      e => e.employeeId.trim().toUpperCase() === rev.employeeId.trim().toUpperCase()
    );
    const matchedEval = matchEvaluationToReview(rev, evaluations) || empEvals[0];

    setSelectedReviewForAction(rev);
    setSelectedEvalId(matchedEval ? matchedEval.id : '');

    if (matchedEval) {
      setRatingVal(matchedEval.averageRating);
      setScoreVal(Math.round(matchedEval.percentage));
      setReviewRemarks(rev.remarks || matchedEval.comments || matchedEval.recommendation || matchedEval.strengths || '');
      setNewStatus(rev.calculatedStatus === 'Completed' ? 'Completed' : 'Completed');
    } else {
      setRatingVal(rev.rating !== undefined ? rev.rating : 0);
      setScoreVal(rev.score !== undefined ? rev.score : 0);
      setReviewRemarks(rev.remarks || '');
      setNewStatus(rev.calculatedStatus === 'Completed' ? 'Completed' : 'In Progress');
    }
  };

  const handleSaveReviewEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewForAction) return;

    setIsSavingScore(true);
    try {
      const activeEval = (selectedEvalId ? evaluations.find(ev => ev.id === selectedEvalId) : null) || 
                         matchEvaluationToReview(selectedReviewForAction, evaluations);
      
      let calculatedRating = activeEval ? activeEval.averageRating : (ratingVal > 0 ? ratingVal : 4.0);
      let calculatedScore = activeEval ? Math.round(activeEval.percentage) : Math.round(calculatedRating * 20);
      let evalId = activeEval?.id;

      // If no evaluation record exists yet for this employee, create one so both datasets are permanently synced!
      if (!activeEval && calculatedRating > 0) {
        evalId = `EVAL-${Date.now()}-${selectedReviewForAction.employeeId}`;
        const roundScore = Math.min(5, Math.max(1, Math.round(calculatedRating)));
        const scores: EvaluationScores = {
          jobKnowledge: roundScore,
          quantityOfOutput: roundScore,
          qualityOfWork: roundScore,
          attendanceCommitment: roundScore,
          initiativeImprovement: roundScore,
          dependability: roundScore,
          attitude: roundScore,
          creativityAnalytical: roundScore,
          communicationSkills: roundScore,
          teamworkRelationship: roundScore,
        };
        const summary = calculateEvaluationSummary(scores);
        const newEvalRecord: PerformanceEvaluationRecord = {
          id: evalId,
          employeeId: selectedReviewForAction.employeeId,
          employeeName: selectedReviewForAction.employeeName,
          designation: selectedReviewForAction.designation,
          department: selectedReviewForAction.department,
          dateJoined: '',
          yearOfService: '',
          evaluationType: selectedReviewForAction.reviewType.includes('Half') ? 'Half Yearly' : (selectedReviewForAction.reviewType.includes('Quarter') ? 'Quarterly' : 'Yearly'),
          period: selectedReviewForAction.reviewType,
          periodKey: selectedReviewForAction.dueBy ? selectedReviewForAction.dueBy.substring(0, 4) : '2026',
          year: selectedReviewForAction.dueBy ? parseInt(selectedReviewForAction.dueBy.substring(0, 4), 10) : 2026,
          evaluationDate: format(new Date(), 'yyyy-MM-dd'),
          evaluatedBy: selectedReviewForAction.reviewerName,
          scores,
          totalScore: Math.round(calculatedRating * 10),
          totalPossible: 50,
          averageRating: calculatedRating,
          percentage: calculatedScore,
          ratingGrade: summary.ratingGrade,
          strengths: '',
          areasOfImprovement: '',
          recommendation: '',
          comments: reviewRemarks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        try {
          const rowData = [
            newEvalRecord.id,
            newEvalRecord.employeeId,
            newEvalRecord.employeeName,
            newEvalRecord.designation,
            newEvalRecord.department,
            '', '',
            newEvalRecord.evaluationType,
            newEvalRecord.period,
            newEvalRecord.periodKey,
            String(newEvalRecord.year),
            newEvalRecord.evaluationDate,
            newEvalRecord.evaluatedBy,
            String(scores.jobKnowledge),
            String(scores.quantityOfOutput),
            String(scores.qualityOfWork),
            String(scores.attendanceCommitment),
            String(scores.initiativeImprovement),
            String(scores.dependability),
            String(scores.attitude),
            String(scores.creativityAnalytical),
            String(scores.communicationSkills),
            String(scores.teamworkRelationship),
            String(newEvalRecord.totalScore),
            String(newEvalRecord.averageRating.toFixed(2)),
            newEvalRecord.ratingGrade,
            '', '', '',
            reviewRemarks,
            newEvalRecord.createdAt,
            newEvalRecord.updatedAt
          ];
          await appendRow(spreadsheetId, 'Performance_Evaluations!A1', [rowData]);
        } catch (e) {
          console.warn('Failed to append to Performance_Evaluations sheet:', e);
        }

        try {
          const cached = localStorage.getItem(EVALUATION_LOCAL_KEY);
          const currentEvals: PerformanceEvaluationRecord[] = cached ? JSON.parse(cached) : [];
          currentEvals.push(newEvalRecord);
          localStorage.setItem(EVALUATION_LOCAL_KEY, JSON.stringify(currentEvals));
        } catch (e) {
          console.warn('Failed to save to local cache:', e);
        }
      }

      await updatePerformanceReview(spreadsheetId, selectedReviewForAction.reviewId, {
        rawStatus: newStatus,
        score: calculatedScore,
        rating: calculatedRating,
        remarks: reviewRemarks,
        evaluationId: evalId,
        completionDate: newStatus === 'Completed' ? format(new Date(), 'yyyy-MM-dd') : undefined
      });

      setSelectedReviewForAction(null);
      await loadData(false);
    } catch (err) {
      console.error('Failed to update review status:', err);
      alert('Error updating review evaluation.');
    } finally {
      setIsSavingScore(false);
    }
  };

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'Completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3 h-3 animate-spin" /> In Progress</span>;
      case 'Submitted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"><Send className="w-3 h-3" /> Submitted</span>;
      case 'Not Started':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><Clock className="w-3 h-3" /> Not Started</span>;
      case 'Scheduled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"><Calendar className="w-3 h-3" /> Scheduled</span>;
      case 'Overdue':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"><AlertTriangle className="w-3 h-3" /> Overdue</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-5 p-3 sm:p-5 max-w-[1550px] mx-auto animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div 
        className="rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{
          background: `linear-gradient(135deg, ${palette.primaryHex}, #0F172A 80%)`
        }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Performance Reviews & Evaluation</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 text-xs font-bold border border-indigo-400/30">
                Evaluation Cycle
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Manage structured evaluation schedules, appraisal milestones, and performance scorecards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 self-stretch md:self-auto justify-end">
          {/* SubTab Switchers */}
          <div className="flex items-center bg-white/10 p-1 rounded-xl backdrop-blur-xs border border-white/15">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'reviews' ? 'bg-white text-slate-900 shadow-xs' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Reviews Directory</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'privacy' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Privacy</span>
                {hiddenEmployeeIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400/30 text-[10px]">
                    {hiddenEmployeeIds.length}
                  </span>
                )}
              </button>
            )}
          </div>

          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition border border-white/10 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          {isAdminOrManager ? (
            <button
              onClick={() => {
                setSelectedEmpIds([]);
                setShowAssignModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Reviews</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 text-indigo-100 text-xs font-medium border border-white/15 backdrop-blur-xs">
              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Assign Reviews (Managers & Admins Only)</span>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'privacy' && isAdmin ? (
        <KPIPrivacyManager
          employees={authorizedEmployees}
          hiddenEmployeeIds={hiddenEmployeeIds}
          onToggleHide={handleToggleHide}
          onBatchSaveHidden={handleBatchSaveHidden}
          performanceReviews={reviews}
          moduleName="Performance Review"
          moduleTitle="Performance Review Confidentiality & Privacy Controls"
          moduleDescription="Configure confidential employees whose appraisal reviews, scores, and ratings are protected from non-administrative staff."
        />
      ) : (
        <>
          {/* Alert Banner for Overdue Reviews */}
          {metrics.overdue > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-900 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold">Attention: {metrics.overdue} Performance Review(s) are Overdue</h4>
                  <p className="text-xs text-rose-700">Please remind assigned supervisors and managers to finalize pending evaluations.</p>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter('Overdue')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition cursor-pointer"
              >
                View Overdue
              </button>
            </div>
          )}

          {/* KPI Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Total Reviews', count: metrics.total, color: 'text-slate-800', bg: 'bg-white', filter: 'All' },
              { label: 'Scheduled', count: metrics.scheduled, color: 'text-slate-600', bg: 'bg-slate-50', filter: 'Scheduled' },
              { label: 'Not Started', count: metrics.notStarted, color: 'text-amber-600', bg: 'bg-amber-50/50', filter: 'Not Started' },
              { label: 'In Progress', count: metrics.inProgress, color: 'text-blue-600', bg: 'bg-blue-50/50', filter: 'In Progress' },
              { label: 'Submitted', count: metrics.submitted, color: 'text-indigo-600', bg: 'bg-indigo-50/50', filter: 'Submitted' },
              { label: 'Completed', count: metrics.completed, color: 'text-emerald-600', bg: 'bg-emerald-50/50', filter: 'Completed' },
              { label: 'Overdue', count: metrics.overdue, color: 'text-rose-600', bg: 'bg-rose-50/50', filter: 'Overdue' }
            ].map(m => (
              <div
                key={m.label}
                onClick={() => setStatusFilter(m.filter)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer shadow-xs ${
                  statusFilter === m.filter ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' : `${m.bg} border-slate-200/80 hover:border-slate-300`
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">{m.label}</div>
                <div className={`text-2xl font-black ${m.color} mt-1`}>{m.count}</div>
              </div>
            ))}
          </div>

          {/* Main Review Dashboard Table & Filters */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            
            {/* Controls Row */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {['All', 'Not Started', 'In Progress', 'Submitted', 'Completed', 'Overdue', 'Scheduled'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      statusFilter === st ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search and Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Search */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staff, ID, reviewer..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Review Type Dropdown */}
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="All">All Review Types</option>
                  {reviewTypes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>

                {/* Department Dropdown */}
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
                  ))}
                </select>

                {/* Admin Privacy Visibility Filter */}
                {isAdmin && (
                  <select
                    value={selectedVisibility}
                    onChange={e => setSelectedVisibility(e.target.value as any)}
                    className="px-3 py-1.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 focus:outline-hidden"
                  >
                    <option value="All">All Visibility ({reviews.length})</option>
                    <option value="Visible">Public Visible Only</option>
                    <option value="Hidden">Confidential / Hidden ({hiddenEmployeeIds.length})</option>
                  </select>
                )}
              </div>
            </div>

        {/* Reviews Table */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <span>Loading performance evaluation schedules...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Review Schedules Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {isAdminOrManager 
                ? 'No performance reviews match your current filters. Click "Assign Reviews" to schedule new evaluations.' 
                : 'No performance reviews match your current filters. Managers and Administrators can schedule new review cycles.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Review Type</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Begin On</th>
                  <th className="px-4 py-3">Due By</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Score / Rating</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReviews.map(item => (
                  <tr key={item.reviewId} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-bold text-slate-900">{item.employeeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                          <span>{item.employeeId}</span>
                          <span>•</span>
                          <span>{item.department}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {item.reviewType}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">{formatReviewer(item.reviewerName)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{item.beginOn}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={item.calculatedStatus === 'Overdue' ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {item.dueBy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(item.calculatedStatus)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const isHidden = isKpiHiddenForEmployee(item.employeeId, hiddenEmployeeIds);
                        if (isHidden && !isAdmin) {
                          return (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-xs">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Protected</span>
                            </div>
                          );
                        }
                        const matchedEval = matchEvaluationToReview(item, evaluations);
                        const hasScore = item.score !== undefined && item.score !== null;
                        const hasRating = item.rating !== undefined && item.rating !== null && item.rating > 0;
                        const hasEval = Boolean(matchedEval);

                        if (hasScore || hasRating || hasEval) {
                          const displayScore = hasScore 
                            ? item.score 
                            : (matchedEval ? Math.round(matchedEval.percentage) : (hasRating ? Math.round(item.rating! * 20) : 0));
                          const displayRating = hasRating 
                            ? item.rating 
                            : (matchedEval ? matchedEval.averageRating : (hasScore ? Number((item.score! / 20).toFixed(1)) : 0));
                          const grade = matchedEval?.ratingGrade || item.evaluationGrade || (displayRating! >= 4.5 ? 'Outstanding' : displayRating! >= 3.8 ? 'Exceeds Expectations' : displayRating! >= 3.0 ? 'Meets Standards' : 'Needs Improvement');

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                                <span>{displayScore}%</span>
                                {displayRating! > 0 && (
                                  <span className="text-amber-500 flex items-center font-bold">
                                    ★ {Number(displayRating).toFixed(displayRating! % 1 === 0 ? 0 : 2)}
                                  </span>
                                )}
                                {isHidden && isAdmin && (
                                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded-sm border border-amber-200">
                                    Hidden
                                  </span>
                                )}
                              </div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200">
                                <Sparkles className="w-2.5 h-2.5" /> {matchedEval ? `Eval (${matchedEval.averageRating}★)` : grade}
                              </span>
                            </div>
                          );
                        }
                        return <span className="text-slate-400 italic text-[11px]">Pending</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenActionModal(item)}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                      >
                        {item.calculatedStatus === 'Completed' ? 'View / Edit' : 'Evaluate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* Assign Review Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Assign Performance Reviews</h3>
                  <p className="text-xs text-slate-500">Schedule review cycles for staff or departments</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* Review Type & Reviewer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Review Type</label>
                  <select
                    value={formReviewType}
                    onChange={e => setFormReviewType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {reviewTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Searchable Assigned Reviewer Field */}
                <div className="relative" ref={reviewerDropdownRef}>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Assigned Reviewer *</span>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Search Directory / Auto Supervisor
                    </span>
                  </label>

                  <div className="relative">
                    <div 
                      onClick={() => setIsReviewerDropdownOpen(true)}
                      className={`w-full bg-slate-50 border rounded-xl transition-all flex items-center justify-between px-3 py-2 cursor-pointer ${
                        isReviewerDropdownOpen 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={formReviewerName}
                          onChange={e => {
                            setFormReviewerName(e.target.value);
                            setReviewerSearchTerm(e.target.value);
                            setIsReviewerDropdownOpen(true);
                          }}
                          onFocus={() => setIsReviewerDropdownOpen(true)}
                          placeholder="Search Staff ID, Name or type Reviewer..."
                          required
                          className="w-full bg-transparent border-none p-0 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {formReviewerName && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormReviewerName('');
                              setReviewerSearchTerm('');
                              setIsReviewerDropdownOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition"
                            title="Clear"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isReviewerDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                      </div>
                    </div>

                    {/* Dropdown Floating Search Menu */}
                    {isReviewerDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in max-h-64 flex flex-col">
                        
                        {/* Search Input in Dropdown */}
                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Filter by ID, Name or Department..."
                            value={reviewerSearchTerm}
                            onChange={(e) => setReviewerSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                            autoFocus
                          />
                          {reviewerSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setReviewerSearchTerm('')}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Directory List Items */}
                        <div className="overflow-y-auto max-h-48 divide-y divide-slate-100">
                          {searchableReviewers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500">
                              No staff found. You can keep typing custom reviewer above.
                            </div>
                          ) : (
                            searchableReviewers.map((emp) => {
                              const isSelected = formReviewerName.toLowerCase() === emp.name.toLowerCase() || formReviewerName.toLowerCase().includes(emp.id.toLowerCase());
                              return (
                                <div
                                  key={`reviewer-${emp.id}`}
                                  onClick={() => {
                                    setFormReviewerName(`${emp.name} (${emp.id})`);
                                    setIsReviewerDropdownOpen(false);
                                    setReviewerSearchTerm('');
                                  }}
                                  className={`p-2 hover:bg-indigo-50/60 cursor-pointer transition flex items-center justify-between gap-2 ${
                                    isSelected ? 'bg-indigo-50/90' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                                      {emp.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs truncate text-slate-900">
                                          {emp.name}
                                        </span>
                                        <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                          {emp.id}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                        <span>{emp.department || 'General'}</span>
                                        {emp.designation && <span>• {emp.designation}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Footer Info */}
                        <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-500 flex items-center justify-between">
                          <span>{searchableReviewers.length} Reviewers in Directory</span>
                          <span>Click to assign</span>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Begin On & Due By Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Begin On Date</label>
                  <input
                    type="date"
                    value={formBeginOn}
                    onChange={e => setFormBeginOn(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due By Deadline</label>
                  <input
                    type="date"
                    value={formDueBy}
                    onChange={e => setFormDueBy(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Employee Selection with Advanced Filtering (Department, Supervisor, Search) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Select Target Employees ({selectedEmpIds.length} of {authorizedEmployees.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const filteredIds = assignFilteredEmployees.map(e => e.id);
                        const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedEmpIds.includes(id));
                        if (allFilteredSelected) {
                          setSelectedEmpIds(prev => prev.filter(id => !filteredIds.includes(id)));
                        } else {
                          setSelectedEmpIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {assignFilteredEmployees.length > 0 && assignFilteredEmployees.every(e => selectedEmpIds.includes(e.id))
                        ? `Deselect Filtered (${assignFilteredEmployees.length})`
                        : `Select Filtered (${assignFilteredEmployees.length})`}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEmpIds.length === authorizedEmployees.length) {
                          setSelectedEmpIds([]);
                        } else {
                          setSelectedEmpIds(authorizedEmployees.map(e => e.id));
                        }
                      }}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {selectedEmpIds.length === authorizedEmployees.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="p-2.5 bg-slate-100/70 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Search by Name or ID */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={assignSearch}
                        onChange={e => setAssignSearch(e.target.value)}
                        placeholder="Search Name, ID..."
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    {/* Department Filter */}
                    <div>
                      <select
                        value={assignDeptFilter}
                        onChange={e => setAssignDeptFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="All">All Departments</option>
                        {departments.filter(d => d !== 'All').map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Supervisor Filter */}
                    <div>
                      <select
                        value={assignSupervisorFilter}
                        onChange={e => setAssignSupervisorFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="All">All Supervisors</option>
                        {assignSupervisors.filter(s => s !== 'All').map(sup => (
                          <option key={sup} value={sup}>Supervisor: {sup}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                    <span>
                      Showing <strong className="text-slate-700">{assignFilteredEmployees.length}</strong> matching staff
                    </span>
                    {(assignDeptFilter !== 'All' || assignSupervisorFilter !== 'All' || assignSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignDeptFilter('All');
                          setAssignSupervisorFilter('All');
                          setAssignSearch('');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtered Employees Scroll List */}
                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl p-2 divide-y divide-slate-100 bg-slate-50/50">
                  {assignFilteredEmployees.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No employees match the selected department/supervisor filter.
                    </div>
                  ) : (
                    assignFilteredEmployees.map(emp => {
                      const isChecked = selectedEmpIds.includes(emp.id);
                      return (
                        <label key={emp.id} className="flex items-center justify-between p-2 hover:bg-white rounded-xl transition cursor-pointer">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) setSelectedEmpIds(prev => prev.filter(x => x !== emp.id));
                                else setSelectedEmpIds(prev => [...prev, emp.id]);
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 truncate">{emp.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                {emp.id} • {emp.department} • {emp.designation}
                              </div>
                            </div>
                          </div>
                          {emp.supervisor && (
                            <span className="shrink-0 text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md border border-slate-200">
                              Sup: {emp.supervisor}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Progress Indicator if submitting */}
              {isAssigning && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-indigo-700 font-bold">
                    <span>Generating Review Schedules...</span>
                    <span>{assignProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-200" style={{ width: `${assignProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || selectedEmpIds.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isAssigning ? 'Assigning...' : `Confirm & Assign (${selectedEmpIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conduct/Evaluate Modal */}
      {selectedReviewForAction && (() => {
        const empEvals = evaluations.filter(
          e => e.employeeId.trim().toUpperCase() === selectedReviewForAction.employeeId.trim().toUpperCase()
        );
        const activeEval = (selectedEvalId ? empEvals.find(e => e.id === selectedEvalId) : null) ||
                           matchEvaluationToReview(selectedReviewForAction, evaluations) ||
                           empEvals[0];

        const hasEval = Boolean(activeEval);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Conduct Evaluation</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedReviewForAction.employeeName} ({selectedReviewForAction.employeeId})</p>
                </div>
                <button 
                  onClick={() => setSelectedReviewForAction(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveReviewEvaluation} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Review Type:</span>
                    <span className="font-bold text-slate-900">{selectedReviewForAction.reviewType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Department:</span>
                    <span className="font-semibold text-slate-800">{selectedReviewForAction.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Reviewer:</span>
                    <span className="font-semibold text-slate-900">{formatReviewer(selectedReviewForAction.reviewerName)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Deadline:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedReviewForAction.dueBy}</span>
                  </div>
                </div>

                {/* Review Progress / Status Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Review Progress / Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as ReviewStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Completed">Completed (Finalized appraisal)</option>
                    <option value="Submitted">Submitted (Awaiting manager signoff)</option>
                    <option value="In Progress">In Progress (Under review)</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Performance Evaluation Average Rating (1.0 - 5.0) - FIXED FROM PERFORMANCE EVALUATION */}
                <div className="bg-gradient-to-br from-amber-50/90 via-amber-50/50 to-orange-50/40 border border-amber-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <label className="text-xs font-black text-slate-900 tracking-tight">
                        Performance Evaluation Average Rating (1.0 - 5.0)
                      </label>
                    </div>
                    {hasEval ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                        <Lock className="w-2.5 h-2.5" /> Fixed from Evaluation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                        Pending Evaluation
                      </span>
                    )}
                  </div>

                  {hasEval && activeEval ? (
                    <div className="space-y-2.5">
                      {/* Evaluation cycle switch if multiple exist */}
                      {empEvals.length > 1 && (
                        <div className="flex items-center justify-between gap-2 text-xs bg-white/80 p-2 rounded-xl border border-amber-200">
                          <span className="text-[11px] font-bold text-slate-600">Select Evaluation Cycle:</span>
                          <select
                            value={activeEval.id}
                            onChange={e => {
                              const chosen = empEvals.find(x => x.id === e.target.value);
                              if (chosen) {
                                setSelectedEvalId(chosen.id);
                                setRatingVal(chosen.averageRating);
                                setScoreVal(Math.round(chosen.percentage));
                                if (chosen.comments || chosen.recommendation || chosen.strengths) {
                                  setReviewRemarks(chosen.comments || chosen.recommendation || chosen.strengths || '');
                                }
                              }
                            }}
                            className="text-xs font-semibold text-slate-800 bg-amber-50/50 border border-amber-300 rounded-lg px-2 py-1"
                          >
                            {empEvals.map(ev => (
                              <option key={ev.id} value={ev.id}>
                                {ev.period || ev.evaluationType} ({ev.year || 2026}) — Avg: {ev.averageRating} ★
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Prominent Rating Card */}
                      <div className="bg-white rounded-xl p-3.5 border border-amber-200/80 flex items-center justify-between shadow-xs">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Calculated 10-Metric Average
                          </div>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-black text-amber-900 tracking-tight">
                              {Number(activeEval.averageRating).toFixed(2)}
                            </span>
                            <span className="text-xs font-bold text-slate-400">/ 5.0</span>
                            <div className="flex items-center text-amber-500 text-sm ml-1">
                              {'★'.repeat(Math.min(5, Math.max(1, Math.round(activeEval.averageRating))))}
                              {'☆'.repeat(Math.max(0, 5 - Math.min(5, Math.max(1, Math.round(activeEval.averageRating)))))}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black border ${
                            activeEval.averageRating >= 4.5 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            activeEval.averageRating >= 3.8 ? 'bg-blue-50 text-blue-800 border-blue-300' :
                            activeEval.averageRating >= 3.0 ? 'bg-teal-50 text-teal-800 border-teal-300' :
                            'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {activeEval.ratingGrade || (activeEval.averageRating >= 4.5 ? 'Outstanding' : activeEval.averageRating >= 3.8 ? 'Exceeds Expectations' : 'Meets Standards')}
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 mt-1">
                            Score: {activeEval.totalScore}/50 ({Math.round(activeEval.percentage)}%)
                          </div>
                        </div>
                      </div>

                      {/* Meta Footer */}
                      <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-1 px-1">
                        <span>Period: <strong className="font-semibold text-slate-800">{activeEval.period || activeEval.evaluationType} ({activeEval.year || 2026})</strong></span>
                        <span>Evaluated: <strong className="font-semibold text-slate-800">{activeEval.evaluationDate || 'Recorded'}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/90 rounded-xl p-3.5 border border-amber-200 text-xs space-y-2.5">
                      <div className="flex items-start gap-2 text-amber-900 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Initialize Evaluation Average Rating (1.0 - 5.0)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        No prior Performance Evaluation was found for <strong>{selectedReviewForAction.employeeName}</strong>. Select their initial Average Rating below to automatically establish and synchronize their Performance Evaluation record:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Average Star Rating</label>
                          <select
                            value={ratingVal || 4}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 4;
                              setRatingVal(val);
                              setScoreVal(Math.round(val * 20));
                            }}
                            className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                          >
                            <option value="5">★★★★★ (5.0 - Outstanding / 100%)</option>
                            <option value="4.5">★★★★½ (4.5 - Outstanding / 90%)</option>
                            <option value="4">★★★★☆ (4.0 - Exceeds Expectations / 80%)</option>
                            <option value="3.5">★★★½☆ (3.5 - Meets Expectations / 70%)</option>
                            <option value="3">★★★☆☆ (3.0 - Meets Expectations / 60%)</option>
                            <option value="2">★★☆☆☆ (2.0 - Needs Improvement / 40%)</option>
                            <option value="1">★☆☆☆☆ (1.0 - Unsatisfactory / 20%)</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-center bg-amber-100/50 p-2.5 rounded-xl border border-amber-200">
                          <span className="text-[10px] font-bold text-amber-800">Auto Calculated Score</span>
                          <span className="text-sm font-black text-amber-900">{scoreVal || (ratingVal ? Math.round(ratingVal * 20) : 80)}% ({ratingVal || 4.0} / 5.0)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Qualitative Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Appraisal Remarks & Feedback</label>
                  <textarea
                    rows={3}
                    value={reviewRemarks}
                    onChange={e => setReviewRemarks(e.target.value)}
                    placeholder="Provide qualitative feedback, operational strengths, and key improvement targets..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReviewForAction(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingScore}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSavingScore ? 'Saving...' : 'Save Evaluation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
