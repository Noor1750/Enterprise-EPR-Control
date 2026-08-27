import { useState, useMemo } from 'react';
import { BreakdownRecord } from '../../types/breakdown';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';
import { 
  AlertTriangle, Clock, DollarSign, Wrench, Shield, CheckCircle, 
  TrendingUp, Activity, BarChart3, Filter, Calendar, Zap, Layers, RefreshCw
} from 'lucide-react';

interface BreakdownDashboardProps {
  records: BreakdownRecord[];
  machinesList: string[][];
  departmentsList: string[];
}

const COLORS = ['#F87C6C', '#1ABB9C', '#3498DB', '#9B59B6', '#E67E22', '#F1C40F', '#1ABC9C', '#34495E', '#E74C3C'];

export default function BreakdownDashboard({ records, machinesList, departmentsList }: BreakdownDashboardProps) {
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedFailureMode, setSelectedFailureMode] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | '30days' | '90days' | 'year'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'department' | 'machine' | 'failure' | 'cost'>('overview');

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedDepartment !== 'All' && r.department !== selectedDepartment) return false;
      if (selectedFailureMode !== 'All' && r.failureMode !== selectedFailureMode) return false;
      if (selectedCategory !== 'All' && r.category !== selectedCategory) return false;
      
      if (selectedDateRange !== 'all' && r.date) {
        const recordDate = new Date(r.date).getTime();
        const now = new Date().getTime();
        const days = selectedDateRange === '30days' ? 30 : selectedDateRange === '90days' ? 90 : 365;
        if (now - recordDate > days * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [records, selectedDepartment, selectedFailureMode, selectedCategory, selectedDateRange]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = filteredRecords.length;
    const open = filteredRecords.filter(r => r.status !== 'Completed' && r.status !== 'Closed' && r.status !== 'Cancelled').length;
    const closed = filteredRecords.filter(r => r.status === 'Completed' || r.status === 'Closed').length;
    
    // Machines currently down (open breakdowns with Production Stop = Yes)
    const activeDownMachines = new Set(
      filteredRecords
        .filter(r => r.productionStop === 'Yes' && r.status !== 'Completed' && r.status !== 'Closed' && r.status !== 'Cancelled')
        .map(r => r.machineName)
    );
    const machinesDownCount = activeDownMachines.size;

    const totalHoursLost = filteredRecords.reduce((acc, r) => acc + (Number(r.hourLostHours) || 0), 0);
    const avgHoursLost = total > 0 ? totalHoursLost / total : 0;

    const totalCost = filteredRecords.reduce((acc, r) => acc + (Number(r.totalCost) || 0), 0);
    const avgCost = total > 0 ? totalCost / total : 0;

    const totalSparePartsCount = filteredRecords.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);

    // Response time calculations
    const attendedRecords = filteredRecords.filter(r => r.responseTimeMin > 0);
    const totalResponseMin = attendedRecords.reduce((acc, r) => acc + r.responseTimeMin, 0);
    const avgResponseMin = attendedRecords.length > 0 ? Math.round(totalResponseMin / attendedRecords.length) : 0;
    const minResponseMin = attendedRecords.length > 0 ? Math.min(...attendedRecords.map(r => r.responseTimeMin)) : 0;
    const maxResponseMin = attendedRecords.length > 0 ? Math.max(...attendedRecords.map(r => r.responseTimeMin)) : 0;

    return {
      total,
      open,
      closed,
      machinesDownCount,
      totalHoursLost: Math.round(totalHoursLost * 100) / 100,
      avgHoursLost: Math.round(avgHoursLost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      avgCost: Math.round(avgCost * 100) / 100,
      totalSparePartsCount,
      avgResponseMin,
      minResponseMin,
      maxResponseMin,
    };
  }, [filteredRecords]);

  // Department-wise aggregations
  const departmentData = useMemo(() => {
    const deptMap: Record<string, { department: string; count: number; hoursLost: number; cost: number }> = {};
    
    filteredRecords.forEach(r => {
      const dept = r.department || 'Other';
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, count: 0, hoursLost: 0, cost: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].hoursLost += Number(r.hourLostHours) || 0;
      deptMap[dept].cost += Number(r.totalCost) || 0;
    });

    return Object.values(deptMap)
      .map(d => ({
        ...d,
        hoursLost: Math.round(d.hoursLost * 100) / 100,
        cost: Math.round(d.cost * 100) / 100,
        avgDowntime: d.count > 0 ? Math.round((d.hoursLost / d.count) * 100) / 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Machine-wise breakdown analysis
  const machineData = useMemo(() => {
    const map: Record<string, { 
      machineName: string; 
      machineNo: string; 
      department: string; 
      count: number; 
      hoursLost: number; 
      cost: number;
      lastDate: string;
      isDown: boolean;
    }> = {};

    // First map all known machines from MachineCapacity
    machinesList.forEach(m => {
      const brand = m[0] || '';
      const dept = m[1] || '';
      const name = m[4] || brand;
      const no = m[20] || `MC-${dept.substring(0, 3).toUpperCase()}-${name.replace(/\s+/g, '')}`;
      if (name) {
        map[name] = {
          machineName: name,
          machineNo: no,
          department: dept,
          count: 0,
          hoursLost: 0,
          cost: 0,
          lastDate: '—',
          isDown: false
        };
      }
    });

    // Populate with actual breakdown occurrences
    filteredRecords.forEach(r => {
      const name = r.machineName || 'Unknown';
      if (!map[name]) {
        map[name] = {
          machineName: name,
          machineNo: r.machineNo || '—',
          department: r.department || '—',
          count: 0,
          hoursLost: 0,
          cost: 0,
          lastDate: '—',
          isDown: false
        };
      }
      map[name].count += 1;
      map[name].hoursLost += Number(r.hourLostHours) || 0;
      map[name].cost += Number(r.totalCost) || 0;
      if (r.date && (map[name].lastDate === '—' || r.date > map[name].lastDate)) {
        map[name].lastDate = r.date;
      }
      if (r.productionStop === 'Yes' && r.status !== 'Completed' && r.status !== 'Closed' && r.status !== 'Cancelled') {
        map[name].isDown = true;
      }
    });

    return Object.values(map)
      .map(m => ({
        ...m,
        hoursLost: Math.round(m.hoursLost * 100) / 100,
        cost: Math.round(m.cost * 100) / 100,
        avgDowntime: m.count > 0 ? Math.round((m.hoursLost / m.count) * 100) / 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords, machinesList]);

  // Failure Mode aggregations
  const failureModeData = useMemo(() => {
    const map: Record<string, { mode: string; count: number; hoursLost: number; cost: number }> = {};
    filteredRecords.forEach(r => {
      const mode = r.failureMode || 'Unspecified';
      if (!map[mode]) {
        map[mode] = { mode, count: 0, hoursLost: 0, cost: 0 };
      }
      map[mode].count += 1;
      map[mode].hoursLost += Number(r.hourLostHours) || 0;
      map[mode].cost += Number(r.totalCost) || 0;
    });

    return Object.values(map)
      .map(f => ({
        ...f,
        hoursLost: Math.round(f.hoursLost * 100) / 100,
        cost: Math.round(f.cost * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Top Cost Breakdowns
  const topCostBreakdowns = useMemo(() => {
    return [...filteredRecords]
      .filter(r => r.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {departmentsList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Failure Mode Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Failure Mode</label>
            <select
              value={selectedFailureMode}
              onChange={(e) => setSelectedFailureMode(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="All">All Failure Modes</option>
              {failureModeData.map(f => (
                <option key={f.mode} value={f.mode}>{f.mode}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Time Period</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">Last 1 Year</option>
            </select>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview KPIs
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'department' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Department Analysis
          </button>
          <button
            onClick={() => setActiveTab('machine')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'machine' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Machine Analysis
          </button>
          <button
            onClick={() => setActiveTab('failure')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'failure' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Failure Modes
          </button>
          <button
            onClick={() => setActiveTab('cost')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'cost' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cost Breakdown
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Breakdowns */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Breakdowns</span>
            <Wrench className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{kpis.total}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-amber-600 font-bold">{kpis.open} Open</span>
            <span className="text-emerald-600 font-bold">{kpis.closed} Closed</span>
          </div>
        </div>

        {/* Machines Down */}
        <div className={`rounded-xl p-3.5 border shadow-sm flex flex-col justify-between ${
          kpis.machinesDownCount > 0 ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Machines Down</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-700">{kpis.machinesDownCount}</div>
          <div className="text-[11px] text-rose-600/90 font-medium mt-1">
            {kpis.machinesDownCount > 0 ? 'Production stoppage' : 'All machines operational'}
          </div>
        </div>

        {/* Total Hours Lost */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Hours Lost</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{kpis.totalHoursLost} <span className="text-xs font-medium text-slate-400">Hrs</span></div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg: <strong className="text-slate-700">{kpis.avgHoursLost} Hrs</strong> / breakdown
          </div>
        </div>

        {/* Total Maintenance Cost */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Cost ($)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">${kpis.totalCost.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg: <strong className="text-slate-700">${kpis.avgCost.toFixed(2)}</strong> / log
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Response Time</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{kpis.avgResponseMin} <span className="text-xs font-medium text-slate-400">Min</span></div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Min: <strong>{kpis.minResponseMin}m</strong></span>
            <span>Max: <strong>{kpis.maxResponseMin}m</strong></span>
          </div>
        </div>

        {/* Spare Parts Used */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Spare Parts Qty</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{kpis.totalSparePartsCount} <span className="text-xs font-medium text-slate-400">Pcs</span></div>
          <div className="text-[11px] text-slate-500 mt-1">
            Replaced components
          </div>
        </div>
      </div>

      {/* TAB CONTENT VIEWS */}
      
      {/* 1. OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Breakdown & Hours Lost Chart */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" /> Department Breakdowns & Hours Lost
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} angle={-20} textAnchor="end" />
                  <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="count" name="Breakdowns Count" fill="#1ABB9C" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="hoursLost" name="Hours Lost (Hrs)" fill="#F87C6C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Failure Mode Distribution */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Failure Mode Distribution
            </h4>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={failureModeData}
                    dataKey="count"
                    nameKey="mode"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ mode, percent }) => `${mode}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {failureModeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEPARTMENT-WISE ANALYSIS */}
      {activeTab === 'department' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Department-Wise Breakdown Analysis</h4>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated downtime metrics, occurrence frequency, and maintenance expenditure by department.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Total Breakdowns</th>
                  <th className="py-3 px-4 text-center">Total Hours Lost</th>
                  <th className="py-3 px-4 text-center">Avg Downtime / Breakdown</th>
                  <th className="py-3 px-4 text-right">Maintenance Cost ($)</th>
                  <th className="py-3 px-4 text-right">Avg Cost ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {departmentData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No breakdown records found for the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  departmentData.map((dept, idx) => (
                    <tr key={`${dept.department}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        {dept.department}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{dept.count}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">{dept.hoursLost} Hrs</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{dept.avgDowntime} Hrs</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">${dept.cost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ${dept.count > 0 ? (dept.cost / dept.count).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MACHINE-WISE BREAKDOWN ANALYSIS */}
      {activeTab === 'machine' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Machine-Wise Breakdown Analysis</h4>
              <p className="text-xs text-slate-500 mt-0.5">Performance, reliability, and maintenance history for each individual production machine.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Machine Name</th>
                  <th className="py-3 px-4">Machine No</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Current Status</th>
                  <th className="py-3 px-4 text-center">Breakdown Count</th>
                  <th className="py-3 px-4 text-center">Total Hours Lost</th>
                  <th className="py-3 px-4 text-center">Avg Downtime</th>
                  <th className="py-3 px-4 text-right">Total Cost ($)</th>
                  <th className="py-3 px-4 text-center">Last Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {machineData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No machines found.
                    </td>
                  </tr>
                ) : (
                  machineData.map((m, idx) => (
                    <tr key={`${m.machineName}-${m.machineNo}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{m.machineName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{m.machineNo}</td>
                      <td className="py-3 px-4 text-slate-700">{m.department}</td>
                      <td className="py-3 px-4 text-center">
                        {m.isDown ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                            🔴 Breakdown
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            🟢 Running
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{m.count}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">{m.hoursLost} Hrs</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{m.avgDowntime} Hrs</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">${m.cost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500 text-[11px]">{m.lastDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. FAILURE MODE ANALYSIS */}
      {activeTab === 'failure' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Failure Mode Analysis</h4>
              <p className="text-xs text-slate-500 mt-0.5">Identify chronic root-cause failure categories to target preventive maintenance schedules.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Failure Mode</th>
                  <th className="py-3 px-4 text-center">Breakdown Count</th>
                  <th className="py-3 px-4 text-center">% of Total</th>
                  <th className="py-3 px-4 text-center">Hours Lost</th>
                  <th className="py-3 px-4 text-right">Maintenance Cost ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {failureModeData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No failure modes recorded.
                    </td>
                  </tr>
                ) : (
                  failureModeData.map((f, idx) => {
                    const pct = kpis.total > 0 ? Math.round((f.count / kpis.total) * 100) : 0;
                    return (
                      <tr key={`${f.mode}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          {f.mode}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{f.count}</td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-slate-600">{pct}%</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">{f.hoursLost} Hrs</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">${f.cost.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. COST ANALYSIS */}
      {activeTab === 'cost' && (
        <div className="space-y-6">
          {/* Top Cost Breakdown Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-sm font-bold text-slate-800">Highest Cost Breakdown Events</h4>
              <p className="text-xs text-slate-500 mt-0.5">Major breakdown records with highest spare parts and technical service expenditures.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Breakdown ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Machine</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Spare Part / Service</th>
                    <th className="py-3 px-4 text-center">Qty / UOM</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Total Cost ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {topCostBreakdowns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No cost data available.
                      </td>
                    </tr>
                  ) : (
                    topCostBreakdowns.map((r, idx) => (
                      <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.id}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{r.date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.machineName}</td>
                        <td className="py-3 px-4 text-slate-700">{r.department}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{r.sparePartsService}</td>
                        <td className="py-3 px-4 text-center font-mono">{r.quantity} {r.uom}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">${Number(r.unitCost).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">${Number(r.totalCost).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
