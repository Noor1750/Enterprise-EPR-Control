import os

dashboard_code = """import { useState, useEffect, useMemo } from 'react';
import { getRange } from '../lib/sheets';
import { Loader2, Search, Filter, RefreshCw, AlertTriangle, Target, Users, Wrench, Award, CheckCircle, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend } from 'recharts';

interface Employee {
  id: string;
  name: string;
  department: string;
  designation: string;
}

interface Machine {
  name: string;
  no: string;
  department: string;
  reqOperators: number;
}

interface Skill {
  empId: string;
  machineName: string;
  level: number;
}

export default function SkillMatrixDashboard({ spreadsheetId }: { spreadsheetId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eRaw, mRaw, sRaw] = await Promise.all([
        getRange(spreadsheetId, 'Employees!A:Z'),
        getRange(spreadsheetId, 'MachineCapacity!A:Z'),
        getRange(spreadsheetId, 'SkillMatrix!A:Z')
      ]);

      const empData = (eRaw.length > 1 ? eRaw.slice(1) : []).map(row => ({
        id: String(row[0] || '').trim(),
        name: String(row[1] || '').trim(),
        designation: String(row[2] || '').trim(),
        department: String(row[3] || '').trim()
      })).filter(e => e.id);

      const machData = (mRaw.length > 1 ? mRaw.slice(1) : []).map(row => {
        const aShift = Number(row[12]) || 0;
        const bShift = Number(row[13]) || 0;
        const gShift = Number(row[14]) || 0;
        return {
          name: String(row[4] || row[0] || '').trim(),
          department: String(row[1] || '').trim(),
          no: String(row[20] || '').trim(),
          reqOperators: aShift + bShift + gShift
        };
      }).filter(m => m.name);

      const skillData = (sRaw.length > 1 ? sRaw.slice(1) : []).map(row => ({
        empId: String(row[0] || '').trim().toUpperCase(),
        machineName: String(row[1] || '').trim(),
        level: Number(row[2]) || 0
      })).filter(s => s.empId && s.machineName);

      setEmployees(empData);
      setMachines(machData);
      setSkills(skillData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading Skill Matrix Dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sheet = customEvent.detail?.sheetName || '';
      if (!sheet || ['MachineCapacity', 'SkillMatrix', 'Employees'].includes(sheet)) {
        loadData();
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, [spreadsheetId]);

  // --- Derived Calculations ---

  const {
    totalEmployees,
    totalMachines,
    totalSkills,
    avgSkillLevel,
    coveragePercent,
    skillGaps,
    trainingRequired,
    multiSkilledCount,
    employeeOverview,
    machineOverview,
    levelDistribution,
    deptAnalysis
  } = useMemo(() => {
    
    const REQ_SKILL_LEVEL = 3; // Default competent level

    const filteredEmp = employees.filter(e => deptFilter === 'All' || e.department === deptFilter);
    const empIds = new Set(filteredEmp.map(e => e.id.toUpperCase()));
    
    // Total Employees
    const tEmp = filteredEmp.length;

    // Total Machines
    const filteredMach = machines.filter(m => deptFilter === 'All' || m.department === deptFilter);
    const machNames = new Set(filteredMach.map(m => m.name.toLowerCase()));
    const tMach = filteredMach.length;

    // Total Skills
    const filteredSkills = skills.filter(s => empIds.has(s.empId.toUpperCase()) && (deptFilter === 'All' || machNames.has(s.machineName.toLowerCase())));
    const tSkills = filteredSkills.length;

    let totalLevel = 0;
    filteredSkills.forEach(s => totalLevel += s.level);
    const avgSkill = tSkills > 0 ? (totalLevel / tSkills).toFixed(1) : '0';

    // Skill Gap & Training Required
    let missingSkills = 0;
    let needsTraining = 0;
    const multiSkilled = new Map<string, number>();

    // Employee Overview Mapping
    const empOverviewMap = new Map<string, any>();
    filteredEmp.forEach(e => {
      empOverviewMap.set(e.id.toUpperCase(), {
        ...e,
        machines: 0,
        skillsCount: 0,
        highestLevel: 0,
        totalLvl: 0,
        trainingReq: 0,
        machineList: [] as string[],
        skillDetails: [] as any[]
      });
    });

    filteredSkills.forEach(s => {
      const empO = empOverviewMap.get(s.empId.toUpperCase());
      if (empO) {
        empO.machines += 1;
        empO.skillsCount += 1;
        empO.highestLevel = Math.max(empO.highestLevel, s.level);
        empO.totalLvl += s.level;
        empO.machineList.push(s.machineName);
        
        const gap = REQ_SKILL_LEVEL - s.level;
        let tStatus = 'Qualified';
        if (gap >= 2) { tStatus = 'Major Training Required'; missingSkills++; needsTraining++; empO.trainingReq++; }
        else if (gap === 1) { tStatus = 'Minor Training Required'; missingSkills++; needsTraining++; empO.trainingReq++; }
        
        empO.skillDetails.push({ machine: s.machineName, current: s.level, req: REQ_SKILL_LEVEL, gap: gap > 0 ? gap : 0, status: tStatus });

        const count = multiSkilled.get(s.empId) || 0;
        multiSkilled.set(s.empId, count + 1);
      }
    });

    let mCount = 0;
    multiSkilled.forEach(v => { if (v > 1) mCount++; });

    const empOverview = Array.from(empOverviewMap.values()).map(e => ({
      ...e,
      avgLevel: e.skillsCount > 0 ? (e.totalLvl / e.skillsCount).toFixed(1) : '0',
      overallStatus: e.skillsCount === 0 ? 'Not Qualified' : e.trainingReq > 0 ? 'Training Required' : e.highestLevel >= 5 ? 'Expert' : 'Qualified'
    }));

    // Machine Overview
    let requiredSkillsTotal = 0;
    let availableQualifiedSkills = 0;

    const machOverviewMap = new Map<string, any>();
    filteredMach.forEach(m => {
      machOverviewMap.set(m.name.toLowerCase(), {
        ...m,
        qualifiedCount: 0,
        highestAvailable: 0,
        totalLvl: 0,
        skillsCount: 0,
        reqSkill: REQ_SKILL_LEVEL
      });
      requiredSkillsTotal += m.reqOperators;
    });

    filteredSkills.forEach(s => {
      const mO = machOverviewMap.get(s.machineName.toLowerCase());
      if (mO) {
        mO.skillsCount += 1;
        mO.totalLvl += s.level;
        mO.highestAvailable = Math.max(mO.highestAvailable, s.level);
        if (s.level >= REQ_SKILL_LEVEL) {
          mO.qualifiedCount += 1;
        }
      }
    });

    const machOverview = Array.from(machOverviewMap.values()).map(m => {
      const gap = m.reqOperators - m.qualifiedCount;
      const coverage = m.reqOperators > 0 ? Math.min(100, Math.round((m.qualifiedCount / m.reqOperators) * 100)) : 100;
      let status = '🟢 Covered';
      let risk = 'Low';
      if (m.qualifiedCount === 0) { status = '🔴 Critical'; risk = 'High'; }
      else if (m.qualifiedCount === 1 || coverage < 50) { status = '🟡 Risk'; risk = 'Medium'; }
      
      availableQualifiedSkills += m.qualifiedCount;

      return {
        ...m,
        avgLevel: m.skillsCount > 0 ? (m.totalLvl / m.skillsCount).toFixed(1) : '0',
        gap: gap > 0 ? gap : 0,
        coverage,
        status,
        risk,
        backup: m.qualifiedCount > m.reqOperators
      };
    });

    const covPercent = requiredSkillsTotal > 0 ? ((availableQualifiedSkills / requiredSkillsTotal) * 100).toFixed(0) : '100';

    // Level Distribution
    const lvlCounts = [0,0,0,0,0,0];
    filteredSkills.forEach(s => {
      if (s.level >= 0 && s.level <= 5) lvlCounts[s.level]++;
    });
    const lvlDist = [
      { name: '0 - No Skill', count: lvlCounts[0] },
      { name: '1 - Beginner', count: lvlCounts[1] },
      { name: '2 - Basic', count: lvlCounts[2] },
      { name: '3 - Competent', count: lvlCounts[3] },
      { name: '4 - Advanced', count: lvlCounts[4] },
      { name: '5 - Expert', count: lvlCounts[5] }
    ];

    // Department Analysis
    const deptMap = new Map<string, any>();
    empOverview.forEach(e => {
      const d = e.department || 'Unassigned';
      if (!deptMap.has(d)) deptMap.set(d, { name: d, emps: 0, skilledEmps: 0, totalLvl: 0, skillCount: 0, trainingReq: 0 });
      const dObj = deptMap.get(d);
      dObj.emps += 1;
      if (e.skillsCount > 0) dObj.skilledEmps += 1;
      dObj.totalLvl += e.totalLvl;
      dObj.skillCount += e.skillsCount;
      dObj.trainingReq += e.trainingReq;
    });
    const dAnalysis = Array.from(deptMap.values()).map(d => ({
      ...d,
      avgSkill: d.skillCount > 0 ? (d.totalLvl / d.skillCount).toFixed(1) : '0',
      coverage: d.emps > 0 ? ((d.skilledEmps / d.emps) * 100).toFixed(0) : '0'
    }));

    return {
      totalEmployees: tEmp,
      totalMachines: tMach,
      totalSkills: tSkills,
      avgSkillLevel: avgSkill,
      coveragePercent: covPercent,
      skillGaps: missingSkills,
      trainingRequired: needsTraining,
      multiSkilledCount: mCount,
      employeeOverview: empOverview,
      machineOverview: machOverview,
      levelDistribution: lvlDist,
      deptAnalysis: dAnalysis
    };

  }, [employees, machines, skills, deptFilter]);

  const COLORS = ['#94a3b8', '#38bdf8', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
  const STATUS_COLORS = { '🟢 Covered': '#22c55e', '🟡 Risk': '#f59e0b', '🔴 Critical': '#ef4444' };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Quick Stats Cards
  const KpiCard = ({ title, value, icon: Icon, subtitle, color }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50 custom-scrollbar pb-10">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" /> Skill Matrix Navigator
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Employee Competency & Machine Skill Management Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4 hidden sm:block">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Last Updated</p>
            <p className="text-sm font-bold text-slate-700">{lastUpdated.toLocaleString()}</p>
          </div>
          <select 
            value={deptFilter} 
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-100 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-medium"
          >
            <option value="All">All Departments</option>
            {Array.from(new Set(employees.map(e => e.department).filter(Boolean))).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button onClick={loadData} className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors border border-indigo-200" title="Refresh Data">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Total Employees" value={totalEmployees} icon={Users} color="bg-indigo-500" subtitle="Registered in Master" />
          <KpiCard title="Total Machines" value={totalMachines} icon={Wrench} color="bg-sky-500" subtitle="Configured in Master" />
          <KpiCard title="Skill Coverage" value={`${coveragePercent}%`} icon={CheckCircle} color={Number(coveragePercent) >= 100 ? "bg-emerald-500" : Number(coveragePercent) > 50 ? "bg-amber-500" : "bg-rose-500"} subtitle="Qualified vs Required" />
          <KpiCard title="Training Required" value={trainingRequired} icon={AlertTriangle} color="bg-rose-500" subtitle="Employees needing training" />
          <KpiCard title="Average Skill Level" value={avgSkillLevel} icon={Award} color="bg-violet-500" subtitle="Out of 5.0" />
          <KpiCard title="Skill Gap" value={skillGaps} icon={Target} color="bg-orange-500" subtitle="Missing/Insufficient Skills" />
          <KpiCard title="Multi-Skilled" value={multiSkilledCount} icon={Users} color="bg-teal-500" subtitle="Operators with 2+ skills" />
          <KpiCard title="Critical Machines" value={machineOverview.filter(m => m.status === '🔴 Critical').length} icon={AlertTriangle} color="bg-red-600" subtitle="Zero qualified operators" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Skill Level Distribution */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Skill Level Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={levelDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                    {levelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Coverage */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Department-wise Skill Analysis</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptAnalysis} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                  <Legend />
                  <Bar dataKey="emps" name="Total Employees" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="skilledEmps" name="Skilled Employees" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="trainingReq" name="Training Required" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Critical Machines Section */}
        {machineOverview.filter(m => m.risk !== 'Low').length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
            <h3 className="text-lg font-black text-rose-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Critical Machine Coverage
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-rose-800 border-b border-rose-200">
                    <th className="pb-3 font-bold">Machine</th>
                    <th className="pb-3 font-bold">Department</th>
                    <th className="pb-3 font-bold text-center">Qualified Oprs</th>
                    <th className="pb-3 font-bold text-center">Req Oprs</th>
                    <th className="pb-3 font-bold text-center">Coverage</th>
                    <th className="pb-3 font-bold">Risk Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-200/50">
                  {machineOverview.filter(m => m.risk !== 'Low').sort((a,b) => a.coverage - b.coverage).slice(0, 10).map((m, i) => (
                    <tr key={i} className="text-rose-950">
                      <td className="py-3 font-semibold">{m.name} {m.no ? `(${m.no})` : ''}</td>
                      <td className="py-3">{m.department}</td>
                      <td className="py-3 text-center font-bold">{m.qualifiedCount}</td>
                      <td className="py-3 text-center">{m.reqOperators}</td>
                      <td className="py-3 text-center font-mono font-bold text-rose-700">{m.coverage}%</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${m.status === '🔴 Critical' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employee Skill Overview & Search */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800">Employee Skill Overview</h3>
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Search Employee or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100/50">
                <tr className="text-slate-600">
                  <th className="px-6 py-4 font-bold">Employee ID</th>
                  <th className="px-6 py-4 font-bold">Name</th>
                  <th className="px-6 py-4 font-bold">Department</th>
                  <th className="px-6 py-4 font-bold text-center">Machines</th>
                  <th className="px-6 py-4 font-bold text-center">Avg Skill</th>
                  <th className="px-6 py-4 font-bold text-center">Highest</th>
                  <th className="px-6 py-4 font-bold text-center">Training Req</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeOverview
                  .filter(e => 
                    !searchQuery || 
                    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    e.id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .sort((a,b) => b.skillsCount - a.skillsCount)
                  .slice(0, 50)
                  .map((e, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-500">{e.id}</td>
                    <td className="px-6 py-3 font-bold text-slate-800">{e.name}</td>
                    <td className="px-6 py-3 text-slate-600">{e.department}</td>
                    <td className="px-6 py-3 text-center font-bold text-indigo-600">{e.machines}</td>
                    <td className="px-6 py-3 text-center text-slate-700 font-medium">{e.avgLevel}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold text-xs">
                        {e.highestLevel}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {e.trainingReq > 0 ? (
                        <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-bold">{e.trainingReq} Gap{e.trainingReq > 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        e.overallStatus === 'Expert' ? 'bg-emerald-100 text-emerald-700' :
                        e.overallStatus === 'Qualified' ? 'bg-blue-100 text-blue-700' :
                        e.overallStatus === 'Training Required' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {e.overallStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
"""

with open("src/components/SkillMatrixDashboard.tsx", "w") as f:
    f.write(dashboard_code)

print("Created SkillMatrixDashboard.tsx")
