import React, { useState, useEffect, useMemo } from 'react';
import { UserSecurityScope } from '../lib/security';
import { 
  Task, parseTaskRow, buildTaskRow, filterAuthorizedTasks, 
  getCalculatedTaskStatus, isUserManagerOrAdmin 
} from '../lib/taskEngine';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey, ensureSheetExists } from '../lib/sheets';
import TaskDashboard from './tasks/TaskDashboard';
import TaskList from './tasks/TaskList';
import TaskForm from './tasks/TaskForm';
import TaskDetailsModal from './tasks/TaskDetailsModal';
import AdminDeleteConfirmModal from './common/AdminDeleteConfirmModal';
import { 
  CheckSquare, Plus, Search, Filter, X, Download, 
  RefreshCw, Building2, User, UserCheck, ShieldCheck, 
  Sparkles, Calendar, Layers
} from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, parseISO, isPast, isValid } from 'date-fns';
import * as XLSX from 'xlsx';
import { resolvePaletteForModule } from '../lib/colorPalettes';

interface TasksProps {
  spreadsheetId: string;
  user: any;
  userSecurityScope: UserSecurityScope | null | undefined;
}

export default function Tasks({ spreadsheetId, user, userSecurityScope }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [deleteModalData, setDeleteModalData] = useState<{
    isOpen: boolean;
    taskIds: string[];
    title?: string;
    details?: string;
  } | null>(null);
  
  const isAdminOrManager = isUserManagerOrAdmin(userSecurityScope) || user?.email?.toLowerCase() === 'noor.alam1750@gmail.com';
  
  // View mode: 'all' | 'my-assigned' | 'created-by-me' | 'urgent-today' | 'departments'
  const [viewMode, setViewMode] = useState<'all' | 'my-assigned' | 'created-by-me' | 'urgent-today' | 'departments'>(
    isAdminOrManager ? 'all' : 'my-assigned'
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [showNotification, setShowNotification] = useState(false);
  const [todayTaskCount, setTodayTaskCount] = useState(0);

  const empId = userSecurityScope?.employeeId?.toUpperCase() || '';
  const userName = (userSecurityScope?.employeeName || user?.displayName || '').toLowerCase();
  const cleanEmail = (user?.email || '').toLowerCase();

  const loadData = async () => {
    if (!spreadsheetId) return;
    try {
      setIsLoading(true);
      await ensureSheetExists(spreadsheetId, 'Tasks', [
        'Task_ID', 'Title', 'Description', 'Assignee_ID', 'Assignee_Name', 'Assignee_Department', 
        'Created_By_ID', 'Created_By_Name', 'Category', 'Start_Date', 'Due_Date', 'Due_Time', 
        'Priority', 'Status', 'Progress', 'Recurrence_Type', 'Recurrence_Day', 'Recurrence_Date', 
        'Parent_Recurring_ID', 'Occurrence_Date', 'Created_At', 'Updated_At', 'Completed_At', 
        'Deleted', 'Deleted_At', 'Deleted_By'
      ]);

      const [tRaw, eRaw] = await Promise.all([
        getRange(spreadsheetId, 'Tasks!A:Z'),
        getRange(spreadsheetId, 'Employees!A:Z')
      ]);

      const loadedTasks = tRaw.length > 1 ? tRaw.slice(1).filter(row => !!row[0]).map(parseTaskRow) : [];
      const emps = eRaw.length > 1 ? eRaw.slice(1) : [];
      setEmployees(emps);
      
      const authorizedTasks = filterAuthorizedTasks(
        loadedTasks, 
        userSecurityScope, 
        user?.email, 
        userSecurityScope?.employeeName || user?.displayName
      );

      // Process overdue statuses in UI
      const processedTasks = authorizedTasks.map(task => {
        const calculatedStatus = getCalculatedTaskStatus(task);
        if (calculatedStatus !== task.status) {
          return { ...task, status: calculatedStatus };
        }
        return task;
      });

      setTasks(processedTasks.reverse());
      
      // Calculate today's tasks for current user for notification
      const myTodayCount = processedTasks.filter(t => {
        const isAssigned = (empId && t.assigneeId.toUpperCase() === empId) || (userName && t.assigneeName.toLowerCase().includes(userName));
        return isAssigned && t.dueDate && isValid(parseISO(t.dueDate)) && isToday(parseISO(t.dueDate)) && t.status !== 'Completed';
      }).length;

      if (myTodayCount > 0 && !showNotification) {
        setTodayTaskCount(myTodayCount);
        setShowNotification(true);
      }
      
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sheet = customEvent.detail?.sheetName || '';
      if (!sheet || sheet === 'Tasks' || sheet === 'Employees') {
        loadData();
      }
    };

    const handleContext = (e: any) => {
      if (e.detail?.moduleId === 'tasks') {
        if (e.detail.action === 'new-task') {
          setEditingTask(null);
          setIsFormOpen(true);
        } else if (e.detail.search) {
          setSearchTerm(e.detail.search);
        }
      }
    };

    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('erp-module-context', handleContext);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('erp-module-context', handleContext);
    };
  }, [spreadsheetId, userSecurityScope]);

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      const isNew = !taskData.id;
      const now = new Date().toISOString();
      const currentUserNameStr = userSecurityScope?.employeeName || user?.displayName || 'User';
      const currentUserIdStr = userSecurityScope?.employeeId || user?.email || 'Unknown';
      
      const finalTask: Task = {
        ...taskData,
        id: isNew ? `TSK-${Date.now().toString().slice(-6)}` : (taskData.id as string),
        createdById: isNew ? currentUserIdStr : (taskData.createdById as string),
        createdByName: isNew ? currentUserNameStr : (taskData.createdByName as string),
        createdAt: isNew ? now : (taskData.createdAt as string),
        updatedAt: now,
        progress: Number(taskData.progress) || 0,
        status: taskData.status || 'Pending',
        priority: taskData.priority || 'Medium',
        recurrenceType: taskData.recurrenceType || 'One-time',
        deleted: taskData.deleted || 'FALSE'
      } as Task;

      // Recalculate status based on progress and dates
      finalTask.status = getCalculatedTaskStatus(finalTask);
      
      const rowsToAppend = [];
      const rowsToUpdate = [];

      if (finalTask.status === 'Completed' && !finalTask.completedAt) {
        finalTask.completedAt = now;
        
        // Generate next occurrence if recurring
        if (finalTask.recurrenceType && finalTask.recurrenceType !== 'One-time' && finalTask.dueDate) {
          const nextTask = { ...finalTask };
          nextTask.id = `TSK-${(Date.now() + 1).toString().slice(-6)}`;
          nextTask.createdAt = now;
          nextTask.updatedAt = now;
          nextTask.completedAt = '';
          nextTask.progress = 0;
          nextTask.status = 'Pending';
          nextTask.parentRecurringTaskId = finalTask.parentRecurringTaskId || finalTask.id;
          
          let nextDate = new Date(finalTask.dueDate);
          
          if (finalTask.recurrenceType === 'Daily') {
            nextDate.setDate(nextDate.getDate() + 1);
          } else if (finalTask.recurrenceType === 'Weekly') {
            const daysMap: Record<string, number> = {
              'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
              'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };
            const targetDay = daysMap[finalTask.recurrenceDayOfWeek] !== undefined 
              ? daysMap[finalTask.recurrenceDayOfWeek] 
              : nextDate.getDay();
              
            let daysToAdd = targetDay - nextDate.getDay();
            if (daysToAdd <= 0) {
              daysToAdd += 7;
            }
            nextDate.setDate(nextDate.getDate() + daysToAdd);
          } else if (finalTask.recurrenceType === 'Monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
            if (finalTask.recurrenceDateOfMonth) {
              const targetDay = parseInt(finalTask.recurrenceDateOfMonth, 10);
              const lastDayOfNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(Math.min(targetDay, lastDayOfNextMonth));
            }
          }
          
          nextTask.dueDate = nextDate.toISOString().split('T')[0];
          nextTask.status = getCalculatedTaskStatus(nextTask);
          rowsToAppend.push(buildTaskRow(nextTask));
        }
      } else if (finalTask.status !== 'Completed') {
        finalTask.completedAt = '';
      }

      const row = buildTaskRow(finalTask);

      if (isNew) {
        rowsToAppend.push(row);
      } else {
        rowsToUpdate.push({ id: finalTask.id, row });
      }

      // Optimistic local state update
      setTasks(prev => {
        if (isNew) {
          return [finalTask, ...prev];
        } else {
          return prev.map(t => t.id === finalTask.id ? finalTask : t);
        }
      });
      
      if (rowsToAppend.length > 0) {
        for (const r of rowsToAppend) {
          await appendRow(spreadsheetId, 'Tasks!A:Z', [r]);
        }
      }
      
      if (rowsToUpdate.length > 0) {
        for (const update of rowsToUpdate) {
          await updateRowByPrimaryKey(spreadsheetId, 'Tasks', update.id, update.row);
        }
      }
      
      setIsFormOpen(false);
      setEditingTask(null);
      await loadData();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Quick Inline Progress / Status Update
  const handleQuickUpdateProgress = async (task: Task, newProgress: number) => {
    const updatedTask: Task = {
      ...task,
      progress: newProgress,
      status: newProgress === 100 ? 'Completed' : (task.status === 'Pending' && newProgress > 0 ? 'In Progress' : task.status),
      updatedAt: new Date().toISOString()
    };
    await handleSaveTask(updatedTask);
  };

  const requestDeleteTask = (taskId: string) => {
    const taskObj = tasks.find(t => t.id === taskId);
    setDeleteModalData({
      isOpen: true,
      taskIds: [taskId],
      title: taskObj?.title ? `Task: ${taskObj.title}` : `Task #${taskId}`,
      details: `Assignee: ${taskObj?.assigneeName || 'Unassigned'} | Due: ${taskObj?.dueDate || 'None'}`
    });
  };

  const requestDeleteMultipleTasks = (taskIds: string[]) => {
    setDeleteModalData({
      isOpen: true,
      taskIds,
      title: `Bulk Deletion (${taskIds.length} Tasks)`,
      details: `Selected Tasks: ${taskIds.slice(0, 5).join(', ')}${taskIds.length > 5 ? ` and ${taskIds.length - 5} more...` : ''}`
    });
  };

  const executeConfirmedDeletion = async () => {
    if (!deleteModalData || deleteModalData.taskIds.length === 0) return;
    const taskIds = deleteModalData.taskIds;

    try {
      setTasks(prev => prev.filter(t => !taskIds.includes(t.id)));
      if (viewingTask && taskIds.includes(viewingTask.id)) setViewingTask(null);
      if (editingTask && editingTask.id && taskIds.includes(editingTask.id)) {
        setEditingTask(null);
        setIsFormOpen(false);
      }

      for (const id of taskIds) {
        try {
          await deleteRowByPrimaryKey(spreadsheetId, 'Tasks', id);
        } catch (e) {
          console.warn(`Failed deleting task ${id} directly:`, e);
          const taskToDel = tasks.find(t => t.id === id);
          if (taskToDel) {
            const now = new Date().toISOString();
            const currentUserNameStr = userSecurityScope?.employeeName || user?.displayName || 'User';
            const deletedTask = { ...taskToDel, deleted: 'TRUE', deletedAt: now, deletedBy: currentUserNameStr };
            const row = buildTaskRow(deletedTask);
            await updateRowByPrimaryKey(spreadsheetId, 'Tasks', id, row);
          }
        }
      }
      await loadData();
    } catch (err) {
      console.error('Failed executing deletion', err);
      throw err;
    }
  };

  // Filter tasks based on view mode and dropdown filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Perspective View Mode Filter
      if (viewMode === 'my-assigned') {
        const isAssigned = (empId && task.assigneeId.toUpperCase() === empId) || (userName && task.assigneeName.toLowerCase().includes(userName));
        if (!isAssigned) return false;
      } else if (viewMode === 'created-by-me') {
        const isCreated = (empId && task.createdById.toUpperCase() === empId) || 
                          (cleanEmail && task.createdById.toLowerCase() === cleanEmail) || 
                          (userName && task.createdByName.toLowerCase().includes(userName));
        if (!isCreated) return false;
      } else if (viewMode === 'urgent-today') {
        const isAssigned = (empId && task.assigneeId.toUpperCase() === empId) || (userName && task.assigneeName.toLowerCase().includes(userName));
        if (!isAssigned) return false;
        const isDueToday = task.dueDate && isValid(parseISO(task.dueDate)) && isToday(parseISO(task.dueDate));
        const isOverdue = task.status === 'Overdue';
        if (!isDueToday && !isOverdue) return false;
      }

      // 2. Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(searchLower);
        const matchesAssignee = task.assigneeName.toLowerCase().includes(searchLower);
        const matchesDept = task.assigneeDepartment.toLowerCase().includes(searchLower);
        const matchesDesc = task.description.toLowerCase().includes(searchLower);
        const matchesId = task.id.toLowerCase().includes(searchLower);
        const matchesCategory = task.category.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesAssignee && !matchesDept && !matchesDesc && !matchesId && !matchesCategory) {
          return false;
        }
      }

      // 3. Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'High Priority') {
          if (task.priority !== 'High' && task.priority !== 'Critical') return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // 4. Priority filter
      if (priorityFilter !== 'All') {
        if (task.priority !== priorityFilter) return false;
      }

      // 5. Department filter
      if (departmentFilter !== 'All') {
        if (task.assigneeDepartment !== departmentFilter) return false;
      }

      // 6. Assignee filter
      if (assigneeFilter !== 'All') {
        if (assigneeFilter === 'Me') {
          const isAssigned = (empId && task.assigneeId.toUpperCase() === empId) || (userName && task.assigneeName.toLowerCase().includes(userName));
          if (!isAssigned) return false;
        } else if (assigneeFilter === 'CreatedByMe') {
          const isCreated = (empId && task.createdById.toUpperCase() === empId) || (cleanEmail && task.createdById.toLowerCase() === cleanEmail);
          if (!isCreated) return false;
        } else if (task.assigneeId !== assigneeFilter) {
          return false;
        }
      }

      // 7. Date filter
      if (dateFilter !== 'All' && task.dueDate) {
        const due = parseISO(task.dueDate);
        if (!isValid(due)) return false;
        if (dateFilter === 'Today' && !isToday(due)) return false;
        if (dateFilter === 'Tomorrow' && !isTomorrow(due)) return false;
        if (dateFilter === 'This Week' && !isThisWeek(due)) return false;
        if (dateFilter === 'Upcoming' && isPast(due) && !isToday(due)) return false;
      }

      return true;
    });
  }, [tasks, viewMode, searchTerm, statusFilter, priorityFilter, departmentFilter, assigneeFilter, dateFilter, empId, userName, cleanEmail]);

  // Sort tasks: Overdue first, then today's, then pending/in-progress by due date, then completed
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (a.status === 'Overdue' && b.status !== 'Overdue') return -1;
      if (b.status === 'Overdue' && a.status !== 'Overdue') return 1;
      
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      if (b.status !== 'Completed' && a.status === 'Completed') return 1;
      
      return aDue - bDue;
    });
  }, [filteredTasks]);

  // Unique assignees and departments for filter dropdowns
  const uniqueAssignees = useMemo(() => {
    const ids = new Set<string>();
    const list: {id: string, name: string}[] = [];
    tasks.forEach(t => {
      if (t.assigneeId && !ids.has(t.assigneeId)) {
        ids.add(t.assigneeId);
        list.push({ id: t.assigneeId, name: t.assigneeName });
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.assigneeDepartment) set.add(t.assigneeDepartment);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Export tasks to Excel
  const handleExportExcel = () => {
    const exportData = sortedTasks.map(t => ({
      'Task ID': t.id,
      'Title': t.title,
      'Description': t.description,
      'Assignee ID': t.assigneeId,
      'Assignee Name': t.assigneeName,
      'Department': t.assigneeDepartment,
      'Created By': t.createdByName,
      'Category': t.category,
      'Start Date': t.startDate,
      'Due Date': t.dueDate,
      'Due Time': t.dueTime,
      'Priority': t.priority,
      'Status': t.status,
      'Progress %': `${t.progress}%`,
      'Recurrence': t.recurrenceType,
      'Created At': t.createdAt,
      'Completed At': t.completedAt
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Tasks');
    XLSX.writeFile(wb, `Daily_Tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-3 min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-700">Loading Daily Tasks & Operations Queue...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1650px] mx-auto space-y-6 bg-gray-50/50 min-h-screen">
      {/* Today's Tasks Notification Banner */}
      {showNotification && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-md mb-6 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base">You have {todayTaskCount} task(s) due today</h4>
              <p className="text-xs text-blue-100 mt-0.5">Stay on track by updating your task progress throughout the day.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setViewMode('urgent-today');
                setDateFilter('Today');
                setShowNotification(false);
              }}
              className="px-4 py-2 bg-white text-indigo-700 text-xs font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xs"
            >
              View My Today's Tasks
            </button>
            <button 
              onClick={() => setShowNotification(false)}
              className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header with Actions */}
      {(() => {
        const palette = resolvePaletteForModule('tasks');
        return (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-transform duration-300 hover:scale-105"
                style={{
                  backgroundColor: `${palette.primaryHex}15`,
                  color: palette.primaryHex
                }}
              >
                {isAdminOrManager ? <ShieldCheck className="w-6 h-6" /> : <CheckSquare className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[#33495F] tracking-tight">
                    {isAdminOrManager ? 'Daily Tasks — Management & Operations' : 'Daily Tasks — My Work Queue'}
                  </h2>
                  <span 
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: palette.pillBg,
                      color: palette.pillText
                    }}
                  >
                    {isAdminOrManager ? 'Admin Mode (All Tasks)' : 'Assigned Person View'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {isAdminOrManager 
                    ? 'Oversee all enterprise daily tasks, monitor department completion, and manage assignments.' 
                    : 'Track your assigned responsibilities, update progress in 1-click, and meet deadlines.'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer group"
                title="Export filtered tasks to Excel"
              >
                <Download className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                Export
              </button>
              
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer group active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${palette.primaryHex}, #3E4B0B)`,
                  color: palette.secondaryHex
                }}
              >
                <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90 group-hover-icon-anim" />
                Create Task
              </button>
            </div>
          </div>
        );
      })()}

      {/* Interactive Task Dashboard with Scope & Perspective */}
      <TaskDashboard 
        tasks={tasks} 
        userSecurityScope={userSecurityScope} 
        activeViewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setStatusFilter('All');
          setDateFilter('All');
        }}
        onFilterClick={(filter) => {
          if (filter === 'Today' || filter === 'All') {
            setDateFilter(filter);
            setStatusFilter('All');
          } else {
            setStatusFilter(filter);
            setDateFilter('All');
          }
        }}
        userEmail={user?.email}
        userDisplayName={userSecurityScope?.employeeName || user?.displayName}
      />

      {/* Filter and Search Bar with Task Table */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, description, assignee, department, ID, category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-xs transition-shadow bg-gray-50/50 hover:bg-white"
            />
          </div>
          
          {/* Multi-Select Filters */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            {/* Department Filter (Visible to Admin/Manager or Multi-Dept users) */}
            {isAdminOrManager && uniqueDepartments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                  className="border-gray-200 rounded-xl text-xs focus:ring-indigo-500 focus:border-indigo-500 py-1.5 bg-gray-50/50"
                >
                  <option value="All">All Departments</option>
                  {uniqueDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="border-gray-200 rounded-xl text-xs focus:ring-indigo-500 focus:border-indigo-500 py-1.5 bg-gray-50/50"
              >
                <option value="All">All Dates</option>
                <option value="Today">Due Today</option>
                <option value="Tomorrow">Due Tomorrow</option>
                <option value="This Week">This Week</option>
                <option value="Upcoming">Upcoming</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border-gray-200 rounded-xl text-xs focus:ring-indigo-500 focus:border-indigo-500 py-1.5 bg-gray-50/50"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
              <option value="High Priority">High Priority Only</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="border-gray-200 rounded-xl text-xs focus:ring-indigo-500 focus:border-indigo-500 py-1.5 bg-gray-50/50"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            
            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="border-gray-200 rounded-xl text-xs focus:ring-indigo-500 focus:border-indigo-500 py-1.5 bg-gray-50/50"
            >
              <option value="All">All Assignees</option>
              <option value="Me">Assigned to Me</option>
              <option value="CreatedByMe">Created by Me</option>
              {isAdminOrManager && uniqueAssignees.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {(searchTerm || statusFilter !== 'All' || dateFilter !== 'All' || departmentFilter !== 'All' || priorityFilter !== 'All' || assigneeFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setDateFilter('All');
                  setDepartmentFilter('All');
                  setPriorityFilter('All');
                  setAssigneeFilter('All');
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-semibold"
                title="Reset Filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Task Count & Active Filters Indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            Showing <strong className="text-gray-900">{sortedTasks.length}</strong> of {tasks.length} total tasks
          </span>
          <span className="text-[11px] text-gray-400">
            Click on progress tags (25%, 50%, 75%, 100%) or checkmark to quickly update status
          </span>
        </div>

        {/* The Task List */}
        <TaskList 
          tasks={sortedTasks} 
          userSecurityScope={userSecurityScope}
          onViewDetails={setViewingTask}
          onEdit={(task) => {
            setEditingTask(task);
            setIsFormOpen(true);
          }}
          onDelete={requestDeleteTask}
          onDeleteMultiple={requestDeleteMultipleTasks}
          onQuickUpdateProgress={handleQuickUpdateProgress}
          currentUserEmail={user?.email}
        />
      </div>

      {/* Task Create / Edit Modal Form */}
      {isFormOpen && (
        <TaskForm 
          task={editingTask || {}} 
          employees={employees}
          userSecurityScope={userSecurityScope}
          currentUserEmail={user?.email}
          onSave={handleSaveTask}
          onDelete={(taskId) => {
            setIsFormOpen(false);
            setEditingTask(null);
            requestDeleteTask(taskId);
          }}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Task Details Modal View */}
      {viewingTask && (
        <TaskDetailsModal 
          task={viewingTask} 
          userSecurityScope={userSecurityScope}
          currentUserEmail={user?.email}
          onClose={() => setViewingTask(null)} 
          onEdit={(task) => {
            setViewingTask(null);
            setEditingTask(task);
            setIsFormOpen(true);
          }}
          onDelete={(taskId) => {
            setViewingTask(null);
            requestDeleteTask(taskId);
          }}
        />
      )}

      {/* Admin Password Verification Delete Modal */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteModalData?.isOpen)}
        title={deleteModalData?.title || 'Delete Task Record'}
        itemName={deleteModalData?.title}
        itemDetails={deleteModalData?.details}
        warningMessage="This task and all its associated progress logs will be permanently deleted from the enterprise database. Please enter the Admin Deletion Password configured in Settings → ERP Settings to confirm."
        confirmButtonText="Verify & Delete Task"
        onConfirm={executeConfirmedDeletion}
        onClose={() => setDeleteModalData(null)}
      />
    </div>
  );
}

