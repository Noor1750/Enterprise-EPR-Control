import React, { useMemo, useState } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle2, Clock, ArchiveX, 
  Users, Settings2, UserX, Search, Filter, Wrench, ShieldAlert,
  Layers, ArrowUpRight, Gauge, Briefcase, Zap, Info, ChevronRight
} from 'lucide-react';
import { getMachineStatus, parseCleanNumber } from '../../lib/machineEngine';

interface MachineDashboardProps {
  machines: string[][];
  employees?: string[][];
  assignments?: string[][];
}

export default function MachineDashboard({ machines, employees = [], assignments = [] }: MachineDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'machine-capacity' | 'unassigned'>('overview');
  
  // Search & Filter state for Machine Capacity Tab
  const [machineSearch, setMachineSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Fully Staffed' | 'Partially Staffed' | 'Vacant'>('All');

  // Search & Filter state for Unassigned Staff Tab
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedDeptFilter, setUnassignedDeptFilter] = useState('All');
  const [unassignedRoleFilter, setUnassignedRoleFilter] = useState('All');

  // Process Assignments & Actual Capacity
  const processedData = useMemo(() => {
    // 1. Get all active shift assignments
    const activeAssignments = assignments.filter(a => {
      const status = (a[10] || '').trim().toLowerCase();
      return status === 'active' || !status; // Default to active if status column empty
    });

    // 2. Map Machine -> Shift Manpower & Employee Details
    // machineId or machineName -> { day: [], night: [], general: [] }
    const machineShiftEmployees = new Map<string, {
      day: { id: string; name: string }[];
      night: { id: string; name: string }[];
      general: { id: string; name: string }[];
    }>();

    const assignedEmpIds = new Set<string>();

    activeAssignments.forEach(a => {
      const shiftId = (a[2] || '').trim();
      const shiftName = (a[3] || '').trim().toLowerCase();
      const machineKey = (a[5] || a[4] || '').trim(); // Machine Name or ID
      const empId = (a[6] || '').trim();
      const empName = (a[7] || '').trim();

      if (empId) assignedEmpIds.add(empId);

      if (machineKey && !machineKey.startsWith('JOB-')) {
        const lowerKey = machineKey.toLowerCase();
        if (!machineShiftEmployees.has(lowerKey)) {
          machineShiftEmployees.set(lowerKey, { day: [], night: [], general: [] });
        }
        const data = machineShiftEmployees.get(lowerKey)!;

        // Classify shift
        if (shiftId === 'SHF-001' || shiftName.includes('day') || shiftName.includes('morning') || shiftName.includes('a shift') || shiftName.includes('shift a')) {
          data.day.push({ id: empId, name: empName });
        } else if (shiftId === 'SHF-002' || shiftName.includes('night') || shiftName.includes('evening') || shiftName.includes('b shift') || shiftName.includes('shift b')) {
          data.night.push({ id: empId, name: empName });
        } else {
          data.general.push({ id: empId, name: empName });
        }
      }
    });

    // 3. Process each Machine with Shift-wise Required vs Assigned and Accurate Capacity
    let totalTheoreticalCapPcs = 0;
    let totalActualCurrentCapPcs = 0;
    let totalTheoreticalCapUnit = 0;
    let totalActualCurrentCapUnit = 0;
    let totalReqManpower = 0;
    let totalActManpower = 0;

    let fullyStaffedCount = 0;
    let partiallyStaffedCount = 0;
    let vacantCount = 0;

    const deptCapStats: Record<string, { theoreticalPcs: number; actualPcs: number; machinesCount: number }> = {};

    const machineList = machines.map((m, idx) => {
      const machineName = m[4] || `Machine #${idx + 1}`;
      const brand = m[0] || '';
      const dept = m[1] || 'General';
      const process = m[3] || '';
      const isCounted = (m[19] || 'Yes') === 'Yes';
      const machineStatus = getMachineStatus(m[24], m[25], new Date().toISOString());

      const speedVal = parseCleanNumber(m[7]) || parseCleanNumber(m[6]) || 0;
      let utilVal = parseCleanNumber(m[8]);
      if (utilVal > 0 && utilVal <= 1) utilVal = utilVal * 100;
      const convVal = parseCleanNumber(m[9]) || 1;

      const isKonica = machineName.toLowerCase().includes('konica');

      // Shift-wise Required Manpower
      const reqDay = Number(m[12]) || 0;
      const reqNight = Number(m[13]) || 0;
      const reqGen = Number(m[14]) || 0;
      const reqTotal = reqDay + reqNight + reqGen;

      // Actual Assigned Manpower for this machine
      const lowerName = machineName.toLowerCase();
      const assignedData = machineShiftEmployees.get(lowerName) || { day: [], night: [], general: [] };

      const actDay = assignedData.day.length;
      const actNight = assignedData.night.length;
      const actGen = assignedData.general.length;
      const actTotal = actDay + actNight + actGen;

      // 8-hour single shift theoretical capacity
      const cap8hUnit = isKonica
        ? (speedVal / 2) * 60 * 8 * (utilVal / 100)
        : speedVal * 60 * 8 * (utilVal / 100);
      const cap8hPcs = cap8hUnit * convVal;

      // 16-hour rated theoretical capacity
      const rated16hUnit = cap8hUnit * 2;
      const rated16hPcs = cap8hPcs * 2;

      // Calculate shift-wise active status and actual current capacity
      // A shift is active/producing ONLY if manpower is assigned (act > 0)
      const dayIsStaffed = reqDay > 0 && actDay > 0;
      const nightIsStaffed = reqNight > 0 && actNight > 0;
      const genIsStaffed = reqGen > 0 && actGen > 0;

      // If machine requires Day & Night (2 shifts) or 1 shift:
      let actualShiftsOperating = 0;
      let actualCurrentCapPcs = 0;
      let actualCurrentCapUnit = 0;

      if (actDay > 0) {
        // If partially staffed (e.g. req 2 operators, only 1 assigned), ratio could apply or full shift count
        const dayStaffRatio = reqDay > 0 ? Math.min(actDay / reqDay, 1) : 1;
        actualCurrentCapPcs += cap8hPcs * dayStaffRatio;
        actualCurrentCapUnit += cap8hUnit * dayStaffRatio;
        actualShiftsOperating += dayStaffRatio;
      }
      if (actNight > 0) {
        const nightStaffRatio = reqNight > 0 ? Math.min(actNight / reqNight, 1) : 1;
        actualCurrentCapPcs += cap8hPcs * nightStaffRatio;
        actualCurrentCapUnit += cap8hUnit * nightStaffRatio;
        actualShiftsOperating += nightStaffRatio;
      }
      if (actGen > 0) {
        const genStaffRatio = reqGen > 0 ? Math.min(actGen / reqGen, 1) : 1;
        actualCurrentCapPcs += cap8hPcs * genStaffRatio;
        actualCurrentCapUnit += cap8hUnit * genStaffRatio;
        actualShiftsOperating += genStaffRatio;
      }

      // Determine Staffing State
      let staffingStatus: 'Fully Staffed' | 'Partially Staffed' | 'Vacant';
      if (actTotal === 0) {
        staffingStatus = 'Vacant';
        vacantCount++;
      } else if (
        (reqDay > 0 && actDay >= reqDay) &&
        (reqNight === 0 || actNight >= reqNight) &&
        (reqGen === 0 || actGen >= reqGen)
      ) {
        staffingStatus = 'Fully Staffed';
        fullyStaffedCount++;
      } else {
        staffingStatus = 'Partially Staffed';
        partiallyStaffedCount++;
      }

      if (isCounted && machineStatus === 'Active') {
        totalTheoreticalCapPcs += rated16hPcs;
        totalActualCurrentCapPcs += actualCurrentCapPcs;
        totalTheoreticalCapUnit += rated16hUnit;
        totalActualCurrentCapUnit += actualCurrentCapUnit;
        totalReqManpower += reqTotal;
        totalActManpower += actTotal;

        if (!deptCapStats[dept]) {
          deptCapStats[dept] = { theoreticalPcs: 0, actualPcs: 0, machinesCount: 0 };
        }
        deptCapStats[dept].theoreticalPcs += rated16hPcs;
        deptCapStats[dept].actualPcs += actualCurrentCapPcs;
        deptCapStats[dept].machinesCount += 1;
      }

      return {
        brand,
        dept,
        process,
        name: machineName,
        modelNumber: m[21] || '',
        serialNumber: m[22] || '',
        speedVal,
        utilVal,
        convVal,
        isCounted,
        machineStatus,
        reqDay, reqNight, reqGen, reqTotal,
        actDay, actNight, actGen, actTotal,
        dayEmployees: assignedData.day,
        nightEmployees: assignedData.night,
        generalEmployees: assignedData.general,
        rated16hPcs: Math.round(rated16hPcs),
        rated16hUnit: Math.round(rated16hUnit),
        actualCurrentCapPcs: Math.round(actualCurrentCapPcs),
        actualCurrentCapUnit: Math.round(actualCurrentCapUnit),
        staffingStatus,
        isVacant: actTotal === 0,
        dayVacant: reqDay > 0 && actDay === 0,
        nightVacant: reqNight > 0 && actNight === 0,
        capacityUtilizationPct: rated16hPcs > 0 ? Number(((actualCurrentCapPcs / rated16hPcs) * 100).toFixed(1)) : 0
      };
    });

    // 4. Identify All Unassigned Employees
    // Active employees in master DB that do not have active assignment on any machine
    const unassignedStaff = employees.filter(e => {
      const empId = (e[0] || '').trim();
      const status = (e[9] || 'Active').trim().toLowerCase();
      if (status !== 'active') return false;
      return !assignedEmpIds.has(empId);
    }).map(e => {
      const empId = String(e[0] || '');
      const name = String(e[1] || '');
      const designation = String(e[2] || '');
      const department = String(e[3] || 'General');
      const dateOfJoin = String(e[4] || '');
      const category = String(e[5] || 'Non-Management');
      const phone = String(e[8] || '');
      
      // Categorize function / role
      const lowerDesig = designation.toLowerCase();
      const lowerDept = department.toLowerCase();
      
      let roleType = 'Supporting Staff';
      if (lowerDesig.includes('operator') || lowerDesig.includes('helper') || lowerDesig.includes('printer') || lowerDesig.includes('machinist')) {
        roleType = 'Machine Operator (Available)';
      } else if (lowerDept.includes('plan') || lowerDesig.includes('plan')) {
        roleType = 'Planning';
      } else if (lowerDept.includes('qual') || lowerDept.includes('qc') || lowerDept.includes('qa') || lowerDesig.includes('quality') || lowerDesig.includes('inspector')) {
        roleType = 'Quality (QA/QC)';
      } else if (lowerDept.includes('logis') || lowerDesig.includes('logis')) {
        roleType = 'Logistics';
      } else if (lowerDept.includes('wms') || lowerDept.includes('ware') || lowerDesig.includes('warehouse') || lowerDesig.includes('inventory')) {
        roleType = 'WMS / Warehouse';
      } else if (lowerDept.includes('maint') || lowerDept.includes('eng') || lowerDesig.includes('technician') || lowerDesig.includes('electric') || lowerDesig.includes('engineer')) {
        roleType = 'Maintenance / Engineering';
      } else if (lowerDesig.includes('incharge') || lowerDesig.includes('supervisor') || lowerDesig.includes('team lead') || lowerDesig.includes('leader') || lowerDesig.includes('officer')) {
        roleType = 'Supervisor / Shift Incharge';
      } else if (category === 'Management' || lowerDesig.includes('manager') || lowerDesig.includes('executive')) {
        roleType = 'Management / Administration';
      }

      return {
        id: empId,
        name,
        designation,
        department,
        dateOfJoin,
        category,
        phone,
        roleType
      };
    });

    return {
      machineList,
      totalTheoreticalCapPcs,
      totalActualCurrentCapPcs,
      totalTheoreticalCapUnit,
      totalActualCurrentCapUnit,
      totalReqManpower,
      totalActManpower,
      manpowerDeficit: Math.max(0, totalReqManpower - totalActManpower),
      fullyStaffedCount,
      partiallyStaffedCount,
      vacantCount,
      deptCapStats,
      unassignedStaff,
      overallUtilizationPct: totalTheoreticalCapPcs > 0 ? Number(((totalActualCurrentCapPcs / totalTheoreticalCapPcs) * 100).toFixed(1)) : 0
    };
  }, [machines, assignments, employees]);

  // Unique departments for filters
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    machines.forEach(m => {
      if (m[1]) set.add(m[1]);
    });
    return Array.from(set).sort();
  }, [machines]);

  // Unique unassigned departments & role types
  const unassignedDeptsList = useMemo(() => {
    const set = new Set<string>();
    processedData.unassignedStaff.forEach(u => set.add(u.department));
    return Array.from(set).sort();
  }, [processedData.unassignedStaff]);

  const unassignedRoleTypesList = useMemo(() => {
    const set = new Set<string>();
    processedData.unassignedStaff.forEach(u => set.add(u.roleType));
    return Array.from(set).sort();
  }, [processedData.unassignedStaff]);

  // Filtered Machine List
  const filteredMachines = useMemo(() => {
    return processedData.machineList.filter(m => {
      const matchSearch = !machineSearch.trim() || 
        m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
        m.dept.toLowerCase().includes(machineSearch.toLowerCase()) ||
        m.process.toLowerCase().includes(machineSearch.toLowerCase()) ||
        m.brand.toLowerCase().includes(machineSearch.toLowerCase());

      const matchDept = deptFilter === 'All' || m.dept === deptFilter;
      const matchStatus = statusFilter === 'All' || m.staffingStatus === statusFilter;

      return matchSearch && matchDept && matchStatus;
    });
  }, [processedData.machineList, machineSearch, deptFilter, statusFilter]);

  // Filtered Unassigned Staff
  const filteredUnassignedStaff = useMemo(() => {
    return processedData.unassignedStaff.filter(emp => {
      const matchSearch = !unassignedSearch.trim() ||
        emp.name.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
        emp.id.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
        emp.designation.toLowerCase().includes(unassignedSearch.toLowerCase());

      const matchDept = unassignedDeptFilter === 'All' || emp.department === unassignedDeptFilter;
      const matchRole = unassignedRoleFilter === 'All' || emp.roleType === unassignedRoleFilter;

      return matchSearch && matchDept && matchRole;
    });
  }, [processedData.unassignedStaff, unassignedSearch, unassignedDeptFilter, unassignedRoleFilter]);

  return (
    <div className="space-y-6">
      
      {/* Top Parameter Sub-Navigation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Activity className="w-4 h-4" />
              Capacity & Manpower Overview
            </button>

            <button
              onClick={() => setActiveTab('machine-capacity')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'machine-capacity'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Machine-Wise Actual Capacity ({processedData.machineList.length})
            </button>

            <button
              onClick={() => setActiveTab('unassigned')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'unassigned'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <UserX className="w-4 h-4" />
              Unassigned & Support Staff
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'unassigned' ? 'bg-indigo-700 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {processedData.unassignedStaff.length}
              </span>
            </button>
          </div>

          {/* Real-time Summary Badge */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-slate-500 font-medium">Current Staffed Cap:</span>
            <span className="font-mono font-black text-emerald-600">
              {Math.round(processedData.totalActualCurrentCapPcs).toLocaleString()} Pcs
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-700">{processedData.overallUtilizationPct}% Active</span>
          </div>

        </div>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Top 4 Core Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Actual Current Operating Capacity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Active Capacity</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 font-mono">
                  {Math.round(processedData.totalActualCurrentCapPcs).toLocaleString()}
                  <span className="text-xs font-bold text-slate-500 ml-1">Pcs/Day</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span>Based strictly on assigned shift manpower</span>
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>16h Theoretical:</span>
                <span className="font-mono font-bold text-slate-800">{Math.round(processedData.totalTheoreticalCapPcs).toLocaleString()} Pcs</span>
              </div>
            </div>

            {/* 2. Staffing & Machine Utilization Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operating Capacity Rate</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Gauge className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-indigo-700 font-mono">
                  {processedData.overallUtilizationPct}%
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Active vs 16-Hour Installed Potential
                </p>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full rounded-full transition-all ${
                    processedData.overallUtilizationPct >= 80 ? 'bg-emerald-500' :
                    processedData.overallUtilizationPct >= 50 ? 'bg-indigo-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(processedData.overallUtilizationPct, 100)}%` }}
                />
              </div>
            </div>

            {/* 3. Machine Staffing Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Machine Status</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-lg font-black text-emerald-700 font-mono block">{processedData.fullyStaffedCount}</span>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Staffed</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-lg font-black text-amber-700 font-mono block">{processedData.partiallyStaffedCount}</span>
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Partial</span>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                  <span className="text-lg font-black text-rose-700 font-mono block">{processedData.vacantCount}</span>
                  <span className="text-[10px] font-bold text-rose-800 uppercase">Vacant</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Total {processedData.machineList.length} production machines registered
              </p>
            </div>

            {/* 4. Shift Manpower Assigned vs Deficit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Manpower</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-purple-950 font-mono">
                  {processedData.totalActManpower} <span className="text-sm font-bold text-slate-400">/ {processedData.totalReqManpower} req</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {processedData.manpowerDeficit > 0 ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {processedData.manpowerDeficit} Operators Deficit / Vacant shifts
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All shifts fully manned
                    </span>
                  )}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Unassigned Staff Pool:</span>
                <span className="font-mono font-bold text-indigo-600">{processedData.unassignedStaff.length} employees</span>
              </div>
            </div>

          </div>

          {/* Department Breakdown Cards */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Department Capacity & Staffing Benchmark</h3>
                <p className="text-xs text-slate-500">Compare rated potential vs currently running capacity across production units</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(processedData.deptCapStats).map(([dept, data]) => {
                const utilPct = data.theoreticalPcs > 0 ? ((data.actualPcs / data.theoreticalPcs) * 100).toFixed(1) : '0';
                return (
                  <div key={dept} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{dept}</span>
                      <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-600">
                        {data.machinesCount} Machines
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Current Output:</span>
                        <span className="font-mono font-black text-emerald-600">{Math.round(data.actualPcs).toLocaleString()} Pcs</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">16h Capacity:</span>
                        <span className="font-mono font-bold text-slate-700">{Math.round(data.theoreticalPcs).toLocaleString()} Pcs</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Capacity Realization</span>
                        <span className="text-indigo-600">{utilPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.min(Number(utilPct), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: MACHINE-WISE ACTUAL CAPACITY & SHIFT MANPOWER TABLE */}
      {activeTab === 'machine-capacity' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Machine-Wise Capacity & Shift Manpower Assignment</h3>
              <p className="text-xs text-slate-500">Shift-wise required manpower vs active operator assignments. Vacant shifts produce 0 capacity.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search machine..."
                  value={machineSearch}
                  onChange={(e) => setMachineSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none w-48 font-medium"
                />
              </div>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Departments</option>
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Staffing Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Statuses</option>
                <option value="Fully Staffed">Fully Staffed</option>
                <option value="Partially Staffed">Partially Staffed</option>
                <option value="Vacant">Vacant (No Manpower)</option>
              </select>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="p-3">Machine Details</th>
                  <th className="p-3">Department & Process</th>
                  <th className="p-3 text-center bg-blue-50/70 border-x border-slate-200" colSpan={3}>
                    Shift Manpower Required
                    <div className="grid grid-cols-3 text-[10px] font-normal text-slate-500 mt-0.5">
                      <span>Shift A (Day)</span>
                      <span>Shift B (Night)</span>
                      <span>General</span>
                    </div>
                  </th>
                  <th className="p-3 text-center bg-emerald-50/70 border-r border-slate-200" colSpan={3}>
                    Actual Assigned Operators
                    <div className="grid grid-cols-3 text-[10px] font-normal text-slate-500 mt-0.5">
                      <span>Shift A (Day)</span>
                      <span>Shift B (Night)</span>
                      <span>General</span>
                    </div>
                  </th>
                  <th className="p-3 text-right">Rated 16h Cap (Pcs)</th>
                  <th className="p-3 text-right">Actual Cap (Pcs)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMachines.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Machine Name & Brand */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-[10px] text-slate-500">{m.brand || 'Standard'} {m.modelNumber ? `• ${m.modelNumber}` : ''}</div>
                    </td>

                    {/* Department & Process */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{m.dept}</div>
                      <div className="text-[10px] text-slate-500">{m.process || 'Production'}</div>
                    </td>

                    {/* Required Manpower */}
                    <td className="p-2.5 text-center text-slate-600 bg-blue-50/20 border-l border-slate-100 font-mono">
                      {m.reqDay > 0 ? m.reqDay : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-2.5 text-center text-slate-600 bg-blue-50/20 font-mono">
                      {m.reqNight > 0 ? m.reqNight : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-2.5 text-center text-slate-600 bg-blue-50/20 border-r border-slate-100 font-mono">
                      {m.reqGen > 0 ? m.reqGen : <span className="text-slate-300">-</span>}
                    </td>

                    {/* Actual Assigned Manpower */}
                    <td className="p-2.5 text-center bg-emerald-50/20 font-mono">
                      {m.actDay > 0 ? (
                        <div className="space-y-0.5">
                          <span className={`font-bold ${m.reqDay > 0 && m.actDay < m.reqDay ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {m.actDay} / {m.reqDay}
                          </span>
                          <div className="text-[9px] text-slate-500 truncate max-w-[90px] mx-auto" title={m.dayEmployees.map(e => e.name).join(', ')}>
                            {m.dayEmployees[0]?.name || ''}
                          </div>
                        </div>
                      ) : m.reqDay > 0 ? (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
                          Vacant
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="p-2.5 text-center bg-emerald-50/20 font-mono">
                      {m.actNight > 0 ? (
                        <div className="space-y-0.5">
                          <span className={`font-bold ${m.reqNight > 0 && m.actNight < m.reqNight ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {m.actNight} / {m.reqNight}
                          </span>
                          <div className="text-[9px] text-slate-500 truncate max-w-[90px] mx-auto" title={m.nightEmployees.map(e => e.name).join(', ')}>
                            {m.nightEmployees[0]?.name || ''}
                          </div>
                        </div>
                      ) : m.reqNight > 0 ? (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
                          Vacant
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="p-2.5 text-center bg-emerald-50/20 border-r border-slate-100 font-mono">
                      {m.actGen > 0 ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-emerald-700">{m.actGen}</span>
                          <div className="text-[9px] text-slate-500 truncate max-w-[90px] mx-auto" title={m.generalEmployees.map(e => e.name).join(', ')}>
                            {m.generalEmployees[0]?.name || ''}
                          </div>
                        </div>
                      ) : m.reqGen > 0 ? (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
                          Vacant
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Rated Potential 16h Capacity */}
                    <td className="p-3 text-right font-mono font-bold text-slate-600">
                      {m.rated16hPcs.toLocaleString()}
                    </td>

                    {/* Actual Current Operating Capacity */}
                    <td className="p-3 text-right font-mono font-black text-emerald-700">
                      {m.actualCurrentCapPcs > 0 ? (
                        m.actualCurrentCapPcs.toLocaleString()
                      ) : (
                        <span className="text-rose-500 font-bold">0 (No Staff)</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">
                      {m.staffingStatus === 'Fully Staffed' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">
                          Fully Staffed
                        </span>
                      ) : m.staffingStatus === 'Partially Staffed' ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold border border-amber-200">
                          1 Shift Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold border border-rose-200">
                          Vacant (0 Cap)
                        </span>
                      )}
                    </td>

                  </tr>
                ))}

                {filteredMachines.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No machines match the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: UNASSIGNED & SUPPORTING STAFF */}
      {activeTab === 'unassigned' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
          
          {/* Header & Description */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Unassigned & Supporting Personnel Directory</h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold font-mono">
                  {processedData.unassignedStaff.length} Employees
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff members not currently assigned to an active machine. Includes machine operators awaiting deployment and cross-departmental support (Planning, QA/QC, Logistics, WMS, Maintenance, Supervisors).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={unassignedSearch}
                  onChange={(e) => setUnassignedSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none w-44 font-medium"
                />
              </div>

              {/* Department Filter */}
              <select
                value={unassignedDeptFilter}
                onChange={(e) => setUnassignedDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Departments</option>
                {unassignedDeptsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Role Type Filter */}
              <select
                value={unassignedRoleFilter}
                onChange={(e) => setUnassignedRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Role Types</option>
                {unassignedRoleTypesList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unassigned Quick Role Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { label: 'Operators Available', count: processedData.unassignedStaff.filter(s => s.roleType.includes('Operator')).length, bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
              { label: 'Planning', count: processedData.unassignedStaff.filter(s => s.roleType.includes('Planning')).length, bg: 'bg-blue-50 text-blue-800 border-blue-200' },
              { label: 'Quality / QA', count: processedData.unassignedStaff.filter(s => s.roleType.includes('Quality')).length, bg: 'bg-teal-50 text-teal-800 border-teal-200' },
              { label: 'Logistics / WMS', count: processedData.unassignedStaff.filter(s => s.roleType.includes('Logistics') || s.roleType.includes('WMS')).length, bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
              { label: 'Maintenance', count: processedData.unassignedStaff.filter(s => s.roleType.includes('Maintenance')).length, bg: 'bg-amber-50 text-amber-800 border-amber-200' },
              { label: 'Supervisors / Lead', count: processedData.unassignedStaff.filter(s => s.roleType.includes('Supervisor')).length, bg: 'bg-purple-50 text-purple-800 border-purple-200' },
              { label: 'Management', count: processedData.unassignedStaff.filter(s => s.roleType.includes('Management')).length, bg: 'bg-slate-100 text-slate-800 border-slate-200' },
            ].map((cat, i) => (
              <div key={i} className={`p-2.5 rounded-xl border text-center ${cat.bg}`}>
                <span className="text-base font-black font-mono block leading-tight">{cat.count}</span>
                <span className="text-[10px] font-bold truncate block">{cat.label}</span>
              </div>
            ))}
          </div>

          {/* Unassigned Staff Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Functional Role Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUnassignedStaff.map((emp, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700">{emp.id}</td>
                    <td className="p-3 font-bold text-slate-900">{emp.name}</td>
                    <td className="p-3 text-slate-700">{emp.department}</td>
                    <td className="p-3 text-slate-600">{emp.designation}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        emp.roleType.includes('Operator') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        emp.roleType.includes('Planning') ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        emp.roleType.includes('Quality') ? 'bg-teal-50 text-teal-800 border-teal-200' :
                        emp.roleType.includes('Maintenance') ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        emp.roleType.includes('Supervisor') ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {emp.roleType}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.category === 'Management' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {emp.category}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                        Unassigned
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredUnassignedStaff.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No unassigned staff found for this search/filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
