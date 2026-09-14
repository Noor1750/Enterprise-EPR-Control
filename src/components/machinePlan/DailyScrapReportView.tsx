import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  Calendar, 
  RefreshCw, 
  TrendingDown, 
  FileText, 
  Download, 
  Filter,
  X,
  PlusCircle,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { 
  ScrapRecord, 
  DepartmentScrapSummary, 
  STANDARD_SCRAP_DEPARTMENTS, 
  STANDARD_SCRAP_UOMS, 
  calculateScrapKPIs, 
  calculateDepartmentSummaries, 
  serializeScrapRecord, 
  exportScrapReportToExcel, 
  exportScrapReportToCSV 
} from '../../lib/scrapReportEngine';
import { appendRow, updateRange } from '../../lib/sheets';
import { DateFilterPreset, MachinePlanSettings } from '../../types/machinePlan';
import { 
  getDateRangeForPreset, 
  getDepartmentTargetScrap, 
  getDepartmentUom, 
  getConfiguredDepartments,
  isScrapOverTarget 
} from '../../lib/machinePlanEngine';

const DATE_PRESETS: { id: DateFilterPreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'specific', label: 'Specific Date' },
  { id: 'range', label: 'Date Range' },
];

interface DailyScrapReportViewProps {
  records: ScrapRecord[];
  onReload: () => Promise<void>;
  spreadsheetId: string;
  userEmail: string;
  departmentList: string[];
  settings?: MachinePlanSettings;
  onOpenSettings?: () => void;
}

export const DailyScrapReportView: React.FC<DailyScrapReportViewProps> = ({
  records,
  onReload,
  spreadsheetId,
  userEmail,
  departmentList,
  settings,
  onOpenSettings
}) => {
  // Filters
  const todayRange = useMemo(() => getDateRangeForPreset('today'), []);
  const todayStr = todayRange.start;
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('today');
  const [startDate, setStartDate] = useState<string>(todayRange.start);
  const [endDate, setEndDate] = useState<string>(todayRange.end);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handlePresetChange = (preset: DateFilterPreset) => {
    setDatePreset(preset);
    if (preset === 'specific') {
      const cur = startDate || todayRange.start;
      setStartDate(cur);
      setEndDate(cur);
      return;
    }
    if (preset === 'range') {
      return;
    }
    const range = getDateRangeForPreset(preset);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const handleResetFilters = () => {
    const range = getDateRangeForPreset('today');
    setDatePreset('today');
    setStartDate(range.start);
    setEndDate(range.end);
    setSelectedDepartment('All');
    setSearchQuery('');
  };

  // Single Modal State
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ScrapRecord | null>(null);
  const [singleForm, setSingleForm] = useState({
    date: todayStr,
    department: departmentList[0] || 'Offset',
    uom: 'Sheets',
    required: '',
    used: '',
    remarks: ''
  });

  // Batch Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchDate, setBatchDate] = useState(todayStr);
  const [batchRows, setBatchRows] = useState<Array<{
    id: string;
    department: string;
    uom: string;
    required: string;
    used: string;
    remarks: string;
  }>>([
    { id: '1', department: 'Offset', uom: 'Sheets', required: '', used: '', remarks: '' },
    { id: '2', department: 'PFL', uom: 'Mtr', required: '', used: '', remarks: '' },
    { id: '3', department: 'Woven', uom: 'Mtr', required: '', used: '', remarks: '' }
  ]);

  // Loading & notification states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Departments for dropdowns - thoroughly sanitized & loaded from settings
  const allDepartments = useMemo(() => {
    return getConfiguredDepartments(settings, departmentList);
  }, [settings, departmentList]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Date filter
      if (datePreset === 'specific') {
        if (startDate && r.date !== startDate) return false;
      } else if (startDate && endDate) {
        if (r.date < startDate || r.date > endDate) return false;
      } else if (startDate) {
        if (r.date !== startDate) return false;
      }

      // Department filter
      if (selectedDepartment !== 'All' && r.department !== selectedDepartment) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDept = r.department.toLowerCase().includes(q);
        const matchUom = r.uom.toLowerCase().includes(q);
        const matchRemarks = (r.remarks || '').toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        if (!matchDept && !matchUom && !matchRemarks && !matchId) return false;
      }

      return true;
    });
  }, [records, datePreset, startDate, endDate, selectedDepartment, searchQuery]);

  // Compute metrics
  const kpis = useMemo(() => calculateScrapKPIs(filteredRecords), [filteredRecords]);
  const deptSummaries = useMemo(() => calculateDepartmentSummaries(filteredRecords), [filteredRecords]);

  // Live calculation for single modal
  const singleLiveCalc = useMemo(() => {
    const req = Math.max(0, parseFloat(singleForm.required) || 0);
    const used = Math.max(0, parseFloat(singleForm.used) || 0);
    const scrapQty = used > req ? used - req : 0;
    const scrapPct = req > 0 ? (scrapQty / req) * 100 : 0;
    return { req, used, scrapQty, scrapPct };
  }, [singleForm.required, singleForm.used]);

  // Duplicate Prevention: Set of department names that already entered scrap on singleForm.date
  const enteredDepartmentsOnSingleDate = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.date && r.date.trim() === singleForm.date.trim()) {
        if (!editingRecord || r.id !== editingRecord.id) {
          set.add(r.department.toLowerCase().trim());
        }
      }
    });
    return set;
  }, [records, singleForm.date, editingRecord]);

  // Available departments for single entry (excludes departments that already submitted on that date)
  const availableDepartmentsForSingle = useMemo(() => {
    return allDepartments.filter(d => {
      if (editingRecord && d.toLowerCase().trim() === editingRecord.department.toLowerCase().trim()) {
        return true;
      }
      return !enteredDepartmentsOnSingleDate.has(d.toLowerCase().trim());
    });
  }, [allDepartments, enteredDepartmentsOnSingleDate, editingRecord]);

  // If singleForm.date changes and current selected department is already entered, switch to first available
  React.useEffect(() => {
    if (!editingRecord && availableDepartmentsForSingle.length > 0) {
      const isCurrentAvailable = availableDepartmentsForSingle.some(
        d => d.toLowerCase().trim() === singleForm.department.toLowerCase().trim()
      );
      if (!isCurrentAvailable) {
        const nextDept = availableDepartmentsForSingle[0];
        setSingleForm(prev => ({
          ...prev,
          department: nextDept,
          uom: getDepartmentUom(nextDept, settings)
        }));
      }
    }
  }, [singleForm.date, availableDepartmentsForSingle, editingRecord, singleForm.department, settings]);

  // Duplicate Prevention: Set of department names that already entered scrap on batchDate
  const enteredDepartmentsOnBatchDate = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.date && r.date.trim() === batchDate.trim()) {
        set.add(r.department.toLowerCase().trim());
      }
    });
    return set;
  }, [records, batchDate]);

  // Available departments for batch entry
  const availableDepartmentsForBatch = useMemo(() => {
    return allDepartments.filter(d => !enteredDepartmentsOnBatchDate.has(d.toLowerCase().trim()));
  }, [allDepartments, enteredDepartmentsOnBatchDate]);

  // Handlers
  const handleOpenAddSingle = () => {
    setEditingRecord(null);
    const targetDate = startDate || todayStr;
    const entered = new Set(
      records.filter(r => r.date && r.date.trim() === targetDate.trim()).map(r => r.department.toLowerCase().trim())
    );
    const available = allDepartments.filter(d => !entered.has(d.toLowerCase().trim()));
    const initialDept = selectedDepartment !== 'All' && !entered.has(selectedDepartment.toLowerCase().trim())
      ? selectedDepartment
      : (available[0] || 'Offset');

    setSingleForm({
      date: targetDate,
      department: initialDept,
      uom: getDepartmentUom(initialDept, settings),
      required: '',
      used: '',
      remarks: ''
    });
    setIsSingleModalOpen(true);
  };

  const handleOpenEdit = (rec: ScrapRecord) => {
    setEditingRecord(rec);
    setSingleForm({
      date: rec.date,
      department: rec.department,
      uom: rec.uom,
      required: rec.required.toString(),
      used: rec.used.toString(),
      remarks: rec.remarks || ''
    });
    setIsSingleModalOpen(true);
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.department || !singleForm.uom) {
      setFeedback({ type: 'error', message: 'Department and UOM are required.' });
      return;
    }

    // Duplicate prevention check
    if (!editingRecord && enteredDepartmentsOnSingleDate.has(singleForm.department.toLowerCase().trim())) {
      setFeedback({
        type: 'error',
        message: `Department "${singleForm.department}" has already submitted a scrap report for ${singleForm.date}. Duplicate reports are not allowed.`
      });
      return;
    }

    const req = parseFloat(singleForm.required) || 0;
    const used = parseFloat(singleForm.used) || 0;
    const scrapQty = used > req ? used - req : 0;
    const scrapPct = req > 0 ? (scrapQty / req) * 100 : 0;

    setIsSubmitting(true);
    try {
      if (editingRecord) {
        // Update existing record
        const updatedRecord: ScrapRecord = {
          ...editingRecord,
          date: singleForm.date,
          department: singleForm.department,
          uom: singleForm.uom,
          required: req,
          used,
          scrapQty: Number(scrapQty.toFixed(2)),
          scrapPct: Number(scrapPct.toFixed(2)),
          remarks: singleForm.remarks,
          updatedBy: userEmail,
          updatedAt: new Date().toISOString()
        };

        const serialized = serializeScrapRecord(updatedRecord, userEmail);
        const recordIndex = records.findIndex(r => r.id === editingRecord.id);
        if (recordIndex !== -1) {
          const rowNum = recordIndex + 2;
          await updateRange(spreadsheetId, `DailyScrapReport!A${rowNum}:M${rowNum}`, [serialized]);
        }
        setFeedback({ type: 'success', message: `Scrap record for ${singleForm.department} updated successfully.` });
      } else {
        // Create new record
        const newRecord: ScrapRecord = {
          id: `SCR-${singleForm.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
          date: singleForm.date,
          department: singleForm.department,
          uom: singleForm.uom,
          required: req,
          used,
          scrapQty: Number(scrapQty.toFixed(2)),
          scrapPct: Number(scrapPct.toFixed(2)),
          remarks: singleForm.remarks,
          createdBy: userEmail,
          createdAt: new Date().toISOString()
        };

        const serialized = serializeScrapRecord(newRecord, userEmail);
        await appendRow(spreadsheetId, 'DailyScrapReport!A:M', [serialized]);
        setFeedback({ type: 'success', message: `New scrap record for ${singleForm.department} created successfully.` });
      }

      setIsSingleModalOpen(false);
      await onReload();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to save scrap report.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (rec: ScrapRecord) => {
    if (!window.confirm(`Are you sure you want to delete scrap record ${rec.id} (${rec.department})?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      // Mark as deleted or empty row
      const recordIndex = records.findIndex(r => r.id === rec.id);
      if (recordIndex !== -1) {
        const rowNum = recordIndex + 2;
        const emptyRow = new Array(13).fill('');
        await updateRange(spreadsheetId, `DailyScrapReport!A${rowNum}:M${rowNum}`, [emptyRow]);
      }
      setFeedback({ type: 'success', message: `Scrap record deleted.` });
      await onReload();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to delete record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenBatch = () => {
    const targetDate = startDate || todayStr;
    setBatchDate(targetDate);
    const entered = new Set(
      records.filter(r => r.date && r.date.trim() === targetDate.trim()).map(r => r.department.toLowerCase().trim())
    );
    const available = allDepartments.filter(d => !entered.has(d.toLowerCase().trim()));
    setBatchRows(
      available.map((dept, idx) => ({
        id: String(idx + 1),
        department: dept,
        uom: getDepartmentUom(dept, settings),
        required: '',
        used: '',
        remarks: ''
      }))
    );
    setIsBatchModalOpen(true);
  };

  // Sync batchRows when batchDate changes or when modal opens
  const handleBatchDateChange = (newDate: string) => {
    setBatchDate(newDate);
    const entered = new Set(
      records.filter(r => r.date && r.date.trim() === newDate.trim()).map(r => r.department.toLowerCase().trim())
    );
    const available = allDepartments.filter(d => !entered.has(d.toLowerCase().trim()));
    setBatchRows(
      available.map((dept, idx) => ({
        id: String(idx + 1),
        department: dept,
        uom: getDepartmentUom(dept, settings),
        required: '',
        used: '',
        remarks: ''
      }))
    );
  };

  const handleAddBatchRow = (deptToAdd?: string) => {
    const usedDepts = new Set(batchRows.map(r => r.department.toLowerCase().trim()));
    const remainingDepts = availableDepartmentsForBatch.filter(d => !usedDepts.has(d.toLowerCase().trim()));
    const targetDept = deptToAdd || remainingDepts[0] || availableDepartmentsForBatch[0] || 'Offset';

    setBatchRows(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        department: targetDept,
        uom: getDepartmentUom(targetDept, settings),
        required: '',
        used: '',
        remarks: ''
      }
    ]);
  };

  const handleRemoveBatchRow = (id: string) => {
    if (batchRows.length <= 1) return;
    setBatchRows(prev => prev.filter(r => r.id !== id));
  };

  const handleBatchRowChange = (id: string, field: string, value: string) => {
    setBatchRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (field === 'department') {
        return { ...r, department: value, uom: getDepartmentUom(value, settings) };
      }
      return { ...r, [field]: value };
    }));
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = batchRows.filter(r => (parseFloat(r.required) || 0) > 0 || (parseFloat(r.used) || 0) > 0);

    if (validRows.length === 0) {
      setFeedback({ type: 'error', message: 'Please enter Required or Used quantities for at least one department.' });
      return;
    }

    // Duplicate check against existing records for batchDate
    const duplicates = validRows.filter(r => enteredDepartmentsOnBatchDate.has(r.department.toLowerCase().trim()));
    if (duplicates.length > 0) {
      setFeedback({
        type: 'error',
        message: `Department(s) ${duplicates.map(d => `"${d.department}"`).join(', ')} already have scrap reports for ${batchDate}. Duplicate reports are not allowed.`
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const rowsToAppend = validRows.map((r, idx) => {
        const req = parseFloat(r.required) || 0;
        const used = parseFloat(r.used) || 0;
        const scrapQty = used > req ? used - req : 0;
        const scrapPct = req > 0 ? (scrapQty / req) * 100 : 0;
        const newRecord: ScrapRecord = {
          id: `SCR-${batchDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}-${idx + 1}`,
          date: batchDate,
          department: r.department,
          uom: r.uom,
          required: req,
          used,
          scrapQty: Number(scrapQty.toFixed(2)),
          scrapPct: Number(scrapPct.toFixed(2)),
          remarks: r.remarks,
          createdBy: userEmail,
          createdAt: new Date().toISOString()
        };
        return serializeScrapRecord(newRecord, userEmail);
      });

      for (const row of rowsToAppend) {
        await appendRow(spreadsheetId, 'DailyScrapReport!A:M', [row]);
      }

      setFeedback({ type: 'success', message: `Batch scrap reports for ${rowsToAppend.length} departments recorded successfully.` });
      setIsBatchModalOpen(false);
      await onReload();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to save batch scrap records.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3" id="scrap-report-control-bar">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date filter presets pill group */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none" id="scrap-date-presets-group">
              {DATE_PRESETS.map(p => {
                const isActive = datePreset === p.id;
                return (
                  <button
                    key={p.id}
                    id={`scrap-date-preset-${p.id}`}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="scrap-dept-filter-select"
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="All">All Departments</option>
                {allDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="scrap-search-input"
                type="text"
                placeholder="Search remarks, dept..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 w-40 md:w-52"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Reset filters button if non-default */}
            {(datePreset !== 'today' || selectedDepartment !== 'All' || searchQuery.trim() !== '') && (
              <button
                id="scrap-reset-filters-btn"
                type="button"
                onClick={handleResetFilters}
                title="Reset Filters to Today"
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="scrap-batch-entry-btn"
              type="button"
              onClick={handleOpenBatch}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Dept Entry</span>
            </button>

            <button
              id="scrap-add-entry-btn"
              type="button"
              onClick={handleOpenAddSingle}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Scrap Entry</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              id="scrap-export-excel-btn"
              type="button"
              onClick={() => exportScrapReportToExcel(filteredRecords, deptSummaries, startDate === endDate ? startDate : `${startDate}_to_${endDate}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Export to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Excel</span>
            </button>

            <button
              id="scrap-export-csv-btn"
              type="button"
              onClick={() => exportScrapReportToCSV(filteredRecords)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">CSV</span>
            </button>

            {onOpenSettings && (
              <button
                id="scrap-open-settings-btn"
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Configure Machine Target UEE % & Department Target Scrap %"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">Targets</span>
              </button>
            )}

            <button
              id="scrap-refresh-btn"
              type="button"
              onClick={onReload}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Inputs Sub-Bar for Specific Date, Date Range, or Range Indicator */}
        {(datePreset === 'specific' || datePreset === 'range' || datePreset === 'this_week' || datePreset === 'this_month' || datePreset === 'yesterday') && (
          <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 text-xs">
            {datePreset === 'specific' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-600">Specific Date:</span>
                <input
                  id="scrap-specific-date-input"
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {datePreset === 'range' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-600">From:</span>
                  <input
                    id="scrap-range-start-date-input"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">To:</span>
                  <input
                    id="scrap-range-end-date-input"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {(datePreset === 'this_week' || datePreset === 'this_month' || datePreset === 'yesterday') && (
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Active Period:</span>
                <span className="font-bold text-slate-700">
                  {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Required */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Material Required
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {kpis.totalRequired.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Across {kpis.recordsCount} production lots
          </div>
        </div>

        {/* Total Used */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Material Used
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {kpis.totalUsed.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Gross consumption logged
          </div>
        </div>

        {/* Total Scrap Quantity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Scrap Qty</span>
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {kpis.totalScrapQty.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Used - Required variance
          </div>
        </div>

        {/* Overall Scrap Rate % */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          {(() => {
            const overallTarget = settings?.defaultDeptScrapTarget ?? 3.0;
            const isOverallOver = kpis.overallScrapPct > overallTarget;
            return (
              <>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Overall Scrap Rate</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isOverallOver 
                      ? 'bg-rose-100 text-rose-700 border-rose-200' 
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {isOverallOver ? 'Over Target (Red)' : 'Within Target (Green)'}
                  </span>
                </div>
                <div className={`text-xl font-black font-mono ${
                  isOverallOver ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {kpis.overallScrapPct.toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Target threshold: &le; {overallTarget}%
                </div>
              </>
            );
          })()}
        </div>

        {/* Top Scrap Dept */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Highest Scrap Dept
          </div>
          <div className="text-lg font-black text-slate-800 truncate">
            {kpis.topScrapDepartment}
          </div>
          <div className="text-[10px] text-rose-600 font-bold mt-1 font-mono">
            {kpis.topScrapDepartmentPct > 0 ? `${kpis.topScrapDepartmentPct.toFixed(2)}% scrap rate` : 'Zero scrap'}
          </div>
        </div>
      </div>

      {/* Department Summaries Cards Row */}
      {deptSummaries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Department-Wise Scrap Distribution</span>
            </h3>
            <span className="text-[11px] text-slate-400">Click a card to filter table</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {deptSummaries.map(s => {
              const isSelected = selectedDepartment === s.department;
              const deptTarget = getDepartmentTargetScrap(s.department, settings);
              const isOver = isScrapOverTarget(s.department, s.scrapPct, settings);
              return (
                <button
                  key={s.department}
                  type="button"
                  onClick={() => setSelectedDepartment(isSelected ? 'All' : s.department)}
                  title={`Department: ${s.department} | Scrap: ${s.scrapPct.toFixed(2)}% | Target: ≤${deptTarget}% | Status: ${isOver ? 'Over Target (Red)' : 'Within Target (Green)'}`}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-400 shadow-xs ring-1 ring-indigo-300' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 truncate">{s.department}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isOver ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-emerald-500 ring-2 ring-emerald-200'
                    }`} />
                  </div>
                  <div className={`text-sm font-black font-mono ${isOver ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {s.scrapPct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1">
                    <span>Scrap: {s.totalScrapQty.toLocaleString()}</span>
                    <span className={`font-semibold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                      &le;{deptTarget}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Scrap Records Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Daily Scrap Detailed Register</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {filteredRecords.length} records
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Fields: Date, Department, UOM, Required, Used, Scrap Qty, Scrap %, Remark
            </p>
          </div>

          {selectedDepartment !== 'All' && (
            <button
              onClick={() => setSelectedDepartment('All')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <span>Clear dept filter ({selectedDepartment})</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                <th className="p-3 text-center w-12">SL</th>
                <th className="p-3">Date</th>
                <th className="p-3">Department</th>
                <th className="p-3 text-center">UOM</th>
                <th className="p-3 text-right">Required</th>
                <th className="p-3 text-right">Used</th>
                <th className="p-3 text-right">Scrap Qty</th>
                <th className="p-3 text-center">Scrap %</th>
                <th className="p-3">Remark</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.map((r, idx) => {
                const isWarning = r.scrapPct > 2.5;
                const isCritical = r.scrapPct > 5.0;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-800">{r.date}</td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900">{r.department}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700">
                        {r.uom}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {r.required.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {r.used.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-amber-700 bg-amber-50/20">
                      {r.scrapQty.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const targetScrap = getDepartmentTargetScrap(r.department, settings);
                        const isOver = isScrapOverTarget(r.department, r.scrapPct, settings);
                        return (
                          <span 
                            title={`Department: ${r.department} | Scrap: ${r.scrapPct.toFixed(2)}% | Target: ≤${targetScrap}% | Status: ${isOver ? 'Over Target (Red)' : 'Within Target (Green)'}`}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] border ${
                              isOver 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {r.scrapPct.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={r.remarks}>
                      {r.remarks || <span className="text-slate-300 italic">None</span>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Scrap Record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(r)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 font-medium">
                    No scrap records found matching current date or filter. Click "Add Scrap Entry" or "Batch Dept Entry".
                  </td>
                </tr>
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 text-slate-800 font-black border-t-2 border-slate-200 text-xs">
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider">
                    Aggregate Totals:
                  </td>
                  <td className="p-3 text-right font-mono font-black">
                    {kpis.totalRequired.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-black">
                    {kpis.totalUsed.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-amber-700">
                    {kpis.totalScrapQty.toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-mono font-black">
                    {kpis.overallScrapPct.toFixed(2)}%
                  </td>
                  <td colSpan={2} className="p-3 text-slate-500 font-normal italic">
                    {deptSummaries.length} departments recorded
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* SINGLE ADD / EDIT MODAL */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRecord ? 'Edit Scrap Report' : 'Add Daily Scrap Report'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Department-wise material variance & scrap logging
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSingleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={singleForm.date}
                    onChange={e => setSingleForm({ ...singleForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Department</span>
                    {!editingRecord && (
                      <span className="text-[10px] font-normal text-slate-500">
                        ({availableDepartmentsForSingle.length} available, {enteredDepartmentsOnSingleDate.size} entered)
                      </span>
                    )}
                  </label>
                  {availableDepartmentsForSingle.length === 0 && !editingRecord ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium">
                      All departments have already submitted scrap reports for {singleForm.date}.
                    </div>
                  ) : (
                    <select
                      value={singleForm.department}
                      onChange={e => {
                        const nextDept = e.target.value;
                        setSingleForm({ 
                          ...singleForm, 
                          department: nextDept,
                          uom: getDepartmentUom(nextDept, settings)
                        });
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 cursor-pointer font-bold text-slate-800"
                    >
                      {availableDepartmentsForSingle.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* UOM */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UOM</label>
                  <select
                    value={singleForm.uom}
                    onChange={e => setSingleForm({ ...singleForm, uom: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {STANDARD_SCRAP_UOMS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Required */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Required</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5000"
                    value={singleForm.required}
                    onChange={e => setSingleForm({ ...singleForm, required: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Used */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Used</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5120"
                    value={singleForm.used}
                    onChange={e => setSingleForm({ ...singleForm, used: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Calculated Scrap Qty</div>
                  <div className="text-base font-black text-amber-700 font-mono">
                    {singleLiveCalc.scrapQty.toLocaleString()} {singleForm.uom}
                  </div>
                </div>
                <div>
                  {(() => {
                    const targetScrap = getDepartmentTargetScrap(singleForm.department, settings);
                    const isOver = isScrapOverTarget(singleForm.department, singleLiveCalc.scrapPct, settings);
                    return (
                      <>
                        <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1">
                          <span>Calculated Scrap %</span>
                          <span className="text-slate-400 font-normal">(&le;{targetScrap}%)</span>
                        </div>
                        <div className={`text-base font-black font-mono ${
                          isOver ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {singleLiveCalc.scrapPct.toFixed(2)}% {isOver ? '(Over Target)' : '(OK)'}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remark / Reason for Scrap</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Trim waste, ink setup wash, tension defect, cutting tolerance..."
                  value={singleForm.remarks}
                  onChange={e => setSingleForm({ ...singleForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!editingRecord && availableDepartmentsForSingle.length === 0)}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Scrap Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH DEPARTMENT ENTRY MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Batch Department Scrap Entry
                  </h3>
                  <p className="text-xs text-slate-500">
                    {availableDepartmentsForBatch.length} pending department(s) for {batchDate} ({enteredDepartmentsOnBatchDate.size} already submitted)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="Configure Department Scrap Targets and Fixed UOM in Settings"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>UOM &amp; Targets</span>
                  </button>
                )}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-semibold">Date:</span>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={e => handleBatchDateChange(e.target.value)}
                    className="text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>
                <button 
                  onClick={() => setIsBatchModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Table */}
            <form onSubmit={handleSaveBatch} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Department</th>
                      <th className="p-2.5 w-24 text-center">UOM (Fixed)</th>
                      <th className="p-2.5 w-28">Required</th>
                      <th className="p-2.5 w-28">Used</th>
                      <th className="p-2.5 w-24 text-center">Scrap Qty</th>
                      <th className="p-2.5 w-20 text-center">Scrap %</th>
                      <th className="p-2.5">Remark</th>
                      <th className="p-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {availableDepartmentsForBatch.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-slate-800 text-sm">
                              All departments have submitted scrap reports for {batchDate}!
                            </p>
                            <p className="text-xs text-slate-500">
                              Departments with existing reports will not show again for new entry on this date.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      batchRows.map((row) => {
                        const req = parseFloat(row.required) || 0;
                        const used = parseFloat(row.used) || 0;
                        const scrapQty = used > req ? used - req : 0;
                        const scrapPct = req > 0 ? (scrapQty / req) * 100 : 0;
                        const isOver = isScrapOverTarget(row.department, scrapPct, settings);
                        const targetScrap = getDepartmentTargetScrap(row.department, settings);
                        const fixedUom = row.uom || getDepartmentUom(row.department, settings);

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                                <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="font-bold text-xs text-slate-800">{row.department}</span>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <span 
                                title={`Fixed UOM for ${row.department} as per settings`}
                                className="inline-block px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs"
                              >
                                {fixedUom}
                              </span>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="Required"
                                value={row.required}
                                onChange={e => handleBatchRowChange(row.id, 'required', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-mono focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="Used"
                                value={row.used}
                                onChange={e => handleBatchRowChange(row.id, 'used', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-mono focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-amber-700">
                              {scrapQty > 0 ? scrapQty.toLocaleString() : '-'}
                            </td>
                            <td className="p-2 text-center">
                              <span 
                                title={`Target: ≤${targetScrap}% | Status: ${isOver ? 'Over Target (Red)' : 'Within Target (Green)'}`}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                                  isOver ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                }`}
                              >
                                {scrapPct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Remark..."
                                value={row.remarks}
                                onChange={e => handleBatchRowChange(row.id, 'remarks', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveBatchRow(row.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title={`Remove ${row.department} from batch`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                {availableDepartmentsForBatch.length > 0 && batchRows.length < availableDepartmentsForBatch.length ? (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const staged = new Set(batchRows.map(r => r.department.toLowerCase().trim()));
                      const remaining = availableDepartmentsForBatch.filter(d => !staged.has(d.toLowerCase().trim()));
                      if (remaining.length === 0) return null;
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAddBatchRow(remaining[0])}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>+ Add {remaining[0]} Row</span>
                          </button>
                          {remaining.length > 1 && (
                            <select
                              onChange={e => {
                                if (e.target.value) {
                                  handleAddBatchRow(e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              defaultValue=""
                              className="text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700 outline-none cursor-pointer hover:border-indigo-300"
                            >
                              <option value="" disabled>+ Add specific department...</option>
                              {remaining.map(d => (
                                <option key={d} value={d}>
                                  {d} (UOM: {getDepartmentUom(d, settings)})
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    All available departments for {batchDate} are staged.
                  </div>
                )}

                <div className="text-xs text-slate-500 font-medium">
                  {batchRows.length} department(s) staged
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableDepartmentsForBatch.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving All...' : 'Save All Department Records'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
