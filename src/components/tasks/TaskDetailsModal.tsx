import React from 'react';
import { Task, canUserDeleteTask, canUserEditTask } from '../../lib/taskEngine';
import { UserSecurityScope } from '../../lib/security';
import { X, Calendar, Clock, User, Tag, Flag, AlertTriangle, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface TaskDetailsModalProps {
  task: Task;
  userSecurityScope?: UserSecurityScope | null;
  currentUserEmail?: string;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskDetailsModal({ 
  task, 
  userSecurityScope, 
  currentUserEmail, 
  onClose,
  onEdit,
  onDelete
}: TaskDetailsModalProps) {
  const canDelete = canUserDeleteTask(task, userSecurityScope, currentUserEmail, userSecurityScope?.employeeName);
  const canEdit = canUserEditTask(task, userSecurityScope, currentUserEmail, userSecurityScope?.employeeName);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Task ID: {task.id}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-5">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Description</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Assignee Details</h4>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {task.assigneeName ? task.assigneeName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{task.assigneeName || 'Unassigned'}</div>
                    <div className="text-[11px] text-gray-500">{task.assigneeDepartment || '-'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Progress</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-10 text-right">{task.progress}%</span>
                </div>
              </div>

              {task.recurrenceType && task.recurrenceType !== 'One-time' && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold">Recurring Task: </span>
                    <span>{task.recurrenceType}</span>
                    {task.recurrenceDayOfWeek && <span> (Every {task.recurrenceDayOfWeek})</span>}
                    {task.recurrenceDateOfMonth && <span> (Day {task.recurrenceDateOfMonth})</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                <div className="flex items-center gap-2 text-sm">
                  <Flag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Priority</span>
                </div>
                <span className="font-semibold text-sm">{task.priority}</span>
              </div>
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Category</span>
                </div>
                <span className="font-semibold text-sm">{task.category}</span>
              </div>
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Due Date</span>
                </div>
                <div className="text-right">
                  <div className={`font-semibold text-sm ${task.status === 'Overdue' ? 'text-red-600 flex items-center gap-1' : ''}`}>
                    {task.status === 'Overdue' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {task.dueDate && isValid(parseISO(task.dueDate)) ? format(parseISO(task.dueDate), 'dd MMM, yyyy') : '-'}
                  </div>
                  {task.dueTime && <div className="text-xs text-gray-500">{task.dueTime}</div>}
                </div>
              </div>
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Status</span>
                </div>
                <span className="font-semibold text-sm">{task.status}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Created By</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{task.createdByName || 'Admin'}</div>
                  <div className="text-[10px] text-gray-500">{task.createdAt && isValid(parseISO(task.createdAt)) ? format(parseISO(task.createdAt), 'dd MMM, yyyy HH:mm') : ''}</div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            {canDelete && onDelete && (
              <button
                onClick={() => {
                  onDelete(task.id);
                }}
                className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Task
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Task
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
