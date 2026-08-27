import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, Building2, Calendar, Target, TrendingUp, Award, 
  Search, Edit2, Trash2, ArrowLeft, Clock, CheckCircle2, ChevronRight,
  Lock, Unlock, Eye, EyeOff, ShieldAlert
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { Employee, KPIRecord, getRatingInfo, MONTH_NAMES, isKpiHiddenForEmployee } from './types';
import { calculatePerformanceRating } from '../../lib/kpiEngine';
import KPIModalNotification, { NotificationModalProps } from './KPIModalNotification';

interface KPIEmployeeHistoryProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  initialEmployeeId?: string;
  hiddenEmployeeIds?: string[];
  isAdmin?: boolean;
  onToggleHide?: (employeeId: string) => Promise<void>;
  onUpdateRecord: (record: KPIRecord) => Promise<void>;
  onDeleteRecord: (kpiId: string) => Promise<void>;
  onNavigateToEntry: () => void;
}

export default function KPIEmployeeHistory({
  employees,
  kpiRecords,
  initialEmployeeId,
  hiddenEmployeeIds = [],
  isAdmin = true,
  onToggleHide,
  onUpdateRecord,
  onDeleteRecord,
  onNavigateToEntry
}: KPIEmployeeHistoryProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || (employees[0]?.id || ''));
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<KPIRecord | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editAch, setEditAch] = useState('');
  const [editRating, setEditRating] = useState<number>(3);
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal Notification
  const [modalConfig, setModalConfig] = useState<NotificationModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmpId(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id.toUpperCase() === selectedEmpId.toUpperCase()) || null;
  }, [employees, selectedEmpId]);

  // History records for this employee (sorted chronologically)
  const historyRecords = useMemo(() => {
    if (!selectedEmpId) return [];
    const list = kpiRecords.filter(k => k.employeeId.toUpperCase() === selectedEmpId.toUpperCase());
    
    // Sort by date / month
    return list.sort((a, b) => {
      // derive timestamp
      const parseDate = (item: KPIRecord) => {
        if (item.date) return new Date(item.date).getTime();
        const parts = item.month.split(' ');
        if (parts.length === 2) {
          const mIdx = MONTH_NAMES.indexOf(parts[0]);
          if (mIdx >= 0) return new Date(parseInt(parts[1], 10), mIdx, 1).getTime();
        }
        return 0;
      };
      return parseDate(a) - parseDate(b);
    });
  }, [kpiRecords, selectedEmpId]);

  // Career Summary Stats
  const careerStats = useMemo(() => {
    if (historyRecords.length === 0) {
      return {
        totalMonths: 0,
        avgPlan: 0,
        avgAch: 0,
        avgRating: 0,
        bestMonth: '—',
        consistencyScore: '—'
      };
    }

    const sumPlan = historyRecords.reduce((acc, curr) => acc + curr.plan, 0);
    const sumAch = historyRecords.reduce((acc, curr) => acc + curr.achievement, 0);
    const sumRating = historyRecords.reduce((acc, curr) => acc + curr.rating, 0);

    const best = [...historyRecords].sort((a, b) => b.achievement - a.achievement)[0];

    return {
      totalMonths: historyRecords.length,
      avgPlan: Math.round(sumPlan / historyRecords.length),
      avgAch: Math.round(sumAch / historyRecords.length),
      avgRating: (sumRating / historyRecords.length).toFixed(1),
      bestMonth: best ? `${best.month} (${best.achievement}%)` : '—',
      consistencyScore: (sumAch / historyRecords.length) >= 90 ? 'High' : (sumAch / historyRecords.length) >= 75 ? 'Moderate' : 'Needs Focus'
    };
  }, [historyRecords]);

  // Filtered employees for selector list
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(e => 
      e.id.toLowerCase().includes(q) || 
      e.name.toLowerCase().includes(q) || 
      e.department.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const pNum = parseFloat(editPlan);
    const aNum = parseFloat(editAch);

    if (isNaN(pNum) || pNum < 0 || pNum > 100) {
      alert('Plan must be between 0% and 100%');
      return;
    }
    if (isNaN(aNum) || aNum < 0 || aNum > 100) {
      alert('Achievement cannot exceed 100%');
      return;
    }

    const updated: KPIRecord = {
      ...editingRecord,
      plan: Math.round(pNum),
      achievement: Math.round(aNum),
      rating: calculatePerformanceRating(aNum),
      date: editDate,
      updatedAt: new Date().toISOString()
    };

    setIsSavingEdit(true);
    try {
      await onUpdateRecord(updated);
      setEditingRecord(null);
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Monthly Record Updated',
        message: `Successfully updated KPI record for ${updated.month}.`,
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err: any) {
      alert('Failed to update record: ' + err?.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = (record: KPIRecord) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Monthly KPI Record?',
      message: `Are you sure you want to delete the KPI record for ${record.month}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await onDeleteRecord(record.kpiId);
        } catch (err: any) {
          alert('Delete failed: ' + err?.message);
        }
      },
      onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar: Employee Search & Selector */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col h-[700px]">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Select Employee</h4>
            <span className="text-[11px] text-gray-400 font-semibold">{filteredEmployees.length} Staff</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, Name, Dept..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#26B99A]"
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
          {filteredEmployees.map((emp, idx) => {
            const isSelected = emp.id.toUpperCase() === selectedEmpId.toUpperCase();
            const isHidden = isKpiHiddenForEmployee(emp.id, hiddenEmployeeIds);
            const recordCount = kpiRecords.filter(k => k.employeeId.toUpperCase() === emp.id.toUpperCase()).length;

            return (
              <button
                key={`${emp.id}-${idx}`}
                onClick={() => setSelectedEmpId(emp.id)}
                className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-emerald-50/80 border-l-4 border-[#26B99A]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#2A3F54] truncate">{emp.name}</span>
                    <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                      {emp.id}
                    </span>
                    {isHidden && isAdmin && (
                      <span className="p-0.5 bg-amber-100 text-amber-700 rounded-xs" title="Rating hidden from non-admins">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate mt-0.5">
                    {emp.department} • {emp.designation || 'Staff'}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    recordCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {recordCount} mo
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Employee KPI History Details & Trend */}
      <div className="lg:col-span-8 space-y-6">
        {selectedEmployee ? (
          <>
            {/* Employee Profile Header Banner */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#2A3F54] text-white font-black text-xl flex items-center justify-center shadow-sm">
                    {selectedEmployee.name ? selectedEmployee.name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#2A3F54]">{selectedEmployee.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-mono font-bold rounded">
                        {selectedEmployee.id}
                      </span>
                      {isKpiHiddenForEmployee(selectedEmployee.id, hiddenEmployeeIds) && (
                        <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>Confidential</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>Department: <strong className="text-gray-700">{selectedEmployee.department}</strong></span>
                      <span>•</span>
                      <span>Designation: <strong className="text-gray-700">{selectedEmployee.designation || '—'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Admin Privacy Action */}
                  {isAdmin && onToggleHide && (
                    <button
                      onClick={() => onToggleHide(selectedEmployee.id)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 ${
                        isKpiHiddenForEmployee(selectedEmployee.id, hiddenEmployeeIds)
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      }`}
                      title={isKpiHiddenForEmployee(selectedEmployee.id, hiddenEmployeeIds) ? "Currently hidden from other users. Click to make visible." : "Make KPI ratings hidden from other users."}
                    >
                      {isKpiHiddenForEmployee(selectedEmployee.id, hiddenEmployeeIds) ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Make Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide from Others</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={onNavigateToEntry}
                    className="px-4 py-2 bg-[#26B99A] hover:bg-[#169F85] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    + Add New Month KPI
                  </button>
                </div>
              </div>

              {/* Non-Admin Privacy Protection Warning if hidden */}
              {!isAdmin && isKpiHiddenForEmployee(selectedEmployee.id, hiddenEmployeeIds) ? (
                <div className="pt-6 pb-2 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">Performance Evaluation Restricted</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                    The KPI performance evaluation scores and monthly rating timeline for <strong>{selectedEmployee.name}</strong> have been marked confidential by the Administrator and are not viewable by other standard users.
                  </p>
                </div>
              ) : (
                <>
                  {/* Career Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Evaluated Months</span>
                      <div className="text-xl font-black text-[#2A3F54] mt-1">{careerStats.totalMonths}</div>
                    </div>

                    <div className="bg-indigo-50/60 p-3 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Avg Target Plan</span>
                      <div className="text-xl font-black text-indigo-700 mt-1">{careerStats.avgPlan}%</div>
                    </div>

                    <div className="bg-emerald-50/60 p-3 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Avg Achievement</span>
                      <div className="text-xl font-black text-emerald-700 mt-1">{careerStats.avgAch}%</div>
                    </div>

                    <div className="bg-purple-50/60 p-3 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Avg Rating</span>
                      <div className="text-xl font-black text-purple-700 mt-1">
                        ★ {careerStats.avgRating} <span className="text-xs text-gray-400 font-normal">/ 5.0</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Performance Trend Chart & Complete History (Protected for non-admins if hidden) */}
            {(isAdmin || !isKpiHiddenForEmployee(selectedEmployee.id, hiddenEmployeeIds)) && (
              <>
                {/* Performance Trend Chart */}
                {historyRecords.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <h4 className="text-sm font-bold text-[#2A3F54]">Monthly Performance Timeline</h4>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-indigo-500" />
                          <span className="text-gray-600">Plan %</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-[#26B99A]" />
                          <span className="text-gray-600">Achievement %</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyRecords} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F6" />
                          <XAxis dataKey="month" tick={{ fill: '#73879C', fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#73879C', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                          <RechartsTooltip formatter={(val: any, name: string) => [`${val}%`, name === 'plan' ? 'Plan' : 'Achievement']} />
                          <Line type="monotone" dataKey="plan" stroke="#6366F1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="achievement" stroke="#26B99A" strokeWidth={3} dot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Complete History Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Complete Monthly Records ({historyRecords.length})
                    </h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-gray-100/70 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-4">Month</th>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4 text-right">Plan (%)</th>
                          <th className="py-2.5 px-4 text-right">Achievement (%)</th>
                          <th className="py-2.5 px-4 text-center">Rating (1–5)</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {historyRecords.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400">
                              No monthly KPI records submitted for this employee yet.
                            </td>
                          </tr>
                        ) : (
                          historyRecords.map(rec => {
                            const rInfo = getRatingInfo(rec.rating);

                            return (
                              <tr key={rec.kpiId} className="hover:bg-gray-50/70">
                                <td className="py-2.5 px-4 font-bold text-gray-800">{rec.month}</td>
                                <td className="py-2.5 px-4 text-gray-500 font-mono">{rec.date || '—'}</td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">{rec.plan}%</td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">{rec.achievement}%</td>
                                <td className="py-2.5 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${rInfo.bg} ${rInfo.text}`}>
                                    ★ {rec.rating.toFixed(1)} ({rInfo.label})
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isAdmin && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingRecord(rec);
                                            setEditPlan(String(rec.plan));
                                            setEditAch(String(rec.achievement));
                                            setEditRating(rec.rating);
                                            setEditDate(rec.date || '');
                                          }}
                                          className="p-1 text-gray-500 hover:text-blue-600 rounded"
                                          title="Edit Record"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRecord(rec)}
                                          className="p-1 text-gray-500 hover:text-rose-600 rounded"
                                          title="Delete Record"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
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
              </>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center text-gray-400">
            <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">Please select an employee from the left panel to view their complete KPI history.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#2A3F54] text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Edit KPI Record for {editingRecord.month}</h4>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 mb-1">Plan (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">Achievement (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editAch}
                    onChange={e => setEditAch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-emerald-200 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Performance Rating (Auto-Calculated)</label>
                <div className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-700 flex items-center justify-between">
                  <span>★ {editAch === '' ? '—' : calculatePerformanceRating(editAch).toFixed(1)}</span>
                  <span className="text-gray-400 font-normal">
                    {editAch === '' ? 'Pending' : getRatingInfo(calculatePerformanceRating(editAch)).label}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#26B99A] hover:bg-[#169F85] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications */}
      <KPIModalNotification {...modalConfig} />
    </div>
  );
}
