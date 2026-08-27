import { useState, useMemo } from 'react';
import { 
  Users, CheckCircle2, AlertCircle, TrendingUp, Award, Target,
  Filter, RotateCcw, Calendar, Building2, Search, Lock
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, 
  PieChart, Pie
} from 'recharts';
import { Employee, KPIRecord, getRatingInfo, MONTH_NAMES, isKpiHiddenForEmployee } from './types';

interface KPIDashboardProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  availableMonths?: string[];
  hiddenEmployeeIds?: string[];
  isAdmin?: boolean;
  selectedMonth?: string;
  setSelectedMonth?: (month: string) => void;
  onNavigateToEntry: () => void;
  onNavigateToUpload?: () => void;
  onNavigateToRecords?: () => void;
  onNavigateToHistory: (employeeId: string) => void;
}

export default function KPIDashboard({
  employees,
  kpiRecords,
  availableMonths: propAvailableMonths,
  hiddenEmployeeIds = [],
  isAdmin = true,
  selectedMonth: propSelectedMonth,
  setSelectedMonth: propSetSelectedMonth,
  onNavigateToEntry,
  onNavigateToUpload,
  onNavigateToRecords,
  onNavigateToHistory
}: KPIDashboardProps) {
  // Available months fallback
  const availableMonths = useMemo(() => {
    if (propAvailableMonths && propAvailableMonths.length > 0) return propAvailableMonths;
    const set = new Set<string>();
    kpiRecords.forEach(k => { if (k.month) set.add(k.month); });
    if (set.size === 0) {
      const now = new Date();
      set.add(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
    }
    return Array.from(set);
  }, [propAvailableMonths, kpiRecords]);

  const [internalSelectedMonth, setInternalSelectedMonth] = useState<string>('All');
  const selectedMonth = propSelectedMonth !== undefined ? propSelectedMonth : internalSelectedMonth;
  const setSelectedMonth = propSetSelectedMonth || setInternalSelectedMonth;

  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedRating, setSelectedRating] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique departments from employees
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filter KPI records
  const filteredKPIs = useMemo(() => {
    return kpiRecords.filter(kpi => {
      // Month Filter
      if (selectedMonth !== 'All' && kpi.month !== selectedMonth) return false;
      // Department Filter
      if (selectedDept !== 'All' && kpi.department !== selectedDept) return false;
      // Rating Filter
      if (selectedRating !== 'All' && kpi.rating !== parseInt(selectedRating, 10)) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = kpi.employeeId.toLowerCase().includes(q);
        const matchName = kpi.employeeName.toLowerCase().includes(q);
        const matchDept = kpi.department.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchDept) return false;
      }
      return true;
    });
  }, [kpiRecords, selectedMonth, selectedDept, selectedRating, searchQuery]);

  // Active employees in master DB (filtered by department if applicable)
  const activeEmployees = useMemo(() => {
    return employees.filter(e => {
      if (e.status === 'Inactive') return false;
      if (selectedDept !== 'All' && e.department !== selectedDept) return false;
      return true;
    });
  }, [employees, selectedDept]);

  // Unique employee IDs who submitted KPI in the selected period/filter
  const submittedEmployeeIds = useMemo(() => {
    const set = new Set<string>();
    filteredKPIs.forEach(k => set.add(k.employeeId.toUpperCase()));
    return set;
  }, [filteredKPIs]);

  // Pending employees who have not submitted KPI (for selected specific month)
  const pendingEmployees = useMemo(() => {
    if (selectedMonth === 'All') return [];
    return activeEmployees.filter(e => !submittedEmployeeIds.has(e.id.toUpperCase()));
  }, [activeEmployees, submittedEmployeeIds, selectedMonth]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalCount = filteredKPIs.length;
    if (totalCount === 0) {
      return {
        totalEmployees: activeEmployees.length,
        submittedCount: 0,
        pendingCount: activeEmployees.length,
        avgPlan: 0,
        avgAchievement: 0,
        avgRating: 0,
        topPerformersCount: 0,
      };
    }

    const sumPlan = filteredKPIs.reduce((acc, curr) => acc + curr.plan, 0);
    const sumAchievement = filteredKPIs.reduce((acc, curr) => acc + curr.achievement, 0);
    const sumRating = filteredKPIs.reduce((acc, curr) => acc + curr.rating, 0);
    const topPerformers = filteredKPIs.filter(k => k.rating >= 4).length;

    return {
      totalEmployees: activeEmployees.length,
      submittedCount: selectedMonth === 'All' ? submittedEmployeeIds.size : filteredKPIs.length,
      pendingCount: selectedMonth === 'All' ? Math.max(0, activeEmployees.length - submittedEmployeeIds.size) : pendingEmployees.length,
      avgPlan: Math.round(sumPlan / totalCount),
      avgAchievement: Math.round(sumAchievement / totalCount),
      avgRating: (sumRating / totalCount).toFixed(1),
      topPerformersCount: topPerformers,
    };
  }, [filteredKPIs, activeEmployees, selectedMonth, submittedEmployeeIds, pendingEmployees]);

  // Rating Distribution (Bucketed by Performance Grade)
  const ratingDistribution = useMemo(() => {
    // 5 buckets corresponding to the 5 RATING_DESCRIPTIONS levels (Excellent, Good, Average, Low, Minimum)
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    filteredKPIs.forEach(k => {
      let bucket = 1;
      if (k.rating >= 4.5) bucket = 5;
      else if (k.rating >= 3.5) bucket = 4;
      else if (k.rating >= 2.5) bucket = 3;
      else if (k.rating >= 2.0) bucket = 2;
      
      counts[bucket]++;
    });

    return [5, 4, 3, 2, 1].map(bucket => ({
      rating: getRatingInfo(bucket).label,
      ratingNum: bucket,
      label: getRatingInfo(bucket).label,
      count: counts[bucket],
      percentage: filteredKPIs.length > 0 ? Math.round((counts[bucket] / filteredKPIs.length) * 100) : 0,
      color: getRatingInfo(bucket).color
    }));
  }, [filteredKPIs]);

  // Monthly Performance Trend (Plan vs Achievement across months)
  const monthlyTrend = useMemo(() => {
    const monthMap: Record<string, { totalPlan: number; totalAch: number; count: number; dateObj: Date }> = {};

    kpiRecords.forEach(k => {
      if (selectedDept !== 'All' && k.department !== selectedDept) return;

      if (!monthMap[k.month]) {
        // approximate date for sorting
        const parts = k.month.split(' ');
        let d = new Date();
        if (parts.length === 2) {
          const mIdx = MONTH_NAMES.indexOf(parts[0]);
          if (mIdx >= 0) d = new Date(parseInt(parts[1], 10), mIdx, 1);
        }
        monthMap[k.month] = { totalPlan: 0, totalAch: 0, count: 0, dateObj: d };
      }
      monthMap[k.month].totalPlan += k.plan;
      monthMap[k.month].totalAch += k.achievement;
      monthMap[k.month].count++;
    });

    const entries = Object.entries(monthMap).map(([month, data]) => ({
      month,
      avgPlan: Math.round(data.totalPlan / data.count),
      avgAchievement: Math.round(data.totalAch / data.count),
      count: data.count,
      timestamp: data.dateObj.getTime()
    }));

    entries.sort((a, b) => a.timestamp - b.timestamp);
    // Take last 12 months
    return entries.slice(-12);
  }, [kpiRecords, selectedDept]);

  // Department-wise KPI performance
  const departmentPerformance = useMemo(() => {
    const deptMap: Record<string, { totalPlan: number; totalAch: number; totalRating: number; count: number }> = {};

    kpiRecords.forEach(k => {
      if (selectedMonth !== 'All' && k.month !== selectedMonth) return;
      const dept = k.department || 'Unassigned';
      if (!deptMap[dept]) {
        deptMap[dept] = { totalPlan: 0, totalAch: 0, totalRating: 0, count: 0 };
      }
      deptMap[dept].totalPlan += k.plan;
      deptMap[dept].totalAch += k.achievement;
      deptMap[dept].totalRating += k.rating;
      deptMap[dept].count++;
    });

    return Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      avgAchievement: Math.round(data.totalAch / data.count),
      avgPlan: Math.round(data.totalPlan / data.count),
      avgRating: parseFloat((data.totalRating / data.count).toFixed(1)),
      count: data.count
    })).sort((a, b) => b.avgAchievement - a.avgAchievement);
  }, [kpiRecords, selectedMonth]);

  // Top performers (Rating 5 or 4, highest achievement)
  const topPerformers = useMemo(() => {
    return [...filteredKPIs]
      .filter(k => isAdmin || !isKpiHiddenForEmployee(k.employeeId, hiddenEmployeeIds))
      .sort((a, b) => b.rating - a.rating || b.achievement - a.achievement)
      .slice(0, 5);
  }, [filteredKPIs, isAdmin, hiddenEmployeeIds]);

  // Low performers (Rating 1 or 2, lowest achievement)
  const lowPerformers = useMemo(() => {
    return [...filteredKPIs]
      .filter(k => (k.rating <= 2 || k.achievement < 75) && (isAdmin || !isKpiHiddenForEmployee(k.employeeId, hiddenEmployeeIds)))
      .sort((a, b) => a.rating - b.rating || a.achievement - b.achievement)
      .slice(0, 5);
  }, [filteredKPIs, isAdmin, hiddenEmployeeIds]);

  const resetFilters = () => {
    setSelectedMonth('All');
    setSelectedDept('All');
    setSelectedRating('All');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Interactive Filter Bar */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#26B99A]" />
            <span>KPI Filter Controls</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Employee ID / Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#26B99A] focus:bg-white"
              />
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg">
              <Award className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedRating}
                onChange={e => setSelectedRating(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Ratings (1–5)</option>
                <option value="5">Rating 5 - Excellent</option>
                <option value="4">Rating 4 - Good</option>
                <option value="3">Rating 3 - Average</option>
                <option value="2">Rating 2 - Low</option>
                <option value="1">Rating 1 - Minimum</option>
              </select>
            </div>

            {/* Reset Button */}
            {(selectedMonth !== 'All' || selectedDept !== 'All' || selectedRating !== 'All' || searchQuery) && (
              <button
                onClick={resetFilters}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Master Employees */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Master Staff</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#2A3F54]">{stats.totalEmployees}</div>
          <div className="text-[11px] text-gray-400 mt-1">Active employees</div>
        </div>

        {/* Submitted KPI */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">KPI Submitted</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.submittedCount}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1 font-medium">
            {stats.totalEmployees > 0 ? `${Math.round((stats.submittedCount / stats.totalEmployees) * 100)}% coverage` : '0%'}
          </div>
        </div>

        {/* Pending KPI */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Pending KPI</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.pendingCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">
            {selectedMonth === 'All' ? 'Missing records' : `For ${selectedMonth}`}
          </div>
        </div>

        {/* Average Plan % */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Avg Plan</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">{stats.avgPlan}%</div>
          <div className="text-[11px] text-gray-400 mt-1">Target baseline</div>
        </div>

        {/* Average Achievement % */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Avg Achievement</span>
            <div className="p-2 bg-[#26B99A]/10 text-[#26B99A] rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#26B99A]">{stats.avgAchievement}%</div>
          <div className="text-[11px] text-gray-400 mt-1">
            {stats.avgAchievement >= stats.avgPlan ? 'Target achieved' : `${stats.avgPlan - stats.avgAchievement}% below target`}
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Avg Rating</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600">{stats.avgRating} <span className="text-sm text-gray-400 font-normal">/ 5.0</span></div>
          <div className="text-[11px] text-gray-400 mt-1">Scale 1 (Min) to 5 (Max)</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Performance Trend Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl p-6 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-[#2A3F54]">Monthly KPI Performance Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">Comparison between Target Plan (%) and Actual Achievement (%) over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-gray-600">Plan %</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#26B99A]" />
                <span className="text-gray-600">Achievement %</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {monthlyTrend.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Target className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">No monthly trend data recorded yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F6" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#73879C', fontSize: 11, fontWeight: 600 }} 
                    axisLine={{ stroke: '#E6E9ED' }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#73879C', fontSize: 11 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #E6E9ED', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: string) => [`${value}%`, name === 'avgPlan' ? 'Plan' : 'Achievement']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgPlan" 
                    stroke="#6366F1" 
                    strokeWidth={2.5} 
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#6366F1' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgAchievement" 
                    stroke="#26B99A" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#26B99A' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Rating Distribution (1 to 5) */}
        <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-[#2A3F54]">Rating Distribution</h3>
                <p className="text-xs text-gray-500 mt-0.5">Scale 1 (Min) to 5 (Excellent)</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                Total: {filteredKPIs.length}
              </span>
            </div>

            {/* Custom Bar Breakdown */}
            <div className="space-y-3 mt-4">
              {ratingDistribution.map(item => (
                <div key={item.ratingNum} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono px-1.5 py-0.5 rounded text-[11px]" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                        ★ {item.ratingNum}
                      </span>
                      <span className="font-semibold text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{item.count}</span>
                      <span className="text-gray-400 w-8 text-right font-mono">({item.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${item.percentage}%`, 
                        backgroundColor: item.color 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            * Ratings are numerical values only (1, 2, 3, 4, 5)
          </div>
        </div>
      </div>

      {/* Secondary Row: Department Comparison & Top/Low Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department-wise KPI Performance */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-[#2A3F54]">Department-wise KPI Performance</h3>
              <p className="text-xs text-gray-500 mt-0.5">Average achievement % & average rating across departments</p>
            </div>
          </div>

          {departmentPerformance.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-xs">
              No department data available
            </div>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentPerformance} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F6" />
                  <XAxis 
                    dataKey="department" 
                    tick={{ fill: '#73879C', fontSize: 11, fontWeight: 600 }} 
                    axisLine={{ stroke: '#E6E9ED' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#73879C', fontSize: 11 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E6E9ED', fontSize: '12px' }}
                    formatter={(val: any, name: string) => [
                      name === 'avgAchievement' ? `${val}%` : val, 
                      name === 'avgAchievement' ? 'Avg Achievement' : 'Avg Rating'
                    ]}
                  />
                  <Bar dataKey="avgAchievement" fill="#26B99A" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top & Low Performers Highlights */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Performers */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                  <Award className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Top Performers</h4>
              </div>
              <span className="text-[11px] text-gray-400">Rating 4–5</span>
            </div>

            {topPerformers.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No top performers recorded yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {topPerformers.map(item => {
                  const isHidden = isKpiHiddenForEmployee(item.employeeId, hiddenEmployeeIds);
                  return (
                    <div key={item.kpiId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => onNavigateToHistory(item.employeeId)}
                            className="font-bold text-[#2A3F54] hover:text-[#26B99A] truncate text-left block"
                          >
                            {item.employeeName}
                          </button>
                          {isHidden && isAdmin && (
                            <span className="p-0.5 bg-amber-100 text-amber-700 rounded-sm" title="Hidden from other users">
                              <Lock className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                          <span className="font-mono">{item.employeeId}</span>
                          <span>•</span>
                          <span>{item.department}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-600">{item.achievement}% Achieved</div>
                        <div className="text-[11px] font-semibold text-emerald-700">Rating: {item.rating.toFixed(1)} / 5.0</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Submissions / Need Attention */}
          {selectedMonth !== 'All' && pendingEmployees.length > 0 && (
            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Pending Submissions ({pendingEmployees.length})
                  </h4>
                </div>
                <button
                  onClick={onNavigateToEntry}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline"
                >
                  Enter KPI Now
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {pendingEmployees.slice(0, 10).map((emp, idx) => (
                  <div key={`${emp.id}-${idx}`} className="bg-white/80 border border-amber-100 rounded px-2.5 py-1.5 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-800">{emp.name}</span>
                      <span className="text-gray-400 font-mono text-[11px] ml-1.5">({emp.id})</span>
                    </div>
                    <span className="text-[11px] text-gray-500">{emp.department}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
