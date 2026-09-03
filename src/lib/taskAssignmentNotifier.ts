/**
 * Smart Task Assignment Notification Engine (Bridged to Universal Engine)
 * 
 * Automatically detects when any task is assigned to an individual employee:
 * - Real-time in-app notification alerts and modals
 * - Signature 4-note ascending fanfare / personalized Web Audio chimes
 * - Cross-tab real-time sync via BroadcastChannel
 * - Local storage persistence of assignment notifications and acknowledgement state
 * - Automatic background detection upon Google Sheets data sync
 */

import { Task } from './taskEngine';
import {
  UniversalAssignmentNotification,
  notifyUniversalAssignment,
  notifyTaskAssignment as universalNotifyTaskAssignment,
  getUniversalNotifications,
  markUniversalNotificationRead,
  markUniversalNotificationAcknowledged,
  markAllUniversalNotificationsRead,
  getUnreadUniversalCount,
  setupUniversalChannelListener,
  getKnownModuleRecordIds,
  saveKnownModuleRecordIds,
  checkNewAssignmentsFromTaskList as universalCheckNewAssignments
} from './universalAssignmentNotifier';

export interface AssignmentNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  dueTime?: string;
  assignedById: string;
  assignedByName: string;
  assigneeId: string;
  assigneeName: string;
  assignedAt: string; // ISO string
  description?: string;
  read: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export function toLegacyNotification(notif: UniversalAssignmentNotification): AssignmentNotification {
  return {
    id: notif.id,
    taskId: notif.recordId,
    taskTitle: notif.title,
    category: notif.metadata?.category || notif.moduleName || 'General',
    priority: notif.priority,
    dueDate: notif.date || '',
    dueTime: notif.metadata?.dueTime || '',
    assignedById: notif.assignedById || '',
    assignedByName: notif.assignedByName || '',
    assigneeId: notif.assigneeId,
    assigneeName: notif.assigneeName,
    assignedAt: notif.assignedAt,
    description: notif.details || '',
    read: notif.read,
    acknowledged: notif.acknowledged,
    acknowledgedAt: notif.acknowledgedAt
  };
}

export function getAssignmentNotifications(empId?: string, empName?: string): AssignmentNotification[] {
  return getUniversalNotifications(empId, empName).map(toLegacyNotification);
}

export function saveAssignmentNotifications(
  empId: string | undefined, 
  empName: string | undefined, 
  notifs: AssignmentNotification[]
): void {
  // Handled by universal engine
}

export function getKnownAssignedTaskIds(empId?: string, empName?: string): Set<string> {
  return getKnownModuleRecordIds('tasks', empId, empName);
}

export function saveKnownAssignedTaskIds(empId: string | undefined, empName: string | undefined, ids: Set<string>): void {
  saveKnownModuleRecordIds('tasks', empId, empName, ids);
}

export function notifyTaskAssignment(
  task: Task, 
  currentUserId: string, 
  currentUserName: string
): AssignmentNotification {
  const notif = universalNotifyTaskAssignment(task, currentUserId, currentUserName);
  return toLegacyNotification(notif);
}

export function markAssignmentNotificationRead(empId?: string, empName?: string, notifId?: string): void {
  markUniversalNotificationRead(empId, empName, notifId);
}

export function markAllAssignmentNotificationsRead(empId?: string, empName?: string): void {
  markAllUniversalNotificationsRead(empId, empName);
}

export function markAssignmentNotificationAcknowledged(empId?: string, empName?: string, notifId?: string): void {
  markUniversalNotificationAcknowledged(empId, empName, notifId);
}

export function getUnreadAssignmentCount(empId?: string, empName?: string): number {
  return getUnreadUniversalCount(empId, empName);
}

export function setupAssignmentChannelListener(
  onCreated: (notif: AssignmentNotification) => void,
  onAcknowledged?: (id: string) => void
): () => void {
  return setupUniversalChannelListener(
    (notif) => onCreated(toLegacyNotification(notif)),
    onAcknowledged
  );
}

export function checkNewAssignmentsFromTaskList(
  currentEmployeeId: string,
  currentEmployeeName: string,
  tasks: Task[]
): number {
  return universalCheckNewAssignments(currentEmployeeId, currentEmployeeName, tasks);
}
