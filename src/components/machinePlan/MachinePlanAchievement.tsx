import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Target, 
  Cpu, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  FileDown,
  Building2,
  PowerOff,
  ListOrdered,
  BarChart3
} from 'lucide-react';
import { 
  MachinePlanRecord, 
  CalculatedMachinePlanItem, 
  MachinePlanFilterState, 
  MachinePlanSettings, 
  MachineStatusType 
} from '../../types/machinePlan';
import { 
  getMachinePlanSettings, 
  saveMachinePlanSettings, 
  filterAndSortMachinePlan, 
  aggregateMachinePlanKPIs, 
  parseMachinePlanRow, 
  serializeMachinePlanRow, 
  synthesizeBaselineRecords, 
  getDateRangeForPreset,
  formatNumeric,
  DEFAULT_MACHINE_PLAN_SETTINGS
} from '../../lib/machinePlanEngine';
import { exportMachinePlanToExcel, exportMachinePlanToCSV } from '../../lib/machinePlanExport';
import { 
  getRange, 
  appendRow, 
  updateRowByPrimaryKey, 
  stripHeaderRow, 
  invalidateCache 
} from '../../lib/sheets';
import { getBangladeshDateTime } from '../../lib/taskReminderEngine';
import { UserSecurityScope } from '../../lib/security';
import { ScrapRecord, parseScrapRows } from '../../lib/scrapReportEngine';
import { DailyScrapReportView } from './DailyScrapReportView';
import MachinePlanKPISection from './MachinePlanKPISection';
import MachinePlanFilterBar from './MachinePlanFilterBar';
import MachinePlanVisualDashboard from './MachinePlanVisualDashboard';
import MachinePlanTable from './MachinePlanTable';
import MachinePlanRecordModal from './MachinePlanRecordModal';
import MachinePlanDetailDrawer from './MachinePlanDetailDrawer';
import MachinePlanSettingsModal from './MachinePlanSettingsModal';
import MachinePlanPrintModal from './MachinePlanPrintModal';
import MachinePlanEntry from './MachinePlanEntry';
import UnplannedMachinesView from './UnplannedMachinesView';
import MachineOffModal from './MachineOffModal';

interface MachinePlanAchievementProps {
  spreadsheetId: string;
  userSecurityScope: UserSecurityScope;
  user?: any;
}

export default function MachinePlanAchievement({
  spreadsheetId,
  userSecurityScope,
  user
}: MachinePlanAchievementProps) {
  // Settings & Thresholds
  const [settings, setSettings] = useState<MachinePlanSettings>(getMachinePlanSettings);

  // Raw Records from DB
  const [rawRecords, setRawRecords] = useState<MachinePlanRecord[]>([]);
  const [machineMasterRows, setMachineMasterRows] = useState<string[][]>([]);
  const [breakdownRows, setBreakdownRows] = useState<string[][]>([]);
  const [holidayRows, setHolidayRows] = useState<string[][]>([]);
  const [scrapRecords, setScrapRecords] = useState<ScrapRecord[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedBst, setLastUpdatedBst] = useState<string>('');
  const [isAttentionFiltered, setIsAttentionFiltered] = useState<boolean>(false);

  // Modals & Drawers
  const [selectedRecord, setSelectedRecord] = useState<CalculatedMachinePlanItem | null>(null);
  const [editingRecord, setEditingRecord] = useState<MachinePlanRecord | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Active View Tab: 'records' | 'entry' | 'unplanned' | 'analytics' | 'scrap'
  const [activeTab, setActiveTab] = useState<'records' | 'entry' | 'unplanned' | 'analytics' | 'scrap'>('records');

  // Put Machine OFF Modal state
  const [isOffModalOpen, setIsOffModalOpen] = useState<boolean>(false);
  const [offModalPreselected, setOffModalPreselected] = useState<{ model: string; department: string } | null>(null);

  // Preselected model for Daily Plan Entry
  const [entryPreselectedModel, setEntryPreselectedModel] = useState<string | undefined>(undefined);

  // Sorting
  const [sortField, setSortField] = useState<keyof CalculatedMachinePlanItem | 'sl'>('sl');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter state (defaults to current Bangladesh date)
  const initialRange = getDateRangeForPreset('today');
  const [filter, setFilter] = useState<MachinePlanFilterState>({
    datePreset: 'today',
    startDate: initialRange.start,
    endDate: initialRange.end,
    department: 'All',
    machineModel: 'All',
    machineStatus: 'All',
    sku: '',
    mo: '',
    uom: 'All',
    achievementStatus: 'All',
    ueeRange: 'all',
    searchQuery: ''
  });

  // User Permissions
  const canCreate = userSecurityScope.isAdmin || userSecurityScope.isManager || userSecurityScope.isSuperuser;
  const canEdit = userSecurityScope.isAdmin || userSecurityScope.isManager || userSecurityScope.isSupervisor || userSecurityScope.isSuperuser;
  const canConfigure = userSecurityScope.isAdmin || userSecurityScope.isManager;
  const canExport = true; // All authenticated users can export/print report

  // Format Bangladesh time for the "Last Updated" banner
  const updateBstTimestamp = () => {
    const bd = getBangladeshDateTime();
    setLastUpdatedBst(`${bd.formattedDate} ${bd.timeString} (BST)`);
  };

  // Fetch master data & plan records
  const loadData = useCallback(async (forceFresh = false) => {
    try {
      setIsRefreshing(true);
      
      if (forceFresh) {
        invalidateCache(spreadsheetId, 'MachineCapacity');
        invalidateCache(spreadsheetId, 'MachinePlanAchievement');
        invalidateCache(spreadsheetId, 'BreakdownLog');
        invalidateCache(spreadsheetId, 'Holidays');
        invalidateCache(spreadsheetId, 'DailyScrapReport');
      }

      // 1. Fetch MachineCapacity master, BreakdownLog, Holidays, and DailyScrapReport in parallel
      const [machineData, planData, bData, hData, scrapData] = await Promise.all([
        getRange(spreadsheetId, 'MachineCapacity').catch(() => []),
        getRange(spreadsheetId, 'MachinePlanAchievement').catch(() => []),
        getRange(spreadsheetId, 'BreakdownLog').catch(() => []),
        getRange(spreadsheetId, 'Holidays').catch(() => []),
        getRange(spreadsheetId, 'DailyScrapReport').catch(() => [])
      ]);

      setMachineMasterRows(machineData);
      setBreakdownRows(bData);
      setHolidayRows(hData);
      setScrapRecords(parseScrapRows(scrapData));

      // Parse plan records from sheet
      let parsedPlanRecords: MachinePlanRecord[] = [];
      const planRowsWithoutHeader = stripHeaderRow(planData);

      if (planRowsWithoutHeader && planRowsWithoutHeader.length > 0) {
        parsedPlanRecords = planRowsWithoutHeader.map((row, idx) => parseMachinePlanRow(row, idx));
      }

      // Check if we have records for today's date
      const todayStr = getBangladeshDateTime().dateString;
      const hasTodayRecords = parsedPlanRecords.some(r => r.date === todayStr);

      if (!hasTodayRecords && machineData.length > 1) {
        // Auto-generate synthesized baseline records for today
        const synthesizedToday = synthesizeBaselineRecords(todayStr, machineData, bData, hData);
        if (synthesizedToday.length > 0) {
          parsedPlanRecords = [...synthesizedToday, ...parsedPlanRecords];
        }
      }

      setRawRecords(parsedPlanRecords);
      updateBstTimestamp();
    } catch (err) {
      console.error('Error loading machine plan data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [spreadsheetId]);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Auto-refresh timer (default 5 minutes)
  useEffect(() => {
    if (!settings.autoRefreshEnabled) return;
    const intervalMs = (settings.autoRefreshIntervalSeconds || 300) * 1000;
    const interval = setInterval(() => {
      loadData(true);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [settings.autoRefreshEnabled, settings.autoRefreshIntervalSeconds, loadData]);

  // Set of machine models where 'Calculate UEE' is set to 'No' in MachineCapacity master
  const excludedMachines = useMemo(() => {
    if (!machineMasterRows || machineMasterRows.length <= 1) return new Set<string>();
    const header = machineMasterRows[0] || [];
    const nameIdx = header.indexOf('Machine Name') !== -1 ? header.indexOf('Machine Name') : 4;
    const ueeIdx = header.indexOf('Calculate UEE') !== -1 ? header.indexOf('Calculate UEE') : 26;
    const set = new Set<string>();
    for (let i = 1; i < machineMasterRows.length; i++) {
      const row = machineMasterRows[i];
      if (!row || !row[nameIdx]) continue;
      const ueeVal = (row[ueeIdx] !== undefined && row[ueeIdx] !== '') ? String(row[ueeIdx]).trim().toLowerCase() : 'yes';
      if (ueeVal === 'no') {
        set.add(row[nameIdx].trim().toLowerCase());
      }
    }
    return set;
  }, [machineMasterRows]);

  // Records filtered by Calculate UEE: only include machines where Calculate UEE is Yes
  const eligibleRawRecords = useMemo(() => {
    return rawRecords.filter(r => !excludedMachines.has(r.machineModel.toLowerCase().trim()));
  }, [rawRecords, excludedMachines]);

  // Extract unique filter dropdown values
  const departments = useMemo(() => {
    const set = new Set<string>();
    eligibleRawRecords.forEach(r => {
      if (r.department) {
        const d = r.department.trim();
        if (d && d.toLowerCase() !== 'department' && d.toLowerCase() !== 'all') {
          set.add(d);
        }
      }
    });
    return Array.from(set).sort();
  }, [eligibleRawRecords]);

  const machineModels = useMemo(() => {
    const set = new Set<string>();
    eligibleRawRecords.forEach(r => {
      if (r.machineModel) set.add(r.machineModel);
    });
    return Array.from(set).sort();
  }, [eligibleRawRecords]);

  const uoms = useMemo(() => {
    const set = new Set<string>();
    eligibleRawRecords.forEach(r => {
      if (r.uom) set.add(r.uom);
    });
    return Array.from(set).sort();
  }, [eligibleRawRecords]);

  // Machine options for the Add/Edit modal dropdown from MachineCapacity master
  // Filtered to only include machines where Calculate UEE is Yes
  const machineOptions = useMemo(() => {
    if (!machineMasterRows || machineMasterRows.length <= 1) return [];
    const header = machineMasterRows[0] || [];
    const nameIdx = header.indexOf('Machine Name') !== -1 ? header.indexOf('Machine Name') : 4;
    const deptIdx = header.indexOf('Department') !== -1 ? header.indexOf('Department') : 1;
    const uomIdx = header.indexOf('Standard Unit') !== -1 ? header.indexOf('Standard Unit') : 5;
    const speedIdx = header.indexOf('Standard Speed Per Minutes') !== -1 ? header.indexOf('Standard Speed Per Minutes') : 7;
    const utilIdx = header.indexOf('Utilization %') !== -1 ? header.indexOf('Utilization %') : 8;
    const ueeIdx = header.indexOf('Calculate UEE') !== -1 ? header.indexOf('Calculate UEE') : 26;

    const list: Array<{ model: string; department: string; uom: string; speed: number; utilization: number }> = [];
    for (let i = 1; i < machineMasterRows.length; i++) {
      const row = machineMasterRows[i];
      if (!row || !row[nameIdx]) continue;

      // Filter by Calculate UEE: only include machines where Calculate UEE is Yes
      const ueeVal = (row[ueeIdx] !== undefined && row[ueeIdx] !== '') ? String(row[ueeIdx]).trim().toLowerCase() : 'yes';
      if (ueeVal === 'no') continue;

      const rawSpeed = parseFloat(String(row[speedIdx] || '0').replace(/[^0-9.]/g, '')) || 2000;
      const rawUtil = parseFloat(String(row[utilIdx] || '90').replace(/[^0-9.]/g, '')) || 90;
      list.push({
        model: row[nameIdx].trim(),
        department: row[deptIdx]?.trim() || 'General',
        uom: row[uomIdx]?.trim() || 'PCS',
        speed: rawSpeed,
        utilization: rawUtil
      });
    }
    return list;
  }, [machineMasterRows]);

  // Handle Sort Toggle
  const handleSort = (field: keyof CalculatedMachinePlanItem | 'sl') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered & Sorted Items (only machines with Calculate UEE = Yes)
  const displayedItems = useMemo(() => {
    return filterAndSortMachinePlan(
      eligibleRawRecords,
      filter,
      sortField,
      sortDirection,
      settings.thresholds
    );
  }, [eligibleRawRecords, filter, sortField, sortDirection, settings.thresholds]);

  // Summary KPIs for current displayed view
  const summaryKPIs = useMemo(() => {
    return aggregateMachinePlanKPIs(displayedItems, settings.thresholds);
  }, [displayedItems, settings.thresholds]);

  // Toggle Attention Filter
  const handleFilterAttention = () => {
    if (isAttentionFiltered) {
      setIsAttentionFiltered(false);
      setFilter(prev => ({
        ...prev,
        achievementStatus: 'All',
        machineStatus: 'All'
      }));
    } else {
      setIsAttentionFiltered(true);
      setFilter(prev => ({
        ...prev,
        achievementStatus: 'critical'
      }));
    }
  };

  // Save Record (Create or Update)
  const handleSaveRecord = async (record: MachinePlanRecord, isNew: boolean) => {
    setIsSaving(true);
    try {
      const rowData = serializeMachinePlanRow({
        ...record,
        updatedBy: user?.email || userSecurityScope.username,
        updatedAt: new Date().toISOString()
      });

      if (isNew) {
        await appendRow(spreadsheetId, 'MachinePlanAchievement', [rowData]);
        setRawRecords(prev => [record, ...prev]);
      } else {
        await updateRowByPrimaryKey(spreadsheetId, 'MachinePlanAchievement', record.id, rowData);
        setRawRecords(prev => prev.map(r => r.id === record.id ? record : r));
      }

      // Invalidate cache and broadcast
      invalidateCache(spreadsheetId, 'MachinePlanAchievement');
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { sheetName: 'MachinePlanAchievement' } }));
      updateBstTimestamp();
    } catch (err: any) {
      console.error('Error saving machine plan record:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Status change from Table dropdown
  const handleQuickStatusChange = async (recordId: string, newStatus: MachineStatusType) => {
    const target = rawRecords.find(r => r.id === recordId);
    if (!target) return;
    const updated: MachinePlanRecord = {
      ...target,
      machineStatus: newStatus,
      updatedBy: user?.email || userSecurityScope.username,
      updatedAt: new Date().toISOString()
    };
    try {
      const rowData = serializeMachinePlanRow(updated);
      await updateRowByPrimaryKey(spreadsheetId, 'MachinePlanAchievement', recordId, rowData);
      setRawRecords(prev => prev.map(r => r.id === recordId ? updated : r));
      invalidateCache(spreadsheetId, 'MachinePlanAchievement');
    } catch (err) {
      console.error('Failed to quick-update machine status:', err);
    }
  };

  // Count of unplanned machines for today
  const unplannedCountToday = useMemo(() => {
    const todayStr = getBangladeshDateTime().dateString;
    const todayRecords = rawRecords.filter(r => r.date === todayStr);
    const plannedModels = new Set(
      todayRecords
        .filter(r => r.planHours > 0 && r.machineStatus !== 'Off' && r.machineStatus !== 'Idle' && r.machineStatus !== 'No Plan')
        .map(r => r.machineModel.toLowerCase().trim())
    );
    return machineOptions.filter(m => !plannedModels.has(m.model.toLowerCase().trim())).length;
  }, [rawRecords, machineOptions]);

  // Batch Save Records (from Batch Department Entry)
  const handleBatchSaveRecords = async (batchList: Array<{ record: MachinePlanRecord; isNew: boolean }>) => {
    setIsSaving(true);
    try {
      const rowsToAppend: string[][] = [];
      const newRecordsList: MachinePlanRecord[] = [];

      for (const item of batchList) {
        const rowData = serializeMachinePlanRow({
          ...item.record,
          updatedBy: user?.email || userSecurityScope.username,
          updatedAt: new Date().toISOString()
        });

        if (item.isNew) {
          rowsToAppend.push(rowData);
          newRecordsList.push(item.record);
        } else {
          await updateRowByPrimaryKey(spreadsheetId, 'MachinePlanAchievement', item.record.id, rowData);
          setRawRecords(prev => prev.map(r => r.id === item.record.id ? item.record : r));
        }
      }

      if (rowsToAppend.length > 0) {
        await appendRow(spreadsheetId, 'MachinePlanAchievement', rowsToAppend);
        setRawRecords(prev => [...newRecordsList, ...prev]);
      }

      invalidateCache(spreadsheetId, 'MachinePlanAchievement');
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { sheetName: 'MachinePlanAchievement' } }));
      updateBstTimestamp();
    } catch (err: any) {
      console.error('Batch save error in MachinePlanAchievement:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Put Machine OFF confirmation handler
  const handlePutMachineOffConfirm = async (data: {
    machineModel: string;
    department: string;
    date: string;
    reason: string;
    notes: string;
    setPlanHoursZero: boolean;
    status: MachineStatusType;
  }) => {
    const existing = rawRecords.find(r => 
      r.machineModel.toLowerCase().trim() === data.machineModel.toLowerCase().trim() &&
      r.date.trim() === data.date.trim()
    );

    const matchedOpt = machineOptions.find(m => m.model.toLowerCase().trim() === data.machineModel.toLowerCase().trim());
    const speed = existing ? existing.specSpeedPerHour : (matchedOpt?.speed || 2000);
    const uom = existing ? existing.uom : (matchedOpt?.uom || 'PCS');
    const capImp = existing ? existing.capacityImplementPerHour : Math.round(speed * 0.9);
    const planHours = data.setPlanHoursZero ? 0 : (existing ? existing.planHours : 0);
    const targetOutput = data.setPlanHoursZero ? 0 : (existing ? existing.targetOutput : 0);

    const finalRemarks = `[OFF: ${data.reason}] ${data.notes || (existing?.remarks || '')}`.trim();
    const recId = existing ? existing.id : `MPA-${data.date.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const recordToSave: MachinePlanRecord = {
      id: recId,
      date: data.date,
      department: data.department,
      uom,
      machineModel: data.machineModel,
      specSpeedPerHour: speed,
      specSpeedDisplay: `${formatNumeric(speed)} ${uom}/H`,
      avWorkingHours: existing ? existing.avWorkingHours : 8,
      totalCapacityBasis: existing ? existing.totalCapacityBasis : 8,
      capacityImplementPerHour: capImp,
      planHours,
      machineStatus: data.status,
      offReason: data.reason,
      targetOutput,
      actualOutput: existing ? existing.actualOutput : 0,
      sku: existing ? existing.sku : '',
      mo: existing ? existing.mo : '',
      totalUeePct: existing ? existing.totalUeePct : null,
      remarks: finalRemarks,
      shift: existing?.shift || 'Day Shift',
      updatedBy: user?.email || userSecurityScope.username,
      updatedAt: new Date().toISOString()
    };

    await handleSaveRecord(recordToSave, !existing);
  };

  // Switch to Plan Entry with preselected machine and date
  const handlePlanUnplannedMachine = (machineModel: string, dateStr: string) => {
    setEntryPreselectedModel(machineModel);
    setFilter(prev => ({
      ...prev,
      startDate: dateStr,
      endDate: dateStr
    }));
    setActiveTab('entry');
  };

  // Date range label for exports
  const dateRangeLabel = useMemo(() => {
    if (filter.startDate === filter.endDate) {
      return filter.startDate;
    }
    return `${filter.startDate}_to_${filter.endDate}`;
  }, [filter.startDate, filter.endDate]);

  return (
    <div className="space-y-4 pb-12" id="machine-plan-achievement-root">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Target className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              UEE & Scrap
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Floor Efficiency & Quality
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Daily machine-wise plan vs achievement, UEE analysis & department-wise daily scrap monitoring
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Last Updated: <strong>{lastUpdatedBst || 'Syncing...'}</strong></span>
            </span>
            <span className="text-slate-300">·</span>
            <span>Bangladesh Standard Time (UTC+06:00)</span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            id="refresh-machine-plan-btn"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Floor Data (Force Fetch)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="export-machine-plan-dropdown-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div 
                className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 animate-fadeIn text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    exportMachinePlanToExcel(displayedItems, summaryKPIs, dateRangeLabel);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    exportMachinePlanToCSV(displayedItems, dateRangeLabel);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>CSV File (.csv)</span>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setIsPrintModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Shift Report</span>
                </button>
              </div>
            )}
          </div>

          {/* Thresholds / Settings Modal Button */}
          {canConfigure && (
            <button
              id="configure-thresholds-btn"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              title="Configure Achievement & UEE Thresholds"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* Put Machine OFF Button */}
          {canEdit && (
            <button
              id="put-machine-off-btn"
              onClick={() => {
                setOffModalPreselected(null);
                setIsOffModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
              title="Put Machine OFF with Downtime Reason"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>Put Machine OFF</span>
            </button>
          )}

          {/* Add Plan Record Button (for authorized users) */}
          {canCreate && (
            <button
              id="add-machine-plan-btn"
              onClick={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Daily Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
        {/* Tab 1: Records Table */}
        <button
          id="tab-machine-plan-records"
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'records'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Plan vs Achievement</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'records' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {rawRecords.length}
          </span>
        </button>

        {/* Tab 2: Daily Plan Entry (Single & Batch Department Entry) */}
        {canEdit && (
          <button
            id="tab-machine-plan-entry"
            onClick={() => {
              setEntryPreselectedModel(undefined);
              setActiveTab('entry');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'entry'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Daily Plan Entry (Single / Batch)</span>
          </button>
        )}

        {/* Tab 3: Unplanned Machines with Live Badge */}
        <button
          id="tab-unplanned-machines"
          onClick={() => setActiveTab('unplanned')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'unplanned'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${activeTab === 'unplanned' ? 'text-white' : 'text-amber-500'}`} />
          <span>Unplanned Machines</span>
          {unplannedCountToday > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'unplanned' ? 'bg-white text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {unplannedCountToday}
            </span>
          )}
        </button>

        {/* Tab 4: Executive Dashboard & UEE Visuals */}
        <button
          id="tab-machine-plan-analytics"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Executive Dashboard & UEE</span>
        </button>

        {/* Tab 5: Daily Scrap Report */}
        <button
          id="tab-daily-scrap-report"
          onClick={() => setActiveTab('scrap')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'scrap'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Daily Scrap Report</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'scrap' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {scrapRecords.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT 1: Primary Plan vs Achievement Records */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Top Summary KPI Cards */}
          <MachinePlanKPISection
            kpis={summaryKPIs}
            thresholds={settings.thresholds}
            onFilterAttention={handleFilterAttention}
            isAttentionFiltered={isAttentionFiltered}
          />

          {/* Filter Bar & Universal Search */}
          <MachinePlanFilterBar
            filter={filter}
            onChangeFilter={setFilter}
            departments={departments}
            machineModels={machineModels}
            uoms={uoms}
            totalRecordsCount={rawRecords.length}
            filteredRecordsCount={displayedItems.length}
          />

          {/* Primary 17-Column Output Table */}
          <MachinePlanTable
            items={displayedItems}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            thresholds={settings.thresholds}
            settings={settings}
            canEdit={canEdit}
            onSelectRecord={record => setSelectedRecord(record)}
            onEditRecord={record => {
              setEditingRecord(record);
              setIsRecordModalOpen(true);
            }}
            onPutOffRecord={canEdit ? (record) => {
              setOffModalPreselected({
                model: record.machineModel,
                department: record.department
              });
              setIsOffModalOpen(true);
            } : undefined}
            onQuickStatusChange={canEdit ? handleQuickStatusChange : undefined}
          />
        </div>
      )}

      {/* TAB CONTENT 2: Daily Plan Entry (Single & Batch Department Entry) */}
      {activeTab === 'entry' && (
        <MachinePlanEntry
          machineOptions={machineOptions}
          existingRecords={rawRecords}
          onSaveRecord={handleSaveRecord}
          onBatchSaveRecords={handleBatchSaveRecords}
          defaultDate={filter.startDate}
          defaultDepartment={filter.department !== 'All' ? filter.department : undefined}
          settings={settings}
          departments={departments}
          userEmail={user?.email || userSecurityScope.username}
          initialMachineModel={entryPreselectedModel}
        />
      )}

      {/* TAB CONTENT 3: Unplanned Machines (Separately shows unplanned machines with Off reason capability) */}
      {activeTab === 'unplanned' && (
        <UnplannedMachinesView
          machineOptions={machineOptions}
          records={rawRecords}
          departments={departments}
          currentDate={filter.startDate}
          onSelectDate={(newDate) => {
            setFilter(prev => ({
              ...prev,
              startDate: newDate,
              endDate: newDate
            }));
          }}
          onPutMachineOff={(machine) => {
            setOffModalPreselected(machine);
            setIsOffModalOpen(true);
          }}
          onPlanMachine={handlePlanUnplannedMachine}
        />
      )}

      {/* TAB CONTENT 4: Executive Dashboard & UEE */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <MachinePlanKPISection
            kpis={summaryKPIs}
            thresholds={settings.thresholds}
            onFilterAttention={handleFilterAttention}
            isAttentionFiltered={isAttentionFiltered}
          />

          <MachinePlanVisualDashboard
            items={displayedItems}
            kpis={summaryKPIs}
            thresholds={settings.thresholds}
          />
        </div>
      )}

      {/* TAB CONTENT 5: Daily Scrap Report (Department-Wise) */}
      {activeTab === 'scrap' && (
        <DailyScrapReportView
          records={scrapRecords}
          onReload={async () => {
            await loadData(true);
          }}
          spreadsheetId={spreadsheetId}
          userEmail={user?.email || userSecurityScope.username}
          departmentList={departments}
          settings={settings}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* Add / Edit Plan Record Modal */}
      <MachinePlanRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={handleSaveRecord}
        initialRecord={editingRecord}
        machineOptions={machineOptions}
        isSaving={isSaving}
      />

      {/* Put Machine OFF Modal with Reason */}
      <MachineOffModal
        isOpen={isOffModalOpen}
        onClose={() => setIsOffModalOpen(false)}
        onConfirm={handlePutMachineOffConfirm}
        preselectedMachine={offModalPreselected}
        currentDate={filter.startDate}
        machineOptions={machineOptions}
      />

      {/* Detailed View Drawer */}
      <MachinePlanDetailDrawer
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        item={selectedRecord}
        onEdit={rec => {
          setEditingRecord(rec);
          setIsRecordModalOpen(true);
        }}
        canEdit={canEdit}
        thresholds={settings.thresholds}
      />

      {/* Settings Modal */}
      <MachinePlanSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={newSettings => {
          setSettings(newSettings);
          saveMachinePlanSettings(newSettings);
        }}
      />

      {/* Print View Modal */}
      <MachinePlanPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={displayedItems}
        kpis={summaryKPIs}
        dateLabel={dateRangeLabel}
      />
    </div>
  );
}
