import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Search, Filter, Edit2, Trash2, CheckCircle2, 
  XCircle, AlertTriangle, Shield, Clock, ArrowRight, Copy, RefreshCw, 
  CalendarDays, Sparkles, Building2, Cpu, FileText, History, Check, Info, Loader2,
  ChevronDown, ChevronUp, Download, Eye, Power
} from 'lucide-react';
import { format, parseISO, isValid, getYear } from 'date-fns';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey, ensureSheetExists } from '../../lib/sheets';
import { UserSecurityScope } from '../../lib/security';
import { 
  HolidayRecord, HolidayOverride, HolidayAuditRecord, HolidayTypeConfig, 
  HolidayType, HolidayWorkType, HolidayStatus,
  parseHolidayRow, buildHolidayRow, parseOverrideRow, buildOverrideRow, 
  parseAuditRow, buildAuditRow, DEFAULT_HOLIDAY_TYPES, DEFAULT_2026_HOLIDAYS, 
  getDayName, isWeeklyOff, getNextUpcomingHoliday
} from '../../lib/holidayEngine';
import AdminDeleteConfirmModal from '../common/AdminDeleteConfirmModal';

interface HolidayManagementProps {
  spreadsheetId: string;
  user: any;
  userSecurityScope?: UserSecurityScope;
}

export default function HolidayManagement({ spreadsheetId, user, userSecurityScope }: HolidayManagementProps) {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'overrides' | 'types_policies' | 'audit'>('calendar');
  
  // Data state
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [overrides, setOverrides] = useState<HolidayOverride[]>([]);
  const [auditLogs, setAuditLogs] = useState<HolidayAuditRecord[]>([]);
  const [holidayTypes, setHolidayTypes] = useState<HolidayTypeConfig[]>(DEFAULT_HOLIDAY_TYPES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Year filter
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const availableYears = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterWorkType, setFilterWorkType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayRecord | null>(null);
  const [holidayFormData, setHolidayFormData] = useState<Partial<HolidayRecord>>({
    name: '',
    date: `${selectedYear}-01-01`,
    type: 'Public Holiday',
    workType: 'Non-Working Holiday',
    description: '',
    status: 'Active'
  });

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideFormData, setOverrideFormData] = useState<Partial<HolidayOverride>>({
    date: `${selectedYear}-01-01`,
    holidayName: '',
    department: 'All',
    section: 'All',
    workingHours: 8,
    shift: 'All',
    remarks: '',
    approvedBy: user?.displayName || user?.email || 'Admin'
  });

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'holiday' | 'override';
    data: any;
    title: string;
    details?: string;
  } | null>(null);

  const isAdmin = userSecurityScope?.isAdmin || user?.role?.toLowerCase() === 'admin' || user?.email === 'noor.alam1750@gmail.com';
  const isSupervisor = userSecurityScope?.isSupervisor || user?.role?.toLowerCase() === 'supervisor';
  const canManage = isAdmin || isSupervisor;

  // Load Data
  const loadData = async () => {
    if (!spreadsheetId) return;
    setIsLoading(true);
    try {
      await Promise.all([
        ensureSheetExists(spreadsheetId, 'Holidays', ['Holiday_ID', 'Holiday_Name', 'Holiday_Date', 'Day', 'Holiday_Type', 'Work_Type', 'Description', 'Status', 'Created_By', 'Created_Date', 'Updated_By', 'Updated_Date']),
        ensureSheetExists(spreadsheetId, 'HolidayOverrides', ['Override_ID', 'Holiday_Date', 'Holiday_Name', 'Department', 'Section', 'Working_Hours', 'Shift', 'Remarks', 'Approved_By', 'Created_At']),
        ensureSheetExists(spreadsheetId, 'HolidayAudit', ['Audit_ID', 'Holiday_ID', 'Holiday_Name', 'Action', 'Previous_Value', 'New_Value', 'Changed_By', 'Changed_At', 'Remarks']),
        ensureSheetExists(spreadsheetId, 'HolidayTypes', ['Type_ID', 'Type_Name', 'Description', 'Status']),
        ensureSheetExists(spreadsheetId, 'CalendarSettings', ['Key', 'Value', 'Updated_By', 'Updated_At'])
      ]);

      const [hRaw, oRaw, aRaw, tRaw, cRaw] = await Promise.all([
        getRange(spreadsheetId, 'Holidays').catch(() => []),
        getRange(spreadsheetId, 'HolidayOverrides').catch(() => []),
        getRange(spreadsheetId, 'HolidayAudit').catch(() => []),
        getRange(spreadsheetId, 'HolidayTypes').catch(() => []),
        getRange(spreadsheetId, 'CalendarSettings').catch(() => [])
      ]);

      // Parse Holidays
      let parsedHolidays: HolidayRecord[] = [];
      if (hRaw.length > 1) {
        const rawHolidays = hRaw.slice(1).filter(r => r && r[0]).map((r, i) => parseHolidayRow(r, i));
        // Deduplicate by ID in case of multiple appends
        const seen = new Set();
        parsedHolidays = rawHolidays.filter(h => {
          if (seen.has(h.id)) return false;
          seen.add(h.id);
          return true;
        });
      } else {
        // Seed default 2026 holidays if empty
        const initialRows = DEFAULT_2026_HOLIDAYS.map((h, i) => {
          const rec: HolidayRecord = {
            id: h.id || `HOL-2026-${String(i + 1).padStart(3, '0')}`,
            name: h.name || 'Holiday',
            date: h.date || '2026-01-01',
            day: h.day || getDayName(h.date || '2026-01-01'),
            type: (h.type || 'Public Holiday') as HolidayType,
            workType: (h.workType || 'Non-Working Holiday') as HolidayWorkType,
            description: h.description || '',
            status: 'Active',
            createdBy: 'System Seed',
            createdDate: new Date().toISOString(),
            updatedBy: 'System Seed',
            updatedDate: new Date().toISOString()
          };
          return buildHolidayRow(rec);
        });
        await appendRow(spreadsheetId, 'Holidays', initialRows);
        parsedHolidays = DEFAULT_2026_HOLIDAYS.map((h, i) => ({
          id: h.id || `HOL-2026-${String(i + 1).padStart(3, '0')}`,
          name: h.name || 'Holiday',
          date: h.date || '2026-01-01',
          day: h.day || getDayName(h.date || '2026-01-01'),
          type: (h.type || 'Public Holiday') as HolidayType,
          workType: (h.workType || 'Non-Working Holiday') as HolidayWorkType,
          description: h.description || '',
          status: 'Active',
          createdBy: 'System Seed',
          createdDate: new Date().toISOString(),
          updatedBy: 'System Seed',
          updatedDate: new Date().toISOString()
        }));
      }
      setHolidays(parsedHolidays);

      // Parse Overrides
      if (oRaw.length > 1) {
        const parsedOvr = oRaw.slice(1).filter(r => r && r[0]).map((r, i) => parseOverrideRow(r, i));
        setOverrides(parsedOvr);
      } else {
        setOverrides([]);
      }

      // Parse Audit Logs
      if (aRaw.length > 1) {
        const parsedAudit = aRaw.slice(1).filter(r => r && r[0]).map(r => parseAuditRow(r));
        setAuditLogs(parsedAudit.reverse()); // Newest first
      } else {
        setAuditLogs([]);
      }

      // Parse Types
      if (tRaw.length > 1) {
        const parsedTypes: HolidayTypeConfig[] = tRaw.slice(1).filter(r => r && r[0]).map(r => ({
          id: r[0],
          name: r[1],
          description: r[2] || '',
          status: (r[3] || 'Active') as any
        }));
        setHolidayTypes(parsedTypes.length > 0 ? parsedTypes : DEFAULT_HOLIDAY_TYPES);
      } else {
        setHolidayTypes(DEFAULT_HOLIDAY_TYPES);
      }

      // Parse Settings
    } catch (err) {
      console.error('Error loading Holiday management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.sheetName?.includes('Holiday') || customEvent.detail?.sheetName === 'CalendarSettings') {
        loadData();
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, [spreadsheetId]);

  // Log Audit Action helper
  const logAudit = async (action: HolidayAuditRecord['action'], holidayId: string, holidayName: string, prevVal: string, newVal: string, remarks: string) => {
    try {
      const auditRec: HolidayAuditRecord = {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        holidayId,
        holidayName,
        action,
        previousValue: prevVal,
        newValue: newVal,
        changedBy: user?.displayName || user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        remarks
      };
      await appendRow(spreadsheetId, 'HolidayAudit', [buildAuditRow(auditRec)]);
      setAuditLogs(prev => [auditRec, ...prev]);
    } catch (err) {
      console.error('Failed to append audit record:', err);
    }
  };

  // Filtered Holidays for Selected Year
  const filteredHolidays = useMemo(() => {
    return holidays
      .filter(h => {
        // Year filter
        if (h.date) {
          const y = parseInt(h.date.split('-')[0], 10);
          if (y !== selectedYear) return false;
        }

        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = h.name.toLowerCase().includes(q);
          const matchDesc = (h.description || '').toLowerCase().includes(q);
          const matchDate = h.date.includes(q);
          const matchType = h.type.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchDate && !matchType) return false;
        }

        // Type filter
        if (filterType !== 'All' && h.type !== filterType) return false;

        // Work Type filter
        if (filterWorkType !== 'All' && h.workType !== filterWorkType) return false;

        // Status filter
        if (filterStatus !== 'All' && h.status !== filterStatus) return false;

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [holidays, selectedYear, searchQuery, filterType, filterWorkType, filterStatus, sortOrder]);

  // Year Summary Statistics
  const yearStats = useMemo(() => {
    const yearHolidays = holidays.filter(h => {
      if (!h.date) return false;
      return parseInt(h.date.split('-')[0], 10) === selectedYear;
    });

    const activeHols = yearHolidays.filter(h => h.status === 'Active');
    const nonWorking = activeHols.filter(h => h.workType === 'Non-Working Holiday');
    const workingHols = activeHols.filter(h => h.workType === 'Working Holiday');
    const yearOverrides = overrides.filter(o => o.date && parseInt(o.date.split('-')[0], 10) === selectedYear);

    const upcoming = getNextUpcomingHoliday(holidays);

    return {
      totalHolidays: yearHolidays.length,
      activeCount: activeHols.length,
      nonWorkingCount: nonWorking.length,
      workingCount: workingHols.length,
      overrideCount: yearOverrides.length,
      upcoming
    };
  }, [holidays, overrides, selectedYear]);

  // Save or Update Holiday
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayFormData.name || !holidayFormData.date) {
      alert('Please fill in holiday name and date.');
      return;
    }

    const dateStr = holidayFormData.date;
    const computedDay = getDayName(dateStr);
    const dateYear = parseInt(dateStr.split('-')[0], 10);

    // Duplicate Check
    const duplicate = holidays.find(h => 
      h.date === dateStr && 
      (!editingHoliday || h.id !== editingHoliday.id) &&
      h.name.toLowerCase() === (holidayFormData.name || '').toLowerCase()
    );
    if (duplicate) {
      if (false) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const userName = user?.displayName || user?.email || 'Admin';

      if (editingHoliday) {
        // Update existing
        const updatedRecord: HolidayRecord = {
          ...editingHoliday,
          name: holidayFormData.name || editingHoliday.name,
          date: dateStr,
          day: computedDay,
          type: (holidayFormData.type || editingHoliday.type) as HolidayType,
          workType: (holidayFormData.workType || editingHoliday.workType) as HolidayWorkType,
          description: holidayFormData.description || '',
          status: (holidayFormData.status || editingHoliday.status) as HolidayStatus,
          updatedBy: userName,
          updatedDate: nowIso
        };

        await updateRowByPrimaryKey(
          spreadsheetId,
          'Holidays',
          editingHoliday.id,
          buildHolidayRow(updatedRecord)
        );

        setHolidays(prev => prev.map(h => h.id === editingHoliday.id ? updatedRecord : h));
        await logAudit(
          'Edited',
          updatedRecord.id,
          updatedRecord.name,
          JSON.stringify({ name: editingHoliday.name, date: editingHoliday.date, workType: editingHoliday.workType, status: editingHoliday.status }),
          JSON.stringify({ name: updatedRecord.name, date: updatedRecord.date, workType: updatedRecord.workType, status: updatedRecord.status }),
          'Holiday record updated by user'
        );
      } else {
        // Add new
        const newId = `HOL-${dateYear}-${String(holidays.length + 1).padStart(3, '0')}`;
        const newRecord: HolidayRecord = {
          id: newId,
          name: holidayFormData.name,
          date: dateStr,
          day: computedDay,
          type: (holidayFormData.type || 'Public Holiday') as HolidayType,
          workType: (holidayFormData.workType || 'Non-Working Holiday') as HolidayWorkType,
          description: holidayFormData.description || '',
          status: (holidayFormData.status || 'Active') as HolidayStatus,
          createdBy: userName,
          createdDate: nowIso,
          updatedBy: userName,
          updatedDate: nowIso
        };

        await appendRow(spreadsheetId, 'Holidays', [buildHolidayRow(newRecord)]);
        setHolidays(prev => [...prev, newRecord]);
        await logAudit(
          'Created',
          newRecord.id,
          newRecord.name,
          '',
          JSON.stringify({ name: newRecord.name, date: newRecord.date, type: newRecord.type, workType: newRecord.workType }),
          'New holiday created'
        );
      }

      setShowHolidayModal(false);
      setEditingHoliday(null);
    } catch (err) {
      console.error('Failed to save holiday:', err);
      alert('Failed to save holiday record. Please check database connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Holiday Status
  const handleToggleStatus = async (holiday: HolidayRecord) => {
    if (!canManage) return;
    const newStatus: HolidayStatus = holiday.status === 'Active' ? 'Inactive' : 'Active';
    const nowIso = new Date().toISOString();
    const userName = user?.displayName || user?.email || 'Admin';

    const updated: HolidayRecord = {
      ...holiday,
      status: newStatus,
      updatedBy: userName,
      updatedDate: nowIso
    };

    try {
      await updateRowByPrimaryKey(spreadsheetId, 'Holidays', holiday.id, buildHolidayRow(updated));
      setHolidays(prev => prev.map(h => h.id === holiday.id ? updated : h));
      await logAudit(
        newStatus === 'Active' ? 'Activated' : 'Deactivated',
        holiday.id,
        holiday.name,
        holiday.status,
        newStatus,
        `Status changed to ${newStatus}`
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Error updating holiday status.');
    }
  };

  // Toggle Work Type
  const handleToggleWorkType = async (holiday: HolidayRecord) => {
    if (!canManage) return;
    const newWorkType: HolidayWorkType = holiday.workType === 'Non-Working Holiday' ? 'Working Holiday' : 'Non-Working Holiday';
    const nowIso = new Date().toISOString();
    const userName = user?.displayName || user?.email || 'Admin';

    const updated: HolidayRecord = {
      ...holiday,
      workType: newWorkType,
      updatedBy: userName,
      updatedDate: nowIso
    };

    try {
      await updateRowByPrimaryKey(spreadsheetId, 'Holidays', holiday.id, buildHolidayRow(updated));
      setHolidays(prev => prev.map(h => h.id === holiday.id ? updated : h));
      await logAudit(
        'WorkType Changed',
        holiday.id,
        holiday.name,
        holiday.workType,
        newWorkType,
        `Work classification changed to ${newWorkType}`
      );
    } catch (err) {
      console.error('Failed to toggle work type:', err);
      alert('Error updating holiday working classification.');
    }
  };

  // Delete Holiday (Admin Only)
  const handleDeleteHoliday = (holiday: HolidayRecord) => {
    if (!isAdmin) {
      alert('Only Administrators have permission to delete official holiday records.');
      return;
    }
    setDeleteTarget({
      type: 'holiday',
      data: holiday,
      title: `Holiday: ${holiday.name}`,
      details: `Date: ${holiday.date} (${holiday.day}) | Type: ${holiday.type}`
    });
  };

  // Delete Override
  const handleDeleteOverride = (ovr: HolidayOverride) => {
    if (!canManage) return;
    setDeleteTarget({
      type: 'override',
      data: ovr,
      title: `Working Override: ${ovr.holidayName}`,
      details: `Date: ${ovr.date} | Department: ${ovr.department} | Hours: ${ovr.workingHours}h`
    });
  };

  const handleExecuteConfirmedDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'holiday') {
        const holiday = deleteTarget.data as HolidayRecord;
        await deleteRowByPrimaryKey(spreadsheetId, 'Holidays', holiday.id);
        setHolidays(prev => prev.filter(h => h.id !== holiday.id));
        await logAudit(
          'Deleted',
          holiday.id,
          holiday.name,
          JSON.stringify({ name: holiday.name, date: holiday.date }),
          'DELETED',
          'Holiday permanently deleted by Admin'
        );
      } else if (deleteTarget.type === 'override') {
        const ovr = deleteTarget.data as HolidayOverride;
        await deleteRowByPrimaryKey(spreadsheetId, 'HolidayOverrides', ovr.id);
        setOverrides(prev => prev.filter(o => o.id !== ovr.id));
        await logAudit(
          'Edited',
          ovr.id,
          ovr.holidayName,
          'Active Override',
          'Removed',
          'Working override deleted'
        );
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to execute delete:', err);
      alert('Failed to delete record.');
    }
  };
  const handleCopyYearHolidays = async (fromYear: number) => {
    if (!canManage) return;
    const sourceHolidays = holidays.filter(h => {
      if (!h.date) return false;
      return parseInt(h.date.split('-')[0], 10) === fromYear;
    });

    if (sourceHolidays.length === 0) {
      alert(`No holiday records found in year ${fromYear} to copy from.`);
      return;
    }

    if (false) {
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const userName = user?.displayName || user?.email || 'Admin';
      const newHolidays: HolidayRecord[] = [];
      const newRows: string[][] = [];

      sourceHolidays.forEach((sh, idx) => {
        // Replace year part in date
        const parts = sh.date.split('-');
        const targetDate = `${selectedYear}-${parts[1] || '01'}-${parts[2] || '01'}`;
        const newId = `HOL-${selectedYear}-${String(holidays.length + idx + 1).padStart(3, '0')}`;
        const targetDay = getDayName(targetDate);

        const newRec: HolidayRecord = {
          id: newId,
          name: sh.name,
          date: targetDate,
          day: targetDay,
          type: sh.type,
          workType: sh.workType,
          description: sh.description ? `${sh.description} (Copied from ${fromYear})` : `Copied from ${fromYear}`,
          status: 'Active',
          createdBy: userName,
          createdDate: nowIso,
          updatedBy: userName,
          updatedDate: nowIso
        };
        newHolidays.push(newRec);
        newRows.push(buildHolidayRow(newRec));
      });

      await appendRow(spreadsheetId, 'Holidays', newRows);
      setHolidays(prev => [...prev, ...newHolidays]);
      await logAudit(
        'Created',
        `BATCH-${selectedYear}`,
        `${selectedYear} Annual Calendar Batch`,
        '',
        `Imported ${newHolidays.length} holidays from ${fromYear}`,
        `Batch copied ${newHolidays.length} calendar entries`
      );
      alert(`Successfully imported ${newHolidays.length} holidays into ${selectedYear}!`);
    } catch (err) {
      console.error('Failed to batch copy holidays:', err);
      alert('Error copying holidays.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Working Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideFormData.date || !overrideFormData.holidayName) {
      alert('Please provide holiday date and name.');
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const newOvr: HolidayOverride = {
        id: `OVR-${Date.now()}`,
        date: overrideFormData.date,
        holidayName: overrideFormData.holidayName,
        department: overrideFormData.department || 'All',
        section: overrideFormData.section || 'All',
        workingHours: Number(overrideFormData.workingHours) || 8,
        shift: overrideFormData.shift || 'All',
        remarks: overrideFormData.remarks || '',
        approvedBy: overrideFormData.approvedBy || user?.displayName || user?.email || 'Admin',
        createdAt: nowIso
      };

      await appendRow(spreadsheetId, 'HolidayOverrides', [buildOverrideRow(newOvr)]);
      setOverrides(prev => [...prev, newOvr]);
      await logAudit(
        'Override Added',
        newOvr.id,
        newOvr.holidayName,
        '',
        JSON.stringify({ date: newOvr.date, dept: newOvr.department, hours: newOvr.workingHours }),
        `Working override authorized for ${newOvr.department} by ${newOvr.approvedBy}`
      );

      setShowOverrideModal(false);
    } catch (err) {
      console.error('Failed to save override:', err);
      alert('Error saving working override.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Custom Holiday Type
  const handleAddHolidayType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const newId = `HT-${String(holidayTypes.length + 1).padStart(2, '0')}`;
    const newType: HolidayTypeConfig = {
      id: newId,
      name: newTypeName.trim(),
      description: newTypeDesc.trim() || 'Custom Holiday Category',
      isCustom: true,
      status: 'Active'
    };

    try {
      await appendRow(spreadsheetId, 'HolidayTypes', [[newType.id, newType.name, newType.description, newType.status]]);
      setHolidayTypes(prev => [...prev, newType]);
      setShowTypeModal(false);
      setNewTypeName('');
      setNewTypeDesc('');
    } catch (err) {
      console.error('Failed to save holiday type:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-white border border-[#E6E9ED] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-gradient-to-br from-[#337AB7] to-[#204d74] text-white rounded-xl shadow-sm">
              <CalendarDays className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800">
                  Official Holiday & Working Calendar Management
                </h1>
                <span className="bg-blue-50 text-[#337AB7] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Company Source of Truth
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-3xl">
                Centralized master registry for public holidays, corporate leaves, and working exceptions. 
                Synchronizes across Shift Rosters (Saturday–Thursday) and Machine Capacity calculations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Selector */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
              <span className="text-xs font-semibold text-gray-500 px-2 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-[#337AB7]" /> Year:
              </span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-white text-xs font-bold text-gray-800 border border-gray-200 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y} Calendar</option>
                ))}
              </select>
            </div>

            {canManage && (
              <button
                onClick={() => {
                  setEditingHoliday(null);
                  setHolidayFormData({
                    name: '',
                    date: `${selectedYear}-01-01`,
                    type: 'Public Holiday',
                    workType: 'Non-Working Holiday',
                    description: '',
                    status: 'Active'
                  });
                  setShowHolidayModal(true);
                }}
                className="px-4 py-2 bg-[#337AB7] text-white text-xs font-bold rounded-lg hover:bg-[#286090] flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Holiday
              </button>
            )}

            {canManage && (
              <button
                onClick={() => {
                  setOverrideFormData({
                    date: `${selectedYear}-01-01`,
                    holidayName: '',
                    department: 'All',
                    section: 'All',
                    workingHours: 8,
                    shift: 'All',
                    remarks: '',
                    approvedBy: user?.displayName || user?.email || 'Admin'
                  });
                  setShowOverrideModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Add Working Override
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5 pt-4 border-t border-gray-100">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total {selectedYear} Holidays</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-800">{yearStats.totalHolidays}</span>
              <span className="text-[10px] text-slate-400 font-medium">{yearStats.activeCount} Active</span>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Non-Working Holidays</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-rose-800">{yearStats.nonWorkingCount}</span>
              <span className="text-[10px] text-rose-500 font-medium">Capacity Deducted</span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Working Holidays</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-emerald-800">{yearStats.workingCount}</span>
              <span className="text-[10px] text-emerald-600 font-medium">Normal Working</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Working Overrides</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-amber-800">{yearStats.overrideCount}</span>
              <span className="text-[10px] text-amber-600 font-medium">Dept Overrides</span>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 col-span-2 sm:col-span-3 lg:col-span-1">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">Next Upcoming Holiday</span>
            <div className="mt-1 truncate">
              {yearStats.upcoming ? (
                <div>
                  <span className="text-xs font-bold text-indigo-900 truncate block">
                    {yearStats.upcoming.holiday.name}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-medium">
                    {format(parseISO(yearStats.upcoming.holiday.date), 'dd-MMM-yyyy')} (in {yearStats.upcoming.daysRemaining} days)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-400">No upcoming holidays</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-2 bg-white px-3 pt-2 rounded-t-lg border-t border-x border-[#E6E9ED]">
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'calendar'
              ? 'border-[#337AB7] text-[#337AB7]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Holiday Master Calendar ({filteredHolidays.length})
        </button>

        <button
          onClick={() => setActiveSubTab('overrides')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'overrides'
              ? 'border-[#337AB7] text-[#337AB7]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Working Overrides / Exceptions ({overrides.length})
        </button>

        <button
          onClick={() => setActiveSubTab('types_policies')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'types_policies'
              ? 'border-[#337AB7] text-[#337AB7]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Holiday Types
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'audit'
              ? 'border-[#337AB7] text-[#337AB7]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          Audit History ({auditLogs.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white border border-[#E6E9ED] rounded-b-xl shadow-sm">
          <Loader2 className="w-8 h-8 text-[#337AB7] animate-spin" />
        </div>
      ) : activeSubTab === 'calendar' ? (
        /* TAB 1: HOLIDAY CALENDAR LIST */
        <div className="bg-white border border-[#E6E9ED] rounded-b-xl shadow-sm overflow-hidden p-5 space-y-4">
          {/* Action Toolbar & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search holiday name, date, remarks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                />
              </div>

              {/* Holiday Type Filter */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-white text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
              >
                <option value="All">All Types</option>
                {holidayTypes.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>

              {/* Work Type Filter */}
              <select
                value={filterWorkType}
                onChange={e => setFilterWorkType(e.target.value)}
                className="bg-white text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
              >
                <option value="All">All Work Classifications</option>
                <option value="Non-Working Holiday">Non-Working Holiday</option>
                <option value="Working Holiday">Working Holiday</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-white text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
              >
                <option value="All">All Status</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>

            {/* Batch / Helper tools */}
            <div className="flex items-center gap-2">
              {canManage && (
                <button
                  onClick={() => handleCopyYearHolidays(selectedYear - 1)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-100 flex items-center gap-1 shadow-2xs transition-colors"
                  title={`Copy all holidays from ${selectedYear - 1} into ${selectedYear}`}
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  Import from {selectedYear - 1}
                </button>
              )}
            </div>
          </div>

          {/* Holiday Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Holiday ID</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Holiday Name</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Date & Day</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Holiday Type</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Work Classification</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Description / Remarks</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-xs">
                      No holidays found for {selectedYear} matching your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map(h => {
                    const isFriday = isWeeklyOff(h.date);
                    const matchingOverride = overrides.find(o => o.date === h.date);

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-medium text-gray-500">
                          {h.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-900">{h.name}</span>
                            {matchingOverride && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                Working Override
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-800 font-semibold flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-[#337AB7]" />
                            {h.date ? format(parseISO(h.date), 'dd-MMM-yyyy') : '-'}
                          </div>
                          <span className={`text-[10px] font-medium ${isFriday ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                            {h.day || getDayName(h.date)} {isFriday ? '(Weekly Off Day)' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            h.type === 'Public Holiday' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            h.type === 'Festival Holiday' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            h.type === 'Company Holiday' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                            h.type === 'Emergency Holiday' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {h.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            disabled={!canManage}
                            onClick={() => handleToggleWorkType(h)}
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                              h.workType === 'Working Holiday'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                            }`}
                            title="Click to toggle between Working / Non-Working Holiday"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${h.workType === 'Working Holiday' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {h.workType}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                          {h.description || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            disabled={!canManage}
                            onClick={() => handleToggleStatus(h)}
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              h.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }`}
                            title="Click to toggle Active / Inactive"
                          >
                            {h.status === 'Active' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-gray-400" />}
                            {h.status}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManage && (
                              <button
                                onClick={() => {
                                  setEditingHoliday(h);
                                  setHolidayFormData({
                                    name: h.name,
                                    date: h.date,
                                    type: h.type,
                                    workType: h.workType,
                                    description: h.description,
                                    status: h.status
                                  });
                                  setShowHolidayModal(true);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit Holiday"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {canManage && (
                              <button
                                onClick={() => {
                                  setOverrideFormData({
                                    date: h.date,
                                    holidayName: h.name,
                                    department: 'All',
                                    section: 'All',
                                    workingHours: 8,
                                    shift: 'All',
                                    remarks: `Special production run on ${h.name}`,
                                    approvedBy: user?.displayName || user?.email || 'Admin'
                                  });
                                  setShowOverrideModal(true);
                                }}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Add Working Override for this date"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteHoliday(h)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="Delete Holiday (Admin Only)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
      ) : activeSubTab === 'overrides' ? (
        /* TAB 2: WORKING OVERRIDES / EXCEPTIONS */
        <div className="bg-white border border-[#E6E9ED] rounded-b-xl shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Departmental Working Overrides & Exception Schedules
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Designate production working hours for specific departments or machines on official holidays to preserve planned machine capacity.
              </p>
            </div>

            {canManage && (
              <button
                onClick={() => {
                  setOverrideFormData({
                    date: `${selectedYear}-01-01`,
                    holidayName: '',
                    department: 'All',
                    section: 'All',
                    workingHours: 8,
                    shift: 'All',
                    remarks: '',
                    approvedBy: user?.displayName || user?.email || 'Admin'
                  });
                  setShowOverrideModal(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Working Override
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Override ID</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Date & Holiday</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Applicable Dept</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Section / Floor</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Working Hours</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Shift</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Approved By</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {overrides.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-xs">
                      No working overrides configured. All official holidays will follow their default non-working capacity rules.
                    </td>
                  </tr>
                ) : (
                  overrides.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono font-medium text-gray-500">{o.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-gray-900">{o.holidayName || 'Holiday Override'}</div>
                        <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-emerald-600" />
                          {o.date ? format(parseISO(o.date), 'dd-MMM-yyyy (EEEE)') : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                          {o.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{o.section}</td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700">{o.workingHours} Hours</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{o.shift}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{o.approvedBy}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{o.remarks || '-'}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        {canManage && (
                          <button
                            onClick={() => handleDeleteOverride(o)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Override"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === 'types_policies' ? (
        /* TAB 3: TYPES & POLICIES */
        <div className="bg-white border border-[#E6E9ED] rounded-b-xl shadow-sm p-5 space-y-6">
          {/* Holiday Types Master Section */}
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Master Holiday Types Registry</h3>
                <p className="text-xs text-gray-500">Configurable holiday types for corporate categorization.</p>
              </div>
              {canManage && (
                <button
                  onClick={() => setShowTypeModal(true)}
                  className="px-3 py-1.5 bg-[#337AB7] text-white text-xs font-bold rounded-md hover:bg-[#286090] flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Type
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
              {holidayTypes.map(t => (
                <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{t.name}</span>
                      <span className="text-[10px] font-mono text-gray-400">{t.id}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                    </span>
                    {t.isCustom && <span className="text-gray-400 text-[10px]">Custom Type</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 4: AUDIT HISTORY */
        <div className="bg-white border border-[#E6E9ED] rounded-b-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <History className="w-4 h-4 text-[#337AB7]" />
                Holiday Audit & Modification History
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time chronological audit trail of all holiday creations, edits, activations, deactivations, and working overrides.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
              {auditLogs.length} Events Recorded
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Holiday / Record</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Changed By</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Details / Previous → New</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-xs">
                      No audit history recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {a.changedAt ? format(parseISO(a.changedAt), 'dd-MMM-yyyy HH:mm:ss') : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                          a.action === 'Created' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          a.action === 'Edited' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          a.action === 'Deleted' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          a.action === 'Override Added' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {a.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">
                        {a.holidayName} <span className="text-gray-400 font-normal">({a.holidayId})</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {a.changedBy}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-sm truncate font-mono">
                        {a.newValue || a.previousValue || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                        {a.remarks || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT HOLIDAY */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#337AB7]" />
                {editingHoliday ? 'Edit Official Holiday' : `Add New Holiday for ${selectedYear}`}
              </h2>
              <button 
                onClick={() => setShowHolidayModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Holiday Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence & National Day"
                  value={holidayFormData.name || ''}
                  onChange={e => setHolidayFormData({ ...holidayFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Holiday Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayFormData.date || ''}
                    onChange={e => setHolidayFormData({ ...holidayFormData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                  />
                  {holidayFormData.date && (
                    <span className="text-[10px] text-gray-500 font-medium mt-0.5 block">
                      Day: {getDayName(holidayFormData.date)} {isWeeklyOff(holidayFormData.date) ? '(Friday - Weekly Off)' : ''}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Holiday Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={holidayFormData.type || 'Public Holiday'}
                    onChange={e => setHolidayFormData({ ...holidayFormData, type: e.target.value as HolidayType })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                  >
                    {holidayTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Work Classification <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={holidayFormData.workType || 'Non-Working Holiday'}
                    onChange={e => setHolidayFormData({ ...holidayFormData, workType: e.target.value as HolidayWorkType })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                  >
                    <option value="Non-Working Holiday">Non-Working Holiday (Deducts Capacity)</option>
                    <option value="Working Holiday">Working Holiday (Standard Production Day)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={holidayFormData.status || 'Active'}
                    onChange={e => setHolidayFormData({ ...holidayFormData, status: e.target.value as HolidayStatus })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional details, gazette notification notes, or shift planning remarks..."
                  value={holidayFormData.description || ''}
                  onChange={e => setHolidayFormData({ ...holidayFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#337AB7] text-white text-xs font-bold rounded-md hover:bg-[#286090] flex items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingHoliday ? 'Save Changes' : 'Create Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD WORKING OVERRIDE */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                Schedule Working Override / Exception
              </h2>
              <button 
                onClick={() => setShowOverrideModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Override Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={overrideFormData.date || ''}
                    onChange={e => {
                      const matchHol = holidays.find(h => h.date === e.target.value);
                      setOverrideFormData({ 
                        ...overrideFormData, 
                        date: e.target.value,
                        holidayName: matchHol ? matchHol.name : overrideFormData.holidayName
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Holiday Name / Occasion <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independence Day Override"
                    value={overrideFormData.holidayName || ''}
                    onChange={e => setOverrideFormData({ ...overrideFormData, holidayName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Applicable Department
                  </label>
                  <select
                    value={overrideFormData.department || 'All'}
                    onChange={e => setOverrideFormData({ ...overrideFormData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="All">All Departments</option>
                    <option value="Cutting">Cutting</option>
                    <option value="Sewing">Sewing</option>
                    <option value="Finishing">Finishing</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="RFID">RFID</option>
                    <option value="Woven">Woven</option>
                    <option value="Offset">Offset</option>
                    <option value="PFL">PFL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Section / Machine Unit
                  </label>
                  <input
                    type="text"
                    placeholder="All or specific machine (e.g. Auto Cutter)"
                    value={overrideFormData.section || 'All'}
                    onChange={e => setOverrideFormData({ ...overrideFormData, section: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Working Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={overrideFormData.workingHours || 8}
                    onChange={e => setOverrideFormData({ ...overrideFormData, workingHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Shift
                  </label>
                  <select
                    value={overrideFormData.shift || 'All'}
                    onChange={e => setOverrideFormData({ ...overrideFormData, shift: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="All">All Shifts</option>
                    <option value="Day Shift">Day Shift</option>
                    <option value="Night Shift">Night Shift</option>
                    <option value="Both Shift">Both Shifts</option>
                    <option value="General">General Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Approved By
                </label>
                <input
                  type="text"
                  value={overrideFormData.approvedBy || ''}
                  onChange={e => setOverrideFormData({ ...overrideFormData, approvedBy: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Remarks / Reason for Working on Holiday
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Critical buyer export order deadline, urgent preventative maintenance..."
                  value={overrideFormData.remarks || ''}
                  onChange={e => setOverrideFormData({ ...overrideFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Authorize Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM HOLIDAY TYPE */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#337AB7]" />
                Add Custom Holiday Type
              </h2>
              <button 
                onClick={() => setShowTypeModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHolidayType} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Founder Memorial Day"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief definition and guidelines for this holiday category..."
                  value={newTypeDesc}
                  onChange={e => setNewTypeDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#337AB7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#337AB7] text-white text-xs font-bold rounded-md hover:bg-[#286090] flex items-center gap-1.5"
                >
                  Save Holiday Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Password Protected Deletion Modal */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'holiday' ? 'Delete Official Holiday' : 'Delete Working Override'}
        itemName={deleteTarget?.title}
        itemDetails={deleteTarget?.details}
        warningMessage={
          deleteTarget?.type === 'holiday'
            ? 'Deleting this holiday record will affect working day calculations and attendance schedules. Enter the Admin Deletion Password to confirm.'
            : 'Deleting this department working override will restore standard holiday off-rules for this date. Enter the Admin Deletion Password to confirm.'
        }
        confirmButtonText={deleteTarget?.type === 'holiday' ? 'Verify & Delete Holiday' : 'Verify & Delete Override'}
        onConfirm={handleExecuteConfirmedDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

