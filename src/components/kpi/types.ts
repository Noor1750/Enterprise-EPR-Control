export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  status: string;
  supervisor?: string;
  profilePicture?: string;
  category?: 'Management' | 'Non-Management' | string;
  dateOfJoin?: string;
  inactiveDate?: string;
  shift?: string;
  manager?: string;
  tShirtSize?: string;
  shoeSize?: string;
  volunteer?: string;
  workingArea?: string;
  phone?: string;
  emergency?: string;
  bloodGroup?: string;
  remarks?: string;
}

export interface KPIRecord {
  kpiId: string; // EmployeeID_Month
  employeeId: string;
  employeeName: string;
  department: string;
  month: string; // e.g. "January 2026"
  date: string; // e.g. "2026-01-31"
  plan: number; // 0 - 100 (%)
  achievement: number; // 0 - 100 (%)
  rating: number; // 1 - 5 numeric
  createdAt?: string;
  updatedAt?: string;
  rowIndex?: number; // Sheet row index for direct update
}

export interface KPIValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ExcelImportRow {
  rowNumber: number;
  rawEmployeeId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  month: string;
  date: string;
  plan: number;
  achievement: number;
  rating: number;
  status: 'matched_new' | 'matched_update' | 'unmatched' | 'invalid';
  validationErrors: string[];
  matchedEmployee?: Employee;
  existingKpi?: KPIRecord;
}

export interface ExcelImportSummary {
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  newCount: number;
  updateCount: number;
  invalidCount: number;
  unmatchedEmployeeIds: string[];
  rows: ExcelImportRow[];
}

export const RATING_DESCRIPTIONS: Record<number, { label: string; color: string; bg: string; text: string }> = {
  1: { label: 'Minimum', color: '#E74C3C', bg: 'bg-red-50', text: 'text-red-600' },
  2: { label: 'Low', color: '#E67E22', bg: 'bg-orange-50', text: 'text-orange-600' },
  3: { label: 'Average', color: '#F39C12', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  4: { label: 'Good', color: '#3498DB', bg: 'bg-blue-50', text: 'text-blue-600' },
  5: { label: 'Excellent', color: '#27AE60', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

export function getRatingInfo(rating: number) {
  if (rating >= 4.5) return RATING_DESCRIPTIONS[5];
  if (rating >= 3.5) return RATING_DESCRIPTIONS[4];
  if (rating >= 2.5) return RATING_DESCRIPTIONS[3];
  if (rating >= 2.0) return RATING_DESCRIPTIONS[2];
  return RATING_DESCRIPTIONS[1];
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function isKpiHiddenForEmployee(employeeId: string, hiddenEmployeeIds: string[] = []): boolean {
  if (!employeeId || !hiddenEmployeeIds || hiddenEmployeeIds.length === 0) return false;
  const target = employeeId.trim().toUpperCase();
  return hiddenEmployeeIds.some(id => id.trim().toUpperCase() === target);
}

export function normalizeMonth(input: any): string {
  if (!input) return '';
  const str = String(input).trim();
  
  // Format YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [year, monthNum] = str.split('-');
    const mIndex = parseInt(monthNum, 10) - 1;
    if (mIndex >= 0 && mIndex < 12) {
      return `${MONTH_NAMES[mIndex]} ${year}`;
    }
  }

  // Format Month Year (e.g. January 2026 or Jan 2026 or Jan-26)
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const full = MONTH_NAMES[i];
    const short = full.substring(0, 3);
    const regex = new RegExp(`(${full}|${short})[\\s\\-_/]*(\\d{2,4})`, 'i');
    const match = str.match(regex);
    if (match) {
      let year = match[2];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${full} ${year}`;
    }
  }

  // If Date object or Excel date serial number
  if (typeof input === 'number') {
    // Excel date serial
    const utc_days = Math.floor(input - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return `${MONTH_NAMES[date_info.getMonth()]} ${date_info.getFullYear()}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  return str;
}

export function normalizeDate(input: any, defaultMonth?: string): string {
  if (!input) {
    if (defaultMonth) {
      // try to derive date from month
      const parts = defaultMonth.split(' ');
      if (parts.length === 2) {
        const mIndex = MONTH_NAMES.indexOf(parts[0]);
        if (mIndex >= 0) {
          const year = parseInt(parts[1], 10);
          const lastDay = new Date(year, mIndex + 1, 0).getDate();
          return `${year}-${String(mIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }
      }
    }
    return new Date().toISOString().substring(0, 10);
  }

  if (typeof input === 'number') {
    // Excel date serial
    const utc_days = Math.floor(input - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().substring(0, 10);
  }

  const str = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().substring(0, 10);
  }

  return new Date().toISOString().substring(0, 10);
}

export function parsePercentage(input: any): number {
  if (input === undefined || input === null || input === '') return 0;
  if (typeof input === 'number') {
    // If it's a decimal like 0.95 from Excel format, convert to 95
    if (input > 0 && input <= 1) {
      return Math.round(input * 100);
    }
    return Math.round(input);
  }
  const str = String(input).replace('%', '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  if (num > 0 && num <= 1 && String(input).indexOf('%') === -1) {
    return Math.round(num * 100);
  }
  return Math.round(num);
}

export function generateMonthList(pastMonths = 18, futureMonths = 6): string[] {
  const result: string[] = [];
  const current = new Date();
  
  // Go back pastMonths
  const start = new Date(current.getFullYear(), current.getMonth() - pastMonths, 1);
  const total = pastMonths + futureMonths + 1;
  
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    result.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
  }
  
  return result.reverse(); // Most recent first
}

// ============================================================================
// PERFORMANCE EVALUATION SYSTEM (Quarterly, Half Yearly, Yearly)
// ============================================================================

export type EvaluationPeriodType = 'Quarterly' | 'Half Yearly' | 'Yearly';

export interface EvaluationScores {
  jobKnowledge: number;              // 1. Job Knowledge (1-5)
  quantityOfOutput: number;          // 2. Quantity of Output vs Target and Goal (1-5)
  qualityOfWork: number;             // 3. Quality of Work vs Target and Goal (1-5)
  attendanceCommitment: number;      // 4. Attendance and Commitment to Work (1-5)
  initiativeImprovement: number;     // 5. Initiative / Continuous Improvement (1-5)
  dependability: number;             // 6. Dependability (1-5)
  attitude: number;                  // 7. Attitude (1-5)
  creativityAnalytical: number;      // 8. Creativity / Analytical Skills (1-5)
  communicationSkills: number;       // 9. Communication Skills (1-5)
  teamworkRelationship: number;      // 10. Interpersonal Relationship / Teamwork (1-5)
}

export type EvaluationRatingGrade = 'Outstanding' | 'Exceeds Expectations' | 'Meets Expectations' | 'Needs Improvement' | 'Unsatisfactory' | 'Pending Assessment';

export interface PerformanceEvaluationRecord {
  id: string; // e.g. EVAL-2026-Q1-EMP001
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  dateJoined: string; // Date Joined
  yearOfService: string; // e.g. "3.5 Years" or "3 Years 2 Months"
  evaluationType: EvaluationPeriodType; // Quarterly | Half Yearly | Yearly
  period: string; // e.g. "Q1 2026", "H1 2026", "Year 2026"
  periodKey: string; // e.g. "2026-Q1", "2026-H1", "2026-FY"
  year: number;
  quarterOrHalf?: string; // Q1, Q2, Q3, Q4, H1, H2, Full Year
  evaluationDate: string; // YYYY-MM-DD
  evaluatedBy: string; // Evaluator / Manager Name
  scores: EvaluationScores;
  totalScore: number; // Sum of 10 points (max 50)
  totalPossible: number; // 50
  averageRating: number; // Total / 10 (1.00 - 5.00)
  percentage: number; // (Total / 50) * 100
  ratingGrade: EvaluationRatingGrade;
  strengths?: string;
  areasOfImprovement?: string;
  recommendation?: string;
  comments?: string;
  status?: 'Draft' | 'Submitted' | 'Approved';
  createdAt: string;
  updatedAt: string;
  rowIndex?: number;
}

export interface EvaluationCriterion {
  key: keyof EvaluationScores;
  id: number;
  title: string;
  shortLabel: string;
  description: string;
  weight: number; // max 5
  rubric: {
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
}

export const EVALUATION_CRITERIA_LIST: EvaluationCriterion[] = [
  {
    key: 'jobKnowledge',
    id: 1,
    title: 'Job Knowledge',
    shortLabel: 'Job Knowledge',
    description: 'Technical competence, understanding of machine operations, SOPs, products, safety, and procedures.',
    weight: 5,
    rubric: {
      1: 'Poor / Lacks basic operating knowledge and needs continuous direction',
      2: 'Below Average / Basic grasp but frequently requires guidance',
      3: 'Competent / Fully understands routine duties and standard procedures',
      4: 'Proficient / Comprehensive understanding, handles complex operations smoothly',
      5: 'Expert / Master of processes, provides training and solves technical bottlenecks'
    }
  },
  {
    key: 'quantityOfOutput',
    id: 2,
    title: 'Quantity of Output vs Target and Goal',
    shortLabel: 'Output vs Target',
    description: 'Volume of work achieved, productivity rate, meeting machine targets, and adherence to timelines.',
    weight: 5,
    rubric: {
      1: 'Unsatisfactory / Consistently fails to meet minimum daily/shift output targets',
      2: 'Needs Improvement / Output often below expected targets (< 80%)',
      3: 'Meets Standards / Consistently meets agreed production targets (80% - 99%)',
      4: 'Exceeds Standards / Regularly surpasses output targets (100% - 115%)',
      5: 'Exceptional / Outstanding output speed, consistently achieves > 115% of targets'
    }
  },
  {
    key: 'qualityOfWork',
    id: 3,
    title: 'Quality of Work vs Target and Goal',
    shortLabel: 'Quality vs Target',
    description: 'Accuracy, precision, neatness, minimal defects/rejections, and strict standard compliance.',
    weight: 5,
    rubric: {
      1: 'Critical Quality Issues / High rejection rate, frequent rework and careless errors',
      2: 'Below Standard / Periodic quality defects requiring supervisor intervention',
      3: 'Standard Quality / Meets quality benchmarks with acceptable defect tolerance',
      4: 'High Quality / Minimal errors, proactive quality checks, low scrap rate',
      5: 'Zero-Defect Benchmark / Flawless precision, sets quality standard for team'
    }
  },
  {
    key: 'attendanceCommitment',
    id: 4,
    title: 'Attendance and Commitment to Work',
    shortLabel: 'Attendance & Commitment',
    description: 'Punctuality, shift regularity, low absenteeism, reliability, and readiness to support when needed.',
    weight: 5,
    rubric: {
      1: 'Unreliable / Frequent unapproved absenteeism and chronic tardiness',
      2: 'Poor Attendance / Occasional unexcused leaves, inconsistent punctuality',
      3: 'Good Attendance / Regular, punctual, follows leave application policies',
      4: 'Very Dependable / Near-perfect attendance, always on time for shifts',
      5: 'Exemplary / 100% attendance record, always willing to assist in urgent shifts'
    }
  },
  {
    key: 'initiativeImprovement',
    id: 5,
    title: 'Initiative / Continuous Improvement',
    shortLabel: 'Initiative / Kaizen',
    description: 'Proactiveness, 5S participation, submitting Kaizen ideas, self-starter, learning new skills.',
    weight: 5,
    rubric: {
      1: 'Passive / Waits to be told what to do, resists process improvements',
      2: 'Hesitant / Rarely proposes improvements or takes proactive actions',
      3: 'Active / Actively participates in 5S audits, suggests standard improvements',
      4: 'Proactive / Regularly identifies bottlenecks and implements solutions',
      5: 'Champion / Innovator, drives continuous improvement initiatives across floor'
    }
  },
  {
    key: 'dependability',
    id: 6,
    title: 'Dependability',
    shortLabel: 'Dependability',
    description: 'Follow-through on assigned tasks, trustworthiness, working with minimal supervision.',
    weight: 5,
    rubric: {
      1: 'Undependable / Cannot be trusted to complete tasks without constant oversight',
      2: 'Needs Supervision / Requires frequent reminders and follow-up checks',
      3: 'Reliable / Completes duties reliably with normal supervisor oversight',
      4: 'Highly Dependable / Autonomous, takes full ownership of assigned station',
      5: 'Pillar of Trust / Completely self-directed, handles critical duties effortlessly'
    }
  },
  {
    key: 'attitude',
    id: 7,
    title: 'Attitude',
    shortLabel: 'Attitude & Demeanor',
    description: 'Positive disposition, respect for peers/supervisors, constructive response to feedback.',
    weight: 5,
    rubric: {
      1: 'Negative / Disruptive attitude, resists feedback, causes friction',
      2: 'Indifferent / Reluctant demeanor, slow to accept constructive criticism',
      3: 'Positive / Respectful, receptive to feedback, cooperative with team',
      4: 'Enthusiastic / Inspiring attitude, handles pressure with calm composure',
      5: 'Role Model / Uplifting presence, champions high team morale and company culture'
    }
  },
  {
    key: 'creativityAnalytical',
    id: 8,
    title: 'Creativity / Analytical Skills',
    shortLabel: 'Creativity & Analytical',
    description: 'Problem-solving ability, troubleshooting machine/process issues, logical diagnostic thinking.',
    weight: 5,
    rubric: {
      1: 'Unable / Fails to identify obvious root causes, relies solely on others',
      2: 'Limited / Solves simple routine issues but struggles with minor deviations',
      3: 'Competent / Effectively troubleshoots common production/operational glitches',
      4: 'Strong Analyst / Diagnoses complex machine/workflow issues methodically',
      5: 'Exceptional Troubleshooter / Swiftly resolves intricate technical challenges'
    }
  },
  {
    key: 'communicationSkills',
    id: 9,
    title: 'Communication Skills',
    shortLabel: 'Communication',
    description: 'Clarity in verbal and written reports, shift handover, timely escalation, active listening.',
    weight: 5,
    rubric: {
      1: 'Ineffective / Fails to communicate critical issues, poor shift handovers',
      2: 'Weak / Hesitant or incomplete reporting, occasional miscommunications',
      3: 'Clear / Communicates clearly and reports machine/shift status on time',
      4: 'Articulate / Concise, detailed reporting, excellent handover documentation',
      5: 'Superior / Outstanding communicator, bridges cross-shift & cross-dept gaps'
    }
  },
  {
    key: 'teamworkRelationship',
    id: 10,
    title: 'Interpersonal Relationship / Teamwork',
    shortLabel: 'Teamwork & Relations',
    description: 'Collaboration with coworkers, peer support, conflict resolution, fostering team synergy.',
    weight: 5,
    rubric: {
      1: 'Uncooperative / Creates interpersonal conflicts, isolates from team efforts',
      2: 'Reluctant / Cooperates only when forced, minimal peer interaction',
      3: 'Good Team Player / Works cooperatively, helps colleagues during peak loads',
      4: 'Strong Collaborator / Actively supports teammates and fosters good harmony',
      5: 'Team Catalyst / Unifies team, resolves conflicts, empowers everyone around them'
    }
  }
];

export function calculateEvaluationSummary(scores: EvaluationScores): {
  totalScore: number;
  totalPossible: number;
  averageRating: number;
  percentage: number;
  ratingGrade: PerformanceEvaluationRecord['ratingGrade'] | 'Pending Assessment';
  gradeColor: string;
  gradeBg: string;
  gradeBadge: string;
  ratedCount: number;
  isComplete: boolean;
} {
  const scoreKeys: (keyof EvaluationScores)[] = [
    'jobKnowledge',
    'quantityOfOutput',
    'qualityOfWork',
    'attendanceCommitment',
    'initiativeImprovement',
    'dependability',
    'attitude',
    'creativityAnalytical',
    'communicationSkills',
    'teamworkRelationship'
  ];

  let ratedCount = 0;
  let sum = 0;

  scoreKeys.forEach(k => {
    const val = Number(scores[k] || 0);
    if (val > 0) {
      ratedCount++;
      sum += val;
    }
  });

  const isComplete = ratedCount === 10;
  const totalPossible = 50;
  const averageRating = ratedCount > 0 ? Number((sum / 10).toFixed(2)) : 0;
  const percentage = ratedCount > 0 ? Number(((sum / totalPossible) * 100).toFixed(1)) : 0;

  let ratingGrade: PerformanceEvaluationRecord['ratingGrade'] | 'Pending Assessment' = 'Needs Improvement';
  let gradeColor = 'text-amber-700';
  let gradeBg = 'bg-amber-50';
  let gradeBadge = 'border-amber-300 text-amber-800 bg-amber-50';

  if (ratedCount === 0 || sum === 0) {
    ratingGrade = 'Pending Assessment';
    gradeColor = 'text-slate-500';
    gradeBg = 'bg-slate-100';
    gradeBadge = 'border-slate-300 text-slate-700 bg-slate-100';
  } else if (averageRating >= 4.5) {
    ratingGrade = 'Outstanding';
    gradeColor = 'text-emerald-700';
    gradeBg = 'bg-emerald-50';
    gradeBadge = 'border-emerald-300 text-emerald-800 bg-emerald-50';
  } else if (averageRating >= 3.8) {
    ratingGrade = 'Exceeds Expectations';
    gradeColor = 'text-blue-700';
    gradeBg = 'bg-blue-50';
    gradeBadge = 'border-blue-300 text-blue-800 bg-blue-50';
  } else if (averageRating >= 3.0) {
    ratingGrade = 'Meets Expectations';
    gradeColor = 'text-teal-700';
    gradeBg = 'bg-teal-50';
    gradeBadge = 'border-teal-300 text-teal-800 bg-teal-50';
  } else if (averageRating >= 2.0) {
    ratingGrade = 'Needs Improvement';
    gradeColor = 'text-amber-700';
    gradeBg = 'bg-amber-50';
    gradeBadge = 'border-amber-300 text-amber-800 bg-amber-50';
  } else {
    ratingGrade = 'Unsatisfactory';
    gradeColor = 'text-rose-700';
    gradeBg = 'bg-rose-50';
    gradeBadge = 'border-rose-300 text-rose-800 bg-rose-50';
  }

  return {
    totalScore: sum,
    totalPossible,
    averageRating,
    percentage,
    ratingGrade,
    gradeColor,
    gradeBg,
    gradeBadge,
    ratedCount,
    isComplete
  };
}

export function calculateYearOfService(dateJoinedStr: string, evaluationDateStr?: string): {
  years: number;
  months: number;
  display: string;
  shortDisplay: string;
  decimalYears: number;
} {
  if (!dateJoinedStr) {
    return { years: 0, months: 0, display: '—', shortDisplay: '—', decimalYears: 0 };
  }

  const joinDate = new Date(dateJoinedStr);
  if (isNaN(joinDate.getTime())) {
    return { years: 0, months: 0, display: dateJoinedStr, shortDisplay: dateJoinedStr, decimalYears: 0 };
  }

  const refDate = evaluationDateStr ? new Date(evaluationDateStr) : new Date();
  if (isNaN(refDate.getTime())) {
    return { years: 0, months: 0, display: '—', shortDisplay: '—', decimalYears: 0 };
  }

  let totalMonths = (refDate.getFullYear() - joinDate.getFullYear()) * 12 + (refDate.getMonth() - joinDate.getMonth());
  if (refDate.getDate() < joinDate.getDate()) {
    totalMonths--;
  }

  if (totalMonths < 0) totalMonths = 0;

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const decimalYears = Number((totalMonths / 12).toFixed(1));

  let display = '';
  if (years > 0 && months > 0) {
    display = `${years} Year${years > 1 ? 's' : ''} ${months} Month${months > 1 ? 's' : ''}`;
  } else if (years > 0) {
    display = `${years} Year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    display = `${months} Month${months > 1 ? 's' : ''}`;
  } else {
    display = '< 1 Month';
  }

  const shortDisplay = `${decimalYears} Yrs`;

  return {
    years,
    months,
    display,
    shortDisplay,
    decimalYears
  };
}

export function generateEvaluationPeriodOptions(currentYear = new Date().getFullYear()): Array<{
  type: EvaluationPeriodType;
  label: string;
  period: string;
  periodKey: string;
  year: number;
}> {
  const options: Array<{
    type: EvaluationPeriodType;
    label: string;
    period: string;
    periodKey: string;
    year: number;
  }> = [];

  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  years.forEach(y => {
    // Quarterly Options
    options.push({ type: 'Quarterly', label: `Q1 ${y} (Jan - Mar)`, period: `Q1 ${y}`, periodKey: `${y}-Q1`, year: y });
    options.push({ type: 'Quarterly', label: `Q2 ${y} (Apr - Jun)`, period: `Q2 ${y}`, periodKey: `${y}-Q2`, year: y });
    options.push({ type: 'Quarterly', label: `Q3 ${y} (Jul - Sep)`, period: `Q3 ${y}`, periodKey: `${y}-Q3`, year: y });
    options.push({ type: 'Quarterly', label: `Q4 ${y} (Oct - Dec)`, period: `Q4 ${y}`, periodKey: `${y}-Q4`, year: y });

    // Half Yearly Options
    options.push({ type: 'Half Yearly', label: `H1 ${y} (Jan - Jun)`, period: `H1 ${y}`, periodKey: `${y}-H1`, year: y });
    options.push({ type: 'Half Yearly', label: `H2 ${y} (Jul - Dec)`, period: `H2 ${y}`, periodKey: `${y}-H2`, year: y });

    // Yearly Options
    options.push({ type: 'Yearly', label: `Annual Year ${y}`, period: `Annual ${y}`, periodKey: `${y}-FY`, year: y });
  });

  return options;
}
