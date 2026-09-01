import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from './sheets';
import { format, parseISO, isBefore, isAfter, isValid } from 'date-fns';
import { PerformanceEvaluationRecord } from '../components/kpi/types';

export type ReviewStatus = 'Scheduled' | 'Not Started' | 'In Progress' | 'Submitted' | 'Completed' | 'Overdue' | 'Cancelled';

export interface PerformanceReviewType {
  id: string;
  name: string;
  cycle: 'Annual' | 'Quarterly' | 'Probation' | 'Special';
  description: string;
  status: 'Active' | 'Inactive';
}

export const DEFAULT_REVIEW_TYPES: PerformanceReviewType[] = [
  { id: 'PRT-01', name: 'Annual Performance Review', cycle: 'Annual', description: 'Comprehensive annual staff appraisal and goal evaluation', status: 'Active' },
  { id: 'PRT-02', name: 'Probation Review', cycle: 'Probation', description: '3-6 month probation confirmation assessment', status: 'Active' },
  { id: 'PRT-03', name: 'Mid-Year Review', cycle: 'Quarterly', description: 'H1 progress and milestone check-in', status: 'Active' },
  { id: 'PRT-04', name: 'Quarterly Review', cycle: 'Quarterly', description: 'Quarterly KPI scorecard and operational evaluation', status: 'Active' },
  { id: 'PRT-05', name: 'Promotion Review', cycle: 'Special', description: 'Assessment for promotion, grade step, or band escalation', status: 'Active' },
  { id: 'PRT-06', name: 'Confirmation Review', cycle: 'Probation', description: 'Permanent employment confirmation review', status: 'Active' },
  { id: 'PRT-07', name: '5S & Kaizen Review', cycle: 'Quarterly', description: 'Housekeeping and continuous improvement evaluation', status: 'Active' }
];

export interface PerformanceReviewItem {
  reviewId: string;
  reviewType: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  reviewerId: string;
  reviewerName: string;
  beginOn: string;
  dueBy: string;
  rawStatus: ReviewStatus;
  calculatedStatus: ReviewStatus;
  completionDate?: string;
  score?: number; // 0 - 100
  rating?: number; // 1 - 5 stars
  remarks?: string;
  evaluationId?: string;
  evaluationGrade?: string;
  evaluationAverageRating?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Matches a Performance Review to its corresponding Performance Evaluation record (Source of Truth)
 */
export function matchEvaluationToReview(
  review: PerformanceReviewItem,
  evaluations: PerformanceEvaluationRecord[]
): PerformanceEvaluationRecord | undefined {
  if (!evaluations || evaluations.length === 0 || !review) return undefined;

  const normalizeStr = (val?: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const revId = normalizeStr(review.employeeId);
  const revName = normalizeStr(review.employeeName);

  // 1. Filter evaluations matching this employee by ID or Name
  const empEvals = evaluations.filter(e => {
    const evalId = normalizeStr(e.employeeId);
    const evalName = normalizeStr(e.employeeName);

    if (revId && evalId) {
      if (revId === evalId || revId.endsWith(evalId) || evalId.endsWith(revId)) return true;
      const numRev = revId.replace(/[^0-9]/g, '');
      const numEval = evalId.replace(/[^0-9]/g, '');
      if (numRev && numEval && numRev === numEval) return true;
    }
    if (revName && evalName) {
      if (revName === evalName || revName.includes(evalName) || evalName.includes(revName)) return true;
    }
    return false;
  });

  if (empEvals.length === 0) return undefined;

  // 2. If review has an explicit evaluationId, match directly
  if (review.evaluationId) {
    const directMatch = empEvals.find(e => e.id === review.evaluationId);
    if (directMatch) return directMatch;
  }

  const reviewTypeLower = (review.reviewType || '').toLowerCase();
  const reviewDueYear = review.dueBy ? parseInt(review.dueBy.substring(0, 4), 10) : new Date().getFullYear();

  // 3. Try matching by exact cycle/type and year
  if (reviewTypeLower.includes('annual') || reviewTypeLower.includes('yearly')) {
    const annualEval = empEvals.find(e => 
      (e.evaluationType === 'Yearly' || (e.evaluationType as string) === 'Annual' || e.periodKey?.toLowerCase().includes('annual') || e.periodKey?.toLowerCase().includes('year') || e.period?.toLowerCase().includes('annual') || e.period?.toLowerCase().includes('yearly')) &&
      (!e.year || e.year === reviewDueYear)
    );
    if (annualEval) return annualEval;
  }

  if (reviewTypeLower.includes('mid-year') || reviewTypeLower.includes('half')) {
    const halfEval = empEvals.find(e => 
      (e.evaluationType === 'Half Yearly' || e.periodKey?.toLowerCase().includes('h1') || e.periodKey?.toLowerCase().includes('h2') || e.period?.toLowerCase().includes('half') || e.period?.toLowerCase().includes('h1') || e.period?.toLowerCase().includes('h2')) &&
      (!e.year || e.year === reviewDueYear)
    );
    if (halfEval) return halfEval;
  }

  if (reviewTypeLower.includes('quarterly') || reviewTypeLower.includes('q1') || reviewTypeLower.includes('q2') || reviewTypeLower.includes('q3') || reviewTypeLower.includes('q4')) {
    const qEval = empEvals.find(e => 
      (e.evaluationType === 'Quarterly' || e.periodKey?.toLowerCase().includes('q') || e.period?.toLowerCase().includes('q')) &&
      (!e.year || e.year === reviewDueYear)
    );
    if (qEval) return qEval;
  }

  // 4. Fallback to latest evaluation by evaluationDate or createdAt
  const sorted = [...empEvals].sort((a, b) => {
    const dateA = a.evaluationDate || a.createdAt || '';
    const dateB = b.evaluationDate || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  return sorted[0];
}

/**
 * Synchronizes Performance Review items with their corresponding Performance Evaluation records.
 * The Performance Evaluation is the SINGLE SOURCE OF TRUTH for ratings, scores, and appraisal remarks.
 */
export function syncReviewsWithEvaluations(
  reviews: PerformanceReviewItem[],
  evaluations: PerformanceEvaluationRecord[]
): PerformanceReviewItem[] {
  const now = new Date();

  return reviews.map(review => {
    const matchedEval = matchEvaluationToReview(review, evaluations);

    if (matchedEval) {
      // Direct synchronization from Performance Evaluation
      const evalPercentage = typeof matchedEval.percentage === 'number' 
        ? Math.round(matchedEval.percentage)
        : Math.round((matchedEval.totalScore / (matchedEval.totalPossible || 50)) * 100);
      
      const evalStarRating = typeof matchedEval.averageRating === 'number'
        ? Number(matchedEval.averageRating.toFixed(2))
        : Number((matchedEval.totalScore / 10).toFixed(2));

      const isCompleted = (matchedEval as any).status === 'Submitted' || (matchedEval as any).status === 'Completed' || (matchedEval as any).status === 'Approved' || Boolean(matchedEval.totalScore > 0);

      const effectiveRawStatus: ReviewStatus = review.rawStatus === 'Completed' || isCompleted ? 'Completed' : review.rawStatus;
      const effectiveCompletionDate = review.completionDate || matchedEval.evaluationDate || format(now, 'yyyy-MM-dd');

      const dynamicStatus = calculateDynamicReviewStatus(
        effectiveRawStatus,
        review.beginOn,
        review.dueBy,
        effectiveCompletionDate,
        now
      );

      return {
        ...review,
        score: evalPercentage,
        rating: evalStarRating,
        evaluationId: matchedEval.id,
        evaluationGrade: matchedEval.ratingGrade,
        evaluationAverageRating: matchedEval.averageRating,
        remarks: review.remarks || matchedEval.comments || matchedEval.strengths || matchedEval.recommendation,
        rawStatus: effectiveRawStatus,
        calculatedStatus: dynamicStatus,
        completionDate: effectiveCompletionDate
      };
    }

    // Keep existing scores or compute dynamic status
    const effectiveRating = review.rating !== undefined && review.rating !== null
      ? review.rating
      : (review.score !== undefined && review.score !== null ? Number((review.score / 20).toFixed(1)) : undefined);
    
    const effectiveScore = review.score !== undefined && review.score !== null
      ? review.score
      : (review.rating !== undefined && review.rating !== null ? Math.round(review.rating * 20) : undefined);

    const dynamicStatus = calculateDynamicReviewStatus(
      review.rawStatus,
      review.beginOn,
      review.dueBy,
      review.completionDate,
      now
    );

    return {
      ...review,
      score: effectiveScore,
      rating: effectiveRating,
      calculatedStatus: dynamicStatus
    };
  });
}

/**
 * Calculates logical status based on current date and workflow state
 */
export function calculateDynamicReviewStatus(
  rawStatus: ReviewStatus,
  beginOnStr: string,
  dueByStr: string,
  completionDate?: string,
  now: Date = new Date()
): ReviewStatus {
  if (rawStatus === 'Cancelled') return 'Cancelled';
  if (rawStatus === 'Completed' || (completionDate && completionDate.trim())) return 'Completed';
  if (rawStatus === 'Submitted') return 'Submitted';

  const todayStr = format(now, 'yyyy-MM-dd');

  // Check if past deadline
  if (dueByStr && dueByStr.trim() && todayStr > dueByStr.trim()) {
    return 'Overdue';
  }

  // Check if before start date
  if (beginOnStr && beginOnStr.trim() && todayStr < beginOnStr.trim()) {
    return 'Scheduled';
  }

  if (rawStatus === 'In Progress') {
    return 'In Progress';
  }

  // Otherwise it's active but not started yet
  return 'Not Started';
}

// Fetch all review types
export async function getPerformanceReviewTypes(spreadsheetId: string): Promise<PerformanceReviewType[]> {
  try {
    const raw = await getRange(spreadsheetId, 'PerformanceReviewTypes!A2:E');
    if (raw && raw.length > 0) {
      return raw.map((r, idx) => ({
        id: r[0] || `PRT-${idx + 1}`,
        name: r[1] || 'Annual Performance Review',
        cycle: (r[2] as any) || 'Annual',
        description: r[3] || '',
        status: (r[4] === 'Inactive' ? 'Inactive' : 'Active')
      }));
    }
  } catch (err) {
    console.warn('Fallback to default review types:', err);
  }
  return DEFAULT_REVIEW_TYPES;
}

// Fetch all performance reviews
export async function getPerformanceReviews(spreadsheetId: string): Promise<PerformanceReviewItem[]> {
  try {
    const raw = await getRange(spreadsheetId, 'PerformanceReviews!A2:R');
    if (raw && raw.length > 0) {
      const now = new Date();
      return raw.map(r => {
        const reviewId = r[0] || '';
        const reviewType = r[1] || 'Annual Performance Review';
        const employeeId = (r[2] || '').trim();
        const employeeName = r[3] || '';
        const department = r[4] || '';
        const designation = r[5] || '';
        const reviewerId = r[6] || '';
        const reviewerName = r[7] || '';
        const beginOn = r[8] || '';
        const dueBy = r[9] || '';
        const rawStatus = (r[10] as ReviewStatus) || 'Scheduled';
        const completionDate = r[11] || '';
        const score = r[12] ? parseFloat(r[12]) : undefined;
        const rating = r[13] ? parseFloat(r[13]) : undefined;
        const remarks = r[14] || '';
        const createdBy = r[15] || '';
        const createdAt = r[16] || '';
        const updatedAt = r[17] || '';

        const calculatedStatus = calculateDynamicReviewStatus(rawStatus, beginOn, dueBy, completionDate, now);

        return {
          reviewId,
          reviewType,
          employeeId,
          employeeName,
          department,
          designation,
          reviewerId,
          reviewerName,
          beginOn,
          dueBy,
          rawStatus,
          calculatedStatus,
          completionDate,
          score,
          rating,
          remarks,
          createdBy,
          createdAt,
          updatedAt
        };
      }).filter(item => item.reviewId && item.employeeId);
    }
  } catch (err) {
    console.warn('No PerformanceReviews sheet found yet:', err);
  }
  return [];
}

// Add single or bulk performance reviews
export async function createPerformanceReview(
  spreadsheetId: string,
  item: Omit<PerformanceReviewItem, 'reviewId' | 'createdAt' | 'updatedAt' | 'calculatedStatus'>
): Promise<{ success: boolean; reviewId: string }> {
  const reviewId = `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const nowStr = new Date().toISOString();

  const row = [
    reviewId,
    item.reviewType,
    item.employeeId,
    item.employeeName,
    item.department,
    item.designation,
    item.reviewerId,
    item.reviewerName,
    item.beginOn,
    item.dueBy,
    item.rawStatus || 'Scheduled',
    item.completionDate || '',
    item.score !== undefined ? item.score.toString() : '',
    item.rating !== undefined ? item.rating.toString() : '',
    item.remarks || '',
    item.createdBy,
    nowStr,
    nowStr
  ];

  await appendRow(spreadsheetId, 'PerformanceReviews!A:R', [row]);
  return { success: true, reviewId };
}

// Bulk Assign Reviews
export async function bulkAssignPerformanceReviews(
  spreadsheetId: string,
  employees: Array<{ id: string; name: string; department: string; designation: string }>,
  details: {
    reviewType: string;
    reviewerId: string;
    reviewerName: string;
    beginOn: string;
    dueBy: string;
    createdBy: string;
  },
  onProgress?: (percent: number, empName: string) => void
): Promise<{ successCount: number; failedCount: number }> {
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    try {
      if (onProgress) {
        onProgress(Math.round(((i + 1) / employees.length) * 100), emp.name);
      }

      await createPerformanceReview(spreadsheetId, {
        reviewType: details.reviewType,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        designation: emp.designation,
        reviewerId: details.reviewerId,
        reviewerName: details.reviewerName,
        beginOn: details.beginOn,
        dueBy: details.dueBy,
        rawStatus: 'Scheduled',
        createdBy: details.createdBy
      });
      successCount++;
    } catch (err) {
      failedCount++;
    }
  }

  return { successCount, failedCount };
}

// Update an existing performance review
export async function updatePerformanceReview(
  spreadsheetId: string,
  reviewId: string,
  updatedFields: Partial<PerformanceReviewItem>
): Promise<boolean> {
  const reviews = await getPerformanceReviews(spreadsheetId);
  const found = reviews.find(r => r.reviewId === reviewId);
  if (!found) return false;

  const merged = { ...found, ...updatedFields, updatedAt: new Date().toISOString() };

  const updatedRow = [
    merged.reviewId,
    merged.reviewType,
    merged.employeeId,
    merged.employeeName,
    merged.department,
    merged.designation,
    merged.reviewerId,
    merged.reviewerName,
    merged.beginOn,
    merged.dueBy,
    merged.rawStatus,
    merged.completionDate || '',
    merged.score !== undefined ? merged.score.toString() : '',
    merged.rating !== undefined ? merged.rating.toString() : '',
    merged.remarks || '',
    merged.createdBy,
    merged.createdAt,
    merged.updatedAt
  ];

  await updateRowByPrimaryKey(spreadsheetId, 'PerformanceReviews', reviewId, updatedRow);
  return true;
}
