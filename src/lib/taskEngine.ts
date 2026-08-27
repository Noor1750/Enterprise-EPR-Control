import { UserSecurityScope, SUPER_ADMIN_EMAILS } from './security';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assigneeDepartment: string;
  createdById: string;
  createdByName: string;
  category: string;
  startDate: string;
  dueDate: string;
  dueTime: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled' | 'Overdue';
  progress: number;
  recurrenceType: 'One-time' | 'Daily' | 'Weekly' | 'Monthly';
  recurrenceDayOfWeek: string;
  recurrenceDateOfMonth: string;
  parentRecurringTaskId: string;
  occurrenceDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  deleted: string;
  deletedAt: string;
  deletedBy: string;
}

export function parseTaskRow(row: any[]): Task {
  return {
    id: row[0] || '',
    title: row[1] || '',
    description: row[2] || '',
    assigneeId: row[3] || '',
    assigneeName: row[4] || '',
    assigneeDepartment: row[5] || '',
    createdById: row[6] || '',
    createdByName: row[7] || '',
    category: row[8] || '',
    startDate: row[9] || '',
    dueDate: row[10] || '',
    dueTime: row[11] || '',
    priority: (row[12] || 'Medium') as any,
    status: (row[13] || 'Pending') as any,
    progress: parseInt(row[14] || '0', 10),
    recurrenceType: (row[15] || 'One-time') as any,
    recurrenceDayOfWeek: row[16] || '',
    recurrenceDateOfMonth: row[17] || '',
    parentRecurringTaskId: row[18] || '',
    occurrenceDate: row[19] || '',
    createdAt: row[20] || '',
    updatedAt: row[21] || '',
    completedAt: row[22] || '',
    deleted: row[23] || 'FALSE',
    deletedAt: row[24] || '',
    deletedBy: row[25] || ''
  };
}

export function buildTaskRow(task: Task): any[] {
  return [
    task.id,
    task.title,
    task.description,
    task.assigneeId,
    task.assigneeName,
    task.assigneeDepartment,
    task.createdById,
    task.createdByName,
    task.category,
    task.startDate,
    task.dueDate,
    task.dueTime,
    task.priority,
    task.status,
    task.progress.toString(),
    task.recurrenceType,
    task.recurrenceDayOfWeek,
    task.recurrenceDateOfMonth,
    task.parentRecurringTaskId,
    task.occurrenceDate,
    task.createdAt,
    task.updatedAt,
    task.completedAt,
    task.deleted,
    task.deletedAt,
    task.deletedBy
  ];
}

export function isUserManagerOrAdmin(
  userSecurityScope: UserSecurityScope | null | undefined,
  userEmail?: string | null
): boolean {
  if (!userSecurityScope) return true;
  const emailLower = (userEmail || userSecurityScope.username || '').toLowerCase();
  if (SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower)) return true;
  if (userSecurityScope.isAdmin || userSecurityScope.isSuperuser) return true;
  const role = userSecurityScope.role?.toLowerCase() || '';
  return role === 'admin' || role === 'manager' || role === 'supervisor';
}

export function filterAuthorizedTasks(
  tasks: Task[],
  userSecurityScope: UserSecurityScope | null | undefined,
  userEmail: string | null | undefined,
  userDisplayName: string | null | undefined
): Task[] {
  const activeTasks = tasks.filter(t => t.deleted !== 'TRUE');

  const emailLower = (userEmail || '').toLowerCase();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower);

  // If no scope, or is super admin, or admin/manager, or accessLimitType is 'all', return all active tasks
  if (
    !userSecurityScope || 
    isSuperAdmin ||
    isUserManagerOrAdmin(userSecurityScope, userEmail) || 
    userSecurityScope.accessLimitType === 'all' || 
    userSecurityScope.accessLevel?.includes('All')
  ) {
    return activeTasks;
  }

  const empId = userSecurityScope?.employeeId?.toUpperCase() || '';
  const cleanEmail = emailLower;
  const userName = (userSecurityScope?.employeeName || userDisplayName || '').toLowerCase();
  const assignedDept = (userSecurityScope?.assignedDepartment || '').toLowerCase();
  const assignedIds = (userSecurityScope?.assignedEmployeeIds || []).map(id => id.toUpperCase());

  return activeTasks.filter(task => {
    // 1. Direct match on Assignee
    if (empId && task.assigneeId.toUpperCase() === empId) return true;
    if (userName && task.assigneeName.toLowerCase().includes(userName)) return true;

    // 2. Direct match on Creator
    if (empId && task.createdById.toUpperCase() === empId) return true;
    if (cleanEmail && task.createdById.toLowerCase() === cleanEmail) return true;
    if (userName && task.createdByName.toLowerCase().includes(userName)) return true;

    // 3. Department scope
    if (userSecurityScope.accessLimitType === 'department' && assignedDept) {
      if (task.assigneeDepartment && task.assigneeDepartment.toLowerCase() === assignedDept) {
        return true;
      }
    }

    // 4. Supervised scope
    if (userSecurityScope.accessLimitType === 'supervised' && assignedIds.length > 0) {
      if (assignedIds.includes(task.assigneeId.toUpperCase())) return true;
    }

    return false;
  });
}

export function canUserDeleteTask(
  task: Task,
  userSecurityScope: UserSecurityScope | null | undefined,
  userEmail: string | null | undefined,
  userDisplayName: string | null | undefined
): boolean {
  if (!userSecurityScope) return true;
  
  const emailLower = (userEmail || userSecurityScope.username || '').toLowerCase();
  if (SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower)) return true;
  if (userSecurityScope.isAdmin || userSecurityScope.isSuperuser) return true;
  
  const role = (userSecurityScope.role || '').toLowerCase();
  if (role === 'admin' || role === 'manager' || role === 'supervisor') return true;
  if (userSecurityScope.accessLevel?.includes('All')) return true;
  
  const empId = (userSecurityScope.employeeId || '').toUpperCase();
  const cleanEmail = emailLower;
  const userName = (userSecurityScope.employeeName || userDisplayName || '').toLowerCase();
  
  // 1. Creator of the task can always delete it
  if (empId && task.createdById && task.createdById.toUpperCase() === empId) return true;
  if (cleanEmail && task.createdById && task.createdById.toLowerCase() === cleanEmail) return true;
  if (userName && task.createdByName && task.createdByName.toLowerCase().includes(userName)) return true;
  
  // 2. Assignee of the task can delete it
  if (empId && task.assigneeId && task.assigneeId.toUpperCase() === empId) return true;
  if (userName && task.assigneeName && task.assigneeName.toLowerCase().includes(userName)) return true;
  
  // 3. Department supervisor
  const assignedDept = (userSecurityScope.assignedDepartment || '').toLowerCase();
  if (userSecurityScope.accessLimitType === 'department' && assignedDept) {
    if (task.assigneeDepartment && task.assigneeDepartment.toLowerCase() === assignedDept) return true;
  }
  
  // 4. Supervised employee ids
  const assignedIds = (userSecurityScope.assignedEmployeeIds || []).map(id => id.toUpperCase());
  if (assignedIds.length > 0 && task.assigneeId && assignedIds.includes(task.assigneeId.toUpperCase())) return true;
  
  return false;
}

export function canUserEditTask(
  task: Task,
  userSecurityScope: UserSecurityScope | null | undefined,
  userEmail: string | null | undefined,
  userDisplayName: string | null | undefined
): boolean {
  return canUserDeleteTask(task, userSecurityScope, userEmail, userDisplayName);
}

export function getCalculatedTaskStatus(task: Task): Task['status'] {
  if (task.status === 'Completed' || task.progress === 100) return 'Completed';
  if (task.status === 'Cancelled') return 'Cancelled';
  if (task.status === 'On Hold') return 'On Hold';
  
  if (task.dueDate) {
    const now = new Date();
    const dueDateTimeString = task.dueTime ? `${task.dueDate}T${task.dueTime}` : `${task.dueDate}T23:59:59`;
    const dueDateObj = new Date(dueDateTimeString);
    if (!isNaN(dueDateObj.getTime()) && now > dueDateObj) {
      return 'Overdue';
    }
  }

  if (task.progress > 0 && task.progress < 100) return 'In Progress';
  return 'Pending';
}
