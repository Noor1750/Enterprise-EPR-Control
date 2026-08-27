import React, { useState } from 'react';
import { Task, isUserManagerOrAdmin, canUserDeleteTask, canUserEditTask } from '../../lib/taskEngine';
import { UserSecurityScope, SUPER_ADMIN_EMAILS } from '../../lib/security';
import { 
  Eye, Edit2, Trash2, Clock, CheckCircle, AlertTriangle, 
  PlayCircle, CheckSquare, RefreshCw, Calendar, User, 
  Building, ChevronRight, Check, Sparkles, ArrowUpRight,
  CheckSquare2, Square
} from 'lucide-react';
import { format, parseISO, isValid, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';

interface TaskListProps {
  tasks: Task[];
  userSecurityScope: UserSecurityScope | null | undefined;
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDeleteMultiple?: (taskIds: string[]) => void;
  onQuickUpdateProgress?: (task: Task, newProgress: number) => void;
  currentUserEmail?: string;
}

export default function TaskList({ 
  tasks, 
  userSecurityScope, 
  onViewDetails, 
  onEdit, 
  onDelete,
  onDeleteMultiple,
  onQuickUpdateProgress,
  currentUserEmail
}: TaskListProps) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const currentEmpId = userSecurityScope?.employeeId?.toUpperCase() || '';
  const currentUserName = (userSecurityScope?.employeeName || '').toLowerCase();

  const handleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map(t => t.id));
    }
  };

  const handleToggleSelect = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    const confirmMsg = `Are you sure you want to permanently delete ${selectedTaskIds.length} selected task(s)?`;
    if (false) return;

    setIsDeletingBulk(true);
    try {
      if (onDeleteMultiple) {
        await onDeleteMultiple(selectedTaskIds);
      } else {
        for (const id of selectedTaskIds) {
          await onDelete(id);
        }
      }
      setSelectedTaskIds([]);
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'Completed': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'Overdue': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200/60 animate-pulse"><AlertTriangle className="w-3 h-3" /> Overdue</span>;
      case 'In Progress': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200/60"><PlayCircle className="w-3 h-3" /> In Progress</span>;
      case 'Pending': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60"><Clock className="w-3 h-3" /> Pending</span>;
      default: 
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical': 
        return <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">Critical</span>;
      case 'High': 
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200">High</span>;
      case 'Medium': 
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200">Medium</span>;
      case 'Low': 
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider text-gray-600 bg-gray-50 border border-gray-200">Low</span>;
      default: 
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium text-gray-600 bg-gray-50">{priority}</span>;
    }
  };

  const formatDueIndicator = (dueDateStr?: string, dueTimeStr?: string, status?: string) => {
    if (!dueDateStr) return <span className="text-gray-400 text-xs">-</span>;
    const due = parseISO(dueDateStr);
    if (!isValid(due)) return <span className="text-gray-400 text-xs">-</span>;

    const formattedDate = format(due, 'dd MMM, yyyy');

    if (status === 'Completed') {
      return (
        <div>
          <div className="text-xs font-medium text-gray-600 line-through">{formattedDate}</div>
          {dueTimeStr && <div className="text-[10px] text-gray-400">{dueTimeStr}</div>}
        </div>
      );
    }

    if (isToday(due)) {
      return (
        <div>
          <div className="text-xs font-bold text-blue-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
            Today {dueTimeStr ? `at ${dueTimeStr}` : ''}
          </div>
          <div className="text-[10px] text-gray-400">{formattedDate}</div>
        </div>
      );
    }

    if (isTomorrow(due)) {
      return (
        <div>
          <div className="text-xs font-semibold text-indigo-600">Tomorrow</div>
          <div className="text-[10px] text-gray-400">{formattedDate}</div>
        </div>
      );
    }

    if (isPast(due) && !isToday(due)) {
      const daysAgo = differenceInDays(new Date(), due);
      return (
        <div>
          <div className="text-xs font-bold text-rose-600">
            {daysAgo === 1 ? 'Yesterday' : `${daysAgo} days overdue`}
          </div>
          <div className="text-[10px] text-rose-400">{formattedDate}</div>
        </div>
      );
    }

    return (
      <div>
        <div className="text-xs font-medium text-gray-900">{formattedDate}</div>
        {dueTimeStr && <div className="text-[10px] text-gray-400">{dueTimeStr}</div>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Bulk Action Bar if tasks are selected */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-800 text-indigo-100 text-xs font-bold px-2.5 py-1 rounded-lg">
              {selectedTaskIds.length} task(s) selected
            </span>
            <span className="text-xs text-indigo-200 hidden sm:inline">
              Perform batch operations across selected daily tasks
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTaskIds([])}
              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-xs font-semibold rounded-lg transition-colors text-indigo-200"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isDeletingBulk ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Selected ({selectedTaskIds.length})
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/90 border-b border-gray-100 uppercase text-[10px] tracking-wider text-gray-500 font-bold">
            <tr>
              <th className="px-3 py-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
                  onChange={handleSelectAll}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  title="Select All Tasks"
                />
              </th>
              <th className="px-4 py-3.5">Task & Details</th>
              <th className="px-4 py-3.5">Assigned To</th>
              <th className="px-4 py-3.5">Created By</th>
              <th className="px-4 py-3.5">Priority</th>
              <th className="px-4 py-3.5">Due Date</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 w-44">Progress</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                      <CheckSquare className="w-7 h-7" />
                    </div>
                    <p className="text-base font-bold text-gray-800">No Daily Tasks Found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      No tasks match the selected perspective or filter criteria. Create a new task or adjust filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isAssignedToCurrent = 
                  (currentEmpId && task.assigneeId.toUpperCase() === currentEmpId) ||
                  (currentUserName && task.assigneeName.toLowerCase().includes(currentUserName));

                const canDelete = canUserDeleteTask(
                  task, 
                  userSecurityScope, 
                  currentUserEmail, 
                  userSecurityScope?.employeeName
                );

                const canEdit = canUserEditTask(
                  task,
                  userSecurityScope,
                  currentUserEmail,
                  userSecurityScope?.employeeName
                );

                const isSelected = selectedTaskIds.includes(task.id);

                return (
                  <tr 
                    key={task.id} 
                    className={`hover:bg-indigo-50/20 transition-colors ${
                      isSelected ? 'bg-indigo-50/40' : (task.status === 'Overdue' ? 'bg-rose-50/15' : '')
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(task.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Task Title & Details */}
                    <td className="px-4 py-3.5 max-w-[280px]">
                      <div className="flex items-start gap-2.5">
                        <div className="pt-0.5">
                          <button
                            onClick={() => {
                              if (onQuickUpdateProgress) {
                                const newP = task.status === 'Completed' ? 0 : 100;
                                onQuickUpdateProgress(task, newP);
                              }
                            }}
                            title={task.status === 'Completed' ? 'Mark Incomplete' : 'Mark as Completed'}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              task.status === 'Completed'
                                ? 'bg-emerald-500 border-emerald-600 text-white'
                                : 'border-gray-300 hover:border-emerald-500 text-transparent hover:text-emerald-500 bg-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                        <div className="truncate">
                          <div 
                            onClick={() => onViewDetails(task)}
                            className={`font-bold text-sm cursor-pointer hover:text-indigo-600 transition-colors truncate ${
                              task.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span className="font-mono text-[10px] text-gray-400">#{task.id}</span>
                            {task.category && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 rounded text-gray-600 font-medium truncate max-w-[120px]">
                                {task.category}
                              </span>
                            )}
                            {task.recurrenceType && task.recurrenceType !== 'One-time' && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded font-bold flex items-center gap-0.5">
                                <RefreshCw className="w-2.5 h-2.5" /> {task.recurrenceType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-2xs ${
                          isAssignedToCurrent ? 'bg-emerald-600 text-white ring-2 ring-emerald-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {task.assigneeName ? task.assigneeName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 flex items-center gap-1">
                            {task.assigneeName || 'Unassigned'}
                            {isAssignedToCurrent && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-semibold">You</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500">{task.assigneeDepartment || '-'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Created By */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs font-medium text-gray-700">{task.createdByName || 'Admin'}</div>
                      <div className="text-[10px] text-gray-400">
                        {task.createdAt && isValid(parseISO(task.createdAt)) ? format(parseISO(task.createdAt), 'dd MMM') : '-'}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5">
                      {getPriorityBadge(task.priority)}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3.5">
                      {formatDueIndicator(task.dueDate, task.dueTime, task.status)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {getStatusBadge(task.status)}
                    </td>

                    {/* Progress with interactive buttons */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1 relative">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700">{task.progress || 0}%</span>
                          {onQuickUpdateProgress && (
                            <div className="flex items-center gap-1">
                              {[25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  onClick={() => onQuickUpdateProgress(task, pct)}
                                  className={`text-[9px] px-1 py-0.5 rounded font-bold transition-colors ${
                                    task.progress === pct 
                                      ? 'bg-indigo-600 text-white' 
                                      : 'bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700'
                                  }`}
                                  title={`Set to ${pct}%`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              task.status === 'Completed' 
                                ? 'bg-emerald-500' 
                                : (task.status === 'Overdue' ? 'bg-rose-500' : 'bg-indigo-600')
                            }`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => onViewDetails(task)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Full Task Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {canEdit && (
                          <button 
                            onClick={() => onEdit(task)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {canDelete && (
                          <button 
                            onClick={() => onDelete(task.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
