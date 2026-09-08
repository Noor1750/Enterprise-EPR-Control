import { 
  Target, Menu, CheckSquare, Users, Wrench, AlertTriangle, 
  Calendar, Clock, Award, Briefcase, DownloadCloud, Settings, Sparkles, Eye, LucideIcon,
  TrendingUp, FileCheck2, HardDrive, ShieldCheck, UserCheck, PartyPopper, User
} from 'lucide-react';
import type { UserSecurityScope } from './security';

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
    moduleName: 'Daily Tasks',
    description: 'Daily Task Dispatching, Priorities, Checklist Management & Job Orders',
    category: 'Operations',
    iconName: 'CheckSquare',
    status: 'Active'
  },
  {
    id: 'gemba-walks',
    name: 'Gemba Walks Navigator',
    moduleName: 'Gemba Walks',
    description: '13-Point Smart Floor Audits, 5-Why Root Cause, Before & After Photos & Action Tracking',
    category: 'Operations',
    iconName: 'Eye',
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
    name: 'KPI Performance Navigator',
    moduleName: 'KPI Performance',
    description: 'Monthly KPI Scorecards, 10-Point Performance Evaluations & Structured Performance Review Cycles',
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
    id: 'anniversaries',
    name: 'Birthdays & Anniversaries',
    moduleName: 'All',
    description: 'Company-Wide Celebrations: Staff Birthdays, Work Anniversaries, Milestone Badges & Warm Wishes',
    category: 'Human Resources',
    iconName: 'PartyPopper',
    status: 'Active'
  },
  {
    id: 'promotions',
    name: 'Employee Promotions & Career Progression',
    moduleName: 'Employee Directory',
    description: 'Staff Promotions Record, Promotion Year Tracking, Designations, Salary Increments & Official Letter Generation',
    category: 'Human Resources',
    iconName: 'TrendingUp',
    status: 'Active'
  },
  {
    id: 'reviews',
    name: 'Performance Reviews & Appraisals',
    moduleName: 'KPI Performance',
    description: 'Structured Appraisal Cycles, Formal Review Meetings, Promotion Reviews & Progression History',
    category: 'Analytics & Quality',
    iconName: 'FileCheck2',
    status: 'Active'
  },
  {
    id: '5s-leaders',
    name: '5S Area & Line Leaders Directory',
    moduleName: '5S & Visual Management',
    description: '5S Work Area Mapping, Dedicated Line Leaders, Contact Details & Inspection Routing',
    category: 'Analytics & Quality',
    iconName: 'ShieldCheck',
    status: 'Active'
  },
  {
    id: 'storage-cleanup',
    name: 'Drive Storage & Historical Data Cleanup',
    moduleName: 'Settings',
    description: 'Google Drive Storage Consumption Visibility, Health Monitoring & Date-Range Record Purge Tool',
    category: 'System Administration',
    iconName: 'HardDrive',
    status: 'Active'
  },
  {
    id: 'contact-portfolio',
    name: 'Developer Contact',
    moduleName: 'All',
    description: 'Developer Profile, Portrait Photo, Direct Contact Channels & Support Inquiry Messenger',
    category: 'Operations',
    iconName: 'User',
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
    case 'TrendingUp': return TrendingUp;
    case 'FileCheck2': return FileCheck2;
    case 'HardDrive': return HardDrive;
    case 'ShieldCheck': return ShieldCheck;
    case 'PartyPopper': return PartyPopper;
    case 'User': return User;
    case 'UserCheck': return UserCheck;
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
    window.dispatchEvent(new CustomEvent('erp-navigators-updated', { detail: { navigators } }));
  } catch (err) {
    console.error('Error saving system navigators:', err);
  }
}

// Check if a user has access permission for a given navigator as per settings access control
export function hasNavigatorAccess(
  navigatorIdOrObj: string | SystemNavigator,
  userScope?: UserSecurityScope | null,
  accessLevels: string[] = []
): boolean {
  const allNavigators = getSystemNavigators();
  const navId = typeof navigatorIdOrObj === 'string'
    ? navigatorIdOrObj.trim().toLowerCase()
    : navigatorIdOrObj.id.toLowerCase();

  const navigator = typeof navigatorIdOrObj === 'object'
    ? navigatorIdOrObj
    : allNavigators.find(n => 
        n.id.toLowerCase() === navId || 
        n.name.toLowerCase() === navId ||
        n.name.toLowerCase().replace(' navigator', '') === navId.replace(' navigator', '')
      ) || DEFAULT_SYSTEM_NAVIGATORS.find(n => 
        n.id.toLowerCase() === navId || 
        n.name.toLowerCase() === navId
      );

  if (!navigator) {
    if (navId === 'settings' && userScope?.isAdmin) return true;
    return false;
  }

  // Find latest system status for this navigator from master
  const systemNav = allNavigators.find(n => n.id.toLowerCase() === navigator.id.toLowerCase()) || navigator;

  // 1. INACTIVE STATUS CHECK:
  // If the navigator is marked 'Inactive' in Settings > Navigator Settings & Default Assignment:
  // Only Administrators can access it. Non-admins are strictly blocked.
  if (systemNav.status === 'Inactive' && !userScope?.isAdmin) {
    return false;
  }

  // 2. ADMIN FULL ACCESS:
  if (userScope?.isAdmin) {
    return true;
  }

  // 3. EXPLICIT DENIAL:
  if (userScope?.deniedPermissions) {
    const deniedNav = userScope.deniedPermissions[navigator.id.toLowerCase()];
    const deniedMod = userScope.deniedPermissions[navigator.moduleName.toLowerCase()];
    if (deniedNav?.includes('view') || deniedMod?.includes('view')) {
      return false;
    }
  }

  // 4. ADDITIONAL ACCESS CONTROLS (Settings > Additional Access Controls):
  const userKeys = [userScope?.username, userScope?.email]
    .filter((k): k is string => Boolean(k && k.trim()))
    .map(k => k.trim().toLowerCase());

  for (const uKey of userKeys) {
    try {
      const rawAdd = localStorage.getItem(`erp_user_additional_access_${uKey}`);
      if (rawAdd) {
        const addMap = JSON.parse(rawAdd);
        const navKey = navigator.id.toLowerCase();
        const addRec = addMap[navKey] || 
          addMap[navigator.moduleName.toLowerCase()] ||
          Object.values(addMap).find((r: any) => 
            r.navigatorId?.toLowerCase() === navKey || 
            r.navigatorName?.toLowerCase() === navigator.name.toLowerCase()
          );
        
        if (addRec) {
          if (addRec.status !== 'Inactive' && (addRec.canView || addRec.canEdit)) {
            return true;
          }
        }
      }
    } catch (_) {}
  }

  // 5. USER CUSTOM MODULE OVERRIDE:
  if (userScope?.customModulePermissions) {
    const navKey = navigator.id.toLowerCase();
    if (userScope.customModulePermissions[navKey]?.permissions?.includes('view')) {
      return true;
    }
  }

  // 6. RESOLVE EFFECTIVE ACCESS LEVELS:
  // Merge accessLevels parameter with userScope.accessLevel
  const effectiveAccessLevels = Array.from(new Set([
    ...(accessLevels || []),
    ...(userScope?.accessLevel || [])
  ]));

  if (effectiveAccessLevels.includes('All')) {
    // Settings is restricted to Admin or Manager unless explicitly granted
    if (navigator.id.toLowerCase() === 'settings' || navigator.moduleName === 'Settings') {
      return effectiveAccessLevels.includes('Settings') || userScope?.role === 'Manager';
    }
    return true;
  }

  // General public / universal navigators
  if (navigator.id === 'contact-portfolio') {
    return true;
  }

  if (navigator.id === 'dashboard') {
    return true;
  }

  if (navigator.id === 'anniversaries' && (effectiveAccessLevels.includes('Employee Directory') || effectiveAccessLevels.includes('All'))) {
    return true;
  }

  // Direct moduleName match
  if (effectiveAccessLevels.includes(navigator.moduleName)) {
    return true;
  }

  // Canonical aliases and module mapping
  const modLower = navigator.moduleName.toLowerCase();
  const idLower = navigator.id.toLowerCase();

  const isMatching = effectiveAccessLevels.some(lvl => {
    const l = lvl.trim().toLowerCase();
    if (l === modLower || l === idLower) return true;

    // Daily Tasks
    if ((idLower === 'tasks' || modLower === 'daily tasks') && (l === 'daily tasks' || l === 'tasks')) return true;

    // Gemba Walks
    if ((idLower === 'gemba-walks' || modLower === 'gemba walks') && (l === 'gemba walks' || l === 'gemba')) return true;

    // 5S & Visual Management
    if ((idLower === '5s-management' || idLower === '5s-leaders' || modLower === '5s & visual management') && 
        (l === '5s & visual management' || l === '5s' || l === 'visual management' || l === '5s management')) return true;

    // KPI Performance & Reviews
    if ((idLower === 'kpi' || idLower === 'reviews' || modLower === 'kpi performance') && 
        (l === 'kpi performance' || l === 'monthly kpi' || l === 'kpi' || l === 'performance reviews')) return true;

    // Machine & Skills (Breakdown, Machine Capacity, Skill Matrix)
    if ((idLower === 'machine' || idLower === 'breakdown' || idLower === 'skill-dashboard' || modLower === 'machine & skills') && 
        (l === 'machine & skills' || l === 'machine capacity' || l === 'machine' || l === 'breakdown log' || l === 'breakdown' || l === 'skill matrix' || l === 'skills')) return true;

    // Employee Directory & Promotions
    if ((idLower === 'directory' || idLower === 'promotions' || modLower === 'employee directory') && 
        (l === 'employee directory' || l === 'directory' || l === 'employee promotions' || l === 'promotions')) return true;

    // Shift Assignments
    if ((idLower === 'shifts' || modLower === 'shift assignments') && (l === 'shift assignments' || l === 'shifts')) return true;

    // Leave Management
    if ((idLower === 'leave' || modLower === 'leave management') && (l === 'leave management' || l === 'leave')) return true;

    // Overtime
    if ((idLower === 'overtime' || modLower === 'overtime') && (l === 'overtime')) return true;

    // Best Practices
    if ((idLower === 'practices' || modLower === 'best practices') && (l === 'best practices' || l === 'practices')) return true;

    // Reports & Export
    if ((idLower === 'reports' || modLower === 'reports & export') && (l === 'reports & export' || l === 'reports')) return true;

    // Settings
    if ((idLower === 'settings' || idLower === 'storage-cleanup' || modLower === 'settings') && (l === 'settings')) return true;

    return false;
  });

  return isMatching;
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

  const assignedNavVal = userScope?.defaultNavigator?.trim() || 
    (userScope?.username ? localStorage.getItem(`erp_user_default_nav_${userScope.username.toLowerCase()}`) : null) ||
    (userScope?.email ? localStorage.getItem(`erp_user_default_nav_${userScope.email.toLowerCase()}`) : null);

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
  if (targetRole.toLowerCase() === 'admin' || targetUsername.toLowerCase() === 'noor.alam1750@gmail.com' || targetUsername.toLowerCase() === 'smltrimsbd@gmail.com') {
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
