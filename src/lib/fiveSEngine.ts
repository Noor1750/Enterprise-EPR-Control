import { Employee } from '../components/kpi/types';
import { UserSecurityScope } from './security';

export type FiveSCategoryKey = 'sort' | 'setInOrder' | 'shine' | 'standardize' | 'sustain' | 'visualManagement';

export type AssessmentFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Special';

export type ComplianceStatus = 'Compliant' | 'Minor Deviation' | 'Major Deviation' | 'N/A';

export type ActionStatus = 'Open' | 'In Progress' | 'Completed' | 'Verified' | 'Closed';

export interface ChecklistItem {
  id: string;
  category: FiveSCategoryKey;
  standard: string;
  requirement: string;
  maxScore: number;
  weight: number;
  isCritical?: boolean;
  order: number;
}

export type FiveSCriteriaItem = ChecklistItem;

export interface ChecklistResponse {
  itemId: string;
  category: FiveSCategoryKey;
  score: number;
  maxScore: number;
  status: ComplianceStatus;
  remarks?: string;
  evidencePhoto?: string;
  requiresAction?: boolean;
}

export interface FiveSAssessment {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  period: string; // e.g., '2026-08'
  employeeId: string;
  employeeName: string;
  department: string;
  section: string;
  designation: string;
  supervisorName: string;
  managerName: string;
  shift: string;
  assessorId: string;
  assessorName: string;
  assessorEmail?: string;
  frequency: AssessmentFrequency;
  
  // Category Scores (Normalized 0-100 or raw totals)
  sortScore: number;
  setInOrderScore: number;
  shineScore: number;
  standardizeScore: number;
  sustainScore: number;
  total5SScore: number; // 0-100
  visualScore: number; // 0-100
  finalScore: number; // Weighted 0-100
  
  rating: string;
  ratingLabel: string;
  ratingColor: string;
  badgeClass: string;
  
  checklistResponses: ChecklistResponse[];
  remarks: string;
  correctiveActionsCount: number;
  criticalViolationsCount: number;
  status: 'Draft' | 'Submitted' | 'Verified' | 'Approved';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface FiveSCorrectiveAction {
  id: string;
  assessmentId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  section?: string;
  category: FiveSCategoryKey | string;
  observation: string;
  nonConformance: string;
  rootCause: string;
  correctiveAction: string;
  responsiblePerson: string;
  targetDate: string; // YYYY-MM-DD
  status: ActionStatus;
  closureDate?: string;
  closedBy?: string;
  verificationNotes?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  isCritical?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FiveSWinner {
  id: string;
  month: string; // YYYY-MM
  rank: 1 | 2 | 3;
  employeeId: string;
  employeeName: string;
  department: string;
  section: string;
  designation: string;
  supervisorName?: string;
  shift?: string;
  total5SScore: number;
  visualScore: number;
  finalScore: number;
  rating: string;
  declaredBy: string;
  declaredAt: string;
  remarks: string;
  isTie?: boolean;
  photoUrl?: string;
}

export interface RatingRangeConfig {
  min: number;
  max: number;
  label: string;
  color: string;
  badgeClass: string;
  description: string;
}

export interface FiveSCategoryMeta {
  id: FiveSCategoryKey;
  name: string;
  japaneseName: string;
  meaning: string;
  defaultWeight: number;
  color: string;
  iconName: string;
  description: string;
}

export interface FiveSSettingsConfig {
  enabled: boolean;
  fiveSWeight: number; // Default 70%
  visualWeight: number; // Default 30%
  minQualifyingScore: number; // Default 80
  assessmentFrequency: AssessmentFrequency;
  rankingPeriod: 'Monthly' | 'Quarterly';
  requireAuthorizedAssessor: boolean;
  disqualifyOnCriticalViolation: boolean;
  allowSelfAssessment: boolean;
  tieBreakerPriority: ('5S_Score' | 'Sustain_Score' | 'Visual_Score' | 'Fewer_Open_Actions' | 'Previous_Score')[];
  ratingRanges: RatingRangeConfig[];
  checklistCriteria: ChecklistItem[];
  notifications: {
    assessmentDue: boolean;
    lowScoreAlert: boolean;
    lowScoreThreshold: number;
    correctiveActionOverdue: boolean;
    winnersDeclared: boolean;
  };
}

export const FIVE_S_CATEGORIES: FiveSCategoryMeta[] = [
  {
    id: 'sort',
    name: 'Sort',
    japaneseName: 'Seiri (整理)',
    meaning: 'Remove unnecessary items',
    defaultWeight: 20,
    color: '#3B82F6', // Blue
    iconName: 'Filter',
    description: 'Separate needed tools, parts, and materials from unneeded ones and eliminate hazards/clutter.'
  },
  {
    id: 'setInOrder',
    name: 'Set in Order',
    japaneseName: 'Seiton (整頓)',
    meaning: 'Arrange necessary items systematically',
    defaultWeight: 20,
    color: '#10B981', // Emerald
    iconName: 'LayoutGrid',
    description: 'Neatly organize and label every tool and part so anyone can locate and return them in under 30 seconds.'
  },
  {
    id: 'shine',
    name: 'Shine',
    japaneseName: 'Seiso (清掃)',
    meaning: 'Clean and inspect workplace & machinery',
    defaultWeight: 20,
    color: '#F59E0B', // Amber
    iconName: 'Sparkles',
    description: 'Thoroughly sweep, wipe, and inspect machines, tools, tables, and floors to uncover leaks or wear.'
  },
  {
    id: 'standardize',
    name: 'Standardize',
    japaneseName: 'Seiketsu (清潔)',
    meaning: 'Maintain procedures and visual standards',
    defaultWeight: 20,
    color: '#8B5CF6', // Purple
    iconName: 'CheckCheck',
    description: 'Establish standardized visual controls, SOPs, cleaning checklists, and uniform workstation hygiene.'
  },
  {
    id: 'sustain',
    name: 'Sustain',
    japaneseName: 'Shitsuke (躾)',
    meaning: 'Self-discipline and continuous improvement',
    defaultWeight: 20,
    color: '#EC4899', // Pink
    iconName: 'HeartHandshake',
    description: 'Build habitual discipline, follow safety/5S rules consistently, and actively share Kaizen suggestions.'
  },
  {
    id: 'visualManagement',
    name: 'Visual Management',
    japaneseName: 'Mieruka (見える化)',
    meaning: 'Visual controls, markings, status displays',
    defaultWeight: 100, // Normalized within visual section
    color: '#06B6D4', // Cyan
    iconName: 'Eye',
    description: 'Ensure floor line demarcations, Kanban boards, shadow tags, safety visuals, and real-time status visibility.'
  }
];

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  // 1. SORT (Seiri)
  {
    id: 'sort-1',
    category: 'sort',
    standard: 'No Unneeded Items',
    requirement: 'Only currently required tools, raw materials, and components are present at the workstation/bench.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 1
  },
  {
    id: 'sort-2',
    category: 'sort',
    standard: 'Red Tag & Scrap Disposal',
    requirement: 'Defective parts, expired goods, rags, and waste materials are sorted into designated scrap/red-tag bins.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 2
  },

  // 2. SET IN ORDER (Seiton)
  {
    id: 'seiton-1',
    category: 'setInOrder',
    standard: 'Designated Location & Labeling',
    requirement: 'Every tool, fixture, and gauge has a marked designated home with visible name/size labeling.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 3
  },
  {
    id: 'seiton-2',
    category: 'setInOrder',
    standard: '30-Second Accessibility',
    requirement: 'High-frequency tools are placed in the primary grab zone for immediate ergonomic retrieval without searching.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 4
  },

  // 3. SHINE (Seiso)
  {
    id: 'seiso-1',
    category: 'shine',
    standard: 'Machine & Tool Cleanliness',
    requirement: 'Machines, needle beds, cutters, sensors, and tool surfaces are clean of debris, lint, oil spills, and stains.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 5
  },
  {
    id: 'seiso-2',
    category: 'shine',
    standard: 'Floor & Area Hygiene',
    requirement: 'Under-machine area, floor around the workstation, and nearby walkways are completely free of trash and dust.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 6
  },

  // 4. STANDARDIZE (Seiketsu)
  {
    id: 'seiketsu-1',
    category: 'standardize',
    standard: 'SOP & Visual Standard Displays',
    requirement: 'Operating procedure cards, 5S standards, and quality reference samples are clearly displayed and readable.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 7
  },
  {
    id: 'seiketsu-2',
    category: 'standardize',
    standard: 'Daily 5S Routine Execution',
    requirement: 'Daily shift start/end 5-minute cleaning and visual inspection routine is faithfully practiced.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 8
  },

  // 5. SUSTAIN (Shitsuke)
  {
    id: 'shitsuke-1',
    category: 'sustain',
    standard: 'PPE & Safety Discipline',
    requirement: 'Employee wears all mandatory PPE (earplugs, safety footwear, apron, goggles) and obeys safety guidelines.',
    maxScore: 10,
    weight: 1,
    isCritical: true, // Critical violation if violated!
    order: 9
  },
  {
    id: 'shitsuke-2',
    category: 'sustain',
    standard: 'Continuous Improvement (Kaizen)',
    requirement: 'Maintains consistent housekeeping discipline independently and proposes Kaizen improvements.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 10
  },

  // 6. VISUAL MANAGEMENT
  {
    id: 'visual-1',
    category: 'visualManagement',
    standard: 'Floor Demarcation & Aisles',
    requirement: 'Yellow/white walkway demarcations, pallet boundaries, and hazardous clearance zones are visible and clear.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 11
  },
  {
    id: 'visual-2',
    category: 'visualManagement',
    standard: 'Status Indicators & Kanban',
    requirement: 'Visual work status indicators (Run/Idle/Stop/Rework), WIP bins, and production lot tags are accurately positioned.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 12
  },
  {
    id: 'visual-3',
    category: 'visualManagement',
    standard: 'Min/Max Stock Levels & Controls',
    requirement: 'Material replenishment limits (Min/Max visual tags) and safety visual warnings are followed without abnormality.',
    maxScore: 10,
    weight: 1,
    isCritical: false,
    order: 13
  }
];

export const DEFAULT_RATING_RANGES: RatingRangeConfig[] = [
  {
    min: 90,
    max: 100,
    label: 'Excellent',
    color: '#10B981',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Exemplary 5S discipline and pristine visual workplace management.'
  },
  {
    min: 80,
    max: 89.99,
    label: 'Very Good',
    color: '#3B82F6',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Strong adherence to 5S standards with minor opportunities for optimization.'
  },
  {
    min: 70,
    max: 79.99,
    label: 'Good',
    color: '#F59E0B',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Acceptable housekeeping and basic visual compliance.'
  },
  {
    min: 60,
    max: 69.99,
    label: 'Needs Improvement',
    color: '#F97316',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Noticeable clutter, minor deviations, or inconsistent cleaning routines.'
  },
  {
    min: 0,
    max: 59.99,
    label: 'Unsatisfactory',
    color: '#EF4444',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Substandard housekeeping, disorganized tools, or safety violations.'
  }
];

export const DEFAULT_FIVE_S_SETTINGS: FiveSSettingsConfig = {
  enabled: true,
  fiveSWeight: 70,
  visualWeight: 30,
  minQualifyingScore: 80,
  assessmentFrequency: 'Monthly',
  rankingPeriod: 'Monthly',
  requireAuthorizedAssessor: true,
  disqualifyOnCriticalViolation: true,
  allowSelfAssessment: false,
  tieBreakerPriority: ['5S_Score', 'Sustain_Score', 'Visual_Score', 'Fewer_Open_Actions', 'Previous_Score'],
  ratingRanges: DEFAULT_RATING_RANGES,
  checklistCriteria: DEFAULT_CHECKLIST_ITEMS,
  notifications: {
    assessmentDue: true,
    lowScoreAlert: true,
    lowScoreThreshold: 70,
    correctiveActionOverdue: true,
    winnersDeclared: true
  }
};

const SETTINGS_KEY = 'erp_5s_settings_config';

export function getFiveSSettings(): FiveSSettingsConfig {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_FIVE_S_SETTINGS,
        ...parsed,
        ratingRanges: parsed.ratingRanges || DEFAULT_RATING_RANGES,
        checklistCriteria: parsed.checklistCriteria || DEFAULT_CHECKLIST_ITEMS,
        notifications: { ...DEFAULT_FIVE_S_SETTINGS.notifications, ...(parsed.notifications || {}) }
      };
    }
  } catch (err) {
    console.error('Failed to parse 5S settings, using default:', err);
  }
  return DEFAULT_FIVE_S_SETTINGS;
}

export function saveFiveSSettings(settings: FiveSSettingsConfig): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save 5S settings:', err);
  }
}

/**
 * Calculates raw category scores, normalized 5S total, Visual Management score, and weighted Final Score.
 */
export function calculateAssessmentScores(
  responses: ChecklistResponse[],
  settings: FiveSSettingsConfig = getFiveSSettings()
): {
  sortScore: number;
  setInOrderScore: number;
  shineScore: number;
  standardizeScore: number;
  sustainScore: number;
  total5SScore: number;
  visualScore: number;
  finalScore: number;
  rating: RatingRangeConfig;
  criticalViolationsCount: number;
} {
  const getCategoryPct = (catKey: FiveSCategoryKey): number => {
    const catItems = responses.filter(r => r.category === catKey && r.status !== 'N/A');
    if (catItems.length === 0) return 100;
    const earned = catItems.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
    const max = catItems.reduce((sum, r) => sum + (Number(r.maxScore) || 10), 0);
    return max > 0 ? Math.round((earned / max) * 100) : 100;
  };

  const sortScore = getCategoryPct('sort');
  const setInOrderScore = getCategoryPct('setInOrder');
  const shineScore = getCategoryPct('shine');
  const standardizeScore = getCategoryPct('standardize');
  const sustainScore = getCategoryPct('sustain');

  // Total 5S is the unweighted average of the 5 pillar scores (0-100)
  const total5SScore = Math.round((sortScore + setInOrderScore + shineScore + standardizeScore + sustainScore) / 5);

  // Visual Management score (0-100)
  const visualScore = getCategoryPct('visualManagement');

  // Weighted Final Score: (5S * weight + Visual * weight) / 100
  const w5S = Number(settings.fiveSWeight) || 70;
  const wVis = Number(settings.visualWeight) || 30;
  const totalWeight = w5S + wVis || 100;
  const finalScore = Math.round(((total5SScore * w5S) + (visualScore * wVis)) / totalWeight);

  // Count critical violations
  const criticalItemIds = new Set(settings.checklistCriteria.filter(c => c.isCritical).map(c => c.id));
  const criticalViolationsCount = responses.filter(r => 
    criticalItemIds.has(r.itemId) && (r.status === 'Major Deviation' || r.score === 0)
  ).length;

  const rating = getRatingLevel(finalScore, settings);

  return {
    sortScore,
    setInOrderScore,
    shineScore,
    standardizeScore,
    sustainScore,
    total5SScore,
    visualScore,
    finalScore,
    rating,
    criticalViolationsCount
  };
}

export function getRatingLevel(
  score: number,
  settings: FiveSSettingsConfig = getFiveSSettings()
): RatingRangeConfig {
  const ranges = settings.ratingRanges || DEFAULT_RATING_RANGES;
  const sorted = [...ranges].sort((a, b) => b.min - a.min);
  const found = sorted.find(r => score >= r.min && score <= r.max);
  return found || sorted[sorted.length - 1] || DEFAULT_RATING_RANGES[DEFAULT_RATING_RANGES.length - 1];
}

export interface RankedEmployeeCandidate {
  rank: number;
  employeeId: string;
  employeeName: string;
  department: string;
  section: string;
  designation: string;
  supervisorName: string;
  managerName: string;
  shift: string;
  total5SScore: number;
  sustainScore: number;
  visualScore: number;
  finalScore: number;
  ratingLabel: string;
  ratingColor: string;
  badgeClass: string;
  openActionsCount: number;
  previousMonthScore: number;
  criticalViolationsCount: number;
  isEligible: boolean;
  disqualificationReason?: string;
  isTie?: boolean;
  assessmentCount: number;
  latestAssessmentDate: string;
}

/**
 * Calculates Best 5S & Housekeeping Rankings applying all scoring, eligibility, and tie-breaking rules.
 */
export function calculateRankings(
  currentMonthAssessments: FiveSAssessment[],
  allCorrectiveActions: FiveSCorrectiveAction[],
  previousMonthAssessments: FiveSAssessment[] = [],
  settings: FiveSSettingsConfig = getFiveSSettings()
): {
  top3: RankedEmployeeCandidate[];
  allRanked: RankedEmployeeCandidate[];
  ineligible: RankedEmployeeCandidate[];
} {
  // Aggregate latest/average assessment per employee for the ranking period
  const empMap = new Map<string, FiveSAssessment[]>();
  currentMonthAssessments.forEach(ass => {
    if (!ass.employeeId) return;
    const existing = empMap.get(ass.employeeId) || [];
    existing.push(ass);
    empMap.set(ass.employeeId, existing);
  });

  const candidates: RankedEmployeeCandidate[] = [];

  empMap.forEach((assessments, empId) => {
    // Sort assessments by date desc
    assessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = assessments[0];

    // Compute averages across assessments for that month if multiple exist
    const avg5S = Math.round(assessments.reduce((s, a) => s + a.total5SScore, 0) / assessments.length);
    const avgSustain = Math.round(assessments.reduce((s, a) => s + a.sustainScore, 0) / assessments.length);
    const avgVisual = Math.round(assessments.reduce((s, a) => s + a.visualScore, 0) / assessments.length);
    const avgFinal = Math.round(assessments.reduce((s, a) => s + a.finalScore, 0) / assessments.length);
    const totalCritical = assessments.reduce((s, a) => s + (a.criticalViolationsCount || 0), 0);

    // Count open corrective actions
    const empOpenActions = allCorrectiveActions.filter(ca => 
      ca.employeeId === empId && (ca.status === 'Open' || ca.status === 'In Progress')
    ).length;

    // Previous month score
    const prevAssessments = previousMonthAssessments.filter(p => p.employeeId === empId);
    const prevScore = prevAssessments.length > 0
      ? Math.round(prevAssessments.reduce((s, p) => s + p.finalScore, 0) / prevAssessments.length)
      : 0;

    // Eligibility validation
    let isEligible = true;
    let disqualificationReason = '';

    if (avgFinal < settings.minQualifyingScore) {
      isEligible = false;
      disqualificationReason = `Score (${avgFinal}) is below minimum qualifying threshold of ${settings.minQualifyingScore}%`;
    } else if (settings.disqualifyOnCriticalViolation && totalCritical > 0) {
      isEligible = false;
      disqualificationReason = `Has ${totalCritical} unresolved critical 5S safety/housekeeping violation(s)`;
    }

    const rating = getRatingLevel(avgFinal, settings);

    candidates.push({
      rank: 0,
      employeeId: empId,
      employeeName: latest.employeeName,
      department: latest.department,
      section: latest.section || '',
      designation: latest.designation || 'Operator',
      supervisorName: latest.supervisorName || '',
      managerName: latest.managerName || '',
      shift: latest.shift || 'Day Shift',
      total5SScore: avg5S,
      sustainScore: avgSustain,
      visualScore: avgVisual,
      finalScore: avgFinal,
      ratingLabel: rating.label,
      ratingColor: rating.color,
      badgeClass: rating.badgeClass,
      openActionsCount: empOpenActions,
      previousMonthScore: prevScore,
      criticalViolationsCount: totalCritical,
      isEligible,
      disqualificationReason,
      assessmentCount: assessments.length,
      latestAssessmentDate: latest.date
    });
  });

  const eligibleCandidates = candidates.filter(c => c.isEligible);
  const ineligibleCandidates = candidates.filter(c => !c.isEligible);

  // Apply configurable Tie-Breaker Ordering
  eligibleCandidates.sort((a, b) => {
    // 1. Primary: Final Score
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;

    // Sequential secondary tie-breakers
    for (const criterion of settings.tieBreakerPriority) {
      if (criterion === '5S_Score') {
        if (b.total5SScore !== a.total5SScore) return b.total5SScore - a.total5SScore;
      } else if (criterion === 'Sustain_Score') {
        if (b.sustainScore !== a.sustainScore) return b.sustainScore - a.sustainScore;
      } else if (criterion === 'Visual_Score') {
        if (b.visualScore !== a.visualScore) return b.visualScore - a.visualScore;
      } else if (criterion === 'Fewer_Open_Actions') {
        if (a.openActionsCount !== b.openActionsCount) return a.openActionsCount - b.openActionsCount;
      } else if (criterion === 'Previous_Score') {
        if (b.previousMonthScore !== a.previousMonthScore) return b.previousMonthScore - a.previousMonthScore;
      }
    }
    return a.employeeName.localeCompare(b.employeeName);
  });

  // Assign Ranks and detect exact Ties
  let currentRank = 1;
  for (let i = 0; i < eligibleCandidates.length; i++) {
    if (i > 0) {
      const prev = eligibleCandidates[i - 1];
      const curr = eligibleCandidates[i];
      const isExactTie = 
        prev.finalScore === curr.finalScore &&
        prev.total5SScore === curr.total5SScore &&
        prev.sustainScore === curr.sustainScore &&
        prev.visualScore === curr.visualScore &&
        prev.openActionsCount === curr.openActionsCount &&
        prev.previousMonthScore === curr.previousMonthScore;

      if (isExactTie) {
        curr.rank = prev.rank;
        curr.isTie = true;
        prev.isTie = true;
      } else {
        currentRank = i + 1;
        curr.rank = currentRank;
      }
    } else {
      eligibleCandidates[0].rank = 1;
    }
  }

  // Top 3 Winners
  const top3 = eligibleCandidates.filter(c => c.rank <= 3);

  return {
    top3,
    allRanked: eligibleCandidates,
    ineligible: ineligibleCandidates
  };
}

/**
 * Checks if user is authorized to conduct/edit/approve 5S assessments based on RBAC scope.
 */
export function canConduct5SAssessment(
  userScope?: UserSecurityScope | null,
  targetEmployeeDept?: string,
  targetEmployeeSupervisor?: string
): boolean {
  if (!userScope) return false;
  if (userScope.isAdmin || userScope.isSuperuser) return true;
  if (userScope.isManager) return true;

  if (userScope.isSupervisor) {
    if (userScope.accessLimitType === 'all') return true;
    if (userScope.accessLimitType === 'department' && userScope.assignedDepartment) {
      return targetEmployeeDept?.toLowerCase() === userScope.assignedDepartment.toLowerCase();
    }
    if (userScope.accessLimitType === 'supervised') {
      return (
        targetEmployeeSupervisor?.toLowerCase() === userScope.employeeName?.toLowerCase() ||
        targetEmployeeSupervisor?.toLowerCase() === userScope.supervisorName?.toLowerCase()
      );
    }
    return true;
  }

  return false;
}

export function filter5SAssessmentsByScope(
  assessments: FiveSAssessment[],
  userScope?: UserSecurityScope | null
): FiveSAssessment[] {
  if (!userScope || userScope.isAdmin || userScope.isSuperuser) return assessments;

  if (userScope.isManager) {
    if (userScope.assignedDepartment && userScope.accessLimitType === 'department') {
      return assessments.filter(a => a.department.toLowerCase() === userScope.assignedDepartment.toLowerCase());
    }
    return assessments;
  }

  if (userScope.isSupervisor) {
    if (userScope.accessLimitType === 'supervised') {
      const supName = (userScope.employeeName || userScope.supervisorName || '').toLowerCase();
      return assessments.filter(a => 
        (a.supervisorName && a.supervisorName.toLowerCase() === supName) ||
        (userScope.assignedEmployeeIds && userScope.assignedEmployeeIds.includes(a.employeeId))
      );
    }
    if (userScope.accessLimitType === 'department' && userScope.assignedDepartment) {
      return assessments.filter(a => a.department.toLowerCase() === userScope.assignedDepartment.toLowerCase());
    }
    return assessments;
  }

  // Standard user only sees their own assessments
  if (userScope.employeeId) {
    return assessments.filter(a => a.employeeId === userScope.employeeId);
  }

  return assessments;
}

export function canDeclare5SWinner(userScope?: UserSecurityScope | null): boolean {
  if (!userScope) return false;
  return Boolean(userScope.isAdmin || userScope.isSuperuser || userScope.isManager);
}

export function getRatingBadge(score: number, settings?: FiveSSettingsConfig) {
  const rating = getRatingLevel(score, settings || getFiveSSettings());
  return {
    label: rating.label,
    color: rating.color,
    badgeClass: rating.badgeClass
  };
}

export function getEmployeePerformanceTrend(
  assessments: FiveSAssessment[],
  employeeId: string
) {
  const empAudits = assessments
    .filter(a => a.employeeId === employeeId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (empAudits.length === 0) {
    return {
      history: [],
      trendDirection: 'Stable' as const,
      trendDelta: 0,
      averageScore: 0
    };
  }

  const history = empAudits.map(a => ({
    date: a.date,
    month: a.month,
    finalScore: a.finalScore,
    total5SScore: a.total5SScore,
    visualScore: a.visualScore,
    rating: a.rating
  }));

  const avg = Math.round(empAudits.reduce((acc, a) => acc + a.finalScore, 0) / empAudits.length);

  let trendDelta = 0;
  let trendDirection: 'Improving' | 'Declining' | 'Stable' = 'Stable';

  if (empAudits.length >= 2) {
    const latest = empAudits[empAudits.length - 1].finalScore;
    const prev = empAudits[empAudits.length - 2].finalScore;
    trendDelta = latest - prev;
    if (trendDelta > 1) trendDirection = 'Improving';
    else if (trendDelta < -1) trendDirection = 'Declining';
    else trendDirection = 'Stable';
  }

  return {
    history,
    trendDirection,
    trendDelta,
    averageScore: avg
  };
}

