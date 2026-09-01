import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, Calendar, Heart, Sparkles, Search, Filter, Download, 
  Users, PartyPopper, ChevronRight, Clock, Star, Gift, CheckCircle2,
  Building, LayoutGrid, List, RefreshCw, Cake, Send, Copy, Phone,
  Smile, Trophy, Bell, Share2, Check, X
} from 'lucide-react';
import { getRange } from '../../lib/sheets';
import { 
  computeAllCelebrations, 
  CelebrationRecord, 
  CelebrationType 
} from '../../lib/anniversaryEngine';
import { UserSecurityScope } from '../../lib/security';
import { resolvePaletteForModule } from '../../lib/colorPalettes';
import * as XLSX from 'xlsx';

interface WorkAnniversariesProps {
  spreadsheetId: string;
  userSecurityScope?: UserSecurityScope;
  onNavigate?: (tab: string, extra?: any) => void;
}

type TimeframeTab = 'all' | 'today' | 'week' | 'month' | 'milestones';
type CategoryFilter = 'all' | 'birthday' | 'anniversary';

export default function WorkAnniversaries({ spreadsheetId }: WorkAnniversariesProps) {
  const [employeesRaw, setEmployeesRaw] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeTab>('all');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Wishes / Greetings Modal State
  const [selectedCelebration, setSelectedCelebration] = useState<CelebrationRecord | null>(null);
  const [customWishMessage, setCustomWishMessage] = useState('');
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});
  const [copiedWish, setCopiedWish] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const palette = resolvePaletteForModule('practices');

  const loadData = async (initial = false) => {
    if (initial) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const raw = await getRange(spreadsheetId, 'Employees!A2:Z');
      setEmployeesRaw(raw || []);
    } catch (err) {
      console.error('Failed to load employee records for celebrations:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [spreadsheetId]);

  // Map raw employee rows into celebration inputs
  // Note: Celebrations are company-wide so all active staff are included for full cultural engagement
  const allCelebrations = useMemo(() => {
    const mapped = employeesRaw.map(row => ({
      id: row[0] || '',
      name: row[1] || '',
      designation: row[2] || '',
      department: row[3] || '',
      dateOfJoin: row[4] || '',
      category: row[5] || 'Non-Management',
      status: row[9] || 'Active',
      phone: row[11] || '',
      profilePicture: row[16] || '',
      dateOfBirth: row[21] || ''
    }));

    return computeAllCelebrations(mapped);
  }, [employeesRaw]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    allCelebrations.forEach(c => { if (c.department) set.add(c.department); });
    return ['All', ...Array.from(set).sort()];
  }, [allCelebrations]);

  // Aggregate Counts for Summary Dashboard
  const metrics = useMemo(() => {
    const todayBirthdays = allCelebrations.filter(c => c.type === 'birthday' && c.isToday).length;
    const todayAnniversaries = allCelebrations.filter(c => c.type === 'anniversary' && c.isToday).length;
    const totalToday = todayBirthdays + todayAnniversaries;

    const thisWeek = allCelebrations.filter(c => c.isThisWeek || (c.daysUntil >= 0 && c.daysUntil <= 7)).length;
    const thisMonth = allCelebrations.filter(c => c.isThisMonth || (c.daysUntil >= 0 && c.daysUntil <= 30)).length;
    
    const totalBirthdays = allCelebrations.filter(c => c.type === 'birthday').length;
    const totalAnniversaries = allCelebrations.filter(c => c.type === 'anniversary').length;
    const milestoneCount = allCelebrations.filter(c => c.isMilestone).length;

    return {
      totalToday,
      todayBirthdays,
      todayAnniversaries,
      thisWeek,
      thisMonth,
      totalBirthdays,
      totalAnniversaries,
      milestoneCount,
      total: allCelebrations.length
    };
  }, [allCelebrations]);

  // Filtered Celebrations List
  const filteredCelebrations = useMemo(() => {
    return allCelebrations.filter(item => {
      // Category filter (All / Birthday / Anniversary)
      if (activeCategory !== 'all' && item.type !== activeCategory) {
        return false;
      }

      // Timeframe tab
      if (activeTimeframe === 'today' && !item.isToday) return false;
      if (activeTimeframe === 'week' && !(item.isThisWeek || (item.daysUntil >= 0 && item.daysUntil <= 7))) return false;
      if (activeTimeframe === 'month' && !(item.isThisMonth || (item.daysUntil >= 0 && item.daysUntil <= 30))) return false;
      if (activeTimeframe === 'milestones' && !item.isMilestone) return false;

      // Department filter
      if (deptFilter !== 'All' && item.department !== deptFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.employeeName.toLowerCase().includes(q) ||
               item.employeeId.toLowerCase().includes(q) ||
               item.designation.toLowerCase().includes(q) ||
               item.department.toLowerCase().includes(q);
      }

      return true;
    });
  }, [allCelebrations, activeCategory, activeTimeframe, deptFilter, search]);

  // Open Wish Modal with standard tailored template
  const handleOpenWishModal = (celebration: CelebrationRecord) => {
    setSelectedCelebration(celebration);
    setCopiedWish(false);

    if (celebration.type === 'birthday') {
      setCustomWishMessage(`🎉 Happy Birthday ${celebration.employeeName}! 🎂 Wishing you a wonderful year ahead filled with joy, health, and great success! 🎈✨`);
    } else {
      setCustomWishMessage(`🏆 Happy ${celebration.yearsCount}th Work Anniversary, ${celebration.employeeName}! 🌟 Thank you for your dedication, hard work, and outstanding contributions to our team! 👏🎊`);
    }
  };

  const handleSendWish = () => {
    if (!selectedCelebration) return;
    setWishedMap(prev => ({ ...prev, [selectedCelebration.id]: true }));
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setSelectedCelebration(null);
    }, 1200);
  };

  const handleCopyWish = () => {
    navigator.clipboard.writeText(customWishMessage);
    setCopiedWish(true);
    setTimeout(() => setCopiedWish(false), 2500);
  };

  const handleExportExcel = () => {
    const rows = filteredCelebrations.map(c => ({
      'Celebration Type': c.type === 'birthday' ? 'Birthday' : 'Work Anniversary',
      'Employee ID': c.employeeId,
      'Employee Name': c.employeeName,
      'Department': c.department,
      'Designation': c.designation,
      'Event Date': c.celebrationDisplayDate,
      'Original Date': c.originalDateFormatted,
      'Metric / Milestone': c.metricLabel,
      'Days Remaining': c.isToday ? 'TODAY!' : `${c.daysUntil} days`,
      'Contact Phone': c.phone || 'N/A',
      'Is Key Milestone': c.isMilestone ? 'Yes' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Celebrations & Milestones');
    XLSX.writeFile(wb, `Company_Birthdays_and_Anniversaries_${new Date().getFullYear()}.xlsx`);
  };

  return (
    <div className="space-y-5 p-3 sm:p-5 max-w-[1550px] mx-auto animate-in fade-in duration-200">
      
      {/* Top Celebrations Hero Banner */}
      <div 
        className="rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{
          background: `linear-gradient(135deg, ${palette.primaryHex}, #1E1B4B 60%, #0F172A 100%)`
        }}
      >
        {/* Glow decorative spheres */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/30 to-pink-500/30 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
            <PartyPopper className="w-7 h-7 animate-bounce" style={{ animationDuration: '2.5s' }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Birthdays & Work Anniversaries
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Company Celebrations
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl">
              Celebrating team birthdays and honoring years of dedicated service. Visible to all team members across the organization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 self-stretch md:self-auto justify-end">
          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition border border-white/10 cursor-pointer backdrop-blur-xs"
            title="Refresh Celebrations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Today's Celebrations */}
        <div 
          onClick={() => { setActiveTimeframe('today'); setActiveCategory('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTimeframe === 'today' 
              ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-white border-amber-400 ring-2 ring-amber-400/30' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Today's Stars
            </span>
            <PartyPopper className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.totalToday}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
            <span>🎂 {metrics.todayBirthdays} Birthdays</span>
            <span>•</span>
            <span>🏆 {metrics.todayAnniversaries} Anniv.</span>
          </div>
        </div>

        {/* This Week */}
        <div 
          onClick={() => { setActiveTimeframe('week'); setActiveCategory('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTimeframe === 'week' 
              ? 'bg-indigo-500/10 border-indigo-400 ring-2 ring-indigo-400/20' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">This Week</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.thisWeek}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Upcoming in next 7 days</div>
        </div>

        {/* This Month */}
        <div 
          onClick={() => { setActiveTimeframe('month'); setActiveCategory('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTimeframe === 'month' 
              ? 'bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400/20' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">This Month</span>
            <Cake className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.thisMonth}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Current month cohort</div>
        </div>

        {/* Key Milestones */}
        <div 
          onClick={() => { setActiveTimeframe('milestones'); setActiveCategory('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTimeframe === 'milestones' 
              ? 'bg-purple-500/10 border-purple-400 ring-2 ring-purple-400/20' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Key Milestones</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.milestoneCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">1, 3, 5, 10+ Yr Service & Milestone Ages</div>
        </div>
      </div>

      {/* Main Container: Category Filter Pills, Timeframe Tabs, Search & List */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        
        {/* Category Switcher: All Celebrations vs Birthdays vs Work Anniversaries */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PartyPopper className="w-3.5 h-3.5 text-amber-500" />
              <span>All Celebrations</span>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-200/80 text-[10px] font-mono">
                {metrics.total}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('birthday')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeCategory === 'birthday'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cake className="w-3.5 h-3.5" />
              <span>🎂 Birthdays</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${activeCategory === 'birthday' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
                {metrics.totalBirthdays}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('anniversary')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeCategory === 'anniversary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>🏆 Work Anniversaries</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${activeCategory === 'anniversary' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
                {metrics.totalAnniversaries}
              </span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'cards' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              title="Cards Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'table' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeframe Tabs and Filter Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Upcoming' },
              { id: 'today', label: "Today's Celebrations" },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'milestones', label: 'Key Milestones' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTimeframe(tab.id as TimeframeTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTimeframe === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search and Department Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff name, ID, title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <span>Calculating live company birthdays and anniversary cycles...</span>
          </div>
        ) : filteredCelebrations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <PartyPopper className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Celebrations Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No employee matches the selected celebration type, timeframe, or department filter.
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
            {filteredCelebrations.map(item => {
              const isWished = wishedMap[item.id];
              const isBirthday = item.type === 'birthday';

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    item.isToday
                      ? isBirthday
                        ? 'bg-gradient-to-br from-rose-50 via-pink-50/60 to-white border-rose-300 ring-2 ring-rose-400/30 shadow-md'
                        : 'bg-gradient-to-br from-amber-50 via-orange-50/60 to-white border-amber-300 ring-2 ring-amber-400/30 shadow-md'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Top Celebration Banner if Today */}
                  {item.isToday && (
                    <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-xl shadow-xs flex items-center gap-1 uppercase tracking-wider ${
                      isBirthday ? 'bg-gradient-to-l from-rose-500 to-pink-500' : 'bg-gradient-to-l from-amber-500 to-orange-500'
                    }`}>
                      <Sparkles className="w-3 h-3" /> Celebrating Today!
                    </div>
                  )}

                  <div>
                    {/* Header: Avatar, Name, Type Pill */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base overflow-hidden shrink-0 shadow-sm border ${
                          isBirthday 
                            ? 'bg-gradient-to-br from-rose-600 to-pink-600 text-white border-rose-200' 
                            : 'bg-gradient-to-br from-indigo-700 to-slate-900 text-white border-indigo-200'
                        }`}>
                          {item.profilePicture ? (
                            <img src={item.profilePicture} alt={item.employeeName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{item.employeeName.charAt(0) || 'U'}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 line-clamp-1">{item.employeeName}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-slate-500">{item.employeeId}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] font-medium text-slate-600">{item.department}</span>
                          </div>
                        </div>
                      </div>

                      {/* Event Type Badge */}
                      <div className={`px-2.5 py-1 rounded-xl text-center shrink-0 border ${
                        isBirthday
                          ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider">
                          {isBirthday ? <Cake className="w-3 h-3 text-rose-500" /> : <Trophy className="w-3 h-3 text-indigo-500" />}
                          <span>{isBirthday ? 'Birthday' : 'Anniversary'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                          {isBirthday ? `Turning ${item.yearsCount}` : `${item.yearsCount} Years`}
                        </span>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="text-xs text-slate-600 space-y-1.5 mb-3.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Designation:</span>
                        <span className="font-semibold text-slate-800">{item.designation}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Celebration Date:</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          {item.celebrationDisplayDate}
                          {item.isToday && (
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-black">TODAY</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isBirthday ? 'Date of Birth:' : 'Date Joined:'}</span>
                        <span className="font-mono text-slate-600">{item.originalDateFormatted}</span>
                      </div>
                      {item.phone && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Contact:
                          </span>
                          <span className="font-mono font-medium text-slate-700">{item.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Milestone Tag & Wish Button */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      {item.isMilestone ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black border border-purple-200">
                          <Star className="w-3 h-3 fill-purple-600 text-purple-600" />
                          Key Milestone
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.isToday ? '🎉 Celebrate today!' : `${item.daysUntil} days away`}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenWishModal(item)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isWished
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.isToday
                          ? isBirthday
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-xs'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isWished ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Wished</span>
                        </>
                      ) : (
                        <>
                          {isBirthday ? <Cake className="w-3.5 h-3.5" /> : <PartyPopper className="w-3.5 h-3.5" />}
                          <span>Wish</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Event Date</th>
                  <th className="px-4 py-3">Milestone / Years</th>
                  <th className="px-4 py-3">Days Remaining</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCelebrations.map(item => {
                  const isBirthday = item.type === 'birthday';
                  const isWished = wishedMap[item.id];

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/80 transition ${
                        item.isToday 
                          ? isBirthday ? 'bg-rose-50/50 font-medium' : 'bg-amber-50/50 font-medium' 
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${
                          isBirthday 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {isBirthday ? <Cake className="w-3 h-3" /> : <Trophy className="w-3 h-3" />}
                          {isBirthday ? 'Birthday' : 'Work Anniv.'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 text-white ${
                            isBirthday ? 'bg-rose-600' : 'bg-indigo-700'
                          }`}>
                            {item.profilePicture ? (
                              <img src={item.profilePicture} alt={item.employeeName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{item.employeeName.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{item.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{item.employeeId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-700">{item.department}</td>
                      <td className="px-4 py-3 text-slate-700">{item.designation}</td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{item.celebrationDisplayDate}</span>
                        {item.isToday && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-black">TODAY</span>
                        )}
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.originalDateFormatted}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{item.metricLabel}</span>
                        {item.isMilestone && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">Milestone</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs font-bold ${item.isToday ? 'text-amber-600 font-black' : 'text-slate-600'}`}>
                          {item.isToday ? 'Today!' : `${item.daysUntil} days`}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenWishModal(item)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isWished
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          {isWished ? 'Wished' : 'Send Wish'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SEND WARM WISHES MODAL */}
      {selectedCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
                  selectedCelebration.type === 'birthday'
                    ? 'bg-gradient-to-br from-rose-500 to-pink-600'
                    : 'bg-gradient-to-br from-amber-500 to-orange-600'
                }`}>
                  {selectedCelebration.type === 'birthday' ? <Cake className="w-6 h-6" /> : <PartyPopper className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Send Warm Wishes to {selectedCelebration.employeeName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedCelebration.metricLabel} • {selectedCelebration.department}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCelebration(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Greeting Message Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Celebration Greeting Message:</label>
              <textarea
                rows={4}
                value={customWishMessage}
                onChange={e => setCustomWishMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none font-medium leading-relaxed"
              />
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={handleCopyWish}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedWish ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCelebration(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendWish}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer ${
                    selectedCelebration.type === 'birthday'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Celebration Wish</span>
                </button>
              </div>
            </div>

            {/* Confetti Explosion Effect */}
            {showConfetti && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center animate-in zoom-in-95 text-center p-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-lg animate-bounce">
                  <Heart className="w-8 h-8 fill-emerald-600" />
                </div>
                <h4 className="text-base font-black text-slate-900">Wish Sent with Love! 🎉</h4>
                <p className="text-xs text-slate-500 mt-1">Thank you for making our team feel valued and celebrated!</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
