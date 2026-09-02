import { UserSecurityScope, recordSecurityAuditLog, PermissionType } from './security';
import { getSystemNavigators, SystemNavigator, DEFAULT_SYSTEM_NAVIGATORS } from './navigators';
import { getRange, appendRow, updateRange } from './sheets';

export interface UserAdditionalAccessRecord {
  userId: string; // Gmail ID / Username (lowercased)
  employeeId?: string;
  userName?: string;
  navigatorId: string; // e.g. 'dashboard', 'directory', 'kpi', 'machine', etc.
  navigatorName: string;
  canView: boolean; // View Only or View & Edit
  canEdit: boolean; // View & Edit
  assignedBy: string; // Admin email
  assignedDate: string; // ISO string
  updatedBy?: string;
  updatedDate?: string;
  status: 'Active' | 'Inactive';
}

export type AccessPermissionLevel = 'none' | 'view' | 'edit';

export interface NavigatorEffectivePermission {
  navigatorId: string;
  navigatorName: string;
  category: string;
  description: string;
  iconName: string;
  currentAccess: AccessPermissionLevel; // Existing permission from base role & accessLevel
  currentAccessLabel: 'No Access' | 'View Only' | 'View & Edit';
  additionalView: boolean;
  additionalEdit: boolean;
  effectiveAccess: AccessPermissionLevel;
  effectiveAccessLabel: 'No Access' | 'View Only' | 'View & Edit';
  isExtendedByAdditional: boolean;
  statusNote: string;
}

const STORAGE_KEY_PREFIX = 'erp_user_additional_access_';
const MEMORY_CACHE = new Map<string, Record<string, UserAdditionalAccessRecord>>();

/**
 * Normalizes a user ID / email to lowercase.
 */
export function normalizeUserId(userId: string): string {
  return (userId || '').trim().toLowerCase();
}

/**
 * Loads additional access records for a specific user from localStorage and memory cache.
 */
export function getUserAdditionalAccessFromStorage(userId: string): Record<string, UserAdditionalAccessRecord> {
  const cleanId = normalizeUserId(userId);
  if (!cleanId) return {};

  if (MEMORY_CACHE.has(cleanId)) {
    return MEMORY_CACHE.get(cleanId)!;
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cleanId}`);
    if (raw) {
      const parsed: Record<string, UserAdditionalAccessRecord> = JSON.parse(raw);
      MEMORY_CACHE.set(cleanId, parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load user additional access from storage:', err);
  }

  return {};
}

/**
 * Saves additional access records for a user into storage and memory cache.
 */
export function saveUserAdditionalAccessToStorage(
  userId: string,
  records: Record<string, UserAdditionalAccessRecord>
): void {
  const cleanId = normalizeUserId(userId);
  if (!cleanId) return;

  MEMORY_CACHE.set(cleanId, records);
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${cleanId}`, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save user additional access to storage:', err);
  }

  // Dispatch event for UI reactivity
  window.dispatchEvent(new CustomEvent('erp-additional-access-updated', { detail: { userId: cleanId } }));
}

/**
 * Loads all additional access records from Google Sheets (if spreadsheetId is available) or local database.
 */
export async function fetchAllAdditionalAccessFromDatabase(
  spreadsheetId?: string
): Promise<Record<string, Record<string, UserAdditionalAccessRecord>>> {
  const allRecords: Record<string, Record<string, UserAdditionalAccessRecord>> = {};

  // First collect from localStorage for all users
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const userId = key.replace(STORAGE_KEY_PREFIX, '');
        const raw = localStorage.getItem(key);
        if (raw) {
          allRecords[userId] = JSON.parse(raw);
          MEMORY_CACHE.set(userId, allRecords[userId]);
        }
      }
    }
  } catch (_) {}

  // If Google Sheets is configured, fetch from UserAdditionalAccess sheet
  if (spreadsheetId) {
    try {
      const rawRows = await getRange(spreadsheetId, 'UserAdditionalAccess!A:L');
      if (rawRows && rawRows.length > 1) {
        // Skip header row
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[0]) continue;

          const userId = normalizeUserId(String(row[0] || ''));
          const navigatorId = String(row[3] || '').trim().toLowerCase();
          if (!userId || !navigatorId) continue;

          const rec: UserAdditionalAccessRecord = {
            userId,
            employeeId: String(row[1] || '').trim(),
            userName: String(row[2] || '').trim(),
            navigatorId,
            navigatorName: String(row[4] || '').trim(),
            canView: String(row[5] || '').toLowerCase() === 'true' || String(row[5] || '') === '1',
            canEdit: String(row[6] || '').toLowerCase() === 'true' || String(row[6] || '') === '1',
            assignedBy: String(row[7] || '').trim(),
            assignedDate: String(row[8] || '').trim() || new Date().toISOString(),
            updatedBy: String(row[9] || '').trim(),
            updatedDate: String(row[10] || '').trim(),
            status: (String(row[11] || 'Active').trim() as 'Active' | 'Inactive') || 'Active'
          };

          if (!allRecords[userId]) {
            allRecords[userId] = {};
          }
          allRecords[userId][navigatorId] = rec;
        }

        // Cache back to local storage
        Object.entries(allRecords).forEach(([uid, recs]) => {
          saveUserAdditionalAccessToStorage(uid, recs);
        });
      }
    } catch (err) {
      console.warn('UserAdditionalAccess sheet fetch fallback to local store:', err);
    }
  }

  return allRecords;
}

/**
 * Calculates current base access level for a navigator for a given user.
 */
export function calculateNavigatorCurrentAccess(
  userScope: UserSecurityScope | null | undefined,
  navigator: SystemNavigator
): AccessPermissionLevel {
  if (!userScope) return 'none';
  if (userScope.isAdmin) return 'edit';

  const modName = navigator.moduleName;
  const navId = navigator.id.toLowerCase();
  const accessLevels = userScope.accessLevel || [];

  // Check if navigator module is accessible
  let hasNavView = false;
  if (accessLevels.includes('All') || modName === 'All') {
    hasNavView = true;
  } else if (accessLevels.includes(modName)) {
    hasNavView = true;
  } else if (modName === 'KPI Performance' && (accessLevels.includes('Monthly KPI') || accessLevels.includes('KPI Performance') || accessLevels.includes('KPI'))) {
    hasNavView = true;
  } else if (modName === 'Machine & Skills' && (accessLevels.includes('Machine Capacity') || accessLevels.includes('Skill Matrix') || accessLevels.includes('Breakdown Log'))) {
    hasNavView = true;
  }

  if (!hasNavView) {
    // Check if custom module permissions grant view
    if (userScope.customModulePermissions?.[navId]?.permissions?.includes('view')) {
      hasNavView = true;
    }
  }

  if (!hasNavView) return 'none';

  // Determine if user has edit/input permissions for this navigator
  const inputPerms = userScope.inputPermissions || [];
  let hasNavEdit = false;

  if (inputPerms.includes('all')) {
    hasNavEdit = true;
  } else if (inputPerms.includes(navId) || inputPerms.includes(modName.toLowerCase())) {
    hasNavEdit = true;
  } else if (userScope.role === 'Admin' || userScope.role === 'Manager') {
    hasNavEdit = true;
  } else if (userScope.customModulePermissions?.[navId]?.permissions?.some(p => ['create', 'edit', 'delete'].includes(p))) {
    hasNavEdit = true;
  }

  return hasNavEdit ? 'edit' : 'view';
}

/**
 * Calculates effective permission combining Existing Access + Additional Access.
 * Formula:
 * Effective = Existing + Additional
 * Additional Access can EXTEND but NEVER DOWNGRADE existing permissions.
 */
export function calculateNavigatorEffectiveAccess(
  currentAccess: AccessPermissionLevel,
  additionalView: boolean,
  additionalEdit: boolean
): {
  effectiveAccess: AccessPermissionLevel;
  effectiveLabel: 'No Access' | 'View Only' | 'View & Edit';
  isExtended: boolean;
  statusNote: string;
} {
  // If additionalEdit is true, it automatically includes view
  const effAddEdit = additionalEdit;
  const effAddView = additionalView || additionalEdit;

  let effectiveAccess: AccessPermissionLevel = 'none';
  let isExtended = false;
  let statusNote = 'No access granted';

  if (currentAccess === 'edit') {
    // Current access is already View & Edit; higher permission is preserved
    effectiveAccess = 'edit';
    isExtended = false;
    statusNote = 'Full access granted by base role';
  } else if (currentAccess === 'view') {
    if (effAddEdit) {
      effectiveAccess = 'edit';
      isExtended = true;
      statusNote = 'Extended from View Only to View & Edit';
    } else {
      effectiveAccess = 'view';
      isExtended = false;
      statusNote = 'View access granted by base role';
    }
  } else {
    // Current access is 'none'
    if (effAddEdit) {
      effectiveAccess = 'edit';
      isExtended = true;
      statusNote = 'Granted full View & Edit via Additional Access';
    } else if (effAddView) {
      effectiveAccess = 'view';
      isExtended = true;
      statusNote = 'Granted View Only via Additional Access';
    } else {
      effectiveAccess = 'none';
      isExtended = false;
      statusNote = 'No access configured';
    }
  }

  const effectiveLabel: 'No Access' | 'View Only' | 'View & Edit' = 
    effectiveAccess === 'edit' ? 'View & Edit' :
    effectiveAccess === 'view' ? 'View Only' : 'No Access';

  return {
    effectiveAccess,
    effectiveLabel,
    isExtended,
    statusNote
  };
}

/**
 * Generates the full comparison matrix for a user across all system navigators.
 */
export function buildUserAdditionalAccessMatrix(
  userScope: UserSecurityScope | null | undefined,
  additionalRecords: Record<string, UserAdditionalAccessRecord> = {}
): NavigatorEffectivePermission[] {
  const allNavigators = getSystemNavigators();

  return allNavigators.map(nav => {
    const current = calculateNavigatorCurrentAccess(userScope, nav);
    const addRec = additionalRecords[nav.id.toLowerCase()];

    const addView = addRec ? Boolean(addRec.canView) : false;
    const addEdit = addRec ? Boolean(addRec.canEdit) : false;

    const { effectiveAccess, effectiveLabel, isExtended, statusNote } = calculateNavigatorEffectiveAccess(
      current,
      addView,
      addEdit
    );

    const currentLabel: 'No Access' | 'View Only' | 'View & Edit' = 
      current === 'edit' ? 'View & Edit' :
      current === 'view' ? 'View Only' : 'No Access';

    return {
      navigatorId: nav.id,
      navigatorName: nav.name,
      category: nav.category,
      description: nav.description,
      iconName: nav.iconName,
      currentAccess: current,
      currentAccessLabel: currentLabel,
      additionalView: addView || addEdit,
      additionalEdit: addEdit,
      effectiveAccess,
      effectiveAccessLabel: effectiveLabel,
      isExtendedByAdditional: isExtended,
      statusNote
    };
  });
}

/**
 * Persists additional access modifications for a user to storage and Google Sheets database.
 */
export async function saveUserAdditionalAccessMatrix(
  userId: string,
  userScope: UserSecurityScope,
  updatedMatrix: { navigatorId: string; canView: boolean; canEdit: boolean }[],
  adminEmail: string,
  spreadsheetId?: string
): Promise<{ success: boolean; message: string }> {
  const cleanId = normalizeUserId(userId);
  if (!cleanId) {
    return { success: false, message: 'Invalid user identifier' };
  }

  const existingRecords = getUserAdditionalAccessFromStorage(cleanId);
  const now = new Date().toISOString();
  const allNavigators = getSystemNavigators();

  const newRecords: Record<string, UserAdditionalAccessRecord> = {};

  for (const item of updatedMatrix) {
    const navId = item.navigatorId.toLowerCase();
    const navObj = allNavigators.find(n => n.id.toLowerCase() === navId) || DEFAULT_SYSTEM_NAVIGATORS.find(n => n.id.toLowerCase() === navId);
    const navName = navObj ? navObj.name : item.navigatorId;

    // View & Edit implies View
    const canEdit = Boolean(item.canEdit);
    const canView = Boolean(item.canView || item.canEdit);

    // Only store if at least one permission is granted
    if (canView || canEdit) {
      const prevRec = existingRecords[navId];
      newRecords[navId] = {
        userId: cleanId,
        employeeId: userScope.employeeId || '',
        userName: userScope.employeeName || cleanId,
        navigatorId: navId,
        navigatorName: navName,
        canView,
        canEdit,
        assignedBy: prevRec?.assignedBy || adminEmail,
        assignedDate: prevRec?.assignedDate || now,
        updatedBy: adminEmail,
        updatedDate: now,
        status: 'Active'
      };
    }
  }

  // 1. Save to local storage & memory cache immediately
  saveUserAdditionalAccessToStorage(cleanId, newRecords);

  // 2. Audit Trail Logging for each change
  allNavigators.forEach(nav => {
    const navId = nav.id.toLowerCase();
    const oldRec = existingRecords[navId];
    const newRec = newRecords[navId];

    const oldDesc = oldRec ? (oldRec.canEdit ? 'View & Edit' : 'View Only') : 'None';
    const newDesc = newRec ? (newRec.canEdit ? 'View & Edit' : 'View Only') : 'None';

    if (oldDesc !== newDesc) {
      recordSecurityAuditLog({
        adminEmail,
        targetUser: cleanId,
        role: userScope.role || 'User',
        module: `Additional Access: ${nav.name}`,
        actionType: newRec ? 'ASSIGN_ADDITIONAL_ACCESS' : 'REMOVE_ADDITIONAL_ACCESS',
        previousPermission: oldDesc,
        newPermission: newDesc,
        source: 'User Override',
        reason: `Admin updated additional access controls for ${nav.name}`
      });
    }
  });

  // 3. Sync to Google Sheets if database is active
  if (spreadsheetId) {
    try {
      const existingSheetRows = await getRange(spreadsheetId, 'UserAdditionalAccess!A:L').catch(() => []);
      
      const newSheetRows: string[][] = [
        ['User_ID', 'Employee_ID', 'User_Name', 'Navigator_ID', 'Navigator_Name', 'View_Permission', 'Edit_Permission', 'Assigned_By', 'Assigned_Date', 'Updated_By', 'Updated_Date', 'Status']
      ];

      // Keep existing rows for other users
      if (existingSheetRows && existingSheetRows.length > 1) {
        for (let i = 1; i < existingSheetRows.length; i++) {
          const row = existingSheetRows[i];
          if (row && row[0] && normalizeUserId(row[0]) !== cleanId) {
            newSheetRows.push(row);
          }
        }
      }

      // Append active rows for this user
      Object.values(newRecords).forEach(rec => {
        newSheetRows.push([
          rec.userId,
          rec.employeeId || '',
          rec.userName || '',
          rec.navigatorId,
          rec.navigatorName,
          String(rec.canView),
          String(rec.canEdit),
          rec.assignedBy,
          rec.assignedDate,
          rec.updatedBy || '',
          rec.updatedDate || '',
          rec.status
        ]);
      });

      await updateRange(spreadsheetId, `UserAdditionalAccess!A1:L${newSheetRows.length}`, newSheetRows);
    } catch (sheetErr) {
      console.warn('Google Sheets UserAdditionalAccess update background sync warning:', sheetErr);
    }
  }

  return { 
    success: true, 
    message: `Additional Access Controls updated successfully for ${userScope.employeeName || cleanId}.` 
  };
}

/**
 * Checks if a specific action on a navigator/module is permitted by additional access.
 */
export function checkUserAdditionalPermission(
  userId: string,
  navigatorOrModuleId: string,
  action: PermissionType
): boolean {
  const cleanId = normalizeUserId(userId);
  if (!cleanId) return false;

  const records = getUserAdditionalAccessFromStorage(cleanId);
  const cleanNavId = navigatorOrModuleId.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Look for direct match or variations
  const matched = records[cleanNavId] || 
                  records[navigatorOrModuleId.toLowerCase()] ||
                  Object.values(records).find(r => r.navigatorId.toLowerCase() === cleanNavId || r.navigatorName.toLowerCase() === navigatorOrModuleId.toLowerCase());

  if (!matched || matched.status === 'Inactive') return false;

  if (action === 'view') {
    return Boolean(matched.canView || matched.canEdit);
  }

  if (action === 'edit' || action === 'create' || action === 'delete' || action === 'assign') {
    return Boolean(matched.canEdit);
  }

  return false;
}
