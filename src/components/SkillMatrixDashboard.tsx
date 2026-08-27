import { useState, useEffect, useMemo } from 'react';
import { getRange } from '../lib/sheets';
import { UserSecurityScope, filterAuthorizedEmployees, getAuthorizedEmployeeIdSet } from '../lib/security';
import { 
  Loader2, Download, Search, Filter, RefreshCw, AlertTriangle, 
  Target, Users, Wrench, Award, CheckCircle, Clock, Grid3X3, 
  Layers, Plus, FileSpreadsheet, Shield
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { SkillRecord, EmployeeInfo, MachineInfo, SKILL_LEVELS } from './skill/types';
import SkillManagement from './skill/SkillManagement';
import SkillMatrixGrid from './skill/SkillMatrixGrid';

export default function SkillMatrixDashboard({ 
  spreadsheetId, 
  userSecurityScope 
}: { 
  spreadsheetId: string; 
  userSecurityScope?: UserSecurityScope;
}) {
  const [employees, setEmployees] = useState<EmployeeInfo[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeInfo[]>([]);
  const [machines, setMachines] = useState<MachineInfo[]>([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'manage' | 'employees' | 'machines' | 'skillgaps' | 'training' | 'reports'>('dashboard');
  
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'matrix', label: 'Skill Matrix Grid', icon: Grid3X3 },
    { id: 'manage', label: 'Manage Skills', icon: Award },
    { id: 'employees', label: 'Employee Profiles', icon: Users },
    { id: 'machines', label: 'Machine Coverage', icon: Wrench },
    { id: 'skillgaps', label: 'Skill Gaps', icon: AlertTriangle },
    { id: 'training', label: 'Training Needs', icon: Clock },
    { id: 'reports', label: 'Export Reports', icon: FileSpreadsheet }
  ];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eRaw, mRaw, sRaw] = await Promise.all([
        getRange(spreadsheetId, 'Employees!A:Z'),
        getRange(spreadsheetId, 'MachineCapacity!A:Z'),
        getRange(spreadsheetId, 'SkillMatrix!A:Z')
      ]);

      const rawEmployees = eRaw.length > 1 ? eRaw.slice(1) : [];
      const authorizedRawEmps = filterAuthorizedEmployees(rawEmployees, userSecurityScope);
      const authorizedIdSet = getAuthorizedEmployeeIdSet(rawEmployees, userSecurityScope);

      const allEmpList: EmployeeInfo[] = rawEmployees.map(row => ({
        id: String(row[0] || '').trim(),
        name: String(row[1] || '').trim(),
        designation: String(row[2] || '').trim(),
        department: String(row[3] || '').trim(),
        supervisorName: String(row[6] || '').trim(),
        status: String(row[9] || 'Active').trim(),
        shift: String(row[13] || 'Day Shift').trim()
      })).filter(e => e.id);

      const empData: EmployeeInfo[] = authorizedRawEmps.map(row => ({
        id: String(row[0] || '').trim(),
        name: String(row[1] || '').trim(),
        designation: String(row[2] || '').trim(),
        department: String(row[3] || '').trim(),
        supervisorName: String(row[6] || '').trim(),
        status: String(row[9] || 'Active').trim(),
        shift: String(row[13] || 'Day Shift').trim()
      })).filter(e => e.id);

      const machData: MachineInfo[] = (mRaw.length > 1 ? mRaw.slice(1) : []).map(row => {
        const aShift = Number(row[12]) || 0;
        const bShift = Number(row[13]) || 0;
        const gShift = Number(row[14]) || 0;
        return {
          brand: String(row[0] || '').trim(),
          department: String(row[1] || '').trim(),
          processName: String(row[3] || '').trim(),
          machineName: String(row[4] || row[0] || '').trim(),
          standardUnit: String(row[5] || 'Pcs').trim(),
          dayShiftReq: aShift,
          nightShiftReq: bShift,
          generalShiftReq: gShift,
          machineNo: String(row[20] || '').trim(),
          reqOperators: Math.max(1, aShift + bShift + gShift)
        };
      }).filter(m => m.machineName);

      const empLookup = new Map<string, EmployeeInfo>();
      allEmpList.forEach(e => empLookup.set(e.id.toUpperCase(), e));

      const machLookup = new Map<string, MachineInfo>();
      machData.forEach(m => machLookup.set(m.machineName.toLowerCase(), m));

      const skillRows = sRaw.length > 1 ? sRaw.slice(1) : [];
      const skillData: SkillRecord[] = skillRows.map((row, idx) => {
        const empId = String(row[0] || '').trim().toUpperCase();
        const machineName = String(row[1] || '').trim();
        const rawLvl = String(row[2] || '0').trim();
        const lvlNum = parseInt(rawLvl.replace(/\D/g, ''), 10) || 0;
        
        const machObj = machLookup.get(machineName.toLowerCase());
        const empObj = empLookup.get(empId);

        const processName = String(row[3] || machObj?.processName || 'General Operation').trim();
        const department = String(row[4] || empObj?.department || machObj?.department || '').trim();
        const remarks = String(row[5] || '').trim();
        const evaluatedBy = String(row[6] || '').trim();
        const updatedAt = String(row[7] || '').trim();

        return {
          rowIndex: idx,
          empId,
          empName: empObj?.name || empId,
          empDepartment: empObj?.department || department,
          empDesignation: empObj?.designation || '',
          machineName,
          processName,
          department,
          level: Math.min(5, Math.max(0, lvlNum)),
          remarks,
          evaluatedBy,
          updatedAt
        };
      }).filter(s => {
        if (!s.empId || !s.machineName) return false;
        if (userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all') {
          return authorizedIdSet.has(s.empId);
        }
        return true;
      });

      setAllEmployees(allEmpList);
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
    deptAnalysis, 
    multiCategories
  } = useMemo(() => {
    
    const REQ_SKILL_LEVEL = 3; // Target Competent level

    const filteredEmp = employees.filter(e => deptFilter === 'All' || e.department === deptFilter);
    const empIds = new Set(filteredEmp.map(e => e.id.toUpperCase()));
    
    // Total Employees
    const tEmp = filteredEmp.length;

    // Total Machines
    const filteredMach = machines.filter(m => deptFilter === 'All' || m.department === deptFilter);
    const machNames = new Set(filteredMach.map(m => m.machineName.toLowerCase()));
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
      if (empO && s.level > 0) {
        empO.machines += 1;
        empO.skillsCount += 1;
        empO.highestLevel = Math.max(empO.highestLevel, s.level);
        empO.totalLvl += s.level;
        empO.machineList.push(s.machineName);
        
        const gap = REQ_SKILL_LEVEL - s.level;
        let tStatus = 'Qualified';
        if (gap >= 2) { tStatus = 'Major Training Required'; missingSkills++; needsTraining++; empO.trainingReq++; }
        else if (gap === 1) { tStatus = 'Minor Training Required'; missingSkills++; needsTraining++; empO.trainingReq++; }
        
        empO.skillDetails.push({ 
          machine: s.machineName, 
          process: s.processName,
          current: s.level, 
          req: REQ_SKILL_LEVEL, 
          gap: gap > 0 ? gap : 0, 
          status: tStatus 
        });

        const count = multiSkilled.get(s.empId) || 0;
        multiSkilled.set(s.empId, count + 1);
      }
    });

    let mCount = 0;
    multiSkilled.forEach(v => { if (v > 1) mCount++; });

    const multiCategories = [
      { name: '1 Machine', count: 0 },
      { name: '2 Machines', count: 0 },
      { name: '3 Machines', count: 0 },
      { name: '4+ Machines', count: 0 }
    ];
    multiSkilled.forEach(count => {
      if (count === 1) multiCategories[0].count++;
      else if (count === 2) multiCategories[1].count++;
      else if (count === 3) multiCategories[2].count++;
      else if (count >= 4) multiCategories[3].count++;
    });

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
      machOverviewMap.set(m.machineName.toLowerCase(), {
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
      if (mO && s.level > 0) {
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
      multiCategories,
      deptAnalysis: dAnalysis
    };

  }, [employees, machines, skills, deptFilter]);

  const COLORS = ['#94a3b8', '#38bdf8', '#22c55e', '#a855f7', '#f59e0b'];

  // Export Comprehensive Excel Report
  const handleExportFullReport = () => {
    const matrixExport = skills.map(s => {
      const lvl = SKILL_LEVELS.find(l => l.level === s.level);
      return {
        'Employee ID': s.empId,
        'Employee Name': s.empName || '',
        'Department': s.department || s.empDepartment || '',
        'Designation': s.empDesignation || '',
        'Machine Name': s.machineName,
        'Process Name': s.processName,
        'Skill Level': s.level,
        'Rating': lvl?.shortLabel || `Level ${s.level}`,
        'Remarks': s.remarks || '',
        'Evaluated By': s.evaluatedBy || '',
        'Date Evaluated': s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ''
      };
    });

    const gapExport = employeeOverview.flatMap(e => 
      e.skillDetails.filter((s: any) => s.gap > 0).map((s: any) => ({
        'Employee ID': e.id,
        'Employee Name': e.name,
        'Department': e.department,
        'Machine': s.machine,
        'Process': s.process,
        'Current Level': s.current,
        'Target Level': s.req,
        'Gap': s.gap,
        'Training Status': s.status
      }))
    );

    const coverageExport = machineOverview.map(m => ({
      'Machine Name': m.machineName,
      'Machine No': m.machineNo || '',
      'Department': m.department,
      'Process Name': m.processName,
      'Qualified Operators (L3+)': m.qualifiedCount,
      'Required Operators': m.reqOperators,
      'Coverage %': `${m.coverage}%`,
      'Risk Status': m.status
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(matrixExport);
    const ws2 = XLSX.utils.json_to_sheet(gapExport);
    const ws3 = XLSX.utils.json_to_sheet(coverageExport);

    XLSX.utils.book_append_sheet(wb, ws1, 'Skill_Matrix');
    XLSX.utils.book_append_sheet(wb, ws2, 'Skill_Gaps_Training');
    XLSX.utils.book_append_sheet(wb, ws3, 'Machine_Coverage');

    XLSX.writeFile(wb, `Skill_Matrix_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
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

  const isRestrictedScope = Boolean(userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all');

  return (
    <div className="h-full overflow-y-auto bg-slate-50 custom-scrollbar pb-10">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" /> Skill Matrix Navigator
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Operator Machine & Process-wise Competency Mapping & Gap Analysis
          </p>
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
          <button 
            onClick={loadData} 
            className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors border border-indigo-200" 
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Security Scope Banner */}
      {isRestrictedScope && (
        <div className="mx-8 mt-4 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-amber-900 text-sm">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Security Access Scoped:</strong> You have skill mapping authorization for <strong>{employees.length} employee{employees.length !== 1 ? 's' : ''}</strong>
              {userSecurityScope?.supervisorName ? ` under Supervisor "${userSecurityScope.supervisorName}"` : ''}
              {userSecurityScope?.accessLimitType === 'department' && userSecurityScope?.assignedDepartment ? ` in Department "${userSecurityScope.assignedDepartment}"` : ''}.
            </span>
          </div>
          <span className="bg-amber-200/80 text-amber-800 text-xs px-2.5 py-1 rounded-md font-semibold uppercase">
            {userSecurityScope?.accessLimitType} Mode
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-8 flex gap-2 md:gap-4 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                isActive 
                  ? 'border-indigo-600 text-indigo-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard title="Total Operators" value={totalEmployees} icon={Users} color="bg-indigo-500" subtitle="Authorized in System" />
              <KpiCard title="Total Machines" value={totalMachines} icon={Wrench} color="bg-sky-500" subtitle="Configured in Capacity" />
              <KpiCard title="Skill Coverage" value={`${coveragePercent}%`} icon={CheckCircle} color={Number(coveragePercent) >= 100 ? "bg-emerald-500" : Number(coveragePercent) > 50 ? "bg-amber-500" : "bg-rose-500"} subtitle="Competent (L3+) vs Required" />
              <KpiCard title="Training Required" value={trainingRequired} icon={AlertTriangle} color="bg-rose-500" subtitle="Operators with skill gaps" />
              <KpiCard title="Average Skill Level" value={avgSkillLevel} icon={Award} color="bg-violet-500" subtitle="Out of 5.0 scale" />
              <KpiCard title="Total Skill Mappings" value={totalSkills} icon={Layers} color="bg-teal-500" subtitle="Active machine-operator pairs" />
              <KpiCard title="Multi-Skilled Operators" value={multiSkilledCount} icon={Users} color="bg-emerald-600" subtitle="Operators with 2+ machines" />
              <KpiCard title="Critical Machines" value={machineOverview.filter(m => m.status === '🔴 Critical').length} icon={AlertTriangle} color="bg-red-600" subtitle="Zero qualified operators" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Skill Level Distribution */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800">Competency Level Distribution</h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {totalSkills} Mappings
                  </span>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 10, left: 10, bottom: 10 }}>
                      <Pie 
                        data={levelDistribution} 
                        dataKey="count" 
                        nameKey="name" 
                        cx="50%" 
                        cy="42%" 
                        innerRadius={48} 
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {levelDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any, name: any) => [
                          `${value} Operator${value !== 1 ? 's' : ''} (${totalSkills > 0 ? ((Number(value) / totalSkills) * 100).toFixed(1) : 0}%)`,
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '0.75rem',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                          paddingTop: '16px',
                          fontSize: '11px',
                          lineHeight: '1.5'
                        }}
                        formatter={(value: string) => (
                          <span className="text-slate-700 font-semibold mx-1">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Coverage */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Department-wise Operator Skill Analysis</h3>
                    <p className="text-xs text-slate-500">Breakdown of total operators, certified skilled operators, and training requirements</p>
                  </div>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={deptAnalysis} 
                      margin={{ top: 15, right: 20, left: -15, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={{ stroke: '#cbd5e1' }} 
                        tickLine={false} 
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={55}
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                        tickFormatter={(val: string) => (val && val.length > 18 ? `${val.substring(0, 16)}...` : val)}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        allowDecimals={false}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '0.75rem',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                          paddingBottom: '14px',
                          fontSize: '12px'
                        }}
                        formatter={(value: string) => (
                          <span className="text-slate-700 font-semibold">{value}</span>
                        )}
                      />
                      <Bar dataKey="emps" name="Total Operators" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="skilledEmps" name="Skilled Operators" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
                  <AlertTriangle className="w-5 h-5 text-rose-600" /> Critical Machine Coverage Risk
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-rose-800 border-b border-rose-200">
                        <th className="pb-3 font-bold">Machine</th>
                        <th className="pb-3 font-bold">Process Name</th>
                        <th className="pb-3 font-bold">Department</th>
                        <th className="pb-3 font-bold text-center">Qualified (L3+)</th>
                        <th className="pb-3 font-bold text-center">Required</th>
                        <th className="pb-3 font-bold text-center">Coverage</th>
                        <th className="pb-3 font-bold">Risk Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-200/50">
                      {machineOverview.filter(m => m.risk !== 'Low').sort((a,b) => a.coverage - b.coverage).slice(0, 10).map((m, i) => (
                        <tr key={i} className="text-rose-950">
                          <td className="py-3 font-semibold">{m.machineName} {m.machineNo ? `(${m.machineNo})` : ''}</td>
                          <td className="py-3 font-medium text-rose-800">{m.processName || '—'}</td>
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
          </>
        )}

        {/* TAB 2: INTERACTIVE 2D MATRIX GRID */}
        {activeTab === 'matrix' && (
          <SkillMatrixGrid
            spreadsheetId={spreadsheetId}
            skills={skills}
            employees={employees}
            machines={machines}
            userSecurityScope={userSecurityScope}
            onRefresh={loadData}
          />
        )}

        {/* TAB 3: MANAGE SKILLS (Add, Edit, Bulk Assign, Excel Import/Export) */}
        {activeTab === 'manage' && (
          <SkillManagement
            spreadsheetId={spreadsheetId}
            skills={skills}
            employees={employees}
            machines={machines}
            userSecurityScope={userSecurityScope}
            onRefresh={loadData}
          />
        )}
        
        {/* TAB 4: EMPLOYEE COMPETENCY PROFILES */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Operator Competency Overview</h3>
                <p className="text-xs text-slate-500 mt-0.5">Comprehensive multi-skilling and training requirement summary per operator</p>
              </div>
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
                    .map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-slate-500">{e.id}</td>
                      <td className="px-6 py-3 font-bold text-slate-800">
                        {e.name}
                        {e.designation && <span className="block text-xs font-normal text-slate-400">{e.designation}</span>}
                      </td>
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
                          e.overallStatus === 'Expert' ? 'bg-amber-100 text-amber-800' :
                          e.overallStatus === 'Qualified' ? 'bg-emerald-100 text-emerald-800' :
                          e.overallStatus === 'Training Required' ? 'bg-rose-100 text-rose-700' :
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
        )}
        
        {/* TAB 5: MACHINE OPERATOR COVERAGE */}
        {activeTab === 'machines' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Machine Operator Coverage & Planning</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-600">
                    <th className="px-6 py-4 font-bold">Machine</th>
                    <th className="px-6 py-4 font-bold">Process Name</th>
                    <th className="px-6 py-4 font-bold">Department</th>
                    <th className="px-6 py-4 font-bold text-center">Qualified Operators (L3+)</th>
                    <th className="px-6 py-4 font-bold text-center">Required Operators</th>
                    <th className="px-6 py-4 font-bold text-center">Coverage</th>
                    <th className="px-6 py-4 font-bold">Risk Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {machineOverview.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-800">{m.machineName} {m.machineNo ? `(${m.machineNo})` : ''}</td>
                      <td className="px-6 py-3 text-slate-600 font-medium">{m.processName || '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{m.department}</td>
                      <td className="px-6 py-3 text-center font-bold text-indigo-600">{m.qualifiedCount}</td>
                      <td className="px-6 py-3 text-center">{m.reqOperators}</td>
                      <td className="px-6 py-3 text-center font-mono font-bold text-slate-700">{m.coverage}%</td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${m.status === '🔴 Critical' ? 'bg-rose-100 text-rose-700' : m.status === '🟡 Risk' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
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

        {/* TAB 6: SKILL GAPS */}
        {activeTab === 'skillgaps' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Skill Gap Analysis (Target: Level 3 Competent)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-600">
                    <th className="px-6 py-4 font-bold">Employee</th>
                    <th className="px-6 py-4 font-bold">Machine</th>
                    <th className="px-6 py-4 font-bold">Process Name</th>
                    <th className="px-6 py-4 font-bold text-center">Current Level</th>
                    <th className="px-6 py-4 font-bold text-center">Required Level</th>
                    <th className="px-6 py-4 font-bold text-center">Gap</th>
                    <th className="px-6 py-4 font-bold">Action Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeOverview.flatMap(e => 
                    e.skillDetails.filter((s: any) => s.gap > 0).map((s: any, i: number) => (
                      <tr key={`${e.id}-${i}`} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-semibold text-slate-800">
                          {e.name} <span className="text-slate-400 font-mono text-xs">({e.id})</span>
                        </td>
                        <td className="px-6 py-3 text-slate-800 font-medium">{s.machine}</td>
                        <td className="px-6 py-3 text-slate-600">{s.process || 'General Operation'}</td>
                        <td className="px-6 py-3 text-center font-bold text-slate-700">{s.current}</td>
                        <td className="px-6 py-3 text-center text-slate-500">{s.req}</td>
                        <td className="px-6 py-3 text-center font-bold text-rose-600">-{s.gap}</td>
                        <td className="px-6 py-3">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: TRAINING NEEDS */}
        {activeTab === 'training' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Operator Training Priority Action List</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-600">
                    <th className="px-6 py-4 font-bold">Priority</th>
                    <th className="px-6 py-4 font-bold">Operator</th>
                    <th className="px-6 py-4 font-bold">Department</th>
                    <th className="px-6 py-4 font-bold">Machine</th>
                    <th className="px-6 py-4 font-bold">Process Name</th>
                    <th className="px-6 py-4 font-bold text-center">Gap Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeOverview.flatMap(e => 
                    e.skillDetails.filter((s: any) => s.gap > 0).map((s: any) => ({...s, emp: e}))
                  ).sort((a,b) => b.gap - a.gap).map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          {item.gap >= 2 ? (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">🔴 High Priority</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">🟡 Medium Priority</span>
                          )}
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-800">{item.emp.name}</td>
                        <td className="px-6 py-3 text-slate-600">{item.emp.department}</td>
                        <td className="px-6 py-3 text-slate-800 font-medium">{item.machine}</td>
                        <td className="px-6 py-3 text-slate-600">{item.process || 'General Operation'}</td>
                        <td className="px-6 py-3 text-center font-bold text-slate-700">+{item.gap} Level(s)</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: EXPORT REPORTS */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Export Complete Skill Matrix Reports</h3>
            <p className="text-slate-500 mb-6 max-w-lg text-sm">
              Generate a multi-tab Microsoft Excel (.xlsx) workbook containing the complete operator competency matrix, machine-wise & process-wise mappings, skill gap analysis, and machine operator coverage.
            </p>
            <button 
              onClick={handleExportFullReport} 
              className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Excel Workbook (.xlsx)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

