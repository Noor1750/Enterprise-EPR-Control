import { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Eye, EyeOff, Search, 
  Lock, Unlock, CheckSquare, Square, RefreshCw,
  Info, Check, Sparkles, Building2, User, Award, AlertTriangle
} from 'lucide-react';
import { Employee, KPIRecord, getRatingInfo, isKpiHiddenForEmployee } from './types';

interface KPIPrivacyManagerProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  hiddenEmployeeIds: string[];
  onToggleHide: (employeeId: string) => Promise<void>;
  onBatchSaveHidden: (employeeIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

export default function KPIPrivacyManager({
  employees,
  kpiRecords,
  hiddenEmployeeIds,
  onToggleHide,
  onBatchSaveHidden,
  isLoading = false
}: KPIPrivacyManagerProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'hidden' | 'visible'>('all');
  const [filterDept, setFilterDept] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employees]);

  // Latest KPI map per employee
  const latestKpiMap = useMemo(() => {
    const map = new Map<string, KPIRecord>();
    kpiRecords.forEach(k => {
      const empId = k.employeeId.toUpperCase();
      const existing = map.get(empId);
      if (!existing || (k.date && (!existing.date || k.date > existing.date))) {
        map.set(empId, k);
      }
    });
    return map;
  }, [kpiRecords]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const isHidden = isKpiHiddenForEmployee(emp.id, hiddenEmployeeIds);
      
      if (filterStatus === 'hidden' && !isHidden) return false;
      if (filterStatus === 'visible' && isHidden) return false;
      if (filterDept !== 'All' && emp.department !== filterDept) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = emp.id.toLowerCase().includes(q);
        const matchName = emp.name.toLowerCase().includes(q);
        const matchDept = emp.department.toLowerCase().includes(q);
        const matchDesig = emp.designation?.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchDept && !matchDesig) return false;
      }
      return true;
    });
  }, [employees, hiddenEmployeeIds, filterStatus, filterDept, search]);

  const totalCount = employees.length;
  const hiddenCount = useMemo(() => {
    return employees.filter(e => isKpiHiddenForEmployee(e.id, hiddenEmployeeIds)).length;
  }, [employees, hiddenEmployeeIds]);
  const visibleCount = totalCount - hiddenCount;

  // Toggle selection for batch
  const handleToggleSelect = (empId: string) => {
    const upper = empId.toUpperCase();
    setSelectedIds(prev => 
      prev.includes(upper) ? prev.filter(id => id !== upper) : [...prev, upper]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredUpperIds = filteredEmployees.map(e => e.id.toUpperCase());
    const allSelected = filteredUpperIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredUpperIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredUpperIds])));
    }
  };

  // Batch actions
  const handleBatchHide = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const nextHidden = Array.from(new Set([...hiddenEmployeeIds, ...selectedIds]));
      await onBatchSaveHidden(nextHidden);
      setSuccessMessage(`Successfully hid KPI rating for ${selectedIds.length} employee(s) from other users.`);
      setSelectedIds([]);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchUnhide = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const nextHidden = hiddenEmployeeIds.filter(id => !selectedIds.includes(id.toUpperCase()));
      await onBatchSaveHidden(nextHidden);
      setSuccessMessage(`Successfully made KPI rating visible for ${selectedIds.length} employee(s).`);
      setSelectedIds([]);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Privilege Banner */}
      <div className="bg-gradient-to-r from-[#2A3F54] to-[#1F2D3D] text-white p-6 rounded-xl shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Admin Exclusive Power
              </span>
              <h3 className="text-lg font-bold">Custom KPI Rating Privacy & Visibility</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Control which employees&apos; Monthly KPI ratings, achievements, and evaluation scores are 
              <strong className="text-white font-bold"> hidden from other standard users, supervisors, and colleagues</strong>. 
              As an Administrator, you retain full access to view, update, and manage all records at all times.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-lg border border-white/10 text-center">
              <div className="text-2xl font-black text-amber-300">{hiddenCount}</div>
              <div className="text-[11px] text-slate-300 font-medium">Ratings Hidden</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-lg border border-white/10 text-center">
              <div className="text-2xl font-black text-emerald-300">{visibleCount}</div>
              <div className="text-[11px] text-slate-300 font-medium">Public Visible</div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, employee name, designation or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#26B99A] bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium whitespace-nowrap">Department:</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-hidden focus:border-[#26B99A]"
            >
              <option value="All">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Privacy Status Filter */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterStatus === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setFilterStatus('hidden')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                filterStatus === 'hidden' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Lock className="w-3 h-3" />
              Hidden ({hiddenCount})
            </button>
            <button
              onClick={() => setFilterStatus('visible')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                filterStatus === 'visible' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-3 h-3" />
              Visible ({visibleCount})
            </button>
          </div>
        </div>

        {/* Batch Operations Toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <CheckSquare className="w-4 h-4 text-[#26B99A]" />
              <span>{selectedIds.length} employee(s) selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchHide}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                Hide KPI Rating for Selected
              </button>
              <button
                onClick={handleBatchUnhide}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                Make Selected Visible
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employees Privacy Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.includes(e.id.toUpperCase()))}
                    onChange={handleSelectAllFiltered}
                    className="rounded-sm border-gray-300 text-[#26B99A] focus:ring-[#26B99A] cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Employee ID & Name</th>
                <th className="py-3.5 px-4">Department & Designation</th>
                <th className="py-3.5 px-4">Latest KPI Score</th>
                <th className="py-3.5 px-4">Visibility for Other Users</th>
                <th className="py-3.5 px-4 text-right">Admin Privacy Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No employees matched your filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isHidden = isKpiHiddenForEmployee(emp.id, hiddenEmployeeIds);
                  const isSelected = selectedIds.includes(emp.id.toUpperCase());
                  const latestKpi = latestKpiMap.get(emp.id.toUpperCase());
                  const ratingInfo = latestKpi ? getRatingInfo(latestKpi.rating) : null;

                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isHidden ? 'bg-amber-50/20' : ''
                      } ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(emp.id)}
                          className="rounded-sm border-gray-300 text-[#26B99A] focus:ring-[#26B99A] cursor-pointer"
                        />
                      </td>

                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isHidden ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {emp.name ? emp.name.charAt(0).toUpperCase() : 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {isHidden && (
                                <span className="p-0.5 bg-amber-100 text-amber-700 rounded-sm" title="Rating hidden from non-admins">
                                  <Lock className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-gray-500 font-semibold">{emp.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Designation */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800">{emp.department || '—'}</div>
                        <div className="text-[11px] text-gray-500">{emp.designation || '—'}</div>
                      </td>

                      {/* Latest KPI Score */}
                      <td className="py-3.5 px-4">
                        {latestKpi ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ backgroundColor: ratingInfo?.bg ? undefined : '#f3f4f6', color: ratingInfo?.color }}
                              >
                                ★ {latestKpi.rating.toFixed(1)} • {ratingInfo?.label || 'Rating'}
                              </span>
                              <span className="text-[11px] font-bold text-gray-600">
                                {latestKpi.achievement}%
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400">{latestKpi.month}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No KPI record</span>
                        )}
                      </td>

                      {/* Visibility Status Badge */}
                      <td className="py-3.5 px-4">
                        {isHidden ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>Hidden (Admin Only)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Visible to Everyone</span>
                          </div>
                        )}
                      </td>

                      {/* Toggle Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onToggleHide(emp.id)}
                          disabled={isLoading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                            isHidden
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                          title={isHidden ? "Unhide rating for other users" : "Hide rating from other users"}
                        >
                          {isHidden ? (
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
