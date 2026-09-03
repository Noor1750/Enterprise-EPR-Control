/**
 * Enterprise Universal Assignment & Notification Engine
 * 
 * Automatically detects and notifies when ANYTHING is assigned or recorded for an individual employee
 * across ALL navigators in the ERP system:
 * - Daily Tasks (Tasks!A:Z)
 * - Shift & Machine Assignments (ShiftAssignments!A:Z)
 * - Leave Requests & Approvals (Leave!A:Z)
 * - Breakdown Log & Maintenance Work Orders (BreakdownLog!A:Z)
 * - KPI Performance & Target Evaluations (KPI!A:Z & PerformanceReviews!A:R)
 * - 5S & Visual Management Assessments (FiveS_Assessments!A:AG)
 * - Skill Matrix & Machine Qualifications (SkillMatrix!A:Z)
 * - Best Practices & Kaizen Contributions (BestPractices!A:Z)
 * - Overtime Assignments & Approvals (Overtime!A:Z)
 * 
 * Features:
 * - Real-time popup toast alerts with custom module iconography and color schemes
 * - Distinct harmonic Web Audio synthesizer signatures per module
 * - Multi-tab real-time synchronization via BroadcastChannel
 * - LocalStorage state preservation (acknowledged timestamps, read flags)
 * - Auto-dismiss and interactive acknowledgment modals
 * - Direct navigation shortcuts to the corresponding navigator tab
 */

import { playUniversalAssignmentSound, UniversalAssignmentModule } from './taskSoundEngine';
import { getEmployeeReminderConfig } from './taskReminderEngine';
import { getRange } from './sheets';
import { Task } from './taskEngine';

export type AssignmentModuleType = UniversalAssignmentModule;

export interface UniversalAssignmentNotification {
  id: string;
  module: AssignmentModuleType;
  moduleName: string;
  recordId: string;
  title: string;
  subtitle: string;
  details?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status?: string;
  date?: string;
  assignedById?: string;
  assignedByName?: string;
  assigneeId: string;
  assigneeName: string;
  assignedAt: string; // ISO timestamp
  read: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
  metadata?: Record<string, any>;
}

// Backward compatibility alias for TaskAssignment components
export type AssignmentNotification = UniversalAssignmentNotification;

const STORAGE_PREFIX_NOTIFS = 'erp_universal_notifs_';
const STORAGE_PREFIX_KNOWN = 'erp_universal_known_';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('erp_universal_assignment_sync');
  }
} catch (e) {
  // BroadcastChannel unavailable
}

/**
 * Standardize employee key for localStorage
 */
export function getNormalizedEmpKey(empId?: string, empName?: string): string {
  const cleanId = (empId || '').toUpperCase().trim();
  if (cleanId) return cleanId;
  const cleanName = (empName || 'general').toLowerCase().replace(/[^a-z0-9]/g, '_').trim();
  return cleanName || 'default';
}

/**
 * Get all notifications for an employee
 */
export function getUniversalNotifications(empId?: string, empName?: string): UniversalAssignmentNotification[] {
  if (typeof window === 'undefined') return [];
  const key = `${STORAGE_PREFIX_NOTIFS}${getNormalizedEmpKey(empId, empName)}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse universal notifications:', e);
    return [];
  }
}

/**
 * Backward compatibility alias
 */
export function getAssignmentNotifications(empId?: string, empName?: string): UniversalAssignmentNotification[] {
  return getUniversalNotifications(empId, empName);
}

/**
 * Save notifications for an employee
 */
export function saveUniversalNotifications(
  empId: string | undefined, 
  empName: string | undefined, 
  notifs: UniversalAssignmentNotification[]
): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX_NOTIFS}${getNormalizedEmpKey(empId, empName)}`;
  try {
    // Retain up to 80 notifications
    const trimmed = notifs.slice(0, 80);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save universal notifications:', e);
  }
}

export function saveAssignmentNotifications(
  empId: string | undefined, 
  empName: string | undefined, 
  notifs: UniversalAssignmentNotification[]
): void {
  saveUniversalNotifications(empId, empName, notifs);
}

/**
 * Known records set per module to prevent repetitive alerts
 */
export function getKnownModuleRecordIds(module: string, empId?: string, empName?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const key = `${STORAGE_PREFIX_KNOWN}${module}_${getNormalizedEmpKey(empId, empName)}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveKnownModuleRecordIds(module: string, empId: string | undefined, empName: string | undefined, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX_KNOWN}${module}_${getNormalizedEmpKey(empId, empName)}`;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids).slice(-250)));
  } catch (e) {
    console.warn('Failed to save known records:', e);
  }
}

export function getKnownAssignedTaskIds(empId?: string, empName?: string): Set<string> {
  return getKnownModuleRecordIds('tasks', empId, empName);
}

export function saveKnownAssignedTaskIds(empId: string | undefined, empName: string | undefined, ids: Set<string>): void {
  saveKnownModuleRecordIds('tasks', empId, empName, ids);
}

/**
 * Dispatch an in-app assignment notification
 */
export function notifyUniversalAssignment(notif: UniversalAssignmentNotification): void {
  // Save to the employee's notification inbox
  const existing = getUniversalNotifications(notif.assigneeId, notif.assigneeName);
  const updated = [notif, ...existing.filter(n => !(n.module === notif.module && n.recordId === notif.recordId))];
  saveUniversalNotifications(notif.assigneeId, notif.assigneeName, updated);

  // Register in known records
  const known = getKnownModuleRecordIds(notif.module, notif.assigneeId, notif.assigneeName);
  known.add(notif.recordId);
  saveKnownModuleRecordIds(notif.module, notif.assigneeId, notif.assigneeName, known);

  // Trigger audio alert
  try {
    const cfg = getEmployeeReminderConfig(notif.assigneeId, notif.assigneeName);
    playUniversalAssignmentSound(notif.module, cfg.soundKey, cfg.soundVolume);
  } catch (err) {
    console.warn('Audio playback error on notification:', err);
  }

  // Dispatch browser CustomEvents
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-universal-assigned', { detail: notif }));
    window.dispatchEvent(new CustomEvent('erp-task-assigned', { detail: notif }));
  }

  // Broadcast to all active browser tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'ASSIGNMENT_CREATED', notification: notif });
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }
}

/**
 * Helper to dispatch Daily Task assignment (backward compatibility)
 */
export function notifyTaskAssignment(task: Task, currentUserId: string, currentUserName: string): UniversalAssignmentNotification {
  const notif: UniversalAssignmentNotification = {
    id: `asgn-tasks-${task.id}-${Date.now()}`,
    module: 'tasks',
    moduleName: 'Daily Tasks',
    recordId: task.id,
    title: task.title,
    subtitle: `Priority: ${task.priority || 'Medium'} • Category: ${task.category || 'General'}`,
    details: task.description || 'New daily operational task assigned to you.',
    priority: task.priority || 'Medium',
    status: task.status || 'Pending',
    date: task.dueDate,
    assignedById: currentUserId || 'Admin',
    assignedByName: currentUserName || 'Supervisor',
    assigneeId: task.assigneeId || '',
    assigneeName: task.assigneeName || 'Team Member',
    assignedAt: new Date().toISOString(),
    read: false,
    acknowledged: false,
    metadata: {
      dueTime: task.dueTime,
      category: task.category
    }
  };

  notifyUniversalAssignment(notif);
  return notif;
}

/**
 * Mark a notification as read
 */
export function markUniversalNotificationRead(empId?: string, empName?: string, notifId?: string): void {
  if (!notifId) return;
  const list = getUniversalNotifications(empId, empName);
  const updated = list.map(n => n.id === notifId ? { ...n, read: true } : n);
  saveUniversalNotifications(empId, empName, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-universal-assigned-read', { detail: { id: notifId } }));
  }
}

export function markAssignmentNotificationRead(empId?: string, empName?: string, notifId?: string): void {
  markUniversalNotificationRead(empId, empName, notifId);
}

/**
 * Mark a notification as acknowledged
 */
export function markUniversalNotificationAcknowledged(empId?: string, empName?: string, notifId?: string): void {
  if (!notifId) return;
  const list = getUniversalNotifications(empId, empName);
  const now = new Date().toISOString();
  const updated = list.map(n => n.id === notifId ? { ...n, read: true, acknowledged: true, acknowledgedAt: now } : n);
  saveUniversalNotifications(empId, empName, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-universal-assigned-acknowledged', { detail: { id: notifId, at: now } }));
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'ASSIGNMENT_ACKNOWLEDGED', id: notifId, at: now });
    } catch (e) {}
  }
}

export function markAssignmentNotificationAcknowledged(empId?: string, empName?: string, notifId?: string): void {
  markUniversalNotificationAcknowledged(empId, empName, notifId);
}

/**
 * Mark all notifications as acknowledged
 */
export function markAllUniversalNotificationsAcknowledged(empId?: string, empName?: string): void {
  const list = getUniversalNotifications(empId, empName);
  const now = new Date().toISOString();
  const updated = list.map(n => ({ ...n, read: true, acknowledged: true, acknowledgedAt: now }));
  saveUniversalNotifications(empId, empName, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-universal-assigned-acknowledged-all'));
  }
}

/**
 * Mark all notifications as read
 */
export function markAllUniversalNotificationsRead(empId?: string, empName?: string): void {
  const list = getUniversalNotifications(empId, empName);
  const updated = list.map(n => ({ ...n, read: true }));
  saveUniversalNotifications(empId, empName, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-universal-assigned-read-all'));
  }
}

export function markAllAssignmentNotificationsRead(empId?: string, empName?: string): void {
  markAllUniversalNotificationsRead(empId, empName);
}

/**
 * Count unread & unacknowledged notifications
 */
export function getUnreadUniversalCount(empId?: string, empName?: string): number {
  const list = getUniversalNotifications(empId, empName);
  return list.filter(n => !n.acknowledged && !n.read).length;
}

export function getUnreadAssignmentCount(empId?: string, empName?: string): number {
  return getUnreadUniversalCount(empId, empName);
}

/**
 * Listen to multi-tab broadcast updates
 */
export function setupUniversalChannelListener(
  onCreated: (notif: UniversalAssignmentNotification) => void,
  onAcknowledged?: (id: string) => void
): () => void {
  if (!broadcastChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (!event.data) return;
    if (event.data.type === 'ASSIGNMENT_CREATED' && event.data.notification) {
      onCreated(event.data.notification);
    } else if (event.data.type === 'ASSIGNMENT_ACKNOWLEDGED' && onAcknowledged && event.data.id) {
      onAcknowledged(event.data.id);
    }
  };

  broadcastChannel.addEventListener('message', handler);
  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handler);
    }
  };
}

export function setupAssignmentChannelListener(
  onCreated: (notif: UniversalAssignmentNotification) => void,
  onAcknowledged?: (id: string) => void
): () => void {
  return setupUniversalChannelListener(onCreated, onAcknowledged);
}

/**
 * Comprehensive Automated Scanner for ALL Module Assignments
 * Scans Google Sheets across all 9 operational modules and automatically
 * detects any new record assigned to or involving the active employee.
 */
export async function scanAllModuleAssignments(
  spreadsheetId: string,
  currentEmployeeId: string,
  currentEmployeeName: string
): Promise<number> {
  if (!spreadsheetId) return 0;
  const cleanId = (currentEmployeeId || '').toUpperCase().trim();
  const cleanName = (currentEmployeeName || '').toLowerCase().trim();
  if (!cleanId && !cleanName) return 0;

  let newAlertCount = 0;

  try {
    const [
      tasksRaw,
      shiftsRaw,
      leaveRaw,
      breakdownRaw,
      kpiRaw,
      fiveSRaw,
      skillsRaw,
      bpRaw,
      otRaw
    ] = await Promise.all([
      getRange(spreadsheetId, 'Tasks!A:Z').catch(() => []),
      getRange(spreadsheetId, 'ShiftAssignments!A:N').catch(() => []),
      getRange(spreadsheetId, 'Leave!A:Z').catch(() => []),
      getRange(spreadsheetId, 'BreakdownLog!A:Z').catch(() => []),
      getRange(spreadsheetId, 'KPI!A:Z').catch(() => []),
      getRange(spreadsheetId, 'FiveS_Assessments!A:AG').catch(() => []),
      getRange(spreadsheetId, 'SkillMatrix!A:Z').catch(() => []),
      getRange(spreadsheetId, 'BestPractices!A:Z').catch(() => []),
      getRange(spreadsheetId, 'Overtime!A:Z').catch(() => [])
    ]);

    // 1. Scan Tasks
    if (tasksRaw && tasksRaw.length > 1) {
      const knownTasks = getKnownModuleRecordIds('tasks', cleanId, cleanName);
      const isInitialInit = knownTasks.size === 0;

      tasksRaw.slice(1).forEach(row => {
        const taskId = String(row[0] || '').trim();
        const isDeleted = String(row[23] || '').toLowerCase() === 'true';
        if (!taskId || isDeleted) return;

        const assigneeId = String(row[3] || '').toUpperCase().trim();
        const assigneeName = String(row[4] || '').toLowerCase().trim();
        const status = String(row[13] || 'Pending').trim();

        if (status === 'Completed' || status === 'Cancelled') {
          knownTasks.add(taskId);
          return;
        }

        const matches = (cleanId && assigneeId === cleanId) || (cleanName && assigneeName.includes(cleanName));
        if (matches) {
          if (!knownTasks.has(taskId)) {
            knownTasks.add(taskId);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-tasks-${taskId}-${Date.now()}`,
                module: 'tasks',
                moduleName: 'Daily Tasks',
                recordId: taskId,
                title: String(row[1] || 'New Task Assigned'),
                subtitle: `Priority: ${row[12] || 'Medium'} • Category: ${row[8] || 'General'}`,
                details: String(row[2] || 'A daily task has been officially assigned to you.'),
                priority: (row[12] as any) || 'Medium',
                status: (row[13] as any) || 'Pending',
                date: String(row[10] || ''),
                assignedById: String(row[16] || 'System'),
                assignedByName: String(row[17] || 'Supervisor'),
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: String(row[20] || new Date().toISOString()),
                read: false,
                acknowledged: false,
                metadata: {
                  dueTime: String(row[11] || ''),
                  department: String(row[6] || '')
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('tasks', cleanId, cleanName, knownTasks);
    }

    // 2. Scan Shift Assignments
    if (shiftsRaw && shiftsRaw.length > 1) {
      const knownShifts = getKnownModuleRecordIds('shifts', cleanId, cleanName);
      const isInitialInit = knownShifts.size === 0;

      shiftsRaw.slice(1).forEach(row => {
        const assignId = String(row[0] || '').trim();
        if (!assignId) return;
        const empId = String(row[6] || '').toUpperCase().trim();
        const empName = String(row[7] || '').toLowerCase().trim();
        const status = String(row[10] || 'Active').trim();

        const matches = (cleanId && empId === cleanId) || (cleanName && empName.includes(cleanName));
        if (matches && status === 'Active') {
          if (!knownShifts.has(assignId)) {
            knownShifts.add(assignId);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-shifts-${assignId}-${Date.now()}`,
                module: 'shifts',
                moduleName: 'Shift Assignments',
                recordId: assignId,
                title: `Shift Assignment: ${row[3] || 'Assigned Shift'}`,
                subtitle: `Machine: ${row[5] || 'Line Operation'} • Date: ${row[1] || 'Today'}`,
                details: `You have been deployed to ${row[5] || 'machine'} for ${row[3] || 'shift'}.`,
                priority: 'High',
                status: 'Active',
                date: String(row[1] || ''),
                assignedById: 'Supervisor',
                assignedByName: String(row[8] || 'Shift Supervisor'),
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: String(row[9] || new Date().toISOString()),
                read: false,
                acknowledged: false,
                metadata: {
                  machineId: String(row[4] || ''),
                  machineName: String(row[5] || ''),
                  shiftName: String(row[3] || '')
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('shifts', cleanId, cleanName, knownShifts);
    }

    // 3. Scan Leave Management
    if (leaveRaw && leaveRaw.length > 1) {
      const knownLeave = getKnownModuleRecordIds('leave', cleanId, cleanName);
      const isInitialInit = knownLeave.size === 0;

      leaveRaw.slice(1).forEach(row => {
        const leaveId = String(row[0] || '').trim();
        if (!leaveId) return;
        const empId = String(row[1] || '').toUpperCase().trim();
        const empName = String(row[2] || '').toLowerCase().trim();
        const status = String(row[8] || 'Pending').trim();
        const leaveType = String(row[18] || 'Annual Leave').trim();
        const days = row[7] || '1';

        const recordStateKey = `${leaveId}:${status}`;
        const matches = (cleanId && empId === cleanId) || (cleanName && empName.includes(cleanName));

        if (matches) {
          if (!knownLeave.has(recordStateKey)) {
            knownLeave.add(recordStateKey);
            if (!isInitialInit) {
              newAlertCount++;
              const isApproved = status === 'Approved' || status === 'Settlement';
              const isRejected = status === 'Rejected';
              const title = isApproved 
                ? `Leave Request Approved (${days} Days)` 
                : isRejected 
                ? `Leave Request Status Update: Rejected` 
                : `Leave Application Registered: ${leaveType}`;

              notifyUniversalAssignment({
                id: `asgn-leave-${leaveId}-${Date.now()}`,
                module: 'leave',
                moduleName: 'Leave Management',
                recordId: leaveId,
                title,
                subtitle: `${leaveType} • ${row[5] || ''} to ${row[6] || row[5] || ''} (${days} days)`,
                details: `Leave Status: ${status}. Reviewed by: ${row[11] || 'HR Administration'}. Reason: ${row[10] || 'Standard request'}.`,
                priority: isApproved ? 'Medium' : isRejected ? 'High' : 'Low',
                status,
                date: String(row[5] || ''),
                assignedById: 'HR',
                assignedByName: String(row[11] || 'HR Management'),
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: String(row[9] || new Date().toISOString()),
                read: false,
                acknowledged: false,
                metadata: {
                  leaveType,
                  fromDate: String(row[5] || ''),
                  toDate: String(row[6] || ''),
                  days
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('leave', cleanId, cleanName, knownLeave);
    }

    // 4. Scan Breakdown Log (Maintenance ticket assigned to technician)
    if (breakdownRaw && breakdownRaw.length > 1) {
      const knownBreakdowns = getKnownModuleRecordIds('breakdown', cleanId, cleanName);
      const isInitialInit = knownBreakdowns.size === 0;

      breakdownRaw.slice(1).forEach(row => {
        const ticketId = String(row[0] || '').trim();
        if (!ticketId) return;
        const attendeeId = String(row[15] || '').toUpperCase().trim();
        const reporterId = String(row[8] || '').toUpperCase().trim();
        const status = String(row[26] || 'Open').trim();
        const machineName = String(row[3] || 'Production Machine');
        const problem = String(row[5] || 'Machine Fault');
        const isStop = String(row[6] || '').toLowerCase() === 'yes';

        // Notify if assigned to technician as attendee or technician
        const isAttendee = cleanId && attendeeId === cleanId;
        if (isAttendee && status !== 'Closed' && status !== 'Resolved') {
          if (!knownBreakdowns.has(ticketId)) {
            knownBreakdowns.add(ticketId);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-bd-${ticketId}-${Date.now()}`,
                module: 'breakdown',
                moduleName: 'Breakdown Log',
                recordId: ticketId,
                title: `Breakdown Work Order: ${machineName}`,
                subtitle: `${isStop ? '🚨 CRITICAL STOP' : '⚠️ Maintenance Needed'} • ${problem}`,
                details: `You have been assigned to attend and resolve breakdown ticket #${ticketId} on ${machineName}.`,
                priority: isStop ? 'Critical' : 'High',
                status,
                date: String(row[1] || 'Today'),
                assignedById: reporterId || 'Operator',
                assignedByName: String(row[9] || 'Production Floor'),
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: String(row[10] || new Date().toISOString()),
                read: false,
                acknowledged: false,
                metadata: {
                  machineName,
                  problem,
                  productionStop: isStop
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('breakdown', cleanId, cleanName, knownBreakdowns);
    }

    // 5. Scan KPI Performance
    if (kpiRaw && kpiRaw.length > 1) {
      const knownKpi = getKnownModuleRecordIds('kpi', cleanId, cleanName);
      const isInitialInit = knownKpi.size === 0;

      kpiRaw.slice(1).forEach(row => {
        const kpiId = String(row[0] || '').trim();
        if (!kpiId) return;
        const empId = String(row[1] || '').toUpperCase().trim();
        const month = String(row[4] || '').trim();
        const achievement = Number(row[7]) || 0;
        const rating = Number(row[8]) || 0;

        if (cleanId && empId === cleanId) {
          if (!knownKpi.has(kpiId)) {
            knownKpi.add(kpiId);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-kpi-${kpiId}-${Date.now()}`,
                module: 'kpi',
                moduleName: 'KPI Performance',
                recordId: kpiId,
                title: `KPI Performance Evaluation: ${month || 'Monthly Cycle'}`,
                subtitle: `Rating: ${rating.toFixed(1)}/5.0 • Achievement: ${achievement.toFixed(1)}%`,
                details: `Your monthly KPI performance evaluation for ${month} has been published by your supervisor.`,
                priority: 'Medium',
                status: 'Evaluated',
                date: String(row[5] || month),
                assignedById: 'Management',
                assignedByName: 'KPI Review Board',
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: new Date().toISOString(),
                read: false,
                acknowledged: false,
                metadata: {
                  month,
                  rating,
                  achievement
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('kpi', cleanId, cleanName, knownKpi);
    }

    // 6. Scan 5S & Visual Management
    if (fiveSRaw && fiveSRaw.length > 1) {
      const known5S = getKnownModuleRecordIds('5s-management', cleanId, cleanName);
      const isInitialInit = known5S.size === 0;

      fiveSRaw.slice(1).forEach(row => {
        const auditId = String(row[0] || '').trim();
        if (!auditId) return;
        const empId = String(row[4] || '').toUpperCase().trim();
        const section = String(row[7] || 'Workplace Zone');
        const finalScore = Number(row[22]) || Number(row[20]) || 0;
        const rating = String(row[23] || 'Evaluated');

        if (cleanId && empId === cleanId) {
          if (!known5S.has(auditId)) {
            known5S.add(auditId);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-5s-${auditId}-${Date.now()}`,
                module: '5s-management',
                moduleName: '5S & Visual Mgmt',
                recordId: auditId,
                title: `5S Workplace Audit Recorded: ${section}`,
                subtitle: `Score: ${finalScore}% • Rating: ${rating}`,
                details: `5S & Visual Management assessment registered for your designated area (${section}). Remarks: ${row[25] || 'Standard compliance verified'}.`,
                priority: finalScore < 70 ? 'High' : 'Medium',
                status: rating,
                date: String(row[1] || ''),
                assignedById: 'Auditor',
                assignedByName: String(row[3] || '5S Committee'),
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: new Date().toISOString(),
                read: false,
                acknowledged: false,
                metadata: {
                  section,
                  score: finalScore,
                  rating
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('5s-management', cleanId, cleanName, known5S);
    }

    // 7. Scan Skill Matrix
    if (skillsRaw && skillsRaw.length > 1) {
      const knownSkills = getKnownModuleRecordIds('skill-dashboard', cleanId, cleanName);
      const isInitialInit = knownSkills.size === 0;

      skillsRaw.slice(1).forEach(row => {
        const empId = String(row[0] || '').toUpperCase().trim();
        const machineJob = String(row[1] || '').trim();
        const skillLevel = String(row[2] || 'Level 1').trim();
        const skillKey = `${empId}:${machineJob}:${skillLevel}`;

        if (cleanId && empId === cleanId && machineJob) {
          if (!knownSkills.has(skillKey)) {
            knownSkills.add(skillKey);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-skill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                module: 'skill-dashboard',
                moduleName: 'Skill Matrix',
                recordId: skillKey,
                title: `Skill Qualification Certified: ${machineJob}`,
                subtitle: `Certified Level: ${skillLevel} • Technical Authorization`,
                details: `Your technical competency level on ${machineJob} has been updated to ${skillLevel}.`,
                priority: 'Medium',
                status: 'Certified',
                date: 'Latest',
                assignedById: 'Trainer',
                assignedByName: 'Technical Qualification Board',
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: new Date().toISOString(),
                read: false,
                acknowledged: false,
                metadata: {
                  machineJob,
                  skillLevel
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('skill-dashboard', cleanId, cleanName, knownSkills);
    }

    // 8. Scan Best Practices / Kaizen
    if (bpRaw && bpRaw.length > 1) {
      const knownBP = getKnownModuleRecordIds('practices', cleanId, cleanName);
      const isInitialInit = knownBP.size === 0;

      bpRaw.slice(1).forEach(row => {
        const bpId = String(row[0] || '').trim();
        if (!bpId) return;
        const empId = String(row[2] || '').toUpperCase().trim();
        const details = String(row[6] || 'Continuous Improvement Contribution');
        const savingsUSD = Number(row[7]) || 0;

        if (cleanId && empId === cleanId) {
          if (!knownBP.has(bpId)) {
            knownBP.add(bpId);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-bp-${bpId}-${Date.now()}`,
                module: 'practices',
                moduleName: 'Best Practices',
                recordId: bpId,
                title: `Kaizen Recognition: Best Practice #${bpId}`,
                subtitle: `Savings: $${savingsUSD.toLocaleString()} USD • Kaizen Published`,
                details: `Your continuous improvement contribution (${details}) has been officially logged in Best Practices.`,
                priority: 'Low',
                status: 'Published',
                date: String(row[1] || ''),
                assignedById: 'Continuous Improvement',
                assignedByName: 'Kaizen Committee',
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: new Date().toISOString(),
                read: false,
                acknowledged: false,
                metadata: {
                  savingsUSD
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('practices', cleanId, cleanName, knownBP);
    }

    // 9. Scan Overtime
    if (otRaw && otRaw.length > 1) {
      const knownOT = getKnownModuleRecordIds('overtime', cleanId, cleanName);
      const isInitialInit = knownOT.size === 0;

      otRaw.slice(1).forEach(row => {
        const otId = String(row[0] || '').trim();
        if (!otId) return;
        const empId = String(row[2] || '').toUpperCase().trim();
        const date = String(row[1] || '');
        const hours = Number(row[6]) || 0;

        if (cleanId && empId === cleanId) {
          if (!knownOT.has(otId)) {
            knownOT.add(otId);
            if (!isInitialInit) {
              newAlertCount++;
              notifyUniversalAssignment({
                id: `asgn-ot-${otId}-${Date.now()}`,
                module: 'overtime',
                moduleName: 'Overtime',
                recordId: otId,
                title: `Overtime Assigned: ${hours} Hours`,
                subtitle: `Date: ${date} • Shift Support Authorization`,
                details: `Overtime schedule of ${hours} hours recorded for operational coverage on ${date}.`,
                priority: 'Medium',
                status: 'Scheduled',
                date,
                assignedById: 'Operations',
                assignedByName: 'Shift In-Charge',
                assigneeId: cleanId,
                assigneeName: currentEmployeeName,
                assignedAt: new Date().toISOString(),
                read: false,
                acknowledged: false,
                metadata: {
                  hours,
                  date
                }
              });
            }
          }
        }
      });
      saveKnownModuleRecordIds('overtime', cleanId, cleanName, knownOT);
    }

  } catch (err) {
    console.error('Error in scanAllModuleAssignments:', err);
  }

  return newAlertCount;
}

/**
 * Backward compatibility alias for scanAllModuleAssignments
 */
export function checkNewAssignmentsFromTaskList(
  currentEmployeeId: string,
  currentEmployeeName: string,
  tasks: Task[]
): number {
  if (!tasks || tasks.length === 0) return 0;
  const cleanId = (currentEmployeeId || '').toUpperCase().trim();
  const cleanName = (currentEmployeeName || '').toLowerCase().trim();
  if (!cleanId && !cleanName) return 0;

  const known = getKnownModuleRecordIds('tasks', cleanId, cleanName);
  const isInitial = known.size === 0;
  let newCount = 0;

  tasks.forEach(task => {
    if (!task.id || task.deleted === 'TRUE' || task.status === 'Completed' || task.status === 'Cancelled') {
      if (task.id) known.add(task.id);
      return;
    }

    const tAssigneeId = (task.assigneeId || '').toUpperCase().trim();
    const tAssigneeName = (task.assigneeName || '').toLowerCase().trim();

    const matches = (cleanId && tAssigneeId === cleanId) || (cleanName && tAssigneeName.includes(cleanName));
    if (matches) {
      if (!known.has(task.id)) {
        known.add(task.id);
        if (!isInitial) {
          newCount++;
          notifyUniversalAssignment({
            id: `asgn-tasks-${task.id}-${Date.now()}`,
            module: 'tasks',
            moduleName: 'Daily Tasks',
            recordId: task.id,
            title: task.title,
            subtitle: `Priority: ${task.priority || 'Medium'} • Category: ${task.category || 'General'}`,
            details: task.description || 'New daily operational task assigned to you.',
            priority: task.priority || 'Medium',
            status: task.status || 'Pending',
            date: task.dueDate,
            assignedById: task.createdById || 'Admin',
            assignedByName: task.createdByName || 'Supervisor',
            assigneeId: cleanId,
            assigneeName: currentEmployeeName,
            assignedAt: task.createdAt || new Date().toISOString(),
            read: false,
            acknowledged: false,
            metadata: {
              dueTime: task.dueTime,
              category: task.category
            }
          });
        }
      }
    }
  });

  saveKnownModuleRecordIds('tasks', cleanId, cleanName, known);
  return newCount;
}
