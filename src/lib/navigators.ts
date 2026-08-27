import { 
  Target, Menu, CheckSquare, Users, Wrench, AlertTriangle, 
  Calendar, Clock, Award, Briefcase, DownloadCloud, Settings, Sparkles, Eye, LucideIcon 
} from 'lucide-react';
import { UserSecurityScope } from './security';

export interface SystemNavigator {
  id: string;
  name: string;
  moduleName: string; // The access level module required (or 'All')
  description: string;
  category: 'Operations' | 'Human Resources' | 'Analytics & Quality' | 'System Administration';
  iconName: string;
  status: 'Active' | 'Inactive';
}

export const DEFAULT_SYSTEM_NAVIGATORS: SystemNavigator[] = [
  {
    id: 'dashboard',
    name: 'ERP Dashboard',
    moduleName: 'All',
    description: 'Enterprise Operational KPIs, Active Shift Overview & Production Metrics',
    category: 'Operations',
    iconName: 'Menu',
    status: 'Active'
  },
  {
    id: 'tasks',
    name: 'Daily Tasks Navigator',
    moduleName: 'All',
    description: 'Daily Task Dispatching, Priorities, Checklist Management & Job Orders',
    category: 'Operations',
    iconName: 'CheckSquare',
    status: 'Active'
  },
  {
    id: 'breakdown',
    name: 'Breakdown Log Navigator',
    moduleName: 'Machine & Skills',
    description: 'Equipment Downtime Recording, Root Cause Analysis & Maintenance Workorders',
    category: 'Operations',
    iconName: 'AlertTriangle',
    status: 'Active'
  },
  {
    id: 'directory',
    name: 'Employee Directory Navigator',
    moduleName: 'Employee Directory',
    description: 'Staff Master Profiles, Contact Directory, Department & Designation Records',
    category: 'Human Resources',
    iconName: 'Users',
    status: 'Active'
  },
  {
    id: 'leave',
    name: 'Leave Management Navigator',
    moduleName: 'Leave Management',
    description: 'Staff Leave Applications, Approval Workflows & Annual Leave Balances',
    category: 'Human Resources',
    iconName: 'Calendar',
    status: 'Active'
  },
  {
    id: 'overtime',
    name: 'Overtime Navigator',
    moduleName: 'Overtime',
    description: 'Overtime Shift Hours Logging, Batch OT Entry & Rate Calculations',
    category: 'Human Resources',
    iconName: 'Clock',
    status: 'Active'
  },
  {
    id: 'machine',
    name: 'Production Navigator',
    moduleName: 'Machine & Skills',
    description: 'Machine Capacity Planning, Operating Parameters & Workstation Status',
    category: 'Operations',
    iconName: 'Wrench',
    status: 'Active'
  },
  {
    id: 'shifts',
    name: 'Shift Assignments Navigator',
    moduleName: 'Shift Assignments',
    description: 'Weekly Shift Rostering, Team Rotations & Workstation Allocation',
    category: 'Human Resources',
    iconName: 'Briefcase',
    status: 'Active'
  },
  {
    id: 'skill-dashboard',
    name: 'Skill Matrix Navigator',
    moduleName: 'Machine & Skills',
    description: 'Interactive Skill Matrix, Operator Competency Ratings & Skills Gap Analysis',
    category: 'Operations',
    iconName: 'Target',
    status: 'Active'
  },
  {
    id: 'kpi',
    name: 'Monthly KPI Navigator',
    moduleName: 'Monthly KPI',
    description: 'Monthly Performance Scorecards, Weightage Scoring & Goal Evaluations',
    category: 'Analytics & Quality',
    iconName: 'Target',
    status: 'Active'
  },
  {
    id: '5s-management',
    name: '5S & Visual Management Navigator',
    moduleName: '5S & Visual Management',
    description: 'Housekeeping Audits, 5S Evaluations, Top 3 Leaderboards & Shop Floor Visual Boards',
    category: 'Analytics & Quality',
    iconName: 'Sparkles',
    status: 'Active'
  },
  {
    id: 'practices',
    name: 'Best Practices Navigator',
    moduleName: 'Best Practices',
    description: 'Operational Best Practices, SOP Library, 5S & Kaizen Knowledge Base',
    category: 'Analytics & Quality',
    iconName: 'Award',
    status: 'Active'
  },
  {
    id: 'reports',
    name: 'Reports & Export Navigator',
    moduleName: 'Reports & Export',
    description: 'Cross-functional Analytics, Audit Trails & Excel Export Utilities',
    category: 'Analytics & Quality',
    iconName: 'DownloadCloud',
    status: 'Active'
  },
  {
    id: 'settings',
    name: 'Security & Access Navigator',
    moduleName: 'Settings',
    description: 'User Roles, Assignment Limits, Default Navigators & Security Controls',
    category: 'System Administration',
    iconName: 'Settings',
    status: 'Active'
  }
];

export interface DefaultNavigatorHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  employeeId?: string;
  previousNavigator: string;
  newNavigator: string;
  action: 'ASSIGNED' | 'CHANGED' | 'REMOVED' | 'FALLBACK_REDIRECT';
  changedBy: string;
  timestamp: string;
  notes?: string;
}

// Icon mapping helper
export function getNavigatorIcon(iconName: string): LucideIcon {
  switch (iconName) {
    case 'Target': return Target;
    case 'Menu': return Menu;
    case 'Wrench': return Wrench;
    case 'CheckSquare': return CheckSquare;
    case 'Users': return Users;
    case 'AlertTriangle': return AlertTriangle;
    case 'Calendar': return Calendar;
    case 'Clock': return Clock;
    case 'Award': return Award;
    case 'Briefcase': return Briefcase;
    case 'DownloadCloud': return DownloadCloud;
    case 'Settings': return Settings;
    case 'Sparkles': return Sparkles;
    case 'Eye': return Eye;
    default: return Menu;
  }
}

// Load active navigators list with status overrides from storage
export function getSystemNavigators(): SystemNavigator[] {
  try {
    const saved = localStorage.getItem('erp_system_navigators');
    if (saved) {
      const parsed: SystemNavigator[] = JSON.parse(saved);
      // Merge with default list to handle any new navigators
      return DEFAULT_SYSTEM_NAVIGATORS.map(def => {
        const found = parsed.find(p => p.id === def.id);
        return found ? { ...def, status: found.status } : def;
      });
    }
  } catch (err) {
    console.error('Error loading system navigators:', err);
  }
  return DEFAULT_SYSTEM_NAVIGATORS;
}

// Save navigator status updates (Active / Inactive)
export function saveSystemNavigators(navigators: SystemNavigator[]) {
  try {
    localStorage.setItem('erp_system_navigators', JSON.stringify(navigators));
  } catch (err) {
    console.error('Error saving system navigators:', err);
  }
}

// Check if a user has access permission for a given navigator
export function hasNavigatorAccess(
  navigatorIdOrObj: string | SystemNavigator,
  userScope?: UserSecurityScope | null,
  accessLevels: string[] = []
): boolean {
  if (userScope?.isAdmin || accessLevels.includes('All')) {
    return true;
  }

  const navigator = typeof navigatorIdOrObj === 'string'
    ? DEFAULT_SYSTEM_NAVIGATORS.find(n => n.id === navigatorIdOrObj || n.name.toLowerCase() === navigatorIdOrObj.toLowerCase())
    : navigatorIdOrObj;

  if (!navigator) return false;

  if (navigator.moduleName === 'All') return true;
  return accessLevels.includes(navigator.moduleName);
}

// Find a navigator object by ID or Name
export function findNavigator(idOrName: string | undefined): SystemNavigator | undefined {
  if (!idOrName) return undefined;
  const clean = idOrName.trim().toLowerCase();
  return DEFAULT_SYSTEM_NAVIGATORS.find(n => 
    n.id.toLowerCase() === clean || 
    n.name.toLowerCase() === clean ||
    n.name.toLowerCase().replace(' navigator', '') === clean.replace(' navigator', '')
  );
}

export interface DefaultNavigatorResolution {
  targetNavigatorId: string;
  targetNavigatorName: string;
  wasFallback: boolean;
  fallbackReason?: string;
  assignedNavigatorName?: string;
}

/**
 * Resolves the landing navigator for a user upon login.
 * Strictly adheres to:
 * 1. Role and Access Permissions MUST be checked first.
 * 2. Check if a Default Navigator is assigned to user.
 * 3. Validate that the Default Navigator exists, is Active, and user is authorized.
 * 4. If invalid or unauthorized or inactive, fall back automatically to the first safe authorized navigator.
 * 5. Never block login or throw an unhandled error!
 */
export function resolveUserLandingNavigator(
  userScope?: UserSecurityScope | null,
  accessLevels: string[] = []
): DefaultNavigatorResolution {
  const allNavigators = getSystemNavigators();
  const activeNavigators = allNavigators.filter(n => n.status === 'Active');

  // Filter navigators the user is authorized to access
  const authorizedNavigators = activeNavigators.filter(n => hasNavigatorAccess(n, userScope, accessLevels));

  // Determine standard system fallback (Default Landing navigator is ERP Dashboard)
  const fallbackNav = authorizedNavigators.find(n => n.id === 'dashboard') ||
                      authorizedNavigators.find(n => n.id === 'skill-dashboard') ||
                      authorizedNavigators[0] ||
                      DEFAULT_SYSTEM_NAVIGATORS[0];

  const assignedNavVal = userScope?.defaultNavigator?.trim();

  // If no default navigator is explicitly assigned, use standard default
  if (!assignedNavVal) {
    return {
      targetNavigatorId: fallbackNav.id,
      targetNavigatorName: fallbackNav.name,
      wasFallback: false
    };
  }

  // Look up assigned navigator in system master
  const matchedNav = allNavigators.find(n => 
    n.id.toLowerCase() === assignedNavVal.toLowerCase() ||
    n.name.toLowerCase() === assignedNavVal.toLowerCase() ||
    n.name.toLowerCase().replace(' navigator', '') === assignedNavVal.toLowerCase().replace(' navigator', '')
  );

  if (!matchedNav) {
    return {
      targetNavigatorId: fallbackNav.id,
      targetNavigatorName: fallbackNav.name,
      wasFallback: true,
      fallbackReason: `Assigned default Navigator "${assignedNavVal}" does not exist in the system master records.`,
      assignedNavigatorName: assignedNavVal
    };
  }

  if (matchedNav.status !== 'Active') {
    return {
      targetNavigatorId: fallbackNav.id,
      targetNavigatorName: fallbackNav.name,
      wasFallback: true,
      fallbackReason: `Your default Navigator "${matchedNav.name}" is currently disabled/inactive by the Administrator.`,
      assignedNavigatorName: matchedNav.name
    };
  }

  // Security permission check
  const isAuthorized = hasNavigatorAccess(matchedNav, userScope, accessLevels);
  if (!isAuthorized) {
    return {
      targetNavigatorId: fallbackNav.id,
      targetNavigatorName: fallbackNav.name,
      wasFallback: true,
      fallbackReason: `You do not have access permission for "${matchedNav.name}" (${matchedNav.moduleName}). Redirected to authorized navigator.`,
      assignedNavigatorName: matchedNav.name
    };
  }

  // Valid and authorized
  return {
    targetNavigatorId: matchedNav.id,
    targetNavigatorName: matchedNav.name,
    wasFallback: false,
    assignedNavigatorName: matchedNav.name
  };
}

// Audit trail storage for default navigator assignments
export function getDefaultNavigatorHistory(): DefaultNavigatorHistoryEntry[] {
  try {
    const saved = localStorage.getItem('erp_default_navigator_history');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading default navigator history:', err);
  }
  return [];
}

export function addDefaultNavigatorHistoryEntry(entry: Omit<DefaultNavigatorHistoryEntry, 'id' | 'timestamp'>) {
  try {
    const current = getDefaultNavigatorHistory();
    const newEntry: DefaultNavigatorHistoryEntry = {
      ...entry,
      id: `NAV-HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newEntry, ...current].slice(0, 300); // Keep last 300 entries
    localStorage.setItem('erp_default_navigator_history', JSON.stringify(updated));
  } catch (err) {
    console.error('Error recording default navigator history:', err);
  }
}

/**
 * Checks if the current logged-in user has permission to manage/assign the default navigator of a target user.
 * Admin: Full access over all users.
 * Manager/Supervisor: Only over users within their authorized scope; cannot modify Admin/Manager accounts.
 */
export function canUserManageTargetDefaultNavigator(
  currentScope: UserSecurityScope | null | undefined,
  targetUsername: string,
  targetRole: string,
  targetEmpId?: string,
  targetDept?: string
): { allowed: boolean; reason?: string } {
  if (!currentScope) {
    return { allowed: false, reason: 'Unauthenticated session' };
  }

  if (currentScope.isAdmin) {
    return { allowed: true };
  }

  // Prevent non-admins from modifying admin accounts
  if (targetRole.toLowerCase() === 'admin' || targetUsername.toLowerCase() === 'noor.alam1750@gmail.com') {
    return { allowed: false, reason: 'Managers cannot modify Administrator accounts.' };
  }

  // Superuser can manage non-admin users
  if (currentScope.isSuperuser) {
    return { allowed: true };
  }

  // Manager/Supervisor checks
  if (currentScope.isSupervisor || currentScope.role.toLowerCase() === 'manager') {
    // Cannot modify other managers or superusers
    if (targetRole.toLowerCase() === 'superuser' || targetRole.toLowerCase() === 'manager') {
      return { allowed: false, reason: 'Cannot modify peer or higher-level management accounts.' };
    }

    // Check scope limitation
    if (currentScope.accessLimitType === 'all') {
      return { allowed: true };
    }

    if (currentScope.accessLimitType === 'department') {
      if (targetDept && targetDept.toLowerCase() === currentScope.assignedDepartment.toLowerCase()) {
        return { allowed: true };
      }
      return { allowed: false, reason: `User is outside your assigned department (${currentScope.assignedDepartment}).` };
    }

    if (currentScope.accessLimitType === 'selected') {
      if (targetEmpId && currentScope.assignedEmployeeIds.some(id => id.toUpperCase() === targetEmpId.toUpperCase())) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'User is outside your assigned employee scope.' };
    }

    // Supervised
    return { allowed: true };
  }

  return { allowed: false, reason: 'Insufficient privileges. Admin or Manager role required.' };
}
