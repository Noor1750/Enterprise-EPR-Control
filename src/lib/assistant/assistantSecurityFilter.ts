/**
 * SML Smart Assistant Security & RBAC Enforcement Layer
 * Ensures zero unauthorized data leakage, strict data redaction, prompt injection defense,
 * and compliance with application roles.
 */

import { UserSecurityScope, canUserPerformAction } from '../security';
import { DEFAULT_SYSTEM_NAVIGATORS, hasNavigatorAccess, SystemNavigator } from '../navigators';
import { AssistantAuditEntry } from '../../types/assistant';

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  scopeType: 'all' | 'department' | 'team' | 'self' | 'none';
  sanitizedMessage?: string;
}

/**
 * Validates whether user is allowed to access the specific functional topic.
 */
export function checkTopicAccess(
  topic: 'production' | 'breakdown' | 'manpower' | 'leave' | 'tasks' | 'kpi' | 'employees' | '5s' | 'settings' | 'general',
  userScope?: UserSecurityScope | null
): SecurityCheckResult {
  if (!userScope) {
    return { allowed: false, reason: 'Authentication required to access enterprise data.', scopeType: 'none' };
  }

  // Super Admin has full visibility
  if (userScope.isAdmin) {
    return { allowed: true, scopeType: 'all' };
  }

  switch (topic) {
    case 'settings':
      return {
        allowed: false,
        reason: 'Security & Access Control configurations are strictly restricted to System Administrators.',
        scopeType: 'none'
      };

    case 'employees':
      // General employees can view basic directory, but NOT other salaries or private HR records
      if (userScope.isManager) return { allowed: true, scopeType: 'department' };
      if (userScope.isSupervisor) return { allowed: true, scopeType: 'team' };
      return { allowed: true, scopeType: 'self' };

    case 'leave':
      if (canUserPerformAction(userScope, 'leave', 'view') || userScope.accessLevel.includes('Leave Management') || userScope.accessLevel.includes('All')) {
        if (userScope.isManager) return { allowed: true, scopeType: 'department' };
        if (userScope.isSupervisor) return { allowed: true, scopeType: 'team' };
        return { allowed: true, scopeType: 'all' };
      }
      // Standard employee can only query their own leave records
      return { allowed: true, scopeType: 'self' };

    case 'tasks':
      if (userScope.isManager) return { allowed: true, scopeType: 'department' };
      if (userScope.isSupervisor) return { allowed: true, scopeType: 'team' };
      return { allowed: true, scopeType: 'self' };

    case 'production':
    case 'breakdown':
    case 'manpower':
      if (
        userScope.accessLevel.includes('All') || 
        userScope.accessLevel.includes('Machine & Skills') || 
        userScope.accessLevel.includes('Shift Assignments') ||
        canUserPerformAction(userScope, 'machine', 'view') ||
        canUserPerformAction(userScope, 'breakdown', 'view') ||
        userScope.isManager || 
        userScope.isSupervisor
      ) {
        return { 
          allowed: true, 
          scopeType: userScope.isSupervisor ? 'team' : (userScope.isManager ? 'department' : 'all') 
        };
      }
      return {
        allowed: false,
        reason: 'You do not have access permissions for the Production & Machinery module.',
        scopeType: 'none'
      };

    case 'kpi':
      if (
        userScope.accessLevel.includes('All') || 
        userScope.accessLevel.includes('KPI Performance') || 
        userScope.accessLevel.includes('Monthly KPI') ||
        userScope.isManager || 
        userScope.isSupervisor
      ) {
        return { allowed: true, scopeType: userScope.isSupervisor ? 'team' : 'department' };
      }
      // Standard users can view their own score only
      return { allowed: true, scopeType: 'self' };

    case '5s':
    case 'general':
    default:
      return { allowed: true, scopeType: 'all' };
  }
}

/**
 * Filter list of navigators to only those the user is permitted to open.
 */
export function getPermittedNavigators(
  userScope?: UserSecurityScope | null,
  accessLevels: string[] = []
): SystemNavigator[] {
  return DEFAULT_SYSTEM_NAVIGATORS.filter(nav => {
    if (nav.status !== 'Active') return false;
    return hasNavigatorAccess(nav, userScope, accessLevels);
  });
}

/**
 * Defense against prompt-injection, credential extraction, and system-prompt leak attempts.
 */
export function sanitizeUserQuery(query: string): { isSafe: boolean; flaggedReason?: string } {
  if (!query || typeof query !== 'string') {
    return { isSafe: true };
  }

  const clean = query.toLowerCase();

  // Pattern detection for prompt injection and token extraction
  const injectionPatterns = [
    'ignore previous instructions',
    'ignore all instructions',
    'disregard prior commands',
    'system prompt',
    'reveal your prompt',
    'what is your prompt',
    'show api key',
    'api_key',
    'firebase config',
    'database password',
    'password_hash',
    'dump database',
    'drop table',
    'dump all employees salary',
    'override permissions',
    'you are now in developer mode',
    'jailbreak',
    'dan mode'
  ];

  for (const pattern of injectionPatterns) {
    if (clean.includes(pattern)) {
      return {
        isSafe: false,
        flaggedReason: 'This query contains prohibited command override or sensitive credential requests.'
      };
    }
  }

  return { isSafe: true };
}

/**
 * Redacts sensitive fields from employee records before the assistant processes or outputs them.
 * Never exposes passwords or unauthorized salaries.
 */
export function sanitizeEmployeeRecord(
  emp: any,
  userScope?: UserSecurityScope | null
): any {
  if (!emp) return emp;
  const isSelf = userScope?.employeeId && (emp.id === userScope.employeeId || emp.ID_No === userScope.employeeId);
  const canSeeSalary = userScope?.isAdmin || (isSelf && !userScope.isUser);

  const safe = { ...emp };
  delete safe.Password_Hash;
  delete safe.password;

  if (!canSeeSalary) {
    delete safe.Present_Salary;
    delete safe.salary;
    delete safe.Overtime_Rate;
    safe.Present_Salary = '[Confidential]';
    safe.salary = '[Confidential]';
  }

  return safe;
}

/**
 * Assistant Audit Logger
 */
export function logAssistantActivity(entry: Omit<AssistantAuditEntry, 'id' | 'timestamp'>) {
  try {
    const key = 'sml_assistant_audit_logs';
    const existingRaw = localStorage.getItem(key);
    const existing: AssistantAuditEntry[] = existingRaw ? JSON.parse(existingRaw) : [];

    const newEntry: AssistantAuditEntry = {
      ...entry,
      id: `AST-LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    const updated = [newEntry, ...existing].slice(0, 500); // Retain last 500 entries
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not record assistant audit log:', err);
  }
}

export function getAssistantAuditLogs(): AssistantAuditEntry[] {
  try {
    const raw = localStorage.getItem('sml_assistant_audit_logs');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
