import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, ArchiveX, HelpCircle, Users, Settings2, UserX } from 'lucide-react';
import { getMachineStatus, parseCleanNumber } from '../../lib/machineEngine';

interface MachineDashboardProps {
  machines: string[][];
  employees?: string[][];
  assignments?: string[][];
}

export default function MachineDashboard({ machines, employees = [], assignments = [] }: MachineDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'machine-capacity' | 'unassigned'>('overview');

  const stats = useMemo(() => {
    let totalMachines = 0;
    let countedMachines = 0;
    let totalAvailableCapPcs = 0;
    let totalPotentialCapPcs = 0;
    let shortageCount = 0;
    let activeMachines = 0;
    let obsoleteMachines = 0;
    let noOnboardDate = 0;

    const departmentCap: Record<string, number> = {};

    machines.forEach(m => {
      totalMachines++;
      const isCounted = (m[19] || 'Yes') === 'Yes';
      const status = getMachineStatus(m[24], m[25], new Date().toISOString());
      if (status === 'Active') activeMachines++;
      if (status === 'Obsolete') obsoleteMachines++;
      if (!m[24]) noOnboardDate++;
      
      if (isCounted) {
        countedMachines++;
        const existPcs = Number(m[17]) || 0;
        const potentialPcs = Number(m[10]) || 0;
        
        totalAvailableCapPcs += existPcs;
        totalPotentialCapPcs += potentialPcs;

        const dept = m[1] || 'Unknown';
        departmentCap[dept] = (departmentCap[dept] || 0) + existPcs;

        if (m[15] === 'Vacancy') {
          shortageCount++;
        }
      }
    });

    return {
      totalMachines,
      activeMachines,
      obsoleteMachines,
      noOnboardDate,
      countedMachines,
      totalAvailableCapPcs,
      totalPotentialCapPcs,
      shortageCount,
      departmentCap
    };
  }, [machines]);

  // Process Assignments & Actual Capacity
  const processedData = useMemo(() => {
    const activeAssignments = assignments.filter(a => (a[10] || '').trim().toLowerCase() === 'active');
    
    // Map machine to actual manpower
    const machineActualManpower = new Map<string, { day: number, night: number, general: number }>();
    
    // Track assigned employees
    const assignedEmpIds = new Set<string>();

    activeAssignments.forEach(a => {
      const shift = (a[2] || '').trim();
      const machineId = (a[4] || '').trim(); // Machine Name is used as ID
      const empId = (a[6] || '').trim();
      
      if (empId) assignedEmpIds.add(empId);

      if (machineId && !machineId.startsWith('JOB-')) {
        if (!machineActualManpower.has(machineId)) {
          machineActualManpower.set(machineId, { day: 0, night: 0, general: 0 });
        }
        const data = machineActualManpower.get(machineId)!;
        if (shift.includes('Day')) data.day++;
        else if (shift.includes('Night')) data.night++;
        else if (shift.includes('General')) data.general++;
      }
    });

    // Calculate machine wise capacity
    const machineList = machines.map(m => {
      const machineName = m[4];
      const reqDay = Number(m[12]) || 0;
      const reqNight = Number(m[13]) || 0;
      const reqGen = Number(m[14]) || 0;
      
      const actual = machineActualManpower.get(machineName) || { day: 0, night: 0, general: 0 };
      
      // Calculate actual multiplier
      let activeShifts = 0;
      if (actual.day > 0) activeShifts++;
      if (actual.night > 0) activeShifts++;
      if (actual.general > 0) activeShifts++;

      // Potential capacity for 1 shift
      const speedVal = parseCleanNumber(m[7]) || parseCleanNumber(m[6]) || 0;
      let utilVal = parseCleanNumber(m[8]);
      if (utilVal > 0 && utilVal <= 1) utilVal = utilVal * 100;
      const convVal = parseCleanNumber(m[9]) || 1;
      
      const capPerShiftUnit = speedVal * 60 * 8 * (utilVal / 100);
      const capPerShiftPcs = capPerShiftUnit * convVal;

      const actualCapacityPcs = capPerShiftPcs * activeShifts;

      const isVacant = activeShifts === 0;

      return {
        brand: m[0],
        dept: m[1],
        process: m[3],
        name: machineName,
        reqDay, reqNight, reqGen,
        actDay: actual.day, actNight: actual.night, actGen: actual.general,
        isVacant,
        actualCapacityPcs
      };
    });

    // Unassigned Employees
    const unassignedEmps = employees.filter(e => {
      const empId = (e[0] || '').trim();
      const status = (e[9] || 'Active').trim();
      if (status !== 'Active') return false;
      return !assignedEmpIds.has(empId);
    });

    return {
      machineList,
      unassignedEmps,
      vacantCount: machineList.filter(m => m.isVacant).length
    };
  }, [machines, assignments, employees]);

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, subtext, className }: any) => (
    <div className={`p-6 rounded-2xl border flex items-center space-x-4 ${bgClass} border-gray-100 shadow-sm ${className || ''}`}>
      <div className={`p-3 rounded-xl ${colorClass} bg-white shadow-sm`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-lg p-1 border border-gray-200 w-max shadow-sm">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${activeTab === 'overview' ? 'bg-[#1ECA98] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Activity className="w-4 h-4 inline mr-2" /> Overview
        </button>
        <button 
          onClick={() => setActiveTab('machine-capacity')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${activeTab === 'machine-capacity' ? 'bg-[#1ECA98] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Settings2 className="w-4 h-4 inline mr-2" /> Machine Actual Capacity
        </button>
        <button 
          onClick={() => setActiveTab('unassigned')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${activeTab === 'unassigned' ? 'bg-[#1ECA98] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <UserX className="w-4 h-4 inline mr-2" /> Unassigned Staff ({processedData.unassignedEmps.length})
        </button>
      </div>

      {activeTab === 'overview' && (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
          <StatCard 
            title="Total Machines" value={stats.totalMachines} icon={Activity}
            colorClass="text-blue-500" bgClass="bg-white col-span-1 md:col-span-1 lg:col-span-2"
          />
          <StatCard 
            title="Active" value={stats.activeMachines} icon={CheckCircle}
            colorClass="text-emerald-500" bgClass="bg-emerald-50/50 col-span-1 md:col-span-1 lg:col-span-2"
          />
          <StatCard 
            title="Obsolete" value={stats.obsoleteMachines} icon={ArchiveX}
            colorClass="text-red-500" bgClass={stats.obsoleteMachines > 0 ? "bg-red-50" : "bg-white"}
            className="col-span-1 md:col-span-1 lg:col-span-2"
          />
          <StatCard 
            title="Vacant Machines" value={processedData.vacantCount} icon={AlertTriangle}
            colorClass="text-amber-500" bgClass={processedData.vacantCount > 0 ? "bg-amber-50" : "bg-white"}
            className="col-span-1 md:col-span-1 lg:col-span-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            title="Available Cap (Pcs)" 
            value={Math.round(stats.totalAvailableCapPcs).toLocaleString()} 
            subtext={`vs Potential: ${Math.round(stats.totalPotentialCapPcs).toLocaleString()}`}
            icon={CheckCircle} 
            colorClass="text-[#1ECA98]"
            bgClass="bg-emerald-50/50"
          />
          <StatCard 
            title="Manpower Shortage" 
            value={stats.shortageCount} 
            subtext="Machines set to 'Vacancy' in DB"
            icon={AlertTriangle} 
            colorClass="text-red-500"
            bgClass={stats.shortageCount > 0 ? "bg-red-50" : "bg-white"}
          />
          <StatCard 
            title="Active Departments" 
            value={Object.keys(stats.departmentCap).length} 
            icon={Clock} 
            colorClass="text-orange-500"
            bgClass="bg-white"
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Department Capacity Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.departmentCap)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([dept, cap]) => (
              <div key={dept} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-gray-700">{dept}</span>
                <span className="text-[#1ECA98] font-bold">{Math.round(cap as number).toLocaleString()} Pcs</span>
              </div>
            ))}
            {Object.keys(stats.departmentCap).length === 0 && (
              <p className="text-gray-400 text-sm py-4">No capacity data available.</p>
            )}
          </div>
        </div>
      </>
      )}

      {activeTab === 'machine-capacity' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">Machine Actual Capacity (Based on Assignments)</h3>
            <p className="text-xs text-gray-500">Shows machines with their actual active manpower assignments and calculated current capacity.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="p-3 font-semibold">Machine Name</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Process</th>
                  <th className="p-3 font-semibold text-center" colSpan={3}>Required Manpower<br/><span className="text-xs font-normal text-gray-400">Day | Night | Gen</span></th>
                  <th className="p-3 font-semibold text-center" colSpan={3}>Actual Assigned<br/><span className="text-xs font-normal text-gray-400">Day | Night | Gen</span></th>
                  <th className="p-3 font-semibold text-right">Actual Cap (Pcs)</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedData.machineList.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-bold text-gray-800">{m.name}</td>
                    <td className="p-3 text-gray-600">{m.dept}</td>
                    <td className="p-3 text-gray-600">{m.process}</td>
                    
                    <td className="p-3 text-center text-gray-500 border-l border-gray-100">{m.reqDay}</td>
                    <td className="p-3 text-center text-gray-500">{m.reqNight}</td>
                    <td className="p-3 text-center text-gray-500 border-r border-gray-100">{m.reqGen}</td>

                    <td className={`p-3 text-center font-bold ${m.actDay < m.reqDay ? 'text-red-500' : 'text-emerald-600'}`}>{m.actDay}</td>
                    <td className={`p-3 text-center font-bold ${m.actNight < m.reqNight ? 'text-red-500' : 'text-emerald-600'}`}>{m.actNight}</td>
                    <td className={`p-3 text-center font-bold ${m.actGen < m.reqGen ? 'text-red-500' : 'text-emerald-600'}`}>{m.actGen}</td>

                    <td className="p-3 text-right font-black text-[#1ECA98]">{Math.round(m.actualCapacityPcs).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      {m.isVacant ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider">Vacant</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'unassigned' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Unassigned / Supporting Staff</h3>
              <p className="text-xs text-gray-500">List of employees not currently assigned to any machine (e.g., Planning, Quality, Logistics, Maintenance, Shift Incharge, etc.)</p>
            </div>
            <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold">
              {processedData.unassignedEmps.length} Staff
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="p-3 font-semibold">Employee ID</th>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Designation</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedData.unassignedEmps.map((emp, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-mono text-gray-500">{emp[0]}</td>
                    <td className="p-3 font-bold text-gray-800">{emp[1]}</td>
                    <td className="p-3 text-gray-600">{emp[3]}</td>
                    <td className="p-3 text-gray-600">{emp[2]}</td>
                    <td className="p-3 text-gray-600">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${emp[5] === 'Management' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {emp[5] || 'Non-Management'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase tracking-wider">Unassigned</span>
                    </td>
                  </tr>
                ))}
                {processedData.unassignedEmps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">All active employees are currently assigned to machines.</td>
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
