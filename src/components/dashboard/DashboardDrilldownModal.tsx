import React, { useState } from 'react';
import { 
  X, Search, ExternalLink, Filter, CheckCircle2, Clock, 
  AlertTriangle, ArrowRight, Layers, Users, Calendar, Wrench, Target
} from 'lucide-react';
import { Task } from '../../lib/taskEngine';
import { KPIRecord } from '../kpi/types';

interface DashboardDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  type: 'tasks' | 'leaves' | 'machines' | 'breakdowns' | 'kpis' | 'employees';
  data: any[];
  onNavigate?: (tab: string) => void;
}

export default function DashboardDrilldownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  type,
  data,
  onNavigate
}: DashboardDrilldownModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  if (!isOpen) return null;

  const filteredData = data.filter((item: any) => {
    // Search query match
    const stringified = JSON.stringify(item).toLowerCase();
    if (searchTerm && !stringified.includes(searchTerm.toLowerCase())) return false;

    // Optional status filter
    if (filterStatus !== 'all') {
      if (type === 'tasks' && item.status !== filterStatus) return false;
      if (type === 'leaves' && item[8] !== filterStatus) return false;
      if (type === 'breakdowns' && item[26] !== filterStatus) return false;
    }
    return true;
  });

  const getTargetTab = () => {
    switch (type) {
      case 'tasks': return 'tasks';
      case 'leaves': return 'leave';
      case 'machines': return 'machine';
      case 'breakdowns': return 'breakdown';
      case 'kpis': return 'kpi';
      case 'employees': return 'directory';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                ERP Inspector
              </span>
              <h2 className="text-lg font-black tracking-tight">{title}</h2>
            </div>
            {subtitle && <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigate?.(getTargetTab());
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1ABB9C] hover:bg-[#159a80] text-white text-xs font-bold rounded-xl transition-colors"
            >
              <span>Open Navigator</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search in ${data.length} records...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1ABB9C]"
            />
          </div>

          <div className="text-xs text-gray-500 font-semibold">
            Showing {filteredData.length} of {data.length} items
          </div>
        </div>

        {/* Data List / Table */}
        <div className="p-4 overflow-y-auto grow space-y-2">
          {filteredData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No matching records found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
              {type === 'tasks' && (
                <div className="divide-y divide-gray-100">
                  {filteredData.map((task: Task) => (
                    <div key={task.id} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <span>{task.title}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            task.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                            task.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          Assigned to <strong>{task.assigneeName}</strong> ({task.assigneeDepartment}) • Due: {task.dueDate || 'No date'}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                        task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        task.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {type === 'leaves' && (
                <div className="divide-y divide-gray-100">
                  {filteredData.map((l: any, idx: number) => (
                    <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-900">
                          {l[2]} <span className="text-gray-400 font-mono">({l[1]})</span>
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          {l[4]} • {l[7]} Day(s) ({l[5]} to {l[6]}) • {l[18] || 'Leave'}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                        l[8] === 'Settlement' ? 'bg-emerald-100 text-emerald-800' :
                        l[8] === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {l[8] || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {type === 'machines' && (
                <div className="divide-y divide-gray-100">
                  {filteredData.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-900">
                          {m[2]} <span className="text-gray-400 font-mono">({m[0]})</span>
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          {m[1]} Dept • Model: {m[4]} • Serial: {m[5] || '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 font-mono">
                          {Number(m[10] || 0).toLocaleString()} pcs/day
                        </div>
                        <div className="text-[10px] text-gray-400">Daily Nominal</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {type === 'breakdowns' && (
                <div className="divide-y divide-gray-100">
                  {filteredData.map((b: any, idx: number) => (
                    <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-900">
                          {b[3]} ({b[4]})
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          {b[2]} Dept • Reason: {b[5]} • {b[18] || 'Mechanical'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          b[26] === 'Closed' || b[26] === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b[26] || 'Open'}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1 font-mono">{b[13] || 0}h Downtime</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {type === 'kpis' && (
                <div className="divide-y divide-gray-100">
                  {filteredData.map((k: KPIRecord) => (
                    <div key={k.kpiId} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-900">
                          {k.employeeName} <span className="text-gray-400 font-mono">({k.employeeId})</span>
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          {k.department} • Period: {k.month || k.date}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 font-mono text-sm">{k.achievement}%</div>
                        <div className="text-[10px] text-amber-600 font-bold">{k.rating} ★ Rating</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {type === 'employees' && (
                <div className="divide-y divide-gray-100">
                  {filteredData.map((e: any, idx: number) => (
                    <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-900">
                          {e[1]} <span className="text-gray-400 font-mono">({e[0]})</span>
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          {e[2]} • {e[3]}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e[9] === 'Inactive' ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {e[9] || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
