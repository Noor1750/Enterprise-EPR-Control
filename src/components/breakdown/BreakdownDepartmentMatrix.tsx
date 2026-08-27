import React, { useState, useMemo } from 'react';
import { BreakdownRecord, MachineHealthStatus } from '../../types/breakdown';
import { 
  Factory, Zap, AlertTriangle, CheckCircle2, Clock, 
  Wrench, Activity, Search, Filter, Plus, ArrowRight, UserCheck
} from 'lucide-react';

interface BreakdownDepartmentMatrixProps {
  records: BreakdownRecord[];
  machinesList: string[][];
  departmentsList: string[];
  onOpenRecord: (record: BreakdownRecord) => void;
  onReportNewForMachine: (machineName: string, dept: string, machineNo: string) => void;
}

export default function BreakdownDepartmentMatrix({
  records,
  machinesList,
  departmentsList,
  onOpenRecord,
  onReportNewForMachine
}: BreakdownDepartmentMatrixProps) {
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Down' | 'Under Maintenance' | 'Running'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Build Machine Status Map
  const machineHealthData = useMemo(() => {
    return machinesList.map(m => {
      const brand = m[0] || '';
      const dept = m[1] || '';
      const name = m[4] || brand;
      const no = m[20] || `MC-${dept.substring(0, 3).toUpperCase()}-${name.replace(/\s+/g, '')}`;
      const capacityPerHour = Number(m[9]) || 0;
      const uom = m[8] || 'PCS';

      // Find active unsolved breakdown
      const activeBreakdown = records.find(r => 
        r.machineName === name && 
        r.status !== 'Completed' && 
        r.status !== 'Closed' && 
        r.status !== 'Cancelled'
      );

      let status: 'Running' | 'Down' | 'Under Maintenance' = 'Running';
      if (activeBreakdown) {
        if (activeBreakdown.productionStop === 'Yes') {
          status = 'Down';
        } else {
          status = 'Under Maintenance';
        }
      }

      const totalBreakdowns = records.filter(r => r.machineName === name).length;
      const totalHoursLost = records
        .filter(r => r.machineName === name)
        .reduce((acc, r) => acc + (Number(r.hourLostHours) || 0), 0);

      return {
        machineName: name,
        machineNo: no,
        department: dept,
        brand,
        capacityPerHour,
        uom,
        status,
        activeBreakdown,
        totalBreakdowns,
        totalHoursLost: Math.round(totalHoursLost * 10) / 10
      };
    });
  }, [machinesList, records]);

  // Group by Department
  const departmentGroups = useMemo(() => {
    const map = new Map<string, typeof machineHealthData>();

    machineHealthData.forEach(item => {
      const dept = item.department || 'Other';
      if (!map.has(dept)) {
        map.set(dept, []);
      }
      map.get(dept)!.push(item);
    });

    return map;
  }, [machineHealthData]);

  // Filtered Departments
  const displayedDepts = useMemo(() => {
    const depts = Array.from(departmentGroups.keys());
    if (selectedDept !== 'All') {
      return depts.filter(d => d === selectedDept);
    }
    return depts;
  }, [departmentGroups, selectedDept]);

  // Summary counts
  const totalFleet = machineHealthData.length;
  const downCount = machineHealthData.filter(m => m.status === 'Down').length;
  const maintCount = machineHealthData.filter(m => m.status === 'Under Maintenance').length;
  const runningCount = machineHealthData.filter(m => m.status === 'Running').length;
  const healthPercentage = totalFleet > 0 ? Math.round((runningCount / totalFleet) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Fleet Live Summary Cockpit */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase mb-1">
            <span>Fleet Health</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{healthPercentage}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                healthPercentage >= 90 ? 'bg-emerald-500' : healthPercentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase mb-1">
            <span>Running Fleet</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900">{runningCount} / {totalFleet}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Optimal Production</span>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase mb-1">
            <span>Critical Stoppages</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
          </div>
          <div className="text-2xl font-black text-rose-900">{downCount} Machines</div>
          <span className="text-[11px] text-rose-700 font-bold">Immediate Fix Needed</span>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase mb-1">
            <span>Under Repair</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">{maintCount} Machines</div>
          <span className="text-[11px] text-amber-700 font-medium">In Progress / Parts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase mb-1">
            <span>Total Departments</span>
            <Factory className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{departmentGroups.size} Depts</div>
          <span className="text-[11px] text-slate-500 font-medium">{machinesList.length} Units Tracked</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search machine name, number, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Select */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="All">All Departments ({departmentGroups.size})</option>
            {Array.from(departmentGroups.keys()).map(d => (
              <option key={d} value={d}>{d} ({departmentGroups.get(d)?.length} units)</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-bold text-slate-600">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-2.5 py-1.5 rounded-md transition ${statusFilter === 'All' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('Down')}
              className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1 ${statusFilter === 'Down' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Down ({downCount})
            </button>
            <button
              onClick={() => setStatusFilter('Under Maintenance')}
              className={`px-2.5 py-1.5 rounded-md transition ${statusFilter === 'Under Maintenance' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}`}
            >
              In Repair ({maintCount})
            </button>
            <button
              onClick={() => setStatusFilter('Running')}
              className={`px-2.5 py-1.5 rounded-md transition ${statusFilter === 'Running' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
            >
              Running ({runningCount})
            </button>
          </div>
        </div>
      </div>

      {/* Department Fleet Grids */}
      <div className="space-y-6">
        {displayedDepts.map(dept => {
          const allMachines = departmentGroups.get(dept) || [];
          const filteredMachines = allMachines.filter(m => {
            if (statusFilter !== 'All' && m.status !== statusFilter) return false;
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return m.machineName.toLowerCase().includes(q) || 
                     m.machineNo.toLowerCase().includes(q) || 
                     m.brand.toLowerCase().includes(q);
            }
            return true;
          });

          if (filteredMachines.length === 0 && (statusFilter !== 'All' || searchQuery.trim())) {
            return null;
          }

          const deptDown = allMachines.filter(m => m.status === 'Down').length;

          return (
            <div key={dept} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Department Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                    <Factory className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
                      {dept} Department
                      {deptDown > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          {deptDown} Machine{deptDown > 1 ? 's' : ''} Down
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          100% Operational
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {allMachines.length} machine units installed in this facility
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  Showing <strong>{filteredMachines.length}</strong> of <strong>{allMachines.length}</strong>
                </div>
              </div>

              {/* Machine Cards Grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {filteredMachines.map(machine => {
                  const isDown = machine.status === 'Down';
                  const isInRepair = machine.status === 'Under Maintenance';
                  const active = machine.activeBreakdown;

                  return (
                    <div
                      key={machine.machineNo}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isDown 
                          ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-200/60 shadow-xs' 
                          : isInRepair
                          ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Header & Status Indicator */}
                        <div className="flex items-start justify-between gap-1.5 mb-2">
                          <div>
                            <span className="font-mono text-[10px] text-slate-400 block">{machine.machineNo}</span>
                            <h4 className="font-black text-xs text-slate-900 leading-tight truncate" title={machine.machineName}>
                              {machine.machineName}
                            </h4>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            isDown 
                              ? 'bg-rose-600 text-white animate-pulse'
                              : isInRepair
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {machine.status}
                          </span>
                        </div>

                        {/* Active Breakdown Alert or Healthy Message */}
                        {active ? (
                          <div className="mb-3 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span className="font-mono text-indigo-700">{active.id}</span>
                              <span>Rep: {active.reportAt}</span>
                            </div>
                            <p className="text-[11px] text-slate-800 line-clamp-2 font-medium">
                              {active.problemDescription}
                            </p>
                            {active.attendByName && (
                              <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> {active.attendByName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mb-3 py-2 text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Operating smoothly</span>
                          </div>
                        )}

                        {/* Capacity Stats */}
                        <div className="text-[10px] text-slate-500 flex items-center justify-between py-1 border-t border-slate-100 mb-2">
                          <span>Capacity:</span>
                          <span className="font-bold text-slate-700">
                            {machine.capacityPerHour.toLocaleString()} {machine.uom}/hr
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {active ? (
                          <button
                            onClick={() => onOpenRecord(active)}
                            className="w-full py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Manage Ticket ({active.id})</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onReportNewForMachine(machine.machineName, machine.department, machine.machineNo)}
                            className="w-full py-1.5 px-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Report Issue</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
