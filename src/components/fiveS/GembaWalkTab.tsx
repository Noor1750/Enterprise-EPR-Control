import React, { useState, useMemo, useEffect } from 'react';
import { 
  Eye, Plus, Search, Filter, Sparkles, Download, Printer, 
  AlertTriangle, ShieldAlert, CheckCircle, CheckCircle2, Clock, Calendar, 
  MapPin, User, Camera, ArrowUpDown, ArrowRight, HelpCircle,
  Maximize2, Sliders, Check, RefreshCw, Trash2, Edit, ExternalLink,
  ChevronRight, AlertCircle, FileSpreadsheet, Layers, Bell, X,
  UserX, PhoneOff, Users
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { 
  GembaWalkItem, 
  GembaCategory, 
  GembaSeverity, 
  GembaStatus,
  GEMBA_CATEGORIES,
  dispatchGembaAssignmentNotification
} from '../../lib/gembaWalkEngine';
import GembaWalkModal from './GembaWalkModal';
import GembaPhotoComparisonModal from './GembaPhotoComparisonModal';
import GembaFiveWhyModal from './GembaFiveWhyModal';
import GembaAuditorScheduleBanner from './GembaAuditorScheduleBanner';
import GembaWeeklyRosterModal from './GembaWeeklyRosterModal';
import GembaConductWalkModal from './GembaConductWalkModal';
import GembaScheduleSettingsModal from './GembaScheduleSettingsModal';
import { 
  GembaScheduleConfig, 
  GembaWalkSession, 
  getLocalGembaScheduleConfig, 
  getLocalGembaSessions, 
  saveLocalGembaScheduleConfig,
  saveLocalGembaSessions,
  evaluateGembaWalkDate,
  getOverdueGembaWalks
} from '../../lib/gembaAuditorScheduleEngine';
import { 
  HolidayRecord, 
  fetchHolidayCalendarData 
} from '../../lib/holidayEngine';
import { format, isAfter, parseISO } from 'date-fns';

interface GembaWalkTabProps {
  items: GembaWalkItem[];
  employees: Employee[];
  spreadsheetId?: string;
  onSaveItem: (item: GembaWalkItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  currentUserEmail?: string;
  currentUserName?: string;
  canEdit?: boolean;
}

// Smart Safe Photo Thumbnail with fallback to prevent broken [?] boxes
function SafeGembaPhotoThumbnail({
  src,
  alt,
  onClick,
  borderColor = 'border-slate-200'
}: {
  src?: string;
  alt: string;
  onClick?: () => void;
  borderColor?: string;
}) {
  const [hasError, setHasError] = useState<boolean>(false);

  if (!src) {
    return (
      <div className="w-16 h-12 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 mx-auto select-none shadow-2xs">
        <Camera className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-3xs font-semibold mt-0.5 text-slate-400">No Photo</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative group w-16 h-12 rounded-xl overflow-hidden border ${borderColor} bg-slate-100 mx-auto cursor-pointer shadow-2xs hover:scale-105 hover:ring-2 hover:ring-rose-500/40 transition`}
      title="Click to view & compare"
    >
      {hasError ? (
        <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-1 text-slate-500">
          <Camera className="w-4 h-4 text-slate-400" />
          <span className="text-3xs font-bold text-slate-600 mt-0.5">Finding</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
        <Maximize2 className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

export default function GembaWalkTab({
  items,
  employees,
  spreadsheetId,
  onSaveItem,
  onDeleteItem,
  currentUserEmail,
  currentUserName,
  canEdit = true
}: GembaWalkTabProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'pipeline' | 'critical' | 'overdue' | 'not-contacted' | 'resolved' | 'photo'>('all');
  // Smart Task Scope: Default to 'pending' tasks only (Resolved & Verified Closed hidden from default view)
  const [taskViewScope, setTaskViewScope] = useState<'pending' | 'closed' | 'all'>('pending');

  // Daily Auditor Schedule State
  const [scheduleConfig, setScheduleConfig] = useState<GembaScheduleConfig>(() => getLocalGembaScheduleConfig());
  const [sessions, setSessions] = useState<GembaWalkSession[]>(() => getLocalGembaSessions());
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);

  // Auditor Schedule Modals State
  const [isConductModalOpen, setIsConductModalOpen] = useState<boolean>(false);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [conductTargetDate, setConductTargetDate] = useState<string>(todayStr);
  const [isWeeklyRosterOpen, setIsWeeklyRosterOpen] = useState<boolean>(false);
  const [isScheduleSettingsOpen, setIsScheduleSettingsOpen] = useState<boolean>(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<GembaWalkItem | null>(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [photoModalItem, setPhotoModalItem] = useState<GembaWalkItem | null>(null);

  const [isFiveWhyModalOpen, setIsFiveWhyModalOpen] = useState<boolean>(false);
  const [fiveWhyModalItem, setFiveWhyModalItem] = useState<GembaWalkItem | null>(null);

  // Real-time assignment notification feedback toast
  const [assignmentToast, setAssignmentToast] = useState<{
    show: boolean;
    responsible: string;
    responsibleId?: string;
    location: string;
    targetDate: string;
  } | null>(null);

  // Fetch Central Holidays & Listen to Schedule updates
  useEffect(() => {
    fetchHolidayCalendarData(spreadsheetId)
      .then(res => {
        if (res.holidays && res.holidays.length > 0) {
          setHolidays(res.holidays);
        }
      })
      .catch(err => console.warn('Holidays calendar load fallback:', err));

    const handleScheduleUpdated = (e: any) => {
      if (e.detail) setScheduleConfig(e.detail);
    };
    const handleSessionsUpdated = (e: any) => {
      if (Array.isArray(e.detail)) setSessions(e.detail);
    };

    window.addEventListener('erp-gemba-schedule-updated', handleScheduleUpdated);
    window.addEventListener('erp-gemba-sessions-updated', handleSessionsUpdated);

    return () => {
      window.removeEventListener('erp-gemba-schedule-updated', handleScheduleUpdated);
      window.removeEventListener('erp-gemba-sessions-updated', handleSessionsUpdated);
    };
  }, [spreadsheetId]);

  useEffect(() => {
    const handleAssignmentDispatched = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setAssignmentToast({
          show: true,
          responsible: detail.responsible,
          responsibleId: detail.responsibleId,
          location: detail.item?.locationAsset || '',
          targetDate: detail.targetDate || ''
        });
        const timer = setTimeout(() => {
          setAssignmentToast(prev => prev ? { ...prev, show: false } : null);
        }, 6000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('erp-gemba-assignment-dispatched', handleAssignmentDispatched);
    return () => {
      window.removeEventListener('erp-gemba-assignment-dispatched', handleAssignmentDispatched);
    };
  }, []);

  // Save finding and ensure assignment notification is dispatched
  const handleSaveWithNotification = async (item: GembaWalkItem) => {
    await onSaveItem(item);
    if (item.responsible) {
      dispatchGembaAssignmentNotification(item, currentUserEmail, currentUserName);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = items.length;
    const open = items.filter(i => i.status === 'Open').length;
    const inProgress = items.filter(i => i.status === 'In Progress').length;
    const resolved = items.filter(i => i.status === 'Resolved' || i.status === 'Verified & Closed').length;
    
    const overdue = items.filter(i => {
      if (i.status === 'Resolved' || i.status === 'Verified & Closed') return false;
      return i.targetDate && i.targetDate < todayStr;
    }).length;

    // Items that have not been contacted or assigned, or are past due
    const notContacted = items.filter(i => {
      if (i.status === 'Resolved' || i.status === 'Verified & Closed') return false;
      const unassigned = !i.responsible || i.responsible.toLowerCase() === 'unassigned';
      const noAction = !i.immediateAction || i.immediateAction.trim() === '' || i.immediateAction.toLowerCase().includes('pending') || i.immediateAction.toLowerCase().includes('not contacted');
      const isPastTarget = Boolean(i.targetDate && i.targetDate < todayStr);
      return unassigned || noAction || isPastTarget;
    }).length;

    const criticalHigh = items.filter(i => i.severity === 'Critical' || i.severity === 'High').length;
    const withAfterPhoto = items.filter(i => Boolean(i.afterPhoto)).length;
    
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const photoCompletionRate = total > 0 ? Math.round((withAfterPhoto / total) * 100) : 0;

    return {
      total,
      open,
      inProgress,
      resolved,
      overdue,
      notContacted,
      criticalHigh,
      withAfterPhoto,
      resolutionRate,
      photoCompletionRate
    };
  }, [items, todayStr]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Smart Task View Scope (Default is 'pending' - resolved & verified closed hidden by default)
      if (taskViewScope === 'pending') {
        if (item.status === 'Resolved' || item.status === 'Verified & Closed') return false;
      } else if (taskViewScope === 'closed') {
        if (item.status !== 'Resolved' && item.status !== 'Verified & Closed') return false;
      }

      // Quick filter tabs
      if (quickFilter === 'pipeline') {
        if (item.status === 'Resolved' || item.status === 'Verified & Closed') return false;
      } else if (quickFilter === 'critical') {
        if (item.severity !== 'Critical' && item.severity !== 'High') return false;
      } else if (quickFilter === 'overdue') {
        if (item.status === 'Resolved' || item.status === 'Verified & Closed') return false;
        if (!item.targetDate || item.targetDate >= todayStr) return false;
      } else if (quickFilter === 'not-contacted') {
        if (item.status === 'Resolved' || item.status === 'Verified & Closed') return false;
        const unassigned = !item.responsible || item.responsible.toLowerCase() === 'unassigned';
        const noAction = !item.immediateAction || item.immediateAction.trim() === '' || item.immediateAction.toLowerCase().includes('pending') || item.immediateAction.toLowerCase().includes('not contacted');
        const isPastTarget = Boolean(item.targetDate && item.targetDate < todayStr);
        if (!unassigned && !noAction && !isPastTarget) return false;
      } else if (quickFilter === 'resolved') {
        if (item.status !== 'Resolved' && item.status !== 'Verified & Closed') return false;
      } else if (quickFilter === 'photo') {
        if (!item.afterPhoto) return false;
      }

      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      // Severity filter
      if (severityFilter !== 'All' && item.severity !== severityFilter) return false;
      // Status filter
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      // Overdue filter
      if (onlyOverdue) {
        if (item.status === 'Resolved' || item.status === 'Verified & Closed') return false;
        if (!item.targetDate || item.targetDate >= todayStr) return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchLoc = item.locationAsset.toLowerCase().includes(term);
        const matchObs = item.observationFinding.toLowerCase().includes(term);
        const matchRoot = (item.rootCause || '').toLowerCase().includes(term);
        const matchResp = (item.responsible || '').toLowerCase().includes(term);
        const matchAct = (item.immediateAction || '').toLowerCase().includes(term);
        const matchId = item.id.toLowerCase().includes(term);
        if (!matchLoc && !matchObs && !matchRoot && !matchResp && !matchAct && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [items, taskViewScope, quickFilter, categoryFilter, severityFilter, statusFilter, onlyOverdue, searchTerm, todayStr]);

  // Clear all filters
  const handleClearAllFilters = () => {
    setTaskViewScope('pending');
    setQuickFilter('all');
    setSearchTerm('');
    setCategoryFilter('All');
    setSeverityFilter('All');
    setStatusFilter('All');
    setOnlyOverdue(false);
  };

  const hasActiveFilters = taskViewScope !== 'pending' || quickFilter !== 'all' || searchTerm.trim() !== '' || categoryFilter !== 'All' || severityFilter !== 'All' || statusFilter !== 'All' || onlyOverdue;

  // Quick Status Toggle directly from table
  const handleQuickStatusChange = async (item: GembaWalkItem, newStatus: GembaStatus) => {
    const updated: GembaWalkItem = {
      ...item,
      status: newStatus,
      closureDate: (newStatus === 'Resolved' || newStatus === 'Verified & Closed') ? (item.closureDate || todayStr) : undefined,
      closedBy: (newStatus === 'Resolved' || newStatus === 'Verified & Closed') ? (currentUserName || 'Gemba Lead') : undefined,
      updatedAt: new Date().toISOString()
    };
    await onSaveItem(updated);
  };

  // Export to CSV matching the 13 columns
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert('No Gemba Walk items to export.');
      return;
    }

    const headers = [
      'Date',
      'Location / Asset',
      'Picture (before) URL',
      'Observation / Finding',
      'Category',
      'Risk / Impact',
      'Severity',
      'Root Cause (5-Why hint)',
      'Immediate Action Taken/Status',
      'Responsible',
      'Target Date',
      'Picture (after) URL',
      'Status'
    ];

    const rows = filteredItems.map(item => [
      `"${item.date || ''}"`,
      `"${(item.locationAsset || '').replace(/"/g, '""')}"`,
      `"${(item.beforePhoto || '').replace(/"/g, '""')}"`,
      `"${(item.observationFinding || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.riskImpact || '').replace(/"/g, '""')}"`,
      `"${item.severity || ''}"`,
      `"${(item.rootCause || '').replace(/"/g, '""')}"`,
      `"${(item.immediateAction || '').replace(/"/g, '""')}"`,
      `"${(item.responsible || '').replace(/"/g, '""')}"`,
      `"${item.targetDate || ''}"`,
      `"${(item.afterPhoto || '').replace(/"/g, '""')}"`,
      `"${item.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gemba_Walk_Audit_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Gemba Walk Report Sheet
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 bg-white p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-xs font-sans text-slate-900">
      
      {/* Top Banner & Title */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F87C6C] to-rose-600 text-white flex items-center justify-center shadow-md ring-4 ring-rose-500/20 shrink-0">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-950 tracking-tight">
                Gemba Walk & Visual Floor Audits
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                13-Point Smart Sheet
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Shop-floor observations, smart 5-Why root cause hints, before/after photographic proof, and assigned countermeasures.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200/80 shadow-2xs cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200/80 shadow-2xs cursor-pointer"
            title="Print Gemba Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#F87C6C] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Log Gemba Finding</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Auditors Schedule & Floor Status Banner */}
      <GembaAuditorScheduleBanner
        config={scheduleConfig}
        items={items}
        sessions={sessions}
        holidays={holidays}
        onOpenConductModal={(targetDate) => {
          setConductTargetDate(targetDate || todayStr);
          setIsConductModalOpen(true);
        }}
        onOpenWeeklyRoster={() => setIsWeeklyRosterOpen(true)}
        onOpenSettingsModal={() => setIsScheduleSettingsOpen(true)}
        canEdit={canEdit}
      />

      {/* Interactive Smart KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Findings */}
        <button
          type="button"
          onClick={() => {
            setTaskViewScope('all');
            setQuickFilter('all');
          }}
          className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
            taskViewScope === 'all' && quickFilter === 'all'
              ? 'bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className="text-2xs font-extrabold text-slate-600 uppercase tracking-wider block">Total Findings</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-950">{stats.total}</span>
            <span className="text-xs text-slate-500 font-bold">Recorded</span>
          </div>
        </button>

        {/* Actionable (Open & In Progress) */}
        <button
          type="button"
          onClick={() => {
            setTaskViewScope('pending');
            setQuickFilter('pipeline');
          }}
          className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
            taskViewScope === 'pending' && quickFilter === 'pipeline'
              ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-amber-200/80 hover:border-amber-400 hover:shadow-xs'
          }`}
        >
          <span className="text-2xs font-extrabold text-amber-800 uppercase tracking-wider block">In Pipeline</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-700">{stats.open + stats.inProgress}</span>
            <span className="text-2xs font-bold text-amber-900">{stats.open} Open • {stats.inProgress} Prog</span>
          </div>
        </button>

        {/* Critical & High */}
        <button
          type="button"
          onClick={() => {
            setTaskViewScope('pending');
            setQuickFilter('critical');
          }}
          className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
            taskViewScope === 'pending' && quickFilter === 'critical'
              ? 'bg-rose-50/40 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-rose-200/80 hover:border-rose-400 hover:shadow-xs'
          }`}
        >
          <span className="text-2xs font-extrabold text-rose-800 uppercase tracking-wider block">High & Critical</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-700">{stats.criticalHigh}</span>
            <span className="text-2xs text-rose-700 font-black">Priority</span>
          </div>
        </button>

        {/* Overdue */}
        <button
          type="button"
          onClick={() => {
            setTaskViewScope('pending');
            setQuickFilter('overdue');
          }}
          className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
            taskViewScope === 'pending' && quickFilter === 'overdue'
              ? 'bg-red-50/40 border-red-500 ring-2 ring-red-500/20 shadow-xs'
              : 'bg-white border-red-200/80 hover:border-red-400 hover:shadow-xs'
          }`}
        >
          <span className="text-2xs font-extrabold text-red-800 uppercase tracking-wider block">Overdue SLA</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-red-700">{stats.overdue}</span>
            <span className="text-2xs text-red-700 font-bold">{stats.overdue > 0 ? 'Needs Action' : 'On Track'}</span>
          </div>
        </button>

        {/* Resolved & Closed */}
        <button
          type="button"
          onClick={() => {
            setTaskViewScope('closed');
            setQuickFilter('all');
          }}
          className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
            taskViewScope === 'closed'
              ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-emerald-200/80 hover:border-emerald-400 hover:shadow-xs'
          }`}
        >
          <span className="text-2xs font-extrabold text-emerald-800 uppercase tracking-wider block">Resolved Rate</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700">{stats.resolutionRate}%</span>
            <span className="text-2xs text-emerald-800 font-bold">{stats.resolved} Closed</span>
          </div>
        </button>

        {/* Before / After Documented */}
        <button
          type="button"
          onClick={() => {
            setQuickFilter(quickFilter === 'photo' ? 'all' : 'photo');
          }}
          className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
            quickFilter === 'photo'
              ? 'bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-blue-200/80 hover:border-blue-400 hover:shadow-xs'
          }`}
        >
          <span className="text-2xs font-extrabold text-blue-800 uppercase tracking-wider block">Photo Closed</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-700">{stats.photoCompletionRate}%</span>
            <span className="text-2xs text-blue-800 font-bold">{stats.withAfterPhoto}/{stats.total}</span>
          </div>
        </button>
      </div>

      {/* Smart White Navigator Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        {/* Top Row: Smart Scope Selector (Pending Tasks Only vs Closed Archive vs All) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              View Scope:
            </span>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              {/* 1. Pending Tasks Only (Default Smart Mode) */}
              <button
                type="button"
                onClick={() => {
                  setTaskViewScope('pending');
                  if (statusFilter === 'Resolved' || statusFilter === 'Verified & Closed') setStatusFilter('All');
                  if (quickFilter === 'resolved') setQuickFilter('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  taskViewScope === 'pending'
                    ? 'bg-white text-rose-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Pending Tasks Only</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-800 font-black border border-rose-200">
                  {stats.open + stats.inProgress}
                </span>
              </button>

              {/* 2. Resolved & Verified Closed Archive */}
              <button
                type="button"
                onClick={() => {
                  setTaskViewScope('closed');
                  if (statusFilter === 'Open' || statusFilter === 'In Progress') setStatusFilter('All');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  taskViewScope === 'closed'
                    ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Resolved & Closed</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-black border border-emerald-200">
                  {stats.resolved}
                </span>
              </button>

              {/* 3. All Tasks */}
              <button
                type="button"
                onClick={() => setTaskViewScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  taskViewScope === 'all'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All Tasks</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                  {stats.total}
                </span>
              </button>
            </div>
          </div>

          {/* Active Results Summary */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">
              Showing <span className="font-black text-slate-950">{filteredItems.length}</span> {taskViewScope === 'pending' ? 'pending tasks' : taskViewScope === 'closed' ? 'resolved tasks' : 'tasks'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Navigator Pill Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 mr-1 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-[#F87C6C]" />
              Filter By:
            </span>

            {/* All in current scope */}
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                quickFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{taskViewScope === 'pending' ? 'All Pending' : taskViewScope === 'closed' ? 'All Resolved' : 'All'}</span>
              <span className={`text-2xs px-1.5 py-0.2 rounded-md ${
                quickFilter === 'all' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {taskViewScope === 'pending' ? stats.open + stats.inProgress : taskViewScope === 'closed' ? stats.resolved : stats.total}
              </span>
            </button>

            {/* In Pipeline (Only relevant if not in closed-only view) */}
            {taskViewScope !== 'closed' && (
              <button
                type="button"
                onClick={() => setQuickFilter('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  quickFilter === 'pipeline'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
                }`}
              >
                <span>Pipeline</span>
                <span className={`text-2xs px-1.5 py-0.2 rounded-md ${
                  quickFilter === 'pipeline' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-950'
                }`}>
                  {stats.open + stats.inProgress}
                </span>
              </button>
            )}

            {/* Critical & High */}
            <button
              type="button"
              onClick={() => setQuickFilter('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                quickFilter === 'critical'
                  ? 'bg-gradient-to-r from-[#F87C6C] to-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-900 border border-rose-200/80 hover:bg-rose-100'
              }`}
            >
              <span>Critical / High</span>
              <span className={`text-2xs px-1.5 py-0.2 rounded-md ${
                quickFilter === 'critical' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-950'
              }`}>
                {stats.criticalHigh}
              </span>
            </button>

            {/* Overdue SLA */}
            {taskViewScope !== 'closed' && (
              <button
                type="button"
                onClick={() => setQuickFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  quickFilter === 'overdue'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-900 border border-red-200/80 hover:bg-red-100'
                }`}
              >
                <span>Overdue SLA</span>
                <span className={`text-2xs px-1.5 py-0.2 rounded-md ${
                  quickFilter === 'overdue' ? 'bg-red-700 text-white' : 'bg-red-200 text-red-950'
                }`}>
                  {stats.overdue}
                </span>
              </button>
            )}

            {/* Not Contacted / Overdue */}
            {taskViewScope !== 'closed' && (
              <button
                type="button"
                onClick={() => setQuickFilter('not-contacted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  quickFilter === 'not-contacted'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-900 border border-rose-200/80 hover:bg-rose-100'
                }`}
                title="Show open findings with unassigned or uncontacted actions, or past target date"
              >
                <PhoneOff className="w-3 h-3 text-rose-600" />
                <span>Not Contacted / Overdue</span>
                <span className={`text-2xs px-1.5 py-0.2 rounded-md ${
                  quickFilter === 'not-contacted' ? 'bg-rose-900 text-white font-black' : 'bg-rose-200 text-rose-950 font-black'
                }`}>
                  {stats.notContacted}
                </span>
              </button>
            )}

            {/* Photo Proof */}
            <button
              type="button"
              onClick={() => setQuickFilter('photo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                quickFilter === 'photo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-900 border border-blue-200/80 hover:bg-blue-100'
              }`}
            >
              <span>With Photo</span>
              <span className={`text-2xs px-1.5 py-0.2 rounded-md ${
                quickFilter === 'photo' ? 'bg-blue-700 text-white' : 'bg-blue-200 text-blue-950'
              }`}>
                {stats.withAfterPhoto}
              </span>
            </button>
          </div>
        </div>

        {/* Detailed Search & Filter Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Location, Asset, Finding, Root Cause, Responsible..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-medium transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
              <Filter className="w-3.5 h-3.5 text-[#F87C6C]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-950 focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Categories</option>
                {GEMBA_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-950 focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status Dropdown - Smartly aware of taskViewScope */}
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                if (val === 'Resolved' || val === 'Verified & Closed') {
                  setTaskViewScope('closed');
                } else if (val === 'Open' || val === 'In Progress') {
                  if (taskViewScope === 'closed') {
                    setTaskViewScope('pending');
                  }
                }
              }}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-950 focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
            >
              {taskViewScope === 'pending' ? (
                <>
                  <option value="All">All Pending Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved (Switch to Archive)</option>
                  <option value="Verified & Closed">Verified & Closed (Switch to Archive)</option>
                </>
              ) : taskViewScope === 'closed' ? (
                <>
                  <option value="All">All Resolved Statuses</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Verified & Closed">Verified & Closed</option>
                  <option value="Open">Open (Switch to Pending)</option>
                  <option value="In Progress">In Progress (Switch to Pending)</option>
                </>
              ) : (
                <>
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Verified & Closed">Verified & Closed</option>
                </>
              )}
            </select>

            {/* Overdue Checkbox */}
            {taskViewScope !== 'closed' && (
              <label className="flex items-center gap-1.5 text-xs text-rose-800 font-bold cursor-pointer px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 transition">
                <input
                  type="checkbox"
                  checked={onlyOverdue}
                  onChange={(e) => setOnlyOverdue(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 accent-rose-600"
                />
                <span>Overdue Only</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* 13-Point Gemba Walk Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Smart Context Banner above Table */}
        {taskViewScope === 'pending' ? (
          <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50/40 border-b border-amber-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-950 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                <strong className="font-black text-amber-900">Active Pending Floor View:</strong> Displaying <strong>{filteredItems.length} active findings</strong> requiring action. Resolved and closed findings are hidden.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTaskViewScope('closed');
                setQuickFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>View Resolved Archive ({stats.resolved})</span>
            </button>
          </div>
        ) : taskViewScope === 'closed' ? (
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong className="font-black text-emerald-900">Resolved & Closed Archive:</strong> Showing completed & verified findings ({filteredItems.length} records).
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTaskViewScope('pending');
                setQuickFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-rose-700 shadow-2xs cursor-pointer transition"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Back to Pending Tasks ({stats.open + stats.inProgress})</span>
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header with high-contrast distinct background */}
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-2xs uppercase tracking-wider font-black divide-x divide-slate-200 border-b-2 border-slate-300 shadow-2xs">
                <th className="py-3.5 px-3 min-w-[100px]">Date</th>
                <th className="py-3.5 px-3 min-w-[160px]">Location / Asset</th>
                <th className="py-3.5 px-3 min-w-[105px] text-center">Picture (before)</th>
                <th className="py-3.5 px-4 min-w-[210px]">Observation / Finding</th>
                <th className="py-3.5 px-3 min-w-[135px]">Category</th>
                <th className="py-3.5 px-3 min-w-[160px]">Risk / Impact</th>
                <th className="py-3.5 px-2.5 min-w-[95px] text-center">Severity</th>
                <th className="py-3.5 px-3 min-w-[190px]">Root Cause (5-Why hint)</th>
                <th className="py-3.5 px-3 min-w-[190px]">Immediate Action Taken/Status</th>
                <th className="py-3.5 px-3 min-w-[130px]">Responsible</th>
                <th className="py-3.5 px-3 min-w-[110px]">Target Date</th>
                <th className="py-3.5 px-3 min-w-[105px] text-center">Picture (after)</th>
                <th className="py-3.5 px-3 min-w-[130px] text-center">Status</th>
                <th className="py-3.5 px-2.5 min-w-[75px] text-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 text-slate-900 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500 bg-white">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-bold text-slate-900">No Gemba Walk findings found</p>
                    <p className="text-2xs text-slate-500 mt-1">Try adjusting your filters or log a new Gemba Walk finding above.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isOverdue = item.targetDate && item.targetDate < todayStr && item.status !== 'Resolved' && item.status !== 'Verified & Closed';
                  const catMeta = GEMBA_CATEGORIES.find(c => c.id === item.category);

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-sky-50/50 transition divide-x divide-slate-200 border-b border-slate-200/80 ${isOverdue ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'bg-white'}`}
                    >
                      {/* 1. Date */}
                      <td className="py-3.5 px-3 font-black text-slate-950 whitespace-nowrap text-xs">
                        {item.date}
                        <span className="block text-3xs text-slate-600 font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded mt-1 w-fit">
                          {item.id}
                        </span>
                      </td>

                      {/* 2. Location / Asset */}
                      <td className="py-3.5 px-3 font-bold text-slate-950">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span className="leading-snug text-xs">{item.locationAsset}</span>
                        </div>
                      </td>

                      {/* 3. Picture (before) */}
                      <td className="py-3.5 px-3 text-center">
                        <SafeGembaPhotoThumbnail
                          src={item.beforePhoto}
                          alt="Before Finding"
                          borderColor="border-slate-200"
                          onClick={() => {
                            setPhotoModalItem(item);
                            setIsPhotoModalOpen(true);
                          }}
                        />
                      </td>

                      {/* 4. Observation / Finding */}
                      <td className="py-3.5 px-4">
                        <p className="line-clamp-3 leading-relaxed text-slate-900 text-xs font-medium">
                          {item.observationFinding}
                        </p>
                      </td>

                      {/* 5. Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-2xs font-extrabold border ${catMeta?.badgeClass || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                          {item.category}
                        </span>
                      </td>

                      {/* 6. Risk / Impact */}
                      <td className="py-3.5 px-3 text-slate-700">
                        <p className="line-clamp-2 leading-relaxed text-xs font-medium">
                          {item.riskImpact}
                        </p>
                      </td>

                      {/* 7. Severity */}
                      <td className="py-3.5 px-2.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-2xs font-black shadow-xs ${
                          item.severity === 'Critical'
                            ? 'bg-rose-600 text-white'
                            : item.severity === 'High'
                            ? 'bg-orange-500 text-white'
                            : item.severity === 'Medium'
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {item.severity}
                        </span>
                      </td>

                      {/* 8. Root Cause (5-Why hint) */}
                      <td className="py-3.5 px-3">
                        <div 
                          onClick={() => {
                            setFiveWhyModalItem(item);
                            setIsFiveWhyModalOpen(true);
                          }}
                          className="group cursor-pointer p-2.5 rounded-xl bg-purple-50/80 hover:bg-purple-100 transition border border-purple-200 shadow-2xs"
                          title="Click to view full 5-Why analysis ladder"
                        >
                          <div className="flex items-center gap-1 text-purple-900 font-black text-2xs mb-1">
                            <HelpCircle className="w-3.5 h-3.5 text-purple-700" />
                            <span>5-Why Ladder</span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                          <p className="line-clamp-2 text-slate-800 italic text-2xs leading-snug font-medium">
                            "{item.rootCause || 'Click to run 5-Why root cause analysis'}"
                          </p>
                        </div>
                      </td>

                      {/* 9. Immediate Action Taken/Status */}
                      <td className="py-3.5 px-3 text-slate-800">
                        <p className="line-clamp-3 leading-relaxed text-xs font-medium">
                          {item.immediateAction}
                        </p>
                      </td>

                      {/* 10. Responsible */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                            {item.responsible.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-950 block truncate max-w-[130px] text-xs">
                              {item.responsible}
                            </span>
                            {item.responsibleId && (
                              <span className="text-3xs text-blue-700 block font-mono font-bold">{item.responsibleId}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 11. Target Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`font-bold text-xs ${isOverdue ? 'text-rose-700 font-black' : 'text-slate-950'}`}>
                          {item.targetDate}
                        </span>
                        {isOverdue && (
                          <span className="block text-3xs font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded mt-1 items-center gap-1 w-fit">
                            <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5 text-rose-600" /> OVERDUE
                          </span>
                        )}
                      </td>

                      {/* 12. Picture (after) */}
                      <td className="py-3.5 px-3 text-center">
                        {item.afterPhoto ? (
                          <SafeGembaPhotoThumbnail
                            src={item.afterPhoto}
                            alt="After Resolution"
                            borderColor="border-emerald-300"
                            onClick={() => {
                              setPhotoModalItem(item);
                              setIsPhotoModalOpen(true);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-3xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            + Add After
                          </button>
                        )}
                      </td>

                      {/* 13. Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(item, e.target.value as GembaStatus)}
                          disabled={!canEdit}
                          className={`px-2.5 py-1 text-2xs font-extrabold rounded-lg border focus:outline-hidden transition shadow-2xs cursor-pointer ${
                            item.status === 'Verified & Closed'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black'
                              : item.status === 'Resolved'
                              ? 'bg-blue-50 text-blue-900 border-blue-300 font-black'
                              : item.status === 'In Progress'
                              ? 'bg-amber-50 text-amber-950 border-amber-300 font-black'
                              : 'bg-slate-100 text-slate-900 border-slate-300 font-black'
                          }`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Verified & Closed">Verified & Closed</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Edit Finding"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPhotoModalItem(item);
                              setIsPhotoModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Compare Before vs After"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete Gemba Walk finding "${item.id}"?`)) {
                                onDeleteItem(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>
            Showing <strong className="text-slate-900 font-bold">{filteredItems.length}</strong> of <strong className="text-slate-900 font-bold">{items.length}</strong> Gemba Walk records
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-700 font-semibold">Critical / High</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span>
            <span className="text-slate-700 font-semibold">Medium</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ml-2"></span>
            <span className="text-slate-700 font-semibold">Low</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GembaWalkModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveWithNotification}
        employees={employees}
        initialItem={editingItem}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
      />

      <GembaPhotoComparisonModal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setPhotoModalItem(null);
        }}
        item={photoModalItem}
      />

      <GembaFiveWhyModal
        isOpen={isFiveWhyModalOpen}
        onClose={() => {
          setIsFiveWhyModalOpen(false);
          setFiveWhyModalItem(null);
        }}
        item={fiveWhyModalItem}
        onUpdateItem={handleSaveWithNotification}
      />

      {/* Gemba Walk Conduct Sign-Off Modal */}
      <GembaConductWalkModal
        isOpen={isConductModalOpen}
        onClose={() => setIsConductModalOpen(false)}
        onSuccess={(session) => {
          setSessions(prev => [...prev.filter(s => s.date !== session.date), session]);
        }}
        targetDate={conductTargetDate}
        employees={employees}
        spreadsheetId={spreadsheetId}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
      />

      {/* Gemba 7-Day Weekly Auditor Rotation Roster Modal */}
      <GembaWeeklyRosterModal
        isOpen={isWeeklyRosterOpen}
        onClose={() => setIsWeeklyRosterOpen(false)}
        config={scheduleConfig}
        items={items}
        sessions={sessions}
        holidays={holidays}
        onOpenConductModal={(targetDate) => {
          setConductTargetDate(targetDate);
          setIsConductModalOpen(true);
        }}
        onOpenSettingsModal={() => setIsScheduleSettingsOpen(true)}
        canEdit={canEdit}
      />

      {/* Gemba Schedule & Roster Settings Modal */}
      <GembaScheduleSettingsModal
        isOpen={isScheduleSettingsOpen}
        onClose={() => setIsScheduleSettingsOpen(false)}
        config={scheduleConfig}
        onSaveConfig={(updated) => setScheduleConfig(updated)}
        employees={employees}
      />

      {/* Real-time assignment notification toast */}
      {assignmentToast && assignmentToast.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-rose-500/40 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F87C6C] to-rose-600 flex items-center justify-center shrink-0 shadow-xs ring-2 ring-rose-500/30">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-300 uppercase tracking-wider">Assignment Notification Sent</span>
              <button 
                onClick={() => setAssignmentToast(null)} 
                className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-bold text-white mt-0.5">
              Assigned to <span className="text-[#F87C6C] font-black">{assignmentToast.responsible}</span> {assignmentToast.responsibleId ? `(${assignmentToast.responsibleId})` : ''}
            </p>
            <p className="text-2xs text-slate-300 mt-0.5">
              Location: {assignmentToast.location} • Due: {assignmentToast.targetDate}
            </p>
            <p className="text-3xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
              ✓ In-app inbox alert, audio chime & cross-tab notification dispatched immediately.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
