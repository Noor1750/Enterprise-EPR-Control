import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, AlertTriangle, CheckCircle2, User, Building2, Calendar, 
  Target, TrendingUp, Award, Search, Sparkles, RefreshCw, AlertCircle,
  PlusCircle, Users, Layers
} from 'lucide-react';
import { Employee, KPIRecord, getRatingInfo, MONTH_NAMES, generateMonthList } from './types';
import { calculatePerformanceRating } from '../../lib/kpiEngine';
import KPIModalNotification, { NotificationModalProps } from './KPIModalNotification';

interface BatchRowData {
  plan: string;
  achievement: string;
  selected: boolean;
}

interface KPIEntryProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  onSaveRecord: (record: KPIRecord) => Promise<void>;
  onBatchSaveRecords: (records: KPIRecord[]) => Promise<void>;
  defaultMonth?: string;
}

export default function KPIEntry({
  employees,
  kpiRecords,
  onSaveRecord,
  onBatchSaveRecords,
  defaultMonth
}: KPIEntryProps) {
  const monthOptions = useMemo(() => generateMonthList(18, 6), []);
  const [entryMode, setEntryMode] = useState<'single' | 'batch'>('single');

  // Single Form State
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [month, setMonth] = useState<string>(defaultMonth || monthOptions[6] || `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [plan, setPlan] = useState<string>('100');
  const [achievement, setAchievement] = useState<string>('');
  const rating = useMemo(() => calculatePerformanceRating(achievement), [achievement]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch Form State
  const [batchDept, setBatchDept] = useState<string>('All');
  const [batchMonth, setBatchMonth] = useState<string>(defaultMonth || monthOptions[6] || `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [batchDate, setBatchDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [batchData, setBatchData] = useState<Record<string, BatchRowData>>({});

  // Notification Modal State
  const [modalConfig, setModalConfig] = useState<NotificationModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmpId) return null;
    return employees.find(e => e.id.toUpperCase() === selectedEmpId.toUpperCase()) || null;
  }, [employees, selectedEmpId]);

  // Existing KPI record for selected Employee + Month
  const existingRecord = useMemo(() => {
    if (!selectedEmpId || !month) return null;
    return kpiRecords.find(k => 
      k.employeeId.toUpperCase() === selectedEmpId.toUpperCase() && 
      k.month.trim() === month.trim()
    ) || null;
  }, [kpiRecords, selectedEmpId, month]);

  // When existing record changes in single mode, autofill or give hint
  useEffect(() => {
    if (existingRecord) {
      setPlan(String(existingRecord.plan));
      setAchievement(String(existingRecord.achievement));
      if (existingRecord.date) setDate(existingRecord.date);
    } else {
      setPlan('100');
      setAchievement('');
    }
  }, [existingRecord]);

  // Filtered employees for dropdown search (only pending)
  const filteredEmployeeOptions = useMemo(() => {
    const pendingEmployees = employees.filter(e => {
      if (e.status === 'Inactive') return false;
      const hasRecord = kpiRecords.some(k => 
        k.employeeId.toUpperCase() === e.id.toUpperCase() && 
        k.month.trim() === month.trim()
      );
      return !hasRecord;
    });

    const q = searchQuery.toLowerCase().trim();
    if (!q) return pendingEmployees.slice(0, 30);
    return pendingEmployees.filter(e => 
      e.id.toLowerCase().includes(q) || 
      e.name.toLowerCase().includes(q) || 
      e.department.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [employees, kpiRecords, month, searchQuery]);

  // Departments for batch mode
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Initialize batch data when department or month changes (only pending)
  useEffect(() => {
    const deptEmps = employees.filter(e => {
      if (e.status === 'Inactive') return false;
      if (batchDept !== 'All' && e.department !== batchDept) return false;
      
      const hasRecord = kpiRecords.some(k => 
        k.employeeId.toUpperCase() === e.id.toUpperCase() && 
        k.month.trim() === batchMonth.trim()
      );
      return !hasRecord; // Only show pending employees
    });

    const initialMap: Record<string, { plan: string; achievement: string; selected: boolean }> = {};
    deptEmps.forEach(e => {
      initialMap[e.id] = {
        plan: '100',
        achievement: '',
        selected: true
      };
    });
    setBatchData(initialMap);
  }, [employees, kpiRecords, batchDept, batchMonth]);

  // Single Form Submission
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation: Employee ID
    if (!selectedEmployee) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Invalid Employee ID',
        message: 'Please select an existing employee from the master employee database.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // 2. Validation: Month & Date
    if (!month.trim()) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Month is Required',
        message: 'Please select a valid month for this KPI record.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // 3. Validation: Plan % (0 - 100)
    const planNum = parseFloat(plan);
    if (isNaN(planNum) || planNum < 0 || planNum > 100) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Invalid Plan (%) Value',
        message: 'Plan (%) must be a percentage number between 0% and 100%.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // 4. Validation: Achievement % (0 - 100, cannot exceed 100%)
    const achNum = parseFloat(achievement);
    if (isNaN(achNum) || achNum < 0) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Invalid Achievement (%) Value',
        message: 'Achievement (%) must be a valid positive number.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (achNum > 100) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Achievement Exceeds Maximum 100%',
        message: `You entered ${achNum}%. The maximum allowed achievement is 100%. Please enter a value between 0% and 100%.`,
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // 5. Validation: Rating (2.0 - 5.0 numeric)
    if (rating < 2.0 || rating > 5.0) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Invalid Rating',
        message: 'Rating must be between 2.0 and 5.0.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // Construct Record
    const record: KPIRecord = {
      kpiId: `${selectedEmployee.id.toUpperCase()}_${month.trim()}`,
      employeeId: selectedEmployee.id.toUpperCase(),
      employeeName: selectedEmployee.name,
      department: selectedEmployee.department || 'Unassigned',
      month: month.trim(),
      date: date || new Date().toISOString().substring(0, 10),
      plan: Math.round(planNum),
      achievement: Math.round(achNum),
      rating: rating,
      updatedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onSaveRecord(record);
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: existingRecord ? 'KPI Record Updated Successfully' : 'KPI Record Saved Successfully',
        message: `Employee: ${selectedEmployee.name} (${selectedEmployee.id})\nMonth: ${month}\nPlan: ${record.plan}% | Achievement: ${record.achievement}% | Rating: ${record.rating}`,
        details: [
          `Employee ID: ${record.employeeId}`,
          `Department: ${record.department}`,
          `Month Period: ${record.month}`,
          `Action: ${existingRecord ? 'Updated existing monthly record' : 'Created new monthly record'}`
        ],
        onClose: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          // clear or keep selected
          setSelectedEmpId('');
          setSearchQuery('');
        }
      });
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Failed to Save KPI Record',
        message: err?.message || 'A network error occurred while updating the database. Please check permissions.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Form Submission
  const handleBatchSubmit = async () => {
    const selectedEmps: [string, BatchRowData][] = (Object.entries(batchData) as [string, BatchRowData][]).filter(([_, data]) => data.selected);
    if (selectedEmps.length === 0) {
      setModalConfig({
        isOpen: true,
        type: 'warning',
        title: 'No Employees Selected',
        message: 'Please select at least one employee to save batch KPI records.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // Validate all rows
    const invalidRows: string[] = [];
    const recordsToSave: KPIRecord[] = [];

    for (const [empId, data] of selectedEmps) {
      const emp = employees.find(e => e.id.toUpperCase() === empId.toUpperCase());
      if (!emp) continue;

      const pNum = parseFloat(data.plan);
      const aNum = parseFloat(data.achievement);

      if (isNaN(pNum) || pNum < 0 || pNum > 100) {
        invalidRows.push(`${emp.name} (${emp.id}): Plan must be 0–100%`);
        continue;
      }

      if (isNaN(aNum) || aNum < 0 || aNum > 100) {
        invalidRows.push(`${emp.name} (${emp.id}): Achievement must be 0–100% (max 100%)`);
        continue;
      }

      recordsToSave.push({
        kpiId: `${emp.id.toUpperCase()}_${batchMonth.trim()}`,
        employeeId: emp.id.toUpperCase(),
        employeeName: emp.name,
        department: emp.department || 'Unassigned',
        month: batchMonth.trim(),
        date: batchDate,
        plan: Math.round(pNum),
        achievement: Math.round(aNum),
        rating: calculatePerformanceRating(data.achievement),
        updatedAt: new Date().toISOString()
      });
    }

    if (invalidRows.length > 0) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Validation Errors in Batch Entry',
        message: 'Some records contain invalid percentages (e.g. above 100%). Please fix them before submitting.',
        details: invalidRows.slice(0, 6),
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onBatchSaveRecords(recordsToSave);
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Batch KPI Records Saved Successfully',
        message: `Successfully processed ${recordsToSave.length} employee KPI records for ${batchMonth}.`,
        details: [
          `Department: ${batchDept}`,
          `Month Period: ${batchMonth}`,
          `Total Records: ${recordsToSave.length}`
        ],
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Failed to Save Batch Records',
        message: err?.message || 'Error occurred during batch save.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mode Switcher */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#2A3F54]">Monthly KPI Entry</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Record employee performance metrics. Employee ID is the primary master key.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setEntryMode('single')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              entryMode === 'single' ? 'bg-white text-[#2A3F54] shadow-2xs' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Single Entry
          </button>
          <button
            onClick={() => setEntryMode('batch')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              entryMode === 'batch' ? 'bg-white text-[#2A3F54] shadow-2xs' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Batch Department Entry
          </button>
        </div>
      </div>

      {/* SINGLE ENTRY MODE */}
      {entryMode === 'single' && (
        <form onSubmit={handleSingleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#2A3F54] text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-xs">
                <Target className="w-5 h-5 text-[#26B99A]" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Individual Employee KPI Evaluation</h4>
                <p className="text-xs text-gray-300">Name & Department are auto-fetched from the master database</p>
              </div>
            </div>
            {existingRecord && (
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Existing Record Found (Will Update)
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Employee Selection with Auto-Retrieve */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-gray-100">
              {/* Employee ID Selector */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  1. Employee ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or Select ID..."
                    value={selectedEmpId}
                    onChange={e => {
                      setSelectedEmpId(e.target.value);
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#26B99A] focus:border-transparent uppercase"
                    required
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                    {filteredEmployeeOptions.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 text-center">
                        No matching employee found in master database
                      </div>
                    ) : (
                      filteredEmployeeOptions.map((emp, idx) => (
                        <div
                          key={`${emp.id}-${idx}`}
                          onClick={() => {
                            setSelectedEmpId(emp.id);
                            setIsDropdownOpen(false);
                          }}
                          className="px-3 py-2 text-xs hover:bg-emerald-50 cursor-pointer border-b border-gray-50 flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-bold text-gray-800 group-hover:text-[#26B99A]">{emp.name}</div>
                            <div className="text-[11px] text-gray-400">{emp.department} • {emp.designation}</div>
                          </div>
                          <span className="font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                            {emp.id}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Auto Retrieved: Employee Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Employee Name (Auto)
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{selectedEmployee ? selectedEmployee.name : '— Select ID above —'}</span>
                </div>
              </div>

              {/* Auto Retrieved: Department */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Department (Auto)
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{selectedEmployee ? selectedEmployee.department : '— Select ID above —'}</span>
                </div>
              </div>
            </div>

            {/* Step 2: Month & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-gray-100">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  2. Evaluation Month <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#26B99A]"
                    required
                  >
                    {monthOptions.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Entry / Assessment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#26B99A]"
                  required
                />
              </div>
            </div>

            {/* Step 3: KPI Metrics (Plan %, Achievement %, Rating) */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                3. Performance Metrics & Rating
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan % */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-indigo-600" />
                      Plan Target (%) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-600 font-mono">0% – 100%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={plan}
                      onChange={e => setPlan(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full pl-3 pr-8 py-2 text-sm font-black text-indigo-900 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-indigo-400 text-xs">%</span>
                  </div>
                  <p className="text-[11px] text-indigo-700/70 mt-1.5">Target production or efficiency milestone for this period.</p>
                </div>

                {/* Achievement % */}
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#26B99A]" />
                      Actual Achievement (%) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 font-mono">Max: 100%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={achievement}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (val > 100) {
                          setAchievement('100');
                        } else {
                          setAchievement(e.target.value);
                        }
                      }}
                      placeholder="e.g. 95"
                      className="w-full pl-3 pr-8 py-2 text-sm font-black text-emerald-900 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#26B99A]"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-emerald-500 text-xs">%</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/70 mt-1.5">
                    * Maximum allowed value is strictly 100%.
                  </p>
                </div>
              </div>

              {/* Rating (2.0 to 5.0) Auto-Calculated */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Performance Rating (Auto-Calculated)
                  </label>
                  <span className="text-xs font-bold text-gray-500">
                    <strong className="text-gray-900 font-black text-lg">{achievement === '' ? '—' : rating.toFixed(1)}</strong> / 5.0
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                      <span className="text-amber-600 font-black text-xl">{achievement === '' ? '—' : rating.toFixed(1)}</span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        {achievement === '' ? 'Pending Entry' : getRatingInfo(rating).label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Rating is automatically calculated based on the achievement percentage.
                      </div>
                    </div>
                  </div>
                </div>
                {parseFloat(achievement) < 70 && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>Below Threshold:</strong> The achievement is below 70%. The rating has been set to the minimum value of 2.0.
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-3 text-center">
                  * Note: Rating scales linearly from 2.0 (70%) to 5.0 (100%).
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSelectedEmpId('');
                setPlan('100');
                setAchievement('95');
              }}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedEmployee}
              className="px-6 py-2.5 bg-[#26B99A] hover:bg-[#169F85] text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : existingRecord ? 'Update KPI Record' : 'Save KPI Record'}
            </button>
          </div>
        </form>
      )}

      {/* BATCH DEPARTMENT ENTRY MODE */}
      {entryMode === 'batch' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden space-y-4">
          <div className="bg-[#2A3F54] text-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm">Batch Monthly KPI Entry</h4>
              <p className="text-xs text-gray-300">Quickly evaluate all department members for {batchMonth}</p>
            </div>
            <button
              onClick={handleBatchSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#26B99A] hover:bg-[#169F85] text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving All...' : 'Save All Selected'}
            </button>
          </div>

          {/* Filters for batch */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Department
              </label>
              <select
                value={batchDept}
                onChange={e => setBatchDept(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Month
              </label>
              <select
                value={batchMonth}
                onChange={e => setBatchMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg focus:outline-none"
              >
                {monthOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Date
              </label>
              <input
                type="date"
                value={batchDate}
                onChange={e => setBatchDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {/* Batch Table */}
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={Object.values(batchData).length > 0 && (Object.values(batchData) as BatchRowData[]).every(v => v.selected)}
                      onChange={e => {
                        const checked = e.target.checked;
                        setBatchData(prev => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach(k => updated[k].selected = checked);
                          return updated;
                        });
                      }}
                    />
                  </th>
                  <th className="py-2.5 px-3">Employee ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 w-28">Plan (%)</th>
                  <th className="py-2.5 px-3 w-28">Achievement (%)</th>
                  <th className="py-2.5 px-3 w-32">Rating (1–5)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.keys(batchData).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No active employees found for this department.
                    </td>
                  </tr>
                ) : (
                  (Object.entries(batchData) as [string, BatchRowData][]).map(([empId, data]) => {
                    const emp = employees.find(e => e.id.toUpperCase() === empId.toUpperCase());
                    if (!emp) return null;

                    return (
                      <tr key={empId} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={data.selected}
                            onChange={e => {
                              const checked = e.target.checked;
                              setBatchData(prev => ({
                                ...prev,
                                [empId]: { ...prev[empId], selected: checked }
                              }));
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-700">{emp.id}</td>
                        <td className="py-2.5 px-3 font-bold text-[#2A3F54]">{emp.name}</td>
                        <td className="py-2.5 px-3 text-gray-500">{emp.department}</td>
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={data.plan}
                              onChange={e => {
                                const val = e.target.value;
                                setBatchData(prev => ({
                                  ...prev,
                                  [empId]: { ...prev[empId], plan: val }
                                }));
                              }}
                              className="w-full pr-5 pl-2 py-1 text-xs border border-gray-300 rounded font-bold"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={data.achievement}
                              onChange={e => {
                                let val = parseFloat(e.target.value);
                                if (val > 100) val = 100;
                                setBatchData(prev => ({
                                  ...prev,
                                  [empId]: { ...prev[empId], achievement: String(isNaN(val) ? '' : val) }
                                }));
                              }}
                              className="w-full pr-5 pl-2 py-1 text-xs border border-emerald-300 rounded font-bold text-emerald-800"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px]">%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded font-bold text-gray-700 text-center">
                            {data.achievement === '' ? '—' : calculatePerformanceRating(data.achievement).toFixed(1)}
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
      )}

      {/* Reusable Notification & Confirmation Modal */}
      <KPIModalNotification {...modalConfig} />
    </div>
  );
}
