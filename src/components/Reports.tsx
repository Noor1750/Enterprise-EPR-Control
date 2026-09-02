import { useState, useEffect, useMemo } from 'react';
import { getRange } from '../lib/sheets';
import { 
  Loader2, Download, FileSpreadsheet, FileText, Filter, Calendar, 
  Search, CheckCircle2, AlertCircle, Database, Layers, Eye, RefreshCw,
  Building, Users, Clock, Wrench, Sparkles, Award, Mail, ChevronRight, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getPerformanceReviews, syncReviewsWithEvaluations } from '../lib/performanceReviewEngine';
import { PerformanceEvaluationRecord } from './kpi/types';

const getXlsx = () => XLSX;

export interface SheetDefinition {
  id: string;
  name: string;
  group: 'Employee & Org' | 'Attendance & Leave' | 'Production & Machinery' | 'Quality & 5S' | 'Performance & Reviews' | 'Developer & Inquiries';
  description: string;
  dateColName?: string;
}

export const SHEETS_CATALOG: SheetDefinition[] = [
  // 1. Employee & Org
  { id: 'Employees', name: 'Employees Directory', group: 'Employee & Org', description: 'Full master employee profiles, designations, salaries, shifts, and contact details.', dateColName: 'Date_of_Join' },
  { id: 'Users', name: 'Users & Permissions (RBAC)', group: 'Employee & Org', description: 'System user access levels, assigned departments, input permissions, and security roles.', dateColName: 'None' },
  { id: 'Supervisors', name: 'Supervisors & Managers Org', group: 'Employee & Org', description: 'Departmental hierarchy, designated supervisors, and managerial mapping.', dateColName: 'None' },
  { id: 'SkillMatrix', name: 'Skill Matrix & Competency', group: 'Employee & Org', description: 'Machine operation skills, audit competencies, and operator proficiency levels.', dateColName: 'None' },

  // 2. Attendance & Leave
  { id: 'Overtime', name: 'Overtime Records (Monthly Crosstab)', group: 'Attendance & Leave', description: 'Daily overtime breakdown (1st–31st), total overtime hours, hourly rates, and payable wages.', dateColName: 'Date' },
  { id: 'Overtime_Raw', name: 'Overtime Raw Daily Log', group: 'Attendance & Leave', description: 'Unaggregated daily overtime logs with employee IDs, departments, and logged hours.', dateColName: 'Date' },
  { id: 'Leave', name: 'Leave Applications & Approvals', group: 'Attendance & Leave', description: 'Leave requests, dates, leave types, supervisor signoffs, HR approval, and settlement status.', dateColName: 'From_Date' },
  { id: 'SettlementAuditLog', name: 'Leave Settlement Audit Log', group: 'Attendance & Leave', description: 'HR audit logs tracking bulk leave settlements, approvals, and timestamped actions.', dateColName: 'Date' },
  { id: 'LeaveBalanceTransactions', name: 'Leave Balance Ledger & Adjustments', group: 'Attendance & Leave', description: 'Leave balance quota credits, manual adjustments, carry-forward, and special grants.', dateColName: 'Date' },
  { id: 'LeaveTypesMaster', name: 'Leave Types Policy Master', group: 'Attendance & Leave', description: 'Company leave policies, default annual quotas, paid/unpaid rules, and carryover flags.', dateColName: 'None' },
  { id: 'Holidays', name: 'Holiday Calendar Master', group: 'Attendance & Leave', description: 'Company and statutory public, festival, and corporate holidays with working classifications.', dateColName: 'Holiday_Date' },
  { id: 'HolidayOverrides', name: 'Holiday Department Overrides', group: 'Attendance & Leave', description: 'Department-specific holiday work exceptions, working shifts, and manager approvals.', dateColName: 'Holiday_Date' },
  { id: 'HolidayAudit', name: 'Holiday Audit Trail', group: 'Attendance & Leave', description: 'Historical changes and audit logs for holiday additions, modifications, and removals.', dateColName: 'Changed_At' },
  { id: 'HolidayTypes', name: 'Holiday Types Master', group: 'Attendance & Leave', description: 'Classification categories for national, corporate, festival, and emergency holidays.', dateColName: 'None' },
  { id: 'CalendarSettings', name: 'Holiday & Calendar Settings', group: 'Attendance & Leave', description: 'System calendar configurations including weekly off days (e.g. Friday) and working week rules.', dateColName: 'Updated_At' },
  { id: 'Shifts', name: 'Shift Definitions Master', group: 'Attendance & Leave', description: 'Standard shifts (Day, Night, General) with scheduled start times and end times.', dateColName: 'None' },
  { id: 'ShiftAssignments', name: 'Machine Shift Assignments', group: 'Attendance & Leave', description: 'Daily operator and machine station assignments, shifts, and supervisor signatures.', dateColName: 'Date' },
  { id: 'ShiftHistory', name: 'Shift Rotation History', group: 'Attendance & Leave', description: 'Employee shift transfer and weekly rotation audit history.', dateColName: 'Effective_Date' },

  // 3. Production & Machinery
  { id: 'MachineCapacity', name: 'Machine Capacity & Specs', group: 'Production & Machinery', description: 'Machine specifications, standard unit outputs, speeds, utilization %, and manpower requirements.', dateColName: 'Onboard Date' },
  { id: 'BreakdownLog', name: 'Breakdown & Maintenance Log', group: 'Production & Machinery', description: 'Machine breakdown tickets, downtime hours, technician response time, spare parts, and repair cost.', dateColName: 'Date' },
  { id: 'BreakdownAuditLog', name: 'Breakdown Audit Trail', group: 'Production & Machinery', description: 'Lifecycle audit logs for machine stoppage reports, attendance timestamps, and repair closure.', dateColName: 'Date' },
  { id: 'BreakdownSettings', name: 'Breakdown Settings & Spare Parts', group: 'Production & Machinery', description: 'Failure modes, maintenance categories, spare parts pricing, and units of measure.', dateColName: 'None' },
  { id: 'Tasks', name: 'Factory Task Tracker', group: 'Production & Machinery', description: 'Operational factory tasks, assignees, recurring frequencies, priorities, and completion progress.', dateColName: 'Start_Date' },

  // 4. Quality & 5S
  { id: 'BestPractices', name: 'Best Practices & Kaizen', group: 'Quality & 5S', description: 'Continuous improvement Kaizen suggestions, employee contributions, and verified cost savings in USD.', dateColName: 'Date' },
  { id: 'FiveS_Assessments', name: '5S Audit Assessments', group: 'Quality & 5S', description: 'Detailed 5S audit scores (Sort, Set In Order, Shine, Standardize, Sustain, Visual Management).', dateColName: 'Month' },
  { id: 'FiveS_CorrectiveActions', name: '5S Corrective Actions Log', group: 'Quality & 5S', description: 'Corrective action requests, root causes, assigned owners, target dates, and closure proof.', dateColName: 'Target_Date' },
  { id: 'FiveS_Winners', name: '5S Top Performers & Winners', group: 'Quality & 5S', description: 'Monthly 5S champion rankings, gold/silver/bronze winners, scores, and declared awards.', dateColName: 'Month' },
  { id: 'FiveS_AuditLog', name: '5S System Audit Trail', group: 'Quality & 5S', description: 'Audit history of 5S assessment approvals, score adjustments, and status changes.', dateColName: 'Date' },

  // 5. Performance & Reviews
  { id: 'PerformanceReviews', name: 'Performance Reviews & Appraisals', group: 'Performance & Reviews', description: 'Formal employee reviews, appraisal cycles, review dates, ratings, scores, and evaluation sync.', dateColName: 'Begin_On' },
  { id: 'Performance_Evaluations', name: 'Performance Evaluations & KPI Scorecards', group: 'Performance & Reviews', description: 'Comprehensive KPI evaluation scorecards with 1.0–5.0 Average Ratings, dimension scores, and grades.', dateColName: 'Evaluation_Date' },
  { id: 'PerformanceReviewTypes', name: 'Performance Review Types & Cycles', group: 'Performance & Reviews', description: 'Configured appraisal cycles (Annual, Probation, Mid-Year, Quarterly, Promotion, 5S & Kaizen).', dateColName: 'None' },
  { id: 'KPI', name: 'KPI Monthly Performance', group: 'Performance & Reviews', description: 'Monthly KPI targets vs actual achievement percentages and star ratings.', dateColName: 'Month' },
  { id: 'KpiPrivacy', name: 'KPI Privacy Settings', group: 'Performance & Reviews', description: 'Confidentiality and visibility exclusions for specific employee KPI records.', dateColName: 'Hidden_At' },

  // 6. Developer & Inquiries
  { id: 'ContactMessages', name: 'Contact Inquiries & Hire Requests', group: 'Developer & Inquiries', description: 'Submitted contact messages, developer inquiries, client project details, and status.', dateColName: 'Timestamp' },
  { id: 'PortfolioItems', name: 'Developer Portfolio Projects', group: 'Developer & Inquiries', description: 'Portfolio showcase projects, tech stacks, completion dates, and project links.', dateColName: 'Completion_Date' }
];

export default function Reports({ spreadsheetId }: { spreadsheetId: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('PerformanceReviews');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [enableMonthFilter, setEnableMonthFilter] = useState<boolean>(false);
  
  // Live Preview State
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Filtered sheets catalog
  const filteredCatalog = useMemo(() => {
    return SHEETS_CATALOG.filter(s => {
      if (selectedGroup !== 'All' && s.group !== selectedGroup) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedGroup, searchQuery]);

  const selectedSheetObj = useMemo(() => {
    return SHEETS_CATALOG.find(s => s.id === selectedSheet) || {
      id: selectedSheet,
      name: selectedSheet,
      group: 'Employee & Org' as const,
      description: 'System database module dataset.',
      dateColName: 'Date'
    };
  }, [selectedSheet]);

  // Load preview data whenever selected sheet or month filter changes
  useEffect(() => {
    let isCancelled = false;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        let data: any[][] = [];
        if (selectedSheet === 'Overtime' && enableMonthFilter && selectedMonth) {
          data = await generateOvertimeReport(selectedMonth);
        } else if (selectedSheet === 'Overtime_Raw') {
          const raw = await getRange(spreadsheetId, 'Overtime');
          data = (enableMonthFilter && selectedMonth) ? filterDataByMonth(raw, 'Overtime', selectedMonth) : raw;
        } else if (selectedSheet === 'MachineCapacity') {
          data = await generateMachineCapacityReport();
        } else if (selectedSheet === 'PerformanceReviews') {
          data = await generatePerformanceReviewsReport(enableMonthFilter ? selectedMonth : undefined);
        } else if (selectedSheet === 'Performance_Evaluations') {
          data = await generatePerformanceEvaluationsReport(enableMonthFilter ? selectedMonth : undefined);
        } else {
          const raw = await getRange(spreadsheetId, selectedSheet);
          if (raw && raw.length > 0) {
            data = (enableMonthFilter && selectedMonth) ? filterDataByMonth(raw, selectedSheet, selectedMonth) : raw;
          }
        }

        if (!isCancelled) {
          setPreviewData(data || []);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('Preview load warning:', err);
          setPreviewError(err?.message || 'Unable to fetch preview data');
          setPreviewData([]);
        }
      } finally {
        if (!isCancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [selectedSheet, selectedMonth, enableMonthFilter, spreadsheetId]);

  // Generate cleaned machine capacity report
  const generateMachineCapacityReport = async () => {
    let raw = await getRange(spreadsheetId, 'MachineCapacity');
    if (!raw || raw.length === 0) return [];
    return raw.map(row => {
      if (row.length >= 15) {
        const newRow = [...row];
        while (newRow.length < 17) newRow.push('');
        newRow.splice(14, 1);
        newRow.splice(2, 1);
        return newRow;
      }
      return row;
    });
  };

  // Generate enriched performance reviews report (synced with evaluations)
  const generatePerformanceReviewsReport = async (monthFilter?: string) => {
    const [reviews, rawEvals] = await Promise.all([
      getPerformanceReviews(spreadsheetId).catch(() => []),
      getRange(spreadsheetId, 'Performance_Evaluations!A:AF').catch(() => [])
    ]);

    let parsedEvals: PerformanceEvaluationRecord[] = [];
    if (rawEvals && rawEvals.length > 1) {
      parsedEvals = rawEvals.slice(1).map((row, idx) => {
        const scores = {
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
        const percentage = Number(((totalScore / 50) * 100).toFixed(1));

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
          percentage,
          ratingGrade: (row[25] as any) || 'Meets Expectations',
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

    // Sync reviews with evaluations
    const syncedReviews = syncReviewsWithEvaluations(reviews, parsedEvals);

    let filtered = syncedReviews;
    if (monthFilter) {
      filtered = syncedReviews.filter(r => {
        const b = r.beginOn || '';
        const d = r.dueBy || '';
        const c = r.completionDate || '';
        const cr = r.createdAt || '';
        return b.startsWith(monthFilter) || d.startsWith(monthFilter) || c.startsWith(monthFilter) || cr.startsWith(monthFilter);
      });
    }

    const headers = [
      'SL', 'Review ID', 'Review Type / Cycle', 'Employee ID', 'Employee Name', 
      'Department', 'Designation', 'Reviewer Name', 'Begin Date', 'Due Date', 
      'Workflow Status', 'Completion Date', 'Performance Score (0-100)', 
      'Evaluation Avg Rating (1.0 - 5.0)', 'Evaluation Grade', 'Remarks / Feedback', 'Created At'
    ];

    const rows: any[][] = [headers];
    filtered.forEach((r, idx) => {
      rows.push([
        idx + 1,
        r.reviewId,
        r.reviewType,
        r.employeeId,
        r.employeeName,
        r.department,
        r.designation,
        r.reviewerName,
        r.beginOn || '—',
        r.dueBy || '—',
        r.calculatedStatus || r.rawStatus,
        r.completionDate || '—',
        r.score !== undefined ? `${r.score}%` : '—',
        r.evaluationAverageRating !== undefined ? r.evaluationAverageRating.toFixed(1) : (r.rating !== undefined ? r.rating.toFixed(1) : '—'),
        r.evaluationGrade || '—',
        r.remarks || '—',
        r.createdAt ? r.createdAt.substring(0, 10) : '—'
      ]);
    });

    return rows;
  };

  // Generate formatted performance evaluations report
  const generatePerformanceEvaluationsReport = async (monthFilter?: string) => {
    const raw = await getRange(spreadsheetId, 'Performance_Evaluations!A:AF');
    if (!raw || raw.length <= 1) return raw || [];

    let rows = raw.slice(1);
    if (monthFilter) {
      rows = rows.filter(r => {
        const evalDate = r[11] || r[1] || '';
        const periodKey = r[9] || r[8] || '';
        const createdAt = r[30] || '';
        return evalDate.startsWith(monthFilter) || periodKey.startsWith(monthFilter) || createdAt.startsWith(monthFilter);
      });
    }

    const headers = [
      'SL', 'Evaluation ID', 'Employee ID', 'Employee Name', 'Department', 'Designation',
      'Date Joined', 'Year of Service', 'Evaluation Type', 'Period / Month', 'Evaluation Date',
      'Evaluated By', 'Job Knowledge (5)', 'Quantity Output (5)', 'Quality Work (5)', 'Attendance (5)',
      'Initiative (5)', 'Dependability (5)', 'Attitude (5)', 'Creativity (5)', 'Communication (5)',
      'Teamwork (5)', 'Total Score (50)', 'Average Rating (1.0 - 5.0)', 'Performance Grade',
      'Strengths', 'Areas of Improvement', 'Recommendation', 'Comments', 'Created At'
    ];

    const formattedRows: any[][] = [headers];
    rows.forEach((r, idx) => {
      formattedRows.push([
        idx + 1,
        r[0] || `EVAL-${idx + 1}`,
        r[1] || '—',
        r[2] || '—',
        r[4] || '—',
        r[3] || '—',
        r[5] || '—',
        r[6] || '—',
        r[7] || '—',
        r[8] || r[9] || '—',
        r[11] || '—',
        r[12] || '—',
        r[13] || '0',
        r[14] || '0',
        r[15] || '0',
        r[16] || '0',
        r[17] || '0',
        r[18] || '0',
        r[19] || '0',
        r[20] || '0',
        r[21] || '0',
        r[22] || '0',
        r[23] || '0',
        r[24] ? parseFloat(r[24]).toFixed(1) : '0.0',
        r[25] || 'Meets Expectations',
        r[26] || '—',
        r[27] || '—',
        r[28] || '—',
        r[29] || '—',
        r[30] ? r[30].substring(0, 10) : '—'
      ]);
    });

    return formattedRows;
  };

  // Generate overtime crosstab report
  const generateOvertimeReport = async (month: string) => {
    const [otRaw, empRaw] = await Promise.all([
      getRange(spreadsheetId, 'Overtime'),
      getRange(spreadsheetId, 'Employees'),
    ]);
    const otData = otRaw.length > 1 ? otRaw.slice(1) : [];
    const empData = empRaw.length > 1 ? empRaw.slice(1) : [];

    const headers = ['SL', 'ID No', 'Employee Name', 'Designation', 'Department'];
    for (let i = 1; i <= 31; i++) {
      headers.push(`Day ${i}`);
    }
    headers.push('Total OT Hours', 'OT Rate (Hourly)', 'Payable Amount (USD)');

    const rows: any[][] = [headers];
    let sl = 1;

    empData.forEach(emp => {
      const id = emp[0];
      if (!id) return;

      const row: any[] = [
        sl++,
        id,
        emp[1] || '',
        emp[2] || '',
        emp[3] || '',
      ];

      for (let i = 1; i <= 31; i++) row.push('');

      const empOt = otData.filter(ot => ot[2] === id && ot[1] && ot[1].startsWith(month));

      empOt.forEach(ot => {
        const parts = (ot[1] || '').split('-');
        if (parts.length === 3) {
          const d = parseInt(parts[2], 10);
          if (d >= 1 && d <= 31) {
            const currentVal = row[d + 4];
            const addVal = parseFloat(ot[6] || '0');
            if (addVal > 0) {
              row[d + 4] = currentVal ? (parseFloat(currentVal as string) + addVal).toString() : addVal.toString();
            }
          }
        }
      });

      let totalHours = 0;
      for (let i = 1; i <= 31; i++) {
        const val = parseFloat(row[i + 4] || '0');
        if (!isNaN(val) && val > 0) totalHours += val;
      }
      
      if (totalHours > 0) {
        const otRate = parseFloat(emp[8] || '0') || 0;
        const payableAmount = totalHours * otRate;
        row.push(totalHours.toFixed(1), otRate.toFixed(2), payableAmount.toFixed(2));
        rows.push(row);
      }
    });

    return rows;
  };

  // Generic date filter across all modules
  const filterDataByMonth = (rawData: string[][], sheetName: string, month: string) => {
    if (!rawData || rawData.length <= 1 || !month) return rawData;
    const header = rawData[0];
    let dateColIdx = -1;
    
    if (sheetName === 'Leave') dateColIdx = 5; // From_Date
    else if (sheetName === 'SettlementAuditLog') dateColIdx = 2; // Date
    else if (sheetName === 'LeaveBalanceTransactions') dateColIdx = 1; // Date or LeaveAddedDate
    else if (sheetName === 'Holidays') dateColIdx = 2; // Holiday_Date
    else if (sheetName === 'HolidayOverrides') dateColIdx = 1; // Holiday_Date
    else if (sheetName === 'HolidayAudit') dateColIdx = 7; // Changed_At
    else if (sheetName === 'CalendarSettings') dateColIdx = 3; // Updated_At
    else if (sheetName === 'BestPractices') dateColIdx = 1; // Date
    else if (sheetName === 'Overtime' || sheetName === 'Overtime_Raw') dateColIdx = 1; // Date
    else if (sheetName === 'KPI') dateColIdx = 4; // Month
    else if (sheetName === 'KpiPrivacy') dateColIdx = 2; // Hidden_At
    else if (sheetName === 'ShiftAssignments') dateColIdx = 1; // Date
    else if (sheetName === 'ShiftHistory') dateColIdx = 5; // Effective_Date
    else if (sheetName === 'Tasks') dateColIdx = 9; // Start_Date
    else if (sheetName === 'BreakdownLog') dateColIdx = 1; // Date
    else if (sheetName === 'BreakdownAuditLog') dateColIdx = 3; // Date
    else if (sheetName === 'FiveS_Assessments') dateColIdx = 2; // Month
    else if (sheetName === 'FiveS_CorrectiveActions') dateColIdx = 11; // Target_Date
    else if (sheetName === 'FiveS_Winners') dateColIdx = 1; // Month
    else if (sheetName === 'FiveS_AuditLog') dateColIdx = 2; // Date
    else if (sheetName === 'PerformanceReviews') dateColIdx = 8; // Begin_On
    else if (sheetName === 'Performance_Evaluations') dateColIdx = 1; // Evaluation_Date
    else if (sheetName === 'ContactMessages') dateColIdx = 8; // Timestamp
    else if (sheetName === 'PortfolioItems') dateColIdx = 5; // CompletionDate
    else if (sheetName === 'Employees') dateColIdx = 4; // Date_of_Join

    if (dateColIdx === -1) return rawData;

    return [
      header,
      ...rawData.slice(1).filter(row => {
        const d = row[dateColIdx];
        return d && d.startsWith(month);
      })
    ];
  };

  // Export single selected module
  const handleExport = async (formatType: 'xlsx' | 'csv' = 'xlsx') => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      let dataToExport: any[][] = [];

      if (selectedSheet === 'Overtime' && enableMonthFilter && selectedMonth) {
        dataToExport = await generateOvertimeReport(selectedMonth);
      } else if (selectedSheet === 'Overtime_Raw') {
        const rawData = await getRange(spreadsheetId, 'Overtime');
        dataToExport = (enableMonthFilter && selectedMonth) ? filterDataByMonth(rawData, 'Overtime', selectedMonth) : rawData;
      } else if (selectedSheet === 'MachineCapacity') {
        dataToExport = await generateMachineCapacityReport();
      } else if (selectedSheet === 'PerformanceReviews') {
        dataToExport = await generatePerformanceReviewsReport(enableMonthFilter ? selectedMonth : undefined);
      } else if (selectedSheet === 'Performance_Evaluations') {
        dataToExport = await generatePerformanceEvaluationsReport(enableMonthFilter ? selectedMonth : undefined);
      } else {
        const rawData = await getRange(spreadsheetId, selectedSheet);
        
        if (!rawData || rawData.length === 0) {
          alert('No data found in this sheet.');
          return;
        }

        if (enableMonthFilter && selectedMonth) {
          dataToExport = filterDataByMonth(rawData, selectedSheet, selectedMonth);
        } else {
          dataToExport = rawData;
        }
      }

      if (!dataToExport || dataToExport.length === 0 || (dataToExport.length <= 1 && selectedSheet !== 'Overtime')) {
        alert('No records found for the selected module and filter criteria.');
        return;
      }

      const xlsx = getXlsx();
      const ws = xlsx.utils.aoa_to_sheet(dataToExport);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, selectedSheet.substring(0, 31));
      
      const fileExt = formatType === 'csv' ? 'csv' : 'xlsx';
      const fileName = enableMonthFilter && selectedMonth 
        ? `${selectedSheet}_Export_${selectedMonth}.${fileExt}`
        : `${selectedSheet}_Export_${new Date().toISOString().split('T')[0]}.${fileExt}`;

      if (formatType === 'csv') {
        const csvContent = xlsx.utils.sheet_to_csv(ws);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        xlsx.writeFile(wb, fileName);
      }

      setExportSuccessMsg(`Successfully exported ${dataToExport.length - 1} records from ${selectedSheetObj.name}!`);
      setTimeout(() => setExportSuccessMsg(null), 5000);
      
    } catch (err: any) {
      console.error(err);
      alert('Failed to export data: ' + (err.message || String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  // Full Database Multi-Tab Workbook Export
  const handleExportAll = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const xlsx = getXlsx();
      const wb = xlsx.utils.book_new();
      let exportedCount = 0;
      
      const promises = SHEETS_CATALOG.map(async (sheetObj) => {
        const sheet = sheetObj.id;
        try {
          let data: any[][] = [];
          if (sheet === 'Overtime' && enableMonthFilter && selectedMonth) {
            data = await generateOvertimeReport(selectedMonth);
          } else if (sheet === 'Overtime_Raw') {
            const raw = await getRange(spreadsheetId, 'Overtime');
            if (raw && raw.length > 0) {
              data = (enableMonthFilter && selectedMonth) ? filterDataByMonth(raw, 'Overtime', selectedMonth) : raw;
            }
          } else if (sheet === 'MachineCapacity') {
            data = await generateMachineCapacityReport();
          } else if (sheet === 'PerformanceReviews') {
            data = await generatePerformanceReviewsReport(enableMonthFilter ? selectedMonth : undefined);
          } else if (sheet === 'Performance_Evaluations') {
            data = await generatePerformanceEvaluationsReport(enableMonthFilter ? selectedMonth : undefined);
          } else {
            const raw = await getRange(spreadsheetId, sheet);
            if (raw && raw.length > 0) {
              data = (enableMonthFilter && selectedMonth) ? filterDataByMonth(raw, sheet, selectedMonth) : raw;
            }
          }

          if (data && data.length > 0) {
            const ws = xlsx.utils.aoa_to_sheet(data);
            const cleanSheetName = sheet.substring(0, 31);
            if (!wb.SheetNames.includes(cleanSheetName)) {
              xlsx.utils.book_append_sheet(wb, ws, cleanSheetName);
              exportedCount++;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch sheet ${sheet}`, e);
        }
      });

      await Promise.all(promises);
      
      if (wb.SheetNames.length === 0) {
        alert('No data found to export.');
        return;
      }

      const fileName = enableMonthFilter && selectedMonth 
        ? `ERP_Full_Database_Export_${selectedMonth}.xlsx`
        : `ERP_Full_Database_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      xlsx.writeFile(wb, fileName);
      setExportSuccessMsg(`Successfully bundled and exported all ${exportedCount} system modules into ${fileName}!`);
      setTimeout(() => setExportSuccessMsg(null), 6000);
      
    } catch (err: any) {
      console.error(err);
      alert('Failed to export full database: ' + (err.message || String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const groups = ['All', 'Employee & Org', 'Attendance & Leave', 'Production & Machinery', 'Quality & 5S', 'Performance & Reviews', 'Developer & Inquiries'];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E6E9ED] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#337AB7]">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reports & Data Exports</h1>
                <p className="text-sm text-gray-500 mt-0.5">Export specific module datasets, crosstabs, and appraisals or download the entire ERP database.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database className="w-3.5 h-3.5 mr-1" />
              {SHEETS_CATALOG.length} Available Modules
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {exportSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-800 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{exportSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Primary Section: Export Specific Module Data */}
      <div className="bg-white border border-[#E6E9ED] rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E6E9ED] bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-2 text-[#337AB7]" />
                Export Specific Module Data
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Select any operational module or sub-module report to inspect and download its clean dataset into Excel (.xlsx) or CSV format.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-[#337AB7] border border-blue-100">
                {selectedSheetObj.group}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Module Selector */}
        <div className="p-6 bg-slate-50/70 border-b border-gray-200 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-thin">
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGroup === g 
                    ? 'bg-[#337AB7] text-white shadow-sm' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Module Picker */}
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Module / Sub-Module
              </label>
              <div className="relative">
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  {groups.filter(g => g !== 'All').map(grp => (
                    <optgroup key={grp} label={`── ${grp} ──`}>
                      {SHEETS_CATALOG.filter(s => s.group === grp).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {selectedSheetObj.description}
              </p>
            </div>

            {/* Month Filter */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Filter by Month
                </label>
                <label className="inline-flex items-center text-xs font-medium text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableMonthFilter}
                    onChange={(e) => setEnableMonthFilter(e.target.checked)}
                    className="mr-1.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  Active
                </label>
              </div>
              <div className="relative">
                <input
                  type="month"
                  disabled={!enableMonthFilter}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
                />
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">
                {enableMonthFilter ? `Filtering records for ${selectedMonth}` : 'Exporting full historical records'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-3 flex flex-col justify-end space-y-2">
              <button
                onClick={() => handleExport('xlsx')}
                disabled={isExporting || previewLoading}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-[#337AB7] hover:bg-[#286090] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Export to Excel (.xlsx)
              </button>

              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting || previewLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                Export as CSV (.csv)
              </button>
            </div>
          </div>
        </div>

        {/* Live Data Preview Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Live Data Preview ({previewData.length > 1 ? previewData.length - 1 : previewData.length} records)
              </h3>
            </div>

            {previewLoading && (
              <span className="inline-flex items-center text-xs text-blue-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Loading preview...
              </span>
            )}
          </div>

          {previewError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {!previewLoading && !previewError && previewData.length === 0 && (
            <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-500">No records found for this module with the current filters.</p>
            </div>
          )}

          {!previewLoading && previewData.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    {previewData[0]?.map((col, idx) => (
                      <th key={idx} className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">
                        {col || `Col ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {previewData.slice(1, 15).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-blue-50/50 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-gray-600 whitespace-nowrap truncate max-w-xs">
                          {cell !== undefined && cell !== null && cell !== '' ? String(cell) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {previewData.length > 15 && (
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-center text-xs text-gray-500 font-medium">
                  Showing first 14 sample records. Total {previewData.length - 1} records will be included in the downloaded file.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Section: Full Database Export */}
      <div className="bg-white border border-[#E6E9ED] rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E6E9ED] bg-gradient-to-r from-emerald-50/40 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Full Database Backup & Multi-Tab Export</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Export all {SHEETS_CATALOG.length} ERP modules and sub-modules into a single comprehensive multi-tab Excel (.xlsx) workbook.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Included Modules & Data Tabs ({SHEETS_CATALOG.length} Sheets):
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {SHEETS_CATALOG.map(s => (
                <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white text-gray-700 border border-gray-200 shadow-2xs">
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={handleExportAll}
              disabled={isExporting}
              className="w-full md:w-auto flex items-center justify-center px-6 py-3.5 bg-[#26B99A] hover:bg-[#169F85] text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
              Export Entire Database (.xlsx)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
