import { Employee } from '../components/kpi/types';
import { getCompanyName } from './appSettings';

export type AccessLimitType = 'all' | 'supervised' | 'department' | 'selected' | 'self';

export type UserRole = 'Admin' | 'Manager' | 'Superuser' | 'Supervisor' | 'User' | 'Standard User' | 'Operator';

export type PermissionType = 
  | 'view' 
  | 'create' 
  | 'edit' 
  | 'delete' 
  | 'approve' 
  | 'reject' 
  | 'assign' 
  | 'export' 
  | 'import' 
  | 'print' 
  | 'configure' 
  | 'manage';

export type ScopeType = 
  | 'All Data' 
  | 'Department' 
  | 'Section' 
  | 'Team' 
  | 'Assigned Staff' 
  | 'Own Data' 
  | 'Assigned Navigator' 
  | 'Assigned Machine' 
  | 'Assigned Shift';

export interface ModulePermissionConfig {
  permissions: PermissionType[];
  scope: ScopeType;
}

export interface UserSecurityScope {
  username: string; // Gmail ID / Login Email
  role: string; // 'Admin' | 'Manager' | 'Superuser' | 'Supervisor' | 'User'
  status: string; // 'Active' | 'Inactive'
  accessLevel: string[]; // Allowed navigation modules
  supervisorName: string;
  accessLimitType: AccessLimitType;
  assignedEmployeeIds: string[];
  assignedDepartment: string;
  employeeId?: string; // Unique Employee ID (e.g. EMP001)
  employeeName?: string; // Resolved Full Name (e.g. "Md. Noor Alam")
  employeeDesignation?: string;
  inputPermissions?: string[]; // Allowed input/editing modules
  defaultNavigator?: string; // Assigned Default Navigator
  customModulePermissions?: Record<string, ModulePermissionConfig>; // User-specific overrides
  deniedPermissions?: Record<string, PermissionType[]>; // Explicitly denied actions
  isAdmin: boolean;
  isManager: boolean;
  isSuperuser: boolean;
  isSupervisor: boolean;
  isUser: boolean;
}

export const SUPER_ADMIN_EMAILS = [
  'noor.alam1750@gmail.com',
  'smltrimsbd@gmail.com'
];

export const ALL_SYSTEM_MODULES = [
  { id: 'dashboard', name: 'ERP Dashboard', category: 'Executive & Overview' },
  { id: 'tasks', name: 'Daily Tasks', category: 'Operations' },
  { id: 'directory', name: 'Employee Directory', category: 'Human Resources' },
  { id: 'leave', name: 'Leave Management', category: 'Human Resources' },
  { id: 'overtime', name: 'Overtime & Attendance', category: 'Human Resources' },
  { id: 'shifts', name: 'Shift Assignments', category: 'Operations' },
  { id: 'machine', name: 'Machine Capacity', category: 'Production & Engineering' },
  { id: 'skills', name: 'Skill Matrix', category: 'Production & Engineering' },
  { id: 'breakdown', name: 'Breakdown Log', category: 'Production & Engineering' },
  { id: 'kpi', name: 'Monthly KPI', category: 'Performance' },
  { id: 'fives', name: '5S & Visual Management', category: 'Quality & Operations' },
  { id: 'practices', name: 'Best Practices', category: 'Quality & Operations' },
  { id: 'reports', name: 'Reports & Export', category: 'Analytics' },
  { id: 'navigator', name: 'Navigator Settings', category: 'System Navigation' },
  { id: 'supervisors', name: 'Supervisors Registry', category: 'Security & Access' },
  { id: 'holidays', name: 'Official Holidays & Calendar', category: 'System Calendar' },
  { id: 'settings', name: 'Security & Access Control', category: 'Administration' },
  { id: 'database', name: 'Google Drive & Cloud DB', category: 'Administration' }
];

export const ALL_PERMISSION_TYPES: { id: PermissionType; name: string; desc: string }[] = [
  { id: 'view', name: 'View', desc: 'Read-only access to view pages, tables, and records' },
  { id: 'create', name: 'Create', desc: 'Create new entries, logs, applications, and items' },
  { id: 'edit', name: 'Edit', desc: 'Modify and update existing records' },
  { id: 'delete', name: 'Delete', desc: 'Permanently remove or cancel records' },
  { id: 'approve', name: 'Approve', desc: 'Authorize, sign-off, or approve workflow requests' },
  { id: 'reject', name: 'Reject', desc: 'Decline or reject submitted requests' },
  { id: 'assign', name: 'Assign', desc: 'Assign staff, shifts, machines, or tasks' },
  { id: 'export', name: 'Export', desc: 'Download CSV, Excel, or PDF report outputs' },
  { id: 'import', name: 'Import', desc: 'Bulk upload or import spreadsheet datasets' },
  { id: 'print', name: 'Print', desc: 'Generate printable forms, slips, and documents' },
  { id: 'configure', name: 'Configure', desc: 'Manage module configurations and formulas' },
  { id: 'manage', name: 'Manage', desc: 'Full administrative control over this module' }
];

export const ALL_SCOPE_TYPES: ScopeType[] = [
  'All Data',
  'Department',
  'Section',
  'Team',
  'Assigned Staff',
  'Own Data',
  'Assigned Navigator',
  'Assigned Machine',
  'Assigned Shift'
];

/**
 * Standard Role Default Permissions Matrix
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Record<string, ModulePermissionConfig>> = {
  Admin: {
    dashboard: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    tasks: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    directory: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    leave: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    overtime: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    shifts: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    machine: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    skills: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    breakdown: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    kpi: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    fives: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    practices: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    reports: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    navigator: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    supervisors: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    holidays: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    settings: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' },
    database: { permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'configure', 'manage'], scope: 'All Data' }
  },
  Manager: {
    dashboard: { permissions: ['view', 'export', 'print'], scope: 'Department' },
    tasks: { permissions: ['view', 'create', 'edit', 'assign', 'export', 'print'], scope: 'Department' },
    directory: { permissions: ['view', 'create', 'edit', 'assign', 'export', 'print'], scope: 'Department' },
    leave: { permissions: ['view', 'create', 'edit', 'approve', 'reject', 'export', 'print'], scope: 'Department' },
    overtime: { permissions: ['view', 'create', 'edit', 'approve', 'export', 'print'], scope: 'Department' },
    shifts: { permissions: ['view', 'create', 'edit', 'assign', 'export', 'print'], scope: 'Department' },
    machine: { permissions: ['view', 'create', 'edit', 'export'], scope: 'Department' },
    skills: { permissions: ['view', 'create', 'edit', 'assign', 'export'], scope: 'Department' },
    breakdown: { permissions: ['view', 'create', 'edit', 'approve', 'export'], scope: 'Department' },
    kpi: { permissions: ['view', 'create', 'edit', 'approve', 'export'], scope: 'Department' },
    fives: { permissions: ['view', 'create', 'edit', 'approve', 'export', 'print'], scope: 'Department' },
    practices: { permissions: ['view', 'create', 'edit', 'export'], scope: 'Department' },
    reports: { permissions: ['view', 'export', 'print'], scope: 'Department' },
    navigator: { permissions: ['view', 'assign'], scope: 'Department' },
    supervisors: { permissions: ['view'], scope: 'Department' },
    holidays: { permissions: ['view', 'export'], scope: 'All Data' },
    settings: { permissions: [], scope: 'Own Data' }, // Forbidden unless granted
    database: { permissions: [], scope: 'Own Data' } // Forbidden unless granted
  },
  Superuser: {
    dashboard: { permissions: ['view', 'export', 'print'], scope: 'All Data' },
    tasks: { permissions: ['view', 'create', 'edit', 'assign', 'export'], scope: 'All Data' },
    directory: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    leave: { permissions: ['view', 'create', 'edit', 'approve', 'export'], scope: 'All Data' },
    overtime: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    shifts: { permissions: ['view', 'create', 'edit', 'assign', 'export'], scope: 'All Data' },
    machine: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    skills: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    breakdown: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    kpi: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    fives: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    practices: { permissions: ['view', 'create', 'edit', 'export'], scope: 'All Data' },
    reports: { permissions: ['view', 'export', 'print'], scope: 'All Data' },
    navigator: { permissions: ['view'], scope: 'All Data' },
    supervisors: { permissions: ['view'], scope: 'All Data' },
    holidays: { permissions: ['view'], scope: 'All Data' },
    settings: { permissions: [], scope: 'Own Data' }, // Superuser cannot access security
    database: { permissions: [], scope: 'Own Data' } // Superuser cannot access database migration
  },
  Supervisor: {
    dashboard: { permissions: ['view'], scope: 'Assigned Staff' },
    tasks: { permissions: ['view', 'create', 'edit', 'assign'], scope: 'Assigned Staff' },
    directory: { permissions: ['view'], scope: 'Assigned Staff' },
    leave: { permissions: ['view', 'create', 'approve', 'reject'], scope: 'Assigned Staff' },
    overtime: { permissions: ['view', 'create', 'edit'], scope: 'Assigned Staff' },
    shifts: { permissions: ['view', 'create', 'edit', 'assign'], scope: 'Assigned Staff' },
    machine: { permissions: ['view'], scope: 'Assigned Machine' },
    skills: { permissions: ['view', 'create', 'edit'], scope: 'Assigned Staff' },
    breakdown: { permissions: ['view', 'create'], scope: 'Assigned Machine' },
    kpi: { permissions: ['view', 'create', 'edit'], scope: 'Assigned Staff' },
    fives: { permissions: ['view', 'create', 'edit'], scope: 'Assigned Staff' },
    practices: { permissions: ['view', 'create'], scope: 'Assigned Staff' },
    reports: { permissions: ['view'], scope: 'Assigned Staff' },
    navigator: { permissions: ['view'], scope: 'Assigned Navigator' },
    supervisors: { permissions: ['view'], scope: 'Own Data' },
    holidays: { permissions: ['view'], scope: 'All Data' },
    settings: { permissions: [], scope: 'Own Data' },
    database: { permissions: [], scope: 'Own Data' }
  },
  User: {
    dashboard: { permissions: ['view'], scope: 'Own Data' },
    tasks: { permissions: ['view', 'edit'], scope: 'Own Data' },
    directory: { permissions: ['view'], scope: 'Own Data' },
    leave: { permissions: ['view', 'create'], scope: 'Own Data' },
    overtime: { permissions: ['view'], scope: 'Own Data' },
    shifts: { permissions: ['view'], scope: 'Own Data' },
    machine: { permissions: ['view'], scope: 'Assigned Machine' },
    skills: { permissions: ['view'], scope: 'Own Data' },
    breakdown: { permissions: ['view', 'create'], scope: 'Assigned Machine' },
    kpi: { permissions: ['view'], scope: 'Own Data' },
    fives: { permissions: ['view'], scope: 'Own Data' },
    practices: { permissions: ['view', 'create'], scope: 'Own Data' },
    reports: { permissions: [], scope: 'Own Data' },
    navigator: { permissions: ['view'], scope: 'Assigned Navigator' },
    supervisors: { permissions: ['view'], scope: 'Own Data' },
    holidays: { permissions: ['view'], scope: 'All Data' },
    settings: { permissions: [], scope: 'Own Data' },
    database: { permissions: [], scope: 'Own Data' }
  }
};

// Aliases for legacy role strings
ROLE_DEFAULT_PERMISSIONS['Standard User'] = ROLE_DEFAULT_PERMISSIONS['User'];
ROLE_DEFAULT_PERMISSIONS['Operator'] = ROLE_DEFAULT_PERMISSIONS['User'];

export const DEFAULT_ADMIN_SCOPE: UserSecurityScope = {
  username: 'smltrimsbd@gmail.com',
  role: 'Admin',
  status: 'Active',
  accessLevel: ['All'],
  supervisorName: '',
  accessLimitType: 'all',
  assignedEmployeeIds: [],
  assignedDepartment: '',
  employeeId: 'ADMIN-001',
  employeeName: `Admin (${getCompanyName()})`,
  employeeDesignation: 'System Administrator',
  inputPermissions: ['all'],
  defaultNavigator: 'dashboard',
  isAdmin: true,
  isManager: false,
  isSuperuser: false,
  isSupervisor: true,
  isUser: false
};

/**
 * Parses a raw user row from the 'Users' sheet into a structured UserSecurityScope.
 */
export function parseUserSecurityScope(row: string[] | undefined, currentUserEmail?: string): UserSecurityScope {
  const emailLower = (currentUserEmail || '').toLowerCase();
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower);

  if (!row || row.length === 0) {
    if (isSuperAdminEmail) {
      return {
        ...DEFAULT_ADMIN_SCOPE,
        username: currentUserEmail || DEFAULT_ADMIN_SCOPE.username,
        employeeName: emailLower === 'noor.alam1750@gmail.com' ? 'Md. Noor Alam' : `Admin (${getCompanyName()})`
      };
    }
    const cleanEmail = currentUserEmail || '';
    const fallbackName = formatEmailToName(cleanEmail);
    return {
      username: cleanEmail,
      role: 'User',
      status: 'Active',
      accessLevel: ['Employee Directory'],
      supervisorName: '',
      accessLimitType: 'self',
      assignedEmployeeIds: [],
      assignedDepartment: '',
      employeeId: '',
      employeeName: fallbackName,
      employeeDesignation: 'User',
      inputPermissions: [],
      defaultNavigator: 'dashboard',
      isAdmin: false,
      isManager: false,
      isSuperuser: false,
      isSupervisor: false,
      isUser: true
    };
  }

  const username = String(row[0] || '').trim();
  const userLower = username.toLowerCase();
  let rawRole = String(row[2] || 'User').trim();
  if (rawRole === 'Standard User' || rawRole === 'Operator') rawRole = 'User';
  
  const status = String(row[3] || 'Active').trim();
  const accessLevel = row[4] ? row[4].split(',').map(s => s.trim()).filter(Boolean) : [];
  const supervisorName = String(row[5] || '').trim();
  
  let accessLimitType: AccessLimitType = (row[6] as AccessLimitType) || 'all';
  if (!['all', 'supervised', 'department', 'selected', 'self'].includes(accessLimitType)) {
    accessLimitType = rawRole === 'Admin' ? 'all' : rawRole === 'Manager' ? 'department' : rawRole === 'Supervisor' ? 'supervised' : 'self';
  }

  const assignedEmployeeIds = row[7] 
    ? row[7].split(',').map(s => s.trim().toUpperCase()).filter(Boolean) 
    : [];
  
  const assignedDepartment = String(row[8] || '').trim();
  const employeeId = String(row[9] || '').trim();
  let employeeName = String(row[10] || '').trim();

  if (!employeeName) {
    employeeName = formatEmailToName(username || currentUserEmail || '');
  }

  const inputPermissions = row[11] 
    ? row[11].split(',').map(s => s.trim().toLowerCase()).filter(Boolean) 
    : (rawRole === 'Admin' ? ['all'] : []);

  let defaultNavigator = String(row[12] || '').trim();
  if (!defaultNavigator && username) {
    try {
      const stored = localStorage.getItem(`erp_user_default_nav_${username.toLowerCase()}`);
      if (stored) defaultNavigator = stored.trim();
    } catch (_) {}
  }

  // Load custom module permissions overrides if stored in local storage
  let customModulePermissions: Record<string, ModulePermissionConfig> | undefined = undefined;
  let deniedPermissions: Record<string, PermissionType[]> | undefined = undefined;
  try {
    const customStored = localStorage.getItem(`erp_custom_perms_${userLower}`);
    if (customStored) customModulePermissions = JSON.parse(customStored);
    const deniedStored = localStorage.getItem(`erp_denied_perms_${userLower}`);
    if (deniedStored) deniedPermissions = JSON.parse(deniedStored);
  } catch (_) {}

  const isEmailAdmin = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === userLower || e.toLowerCase() === emailLower);
  const isAdmin = isEmailAdmin || rawRole.toLowerCase() === 'admin';
  const isManager = !isAdmin && rawRole.toLowerCase() === 'manager';
  const isSuperuser = !isAdmin && !isManager && rawRole.toLowerCase() === 'superuser';
  const isSupervisor = !isAdmin && !isManager && !isSuperuser && rawRole.toLowerCase() === 'supervisor';
  const isUser = !isAdmin && !isManager && !isSuperuser && !isSupervisor;

  return {
    username,
    role: isAdmin ? 'Admin' : isManager ? 'Manager' : isSuperuser ? 'Superuser' : isSupervisor ? 'Supervisor' : 'User',
    status,
    accessLevel,
    supervisorName,
    accessLimitType,
    assignedEmployeeIds,
    assignedDepartment,
    employeeId,
    employeeName: employeeName || (isAdmin ? 'Md. Noor Alam' : formatEmailToName(username)),
    inputPermissions,
    defaultNavigator,
    customModulePermissions,
    deniedPermissions,
    isAdmin,
    isManager,
    isSuperuser,
    isSupervisor,
    isUser
  };
}

export interface EffectivePermissionResult {
  allowed: boolean;
  source: 'Admin Full Control' | 'User Override' | 'Explicit Deny' | 'Role Default' | 'System Default';
  scope: ScopeType;
  permissionType: PermissionType;
  moduleKey: string;
}

/**
 * Calculates user-wise effective access for a specific module and action.
 * Priority: Admin Override -> User Override / Deny -> Role Permission -> System Default
 */
export function calculateEffectiveUserPermissions(
  scope: UserSecurityScope | null | undefined,
  moduleKey: string,
  action: PermissionType
): EffectivePermissionResult {
  if (!scope) {
    return { allowed: false, source: 'System Default', scope: 'Own Data', permissionType: action, moduleKey };
  }

  // 1. Admin Full Control
  if (scope.isAdmin) {
    return { allowed: true, source: 'Admin Full Control', scope: 'All Data', permissionType: action, moduleKey };
  }

  const roleKey = scope.role || 'User';
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[roleKey]?.[moduleKey] || { permissions: [], scope: 'Own Data' };

  // 2. Check Explicit Deny
  if (scope.deniedPermissions && scope.deniedPermissions[moduleKey]?.includes(action)) {
    return { allowed: false, source: 'Explicit Deny', scope: roleDefaults.scope, permissionType: action, moduleKey };
  }

  // 3. Check User Override
  if (scope.customModulePermissions && scope.customModulePermissions[moduleKey]) {
    const userCustom = scope.customModulePermissions[moduleKey];
    if (userCustom.permissions.includes(action)) {
      return { allowed: true, source: 'User Override', scope: userCustom.scope || roleDefaults.scope, permissionType: action, moduleKey };
    }
  }

  // 4. Role Default
  if (roleDefaults.permissions.includes(action)) {
    return { allowed: true, source: 'Role Default', scope: roleDefaults.scope, permissionType: action, moduleKey };
  }

  return { allowed: false, source: 'Role Default', scope: roleDefaults.scope, permissionType: action, moduleKey };
}

/**
 * Checks if user is permitted to perform a specific action in a module.
 */
export function canUserPerformAction(
  scope: UserSecurityScope | null | undefined,
  moduleKey: string,
  action: PermissionType
): boolean {
  return calculateEffectiveUserPermissions(scope, moduleKey, action).allowed;
}

export interface PermissionConflict {
  id: string;
  type: 'EditWithoutView' | 'DeleteWithoutView' | 'DeleteWithoutEdit' | 'ApproveWithoutView' | 'ExportWithoutView' | 'ConfigureWithoutView';
  severity: 'High' | 'Medium' | 'Low';
  moduleKey: string;
  moduleName: string;
  description: string;
  recommendation: string;
  autoFixAction: () => void;
}

/**
 * Automatically analyzes and detects logical permission conflicts for a user or role.
 */
export function detectPermissionConflicts(scope: UserSecurityScope): PermissionConflict[] {
  const conflicts: PermissionConflict[] = [];
  if (scope.isAdmin) return conflicts; // Admin has full consistent rights

  ALL_SYSTEM_MODULES.forEach(mod => {
    const canView = calculateEffectiveUserPermissions(scope, mod.id, 'view').allowed;
    const canEdit = calculateEffectiveUserPermissions(scope, mod.id, 'edit').allowed;
    const canDelete = calculateEffectiveUserPermissions(scope, mod.id, 'delete').allowed;
    const canApprove = calculateEffectiveUserPermissions(scope, mod.id, 'approve').allowed;
    const canExport = calculateEffectiveUserPermissions(scope, mod.id, 'export').allowed;
    const canConfigure = calculateEffectiveUserPermissions(scope, mod.id, 'configure').allowed;

    if (canEdit && !canView) {
      conflicts.push({
        id: `${scope.username}_${mod.id}_edit_no_view`,
        type: 'EditWithoutView',
        severity: 'High',
        moduleKey: mod.id,
        moduleName: mod.name,
        description: `User "${scope.employeeName || scope.username}" has EDIT permission on ${mod.name} but VIEW is disabled.`,
        recommendation: `Enable View permission or remove Edit permission for ${mod.name}.`,
        autoFixAction: () => grantUserPermissionOverride(scope.username, mod.id, 'view')
      });
    }

    if (canDelete && !canView) {
      conflicts.push({
        id: `${scope.username}_${mod.id}_delete_no_view`,
        type: 'DeleteWithoutView',
        severity: 'High',
        moduleKey: mod.id,
        moduleName: mod.name,
        description: `User "${scope.employeeName || scope.username}" has DELETE permission on ${mod.name} but VIEW is disabled.`,
        recommendation: `Enable View & Edit permissions or revoke Delete permission.`,
        autoFixAction: () => grantUserPermissionOverride(scope.username, mod.id, 'view')
      });
    }

    if (canDelete && !canEdit) {
      conflicts.push({
        id: `${scope.username}_${mod.id}_delete_no_edit`,
        severity: 'Medium',
        type: 'DeleteWithoutEdit',
        moduleKey: mod.id,
        moduleName: mod.name,
        description: `User "${scope.employeeName || scope.username}" has DELETE permission on ${mod.name} without standard EDIT capability.`,
        recommendation: `Grant Edit permission or remove Delete capability.`,
        autoFixAction: () => grantUserPermissionOverride(scope.username, mod.id, 'edit')
      });
    }

    if (canApprove && !canView) {
      conflicts.push({
        id: `${scope.username}_${mod.id}_approve_no_view`,
        type: 'ApproveWithoutView',
        severity: 'High',
        moduleKey: mod.id,
        moduleName: mod.name,
        description: `User "${scope.employeeName || scope.username}" can APPROVE on ${mod.name} but cannot view records.`,
        recommendation: `Enable View permission for ${mod.name}.`,
        autoFixAction: () => grantUserPermissionOverride(scope.username, mod.id, 'view')
      });
    }

    if (canExport && !canView) {
      conflicts.push({
        id: `${scope.username}_${mod.id}_export_no_view`,
        type: 'ExportWithoutView',
        severity: 'Medium',
        moduleKey: mod.id,
        moduleName: mod.name,
        description: `User "${scope.employeeName || scope.username}" has EXPORT permission on ${mod.name} without View permission.`,
        recommendation: `Grant View permission or revoke Export.`,
        autoFixAction: () => grantUserPermissionOverride(scope.username, mod.id, 'view')
      });
    }

    if (canConfigure && !canView) {
      conflicts.push({
        id: `${scope.username}_${mod.id}_config_no_view`,
        type: 'ConfigureWithoutView',
        severity: 'High',
        moduleKey: mod.id,
        moduleName: mod.name,
        description: `User has CONFIGURE permission on ${mod.name} without base View access.`,
        recommendation: `Grant View permission for ${mod.name}.`,
        autoFixAction: () => grantUserPermissionOverride(scope.username, mod.id, 'view')
      });
    }
  });

  return conflicts;
}

export function grantUserPermissionOverride(username: string, moduleKey: string, action: PermissionType) {
  try {
    const userKey = username.toLowerCase();
    const existingStr = localStorage.getItem(`erp_custom_perms_${userKey}`);
    const existing: Record<string, ModulePermissionConfig> = existingStr ? JSON.parse(existingStr) : {};
    
    if (!existing[moduleKey]) {
      existing[moduleKey] = { permissions: [action], scope: 'Department' };
    } else if (!existing[moduleKey].permissions.includes(action)) {
      existing[moduleKey].permissions.push(action);
    }
    localStorage.setItem(`erp_custom_perms_${userKey}`, JSON.stringify(existing));
    
    // Also remove from denied if present
    const deniedStr = localStorage.getItem(`erp_denied_perms_${userKey}`);
    if (deniedStr) {
      const denied: Record<string, PermissionType[]> = JSON.parse(deniedStr);
      if (denied[moduleKey]) {
        denied[moduleKey] = denied[moduleKey].filter(p => p !== action);
        localStorage.setItem(`erp_denied_perms_${userKey}`, JSON.stringify(denied));
      }
    }
  } catch (_) {}
}

export type AccessNotSetCategory = 'User Configuration' | 'Role Configuration' | 'Module Configuration' | 'Assignment Configuration' | 'Security Configuration';

export interface AccessNotSetIssue {
  id: string;
  category: AccessNotSetCategory;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  description: string;
  targetEntity: string;
  targetType: 'User' | 'Role' | 'Module' | 'Employee' | 'Supervisor' | 'Calendar' | 'Navigator';
  actionLabel: string;
  onFix?: () => void;
}

export interface AccessAuditReport {
  totalChecks: number;
  totalConfigured: number;
  totalIssues: number;
  completionPercentage: number;
  health: '🟢 Secure / Complete' | '🟡 Attention Required' | '🔴 Configuration Incomplete' | '⚠️ Conflicts Detected';
  healthColor: 'green' | 'amber' | 'red' | 'purple';
  issuesByCategory: Record<AccessNotSetCategory, AccessNotSetIssue[]>;
  summary: {
    totalUsers: number;
    fullyConfiguredUsers: number;
    partiallyConfiguredUsers: number;
    accessNotSetUsers: number;
    conflictingUsers: number;
    inactiveUsers: number;
    rolesConfiguredCount: number;
    modulesConfiguredCount: number;
    missingAssignmentsCount: number;
    missingNavigatorsCount: number;
  };
}

/**
 * Scans the entire application dynamically to identify missing access settings,
 * incomplete configurations, missing supervisors, unassigned navigators, and permission conflicts.
 */
export function scanApplicationAccessStatus(
  users: string[][],
  employees: string[][],
  supervisors: string[][],
  holidaySettingsCount = 10
): AccessAuditReport {
  const issuesByCategory: Record<AccessNotSetCategory, AccessNotSetIssue[]> = {
    'User Configuration': [],
    'Role Configuration': [],
    'Module Configuration': [],
    'Assignment Configuration': [],
    'Security Configuration': []
  };

  const parsedUsers = users.map(u => parseUserSecurityScope(u));
  const activeUsers = parsedUsers.filter(u => u.status === 'Active');
  
  let fullyConfiguredUsers = 0;
  let partiallyConfiguredUsers = 0;
  let accessNotSetUsers = 0;
  let conflictingUsers = 0;
  let inactiveUsers = parsedUsers.filter(u => u.status !== 'Active').length;
  let missingAssignmentsCount = 0;
  let missingNavigatorsCount = 0;

  // 1. Scan User Configurations
  parsedUsers.forEach((u, idx) => {
    let userIssuesCount = 0;
    const conflicts = detectPermissionConflicts(u);
    if (conflicts.length > 0) {
      conflictingUsers++;
      conflicts.forEach(c => {
        issuesByCategory['Security Configuration'].push({
          id: `sec_${c.id}`,
          category: 'Security Configuration',
          severity: c.severity === 'High' ? 'Critical' : 'Warning',
          title: `Permission Conflict: ${c.moduleName}`,
          description: c.description,
          targetEntity: u.username,
          targetType: 'User',
          actionLabel: 'Resolve Conflict'
        });
      });
    }

    if (!u.role || u.role.trim() === '') {
      userIssuesCount++;
      issuesByCategory['User Configuration'].push({
        id: `user_no_role_${idx}`,
        category: 'User Configuration',
        severity: 'Critical',
        title: 'User without Assigned Role',
        description: `Account "${u.username}" has no primary role defined. System cannot establish access hierarchy.`,
        targetEntity: u.username,
        targetType: 'User',
        actionLabel: 'Assign Role'
      });
    }

    if (!u.assignedDepartment && !u.isAdmin) {
      userIssuesCount++;
      issuesByCategory['User Configuration'].push({
        id: `user_no_dept_${idx}`,
        category: 'User Configuration',
        severity: 'Warning',
        title: 'User without Department Scope',
        description: `User "${u.employeeName || u.username}" is not mapped to an organizational department.`,
        targetEntity: u.username,
        targetType: 'User',
        actionLabel: 'Set Department'
      });
    }

    if ((u.role === 'User' || u.role === 'Supervisor') && !u.supervisorName && !u.assignedDepartment) {
      userIssuesCount++;
      missingAssignmentsCount++;
      issuesByCategory['User Configuration'].push({
        id: `user_no_sup_${idx}`,
        category: 'User Configuration',
        severity: 'Warning',
        title: 'User without Direct Supervisor',
        description: `Account "${u.username}" has no direct reporting supervisor or departmental link.`,
        targetEntity: u.username,
        targetType: 'User',
        actionLabel: 'Assign Supervisor'
      });
    }

    if (!u.defaultNavigator) {
      userIssuesCount++;
      missingNavigatorsCount++;
      issuesByCategory['User Configuration'].push({
        id: `user_no_nav_${idx}`,
        category: 'User Configuration',
        severity: 'Warning',
        title: 'Default Navigator Not Set',
        description: `User "${u.username}" is missing an explicit Default Landing Navigator. Currently using fallback.`,
        targetEntity: u.username,
        targetType: 'Navigator',
        actionLabel: 'Set Default Navigator'
      });
    }

    if (!u.username || !u.username.includes('@')) {
      userIssuesCount++;
      issuesByCategory['User Configuration'].push({
        id: `user_invalid_email_${idx}`,
        category: 'User Configuration',
        severity: 'Critical',
        title: 'Invalid / Missing Gmail Mapping',
        description: `User record "${u.username || 'EMPTY'}" has an invalid email identity for Google OAuth.`,
        targetEntity: u.username,
        targetType: 'User',
        actionLabel: 'Fix Gmail ID'
      });
    }

    if (u.status !== 'Active') {
      // Inactive check
    } else if (userIssuesCount === 0 && conflicts.length === 0) {
      fullyConfiguredUsers++;
    } else if (userIssuesCount <= 1 && conflicts.length === 0) {
      partiallyConfiguredUsers++;
    } else {
      accessNotSetUsers++;
    }
  });

  // Duplicate User Mapping Check
  const emailCounts = new Map<string, number>();
  parsedUsers.forEach(u => {
    const key = u.username.toLowerCase();
    emailCounts.set(key, (emailCounts.get(key) || 0) + 1);
  });
  emailCounts.forEach((count, email) => {
    if (count > 1) {
      issuesByCategory['User Configuration'].push({
        id: `user_dup_${email}`,
        category: 'User Configuration',
        severity: 'Critical',
        title: 'Duplicate User Account Mapping',
        description: `Email "${email}" exists ${count} times in the Users sheet. Potential security ambiguity.`,
        targetEntity: email,
        targetType: 'User',
        actionLabel: 'Merge / Clean Accounts'
      });
    }
  });

  // 2. Scan Role Configurations
  const standardRoles: UserRole[] = ['Admin', 'Manager', 'Superuser', 'Supervisor', 'User'];
  standardRoles.forEach(role => {
    const perms = ROLE_DEFAULT_PERMISSIONS[role];
    if (!perms) {
      issuesByCategory['Role Configuration'].push({
        id: `role_unconfigured_${role}`,
        category: 'Role Configuration',
        severity: 'Critical',
        title: `Role Permissions Not Configured: ${role}`,
        description: `The role "${role}" has no module permission matrix configured.`,
        targetEntity: role,
        targetType: 'Role',
        actionLabel: 'Configure Role'
      });
    }
  });

  // 3. Scan Assignment Configuration (Employees without supervisor, inactive supervisor, etc.)
  const validSupervisorNames = new Set<string>();
  supervisors.forEach(s => {
    if (s[0]) validSupervisorNames.add(s[0].trim().toLowerCase());
  });

  employees.forEach((emp, idx) => {
    const empId = emp[0] || `EMP-${idx}`;
    const empName = emp[1] || 'Unknown';
    const empSup = (emp[6] || '').trim();
    const empDept = (emp[3] || '').trim();

    if (!empSup) {
      missingAssignmentsCount++;
      issuesByCategory['Assignment Configuration'].push({
        id: `emp_no_sup_${empId}`,
        category: 'Assignment Configuration',
        severity: 'Warning',
        title: `Staff without Supervisor: ${empId}`,
        description: `Staff member "${empName}" (${empDept}) has no supervisor assigned for leave and overtime approval.`,
        targetEntity: empName,
        targetType: 'Employee',
        actionLabel: 'Assign Supervisor'
      });
    } else if (validSupervisorNames.size > 0 && !validSupervisorNames.has(empSup.toLowerCase())) {
      issuesByCategory['Assignment Configuration'].push({
        id: `emp_invalid_sup_${empId}`,
        category: 'Assignment Configuration',
        severity: 'Warning',
        title: `Supervisor Not in Registry: ${empSup}`,
        description: `Staff member "${empName}" is assigned to "${empSup}", who is not registered in the Supervisors Registry.`,
        targetEntity: empSup,
        targetType: 'Supervisor',
        actionLabel: 'Register Supervisor'
      });
    }
  });

  // 4. Module Configuration Check
  ALL_SYSTEM_MODULES.forEach(mod => {
    const hasAdmin = ROLE_DEFAULT_PERMISSIONS['Admin']?.[mod.id];
    const hasManager = ROLE_DEFAULT_PERMISSIONS['Manager']?.[mod.id];
    if (!hasAdmin || !hasManager) {
      issuesByCategory['Module Configuration'].push({
        id: `mod_rule_missing_${mod.id}`,
        category: 'Module Configuration',
        severity: 'Warning',
        title: `Module Missing Security Rules: ${mod.name}`,
        description: `The module "${mod.name}" does not have complete permission definitions across all roles.`,
        targetEntity: mod.name,
        targetType: 'Module',
        actionLabel: 'Define Access Rules'
      });
    }
  });

  // Calculate totals and statistics
  const allIssuesList = Object.values(issuesByCategory).flat();
  const totalIssues = allIssuesList.length;
  const criticalCount = allIssuesList.filter(i => i.severity === 'Critical').length;
  const conflictCount = issuesByCategory['Security Configuration'].length;
  
  // Total checklist items evaluated across users, roles, modules, assignments, calendar
  const totalChecks = parsedUsers.length * 5 + standardRoles.length * 3 + ALL_SYSTEM_MODULES.length * 2 + employees.length;
  const totalConfigured = Math.max(0, totalChecks - totalIssues);
  const completionPercentage = Math.round((totalConfigured / Math.max(1, totalChecks)) * 100);

  let health: '🟢 Secure / Complete' | '🟡 Attention Required' | '🔴 Configuration Incomplete' | '⚠️ Conflicts Detected' = '🟢 Secure / Complete';
  let healthColor: 'green' | 'amber' | 'red' | 'purple' = 'green';

  if (conflictCount > 0) {
    health = '⚠️ Conflicts Detected';
    healthColor = 'purple';
  } else if (criticalCount > 0 || completionPercentage < 80) {
    health = '🔴 Configuration Incomplete';
    healthColor = 'red';
  } else if (totalIssues > 0 || completionPercentage < 95) {
    health = '🟡 Attention Required';
    healthColor = 'amber';
  }

  return {
    totalChecks,
    totalConfigured,
    totalIssues,
    completionPercentage,
    health,
    healthColor,
    issuesByCategory,
    summary: {
      totalUsers: parsedUsers.length,
      fullyConfiguredUsers,
      partiallyConfiguredUsers,
      accessNotSetUsers,
      conflictingUsers,
      inactiveUsers,
      rolesConfiguredCount: standardRoles.length,
      modulesConfiguredCount: ALL_SYSTEM_MODULES.length,
      missingAssignmentsCount,
      missingNavigatorsCount
    }
  };
}

export interface SecurityAuditLogEntry {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  adminEmail: string;
  targetUser: string;
  role: string;
  module: string;
  actionType: string;
  previousPermission: string;
  newPermission: string;
  source: 'Role Default' | 'User Override' | 'Admin Override' | 'Conflict Auto-Fix' | 'Bulk Assignment' | 'System Default' | 'Authentication System';
  reason: string;
}

/**
 * Records a security audit log entry.
 */
export function recordSecurityAuditLog(entry: Omit<SecurityAuditLogEntry, 'id' | 'timestamp' | 'date' | 'time'>) {
  try {
    const now = new Date();
    const fullEntry: SecurityAuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      ...entry
    };

    const existingStr = localStorage.getItem('erp_security_audit_log');
    const logs: SecurityAuditLogEntry[] = existingStr ? JSON.parse(existingStr) : [];
    logs.unshift(fullEntry);
    
    // Keep last 500 audit logs
    localStorage.setItem('erp_security_audit_log', JSON.stringify(logs.slice(0, 500)));
  } catch (err) {
    console.error('Failed to write security audit log:', err);
  }
}

/**
 * Retrieves the recorded security audit logs.
 */
export function getSecurityAuditLogs(): SecurityAuditLogEntry[] {
  try {
    const existingStr = localStorage.getItem('erp_security_audit_log');
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Converts a Gmail/email address into a nicely formatted human name.
 */
export function formatEmailToName(email: string): string {
  if (!email) return 'User';
  if (email.toLowerCase() === 'noor.alam1750@gmail.com') return 'Md. Noor Alam';
  if (email.toLowerCase() === 'smltrimsbd@gmail.com') return `Admin (${getCompanyName()})`;
  
  const localPart = email.split('@')[0] || '';
  const cleanStr = localPart.replace(/\d+$/, '').replace(/[._-]+/g, ' ').trim();
  if (!cleanStr) return email;
  
  return cleanStr
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Enriches a UserSecurityScope with details from the Employees sheet if available.
 */
export function enrichUserWithEmployeeData(
  scope: UserSecurityScope,
  employees: any[]
): UserSecurityScope {
  if (!employees || employees.length === 0) return scope;

  // 1. Try to find by unique employeeId
  if (scope.employeeId) {
    const matched = employees.find((e: any) => {
      const id = Array.isArray(e) ? String(e[0] || '').trim() : String(e?.id || e?.ID_No || '').trim();
      return id.toUpperCase() === scope.employeeId?.toUpperCase();
    });
    if (matched) {
      const name = Array.isArray(matched) ? String(matched[1] || '').trim() : String(matched?.name || '').trim();
      const desig = Array.isArray(matched) ? String(matched[2] || '').trim() : String(matched?.designation || '').trim();
      const dept = Array.isArray(matched) ? String(matched[3] || '').trim() : String(matched?.department || '').trim();
      return {
        ...scope,
        employeeName: name || scope.employeeName,
        employeeDesignation: desig || scope.employeeDesignation,
        assignedDepartment: scope.assignedDepartment || dept
      };
    }
  }

  // 2. Try to match by email in employee row
  const userLower = (scope.username || '').toLowerCase();
  if (userLower) {
    const matched = employees.find((e: any) => {
      const name = Array.isArray(e) ? String(e[1] || '').trim().toLowerCase() : String(e?.name || '').trim().toLowerCase();
      const id = Array.isArray(e) ? String(e[0] || '').trim().toUpperCase() : String(e?.id || '').trim().toUpperCase();
      const phone = Array.isArray(e) ? String(e[11] || '').trim().toLowerCase() : String(e?.phone || '').trim().toLowerCase();
      
      if (phone && phone.includes(userLower)) return true;
      if (userLower.includes(name) && name.length > 3) return true;
      if (id && userLower.startsWith(id.toLowerCase())) return true;
      return false;
    });

    if (matched) {
      const id = Array.isArray(matched) ? String(matched[0] || '').trim() : String(matched?.id || '').trim();
      const name = Array.isArray(matched) ? String(matched[1] || '').trim() : String(matched?.name || '').trim();
      const desig = Array.isArray(matched) ? String(matched[2] || '').trim() : String(matched?.designation || '').trim();
      const dept = Array.isArray(matched) ? String(matched[3] || '').trim() : String(matched?.department || '').trim();
      return {
        ...scope,
        employeeId: scope.employeeId || id,
        employeeName: name || scope.employeeName,
        employeeDesignation: desig || scope.employeeDesignation,
        assignedDepartment: scope.assignedDepartment || dept
      };
    }
  }

  return scope;
}

/**
 * Checks if an employee is authorized for the given security scope.
 */
export function isEmployeeAuthorized(
  emp: Employee | string[] | any,
  scope: UserSecurityScope | null | undefined
): boolean {
  if (!scope || scope.isAdmin || scope.accessLimitType === 'all') {
    return true;
  }

  let id = '';
  let name = '';
  let department = '';
  let supervisor = '';
  let manager = '';

  if (Array.isArray(emp)) {
    id = String(emp[0] || '').trim();
    name = String(emp[1] || '').trim();
    department = String(emp[3] || '').trim();
    supervisor = String(emp[6] || '').trim();
    manager = String(emp[17] || '').trim();
  } else if (emp && typeof emp === 'object') {
    id = String(emp.id || emp.ID_No || '').trim();
    name = String(emp.name || emp.Name || '').trim();
    department = String(emp.department || emp.Department || '').trim();
    supervisor = String(emp.supervisor || emp.Supervisor_Name || '').trim();
    manager = String(emp.manager || emp.Manager || '').trim();
  }

  const normalizedId = id.toUpperCase();
  const normalizedName = name.toLowerCase();

  // If specific assigned employees are chosen
  if (scope.accessLimitType === 'selected') {
    return scope.assignedEmployeeIds.some(aid => aid.toUpperCase() === normalizedId);
  }

  // If supervised direct reports
  if (scope.accessLimitType === 'supervised') {
    const supToMatch = (scope.supervisorName || scope.employeeName || scope.username).toLowerCase();
    const isDirectReport = (supervisor && supervisor.toLowerCase().includes(supToMatch)) ||
                           (manager && manager.toLowerCase().includes(supToMatch)) ||
                           (supToMatch && (supervisor.toLowerCase() === supToMatch || manager.toLowerCase() === supToMatch));
    
    if (isDirectReport) return true;
    if (scope.assignedEmployeeIds.some(aid => aid.toUpperCase() === normalizedId)) return true;
    return false;
  }

  // If department scope
  if (scope.accessLimitType === 'department') {
    const deptToMatch = (scope.assignedDepartment || '').toLowerCase();
    if (deptToMatch && department.toLowerCase().includes(deptToMatch)) return true;
    if (scope.assignedEmployeeIds.some(aid => aid.toUpperCase() === normalizedId)) return true;
    return false;
  }

  // If self only
  if (scope.accessLimitType === 'self') {
    if (scope.employeeId && normalizedId === scope.employeeId.toUpperCase()) return true;
    const userLower = scope.username.toLowerCase();
    if (normalizedId === userLower.toUpperCase()) return true;
    if (normalizedName && (userLower.includes(normalizedName) || normalizedName.includes(userLower.split('@')[0]))) return true;
    if (scope.assignedEmployeeIds.some(aid => aid.toUpperCase() === normalizedId)) return true;
    return false;
  }

  if (scope.assignedEmployeeIds.length > 0) {
    return scope.assignedEmployeeIds.some(aid => aid.toUpperCase() === normalizedId);
  }

  if (scope.supervisorName) {
    const supLower = scope.supervisorName.toLowerCase();
    if (supervisor && supervisor.toLowerCase() === supLower) return true;
    if (manager && manager.toLowerCase() === supLower) return true;
  }

  return false;
}

/**
 * Filters a list of employees to only those authorized for the current user.
 */
export function filterAuthorizedEmployees<T extends Employee | string[] | any>(
  employees: T[],
  scope: UserSecurityScope | null | undefined
): T[] {
  if (!scope || scope.isAdmin || scope.accessLimitType === 'all') {
    return employees;
  }
  return employees.filter(emp => isEmployeeAuthorized(emp, scope));
}

/**
 * Returns a Set of authorized employee IDs (upper-cased).
 */
export function getAuthorizedEmployeeIdSet(
  employees: (Employee | string[] | any)[],
  scope: UserSecurityScope | null | undefined
): Set<string> {
  const authorized = filterAuthorizedEmployees(employees, scope);
  const set = new Set<string>();
  authorized.forEach(emp => {
    const id = Array.isArray(emp) ? String(emp[0] || '').trim() : String(emp.id || emp.ID_No || '').trim();
    if (id) set.add(id.toUpperCase());
  });
  return set;
}

/**
 * Checks if the user is authorized to perform input/editing in a given module.
 */
export function canUserInput(scope: UserSecurityScope | null | undefined, moduleKey: string): boolean {
  if (!scope || scope.isAdmin) return true;
  if (!scope.inputPermissions || scope.inputPermissions.includes('all')) return true;
  return scope.inputPermissions.includes(moduleKey.toLowerCase());
}

/**
 * Generates a human-friendly description of the user's access limit scope.
 */
export function getAccessLimitDescription(scope: UserSecurityScope, totalAuthCount?: number): string {
  if (scope.isAdmin) {
    return 'Master Admin (Full System Control)';
  }
  if (scope.isManager) {
    return `Manager (${scope.assignedDepartment ? `Dept: ${scope.assignedDepartment}` : 'Department Scope'})`;
  }
  if (scope.isSuperuser) {
    if (scope.accessLimitType === 'all') return 'Superuser (Elevated Enterprise Scope)';
    return `Superuser (${scope.accessLimitType.toUpperCase()} - Scoped)`;
  }
  if (scope.accessLimitType === 'all') {
    return 'Full Access (All Employees)';
  }
  if (scope.accessLimitType === 'supervised') {
    const sup = scope.supervisorName || scope.employeeName || 'Assigned Supervisor';
    return `Supervised Reports (${sup}${totalAuthCount !== undefined ? ` - ${totalAuthCount} staff` : ''})`;
  }
  if (scope.accessLimitType === 'selected') {
    const count = scope.assignedEmployeeIds.length;
    return `Custom Selection (${count} employee${count === 1 ? '' : 's'})`;
  }
  if (scope.accessLimitType === 'department') {
    return `Department: ${scope.assignedDepartment || 'Assigned'}`;
  }
  if (scope.accessLimitType === 'self') {
    return 'Self Only (Own Profile)';
  }
  return 'Scoped Access';
}
