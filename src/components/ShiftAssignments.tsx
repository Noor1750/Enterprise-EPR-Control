import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { getRange, appendRow, updateRowByPrimaryKey, STANDARD_SHIFTS } from '../lib/sheets';
import { UserSecurityScope, filterAuthorizedEmployees } from '../lib/security';
import { 
  Loader2, Briefcase, Search, Check, 
  X, UserCheck, Activity, ShieldAlert, CheckCircle, RotateCw, UserMinus,
  Clock, Users, Layers, Filter, AlertCircle, Sun, Moon, Sparkles, ChevronDown, ChevronUp,
  Calendar, History, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon,
  RefreshCw, Shield, HelpCircle, Download
} from 'lucide-react';
import { 
  ShiftType, 
  ShiftMode, 
  EmployeeShiftState, 
  ShiftHistoryRecord,
  parseEmployeeShiftState, 
  updateEmployeeShiftAssignment, 
  resumeAutomaticRotation,
  getSaturdayWeekRange, 
  getNextSaturdayWeekRange, 
  getPreviousSaturdayWeekRange,
  getShiftBadgeStyles, 
  getShiftModeBadgeStyles,
  normalizeShift
} from '../lib/shiftEngine';
import ShiftBadge, { ShiftIcon } from './common/ShiftBadge';
import { fetchHolidayCalendarData, HolidayCalendarData, evaluateDateWorkingStatus } from '../lib/holidayEngine';
import { format, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import MachineAllocationsTab from './shift/MachineAllocationsTab';

const getXlsx = () => XLSX;

interface ShiftAssignmentsProps {
  spreadsheetId: string;
  user: User;
  userSecurityScope?: UserSecurityScope;
}

export default function ShiftAssignments({ spreadsheetId, user, userSecurityScope }: ShiftAssignmentsProps) {
  // Primary raw data
  const [shifts, setShifts] = useState<string[][]>([]);
  const [assignments, setAssignments] = useState<string[][]>([]);
  const [machines, setMachines] = useState<string[][]>([]);
  const [allEmployeesRaw, setAllEmployeesRaw] = useState<string[][]>([]);
  const [shiftHistoryRaw, setShiftHistoryRaw] = useState<string[][]>([]);

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'rotation' | 'machines' | 'roster' | 'history' | 'definitions'>('rotation');
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  
  // Loading & Sync states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters for Rotation Tab
  const [rotationSearch, setRotationSearch] = useState('');
  const [rotationDeptFilter, setRotationDeptFilter] = useState('All');
  const [rotationShiftFilter, setRotationShiftFilter] = useState<string>('All');
  const [rotationModeFilter, setRotationModeFilter] = useState<string>('All');
  const [selectedEmpIdsForBatch, setSelectedEmpIdsForBatch] = useState<string[]>([]);

  // Filters for Machine Allocations Tab
  const [selectedShiftId, setSelectedShiftId] = useState<string>('SHF-001');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [opSearchTerm, setOpSearchTerm] = useState('');
  const [operatorFilterTab, setOperatorFilterTab] = useState<'all' | 'matching' | 'other'>('all');
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);

  // Modals
  const [shiftModalEmployee, setShiftModalEmployee] = useState<EmployeeShiftState | null>(null);
  const [modalShiftValue, setModalShiftValue] = useState<ShiftType>('Day Shift');
  const [modalShiftMode, setModalShiftMode] = useState<ShiftMode>('Automatic Rotation');
  const [modalEffectiveDate, setModalEffectiveDate] = useState<string>(
    format(getSaturdayWeekRange(new Date()).startDate, 'yyyy-MM-dd')
  );
  const [modalRemarks, setModalRemarks] = useState('');
  const [isSavingShift, setIsSavingShift] = useState(false);

  // Machine Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [selectedAssignEmpIds, setSelectedAssignEmpIds] = useState<string[]>([]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [unassignConfirmData, setUnassignConfirmData] = useState<{ id: string; name: string; machine: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async (showFullLoader = true) => {
    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const [shiftsRaw, assignRaw, machRaw, empRaw, histRaw] = await Promise.all([
        getRange(spreadsheetId, 'Shifts!A:Z').catch(() => []),
        getRange(spreadsheetId, 'ShiftAssignments!A:Z').catch(() => []),
        getRange(spreadsheetId, 'MachineCapacity!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Employees!A:Z').catch(() => []),
        getRange(spreadsheetId, 'ShiftHistory!A:Z').catch(() => [])
      ]);
      
      let loadedShifts = shiftsRaw.length > 1 ? shiftsRaw.slice(1) : [];
      if (loadedShifts.length === 0 || loadedShifts.some(s => s[1]?.toLowerCase().includes('day') || s[1]?.toLowerCase().includes('night'))) {
        loadedShifts = STANDARD_SHIFTS.slice(1);
      }
      
      setShifts(loadedShifts);
      setAssignments(assignRaw.length > 1 ? assignRaw.slice(1) : []);
      setMachines(machRaw.length > 1 ? machRaw.slice(1) : []);
      setAllEmployeesRaw(empRaw.length > 1 ? empRaw.slice(1) : []);
      setShiftHistoryRaw(histRaw.length > 1 ? histRaw.slice(1) : []);

      setSelectedShiftId(prev => {
        if (!prev || !loadedShifts.find(s => s[0] === prev)) {
          return loadedShifts[0]?.[0] || 'SHF-001';
        }
        return prev;
      });
    } catch (err) {
      console.error('Error loading shift assignment data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const [holidayData, setHolidayData] = useState<HolidayCalendarData | null>(null);

  useEffect(() => {
    if (spreadsheetId) {
      fetchHolidayCalendarData(spreadsheetId).then(setHolidayData).catch(err => {
        console.error('Failed to load holiday calendar in ShiftAssignments:', err);
      });
    }
  }, [spreadsheetId]);

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sheet = customEvent.detail?.sheetName || '';
      if (!sheet || ['MachineCapacity', 'ShiftAssignments', 'Employees', 'Shifts', 'ShiftHistory', 'Holidays', 'HolidayDepartmentOverrides'].includes(sheet)) {
        loadData(false);
        if (spreadsheetId) {
          fetchHolidayCalendarData(spreadsheetId).then(setHolidayData).catch(() => {});
        }
      }
    };

    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, [spreadsheetId]);

  // Parse Shift History Records
  const shiftHistoryRecords: ShiftHistoryRecord[] = useMemo(() => {
    return shiftHistoryRaw.map(row => ({
      historyId: row[0] || '',
      employeeId: row[1] || '',
      employeeName: row[2] || '',
      previousShift: row[3] || '',
      newShift: row[4] || '',
      effectiveDate: row[5] || '',
      assignmentType: (row[6] || 'Automatic Rotation') as ShiftMode,
      changedBy: row[7] || '',
      changedAt: row[8] || '',
      remarks: row[9] || ''
    })).reverse();
  }, [shiftHistoryRaw]);

  // Security filtered employees
  const authorizedRawEmployees = useMemo(() => {
    return filterAuthorizedEmployees(allEmployeesRaw, userSecurityScope);
  }, [allEmployeesRaw, userSecurityScope]);

  // Computed dynamic weekly employee states for selected target date
  const employeesShiftState: EmployeeShiftState[] = useMemo(() => {
    return authorizedRawEmployees.map(row => 
      parseEmployeeShiftState(row, targetDate, shiftHistoryRecords)
    );
  }, [authorizedRawEmployees, targetDate, shiftHistoryRecords]);

  // Current Target Week Info (Saturday -> Thursday)
  const targetWeek = useMemo(() => getSaturdayWeekRange(targetDate), [targetDate]);
  const nextTargetWeek = useMemo(() => getNextSaturdayWeekRange(targetDate), [targetDate]);

  // Check holidays occurring in current target week
  const weekHolidays = useMemo(() => {
    if (!holidayData) return [];
    const days = eachDayOfInterval({ start: targetWeek.startDate, end: targetWeek.offDate });
    const list: { date: string; name: string; type: string; isWorkingDay: boolean }[] = [];
    
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const evalRes = evaluateDateWorkingStatus(
        dateStr,
        holidayData.holidays,
        holidayData.overrides
      );
      if (evalRes.holidayName) {
        list.push({
          date: dateStr,
          name: evalRes.holidayName,
          type: evalRes.holidayType,
          isWorkingDay: evalRes.isWorkingDay
        });
      }
    });

    return list;
  }, [holidayData, targetWeek]);

  // Summary Metrics for the target week
  const metrics = useMemo(() => {
    const total = employeesShiftState.length;
    const active = employeesShiftState.filter(e => e.status === 'Active');
    const aShift = active.filter(e => e.currentShift === 'Day Shift').length;
    const bShift = active.filter(e => e.currentShift === 'Night Shift').length;
    const general = active.filter(e => e.currentShift === 'General').length;
    const overrides = active.filter(e => e.shiftMode === 'Manual Override').length;
    const autoRotating = active.filter(e => e.shiftMode === 'Automatic Rotation').length;

    return { total, activeCount: active.length, aShift, bShift, general, overrides, autoRotating };
  }, [employeesShiftState]);

  // Filtered employees for Rotation Tab
  const filteredRotationEmployees = useMemo(() => {
    return employeesShiftState.filter(e => {
      const matchSearch = rotationSearch.trim() === '' ||
        e.id.toLowerCase().includes(rotationSearch.toLowerCase()) ||
        e.name.toLowerCase().includes(rotationSearch.toLowerCase()) ||
        e.designation.toLowerCase().includes(rotationSearch.toLowerCase()) ||
        e.workingArea.toLowerCase().includes(rotationSearch.toLowerCase());

      const matchDept = rotationDeptFilter === 'All' || e.department === rotationDeptFilter;
      const matchShift = rotationShiftFilter === 'All' || e.currentShift === rotationShiftFilter;
      const matchMode = rotationModeFilter === 'All' || e.shiftMode === rotationModeFilter;

      return matchSearch && matchDept && matchShift && matchMode;
    });
  }, [employeesShiftState, rotationSearch, rotationDeptFilter, rotationShiftFilter, rotationModeFilter]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employeesShiftState.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employeesShiftState]);

  // Open Quick Shift Modal
  const handleOpenShiftModal = (emp: EmployeeShiftState) => {
    setShiftModalEmployee(emp);
    setModalShiftValue(emp.currentShift);
    setModalShiftMode(emp.shiftMode);
    setModalEffectiveDate(emp.effectiveDate || format(targetWeek.startDate, 'yyyy-MM-dd'));
    setModalRemarks(emp.remarks || '');
  };

  // Save Shift Modal
  const handleSaveShiftModal = async () => {
    if (!shiftModalEmployee) return;
    setIsSavingShift(true);
    try {
      await updateEmployeeShiftAssignment(
        spreadsheetId,
        shiftModalEmployee,
        modalShiftValue,
        modalShiftMode,
        modalEffectiveDate,
        modalRemarks,
        userSecurityScope,
        allEmployeesRaw
      );
      showToast(`Shift updated for ${shiftModalEmployee.name} (${modalShiftValue} - ${modalShiftMode})`);
      setShiftModalEmployee(null);
      loadData(false);
    } catch (err: any) {
      console.error('Failed to update shift:', err);
      alert('Failed to update shift assignment: ' + err.message);
    } finally {
      setIsSavingShift(false);
    }
  };

  // Quick Resume Rotation
  const handleQuickResume = async (emp: EmployeeShiftState) => {
    try {
      await resumeAutomaticRotation(
        spreadsheetId,
        emp,
        'Day Shift',
        format(targetWeek.startDate, 'yyyy-MM-dd'),
        userSecurityScope,
        'Resumed automatic weekly A/B rotation'
      );
      showToast(`Automatic weekly rotation resumed for ${emp.name}`);
      loadData(false);
    } catch (err: any) {
      alert('Failed to resume automatic rotation: ' + err.message);
    }
  };

  // Batch Shift Action
  const handleBatchShiftApply = async (newShift: ShiftType, newMode: ShiftMode) => {
    if (selectedEmpIdsForBatch.length === 0) return;
    const count = selectedEmpIdsForBatch.length;
    setIsLoading(true);

    try {
      const effDate = format(targetWeek.startDate, 'yyyy-MM-dd');
      for (const id of selectedEmpIdsForBatch) {
        const empState = employeesShiftState.find(e => e.id === id);
        if (empState) {
          await updateEmployeeShiftAssignment(
            spreadsheetId,
            empState,
            newShift,
            newMode,
            effDate,
            `Batch assignment to ${newShift} (${newMode})`,
            userSecurityScope,
            allEmployeesRaw
          );
        }
      }
      setSelectedEmpIdsForBatch([]);
      showToast(`Batch updated ${count} employee(s) to ${newShift} (${newMode})`);
      loadData(false);
    } catch (err: any) {
      alert('Batch update error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle batch select
  const toggleSelectAllBatch = () => {
    if (selectedEmpIdsForBatch.length === filteredRotationEmployees.length) {
      setSelectedEmpIdsForBatch([]);
    } else {
      setSelectedEmpIdsForBatch(filteredRotationEmployees.map(e => e.id));
    }
  };

  const toggleSelectEmpBatch = (id: string) => {
    setSelectedEmpIdsForBatch(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Export Roster to Excel
  const handleExportSchedule = () => {
    const xlsx = getXlsx();
    const exportData = filteredRotationEmployees.map(e => ({
      'Employee ID': e.id,
      'Employee Name': e.name,
      'Department': e.department,
      'Working Area': e.workingArea,
      'Designation': e.designation,
      'Current Working Shift': e.currentShift,
      'Next Week Shift Preview': e.nextWeekShift,
      'Rotation Mode': e.shiftMode,
      'Rotation Starting Shift': e.rotationStartingShift,
      'Effective Anchor Date': e.effectiveDate,
      'Supervisor': e.supervisor,
      'Status': e.status,
      'Phone': e.phone,
      'Remarks': e.remarks
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `Shift_Schedule`);
    xlsx.writeFile(wb, `Weekly_Shift_Schedule_${targetWeek.startStr}_to_${targetWeek.endStr}.xlsx`);
  };

  // ----------------------------------------------------
  // MACHINE ALLOCATIONS LOGIC (Preserved & Enhanced)
  // ----------------------------------------------------
  const activeAssignments = useMemo(() => {
    return assignments.filter(a => (a[10] || '').trim().toLowerCase() === 'active');
  }, [assignments]);

  const currentShift = useMemo(() => {
    return shifts.find(s => s[0] === selectedShiftId) || shifts[0] || null;
  }, [shifts, selectedShiftId]);

  const filteredMachines = useMemo(() => {
    let result = machines.filter(m => m[4] && m[4].trim() !== '');
    if (selectedDepartment !== 'All') {
      result = result.filter(m => m[1] === selectedDepartment);
    }
    if (machineSearchTerm.trim()) {
      const term = machineSearchTerm.toLowerCase();
      result = result.filter(m => 
        (m[4] || '').toLowerCase().includes(term) ||
        (m[1] || '').toLowerCase().includes(term) ||
        (m[0] || '').toLowerCase().includes(term) ||
        (m[3] || '').toLowerCase().includes(term)
      );
    }
    return result;
  }, [machines, selectedDepartment, machineSearchTerm]);

  const machineStats = useMemo(() => {
    if (!currentShift) return [];
    const shiftName = (currentShift[1] || '').trim().toLowerCase();

    const isAShift = shiftName.includes('a shift') || shiftName.includes('day');
    const isBShift = shiftName.includes('b shift') || shiftName.includes('night');

    return filteredMachines.map(m => {
      const machineId = m[4];
      let requiredRaw = 0;
      if (isAShift) {
        requiredRaw = parseInt(m[12], 10) || 0;
        if (requiredRaw === 0 && (m[15] === 'Both Shift' || m[15] === 'One Shift')) requiredRaw = 1;
      } else if (isBShift) {
        requiredRaw = parseInt(m[13], 10) || 0;
        if (requiredRaw === 0 && m[15] === 'Both Shift') requiredRaw = 1;
      } else {
        requiredRaw = parseInt(m[14], 10) || parseInt(m[12], 10) || 0;
      }

      const assignedList = activeAssignments.filter(a => 
        a[2] === selectedShiftId && 
        a[4] === machineId
      );
      const assignedCount = assignedList.length;
      const pendingCount = Math.max(0, requiredRaw - assignedCount);

      let status = 'Pending';
      if (requiredRaw === 0) {
        status = assignedCount > 0 ? 'Assigned (No Req.)' : 'No Requirement';
      } else if (assignedCount >= requiredRaw) {
        status = 'Fully Assigned';
      }

      return {
        id: machineId,
        name: m[4],
        department: m[1] || 'General',
        brand: m[0] || '',
        process: m[3] || '',
        required: requiredRaw,
        assigned: assignedCount,
        pending: pendingCount,
        status,
        originalData: m,
        assignedOperators: assignedList
      };
    });
  }, [filteredMachines, activeAssignments, selectedShiftId, currentShift]);

  // Employee availability logic for THIS shift based on dynamic shift engine
  const availableEmployees = useMemo(() => {
    if (!currentShift) return [];
    const shiftName = normalizeShift(currentShift[1]);

    const activeEmps = employeesShiftState.filter(e => e.status === 'Active');
    
    const assignmentsMap = new Map<string, { machineName: string; assignmentId: string }>();
    activeAssignments
      .filter(a => a[2] === selectedShiftId)
      .forEach(a => assignmentsMap.set(a[6], { machineName: a[5], assignmentId: a[0] }));

    return activeEmps.map((emp, idx) => {
      const assignmentInfo = assignmentsMap.get(emp.id);
      const isMatching = emp.currentShift === shiftName || emp.currentShift === 'General';

      return {
        emp,
        assignedMachineName: assignmentInfo?.machineName || null,
        assignmentId: assignmentInfo?.assignmentId || null,
        isAssigned: !!assignmentInfo,
        designatedShift: emp.currentShift,
        isMatching
      };
    });
  }, [employeesShiftState, activeAssignments, selectedShiftId, currentShift]);

  const machineSummaryStats = useMemo(() => {
    let totalReq = 0;
    let totalAssigned = 0;
    machineStats.forEach(m => {
      totalReq += m.required;
      totalAssigned += m.assigned;
    });

    const freeCount = availableEmployees.filter(e => !e.isAssigned).length;
    const matchingFreeCount = availableEmployees.filter(e => !e.isAssigned && e.isMatching).length;

    return {
      total: machineStats.length,
      fullyAssigned: machineStats.filter(m => m.status === 'Fully Assigned').length,
      pending: machineStats.filter(m => m.status === 'Pending').length,
      totalReq,
      totalAssigned,
      availableEmps: freeCount,
      matchingFree: matchingFreeCount
    };
  }, [machineStats, availableEmployees]);

  const currentMachine = useMemo(() => {
    if (!selectedMachineId) return null;
    return machineStats.find(m => m.id === selectedMachineId) || null;
  }, [machineStats, selectedMachineId]);

  const handleOpenAssign = (machineId: string) => {
    setSelectedMachineId(machineId);
    setSelectedAssignEmpIds([]);
    setOperatorFilterTab('all');
    setAssignModalOpen(true);
  };

  const toggleAssignEmpSelection = (empId: string) => {
    if (!currentMachine) return;
    const maxSelectable = currentMachine.pending > 0 ? currentMachine.pending : 10;
    setSelectedAssignEmpIds(prev => {
      if (prev.includes(empId)) return prev.filter(id => id !== empId);
      if (prev.length < maxSelectable) return [...prev, empId];
      return prev;
    });
  };

  const handleAssignSubmit = async () => {
    if (!currentMachine || selectedAssignEmpIds.length === 0) return;
    setIsSubmittingAssign(true);

    try {
      const shiftName = currentShift?.[1] || 'Day Shift';
      const now = new Date().toISOString();
      const assignedBy = userSecurityScope?.employeeName || user.email || 'Admin';

      const newRows = selectedAssignEmpIds.map(empId => {
        const empRecord = employeesShiftState.find(e => e.id === empId);
        const empName = empRecord ? empRecord.name : '';
        const assignmentId = `ASN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        return [
          assignmentId,
          new Date().toISOString().split('T')[0],
          selectedShiftId,
          shiftName,
          currentMachine.id,
          currentMachine.name,
          empId,
          empName,
          assignedBy,
          now,
          'Active',
          '', '', ''
        ];
      });

      setAssignments(prev => [...prev, ...newRows]);
      setSelectedAssignEmpIds([]);
      setAssignModalOpen(false);
      showToast(`Assigned ${newRows.length} operator(s) to ${currentMachine.name}`);

      await appendRow(spreadsheetId, 'ShiftAssignments!A:N', newRows);
      loadData(false);
    } catch (err) {
      console.error('Assignment error:', err);
      showToast('Failed to assign operators.');
      loadData(false);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const executeUnassign = async (assignmentId: string, empName: string, machineName: string) => {
    try {
      const now = new Date().toISOString();
      const unassignedBy = userSecurityScope?.employeeName || user.email || 'Admin';
      
      setAssignments(prev => prev.map(a => {
        if (a[0] === assignmentId) {
          const updated = [...a];
          while (updated.length < 14) updated.push('');
          updated[10] = 'Inactive';
          updated[11] = unassignedBy;
          updated[12] = now;
          return updated;
        }
        return a;
      }));

      setUnassignConfirmData(null);
      showToast(`Unassigned ${empName || 'operator'} from ${machineName}`);

      const rowToUpdate = assignments.find(a => a[0] === assignmentId);
      if (rowToUpdate) {
        const updated = [...rowToUpdate];
        while (updated.length < 14) updated.push('');
        updated[10] = 'Inactive';
        updated[11] = unassignedBy;
        updated[12] = now;
        await updateRowByPrimaryKey(spreadsheetId, 'ShiftAssignments', assignmentId, updated);
      }
    } catch (err) {
      console.error('Unassign error:', err);
      showToast('Failed to update unassignment in database.');
      loadData(false);
    }
  };

  // Filtered available operators in Assign Modal
  const filteredAvailableList = useMemo(() => {
    let list = availableEmployees.filter(e => !e.isAssigned);
    if (operatorFilterTab === 'matching') list = list.filter(e => e.isMatching);
    else if (operatorFilterTab === 'other') list = list.filter(e => !e.isMatching);

    if (!opSearchTerm.trim()) return list;
    const term = opSearchTerm.toLowerCase();
    return list.filter(({ emp }) => 
      emp.name.toLowerCase().includes(term) ||
      emp.id.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term) ||
      emp.designation.toLowerCase().includes(term)
    );
  }, [availableEmployees, opSearchTerm, operatorFilterTab]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Primary Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Weekly Shift Management & Allocation Engine
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Automatic Saturday–Thursday A/B shift rotation, manual overrides with audit trails, and machine station assignment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync Data
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-slate-200 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('rotation')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'rotation'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Weekly Shift Rotation & Calendar
          </button>

          <button
            onClick={() => setActiveTab('machines')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'machines'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            Machine Station Allocations
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Live Machine Roster ({activeAssignments.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Shift Audit History ({shiftHistoryRecords.length})
          </button>

          <button
            onClick={() => setActiveTab('definitions')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'definitions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Shift Master Rules
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WEEKLY SHIFT ROTATION & CALENDAR (MAIN FEATURE)    */}
      {/* ======================================================== */}
      {activeTab === 'rotation' && (
        <div className="space-y-5">
          {/* Week Date Navigator Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <span>Active Working Week Schedule</span>
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.2 rounded-full text-[10px]">
                    Friday Off
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">
                  {targetWeek.label}
                </h3>
              </div>
            </div>

            {/* Date Stepper Controls */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setTargetDate(prev => subWeeks(prev, 1))}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center transition"
                title="View previous working week"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev Week
              </button>

              <button 
                onClick={() => setTargetDate(new Date())}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition"
              >
                Current Week
              </button>

              <button 
                onClick={() => setTargetDate(prev => addWeeks(prev, 1))}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center transition"
                title="Preview next working week rotation"
              >
                Next Week <ChevronRightIcon className="w-4 h-4 ml-1" />
              </button>

              <button 
                onClick={handleExportSchedule}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2 rounded-lg transition"
                title="Export schedule to Excel"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Holiday Alert for Current Week */}
          {weekHolidays.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-200 p-3.5 rounded-xl flex flex-wrap items-center gap-3 text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Holidays this working week:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {weekHolidays.map((h, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-semibold shadow-xs"
                  >
                    <span>{h.name} ({h.date})</span>
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px]">
                      {h.type}
                    </span>
                    {h.isWorkingDay && (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                        Working Override
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold uppercase flex items-center justify-between">
                <span>Total Active Staff</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{metrics.activeCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Assigned to shifts</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-sm">
              <div className="text-amber-800 text-xs font-semibold uppercase flex items-center justify-between">
                <span>Day Shift (Day)</span>
                <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-400/30" />
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{metrics.aShift}</div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">09:00 AM – 06:00 PM (Sat-Thu)</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200/90 shadow-sm">
              <div className="text-indigo-800 text-xs font-semibold uppercase flex items-center justify-between">
                <span>Night Shift (Night)</span>
                <Moon className="w-4.5 h-4.5 text-indigo-600 fill-indigo-400/30" />
              </div>
              <div className="text-2xl font-bold text-indigo-700 mt-1">{metrics.bShift}</div>
              <div className="text-[11px] text-indigo-600 mt-0.5">08:00 PM – 05:00 AM (Sat-Thu)</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-700 text-xs font-semibold uppercase flex items-center justify-between">
                <span>General Duty</span>
                <Briefcase className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{metrics.general}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">09:00 AM – 06:00 PM (Fixed)</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
              <div className="text-amber-900 text-xs font-semibold uppercase flex items-center justify-between">
                <span>Manual Overrides</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{metrics.overrides}</div>
              <div className="text-[11px] text-amber-700 mt-0.5">Pinned Shift Overrides</div>
            </div>
          </div>

          {/* Filter & Batch Action Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Filter by ID, name, area, designation..."
                  value={rotationSearch}
                  onChange={(e) => setRotationSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Batch Actions when items selected */}
              {selectedEmpIdsForBatch.length > 0 && (
                <div className="flex items-center space-x-2 bg-indigo-50 p-1.5 rounded-lg border border-indigo-200 text-xs animate-in fade-in flex-wrap gap-y-1.5">
                  <span className="font-bold text-indigo-900 px-2">
                    {selectedEmpIdsForBatch.length} Selected:
                  </span>
                  <button 
                    onClick={() => handleBatchShiftApply('Day Shift', 'Automatic Rotation')}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold transition shadow-xs"
                  >
                    <Sun className="w-3.5 h-3.5 fill-amber-200 text-amber-100" />
                    <span>Set Day Shift (Auto)</span>
                  </button>
                  <button 
                    onClick={() => handleBatchShiftApply('Night Shift', 'Automatic Rotation')}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition shadow-xs"
                  >
                    <Moon className="w-3.5 h-3.5 fill-indigo-200 text-indigo-100" />
                    <span>Set Night Shift (Auto)</span>
                  </button>
                  <button 
                    onClick={() => handleBatchShiftApply('General', 'Manual Override')}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-bold transition shadow-xs"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-slate-200" />
                    <span>Set General (Fixed)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedEmpIdsForBatch([])}
                    className="text-slate-500 hover:text-slate-800 px-1"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Sub-Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
                <select
                  value={rotationDeptFilter}
                  onChange={(e) => setRotationDeptFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Shift</label>
                <select
                  value={rotationShiftFilter}
                  onChange={(e) => setRotationShiftFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="All">All Shifts</option>
                  <option value="Day Shift">Day Shift (09:00 AM - 06:00 PM)</option>
                  <option value="Night Shift">Night Shift (08:00 PM - 05:00 AM)</option>
                  <option value="General">General (09:00 - 18:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rotation Mode</label>
                <select
                  value={rotationModeFilter}
                  onChange={(e) => setRotationModeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="All">All Modes</option>
                  <option value="Automatic Rotation">Automatic Weekly Rotation</option>
                  <option value="Manual Override">Manual Override (Pinned)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedEmpIdsForBatch.length > 0 && selectedEmpIdsForBatch.length === filteredRotationEmployees.length}
                        onChange={toggleSelectAllBatch}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Department & Area</th>
                    <th className="px-4 py-3.5 text-center">Current Week Shift ({targetWeek.shortLabel})</th>
                    <th className="px-4 py-3.5 text-center">Next Week Shift ({nextTargetWeek.shortLabel})</th>
                    <th className="px-4 py-3.5 text-center">Mode</th>
                    <th className="px-4 py-3.5">Rotation Anchor</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRotationEmployees.map((emp) => {
                    const currentStyle = getShiftBadgeStyles(emp.currentShift);
                    const nextStyle = getShiftBadgeStyles(emp.nextWeekShift);
                    const modeStyle = getShiftModeBadgeStyles(emp.shiftMode);
                    const isSelected = selectedEmpIdsForBatch.includes(emp.id);

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/70 transition ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                        {/* Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectEmpBatch(emp.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Name & ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {emp.name.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">{emp.id} • {emp.designation}</div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Area */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{emp.department}</div>
                          <div className="text-[11px] text-slate-500">{emp.workingArea || 'Section N/A'}</div>
                        </td>

                        {/* Current Shift */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <ShiftBadge shift={emp.currentShift} size="sm" />
                        </td>

                        {/* Next Week Shift */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <ShiftBadge shift={emp.nextWeekShift} size="sm" className="opacity-90" />
                        </td>

                        {/* Assignment Mode */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${modeStyle.bg}`}>
                            {emp.shiftMode}
                          </span>
                        </td>

                        {/* Effective Anchor */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-slate-700 font-mono text-[11px]">{emp.effectiveDate || '2026-08-01'}</div>
                          {emp.remarks && <div className="text-[10px] text-slate-400 truncate max-w-xs">{emp.remarks}</div>}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {emp.shiftMode === 'Manual Override' && (
                              <button 
                                onClick={() => handleQuickResume(emp)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200 transition"
                                title="Resume Automatic A/B Rotation"
                              >
                                Resume Auto
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenShiftModal(emp)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition flex items-center shadow-xs"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing <strong>{filteredRotationEmployees.length}</strong> staff members for working week {targetWeek.label}</span>
              <span className="text-[11px] text-slate-400">All shifts automatically rotate every Saturday</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MACHINE STATION ALLOCATIONS                        */}
      {/* ======================================================== */}
      {activeTab === 'machines' && (
        <MachineAllocationsTab
          spreadsheetId={spreadsheetId}
          machines={machines}
          shifts={shifts}
          assignments={assignments}
          allEmployees={allEmployeesRaw}
          userSecurityScope={userSecurityScope}
          onRefresh={() => loadData(false)}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 3: LIVE ROSTER                                       */}
      {/* ======================================================== */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Active Station Assignments</h3>
            <span className="text-xs text-slate-500 font-medium">{activeAssignments.length} Active Roster Entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Assignment ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Machine / Station</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Assigned By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeAssignments.map(a => (
                  <tr key={a[0]} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{a[0]}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{a[1]}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">{a[3]}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{a[5]}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{a[7]} ({a[6]})</td>
                    <td className="px-4 py-3 text-slate-500">{a[8]}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => executeUnassign(a[0], a[7], a[5])}
                        className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                      >
                        Unassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SHIFT AUDIT HISTORY                               */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Shift Assignment Audit Trail & Change Log
              </h3>
              <p className="text-xs text-slate-500">Historical records of all shift assignments, rotations, and manual overrides.</p>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-600">
              {shiftHistoryRecords.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Logged Date & Time</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Shift Transition</th>
                  <th className="px-4 py-3">Effective Date</th>
                  <th className="px-4 py-3">Assignment Mode</th>
                  <th className="px-4 py-3">Changed By</th>
                  <th className="px-4 py-3">Reason / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shiftHistoryRecords.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {item.changedAt ? format(new Date(item.changedAt), 'dd-MMM-yyyy HH:mm:ss') : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {item.employeeName} <span className="font-mono font-normal text-slate-400">({item.employeeId})</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-slate-500 font-medium">{item.previousShift || 'None'}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-bold text-indigo-600">{item.newShift}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{item.effectiveDate}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getShiftModeBadgeStyles(item.assignmentType).bg}`}>
                        {item.assignmentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.changedBy || 'Admin'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-sm truncate">{item.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: SHIFT MASTER RULES & DEFINITIONS                   */}
      {/* ======================================================== */}
      {activeTab === 'definitions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Day Shift Card */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
              <Sun className="w-5 h-5 text-emerald-600" />
              <span>Day Shift</span>
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="p-2.5 bg-emerald-50 rounded-lg font-mono text-emerald-900 font-semibold">
                Working Hours: 09:00 AM – 06:00 PM
              </div>
              <p>• Includes lunch and tea break.</p>
              <p>• Operating Week: Saturday through Thursday.</p>
              <p>• Weekly Off: Friday.</p>
              <p>• Weekly Automatic Rotation: Employees on Day Shift rotate to Night Shift the next Saturday.</p>
            </div>
          </div>

          {/* Night Shift Card */}
          <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-indigo-800 font-bold text-base">
              <Moon className="w-5 h-5 text-indigo-600" />
              <span>Night Shift</span>
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="p-2.5 bg-indigo-50 rounded-lg font-mono text-indigo-900 font-semibold">
                Working Hours: 08:00 PM – 05:00 AM
              </div>
              <p>• Includes dinner and tea break.</p>
              <p>• Operating Week: Saturday through Thursday.</p>
              <p>• Weekly Off: Friday.</p>
              <p>• Weekly Automatic Rotation: Employees on Night Shift rotate to Day Shift the next Saturday.</p>
            </div>
          </div>

          {/* General Duty Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-base">
              <Briefcase className="w-5 h-5 text-slate-600" />
              <span>General Duty (Non-Rotating)</span>
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="p-2.5 bg-slate-100 rounded-lg font-mono text-slate-900 font-semibold">
                Working Hours: 09:00 AM – 06:00 PM (8.0 + 1.0 Hr Break)
              </div>
              <p>• Operating Week: Saturday through Thursday.</p>
              <p>• Weekly Off: Friday.</p>
              <p>• Non-rotating fixed assignment for specialized technicians, QC, and department supervisors.</p>
            </div>
          </div>
        </div>
      )}

      {/* QUICK SHIFT MODAL */}
      {shiftModalEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Shift Assignment</h3>
                <p className="text-xs text-slate-500">
                  {shiftModalEmployee.name} ({shiftModalEmployee.id}) • {shiftModalEmployee.department}
                </p>
              </div>
              <button 
                onClick={() => setShiftModalEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Currently Effective Shift</div>
                  <div className="text-sm font-bold text-slate-800">{shiftModalEmployee.currentShift}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 font-medium">Current Mode</div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getShiftModeBadgeStyles(shiftModalEmployee.shiftMode).bg}`}>
                    {shiftModalEmployee.shiftMode}
                  </span>
                </div>
              </div>

              {/* Assignment Mode Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Shift Assignment Mode *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setModalShiftMode('Automatic Rotation')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${modalShiftMode === 'Automatic Rotation' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Automatic Rotation</span>
                      {modalShiftMode === 'Automatic Rotation' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 mt-1">A ↔ B weekly Saturday-Thursday rotation</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setModalShiftMode('Manual Override')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${modalShiftMode === 'Manual Override' ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Manual Override</span>
                      {modalShiftMode === 'Manual Override' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 mt-1">Pin to fixed shift without auto-rotating</span>
                  </button>
                </div>
              </div>

              {/* Shift Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {modalShiftMode === 'Automatic Rotation' ? 'Rotation Starting Shift *' : 'Fixed Assigned Shift *'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Day Shift', 'Night Shift', 'General'] as ShiftType[]).map((sh) => {
                    const isSelected = modalShiftValue === sh;
                    const style = getShiftBadgeStyles(sh);
                    return (
                      <button
                        key={sh}
                        type="button"
                        onClick={() => setModalShiftValue(sh)}
                        className={`p-3 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center ${isSelected ? `${style.bg} ring-2 ring-indigo-500 shadow-sm` : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                      >
                        <ShiftIcon shift={sh} className="w-5 h-5 mb-1.5" />
                        <span className="text-xs">{sh}</span>
                        <span className="text-[10px] font-normal text-slate-500 mt-0.5">{style.subtext.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Effective Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Effective Date (Saturday Week Anchor) *</label>
                <input 
                  type="date"
                  value={modalEffectiveDate}
                  onChange={(e) => setModalEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Change Reason / Remarks</label>
                <input 
                  type="text"
                  placeholder="e.g. Temporary override for machine calibration"
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShiftModalEmployee(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveShiftModal}
                disabled={isSavingShift}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center"
              >
                {isSavingShift ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                Apply Shift Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN OPERATOR MODAL */}
      {assignModalOpen && currentMachine && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Assign Operators: {currentMachine.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Shift: <strong>{currentShift?.[1]}</strong> • Needs: <strong>{currentMachine.pending}</strong> more operator(s)
                </p>
              </div>
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Operator List Search & Filter */}
            <div className="space-y-3 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search available staff..."
                  value={opSearchTerm}
                  onChange={(e) => setOpSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-1 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setOperatorFilterTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold ${operatorFilterTab === 'all' ? 'bg-indigo-100 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  All Available ({availableEmployees.filter(e => !e.isAssigned).length})
                </button>
                <button
                  type="button"
                  onClick={() => setOperatorFilterTab('matching')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold ${operatorFilterTab === 'matching' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Matching Shift ({availableEmployees.filter(e => !e.isAssigned && e.isMatching).length})
                </button>
              </div>

              {/* Operator Selection List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50">
                {filteredAvailableList.map(({ emp, isMatching }) => {
                  const isSelected = selectedAssignEmpIds.includes(emp.id);
                  return (
                    <div 
                      key={emp.id}
                      onClick={() => toggleAssignEmpSelection(emp.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-500' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{emp.name}</div>
                        <div className="text-[11px] text-slate-500">{emp.id} • {emp.department} • {emp.designation}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isMatching ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {emp.currentShift}
                        </span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Selected: <strong>{selectedAssignEmpIds.length}</strong> operator(s)
              </span>
              <div className="flex space-x-2">
                <button 
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleAssignSubmit}
                  disabled={isSubmittingAssign || selectedAssignEmpIds.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center disabled:opacity-50"
                >
                  {isSubmittingAssign ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
