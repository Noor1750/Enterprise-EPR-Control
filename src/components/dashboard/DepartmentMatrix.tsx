import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Building2, ArrowUpDown, ChevronRight, Layers, Users, Wrench, Target, Search, Filter, CheckSquare } from 'lucide-react';
import { DepartmentMetric } from './types';

interface DepartmentMatrixProps {
  departmentMetrics: DepartmentMetric[];
  onNavigate?: (tab: string) => void;
}

export default function DepartmentMatrix({
  departmentMetrics,
  onNavigate
}: DepartmentMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof DepartmentMetric>('employeeCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof DepartmentMetric) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredMetrics = departmentMetrics.filter(d => 
    d.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredMetrics].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  const chartData = filteredMetrics.map(d => ({
    name: d.department,
    Employees: d.employeeCount,
    Tasks: d.taskCount,
    Machines: d.machineCount,
    'KPI %': Math.round(d.avgKpiScore)
  }));

  // Totals
  const totalStaff = departmentMetrics.reduce((acc, d) => acc + d.employeeCount, 0);
  const totalTasks = departmentMetrics.reduce((acc, d) => acc + d.taskCount, 0);
  const totalTasksDone = departmentMetrics.reduce((acc, d) => acc + d.tasksCompleted, 0);
  const totalOverdue = departmentMetrics.reduce((acc, d) => acc + d.tasksOverdue, 0);
  const totalMachines = departmentMetrics.reduce((acc, d) => acc + d.machineCount, 0);
  const totalCapacity = departmentMetrics.reduce((acc, d) => acc + d.dailyCapacity, 0);
  const totalDowntime = departmentMetrics.reduce((acc, d) => acc + d.breakdownHours, 0);
  const maxCapacity = Math.max(1, ...departmentMetrics.map(d => d.dailyCapacity));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="bg-white rounded-2xl border border-gray-200/85 shadow-sm p-5 md:p-6 mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-gray-900">Department Performance & Operations Matrix</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Cross-functional operational comparison across manpower, tasks, equipment capacity, and performance.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Chart with animation */}
      <div className="mb-6 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Departmental Resources & Task Load
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Task Load Distribution
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #E2E8F0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Employees" fill="#3B82F6" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
              <Bar dataKey="Tasks" fill="#6366F1" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1200} />
              <Bar dataKey="Machines" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1400} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50 text-gray-700 uppercase font-black text-[11px] border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Department</th>
              <th 
                className="py-3 px-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('employeeCount')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Staff</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th 
                className="py-3 px-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('taskCount')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Tasks (Done / Total)</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">Overdue</th>
              <th 
                className="py-3 px-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('machineCount')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Machines</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">Nominal Capacity</th>
              <th 
                className="py-3 px-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('breakdownHours')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Downtime</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th 
                className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('avgKpiScore')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>KPI Score</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedData.map(dept => {
              const capacityBarWidth = Math.round((dept.dailyCapacity / maxCapacity) * 100);
              return (
                <tr key={dept.department} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">
                    {dept.department}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                    {dept.employeeCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span className="text-emerald-600 font-bold">{dept.tasksCompleted}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="font-bold text-gray-800">{dept.taskCount}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {dept.tasksOverdue > 0 ? (
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {dept.tasksOverdue}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-gray-800">
                    {dept.machineCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-gray-700">
                    <div>{dept.dailyCapacity.toLocaleString()} pcs</div>
                    {dept.dailyCapacity > 0 && (
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full ml-auto mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${capacityBarWidth}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {dept.breakdownHours > 0 ? (
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {dept.breakdownHours}h
                      </span>
                    ) : (
                      <span className="text-gray-400">0h</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {dept.avgKpiScore > 0 ? (
                      <span className={dept.avgKpiScore >= 90 ? 'text-emerald-600' : dept.avgKpiScore >= 75 ? 'text-blue-600' : 'text-amber-600'}>
                        {Math.round(dept.avgKpiScore)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Summary Footer */}
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-black text-xs">
            <tr>
              <td className="py-3 px-4 uppercase tracking-wider">Enterprise Total</td>
              <td className="py-3 px-3 text-right font-mono">{totalStaff}</td>
              <td className="py-3 px-3 text-right font-mono">
                <span className="text-emerald-700">{totalTasksDone}</span> / {totalTasks}
              </td>
              <td className="py-3 px-3 text-right font-mono text-rose-700">{totalOverdue}</td>
              <td className="py-3 px-3 text-right font-mono">{totalMachines}</td>
              <td className="py-3 px-3 text-right font-mono">{totalCapacity.toLocaleString()} pcs</td>
              <td className="py-3 px-3 text-right font-mono text-rose-700">{totalDowntime}h</td>
              <td className="py-3 px-4 text-right font-mono text-slate-500">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}

