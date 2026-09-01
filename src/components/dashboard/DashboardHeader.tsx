import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, RefreshCw, Clock, ShieldCheck, UserCheck, 
  Sparkles, Filter, ChevronDown, Check, Building2, UserCircle2, Layers,
  Printer, LayoutDashboard, Users, Wrench, CheckSquare, Target, Activity,
  Database, Shield, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { DashboardDateFilter, DashboardExecutiveTab } from './types';
import { UserSecurityScope } from '../../lib/security';
import { getErpName } from '../../lib/appSettings';
import { resolvePaletteForModule } from '../../lib/colorPalettes';

interface DashboardHeaderProps {
  userSecurityScope?: UserSecurityScope;
  user?: any;
  dateFilter: DashboardDateFilter;
  setDateFilter: (filter: DashboardDateFilter) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  dateRangeLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  lastUpdated: Date;
  onNavigate?: (tab: string) => void;
  activeExecutiveTab: DashboardExecutiveTab;
  setActiveExecutiveTab: (tab: DashboardExecutiveTab) => void;
  onOpenBriefing: () => void;
  alertCount: number;
}

export default function DashboardHeader({
  userSecurityScope,
  user,
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  dateRangeLabel,
  isRefreshing,
  onRefresh,
  lastUpdated,
  onNavigate,
  activeExecutiveTab,
  setActiveExecutiveTab,
  onOpenBriefing,
  alertCount
}: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setCurrentTime(format(new Date(), 'EEEE, dd MMM yyyy • hh:mm:ss a'));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const filterOptions: { id: DashboardDateFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'prev_month', label: 'Previous Month' },
    { id: 'this_quarter', label: 'This Quarter' },
    { id: 'this_year', label: 'This Year' },
    { id: 'all', label: 'All Records' },
    { id: 'custom', label: 'Custom Range...' }
  ];

  const executiveTabs: { id: DashboardExecutiveTab; label: string; icon: any; countBadge?: number }[] = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'workforce', label: 'Workforce & HR', icon: Users },
    { id: 'manufacturing', label: 'Plant & Manufacturing', icon: Wrench },
    { id: 'tasks', label: 'Tasks & Operations', icon: CheckSquare, countBadge: alertCount > 0 ? alertCount : undefined },
    { id: 'kpi', label: 'Quality & KPI', icon: Target },
    { id: 'activity', label: 'Audit Timeline', icon: Activity }
  ];

  const displayName = userSecurityScope?.employeeName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const roleTitle = userSecurityScope?.isAdmin 
    ? 'System Administrator' 
    : userSecurityScope?.isSuperuser 
    ? 'Superuser' 
    : userSecurityScope?.isSupervisor 
    ? 'Department Supervisor' 
    : userSecurityScope?.role || 'Operations Staff';

  const department = userSecurityScope?.assignedDepartment || 'Enterprise Operations';

  // Get User initials for avatar
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'OP';

  const palette = resolvePaletteForModule('dashboard');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6 transition-all">
      {/* Top Cockpit Header Bar */}
      <div 
        className="p-5 md:p-6 text-white transition-colors duration-300"
        style={{
          background: `linear-gradient(135deg, ${palette.primaryHex} 0%, #111C30 50%, #0F172A 100%)`
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Brand & System Status */}
          <div className="flex items-start gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white font-bold shrink-0 ring-4 ring-white/10"
              style={{
                background: `linear-gradient(135deg, ${palette.primaryHex}, ${palette.secondaryHex})`,
                boxShadow: palette.glowShadow
              }}
            >
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span 
                  className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: `${palette.secondaryHex}25`,
                    color: palette.secondaryHex,
                    borderColor: `${palette.secondaryHex}40`
                  }}
                >
                  {getErpName().toUpperCase()} Control Center
                </span>
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700 text-[11px] text-slate-300 font-medium">
                  <span 
                    className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ backgroundColor: palette.secondaryHex }}
                  />
                  <span>Live Database: <strong>Connected</strong></span>
                </div>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Operations & Management Control Center
              </h1>
              <p className="text-slate-300 text-xs md:text-sm mt-0.5 leading-relaxed">
                Unified real-time operational telemetry across manufacturing lines, tasks, staffing, and compliance.
              </p>
            </div>
          </div>

          {/* User Profile & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 lg:self-center">
            {/* User Details Pill */}
            <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700/80 rounded-xl p-2.5 px-3.5 backdrop-blur-sm">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${palette.primaryHex}, #263BAA)`
                }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                    {displayName}
                  </span>
                  {userSecurityScope?.employeeId && (
                    <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-medium">
                      {userSecurityScope.employeeId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300 mt-0.5">
                  <span 
                    className="font-semibold"
                    style={{ color: userSecurityScope?.isAdmin ? '#FB7185' : palette.secondaryHex }}
                  >
                    {roleTitle}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{department}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenBriefing}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer hover:opacity-90 active:scale-95 group"
                style={{
                  backgroundColor: palette.secondaryHex,
                  color: palette.primaryHex
                }}
                title="Generate and print executive briefing report"
              >
                <Printer className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-125 group-hover-icon-anim" />
                <span className="whitespace-nowrap font-black">Briefing Report</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer group"
                title="Synchronize live records from Google Sheets database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'text-slate-400 group-hover:rotate-180 transition-transform duration-500'}`} style={isRefreshing ? { color: palette.secondaryHex } : undefined} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Clock & Last Updated Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime || 'Synchronizing system clock...'}</span>
          </div>
          <div className="text-[11px] font-medium text-slate-300">
            Last Synced: <strong className="font-mono text-white">{format(lastUpdated, 'hh:mm:ss a')}</strong>
          </div>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="px-5 md:px-6 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar">
          {executiveTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeExecutiveTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveExecutiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none cursor-pointer group ${
                  isActive
                    ? 'shadow-sm border'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
                style={isActive ? {
                  backgroundColor: palette.primaryHex,
                  color: palette.secondaryHex,
                  borderColor: palette.primaryHex
                } : undefined}
              >
                <Icon className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-125 group-hover-icon-anim ${isActive ? '' : 'text-slate-400'}`} style={isActive ? { color: palette.secondaryHex } : undefined} />
                <span>{tab.label}</span>
                {tab.countBadge !== undefined && (
                  <span 
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-black text-slate-900"
                    style={{ backgroundColor: palette.secondaryHex }}
                  >
                    {tab.countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Scope & Active Filters Bar */}
      <div className="p-4 md:px-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Date Scope:
          </span>

          {/* Quick preset filter buttons */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/70">
            {(['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'all'] as DashboardDateFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  dateFilter === f 
                    ? 'bg-white text-slate-900 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f === 'today' ? 'Today' : f === 'this_week' ? 'This Week' : f === 'this_month' ? 'This Month' : f === 'this_quarter' ? 'Quarter' : f === 'this_year' ? 'Year' : 'All'}
              </button>
            ))}
          </div>

          {/* Dropdown for other options / custom */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <span>{filterOptions.find(o => o.id === dateFilter)?.label || 'More...'}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {isFilterDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsFilterDropdownOpen(false)} 
                />
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                  {filterOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setDateFilter(option.id);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        dateFilter === option.id 
                          ? 'bg-emerald-50 text-emerald-700 font-bold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{option.label}</span>
                      {dateFilter === option.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 p-1 rounded-lg border border-slate-200">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs"
              />
              <span className="text-slate-400 font-medium">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs"
              />
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Active Period: <strong className="text-slate-900 font-semibold">{dateRangeLabel}</strong></span>
        </div>
      </div>
    </div>
  );
}

