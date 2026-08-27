import React, { useState, useEffect } from 'react';
import { Task, canUserDeleteTask } from '../../lib/taskEngine';
import { UserSecurityScope } from '../../lib/security';
import { X, Save, AlertTriangle, UserCheck, Trash2 } from 'lucide-react';
import SearchableEmployeeSelect, { EmployeeOption } from './SearchableEmployeeSelect';

interface TaskFormProps {
  task: Partial<Task>;
  employees: string[][];
  userSecurityScope: UserSecurityScope | null | undefined;
  currentUserEmail?: string;
  onSave: (task: Partial<Task>) => void;
  onCancel: () => void;
  onDelete?: (taskId: string) => void;
}

const CATEGORIES = [
  'Production', 'Quality', 'Maintenance', 'Planning', 'Warehouses', 
  'Logistics', 'HR', 'CS', 'Finance', 'Sales'
];

export default function TaskForm({ 
  task, 
  employees, 
  userSecurityScope, 
  currentUserEmail,
  onSave, 
  onCancel,
  onDelete
}: TaskFormProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    assigneeId: '',
    category: CATEGORIES[0],
    startDate: '',
    dueDate: '',
    dueTime: '',
    priority: 'Medium',
    progress: 0,
    recurrenceType: 'One-time',
    recurrenceDayOfWeek: 'Monday',
    recurrenceDateOfMonth: '1',
    ...task
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const isAdminOrManager = !userSecurityScope || userSecurityScope.isAdmin || userSecurityScope.isSuperuser || userSecurityScope.role?.toLowerCase() === 'admin' || userSecurityScope.role?.toLowerCase() === 'manager';

  // Only Admin/Manager can change due date of an overdue task
  const isEditingOverdueTask = task.id && task.status === 'Overdue';
  const canEditDueDate = !isEditingOverdueTask || isAdminOrManager;

  const canDelete = task.id && canUserDeleteTask(
    task as Task,
    userSecurityScope,
    currentUserEmail,
    userSecurityScope?.employeeName
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError('');
    
    if (!formData.title) return setError('Task Title is required.');
    if (!formData.assigneeId) return setError('Assignee is required.');
    if (!formData.category) return setError('Category is required.');
    
    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        return setError('Due Date cannot be earlier than Start Date.');
      }
    }
    
    if (formData.progress !== undefined && (formData.progress < 0 || formData.progress > 100 || Number.isNaN(formData.progress))) {
      return setError('Progress must be between 0 and 100.');
    }

    setIsSubmitting(true);
    
    const dataToSave = { ...formData };
    
    // Find assignee details
    const selectedEmp = employees.find(emp => emp[0] === dataToSave.assigneeId);
    if (selectedEmp) {
      dataToSave.assigneeName = selectedEmp[1];
      dataToSave.assigneeDepartment = selectedEmp[3];
    }
    
    try {
      await onSave(dataToSave);
    } catch (err) {
      setError('Unable to save task. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">{task.id ? 'Edit Task' : 'Create New Task'}</h3>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-100">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}
          
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Core Task Info */}
            <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-gray-200 rounded-xl focus:ring-[#1ECA98] focus:border-[#1ECA98] transition-all shadow-sm text-gray-900"
                  placeholder="e.g., Update Monthly Production Report"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-gray-200 rounded-xl focus:ring-[#1ECA98] focus:border-[#1ECA98] transition-all shadow-sm text-gray-700 resize-none"
                  rows={3}
                  placeholder="Provide task details, instructions, or expected outcomes..."
                ></textarea>
              </div>
            </div>

            {/* Assignment & Categorization */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Assign To Employee *</span>
                  <span className="text-[10px] text-[#128a67] font-semibold flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Search & Dropdown
                  </span>
                </label>
                <SearchableEmployeeSelect
                  employees={employees}
                  selectedId={formData.assigneeId || ''}
                  onSelect={(emp: EmployeeOption | null) => {
                    if (emp) {
                      setFormData({
                        ...formData,
                        assigneeId: emp.id,
                        assigneeName: emp.name,
                        assigneeDepartment: emp.department
                      });
                    } else {
                      setFormData({
                        ...formData,
                        assigneeId: '',
                        assigneeName: '',
                        assigneeDepartment: ''
                      });
                    }
                  }}
                  required
                  error={!formData.assigneeId && error.includes('Assignee')}
                  placeholder="Search by name, ID, department..."
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border-gray-200 rounded-xl focus:ring-[#1ECA98] focus:border-[#1ECA98] shadow-sm text-gray-700 font-medium h-[46px]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value as any})}
                  className="w-full px-4 py-2.5 bg-white border-gray-200 rounded-xl focus:ring-[#1ECA98] focus:border-[#1ECA98] shadow-sm text-gray-700 font-medium h-[46px]"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Timing & Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <div className="space-y-4 border-r border-gray-100 pr-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-4 py-2.5 border-gray-200 rounded-xl focus:ring-[#1ECA98] focus:border-[#1ECA98] text-gray-700"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">Due Date</label>
                    <input
                      type="date"
                      disabled={!canEditDueDate}
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                      className={`w-full px-4 py-2.5 border-gray-200 rounded-xl focus:ring-[#1ECA98] focus:border-[#1ECA98] text-gray-700 ${!canEditDueDate ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                      title={!canEditDueDate ? "Only Admin/Manager can change the due date of an overdue task." : ""}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Due Time</label>
                    <input
                      type="time"
                      disabled={!canEditDueDate}
                      value={formData.dueTime}
                      onChange={e => setFormData({...formData, dueTime: e.target.value})}
                      className={`w-full px-4 py-2.5 border-gray-200 rounded-xl focus:ring-[#1ECA98] focus:border-[#1ECA98] text-gray-700 ${!canEditDueDate ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col justify-center pl-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Task Progress</label>
                <div className="flex flex-col items-center gap-4">
                  <span className="text-3xl font-bold text-[#1ECA98]">{Number.isNaN(formData.progress) ? 0 : formData.progress}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Number.isNaN(formData.progress) ? 0 : formData.progress}
                    onChange={e => setFormData({...formData, progress: parseInt(e.target.value, 10)})}
                    className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#1ECA98]"
                  />
                  <div className="w-full flex justify-between text-xs text-gray-400 font-medium">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recurrence Settings */}
            <div className="bg-blue-50/40 p-5 rounded-xl border border-blue-100/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recurrence Settings
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <select
                    value={formData.recurrenceType}
                    onChange={e => setFormData({...formData, recurrenceType: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-white border-blue-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-blue-900 font-medium shadow-sm"
                  >
                    <option value="One-time">One-time (Does not repeat)</option>
                    <option value="Daily">Daily Repeat (Every Day)</option>
                    <option value="Weekly">Weekly Repeat</option>
                    <option value="Monthly">Monthly Repeat</option>
                  </select>
                </div>
                
                {formData.recurrenceType === 'Weekly' && (
                  <div>
                    <select
                      value={formData.recurrenceDayOfWeek}
                      onChange={e => setFormData({...formData, recurrenceDayOfWeek: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border-blue-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-blue-900 font-medium shadow-sm"
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d}>Every {d}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {formData.recurrenceType === 'Monthly' && (
                  <div>
                    <select
                      value={formData.recurrenceDateOfMonth}
                      onChange={e => setFormData({...formData, recurrenceDateOfMonth: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border-blue-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-blue-900 font-medium shadow-sm"
                    >
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                        <option key={d} value={d.toString()}>On day {d}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
          </form>
        </div>
        
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            {canDelete && onDelete && task.id && (
              <button
                type="button"
                onClick={() => {
                  onDelete(task.id);
                }}
                className="px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              form="task-form"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#1ECA98] text-white text-sm font-semibold rounded-xl hover:bg-[#1ab588] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
