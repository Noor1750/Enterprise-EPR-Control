import React, { useState, useEffect, useMemo } from 'react';
import { getRange, updateRange, appendRow } from '../lib/sheets';
import { UserSecurityScope } from '../lib/security';
import { 
  BreakdownRecord, 
  BreakdownStatus, 
  BreakdownAuditLogEntry, 
  MachineHealthStatus, 
  BreakdownCalculationDetails 
} from '../types/breakdown';
import { 
  rawRowToBreakdownRecord, 
  breakdownRecordToRow, 
  generateNextBreakdownId, 
  DEFAULT_FAILURE_MODES, 
  DEFAULT_CATEGORIES, 
  DEFAULT_ACTIVITIES, 
  DEFAULT_SPARE_PARTS, 
  DEFAULT_UOMS, 
  BREAKDOWN_STATUSES,
  exportBreakdownsToCSV,
  calculateLostProduction,
  getMachineCapacityMetrics,
  calculateWorkingHourLost
} from '../lib/breakdownUtils';
import BreakdownModal from './breakdown/BreakdownModal';
import BreakdownDashboard from './breakdown/BreakdownDashboard';
import BreakdownSettingsModal from './breakdown/BreakdownSettingsModal';
import UserBreakdownEntry from './breakdown/UserBreakdownEntry';
import MaintenanceWorkflow from './breakdown/MaintenanceWorkflow';
import BreakdownKanbanView from './breakdown/BreakdownKanbanView';
import BreakdownDepartmentMatrix from './breakdown/BreakdownDepartmentMatrix';
import BreakdownQuickActionModal from './breakdown/BreakdownQuickActionModal';
import { BreakdownCalculationModal } from './breakdown/BreakdownCalculationModal';
import AdminDeleteConfirmModal from './common/AdminDeleteConfirmModal';
import { 
  Wrench, AlertTriangle, Plus, Search, Filter, Download, 
  RefreshCw, CheckCircle, Clock, DollarSign, Shield, Eye, 
  Edit, Trash2, Lock, CheckSquare, Layers, Activity, History, 
  Settings, ChevronLeft, ChevronRight, ArrowUpDown, FileSpreadsheet,
  Zap, AlertCircle, HardDrive, CheckCircle2, UserCheck, Sparkles,
  Info, ShieldCheck, Factory, ChevronDown, ChevronUp, LayoutGrid,
  Table as TableIcon, Kanban, Check, ArrowRight
} from 'lucide-react';

interface BreakdownLogProps {
  spreadsheetId: string;
  userSecurityScope?: UserSecurityScope;
}

export default function BreakdownLog({ spreadsheetId, userSecurityScope }: BreakdownLogProps) {
  // Main data state
  const [records, setRecords] = useState<BreakdownRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<BreakdownAuditLogEntry[]>([]);
  const [settingsRows, setSettingsRows] = useState<string[][]>([]);
  const [machinesList, setMachinesList] = useState<string[][]>([]);
  const [employeesList, setEmployeesList] = useState<string[][]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [holidaysList, setHolidaysList] = useState<string[][]>([]);
  const [overridesList, setOverridesList] = useState<string[][]>([]);
  const [shiftsList, setShiftsList] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Navigation tabs: 'unsolved' | 'completed' | 'user-entry' | 'maintenance' | 'dashboard' | 'machines' | 'audit'
  const [activeModuleTab, setActiveModuleTab] = useState<
    'unsolved' | 'completed' | 'user-entry' | 'maintenance' | 'dashboard' | 'machines' | 'audit'
  >('unsolved');

  // Sub-view presentation mode when on tickets (Table, Kanban, or Matrix)
  const [ticketViewMode, setTicketViewMode] = useState<'table' | 'kanban' | 'matrix'>('table');

  // Expanded table row ID
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BreakdownRecord | null>(null);
  const [modalInitialMode, setModalInitialMode] = useState<'report' | 'maintenance'>('report');

  // Quick Action Modal
  const [quickActionRecord, setQuickActionRecord] = useState<BreakdownRecord | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<BreakdownRecord | null>(null);

  // Calculation Transparency Modal
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcModalRecord, setCalcModalRecord] = useState<BreakdownRecord | null>(null);
  const [calcModalDetails, setCalcModalDetails] = useState<BreakdownCalculationDetails | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [productionStopFilter, setProductionStopFilter] = useState<string>('All');
  const [failureModeFilter, setFailureModeFilter] = useState<string>('All');
  
  // Quick Filter Chip (one-click filter)
  const [quickFilterChip, setQuickFilterChip] = useState<
    'all' | 'critical' | 'unattended' | 'in_progress' | 'waiting_parts' | 'over_4h' | 'today'
  >('all');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof BreakdownRecord>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Permissions
  const isAdminOrSuper = Boolean(userSecurityScope?.isAdmin || userSecurityScope?.isSuperuser);
  const isSupervisor = Boolean(userSecurityScope?.isSupervisor);
  const canManageSettings = isAdminOrSuper || isSupervisor;
  const canDeleteRecords = isAdminOrSuper;

  // Load All Data
  const fetchData = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // 1. Fetch Breakdown Logs
      const breakdownRows = await getRange(spreadsheetId, 'BreakdownLog!A2:AF1000').catch(() => []);
      const parsedRecords: BreakdownRecord[] = breakdownRows
        .filter(row => row && row.length > 0 && row[0]?.trim() && row[0] !== 'Breakdown_ID')
        .map(row => rawRowToBreakdownRecord(row));
      setRecords(parsedRecords);

      // 2. Fetch Audit Logs
      const auditRows = await getRange(spreadsheetId, 'BreakdownAuditLog!A2:J1000').catch(() => []);
      const parsedAudit: BreakdownAuditLogEntry[] = auditRows
        .filter(r => r && r[0]?.trim() && r[0] !== 'Log_ID')
        .map(r => ({
          logId: r[0] || '',
          breakdownId: r[1] || '',
          timestamp: r[2] || '',
          date: r[3] || '',
          time: r[4] || '',
          userId: r[5] || '',
          userName: r[6] || '',
          userRole: r[7] || '',
          action: r[8] || '',
          details: r[9] || ''
        }));
      setAuditLogs(parsedAudit);

      // 3. Fetch Settings
      const setRows = await getRange(spreadsheetId, 'BreakdownSettings!A2:D100').catch(() => []);
      setSettingsRows(setRows.filter(r => r && r[0]));

      // 4. Fetch Machines
      const machineRows = await getRange(spreadsheetId, 'MachineCapacity!A2:U200').catch(() => []);
      setMachinesList(machineRows.filter(r => r && (r[0] || r[4])));

      // 5. Fetch Employees
      const empRows = await getRange(spreadsheetId, 'Employees!A2:V200').catch(() => []);
      setEmployeesList(empRows.filter(r => r && r[0]));

      // 6. Fetch Holidays & Overrides
      const holRows = await getRange(spreadsheetId, 'Holidays!A2:D200').catch(() => []);
      setHolidaysList(holRows.filter(r => r && r[0]));

      const overrideRows = await getRange(spreadsheetId, 'HolidayOverrides!A2:H200').catch(() => []);
      setOverridesList(overrideRows.filter(r => r && r[0]));

      // 7. Fetch Shifts
      const shiftRows = await getRange(spreadsheetId, 'Shifts!A2:E50').catch(() => []);
      setShiftsList(shiftRows.filter(r => r && r[0]));

      // 8. Extract Unique Departments
      const depts = new Set<string>();
      machineRows.forEach(m => {
        if (m[1]) depts.add(m[1].trim());
      });
      empRows.forEach(e => {
        if (e[3]) depts.add(e[3].trim());
      });
      ['RFID', 'Woven', 'Offset', 'PFL', 'Packaging', 'Sewing', 'Cutting', 'Finishing', 'Maintenance', 'HR', 'IT'].forEach(d => depts.add(d));
      setDepartmentsList(Array.from(depts));

    } catch (err) {
      console.error('Error fetching breakdown data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [spreadsheetId]);

  // Open Calculation Transparency Modal
  const handleOpenCalculationDetails = (r: BreakdownRecord) => {
    const calc = calculateWorkingHourLost(
      r.date,
      r.reportAt,
      r.machineStartDate || r.date,
      r.machineStartAt,
      r.productionStop,
      holidaysList,
      overridesList,
      r.machineName,
      machinesList,
      r.department,
      shiftsList
    );

    const recordWithDetails: BreakdownRecord = {
      ...r,
      calculationDetails: calc.calculationDetails
    };

    setCalcModalRecord(recordWithDetails);
    setCalcModalDetails(calc.calculationDetails);
    setIsCalcModalOpen(true);
  };

  // Derived Master Data from settings
  const masterFailureModes = useMemo(() => {
    const fromSettings = settingsRows.filter(r => r[0] === 'FailureMode' && r[3] !== 'Inactive').map(r => r[1]);
    return fromSettings.length > 0 ? fromSettings : DEFAULT_FAILURE_MODES;
  }, [settingsRows]);

  const masterCategories = useMemo(() => {
    const fromSettings = settingsRows.filter(r => r[0] === 'Category' && r[3] !== 'Inactive').map(r => r[1]);
    return fromSettings.length > 0 ? fromSettings : DEFAULT_CATEGORIES;
  }, [settingsRows]);

  const masterActivities = useMemo(() => {
    const fromSettings = settingsRows.filter(r => r[0] === 'Activity' && r[3] !== 'Inactive').map(r => r[1]);
    return fromSettings.length > 0 ? fromSettings : DEFAULT_ACTIVITIES;
  }, [settingsRows]);

  const masterSpareParts = useMemo(() => {
    const fromSettings = settingsRows.filter(r => r[0] === 'SparePart' && r[3] !== 'Inactive').map(r => ({
      name: r[1],
      defaultCost: parseFloat(r[2]) || 0,
      uom: 'PCS'
    }));
    return fromSettings.length > 0 ? fromSettings : DEFAULT_SPARE_PARTS;
  }, [settingsRows]);

  const masterUOMs = useMemo(() => {
    const fromSettings = settingsRows.filter(r => r[0] === 'UOM' && r[3] !== 'Inactive').map(r => r[1]);
    return fromSettings.length > 0 ? fromSettings : DEFAULT_UOMS;
  }, [settingsRows]);

  // Next Generated ID
  const nextGeneratedId = useMemo(() => {
    const existingIds = records.map(r => r.id);
    return generateNextBreakdownId(existingIds);
  }, [records]);

  // Unsolved vs Completed Records Splits
  const unsolvedRecords = useMemo(() => {
    return records.filter(r => 
      r.status !== 'Completed' && 
      r.status !== 'Closed' && 
      r.status !== 'Cancelled'
    );
  }, [records]);

  const completedRecords = useMemo(() => {
    return records.filter(r => 
      r.status === 'Completed' || 
      r.status === 'Closed' || 
      r.status === 'Cancelled'
    );
  }, [records]);

  // Executive Metric Calculations for the Top Cockpit
  const metrics = useMemo(() => {
    const activeStops = unsolvedRecords.filter(r => r.productionStop === 'Yes').length;
    const activeUnsolved = unsolvedRecords.length;
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayCount = records.filter(r => r.date === todayStr).length;

    let totalWorkingHoursLost = 0;
    let totalLostPcs = 0;
    let totalCost = 0;

    records.forEach(r => {
      const calc = calculateWorkingHourLost(
        r.date,
        r.reportAt,
        r.machineStartDate || r.date,
        r.machineStartAt,
        r.productionStop,
        holidaysList,
        overridesList,
        r.machineName,
        machinesList,
        r.department,
        shiftsList
      );
      totalWorkingHoursLost += calc.decimalHours || (Number(r.hourLostHours) || 0);
      totalLostPcs += calc.lostPcs || 0;
      totalCost += Number(r.totalCost) || 0;
    });

    const totalMachines = machinesList.length || 1;
    const downMachines = new Set(unsolvedRecords.filter(r => r.productionStop === 'Yes').map(r => r.machineName)).size;
    const fleetHealthPct = Math.max(0, Math.round(((totalMachines - downMachines) / totalMachines) * 100));

    return {
      activeStops,
      activeUnsolved,
      todayCount,
      totalWorkingHoursLost: Math.round(totalWorkingHoursLost * 10) / 10,
      totalLostPcs: Math.round(totalLostPcs),
      totalCost: Math.round(totalCost * 100) / 100,
      fleetHealthPct,
      totalMachines
    };
  }, [records, unsolvedRecords, holidaysList, overridesList, machinesList, shiftsList]);

  // Save Record (Create or Update)
  const handleSaveRecord = async (savedRecord: BreakdownRecord, auditNote?: string) => {
    const existingIndex = records.findIndex(r => r.id === savedRecord.id);
    let updatedRecords: BreakdownRecord[];

    if (existingIndex >= 0) {
      updatedRecords = [...records];
      updatedRecords[existingIndex] = savedRecord;
    } else {
      updatedRecords = [savedRecord, ...records];
    }

    setRecords(updatedRecords);

    // Save to BreakdownLog sheet
    const sheetRows = updatedRecords.map(r => breakdownRecordToRow(r));
    await updateRange(spreadsheetId, `BreakdownLog!A2:AF${sheetRows.length + 1}`, sheetRows);

    // Add Audit Log
    if (auditNote) {
      const now = new Date();
      const newAuditEntry: BreakdownAuditLogEntry = {
        logId: `BD-AUD-${Date.now().toString().slice(-6)}`,
        breakdownId: savedRecord.id,
        timestamp: now.toISOString(),
        date: now.toISOString().substring(0, 10),
        time: now.toTimeString().substring(0, 8),
        userId: userSecurityScope?.employeeId || userSecurityScope?.username || 'user',
        userName: userSecurityScope?.employeeName || userSecurityScope?.username || 'User',
        userRole: userSecurityScope?.role || 'Operator',
        action: existingIndex >= 0 ? (savedRecord.status === 'Closed' ? 'Closed' : 'Updated') : 'Created',
        details: auditNote
      };

      const auditRow = [
        newAuditEntry.logId,
        newAuditEntry.breakdownId,
        newAuditEntry.timestamp,
        newAuditEntry.date,
        newAuditEntry.time,
        newAuditEntry.userId,
        newAuditEntry.userName,
        newAuditEntry.userRole,
        newAuditEntry.action,
        newAuditEntry.details
      ];

      setAuditLogs(prev => [newAuditEntry, ...prev]);
      await appendRow(spreadsheetId, 'BreakdownAuditLog!A:J', [auditRow]);
    }
  };

  // Quick 1-Click Status Change from Table/Kanban
  const handleQuickStatusChange = async (record: BreakdownRecord, newStatus: BreakdownStatus) => {
    const nowIso = new Date().toISOString();
    const updatedRecord: BreakdownRecord = {
      ...record,
      status: newStatus,
      machineStartAt: newStatus === 'Completed' || newStatus === 'Closed' ? (record.machineStartAt || new Date().toTimeString().substring(0, 5)) : record.machineStartAt,
      updatedAt: nowIso,
      updatedBy: userSecurityScope?.employeeName || userSecurityScope?.username || 'User'
    };

    const auditMsg = `Quick status transition to '${newStatus}'`;
    await handleSaveRecord(updatedRecord, auditMsg);
  };

  // Delete Record Handler
  const handleDeleteRecord = (recordToDelete: BreakdownRecord) => {
    if (!canDeleteRecords) {
      alert('Only System Administrators can delete breakdown records.');
      return;
    }
    setDeleteRecordTarget(recordToDelete);
  };

  const executeConfirmedBreakdownDelete = async () => {
    if (!deleteRecordTarget) return;
    const recordToDelete = deleteRecordTarget;

    const remaining = records.filter(r => r.id !== recordToDelete.id);
    setRecords(remaining);

    const sheetRows = remaining.map(r => breakdownRecordToRow(r));
    await updateRange(spreadsheetId, `BreakdownLog!A2:AF${sheetRows.length + 2}`, [
      ...sheetRows,
      new Array(32).fill('')
    ]);

    const now = new Date();
    const newAuditEntry: BreakdownAuditLogEntry = {
      logId: `BD-AUD-${Date.now().toString().slice(-6)}`,
      breakdownId: recordToDelete.id,
      timestamp: now.toISOString(),
      date: now.toISOString().substring(0, 10),
      time: now.toTimeString().substring(0, 8),
      userId: userSecurityScope?.employeeId || userSecurityScope?.username || 'user',
      userName: userSecurityScope?.employeeName || userSecurityScope?.username || 'Admin',
      userRole: 'Admin',
      action: 'Deleted',
      details: `Breakdown ${recordToDelete.id} for machine ${recordToDelete.machineName} was deleted by Admin.`
    };
    setAuditLogs(prev => [newAuditEntry, ...prev]);
    await appendRow(spreadsheetId, 'BreakdownAuditLog!A:J', [[
      newAuditEntry.logId, newAuditEntry.breakdownId, newAuditEntry.timestamp,
      newAuditEntry.date, newAuditEntry.time, newAuditEntry.userId,
      newAuditEntry.userName, newAuditEntry.userRole, newAuditEntry.action, newAuditEntry.details
    ]]);
  };

  // Determine active dataset based on tab ('unsolved' vs 'completed')
  const currentDataset = useMemo(() => {
    if (activeModuleTab === 'unsolved') return unsolvedRecords;
    if (activeModuleTab === 'completed') return completedRecords;
    return records;
  }, [activeModuleTab, unsolvedRecords, completedRecords, records]);

  // Filtered and Sorted Records for the active dataset
  const filteredRecords = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);

    return currentDataset.filter(r => {
      // Quick Filter Chips
      if (quickFilterChip === 'critical' && r.productionStop !== 'Yes') return false;
      if (quickFilterChip === 'unattended' && (r.attendByName || r.attendById)) return false;
      if (quickFilterChip === 'in_progress' && r.status !== 'Maintenance in Progress') return false;
      if (quickFilterChip === 'waiting_parts' && r.status !== 'Waiting for Spare Parts' && r.status !== 'Waiting for Service') return false;
      if (quickFilterChip === 'over_4h' && (Number(r.hourLostHours) || 0) < 4) return false;
      if (quickFilterChip === 'today' && r.date !== todayStr) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          r.id.toLowerCase().includes(q) ||
          r.machineName.toLowerCase().includes(q) ||
          r.machineNo.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.problemDescription.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.attendByName.toLowerCase().includes(q) ||
          r.failureMode.toLowerCase().includes(q) ||
          r.sparePartsService.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Status
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;

      // Department
      if (deptFilter !== 'All' && r.department !== deptFilter) return false;

      // Production Stop
      if (productionStopFilter !== 'All' && r.productionStop !== productionStopFilter) return false;

      // Failure Mode
      if (failureModeFilter !== 'All' && r.failureMode !== failureModeFilter) return false;

      return true;
    }).sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [
    currentDataset, 
    quickFilterChip, 
    searchQuery, 
    statusFilter, 
    deptFilter, 
    productionStopFilter, 
    failureModeFilter, 
    sortField, 
    sortOrder
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Sort toggle helper
  const handleSort = (field: keyof BreakdownRecord) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: BreakdownStatus, record?: BreakdownRecord) => {
    let badgeContent: React.ReactNode;
    let badgeStyle = '';

    switch (status) {
      case 'Open':
        badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100';
        badgeContent = (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Open (New)</span>
          </>
        );
        break;
      case 'Under Investigation':
        badgeStyle = 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100';
        badgeContent = (
          <>
            <Activity className="w-3 h-3 text-blue-500" />
            <span>Investigation</span>
          </>
        );
        break;
      case 'Maintenance in Progress':
        badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100';
        badgeContent = (
          <>
            <Wrench className="w-3 h-3 text-indigo-500 animate-spin" />
            <span>In Progress</span>
          </>
        );
        break;
      case 'Waiting for Spare Parts':
        badgeStyle = 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100';
        badgeContent = (
          <>
            <Layers className="w-3 h-3 text-purple-500" />
            <span>Wait for Parts</span>
          </>
        );
        break;
      case 'Waiting for Service':
        badgeStyle = 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100';
        badgeContent = (
          <>
            <Clock className="w-3 h-3 text-orange-500" />
            <span>Wait Service</span>
          </>
        );
        break;
      case 'Completed':
        badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100';
        badgeContent = (
          <>
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Completed</span>
          </>
        );
        break;
      case 'Closed':
        badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
        badgeContent = (
          <>
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Closed</span>
          </>
        );
        break;
      default:
        badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
        badgeContent = <span>{status}</span>;
        break;
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (record) setQuickActionRecord(record);
        }}
        className={`inline-flex items-center gap-1.5 border font-bold px-2.5 py-1 rounded-lg text-[11px] transition shadow-2xs group cursor-pointer ${badgeStyle}`}
        title="Click for quick status change"
      >
        {badgeContent}
        <Edit className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-slate-400" />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header Actions */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F87C6C] to-rose-600 flex items-center justify-center text-white shadow-sm ring-4 ring-rose-50">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Machine Breakdown & Maintenance Log
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Standard 16h/day schedule loss tracking, Friday & holiday auto-exclusions, and machine capacity lost output calculations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50 shadow-2xs"
            title="Refresh from Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={() => exportBreakdownsToCSV(records)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Breakdown Settings */}
          {canManageSettings && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Configure Master Breakdown Options"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Settings</span>
            </button>
          )}

          {/* Report New Breakdown Button */}
          <button
            onClick={() => {
              setSelectedRecord(null);
              setModalInitialMode('report');
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F87C6C] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all transform active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Report New Breakdown</span>
          </button>
        </div>
      </div>

      {/* REAL-TIME OPERATIONAL COCKPIT / EXECUTIVE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Critical Stoppages */}
        <div 
          onClick={() => {
            setActiveModuleTab('unsolved');
            setQuickFilterChip('critical');
          }}
          className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-xs hover:border-rose-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
            <span>Critical Stops</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 group-hover:scale-125 transition animate-ping" />
          </div>
          <div className="text-2xl font-black text-rose-600 flex items-baseline gap-1">
            {metrics.activeStops}
            <span className="text-xs font-normal text-slate-400">machines</span>
          </div>
          <span className="text-[10px] text-rose-700 font-bold mt-0.5 block">
            {metrics.activeStops > 0 ? '🚨 Production Halted' : '✅ 0 Stoppages'}
          </span>
        </div>

        {/* Metric 2: Active Tickets Queue */}
        <div 
          onClick={() => {
            setActiveModuleTab('unsolved');
            setQuickFilterChip('all');
          }}
          className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-xs hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
            <span>Active Queue</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 flex items-baseline gap-1">
            {metrics.activeUnsolved}
            <span className="text-xs font-normal text-slate-400">tickets</span>
          </div>
          <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
            {metrics.todayCount} reported today
          </span>
        </div>

        {/* Metric 3: Total Working Hours Lost */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
            <span>Hours Lost</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
            {metrics.totalWorkingHoursLost}
            <span className="text-xs font-normal text-slate-400">hrs</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">
            Standard 16h/Day
          </span>
        </div>

        {/* Metric 4: Lost Production Output */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
            <span>Lost Output</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1 truncate" title={`${metrics.totalLostPcs.toLocaleString()} units`}>
            {metrics.totalLostPcs > 10000 
              ? `${(metrics.totalLostPcs / 1000).toFixed(1)}k` 
              : metrics.totalLostPcs.toLocaleString()}
            <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            Capacity-based
          </span>
        </div>

        {/* Metric 5: Repair Cost */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
            <span>Parts & Service</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 flex items-baseline gap-1">
            ${metrics.totalCost.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            Total Maintenance Cost
          </span>
        </div>

        {/* Metric 6: Fleet Readiness */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
            <span>Fleet Health</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
            {metrics.fleetHealthPct}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                metrics.fleetHealthPct >= 90 ? 'bg-emerald-500' : metrics.fleetHealthPct >= 75 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${metrics.fleetHealthPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Module Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-3 sm:px-4 rounded-2xl shadow-xs overflow-x-auto gap-1">
        
        {/* Tab 1: Unsolved Tickets */}
        <button
          onClick={() => {
            setActiveModuleTab('unsolved');
            setStatusFilter('All');
            setCurrentPage(1);
          }}
          className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModuleTab === 'unsolved' 
              ? 'border-indigo-600 text-indigo-600 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>Active Unsolved Queue</span>
          <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2 py-0.5 rounded-full">
            {unsolvedRecords.length}
          </span>
        </button>

        {/* Tab 2: Operator / User Breakdown Entry */}
        <button
          onClick={() => setActiveModuleTab('user-entry')}
          className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModuleTab === 'user-entry' 
              ? 'border-indigo-600 text-indigo-600 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-500" />
          <span>1. Operator Report Entry</span>
        </button>

        {/* Tab 3: Maintenance Workflow */}
        <button
          onClick={() => setActiveModuleTab('maintenance')}
          className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModuleTab === 'maintenance' 
              ? 'border-indigo-600 text-indigo-600 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4 text-[#F87C6C]" />
          <span>2. Maintenance Workflow</span>
        </button>

        {/* Tab 4: Completed & Closed List */}
        <button
          onClick={() => {
            setActiveModuleTab('completed');
            setStatusFilter('All');
            setCurrentPage(1);
          }}
          className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModuleTab === 'completed' 
              ? 'border-indigo-600 text-indigo-600 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Completed & Closed ({completedRecords.length})</span>
        </button>

        {/* Tab 5: Machine Fleet Status */}
        <button
          onClick={() => setActiveModuleTab('machines')}
          className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModuleTab === 'machines' 
              ? 'border-indigo-600 text-indigo-600 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Factory className="w-4 h-4 text-amber-500" />
          <span>Fleet Health Matrix</span>
        </button>

        {/* Tab 6: Analytics Dashboard & KPIs */}
        <button
          onClick={() => setActiveModuleTab('dashboard')}
          className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModuleTab === 'dashboard' 
              ? 'border-indigo-600 text-indigo-600 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Analytics & KPIs</span>
        </button>

        {/* Tab 7: Maintenance Audit Trail */}
        <button
          onClick={() => setActiveModuleTab('audit')}
          className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModuleTab === 'audit' 
              ? 'border-indigo-600 text-indigo-600 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* VIEW 1: USER BREAKDOWN ENTRY VIEW */}
      {activeModuleTab === 'user-entry' && (
        <UserBreakdownEntry
          records={records}
          machinesList={machinesList}
          departmentsList={departmentsList}
          employeesList={employeesList}
          userSecurityScope={userSecurityScope}
          nextGeneratedId={nextGeneratedId}
          onSaveRecord={handleSaveRecord}
          onSwitchToMaintenance={() => setActiveModuleTab('maintenance')}
        />
      )}

      {/* VIEW 2: MAINTENANCE WORKFLOW VIEW */}
      {activeModuleTab === 'maintenance' && (
        <MaintenanceWorkflow
          records={records}
          machinesList={machinesList}
          employeesList={employeesList}
          holidaysList={holidaysList}
          overridesList={overridesList}
          shiftsList={shiftsList}
          masterFailureModes={masterFailureModes}
          masterCategories={masterCategories}
          masterActivities={masterActivities}
          masterSpareParts={masterSpareParts}
          masterUOMs={masterUOMs}
          userSecurityScope={userSecurityScope}
          onSaveRecord={handleSaveRecord}
          onSwitchToLog={() => setActiveModuleTab('unsolved')}
        />
      )}

      {/* VIEW 3 & 4: TICKET QUEUES (UNSOLVED or COMPLETED) */}
      {(activeModuleTab === 'unsolved' || activeModuleTab === 'completed') && (
        <div className="space-y-4">
          
          {/* Quick-Filter Chips Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            {/* Left: Quick filter chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Filter:
              </span>

              <button
                onClick={() => { setQuickFilterChip('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  quickFilterChip === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>All ({currentDataset.length})</span>
              </button>

              <button
                onClick={() => { setQuickFilterChip('critical'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  quickFilterChip === 'critical'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Critical Stops ({currentDataset.filter(r => r.productionStop === 'Yes').length})</span>
              </button>

              <button
                onClick={() => { setQuickFilterChip('unattended'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  quickFilterChip === 'unattended'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>Unattended ({currentDataset.filter(r => !r.attendByName && !r.attendById).length})</span>
              </button>

              <button
                onClick={() => { setQuickFilterChip('in_progress'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  quickFilterChip === 'in_progress'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <span>In Progress ({currentDataset.filter(r => r.status === 'Maintenance in Progress').length})</span>
              </button>

              <button
                onClick={() => { setQuickFilterChip('waiting_parts'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  quickFilterChip === 'waiting_parts'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <span>Waiting Parts ({currentDataset.filter(r => r.status === 'Waiting for Spare Parts' || r.status === 'Waiting for Service').length})</span>
              </button>

              <button
                onClick={() => { setQuickFilterChip('today'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  quickFilterChip === 'today'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>Today's Logs</span>
              </button>
            </div>

            {/* Right: View mode switcher */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setTicketViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  ticketViewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Detailed Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>

              <button
                onClick={() => setTicketViewMode('kanban')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  ticketViewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visual Kanban Workflow Board"
              >
                <Kanban className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kanban Board</span>
              </button>

              <button
                onClick={() => setTicketViewMode('matrix')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  ticketViewMode === 'matrix' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Fleet Department Matrix"
              >
                <Factory className="w-3.5 h-3.5 text-amber-600" />
                <span>Fleet Matrix</span>
              </button>
            </div>
          </div>

          {/* Search and Advanced Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${activeModuleTab === 'unsolved' ? 'unsolved' : 'completed'} by ID, Machine, Department, Problem, Tech...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="All">All Departments</option>
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Production Stop */}
              <select
                value={productionStopFilter}
                onChange={(e) => {
                  setProductionStopFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="All">Stop Status (All)</option>
                <option value="Yes">🔴 Yes (Downtime)</option>
                <option value="No">🟢 No (Running)</option>
              </select>

              {/* Failure Mode */}
              <select
                value={failureModeFilter}
                onChange={(e) => {
                  setFailureModeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="All">All Root Causes</option>
                {masterFailureModes.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SUB-VIEW 1: KANBAN BOARD VIEW */}
          {ticketViewMode === 'kanban' && (
            <BreakdownKanbanView
              records={filteredRecords}
              machinesList={machinesList}
              employeesList={employeesList}
              holidaysList={holidaysList}
              overridesList={overridesList}
              shiftsList={shiftsList}
              userSecurityScope={userSecurityScope}
              onOpenRecord={(record, mode) => {
                setSelectedRecord(record);
                setModalInitialMode(mode || 'maintenance');
                setIsModalOpen(true);
              }}
              onOpenCalculationDetails={handleOpenCalculationDetails}
              onQuickStatusChange={handleQuickStatusChange}
              onQuickAssignTech={(record) => setQuickActionRecord(record)}
            />
          )}

          {/* SUB-VIEW 2: FLEET DEPARTMENT MATRIX VIEW */}
          {ticketViewMode === 'matrix' && (
            <BreakdownDepartmentMatrix
              records={records}
              machinesList={machinesList}
              departmentsList={departmentsList}
              onOpenRecord={(record) => {
                setSelectedRecord(record);
                setModalInitialMode('maintenance');
                setIsModalOpen(true);
              }}
              onReportNewForMachine={(machineName, dept, machineNo) => {
                setSelectedRecord({
                  id: nextGeneratedId,
                  date: new Date().toISOString().substring(0, 10),
                  department: dept,
                  machineName: machineName,
                  machineNo: machineNo,
                  problemDescription: '',
                  productionStop: 'Yes',
                  reportAt: new Date().toTimeString().substring(0, 5),
                  reporterId: userSecurityScope?.employeeId || '',
                  reporterName: userSecurityScope?.employeeName || '',
                  attendAt: '',
                  responseTimeMin: 0,
                  machineStartAt: '',
                  hourLostHours: 0,
                  hourLostFormatted: '0 Hours',
                  attendById: '',
                  attendByName: '',
                  attendByAll: [],
                  failureMode: '',
                  category: 'Breakdown',
                  activity: '',
                  sparePartsService: 'None',
                  quantity: 0,
                  uom: 'PCS',
                  unitCost: 0,
                  totalCost: 0,
                  status: 'Open',
                  remarks: '',
                  createdBy: userSecurityScope?.employeeName || '',
                  createdAt: new Date().toISOString(),
                  updatedBy: '',
                  updatedAt: ''
                });
                setModalInitialMode('report');
                setIsModalOpen(true);
              }}
            />
          )}

          {/* SUB-VIEW 3: DETAILED TABLE VIEW (Default) */}
          {ticketViewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-[11px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200 select-none">
                      <th className="py-3.5 px-3 w-10 text-center"></th>
                      <th className="py-3.5 px-3 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('id')}>
                        <div className="flex items-center gap-1">
                          Ticket ID <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3.5 px-3 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-1">
                          Date & Timing <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3.5 px-3">Department</th>
                      <th className="py-3.5 px-3">Machine Unit</th>
                      <th className="py-3.5 px-3 min-w-[200px]">Problem Statement</th>
                      <th className="py-3.5 px-3 text-center">Stop?</th>
                      <th className="py-3.5 px-3 text-center">Working Hours Lost</th>
                      <th className="py-3.5 px-3 text-center">Output Loss</th>
                      <th className="py-3.5 px-3">Attended By</th>
                      <th className="py-3.5 px-3 text-right">Cost ($)</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="font-semibold">Loading live breakdown logs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            <span className="font-bold text-slate-700">
                              {activeModuleTab === 'unsolved' 
                                ? 'No unsolved breakdown issues found. All machines are operating normally.'
                                : 'No completed breakdown records match the selected filters.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r, idx) => {
                        const calc = calculateWorkingHourLost(
                          r.date,
                          r.reportAt,
                          r.machineStartDate || r.date,
                          r.machineStartAt,
                          r.productionStop,
                          holidaysList,
                          overridesList,
                          r.machineName,
                          machinesList,
                          r.department,
                          shiftsList
                        );

                        const hours = calc.decimalHours || (Number(r.hourLostHours) || 0);
                        const lostPcs = calc.lostPcs;
                        const isExpanded = expandedRowId === r.id;

                        return (
                          <React.Fragment key={`${r.id}-${idx}`}>
                            <tr 
                              onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                              className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
                                isExpanded ? 'bg-indigo-50/40' : ''
                              }`}
                            >
                              {/* Expand Chevron */}
                              <td className="py-3 px-3 text-center">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedRowId(isExpanded ? null : r.id);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>

                              {/* Ticket ID */}
                              <td className="py-3 px-3 font-mono font-black text-indigo-700 whitespace-nowrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCalculationDetails(r);
                                  }}
                                  className="hover:underline text-indigo-700 text-left flex items-center gap-1 group"
                                  title="Click to view Calculation Details"
                                >
                                  <span>{r.id}</span>
                                  <Sparkles className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 transition-opacity" />
                                </button>
                              </td>

                              {/* Date & Report Time */}
                              <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                <div className="font-bold text-slate-800">{r.date}</div>
                                <div className="text-[10px] text-slate-400">Rep: {r.reportAt || '—'}</div>
                              </td>

                              {/* Department */}
                              <td className="py-3 px-3">
                                <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                  {r.department}
                                </span>
                              </td>

                              {/* Machine */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-black text-slate-900">{r.machineName}</div>
                                {r.machineNo && <div className="text-[10px] font-mono text-slate-400">{r.machineNo}</div>}
                              </td>

                              {/* Problem */}
                              <td className="py-3 px-3">
                                <p className="text-slate-800 line-clamp-2 max-w-xs font-medium" title={r.problemDescription}>
                                  {r.problemDescription}
                                </p>
                              </td>

                              {/* Production Stop */}
                              <td className="py-3 px-3 text-center">
                                {r.productionStop === 'Yes' ? (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-200 font-black px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                    STOP
                                  </span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px]">
                                    RUN
                                  </span>
                                )}
                              </td>

                              {/* Working Hours Lost */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {hours > 0 ? (
                                  <div>
                                    <span className="text-rose-700 font-black font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200 block">
                                      {calc.formatted}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono">0.00 Hrs</span>
                                )}
                              </td>

                              {/* Lost Production Output */}
                              <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                                {lostPcs > 0 ? (
                                  <div>
                                    <span className="font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block">
                                      {lostPcs.toLocaleString()} {calc.standardUnit}
                                    </span>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                      @{calc.hourlyCapacityPcs.toLocaleString()}/hr
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono">0 {calc.standardUnit}</span>
                                )}
                              </td>

                              {/* Attended By */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {r.attendByName || r.attendById ? (
                                  <div className="font-bold text-slate-800 flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-blue-600" />
                                    <span>{r.attendByName || r.attendById}</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuickActionRecord(r);
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition"
                                  >
                                    + Assign Tech
                                  </button>
                                )}
                              </td>

                              {/* Cost */}
                              <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                                ${Number(r.totalCost || 0).toFixed(2)}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {renderStatusBadge(r.status, r)}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setQuickActionRecord(r)}
                                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                                    title="Quick Maintenance Action"
                                  >
                                    <Zap className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenCalculationDetails(r)}
                                    className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                                    title="View Calculation Math"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setModalInitialMode('maintenance');
                                      setIsModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                    title="Open Full Maintenance Modal"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  {canDeleteRecords && (
                                    <button
                                      onClick={() => handleDeleteRecord(r)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* EXPANDABLE 360-DEGREE TIMELINE DRAWER */}
                            {isExpanded && (
                              <tr className="bg-indigo-50/30 border-b border-indigo-100">
                                <td colSpan={13} className="p-4 sm:p-5">
                                  <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm space-y-4">
                                    
                                    {/* Drawer Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-black text-indigo-800">
                                          {r.id} Complete Timeline & Technical Audit
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                                          Machine: {r.machineName} ({r.department})
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setQuickActionRecord(r)}
                                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                                        >
                                          <Wrench className="w-3.5 h-3.5" />
                                          <span>Quick Update</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedRecord(r);
                                            setModalInitialMode('maintenance');
                                            setIsModalOpen(true);
                                          }}
                                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                          <span>Full Modal</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* 4-Step Visual Operational Timeline */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                      {/* Step 1: Reported */}
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                        <div className="font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                                          <Clock className="w-3 h-3 text-slate-600" />
                                          <span>1. Reported</span>
                                        </div>
                                        <div className="font-bold text-slate-800 font-mono">
                                          {r.date} @ {r.reportAt || '—'}
                                        </div>
                                        <div className="text-slate-600">
                                          By: <strong className="text-slate-900">{r.reporterName || r.reporterId || 'Operator'}</strong>
                                        </div>
                                        <p className="text-[11px] text-slate-700 line-clamp-2 bg-white p-1.5 rounded border border-slate-100 font-medium mt-1">
                                          {r.problemDescription}
                                        </p>
                                      </div>

                                      {/* Step 2: Attended */}
                                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                                        <div className="font-bold text-blue-800 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                                          <UserCheck className="w-3 h-3 text-blue-600" />
                                          <span>2. Technician Attendance</span>
                                        </div>
                                        <div className="font-bold text-slate-800 font-mono">
                                          {r.attendAt ? `Attended @ ${r.attendAt}` : '⏳ Pending Attendance'}
                                        </div>
                                        <div className="text-slate-700">
                                          Tech: <strong>{r.attendByName || r.attendById || 'Unassigned'}</strong>
                                        </div>
                                        {r.failureMode && (
                                          <div className="text-[11px] text-blue-900 font-semibold mt-1">
                                            Root Cause: {r.failureMode}
                                          </div>
                                        )}
                                      </div>

                                      {/* Step 3: Spare Parts & Activity */}
                                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                                        <div className="font-bold text-amber-800 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                                          <Layers className="w-3 h-3 text-amber-600" />
                                          <span>3. Parts & Repair Activity</span>
                                        </div>
                                        <div className="font-bold text-slate-800">
                                          {r.activity || 'Troubleshooting / Repair'}
                                        </div>
                                        <div className="text-slate-700">
                                          Part: <strong>{r.sparePartsService || 'None'}</strong>
                                        </div>
                                        <div className="text-[11px] font-bold text-emerald-800 font-mono">
                                          Cost: ${Number(r.totalCost || 0).toFixed(2)} ({r.quantity || 0} {r.uom || 'PCS'})
                                        </div>
                                      </div>

                                      {/* Step 4: Recovery & Impact */}
                                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                                        <div className="font-bold text-emerald-800 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>4. Recovery & Output Impact</span>
                                        </div>
                                        <div className="font-bold text-slate-800 font-mono">
                                          {r.machineStartAt ? `Restarted @ ${r.machineStartAt}` : 'Machine Stalled'}
                                        </div>
                                        <div className="text-rose-700 font-bold font-mono">
                                          Hours Lost: {calc.formatted}
                                        </div>
                                        <div className="text-[11px] text-amber-900 font-bold">
                                          Lost Units: {lostPcs.toLocaleString()} {calc.standardUnit}
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="px-4 py-3.5 border-t border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Showing <strong>{filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, filteredRecords.length)}</strong> of{' '}
                  <strong>{filteredRecords.length}</strong> records
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                    Prev
                  </button>

                  <span className="font-bold text-slate-800">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition shadow-2xs"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW 5: MACHINE HEALTH FLEET STATUS */}
      {activeModuleTab === 'machines' && (
        <BreakdownDepartmentMatrix
          records={records}
          machinesList={machinesList}
          departmentsList={departmentsList}
          onOpenRecord={(record) => {
            setSelectedRecord(record);
            setModalInitialMode('maintenance');
            setIsModalOpen(true);
          }}
          onReportNewForMachine={(machineName, dept, machineNo) => {
            setSelectedRecord({
              id: nextGeneratedId,
              date: new Date().toISOString().substring(0, 10),
              department: dept,
              machineName: machineName,
              machineNo: machineNo,
              problemDescription: '',
              productionStop: 'Yes',
              reportAt: new Date().toTimeString().substring(0, 5),
              reporterId: userSecurityScope?.employeeId || '',
              reporterName: userSecurityScope?.employeeName || '',
              attendAt: '',
              responseTimeMin: 0,
              machineStartAt: '',
              hourLostHours: 0,
              hourLostFormatted: '0 Hours',
              attendById: '',
              attendByName: '',
              attendByAll: [],
              failureMode: '',
              category: 'Breakdown',
              activity: '',
              sparePartsService: 'None',
              quantity: 0,
              uom: 'PCS',
              unitCost: 0,
              totalCost: 0,
              status: 'Open',
              remarks: '',
              createdBy: userSecurityScope?.employeeName || '',
              createdAt: new Date().toISOString(),
              updatedBy: '',
              updatedAt: ''
            });
            setModalInitialMode('report');
            setIsModalOpen(true);
          }}
        />
      )}

      {/* VIEW 6: DASHBOARD ANALYTICS */}
      {activeModuleTab === 'dashboard' && (
        <BreakdownDashboard
          records={records}
          machinesList={machinesList}
          departmentsList={departmentsList}
        />
      )}

      {/* VIEW 7: AUDIT TRAIL LOG */}
      {activeModuleTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Full Maintenance Audit Trail ({auditLogs.length} entries)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Permanent chronological record of all creations, updates, and closures
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Breakdown ID</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No audit log entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((entry, i) => (
                    <tr key={entry.logId || i} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-indigo-700 font-bold">{entry.logId}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{entry.breakdownId}</td>
                      <td className="p-3 font-mono text-slate-500">{entry.date} {entry.time}</td>
                      <td className="p-3 font-bold text-slate-800">{entry.userName || entry.userId}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {entry.userRole}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          entry.action === 'Created' ? 'bg-emerald-100 text-emerald-800' :
                          entry.action === 'Deleted' ? 'bg-rose-100 text-rose-800' :
                          entry.action === 'Closed' ? 'bg-slate-200 text-slate-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{entry.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULL BREAKDOWN REPORT & MAINTENANCE MODAL */}
      {isModalOpen && (
        <BreakdownModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecord(null);
          }}
          onSave={handleSaveRecord}
          initialRecord={selectedRecord}
          records={records}
          machinesList={machinesList}
          employeesList={employeesList}
          departmentsList={departmentsList}
          holidaysList={holidaysList}
          overridesList={overridesList}
          shiftsList={shiftsList}
          masterFailureModes={masterFailureModes}
          masterCategories={masterCategories}
          masterActivities={masterActivities}
          masterSpareParts={masterSpareParts}
          masterUOMs={masterUOMs}
          userSecurityScope={userSecurityScope}
          auditLogs={auditLogs}
          nextGeneratedId={nextGeneratedId}
          initialMode={modalInitialMode}
        />
      )}

      {/* QUICK FLOOR ACTION MODAL */}
      {quickActionRecord && (
        <BreakdownQuickActionModal
          record={quickActionRecord}
          employeesList={employeesList}
          masterFailureModes={masterFailureModes}
          masterActivities={masterActivities}
          masterSpareParts={masterSpareParts}
          userSecurityScope={userSecurityScope}
          onClose={() => setQuickActionRecord(null)}
          onSave={handleSaveRecord}
        />
      )}

      {/* CALCULATION TRANSPARENCY MODAL */}
      {isCalcModalOpen && calcModalRecord && calcModalDetails && (
        <BreakdownCalculationModal
          isOpen={isCalcModalOpen}
          onClose={() => {
            setIsCalcModalOpen(false);
            setCalcModalRecord(null);
            setCalcModalDetails(null);
          }}
          record={calcModalRecord}
          calculationDetails={calcModalDetails}
        />
      )}

      {/* MASTER SETTINGS MODAL */}
      {isSettingsOpen && (
        <BreakdownSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentSettingsRows={settingsRows}
          userSecurityScope={userSecurityScope}
          onSaveSettings={async (newSettings) => {
            setSettingsRows(newSettings);
            await updateRange(spreadsheetId, `BreakdownSettings!A2:D${newSettings.length + 1}`, newSettings);
          }}
        />
      )}

      {/* ADMIN PASSWORD CONFIRMATION MODAL FOR BREAKDOWN DELETION */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteRecordTarget)}
        title="Delete Breakdown Log Entry"
        itemName={deleteRecordTarget ? `Breakdown #${deleteRecordTarget.id} — ${deleteRecordTarget.machineName}` : undefined}
        itemDetails={deleteRecordTarget ? `Date: ${deleteRecordTarget.date} | Category: ${deleteRecordTarget.category} | Status: ${deleteRecordTarget.status}` : undefined}
        warningMessage="This maintenance breakdown record will be permanently purged from the database and Google Sheets. Please enter the Admin Deletion Password configured in Settings → ERP Settings to authorize this deletion."
        confirmButtonText="Verify & Delete Breakdown"
        onConfirm={executeConfirmedBreakdownDelete}
        onClose={() => setDeleteRecordTarget(null)}
      />
    </div>
  );
}

