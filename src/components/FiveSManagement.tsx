import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, Award, CheckSquare, Layers, ShieldCheck, 
  TrendingUp, BarChart3, Users, Plus, Search, Filter, 
  Download, Printer, RefreshCw, Trash2, Edit, Eye, 
  ChevronRight, Calendar, AlertTriangle, CheckCircle2, 
  Sliders, Maximize2, FileSpreadsheet, Star, UserCheck, 
  ArrowUpRight, Clock, Building, Briefcase, Info, X
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UserSecurityScope, canUserPerformAction } from '../lib/security';
import { Employee } from './kpi/types';
import { 
  FiveSAssessment, 
  FiveSCorrectiveAction, 
  FiveSWinner, 
  FiveSSettingsConfig,
  getFiveSSettings,
  saveFiveSSettings,
  calculateRankings,
  getRatingBadge,
  canConduct5SAssessment,
  canDeclare5SWinner,
  FIVE_S_CATEGORIES,
  FiveSCategoryKey
} from '../lib/fiveSEngine';
import { 
  getRange, 
  updateRange, 
  appendRow, 
  deleteRowByPrimaryKey 
} from '../lib/sheets';
import { format } from 'date-fns';
import { AdminDeleteConfirmModal } from './common/AdminDeleteConfirmModal';
import FiveSAssessmentModal from './fiveS/FiveSAssessmentModal';
import FiveSEmployeeProfileModal from './fiveS/FiveSEmployeeProfileModal';
import FiveSCorrectiveActionModal from './fiveS/FiveSCorrectiveActionModal';
import FiveSTVDisplayBoard from './fiveS/FiveSTVDisplayBoard';
import FiveSSettingsTab from './fiveS/FiveSSettingsTab';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  PieChart, Pie, Cell 
} from 'recharts';

interface FiveSManagementProps {
  spreadsheetId: string;
  user: User;
  userSecurityScope?: UserSecurityScope;
}

type TabType = 'overview' | 'assessments' | 'leaderboard' | 'actions' | 'departments' | 'settings';

export default function FiveSManagement({
  spreadsheetId,
  user,
  userSecurityScope
}: FiveSManagementProps) {
  const currentMonthStr = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Master Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assessments, setAssessments] = useState<FiveSAssessment[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<FiveSCorrectiveAction[]>([]);
  const [winners, setWinners] = useState<FiveSWinner[]>([]);
  const [settings, setSettings] = useState<FiveSSettingsConfig>(getFiveSSettings());

  // Modals State
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState<boolean>(false);
  const [editingAssessment, setEditingAssessment] = useState<FiveSAssessment | null>(null);
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState<Employee | null>(null);

  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<FiveSCorrectiveAction | null>(null);

  const [isTVBoardOpen, setIsTVBoardOpen] = useState<boolean>(false);

  // Admin Delete Security Modal
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'assessment' | 'action';
    item: any | null;
  }>({ isOpen: false, type: 'assessment', item: null });

  // Winner Declaration Workflow State
  const [declarationRemarks, setDeclarationRemarks] = useState<string>('');
  const [isDeclaringWinner, setIsDeclaringWinner] = useState<boolean>(false);

  // Filters State for Assessments Tab
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [shiftFilter, setShiftFilter] = useState<string>('All');
  const [ratingFilter, setRatingFilter] = useState<string>('All');

  // Permission Checks
  const canCreateAssessment = useMemo(() => {
    return canConduct5SAssessment(userSecurityScope);
  }, [userSecurityScope]);

  const canDeclare = useMemo(() => {
    return canDeclare5SWinner(userSecurityScope);
  }, [userSecurityScope]);

  const canConfigure = useMemo(() => {
    if (userSecurityScope?.isAdmin) return true;
    return canUserPerformAction(userSecurityScope, 'fives', 'configure');
  }, [userSecurityScope]);

  const canDelete = useMemo(() => {
    if (userSecurityScope?.isAdmin) return true;
    return canUserPerformAction(userSecurityScope, 'fives', 'delete');
  }, [userSecurityScope]);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Employees Master
      const empRaw = await getRange(spreadsheetId, 'Employees!A:V');
      let loadedEmps: Employee[] = [];
      if (empRaw && empRaw.length > 1) {
        loadedEmps = empRaw.slice(1).map(row => ({
          id: String(row[0] || '').trim(),
          name: String(row[1] || '').trim(),
          designation: String(row[2] || '').trim(),
          department: String(row[3] || '').trim(),
          status: String(row[9] || 'Active').trim(),
          workingArea: String(row[14] || row[4] || 'Floor 1').trim(),
          shift: String(row[15] || 'Day Shift').trim(),
          supervisor: String(row[16] || 'Sarah Connor').trim(),
          manager: String(row[17] || 'Michael Scott').trim(),
        })).filter(e => e.id);
        setEmployees(loadedEmps);
      }

      // 2. Fetch Assessments
      const assessRaw = await getRange(spreadsheetId, 'FiveS_Assessments!A:AG');
      let loadedAssessments: FiveSAssessment[] = [];
      if (assessRaw && assessRaw.length > 1) {
        loadedAssessments = assessRaw.slice(1).map(row => {
          let checklistResponses = [];
          try {
            if (row[24] && row[24] !== '[]') checklistResponses = JSON.parse(row[24]);
          } catch (e) { /* ignore JSON parse error */ }

          const finalScore = Number(row[22]) || 0;
          const ratingBadge = getRatingBadge(finalScore, settings);

          return {
            id: String(row[0] || '').trim(),
            date: String(row[1] || '').trim(),
            month: String(row[2] || '').trim(),
            period: String(row[3] || '').trim(),
            employeeId: String(row[4] || '').trim(),
            employeeName: String(row[5] || '').trim(),
            department: String(row[6] || '').trim(),
            section: String(row[7] || '').trim(),
            designation: String(row[8] || '').trim(),
            supervisorName: String(row[9] || '').trim(),
            managerName: String(row[10] || '').trim(),
            shift: String(row[11] || '').trim(),
            assessorId: String(row[12] || '').trim(),
            assessorName: String(row[13] || '').trim(),
            frequency: (row[14] as any) || 'Monthly',
            sortScore: Number(row[15]) || 0,
            setInOrderScore: Number(row[16]) || 0,
            shineScore: Number(row[17]) || 0,
            standardizeScore: Number(row[18]) || 0,
            sustainScore: Number(row[19]) || 0,
            total5SScore: Number(row[20]) || 0,
            visualScore: Number(row[21]) || 0,
            finalScore,
            rating: String(row[23] || ratingBadge.label).trim(),
            ratingLabel: ratingBadge.label,
            ratingColor: ratingBadge.color,
            badgeClass: ratingBadge.badgeClass,
            checklistResponses,
            remarks: String(row[25] || '').trim(),
            correctiveActionsCount: Number(row[26]) || 0,
            criticalViolationsCount: Number(row[27]) || 0,
            status: (row[28] as any) || 'Approved',
            createdBy: String(row[29] || '').trim(),
            createdAt: String(row[30] || '').trim(),
            updatedBy: String(row[31] || '').trim(),
            updatedAt: String(row[32] || '').trim()
          };
        }).filter(a => a.id);
        setAssessments(loadedAssessments);
      }

      // 3. Fetch Corrective Actions
      const actRaw = await getRange(spreadsheetId, 'FiveS_CorrectiveActions!A:U');
      let loadedActions: FiveSCorrectiveAction[] = [];
      if (actRaw && actRaw.length > 1) {
        loadedActions = actRaw.slice(1).map(row => ({
          id: String(row[0] || '').trim(),
          assessmentId: String(row[1] || '').trim(),
          employeeId: String(row[2] || '').trim(),
          employeeName: String(row[3] || '').trim(),
          department: String(row[4] || '').trim(),
          category: (row[5] as any) || 'sort',
          observation: String(row[6] || '').trim(),
          nonConformance: String(row[7] || '').trim(),
          rootCause: String(row[8] || '').trim(),
          correctiveAction: String(row[9] || '').trim(),
          responsiblePerson: String(row[10] || '').trim(),
          targetDate: String(row[11] || '').trim(),
          status: (row[12] as any) || 'Open',
          closureDate: String(row[13] || '').trim(),
          closedBy: String(row[14] || '').trim(),
          verificationNotes: String(row[15] || '').trim(),
          beforePhoto: String(row[16] || '').trim(),
          afterPhoto: String(row[17] || '').trim(),
          createdBy: String(row[18] || '').trim(),
          createdAt: String(row[19] || '').trim(),
          updatedAt: String(row[20] || '').trim()
        })).filter(a => a.id);
        setCorrectiveActions(loadedActions);
      }

      // 4. Fetch Declared Winners
      const winRaw = await getRange(spreadsheetId, 'FiveS_Winners!A:O');
      let loadedWinners: FiveSWinner[] = [];
      if (winRaw && winRaw.length > 1) {
        loadedWinners = winRaw.slice(1).map(row => ({
          id: String(row[0] || '').trim(),
          month: String(row[1] || '').trim(),
          rank: (Number(row[2]) || 1) as 1 | 2 | 3,
          employeeId: String(row[3] || '').trim(),
          employeeName: String(row[4] || '').trim(),
          department: String(row[5] || '').trim(),
          section: String(row[6] || '').trim(),
          designation: String(row[7] || '').trim(),
          total5SScore: Number(row[8]) || 0,
          visualScore: Number(row[9]) || 0,
          finalScore: Number(row[10]) || 0,
          rating: String(row[11] || 'Excellent').trim(),
          declaredBy: String(row[12] || '').trim(),
          declaredAt: String(row[13] || '').trim(),
          remarks: String(row[14] || '').trim()
        })).filter(w => w.id);
        setWinners(loadedWinners);
      }

    } catch (err) {
      console.error('Failed to load 5S module data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spreadsheetId]);

  // Security Scoped Filter: Filter records based on role / scope
  const scopedAssessments = useMemo(() => {
    if (!userSecurityScope || userSecurityScope.isAdmin || userSecurityScope.isSuperuser) {
      return assessments;
    }
    // Manager: View department
    if (userSecurityScope.isManager && userSecurityScope.assignedDepartment) {
      return assessments.filter(a => 
        a.department.toLowerCase() === userSecurityScope.assignedDepartment?.toLowerCase()
      );
    }
    // Supervisor: View assigned staff or section
    if (userSecurityScope.isSupervisor) {
      return assessments.filter(a => 
        a.supervisorName.toLowerCase() === (userSecurityScope.employeeName || '').toLowerCase() ||
        (userSecurityScope.assignedEmployeeIds && userSecurityScope.assignedEmployeeIds.includes(a.employeeId)) ||
        (userSecurityScope.assignedDepartment && a.department.toLowerCase() === userSecurityScope.assignedDepartment.toLowerCase())
      );
    }
    // User / Operator: Own data
    if (userSecurityScope.employeeId) {
      return assessments.filter(a => a.employeeId === userSecurityScope.employeeId);
    }
    return assessments;
  }, [assessments, userSecurityScope]);

  // Unique lists for filter dropdowns
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthStr);
    assessments.forEach(a => { if (a.month) months.add(a.month); });
    return Array.from(months).sort().reverse();
  }, [assessments, currentMonthStr]);

  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => { if (e.department) depts.add(e.department); });
    assessments.forEach(a => { if (a.department) depts.add(a.department); });
    return Array.from(depts).sort();
  }, [employees, assessments]);

  const availableSections = useMemo(() => {
    const secs = new Set<string>();
    assessments.forEach(a => { if (a.section) secs.add(a.section); });
    return Array.from(secs).sort();
  }, [assessments]);

  // Month-filtered assessments
  const currentMonthAssessments = useMemo(() => {
    return scopedAssessments.filter(a => a.month === selectedMonth);
  }, [scopedAssessments, selectedMonth]);

  // Top 3 Winners for Selected Month (either declared or live-calculated)
  const monthDeclaredWinners = useMemo(() => {
    return winners.filter(w => w.month === selectedMonth).sort((a, b) => a.rank - b.rank);
  }, [winners, selectedMonth]);

  const liveRankings = useMemo(() => {
    const prevMonthStr = format(new Date(new Date(`${selectedMonth}-01`).setMonth(new Date(`${selectedMonth}-01`).getMonth() - 1)), 'yyyy-MM');
    const prevMonthAssessments = scopedAssessments.filter(a => a.month === prevMonthStr);
    const result = calculateRankings(currentMonthAssessments, correctiveActions, prevMonthAssessments, settings);
    return result.allRanked;
  }, [currentMonthAssessments, correctiveActions, scopedAssessments, selectedMonth, settings]);

  const displayedTop3 = useMemo(() => {
    if (monthDeclaredWinners.length > 0) {
      return monthDeclaredWinners;
    }
    // Convert live rankings top 3 to winner preview format
    return liveRankings.slice(0, 3).map((r, idx) => ({
      id: `PREVIEW-${r.employeeId}`,
      month: selectedMonth,
      rank: (idx + 1) as 1 | 2 | 3,
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      department: r.department,
      section: r.section,
      designation: r.designation,
      total5SScore: r.total5SScore,
      visualScore: r.visualScore,
      finalScore: r.finalScore,
      rating: r.ratingLabel,
      declaredBy: 'Live Auto-Rank (Pending Declaration)',
      declaredAt: new Date().toISOString(),
      remarks: `Provisional #${idx + 1} place rank based on current 5S audit score.`
    }));
  }, [monthDeclaredWinners, liveRankings, selectedMonth]);

  // Department KPI stats
  const departmentStats = useMemo(() => {
    const map = new Map<string, { totalScore: number; count: number; bestScore: number }>();
    currentMonthAssessments.forEach(a => {
      const d = a.department || 'Other';
      const existing = map.get(d) || { totalScore: 0, count: 0, bestScore: 0 };
      existing.totalScore += a.finalScore;
      existing.count += 1;
      existing.bestScore = Math.max(existing.bestScore, a.finalScore);
      map.set(d, existing);
    });

    return Array.from(map.entries()).map(([department, data]) => ({
      department,
      avgScore: Math.round(data.totalScore / data.count),
      count: data.count,
      bestScore: data.bestScore
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [currentMonthAssessments]);

  // Filtered Assessments Table
  const filteredAssessments = useMemo(() => {
    return scopedAssessments.filter(a => {
      if (selectedMonth && a.month !== selectedMonth) return false;
      if (deptFilter !== 'All' && a.department !== deptFilter) return false;
      if (sectionFilter !== 'All' && a.section !== sectionFilter) return false;
      if (shiftFilter !== 'All' && a.shift !== shiftFilter) return false;
      if (ratingFilter !== 'All' && a.rating !== ratingFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchEmp = a.employeeName.toLowerCase().includes(term) || a.employeeId.toLowerCase().includes(term);
        const matchDept = a.department.toLowerCase().includes(term);
        const matchAudit = a.assessorName.toLowerCase().includes(term);
        if (!matchEmp && !matchDept && !matchAudit) return false;
      }
      return true;
    });
  }, [scopedAssessments, selectedMonth, deptFilter, sectionFilter, shiftFilter, ratingFilter, searchTerm]);

  // Handlers for Save Assessment
  const handleSaveAssessment = async (assessment: FiveSAssessment, newActionsToCreate?: any[]) => {
    setIsSyncing(true);
    try {
      const existingIdx = assessments.findIndex(a => a.id === assessment.id);
      const rowData = [
        assessment.id,
        assessment.date,
        assessment.month,
        assessment.period,
        assessment.employeeId,
        assessment.employeeName,
        assessment.department,
        assessment.section,
        assessment.designation,
        assessment.supervisorName,
        assessment.managerName,
        assessment.shift,
        assessment.assessorId,
        assessment.assessorName,
        assessment.frequency,
        String(assessment.sortScore),
        String(assessment.setInOrderScore),
        String(assessment.shineScore),
        String(assessment.standardizeScore),
        String(assessment.sustainScore),
        String(assessment.total5SScore),
        String(assessment.visualScore),
        String(assessment.finalScore),
        assessment.rating,
        JSON.stringify(assessment.checklistResponses || []),
        assessment.remarks,
        String(assessment.correctiveActionsCount),
        String(assessment.criticalViolationsCount),
        assessment.status,
        assessment.createdBy,
        assessment.createdAt,
        assessment.updatedBy,
        assessment.updatedAt
      ];

      if (existingIdx >= 0) {
        // Update in state
        const updated = [...assessments];
        updated[existingIdx] = assessment;
        setAssessments(updated);
        // Update row (+2 for 1-based header)
        await updateRange(spreadsheetId, `FiveS_Assessments!A${existingIdx + 2}:AG${existingIdx + 2}`, [rowData]);
      } else {
        // Append
        setAssessments(prev => [assessment, ...prev]);
        await appendRow(spreadsheetId, 'FiveS_Assessments!A:AG', [rowData]);
      }

      // Save any spawned corrective actions
      if (newActionsToCreate && newActionsToCreate.length > 0) {
        for (const act of newActionsToCreate) {
          const actRow = [
            act.id,
            act.assessmentId,
            act.employeeId,
            act.employeeName,
            act.department,
            act.category,
            act.observation,
            act.nonConformance,
            act.rootCause,
            act.correctiveAction,
            act.responsiblePerson,
            act.targetDate,
            act.status,
            act.closureDate || '',
            act.closedBy || '',
            act.verificationNotes || '',
            act.beforePhoto || '',
            act.afterPhoto || '',
            act.createdBy,
            act.createdAt,
            act.createdAt
          ];
          setCorrectiveActions(prev => [act, ...prev]);
          await appendRow(spreadsheetId, 'FiveS_CorrectiveActions!A:U', [actRow]);
        }
      }

    } catch (err) {
      console.error('Failed to save assessment:', err);
      alert('Error saving assessment data.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handlers for Save Corrective Action
  const handleSaveAction = async (action: FiveSCorrectiveAction) => {
    setIsSyncing(true);
    try {
      const existingIdx = correctiveActions.findIndex(a => a.id === action.id);
      const rowData = [
        action.id,
        action.assessmentId,
        action.employeeId,
        action.employeeName,
        action.department,
        action.category,
        action.observation,
        action.nonConformance,
        action.rootCause,
        action.correctiveAction,
        action.responsiblePerson,
        action.targetDate,
        action.status,
        action.closureDate || '',
        action.closedBy || '',
        action.verificationNotes || '',
        action.beforePhoto || '',
        action.afterPhoto || '',
        action.createdBy,
        action.createdAt,
        action.updatedAt
      ];

      if (existingIdx >= 0) {
        const updated = [...correctiveActions];
        updated[existingIdx] = action;
        setCorrectiveActions(updated);
        await updateRange(spreadsheetId, `FiveS_CorrectiveActions!A${existingIdx + 2}:U${existingIdx + 2}`, [rowData]);
      } else {
        setCorrectiveActions(prev => [action, ...prev]);
        await appendRow(spreadsheetId, 'FiveS_CorrectiveActions!A:U', [rowData]);
      }
    } catch (err) {
      console.error('Failed to save action:', err);
      alert('Error saving corrective action.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Official Winner Declaration Submission
  const handleDeclareWinners = async () => {
    if (!canDeclare) {
      alert('You do not have permission to declare official Top 3 5S winners.');
      return;
    }
    if (liveRankings.length === 0) {
      alert('No eligible assessments found for this month.');
      return;
    }

    if (!confirm(`Are you sure you want to officially declare the Top 3 5S Champions for ${selectedMonth}?`)) {
      return;
    }

    setIsDeclaringWinner(true);
    try {
      const newWinners: FiveSWinner[] = liveRankings.slice(0, 3).map((r, idx) => ({
        id: `WIN-${selectedMonth}-${idx + 1}`,
        month: selectedMonth,
        rank: (idx + 1) as 1 | 2 | 3,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        department: r.department,
        section: r.section,
        designation: r.designation,
        total5SScore: r.total5SScore,
        visualScore: r.visualScore,
        finalScore: r.finalScore,
        rating: r.ratingLabel,
        declaredBy: userSecurityScope?.employeeName || user.displayName || user.email || 'Admin',
        declaredAt: new Date().toISOString(),
        remarks: declarationRemarks.trim() || `Official #${idx + 1} Best 5S & Housekeeping Winner for ${selectedMonth}.`
      }));

      // Filter out any existing winners for this month in local state
      const filtered = winners.filter(w => w.month !== selectedMonth);
      setWinners([...newWinners, ...filtered]);

      // Save to sheet
      for (const win of newWinners) {
        const row = [
          win.id,
          win.month,
          String(win.rank),
          win.employeeId,
          win.employeeName,
          win.department,
          win.section,
          win.designation,
          String(win.total5SScore),
          String(win.visualScore),
          String(win.finalScore),
          win.rating,
          win.declaredBy,
          win.declaredAt,
          win.remarks
        ];
        await appendRow(spreadsheetId, 'FiveS_Winners!A:O', [row]);
      }

      alert(`Congratulations! Top 3 5S Champions for ${selectedMonth} have been officially declared.`);
      setDeclarationRemarks('');
    } catch (err) {
      console.error('Error declaring winners:', err);
      alert('Failed to record winner declaration.');
    } finally {
      setIsDeclaringWinner(false);
    }
  };

  // Admin Password Protected Deletion Execution
  const executeAdminDelete = async () => {
    if (!deleteModalState.item) return;

    if (deleteModalState.type === 'assessment') {
      const targetId = deleteModalState.item.id;
      setAssessments(prev => prev.filter(a => a.id !== targetId));
      await deleteRowByPrimaryKey(spreadsheetId, 'FiveS_Assessments', targetId);
    } else if (deleteModalState.type === 'action') {
      const targetId = deleteModalState.item.id;
      setCorrectiveActions(prev => prev.filter(a => a.id !== targetId));
      await deleteRowByPrimaryKey(spreadsheetId, 'FiveS_CorrectiveActions', targetId);
    }

    setDeleteModalState({ isOpen: false, type: 'assessment', item: null });
  };

  // Export CSV of Assessments
  const handleExportCSV = () => {
    if (filteredAssessments.length === 0) {
      alert('No assessment records to export.');
      return;
    }

    const headers = [
      'Assessment ID', 'Date', 'Month', 'Employee ID', 'Employee Name',
      'Department', 'Section', 'Designation', 'Shift', 'Auditor',
      'Sort (Seiri)', 'Set in Order (Seiton)', 'Shine (Seiso)', 'Standardize (Seiketsu)', 'Sustain (Shitsuke)',
      'Total 5S Score %', 'Visual Mgmt Score %', 'Final Weighted Score %', 'Rating', 'Remarks'
    ];

    const rows = filteredAssessments.map(a => [
      a.id, a.date, a.month, a.employeeId, a.employeeName,
      a.department, a.section, a.designation, a.shift, a.assessorName,
      a.sortScore, a.setInOrderScore, a.shineScore, a.standardizeScore, a.sustainScore,
      a.total5SScore, a.visualScore, a.finalScore, a.rating, `"${(a.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `5S_Assessments_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner & Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                5S & Visual Management Navigator
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                Manufacturing Housekeeping
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Audits, 5S Discipline, Visual Controls, Top 3 Housekeeping Champions & Kaizen Corrective Actions
            </p>
          </div>
        </div>

        {/* Global Controls: Month Picker, TV Board, New Audit */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m} ({format(new Date(`${m}-01`), 'MMMM yyyy')})</option>
              ))}
            </select>
          </div>

          {/* TV Display Board Button */}
          <button
            onClick={() => setIsTVBoardOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Launch Fullscreen Digital Signage TV Board"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            <span>TV Display Board</span>
          </button>

          {/* New Assessment Audit Button */}
          {canCreateAssessment && (
            <button
              onClick={() => {
                setEditingAssessment(null);
                setIsAssessmentModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Conduct 5S Audit</span>
            </button>
          )}

          {/* Refresh sync button */}
          <button
            onClick={loadData}
            disabled={isLoading || isSyncing}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh 5S Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview & Analytics', icon: BarChart3 },
          { id: 'assessments', label: `Assessments Log (${scopedAssessments.length})`, icon: CheckSquare },
          { id: 'leaderboard', label: 'Top 3 Best 5S Champions', icon: Award },
          { id: 'actions', label: `Corrective Actions (${correctiveActions.length})`, icon: ShieldCheck },
          { id: 'departments', label: 'Department Matrix', icon: Building },
          { id: 'settings', label: 'Formula & Settings', icon: Sliders },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Top KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Audits Completed */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Audits This Month</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{currentMonthAssessments.length}</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Out of {employees.length} Master Employees
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            {/* Average 5S Discipline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plant Average 5S</span>
                <span className="text-2xl font-black text-blue-600 mt-1 block">
                  {currentMonthAssessments.length > 0 
                    ? Math.round(currentMonthAssessments.reduce((acc, a) => acc + a.finalScore, 0) / currentMonthAssessments.length)
                    : 0}%
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Target: 90%+
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            {/* Best Performer */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1st Place Champion</span>
                <span className="text-base font-extrabold text-slate-900 mt-1 block truncate max-w-[150px]">
                  {displayedTop3[0]?.employeeName || 'None Declared'}
                </span>
                <span className="text-[11px] text-amber-600 font-bold mt-0.5 block">
                  {displayedTop3[0] ? `${displayedTop3[0].finalScore}% (${displayedTop3[0].department})` : 'Pending Audits'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>

            {/* Action Items */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Open Corrective Actions</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">
                  {correctiveActions.filter(a => a.status === 'Open' || a.status === 'In Progress').length}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {correctiveActions.filter(a => a.status === 'Closed' || a.status === 'Verified').length} Resolved
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Top 3 Champions Podium Banner Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
                    Top 3 Best 5S & Housekeeping Employees ({selectedMonth})
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Honoring individual floor discipline, tool retrieval compliance, and workspace organization.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <span>Winner Declaration & Certificates</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {displayedTop3.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {displayedTop3.map((win, idx) => (
                  <div 
                    key={win.id || idx}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      win.rank === 1
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg'
                        : win.rank === 2
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-amber-900/20 border-amber-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                          win.rank === 1 ? 'bg-amber-400 text-slate-950' :
                          win.rank === 2 ? 'bg-slate-300 text-slate-950' :
                          'bg-amber-700 text-white'
                        }`}>
                          {win.rank === 1 ? '🥇 1st Place Gold' : win.rank === 2 ? '🥈 2nd Place Silver' : '🥉 3rd Place Bronze'}
                        </span>
                        <span className="text-2xl font-black text-white">{win.finalScore}%</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white">{win.employeeName}</h3>
                      <p className="text-xs text-slate-300 mt-0.5">{win.department} • {win.designation}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                      <span>5S: <strong className="text-slate-200">{win.total5SScore}%</strong></span>
                      <span>Visual: <strong className="text-slate-200">{win.visualScore}%</strong></span>
                      <button
                        onClick={() => {
                          const emp = employees.find(e => e.id === win.employeeId) || {
                            id: win.employeeId,
                            name: win.employeeName,
                            department: win.department,
                            designation: win.designation,
                            status: 'Active'
                          };
                          setSelectedProfileEmployee(emp);
                          setIsProfileModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5"
                      >
                        Profile <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No assessments logged for {selectedMonth} yet. Conduct assessments to calculate Top 3.
              </div>
            )}
          </div>

          {/* Charts Row: Category Breakdown Radar + Department Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Category Pillars Bar/Radar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                5S Category Pillar Averages ({selectedMonth})
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Comparison of plant-wide discipline across all 5 continuous improvement pillars.
              </p>

              <div className="space-y-3">
                {[
                  { name: '1. Sort (Seiri)', key: 'sortScore' },
                  { name: '2. Set in Order (Seiton)', key: 'setInOrderScore' },
                  { name: '3. Shine (Seiso)', key: 'shineScore' },
                  { name: '4. Standardize (Seiketsu)', key: 'standardizeScore' },
                  { name: '5. Sustain (Shitsuke)', key: 'sustainScore' },
                  { name: '6. Visual Management', key: 'visualScore' },
                ].map(item => {
                  const avg = currentMonthAssessments.length > 0
                    ? Math.round(currentMonthAssessments.reduce((acc, a) => acc + (a as any)[item.key], 0) / currentMonthAssessments.length)
                    : 0;

                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{item.name}</span>
                        <span className="font-extrabold text-blue-600">{avg}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            avg >= 90 ? 'bg-emerald-500' :
                            avg >= 80 ? 'bg-blue-600' :
                            avg >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${avg}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Department Comparison Bar Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-500" />
                Department 5S Score Comparison
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Average 5S audit scores across manufacturing departments.
              </p>

              {departmentStats.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="department" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="avgScore" name="Avg Score %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No department data recorded yet.
                </div>
              )}
            </div>

          </div>

          {/* Recent Audits Table Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-slate-500" />
                Latest 5S Audit Assessments
              </h3>
              <button
                onClick={() => setActiveTab('assessments')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View Full Log ({scopedAssessments.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/60 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-2.5">Date</th>
                    <th className="px-5 py-2.5">Employee</th>
                    <th className="px-5 py-2.5">Department</th>
                    <th className="px-5 py-2.5">Auditor</th>
                    <th className="px-5 py-2.5">5S Score</th>
                    <th className="px-5 py-2.5">Visual Score</th>
                    <th className="px-5 py-2.5">Final Score</th>
                    <th className="px-5 py-2.5">Rating</th>
                    <th className="px-5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedAssessments.slice(0, 5).map(audit => (
                    <tr key={audit.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3 font-semibold text-slate-700">{audit.date}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => {
                            const emp = employees.find(e => e.id === audit.employeeId) || {
                              id: audit.employeeId,
                              name: audit.employeeName,
                              department: audit.department,
                              designation: audit.designation,
                              status: 'Active'
                            };
                            setSelectedProfileEmployee(emp);
                            setIsProfileModalOpen(true);
                          }}
                          className="font-bold text-blue-600 hover:underline text-left block"
                        >
                          {audit.employeeName}
                        </button>
                        <span className="text-[10px] text-slate-400">{audit.employeeId}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{audit.department}</td>
                      <td className="px-5 py-3 text-slate-600">{audit.assessorName}</td>
                      <td className="px-5 py-3 font-bold text-slate-700">{audit.total5SScore}%</td>
                      <td className="px-5 py-3 font-bold text-slate-700">{audit.visualScore}%</td>
                      <td className="px-5 py-3 font-extrabold text-blue-600 text-sm">{audit.finalScore}%</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${audit.badgeClass}`}>
                          {audit.rating}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            const emp = employees.find(e => e.id === audit.employeeId) || {
                              id: audit.employeeId,
                              name: audit.employeeName,
                              department: audit.department,
                              designation: audit.designation,
                              status: 'Active'
                            };
                            setSelectedProfileEmployee(emp);
                            setIsProfileModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View 360° Scorecard"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: ASSESSMENTS LOG TABLE */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          
          {/* Multi-Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by employee name, ID, department, or auditor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                {canCreateAssessment && (
                  <button
                    onClick={() => {
                      setEditingAssessment(null);
                      setIsAssessmentModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Audit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All">All Departments</option>
                  {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section</label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All">All Sections</option>
                  {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shift</label>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All">All Shifts</option>
                  <option value="Day Shift">Day Shift</option>
                  <option value="Night Shift">Night Shift</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rating</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All">All Ratings</option>
                  {settings.ratingRanges.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Full Assessments Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Audit ID / Date</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Dept / Section</th>
                    <th className="px-4 py-3">Shift / Supervisor</th>
                    <th className="px-4 py-3 text-center">Sort</th>
                    <th className="px-4 py-3 text-center">Order</th>
                    <th className="px-4 py-3 text-center">Shine</th>
                    <th className="px-4 py-3 text-center">Std</th>
                    <th className="px-4 py-3 text-center">Sustain</th>
                    <th className="px-4 py-3 text-center">5S (70%)</th>
                    <th className="px-4 py-3 text-center">Visual (30%)</th>
                    <th className="px-4 py-3 text-center">Final Score</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssessments.length > 0 ? (
                    filteredAssessments.map(audit => (
                      <tr key={audit.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block">{audit.id}</span>
                          <span className="text-[10px] text-slate-400">{audit.date} ({audit.frequency})</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              const emp = employees.find(e => e.id === audit.employeeId) || {
                                id: audit.employeeId,
                                name: audit.employeeName,
                                department: audit.department,
                                designation: audit.designation,
                                status: 'Active'
                              };
                              setSelectedProfileEmployee(emp);
                              setIsProfileModalOpen(true);
                            }}
                            className="font-bold text-blue-600 hover:underline text-left block"
                          >
                            {audit.employeeName}
                          </button>
                          <span className="text-[10px] text-slate-400">{audit.employeeId} • {audit.designation}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 block">{audit.department}</span>
                          <span className="text-[10px] text-slate-500">{audit.section}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-700 block">{audit.shift}</span>
                          <span className="text-[10px] text-slate-400">Sup: {audit.supervisorName}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{audit.sortScore}%</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{audit.setInOrderScore}%</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{audit.shineScore}%</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{audit.standardizeScore}%</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{audit.sustainScore}%</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/50">{audit.total5SScore}%</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/50">{audit.visualScore}%</td>
                        <td className="px-4 py-3 text-center font-black text-blue-600 text-sm bg-blue-50/40">
                          {audit.finalScore}%
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${audit.badgeClass}`}>
                            {audit.rating}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                const emp = employees.find(e => e.id === audit.employeeId) || {
                                id: audit.employeeId,
                                name: audit.employeeName,
                                department: audit.department,
                                designation: audit.designation,
                                status: 'Active'
                              };
                              setSelectedProfileEmployee(emp);
                              setIsProfileModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Scorecard"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {canCreateAssessment && (
                            <button
                              onClick={() => {
                                setEditingAssessment(audit);
                                setIsAssessmentModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Audit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeleteModalState({
                                  isOpen: true,
                                  type: 'assessment',
                                  item: audit
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Admin Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="p-12 text-center text-xs text-slate-400">
                      No matching 5S assessment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      )}

      {/* TAB 3: BEST 5S TOP 3 CHAMPIONS & DECLARATION */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          
          {/* Winner Declaration Workflow Card (For Admins / Managers) */}
          {canDeclare && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 p-6 rounded-2xl border border-blue-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-blue-950 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Official Winner Declaration Workflow ({selectedMonth})
                  </h3>
                  <p className="text-xs text-blue-800/80 mt-0.5">
                    Declare and officially record the Top 3 Housekeeping Champions in the permanent company audit registry.
                  </p>
                </div>

                <button
                  onClick={handleDeclareWinners}
                  disabled={isDeclaringWinner || liveRankings.length === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span>{monthDeclaredWinners.length > 0 ? 'Re-Declare & Update Top 3' : 'Declare Top 3 Champions'}</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Optional executive declaration remarks or Kaizen achievement notes..."
                value={declarationRemarks}
                onChange={(e) => setDeclarationRemarks(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Top 3 Podium Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {displayedTop3.map((win) => (
              <div
                key={win.id || win.rank}
                className={`p-6 rounded-2xl border flex flex-col justify-between relative overflow-hidden transition-all shadow-md ${
                  win.rank === 1
                    ? 'bg-gradient-to-b from-amber-50 to-white border-amber-300 ring-2 ring-amber-400/20'
                    : win.rank === 2
                    ? 'bg-gradient-to-b from-slate-50 to-white border-slate-300'
                    : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      win.rank === 1 ? 'bg-amber-400 text-slate-950' :
                      win.rank === 2 ? 'bg-slate-300 text-slate-900' :
                      'bg-amber-700 text-white'
                    }`}>
                      {win.rank === 1 ? '🥇 1st Gold Winner' : win.rank === 2 ? '🥈 2nd Silver Winner' : '🥉 3rd Bronze Winner'}
                    </span>
                    <span className="text-3xl font-black text-slate-900">{win.finalScore}%</span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mt-2">{win.employeeName}</h3>
                  <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                    <p><strong className="text-slate-800">ID:</strong> {win.employeeId}</p>
                    <p><strong className="text-slate-800">Department:</strong> {win.department} ({win.section})</p>
                    <p><strong className="text-slate-800">Designation:</strong> {win.designation}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">5S Score:</span>
                    <span className="font-bold text-slate-800">{win.total5SScore}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Visual Mgmt:</span>
                    <span className="font-bold text-slate-800">{win.visualScore}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Rating:</span>
                    <span className="font-extrabold text-emerald-600">{win.rating}</span>
                  </div>

                  <button
                    onClick={() => {
                      const emp = employees.find(e => e.id === win.employeeId) || {
                        id: win.employeeId,
                        name: win.employeeName,
                        department: win.department,
                        designation: win.designation,
                        status: 'Active'
                      };
                      setSelectedProfileEmployee(emp);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Official 5S Scorecard</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Full Monthly Rankings Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Comprehensive Monthly Floor Rankings ({liveRankings.length} evaluated)
              </h3>
              <span className="text-xs text-slate-500">
                Minimum Qualifying Score for Top 3: <strong className="text-slate-800">{settings.minQualifyingScore}%</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/60 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-center">5S Score (70%)</th>
                    <th className="px-4 py-3 text-center">Visual (30%)</th>
                    <th className="px-4 py-3 text-center">Final Score</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Eligibility Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveRankings.map((rank, idx) => (
                    <tr key={rank.employeeId} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' :
                          idx === 1 ? 'bg-slate-300 text-slate-900' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {rank.employeeName}
                        <span className="block text-[10px] text-slate-400 font-normal">{rank.employeeId} • {rank.designation}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{rank.department} ({rank.section})</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{rank.total5SScore}%</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{rank.visualScore}%</td>
                      <td className="px-4 py-3 text-center font-black text-blue-600 text-sm">{rank.finalScore}%</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {rank.ratingLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {rank.isEligible ? (
                          <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Qualified
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {rank.disqualificationReason || '< 80% Threshold'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: CORRECTIVE ACTIONS TRACKER */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Continuous Improvement & Corrective Actions Tracker
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor shop floor non-conformances, root cause analysis, target completion dates, and verified closures.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingAction(null);
                setIsActionModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Action Item</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Action ID</th>
                    <th className="px-4 py-3">Employee / Dept</th>
                    <th className="px-4 py-3">Pillar</th>
                    <th className="px-4 py-3">Observation & Root Cause</th>
                    <th className="px-4 py-3">Corrective Plan</th>
                    <th className="px-4 py-3">Responsible</th>
                    <th className="px-4 py-3">Target Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {correctiveActions.length > 0 ? (
                    correctiveActions.map(act => (
                      <tr key={act.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">{act.id}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{act.employeeName}</span>
                          <span className="text-[10px] text-slate-400">{act.department}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                            {act.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="font-semibold text-slate-800 block">{act.observation}</span>
                          {act.rootCause && <span className="text-[10px] text-slate-500">Why: {act.rootCause}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-xs">{act.correctiveAction}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{act.responsiblePerson}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{act.targetDate}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            act.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            act.status === 'Verified' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            act.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {act.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingAction(act);
                                setIsActionModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Update Status / Verify"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => {
                                  setDeleteModalState({
                                    isOpen: true,
                                    type: 'action',
                                    item: act
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Action"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                        No corrective actions logged. 100% compliant!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: DEPARTMENT MATRIX */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departmentStats.map((dept, idx) => {
              const deptAssessments = currentMonthAssessments.filter(a => a.department === dept.department);
              return (
                <div key={dept.department} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rank #{idx + 1}</span>
                      <h3 className="text-base font-extrabold text-slate-900">{dept.department}</h3>
                    </div>
                    <span className={`text-2xl font-black ${dept.avgScore >= 90 ? 'text-emerald-600' : dept.avgScore >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {dept.avgScore}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Audits</span>
                      <span className="font-bold text-slate-800">{dept.count}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Top Score</span>
                      <span className="font-bold text-emerald-600">{dept.bestScore}%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Audited Employees:</span>
                    <div className="divide-y divide-slate-100 text-xs">
                      {deptAssessments.map(a => (
                        <div key={a.id} className="py-1.5 flex items-center justify-between">
                          <span className="font-medium text-slate-700 truncate">{a.employeeName}</span>
                          <span className="font-bold text-blue-600">{a.finalScore}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: FORMULA & SETTINGS */}
      {activeTab === 'settings' && (
        <FiveSSettingsTab
          settings={settings}
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            saveFiveSSettings(newSettings);
          }}
          canConfigure={canConfigure}
        />
      )}

      {/* MODAL 1: Assessment Modal */}
      {isAssessmentModalOpen && (
        <FiveSAssessmentModal
          isOpen={isAssessmentModalOpen}
          onClose={() => setIsAssessmentModalOpen(false)}
          onSave={handleSaveAssessment}
          employees={employees}
          initialAssessment={editingAssessment}
          existingAssessments={assessments}
          currentUserEmail={user.email || ''}
          currentUserName={userSecurityScope?.employeeName || user.displayName || user.email || 'Auditor'}
          currentUserId={userSecurityScope?.employeeId || 'ADMIN-001'}
        />
      )}

      {/* MODAL 2: 360° Employee Scorecard Modal */}
      {isProfileModalOpen && (
        <FiveSEmployeeProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedProfileEmployee(null);
          }}
          employee={selectedProfileEmployee}
          assessments={assessments}
          correctiveActions={correctiveActions}
        />
      )}

      {/* MODAL 3: Corrective Action Modal */}
      {isActionModalOpen && (
        <FiveSCorrectiveActionModal
          isOpen={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setEditingAction(null);
          }}
          onSave={handleSaveAction}
          employees={employees}
          initialAction={editingAction}
          currentUserEmail={user.email || ''}
          currentUserName={userSecurityScope?.employeeName || user.displayName || user.email || 'Supervisor'}
        />
      )}

      {/* MODAL 4: Fullscreen Digital TV Display Board */}
      {isTVBoardOpen && (
        <FiveSTVDisplayBoard
          isOpen={isTVBoardOpen}
          onClose={() => setIsTVBoardOpen(false)}
          selectedMonth={selectedMonth}
          assessments={assessments}
          winners={displayedTop3}
          correctiveActions={correctiveActions}
          departmentStats={departmentStats}
        />
      )}

      {/* MODAL 5: Centralized Admin Deletion Security Password Modal */}
      <AdminDeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title={`Confirm 5S ${deleteModalState.type === 'assessment' ? 'Audit Record' : 'Action Item'} Deletion`}
        itemName={deleteModalState.item ? `${deleteModalState.item.id} - ${deleteModalState.item.employeeName || ''}` : ''}
        itemDetails={
          deleteModalState.item ? (
            <div className="space-y-1 text-xs text-slate-600">
              <p><strong>Record ID:</strong> {deleteModalState.item.id}</p>
              <p><strong>Employee:</strong> {deleteModalState.item.employeeName} ({deleteModalState.item.department})</p>
              {deleteModalState.item.date && <p><strong>Audit Date:</strong> {deleteModalState.item.date}</p>}
            </div>
          ) : null
        }
        onConfirm={executeAdminDelete}
        onClose={() => setDeleteModalState({ isOpen: false, type: 'assessment', item: null })}
      />

    </div>
  );
}
