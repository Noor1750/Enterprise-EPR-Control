import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, Edit2, Trash2, RotateCcw, 
  Calendar, Building2, Award, ChevronUp, ChevronDown, CheckCircle2,
  Lock, Unlock, Eye, EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { KPIRecord, Employee, getRatingInfo, generateMonthList, isKpiHiddenForEmployee } from './types';
import { calculatePerformanceRating } from '../../lib/kpiEngine';
import KPIModalNotification, { NotificationModalProps } from './KPIModalNotification';
import AdminDeleteConfirmModal from '../common/AdminDeleteConfirmModal';

interface KPIRecordsProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  availableMonths: string[];
  hiddenEmployeeIds?: string[];
  isAdmin?: boolean;
  onToggleHide?: (employeeId: string) => Promise<void>;
  onUpdateRecord: (record: KPIRecord) => Promise<void>;
  onDeleteRecord: (kpiId: string) => Promise<void>;
  onNavigateToHistory: (employeeId: string) => void;
}

export default function KPIRecords({
  employees,
  kpiRecords,
  availableMonths,
  hiddenEmployeeIds = [],
  isAdmin = true,
  onToggleHide,
  onUpdateRecord,
  onDeleteRecord,
  onNavigateToHistory
}: KPIRecordsProps) {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedRating, setSelectedRating] = useState('All');
  const [selectedAchRange, setSelectedAchRange] = useState('All');
  const [selectedVisibility, setSelectedVisibility] = useState<'All' | 'hidden' | 'visible'>('All');
  const [sortField, setSortField] = useState<keyof KPIRecord>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<KPIRecord | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editAch, setEditAch] = useState('');
  const [editRating, setEditRating] = useState<number>(3);
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal State
  const [recordToDelete, setRecordToDelete] = useState<KPIRecord | null>(null);

  // Notification / Confirm Modal State
  const [modalConfig, setModalConfig] = useState<NotificationModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    kpiRecords.forEach(k => { if (k.department) set.add(k.department); });
    return Array.from(set).sort();
  }, [employees, kpiRecords]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    return kpiRecords.filter(kpi => {
      const isHidden = isKpiHiddenForEmployee(kpi.employeeId, hiddenEmployeeIds);

      // Privacy Filter for Admin
      if (isAdmin && selectedVisibility === 'hidden' && !isHidden) return false;
      if (isAdmin && selectedVisibility === 'visible' && isHidden) return false;

      // Month
      if (selectedMonth !== 'All' && kpi.month !== selectedMonth) return false;
      // Department
      if (selectedDept !== 'All' && kpi.department !== selectedDept) return false;
      // Rating
      if (selectedRating !== 'All' && kpi.rating !== parseInt(selectedRating, 10)) return false;
      // Achievement Range
      if (selectedAchRange === 'high' && kpi.achievement < 90) return false;
      if (selectedAchRange === 'mid' && (kpi.achievement < 75 || kpi.achievement >= 90)) return false;
      if (selectedAchRange === 'low' && kpi.achievement >= 75) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const mId = kpi.employeeId.toLowerCase().includes(q);
        const mName = kpi.employeeName.toLowerCase().includes(q);
        const mDept = kpi.department.toLowerCase().includes(q);
        if (!mId && !mName && !mDept) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [kpiRecords, selectedMonth, selectedDept, selectedRating, selectedAchRange, selectedVisibility, isAdmin, hiddenEmployeeIds, search, sortField, sortAsc]);

  // Export filtered table to Excel
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;

    const exportData = filteredRecords.map(r => {
      const isHidden = isKpiHiddenForEmployee(r.employeeId, hiddenEmployeeIds);
      if (!isAdmin && isHidden) {
        return {
          'Employee ID': r.employeeId,
          'Employee Name': r.employeeName,
          'Department': r.department,
          'Month': r.month,
          'Date': r.date,
          'Plan (%)': 'Confidential',
          'Achievement (%)': 'Confidential',
          'Rating': 'Confidential',
          'Performance Level': 'Confidential (Admin Restricted)'
        };
      }

      return {
        'Employee ID': r.employeeId,
        'Employee Name': r.employeeName,
        'Department': r.department,
        'Month': r.month,
        'Date': r.date,
        'Plan (%)': `${r.plan}%`,
        'Achievement (%)': `${r.achievement}%`,
        'Rating': r.rating,
        'Performance Level': getRatingInfo(r.rating).label || 'Standard',
        ...(isAdmin ? { 'Privacy Status': isHidden ? 'Hidden from Others' : 'Public Visible' } : {})
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly_KPI_Records');
    XLSX.writeFile(wb, `Monthly_KPI_Records_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Open Edit Modal
  const handleOpenEdit = (record: KPIRecord) => {
    setEditingRecord(record);
    setEditPlan(String(record.plan));
    setEditAch(String(record.achievement));
    setEditRating(record.rating);
    setEditDate(record.date || new Date().toISOString().substring(0, 10));
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const pNum = parseFloat(editPlan);
    const aNum = parseFloat(editAch);

    if (isNaN(pNum) || pNum < 0 || pNum > 100) {
      alert('Plan (%) must be between 0% and 100%');
      return;
    }

    if (isNaN(aNum) || aNum < 0) {
      alert('Achievement (%) must be a positive number');
      return;
    }

    if (aNum > 100) {
      alert('Achievement (%) cannot exceed maximum 100%');
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
        title: 'KPI Record Updated',
        message: `Successfully updated KPI record for ${updated.employeeName} (${updated.month}).`,
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to update KPI record.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Record Confirmation
  const handleDeleteClick = (record: KPIRecord) => {
    setRecordToDelete(record);
  };

  const handleExecuteDelete = async () => {
    if (!recordToDelete) return;
    try {
      await onDeleteRecord(recordToDelete.kpiId);
      setRecordToDelete(null);
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'KPI Record Deleted',
        message: `Successfully deleted KPI record for ${recordToDelete.employeeName} (${recordToDelete.month}).`,
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err: any) {
      alert('Failed to delete record: ' + err?.message);
    }
  };

  const handleSort = (field: keyof KPIRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedMonth('All');
    setSelectedDept('All');
    setSelectedRating('All');
    setSelectedAchRange('All');
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#26B99A]" />
            <h3 className="text-sm font-bold text-[#2A3F54]">Monthly KPI Records Management</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              className="px-3.5 py-1.5 bg-[#26B99A] hover:bg-[#169F85] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export to Excel ({filteredRecords.length})
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3 pt-2 border-t border-gray-100`}>
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID / Name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#26B99A]"
            />
          </div>

          {/* Month */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-hidden"
          >
            <option value="All">All Months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Department */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-hidden"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Rating */}
          <select
            value={selectedRating}
            onChange={e => setSelectedRating(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-hidden"
          >
            <option value="All">All Ratings (1–5)</option>
            <option value="5">★ 5 (Excellent)</option>
            <option value="4">★ 4 (Good)</option>
            <option value="3">★ 3 (Average)</option>
            <option value="2">★ 2 (Low)</option>
            <option value="1">★ 1 (Minimum)</option>
          </select>

          {/* Achievement Bracket */}
          <select
            value={selectedAchRange}
            onChange={e => setSelectedAchRange(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-hidden"
          >
            <option value="All">All Achievement %</option>
            <option value="high">High (≥ 90%)</option>
            <option value="mid">Standard (75% – 89%)</option>
            <option value="low">Low (&lt; 75%)</option>
          </select>

          {/* Admin Privacy Visibility Filter */}
          {isAdmin && (
            <select
              value={selectedVisibility}
              onChange={e => setSelectedVisibility(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-amber-50/60 border border-amber-200 text-amber-900 rounded-lg font-bold focus:outline-hidden"
            >
              <option value="All">Visibility: All</option>
              <option value="hidden">🔒 Hidden Only ({hiddenEmployeeIds.length})</option>
              <option value="visible">👁️ Public Only</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
              <tr>
                <th onClick={() => handleSort('employeeId')} className="py-3 px-4 cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">
                    <span>Employee ID</span>
                    {sortField === 'employeeId' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('employeeName')} className="py-3 px-4 cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">
                    <span>Employee Name</span>
                    {sortField === 'employeeName' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('department')} className="py-3 px-4 cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">
                    <span>Department</span>
                    {sortField === 'department' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('month')} className="py-3 px-4 cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">
                    <span>Month</span>
                    {sortField === 'month' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('plan')} className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center justify-end gap-1">
                    <span>Plan (%)</span>
                    {sortField === 'plan' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('achievement')} className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center justify-end gap-1">
                    <span>Achievement (%)</span>
                    {sortField === 'achievement' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('rating')} className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center justify-center gap-1">
                    <span>Rating (1–5)</span>
                    {sortField === 'rating' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No matching KPI records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const ratingInfo = getRatingInfo(record.rating);
                  const isHidden = isKpiHiddenForEmployee(record.employeeId, hiddenEmployeeIds);
                  const isConfidentialForUser = !isAdmin && isHidden;

                  return (
                    <tr 
                      key={record.kpiId} 
                      className={`hover:bg-gray-50/70 transition-colors group ${
                        isHidden && isAdmin ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">
                        <button
                          onClick={() => onNavigateToHistory(record.employeeId)}
                          className="hover:text-[#26B99A] hover:underline flex items-center gap-1.5"
                          title="View Employee History"
                        >
                          <span>{record.employeeId}</span>
                          {isHidden && isAdmin && (
                            <span className="p-0.5 bg-amber-100 text-amber-700 rounded-sm" title="Rating hidden from non-admins">
                              <Lock className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#2A3F54]">
                        <button
                          onClick={() => onNavigateToHistory(record.employeeId)}
                          className="hover:text-[#26B99A] text-left block truncate max-w-xs"
                        >
                          {record.employeeName}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{record.department}</td>
                      <td className="py-3 px-4 font-semibold text-gray-700">{record.month}</td>
                      
                      {/* Plan */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isConfidentialForUser ? (
                          <span className="text-gray-400 font-normal italic">—</span>
                        ) : (
                          <span className="text-indigo-600">{record.plan}%</span>
                        )}
                      </td>

                      {/* Achievement */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isConfidentialForUser ? (
                          <span className="text-gray-400 font-normal italic">—</span>
                        ) : (
                          <span className="text-emerald-600">{record.achievement}%</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4 text-center">
                        {isConfidentialForUser ? (
                          <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500 border border-gray-200 shadow-2xs" title="Performance rating hidden by Admin">
                            <Lock className="w-3 h-3 text-gray-400" />
                            <span>Confidential</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs ${ratingInfo.bg} ${ratingInfo.text}`}>
                            ★ {record.rating.toFixed(1)} <span className="text-[10px] opacity-75">({ratingInfo.label})</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                          {/* Admin Quick Privacy Toggle */}
                          {isAdmin && onToggleHide && (
                            <button
                              onClick={() => onToggleHide(record.employeeId)}
                              className={`p-1.5 rounded transition-colors ${
                                isHidden 
                                  ? 'text-amber-600 hover:text-emerald-700 hover:bg-emerald-50 bg-amber-50' 
                                  : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isHidden ? "Rating hidden from other users. Click to make visible." : "Make rating hidden from other users"}
                            >
                              {isHidden ? <Lock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(record)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit KPI Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(record)}
                                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete KPI Record"
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

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#2A3F54] text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Edit KPI Record</h4>
              <span className="text-xs text-gray-300 font-mono">{editingRecord.employeeId}</span>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employee</label>
                <div className="text-sm font-bold text-gray-800">{editingRecord.employeeName} ({editingRecord.department})</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Month Period</label>
                <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded">{editingRecord.month}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Evaluation Date</label>
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

      {/* Notifications & Confirmations */}
      <KPIModalNotification {...modalConfig} />

      {/* Admin Password Protected Deletion Modal */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(recordToDelete)}
        title="Delete Monthly KPI Record"
        itemName={recordToDelete ? `${recordToDelete.employeeName} (${recordToDelete.employeeId}) — ${recordToDelete.month}` : undefined}
        itemDetails={recordToDelete ? `Plan: ${recordToDelete.plan}% | Achievement: ${recordToDelete.achievement}% | Rating: ★${recordToDelete.rating}` : undefined}
        warningMessage="This KPI record will be permanently deleted from the performance appraisal database. Please enter the Admin Deletion Password configured in Settings → ERP Settings to confirm."
        confirmButtonText="Verify & Delete KPI Record"
        onConfirm={handleExecuteDelete}
        onClose={() => setRecordToDelete(null)}
      />
    </div>
  );
}

