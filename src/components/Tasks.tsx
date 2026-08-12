import React, { useState, useEffect } from 'react';
import { getRange, appendRow, updateRange, ensureSheetExists } from '../lib/sheets';
import { Loader2, Plus, Edit2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Tasks({ spreadsheetId, user }: { spreadsheetId: string, user: any }) {
  const [tasks, setTasks] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignee: '', status: 'Pending', dueDate: format(new Date(), 'yyyy-MM-dd') });

  const loadData = async () => {
    if (!spreadsheetId) return;
    setIsLoading(true);
    try {
      await ensureSheetExists(spreadsheetId, 'Tasks', ['Title', 'Assignee', 'Status', 'Due Date', 'Created At']);
      
      const [tasksRaw, empRaw] = await Promise.all([
        getRange(spreadsheetId, 'Tasks'),
        getRange(spreadsheetId, 'Employees')
      ]);
      const loadedTasks = tasksRaw.length > 1 ? tasksRaw.slice(1) : [];
      
      let filteredTasks = loadedTasks;
      if (user?.email !== 'noor.alam1750@gmail.com') {
         // Assuming users log in with their name as displayName or we filter by their email if mapped
         // Currently, if we don't have email in Tasks, we might filter by assignee == user.displayName
         filteredTasks = loadedTasks.filter(t => t[1] === user?.displayName || t[1] === user?.email);
      }
      setTasks(filteredTasks);
      setEmployees(empRaw.length > 1 ? empRaw.slice(1) : []);
    } catch (err) {
      console.error('Failed to load tasks', err);
      // Fallback if sheet does not exist
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spreadsheetId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rowData = [
        newTask.title,
        newTask.assignee,
        newTask.status,
        newTask.dueDate,
        format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      ];
      await appendRow(spreadsheetId, 'Tasks!A:E', [rowData]);
      setNewTask({ title: '', assignee: '', status: 'Pending', dueDate: format(new Date(), 'yyyy-MM-dd') });
      setIsAdding(false);
      loadData();
    } catch (err) {
      alert('Failed to add task. Please ensure "Tasks" sheet exists.');
    }
  };

  const handleUpdateStatus = async (index: number, currentTask: string[], newStatus: string) => {
    try {
      const row = index + 2;
      await updateRange(spreadsheetId, `Tasks!C${row}`, [[newStatus]]);
      loadData();
    } catch (err) {
      alert('Failed to update task status.');
    }
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-[#33495F]">Daily Tasks</h2>
          <p className="text-gray-500 text-sm mt-1">Manage and track your daily activities</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-[#1ECA98] hover:bg-[#15b083] text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Task
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input 
              required
              placeholder="What needs to be done?"
              value={newTask.title} 
              onChange={e => setNewTask({...newTask, title: e.target.value})} 
              className="w-full px-3 py-2 border rounded-md focus:ring-[#1ECA98] focus:border-[#1ECA98]" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <input 
              required
              list="employee-list"
              placeholder="Assignee name"
              value={newTask.assignee} 
              onChange={e => setNewTask({...newTask, assignee: e.target.value})} 
              className="w-full px-3 py-2 border rounded-md focus:ring-[#1ECA98] focus:border-[#1ECA98]" 
            />
            <datalist id="employee-list">
              {employees.map((emp, i) => (
                <option key={i} value={emp[1]}>{emp[1]}</option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input 
              required
              type="date"
              value={newTask.dueDate} 
              onChange={e => setNewTask({...newTask, dueDate: e.target.value})} 
              className="w-full px-3 py-2 border rounded-md focus:ring-[#1ECA98] focus:border-[#1ECA98]" 
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-[#337AB7] text-white py-2 rounded-md hover:bg-[#286090] font-medium shadow-sm transition-colors">
              Save Task
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#1ECA98] animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
            <CheckCircle className="w-16 h-16 mb-4 text-gray-200" />
            <p className="text-lg font-medium text-gray-500">No daily tasks yet.</p>
            <p className="text-sm">Click 'Add Task' to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${task[2] === 'Completed' ? 'text-gray-400 line-through' : 'text-[#33495F]'}`}>
                        {task[0]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task[1]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task[3]}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        task[2] === 'Completed' ? 'bg-green-100 text-green-800' :
                        task[2] === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task[2] || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <select 
                        value={task[2] || 'Pending'}
                        onChange={(e) => handleUpdateStatus(i, task, e.target.value)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-[#1ECA98] focus:border-[#1ECA98] py-1 pl-2 pr-8"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
