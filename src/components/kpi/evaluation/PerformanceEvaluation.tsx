import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, Plus, Table, BarChart2, FileText, CheckCircle2, 
  AlertCircle, RefreshCw, Star, Layers, Calendar, UserCheck,
  ShieldAlert, Lock, ArrowRight
} from 'lucide-react';
import { 
  Employee, PerformanceEvaluationRecord, EvaluationScores, 
  calculateEvaluationSummary, calculateYearOfService 
} from '../types';
import { filterAuthorizedEmployees, getAuthorizedEmployeeIdSet } from '../../../lib/security';
import EvaluationForm from './EvaluationForm';
import EvaluationRecords from './EvaluationRecords';
import EvaluationAnalytics from './EvaluationAnalytics';
import EvaluationSlipModal from './EvaluationSlipModal';
import KPIPrivacyManager from '../KPIPrivacyManager';
import PerformanceReviews from '../../performance/PerformanceReviews';
import PerformanceRatingScheme from './PerformanceRatingScheme';
import { 
  getRange, appendRow, updateRange, deleteRowByPrimaryKey, 
  ensurePerformanceEvaluationSheet, PERFORMANCE_EVALUATION_HEADERS,
  getHiddenKpiEmployeeIds, ensureKpiPrivacySheet, saveHiddenKpiEmployeeIds
} from '../../../lib/sheets';

interface PerformanceEvaluationProps {
  spreadsheetId: string;
  employees: Employee[];
  userEmail?: string;
  userSecurityScope?: any;
  user?: any;
  initialSubTab?: 'records' | 'new' | 'reviews' | 'analytics' | 'privacy';
}

const LOCAL_STORAGE_KEY = 'erp_performance_evaluations_v1';

// Initial seed data if no records exist
const INITIAL_DEMO_RECORDS: PerformanceEvaluationRecord[] = [
  {
    id: 'EVAL-2026-Q1-EMP001',
    employeeId: 'EMP001',
    employeeName: 'Mohammad Rahim',
    designation: 'Senior Machine Operator',
    department: 'Printing',
    dateJoined: '2021-03-15',
    yearOfService: '5 Years',
    evaluationType: 'Quarterly',
    period: 'Q1 2026 (Jan - Mar)',
    periodKey: '2026-Q1',
    year: 2026,
    evaluationDate: '2026-03-25',
    evaluatedBy: 'Shift Supervisor',
    scores: {
      jobKnowledge: 5,
      quantityOfOutput: 5,
      qualityOfWork: 4,
      attendanceCommitment: 5,
      initiativeImprovement: 4,
      dependability: 5,
      attitude: 5,
      creativityAnalytical: 4,
      communicationSkills: 4,
      teamworkRelationship: 5,
    },
    totalScore: 46,
    totalPossible: 50,
    averageRating: 4.60,
    percentage: 92.0,
    ratingGrade: 'Outstanding',
    strengths: 'Outstanding machine operating speed and leadership on multi-color printing lines.',
    areasOfImprovement: 'Continuous mentorship of junior apprentice operators.',
    recommendation: 'Promotion to Senior Role / Lead',
    comments: 'Exemplary dedication and perfect attendance in Q1.',
    status: 'Submitted',
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z',
  },
  {
    id: 'EVAL-2026-Q1-EMP002',
    employeeId: 'EMP002',
    employeeName: 'Fatema Begum',
    designation: 'Quality Control Inspector',
    department: 'Quality Assurance',
    dateJoined: '2022-07-01',
    yearOfService: '3.6 Years',
    evaluationType: 'Quarterly',
    period: 'Q1 2026 (Jan - Mar)',
    periodKey: '2026-Q1',
    year: 2026,
    evaluationDate: '2026-03-26',
    evaluatedBy: 'QA Manager',
    scores: {
      jobKnowledge: 4,
      quantityOfOutput: 4,
      qualityOfWork: 5,
      attendanceCommitment: 4,
      initiativeImprovement: 4,
      dependability: 4,
      attitude: 4,
      creativityAnalytical: 4,
      communicationSkills: 4,
      teamworkRelationship: 4,
    },
    totalScore: 41,
    totalPossible: 50,
    averageRating: 4.10,
    percentage: 82.0,
    ratingGrade: 'Exceeds Expectations',
    strengths: 'Very sharp eye for microscopic printing defects and bar code readability.',
    areasOfImprovement: 'Faster logging of non-conformance reports.',
    recommendation: 'Salary Increment / Performance Bonus',
    comments: 'Consistent and reliable performance.',
    status: 'Submitted',
    createdAt: '2026-03-26T11:00:00.000Z',
    updatedAt: '2026-03-26T11:00:00.000Z',
  },
  {
    id: 'EVAL-2026-H1-EMP003',
    employeeId: 'EMP003',
    employeeName: 'Kamal Hossain',
    designation: 'Maintenance Technician',
    department: 'Engineering',
    dateJoined: '2023-01-10',
    yearOfService: '3.1 Years',
    evaluationType: 'Half Yearly',
    period: 'H1 2026 (Jan - Jun)',
    periodKey: '2026-H1',
    year: 2026,
    evaluationDate: '2026-06-28',
    evaluatedBy: 'Chief Engineer',
    scores: {
      jobKnowledge: 4,
      quantityOfOutput: 4,
      qualityOfWork: 4,
      attendanceCommitment: 4,
      initiativeImprovement: 3,
      dependability: 4,
      attitude: 4,
      creativityAnalytical: 4,
      communicationSkills: 3,
      teamworkRelationship: 4,
    },
    totalScore: 38,
    totalPossible: 50,
    averageRating: 3.80,
    percentage: 76.0,
    ratingGrade: 'Exceeds Expectations',
    strengths: 'Quick emergency breakdown troubleshooting on flexo and offset presses.',
    areasOfImprovement: 'Maintain more detailed preventive maintenance logs.',
    recommendation: 'Special Training & Multi-Skilling',
    comments: 'Reliable engineering support.',
    status: 'Submitted',
    createdAt: '2026-06-28T09:00:00.000Z',
    updatedAt: '2026-06-28T09:00:00.000Z',
  }
];

export default function PerformanceEvaluation({
  spreadsheetId,
  employees,
  userEmail = 'Supervisor',
  userSecurityScope,
  user,
  initialSubTab = 'records'
}: PerformanceEvaluationProps) {
  // Navigation sub-tab
  const [subTab, setSubTab] = useState<'records' | 'new' | 'reviews' | 'analytics' | 'privacy'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // Evaluation Records State
  const [records, setRecords] = useState<PerformanceEvaluationRecord[]>([]);
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingRecord, setEditingRecord] = useState<PerformanceEvaluationRecord | null>(null);
  const [slipModalRecord, setSlipModalRecord] = useState<PerformanceEvaluationRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = Boolean(userSecurityScope?.isAdmin);

  // Security Scoped Access for Privacy & Data Protection
  const authorizedEmployees = React.useMemo(() => {
    return filterAuthorizedEmployees(employees, userSecurityScope);
  }, [employees, userSecurityScope]);

  const authorizedIdSet = React.useMemo(() => {
    return getAuthorizedEmployeeIdSet(employees, userSecurityScope);
  }, [employees, userSecurityScope]);

  const isRestrictedScope = React.useMemo(() => {
    return Boolean(userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all');
  }, [userSecurityScope]);

  // Privacy-filtered evaluation records matching assigned employees
  const authorizedRecords = React.useMemo(() => {
    if (!isRestrictedScope) return records;
    return records.filter(r => authorizedIdSet.has((r.employeeId || '').toUpperCase()));
  }, [records, isRestrictedScope, authorizedIdSet]);

  // Toggle Hidden Status Handler
  const handleToggleHide = async (employeeId: string) => {
    const isCurrentlyHidden = hiddenEmployeeIds.some(id => id.toUpperCase() === employeeId.toUpperCase());
    const updated = isCurrentlyHidden
      ? hiddenEmployeeIds.filter(id => id.toUpperCase() !== employeeId.toUpperCase())
      : Array.from(new Set([...hiddenEmployeeIds, employeeId.toUpperCase()]));
    
    setHiddenEmployeeIds(updated);

    if (spreadsheetId) {
      try {
        await saveHiddenKpiEmployeeIds(spreadsheetId, updated, userEmail);
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
        await saveHiddenKpiEmployeeIds(spreadsheetId, uppercaseList, userEmail);
        setStatusMessage({ type: 'success', text: 'Privacy rules updated successfully!' });
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (err: any) {
        console.warn('Failed to batch save KPI privacy list:', err);
        setStatusMessage({ type: 'error', text: 'Failed to sync privacy rules to cloud.' });
      }
    }
  };

  // Load records from Google Sheets and/or LocalStorage
  const loadEvaluations = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Try local storage cache
      let localRecords: PerformanceEvaluationRecord[] = [];
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          localRecords = JSON.parse(cached);
        } catch {
          localRecords = [];
        }
      }

      // 2. Try Google Sheets
      if (spreadsheetId) {
        try {
          await Promise.all([
            ensurePerformanceEvaluationSheet(spreadsheetId),
            ensureKpiPrivacySheet(spreadsheetId)
          ]);
          const [raw, hiddenIds] = await Promise.all([
            getRange(spreadsheetId, 'Performance_Evaluations!A:AF'),
            getHiddenKpiEmployeeIds(spreadsheetId)
          ]);
          setHiddenEmployeeIds(hiddenIds || []);
          if (raw && raw.length > 1) {
            const sheetRecords: PerformanceEvaluationRecord[] = raw.slice(1).map((row, idx) => {
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
                rowIndex: idx + 2 // Sheet 1-indexed row number
              };
            }).filter(r => r.employeeId);

            if (sheetRecords.length > 0) {
              setRecords(sheetRecords);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sheetRecords));
              setIsLoading(false);
              return;
            }
          }
        } catch (sheetErr) {
          console.warn('Google Sheets evaluation load skipped/failed:', sheetErr);
        }
      }

      // If no sheet records, use local cache or fallback seed
      if (localRecords.length > 0) {
        setRecords(localRecords);
      } else {
        setRecords(INITIAL_DEMO_RECORDS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
      }
    } catch (err: any) {
      console.error('Error loading evaluations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [spreadsheetId]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  // Convert Evaluation record to Google Sheet row format
  const recordToRow = (record: PerformanceEvaluationRecord): string[] => {
    return [
      record.id,
      record.employeeId,
      record.employeeName,
      record.designation || '',
      record.department || '',
      record.dateJoined || '',
      record.yearOfService || '',
      record.evaluationType,
      record.period,
      record.periodKey,
      String(record.year),
      record.evaluationDate,
      record.evaluatedBy,
      String(record.scores.jobKnowledge),
      String(record.scores.quantityOfOutput),
      String(record.scores.qualityOfWork),
      String(record.scores.attendanceCommitment),
      String(record.scores.initiativeImprovement),
      String(record.scores.dependability),
      String(record.scores.attitude),
      String(record.scores.creativityAnalytical),
      String(record.scores.communicationSkills),
      String(record.scores.teamworkRelationship),
      String(record.totalScore),
      String(record.averageRating.toFixed(2)),
      record.ratingGrade,
      record.strengths || '',
      record.areasOfImprovement || '',
      record.recommendation || '',
      record.comments || '',
      record.createdAt || new Date().toISOString(),
      record.updatedAt || new Date().toISOString()
    ];
  };

  // Save / Update Evaluation Handler
  const handleSaveEvaluation = async (recordData: Partial<PerformanceEvaluationRecord>): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const existingIdx = records.findIndex(r => r.id === recordData.id);

      let fullRecord: PerformanceEvaluationRecord;

      if (existingIdx >= 0) {
        // Update
        fullRecord = {
          ...records[existingIdx],
          ...recordData,
          updatedAt: now
        } as PerformanceEvaluationRecord;
      } else {
        // Create
        fullRecord = {
          ...recordData,
          createdAt: now,
          updatedAt: now
        } as PerformanceEvaluationRecord;
      }

      // Update Local State & Storage
      let updatedList: PerformanceEvaluationRecord[];
      if (existingIdx >= 0) {
        updatedList = [...records];
        updatedList[existingIdx] = fullRecord;
      } else {
        updatedList = [fullRecord, ...records];
      }

      setRecords(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

      // Sync with Google Sheets in background
      if (spreadsheetId) {
        try {
          await ensurePerformanceEvaluationSheet(spreadsheetId);
          if (existingIdx >= 0 && fullRecord.rowIndex) {
            // Update row in sheet
            const rowData = recordToRow(fullRecord);
            await updateRange(spreadsheetId, `Performance_Evaluations!A${fullRecord.rowIndex}:AF${fullRecord.rowIndex}`, [rowData]);
          } else {
            // Append row
            const rowData = recordToRow(fullRecord);
            await appendRow(spreadsheetId, 'Performance_Evaluations!A1', [rowData]);
          }
        } catch (sheetErr) {
          console.warn('Google Sheets sync error (saved locally):', sheetErr);
        }
      }

      setStatusMessage({ type: 'success', text: `Evaluation for ${fullRecord.employeeName} saved successfully!` });
      setTimeout(() => setStatusMessage(null), 4000);
      setEditingRecord(null);
      setSubTab('records');
      return true;
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save evaluation.' });
      return false;
    }
  };

  // Delete Evaluation Handler
  const handleDeleteEvaluation = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    if (spreadsheetId) {
      try {
        await deleteRowByPrimaryKey(spreadsheetId, 'Performance_Evaluations', id);
      } catch (sheetErr) {
        console.warn('Failed to delete row in sheet:', sheetErr);
      }
    }

    setStatusMessage({ type: 'success', text: 'Evaluation deleted successfully.' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Parameter Sub-Navigation */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* SubTab Switchers */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl gap-1 overflow-x-auto">
            <button
              onClick={() => {
                setEditingRecord(null);
                setSubTab('records');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                subTab === 'records' && !editingRecord
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Table className="w-4 h-4" />
              Evaluation Directory ({records.length})
            </button>

            <button
              onClick={() => {
                setEditingRecord(null);
                setSubTab('new');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                subTab === 'new' || editingRecord
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Plus className="w-4 h-4" />
              {editingRecord ? 'Edit Evaluation' : 'New Staff Evaluation'}
            </button>

            <button
              onClick={() => {
                setEditingRecord(null);
                setSubTab('reviews');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                subTab === 'reviews' && !editingRecord
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Award className="w-4 h-4" />
              Review Schedules & Cycles
            </button>

            <button
              onClick={() => {
                setEditingRecord(null);
                setSubTab('analytics');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                subTab === 'analytics' && !editingRecord
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Competency Analytics & Radar
            </button>

            {/* Admin Privacy Controls */}
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setSubTab('privacy');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  subTab === 'privacy' && !editingRecord
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:text-amber-900 hover:bg-amber-100/70 bg-amber-50/60 border border-amber-200/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Admin Privacy Controls</span>
                {hiddenEmployeeIds.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    subTab === 'privacy' ? 'bg-white text-amber-700' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {hiddenEmployeeIds.length} Hidden
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Quick Refresh */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadEvaluations}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition border border-slate-200"
              title="Refresh from Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold animate-fade-in ${
          statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Restricted Security Scope Notice */}
      {isRestrictedScope && (
        <div className="px-4 py-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              <strong>Supervisor Privacy Filter Active:</strong> Displaying only data for <strong>{authorizedEmployees.length}</strong> employee(s) assigned to your supervision.
            </span>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
            Scoped Access
          </span>
        </div>
      )}

      {/* Official 1-5 Rating Scheme Reference Banner */}
      {subTab !== 'new' && (
        <PerformanceRatingScheme 
          collapsible={true}
          defaultExpanded={false}
          title="Performance Evaluation Rating Scheme (1 – 5 Rating Scale)"
          subtitle="Click to expand official visual rating scheme, point benchmarks, and performance descriptions"
        />
      )}

      {/* SUBTAB RENDERING */}
      {subTab === 'records' && !editingRecord && (
        <EvaluationRecords
          records={authorizedRecords}
          isLoading={isLoading}
          hiddenEmployeeIds={hiddenEmployeeIds}
          isAdmin={isAdmin}
          onNewEvaluation={() => setSubTab('new')}
          onEdit={(record) => {
            setEditingRecord(record);
            setSubTab('new');
          }}
          onDelete={handleDeleteEvaluation}
          onViewSlip={(record) => setSlipModalRecord(record)}
        />
      )}

      {(subTab === 'new' || editingRecord) && (
        <EvaluationForm
          employees={authorizedEmployees}
          allEmployees={employees}
          initialData={editingRecord}
          existingRecords={authorizedRecords}
          onSave={handleSaveEvaluation}
          onCancel={() => {
            setEditingRecord(null);
            setSubTab('records');
          }}
          currentUserEmail={userEmail}
          userSecurityScope={userSecurityScope}
          onSelectExistingForEdit={(record) => {
            setEditingRecord(record);
          }}
        />
      )}

      {subTab === 'reviews' && !editingRecord && (
        <PerformanceReviews
          spreadsheetId={spreadsheetId}
          user={user}
          userSecurityScope={userSecurityScope}
        />
      )}

      {subTab === 'analytics' && !editingRecord && (
        <EvaluationAnalytics 
          records={authorizedRecords}
          hiddenEmployeeIds={hiddenEmployeeIds}
          isAdmin={isAdmin}
        />
      )}

      {subTab === 'privacy' && !editingRecord && isAdmin && (
        <KPIPrivacyManager
          employees={employees}
          hiddenEmployeeIds={hiddenEmployeeIds}
          onToggleHide={handleToggleHide}
          onBatchSaveHidden={handleBatchSaveHidden}
          evaluationRecords={records}
          moduleName="Performance Evaluation"
          moduleTitle="Performance Evaluation Confidentiality & Privacy Controls"
          moduleDescription="Configure which employees have their 10-point competency evaluations, star ratings, and appraisal slips protected from non-administrative staff."
        />
      )}

      {/* Printable Evaluation Slip Modal */}
      {slipModalRecord && (
        <EvaluationSlipModal
          evaluation={slipModalRecord}
          hiddenEmployeeIds={hiddenEmployeeIds}
          isAdmin={isAdmin}
          onClose={() => setSlipModalRecord(null)}
        />
      )}

    </div>
  );
}
