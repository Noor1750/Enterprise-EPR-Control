import React, { useState, useMemo } from 'react';
import { Search, Download, Edit, UserPlus, Check, X, Printer, Settings2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { appendRow, updateRowByPrimaryKey, stripHeaderRow } from '../../lib/sheets';
import { parseEmployeeShiftState, normalizeShift } from '../../lib/shiftEngine';

interface Props {
  spreadsheetId: string;
  machines: string[][];
  shifts: string[][];
  assignments: string[][];
  allEmployees: string[][];
  userSecurityScope?: any;
  onRefresh: () => void;
}

export default function MachineAllocationsTab({ spreadsheetId, machines, shifts, assignments, allEmployees, onRefresh }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  
  const activeAssignments = useMemo(() => assignments.filter(a => (a[10] || '').trim().toLowerCase() === 'active'), [assignments]);

  // Aggregate machines
  const allocationData = useMemo(() => {
    // 1. Group actual machines
    const rows: any[] = machines.map(m => {
      const machineId = m[4]; // Machine Name is used as ID in ShiftAssignments currently
      const dept = m[1] || '';
      const process = m[3] || '';
      const name = m[4] || '';
      const model = m[21] || '';
      const serial = m[22] || '';
      
      const machineAssignments = activeAssignments.filter(a => a[4] === name);
      
      const dayAssign = machineAssignments.filter(a => (a[3] || '').toLowerCase().includes('day'));
      const nightAssign = machineAssignments.filter(a => (a[3] || '').toLowerCase().includes('night'));
      const genAssign = machineAssignments.filter(a => (a[3] || '').toLowerCase().includes('general'));

      const dayReq = parseInt(m[12] || '0', 10) || 0;
      const nightReq = parseInt(m[13] || '0', 10) || 0;
      const genReq = parseInt(m[14] || '0', 10) || 0;

      return {
        id: name, // unique enough for machines in this context
        type: 'Machine',
        dept,
        process,
        name,
        model,
        serial,
        dayReq,
        nightReq,
        genReq,
        day: dayAssign,
        night: nightAssign,
        general: genAssign
      };
    });

    // 2. Identify Non-Machine assignments
    // Non-machine assignments might have a Machine_ID starting with 'JOB-'
    const nonMachineAssigns = activeAssignments.filter(a => a[4]?.startsWith('JOB-'));
    
    // Group them by Machine_ID (which acts as the Job ID)
    const jobGroups = nonMachineAssigns.reduce((acc, curr) => {
      const jobId = curr[4];
      if (!acc[jobId]) {
        acc[jobId] = {
          id: jobId,
          type: 'Non-Machine',
          dept: 'General', // Or derived from employee
          process: 'Manual Job',
          name: curr[5] || 'Unknown Job',
          model: '-',
          serial: '-',
          day: [],
          night: [],
          general: []
        };
      }
      const shiftName = (curr[3] || '').toLowerCase();
      if (shiftName.includes('day')) acc[jobId].day.push(curr);
      else if (shiftName.includes('night')) acc[jobId].night.push(curr);
      else if (shiftName.includes('general')) acc[jobId].general.push(curr);
      else acc[jobId].general.push(curr); // fallback
      return acc;
    }, {} as Record<string, any>);

    return [...rows, ...Object.values(jobGroups)];
  }, [machines, activeAssignments]);

  const filteredData = useMemo(() => {
    return allocationData.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            row.process.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = deptFilter === 'All' || row.dept === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [allocationData, searchTerm, deptFilter]);

  const departments = ['All', ...Array.from(new Set(machines.map(m => m[1]).filter(Boolean)))];

  const handleExport = () => {
    const exportData = filteredData.map(row => ({
      'Department': row.dept,
      'Process Name': row.process,
      'Machine Name / Job': row.name,
      'Model No.': row.model,
      'Serial No.': row.serial,
      'Day Shift': row.day.map((a: any) => `${a[7]} (${a[6]})`).join(', '),
      'Night Shift': row.night.map((a: any) => `${a[7]} (${a[6]})`).join(', '),
      'General Shift': row.general.map((a: any) => `${a[7]} (${a[6]})`).join(', ')
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Allocations");
    XLSX.writeFile(wb, "Machine_Station_Allocations.xlsx");
  };

  const [editModalData, setEditModalData] = useState<any | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search machine or job..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditModalData({ isNewJob: true })} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition">
            <UserPlus className="w-4 h-4" />
            Assign Non-Machine Job
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Process Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Machine / Job</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Model No.</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Serial No.</th>
              <th className="px-4 py-3 font-semibold text-amber-700 bg-amber-50/50">Day</th>
              <th className="px-4 py-3 font-semibold text-indigo-700 bg-indigo-50/50">Night</th>
              <th className="px-4 py-3 font-semibold text-emerald-700 bg-emerald-50/50">General</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.length > 0 ? filteredData.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-600">{row.dept}</td>
                <td className="px-4 py-3 text-slate-600">{row.process}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {row.name}
                  {row.type === 'Non-Machine' && <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Manual</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{row.model}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{row.serial}</td>
                <td className="px-4 py-3 bg-amber-50/20">
                  <div className="flex flex-col gap-1">
                    {row.day.map((a: any) => (
                      <span key={a[0]} className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium">
                        <span>{a[7]}</span>
                        <span className="text-[10px] text-amber-700 font-mono">({a[6]})</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 bg-indigo-50/20">
                  <div className="flex flex-col gap-1">
                    {row.night.map((a: any) => (
                      <span key={a[0]} className="inline-flex items-center gap-1 text-[11px] bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md font-medium">
                        <span>{a[7]}</span>
                        <span className="text-[10px] text-indigo-700 font-mono">({a[6]})</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 bg-emerald-50/20">
                  <div className="flex flex-col gap-1">
                    {row.general.map((a: any) => (
                      <span key={a[0]} className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-medium">
                        <span>{a[7]}</span>
                        <span className="text-[10px] text-emerald-700 font-mono">({a[6]})</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditModalData(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Settings2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No allocations found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editModalData && (
        <AssignmentEditModal 
          spreadsheetId={spreadsheetId}
          data={editModalData}
          shifts={shifts}
          assignmentsRaw={assignments}
          allEmployees={allEmployees}
          onClose={() => setEditModalData(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

function AssignmentEditModal({ spreadsheetId, data, shifts, assignmentsRaw, allEmployees, userSecurityScope, onClose, onRefresh }: any) {
  const [jobName, setJobName] = useState(data.isNewJob ? '' : data.name);
  const [modalDeptFilter, setModalDeptFilter] = useState('All');
  const [modalSupervisorFilter, setModalSupervisorFilter] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [assignments, setAssignments] = useState<{empId: string, shiftId: string, oldId?: string, isDeleted?: boolean}[]>(() => {
    if (data.isNewJob) return [];
    const all = [...(data.day || []), ...(data.night || []), ...(data.general || [])];
    return all.map(a => ({ empId: a[6] || '', shiftId: a[2] || 'SHF-001', oldId: a[0] }));
  });

  const activeEmployees = useMemo(() => {
    const rawClean = stripHeaderRow(allEmployees || []);
    return rawClean.filter((e: string[]) => {
      if (!e || !e[0]) return false;
      const status = (e[9] || 'active').trim().toLowerCase();
      return status !== 'inactive';
    });
  }, [allEmployees]);

  const employeeStateMap = useMemo(() => {
    const map = new Map<string, any>();
    activeEmployees.forEach((e: string[]) => {
      if (e[0]) {
        const parsed = parseEmployeeShiftState(e, new Date());
        map.set(e[0].trim(), parsed);
      }
    });
    return map;
  }, [activeEmployees]);

  // Unique departments & supervisors among active employees
  const modalDepartments = useMemo(() => {
    const set = new Set<string>();
    activeEmployees.forEach((e: string[]) => {
      if (e[3]) set.add(e[3].trim());
    });
    return Array.from(set).sort();
  }, [activeEmployees]);

  const modalSupervisors = useMemo(() => {
    const set = new Set<string>();
    activeEmployees.forEach((e: string[]) => {
      if (e[12]) set.add(e[12].trim());
    });
    return Array.from(set).sort();
  }, [activeEmployees]);

  // Existing assignments belonging to this specific modal/machine
  const currentModalOldAssignmentIds = useMemo(() => {
    const all = [...(data.day || []), ...(data.night || []), ...(data.general || [])];
    return new Set(all.map((a: any) => a[0]));
  }, [data]);

  // Map of employees actively assigned to other machines/jobs in the company
  const assignedElsewhereMap = useMemo(() => {
    const map = new Map<string, string>();
    const activeList = (assignmentsRaw || []).filter((a: string[]) => (a[10] || '').trim().toLowerCase() === 'active');
    activeList.forEach((a: string[]) => {
      const empId = (a[6] || '').trim();
      if (empId && !currentModalOldAssignmentIds.has(a[0])) {
        map.set(empId, a[5] || a[4] || 'Another Station');
      }
    });
    return map;
  }, [assignmentsRaw, currentModalOldAssignmentIds]);

  const availableShifts = useMemo(() => {
    return shifts.filter((s: string[]) => s[0].startsWith('SHF-'));
  }, [shifts]);

  const getShiftType = (shiftId: string) => {
    const shiftObj = availableShifts.find((s: string[]) => s[0] === shiftId);
    const name = (shiftObj ? shiftObj[1] : '').toLowerCase();
    if (name.includes('night') || shiftId === 'SHF-002') return 'Night';
    if (name.includes('gen') || shiftId === 'SHF-003') return 'General';
    return 'Day';
  };

  const activeRows = assignments.filter(a => !a.isDeleted);
  const currentDayCount = activeRows.filter(a => getShiftType(a.shiftId) === 'Day').length;
  const currentNightCount = activeRows.filter(a => getShiftType(a.shiftId) === 'Night').length;
  const currentGenCount = activeRows.filter(a => getShiftType(a.shiftId) === 'General').length;

  const dayCapacity = data.dayReq !== undefined && data.dayReq > 0 ? data.dayReq : null;
  const nightCapacity = data.nightReq !== undefined && data.nightReq > 0 ? data.nightReq : null;
  const genCapacity = data.genReq !== undefined && data.genReq > 0 ? data.genReq : null;

  // Helper to get unassigned employees available for a specific row matching its shift
  const getAvailableEmployeesForRow = (rowIndex: number) => {
    const rowShiftId = assignments[rowIndex]?.shiftId || 'SHF-001';
    const shiftObj = availableShifts.find((s: string[]) => s[0] === rowShiftId);
    const targetShiftName = normalizeShift(shiftObj ? shiftObj[1] : 'Day Shift');

    const chosenInOtherRows = new Set(
      assignments
        .filter((item, idx) => idx !== rowIndex && !item.isDeleted && item.empId)
        .map(item => item.empId.trim())
    );

    return activeEmployees
      .filter((emp: string[]) => {
        const empId = (emp[0] || '').trim();
        // If assigned to another station/machine/job in the system, exclude
        if (assignedElsewhereMap.has(empId)) return false;
        // If already chosen in another row in this modal, exclude
        if (chosenInOtherRows.has(empId)) return false;

        // Department filter
        if (modalDeptFilter !== 'All' && (emp[3] || '').trim() !== modalDeptFilter) {
          return false;
        }

        // Supervisor filter
        if (modalSupervisorFilter !== 'All' && (emp[12] || '').trim() !== modalSupervisorFilter) {
          return false;
        }

        // Shift matching check
        const p = employeeStateMap.get(empId);
        if (p) {
          const empShift = p.currentShift;
          if (empShift !== targetShiftName && empShift !== 'General') {
            return false;
          }
        }

        return true;
      })
      .sort((a: string[], b: string[]) => (a[1] || '').localeCompare(b[1] || ''));
  };

  const handleAddEmployeeRow = () => {
    const currentlyChosen = new Set(
      assignments.filter(a => !a.isDeleted && a.empId).map(a => a.empId.trim())
    );
    const unassignedPool = activeEmployees.filter((emp: string[]) => {
      const empId = (emp[0] || '').trim();
      return !assignedElsewhereMap.has(empId) && !currentlyChosen.has(empId);
    });

    if (unassignedPool.length === 0) {
      alert("All active employees are already assigned to shifts/machines or already selected in this list.");
      return;
    }

    // Determine default shift based on remaining capacity
    let defaultShiftId = availableShifts[0]?.[0] || 'SHF-001';
    if (dayCapacity !== null && currentDayCount >= dayCapacity) {
      const nightShift = availableShifts.find(s => (s[1] || '').toLowerCase().includes('night') || s[0] === 'SHF-002');
      if (nightShift && (nightCapacity === null || currentNightCount < nightCapacity)) {
        defaultShiftId = nightShift[0];
      } else {
        const genShift = availableShifts.find(s => (s[1] || '').toLowerCase().includes('general') || s[0] === 'SHF-003');
        if (genShift && (genCapacity === null || currentGenCount < genCapacity)) {
          defaultShiftId = genShift[0];
        }
      }
    }

    if (data.type === 'Machine') {
      const dayFull = dayCapacity !== null && currentDayCount >= dayCapacity;
      const nightFull = nightCapacity !== null && currentNightCount >= nightCapacity;
      const genFull = genCapacity !== null && currentGenCount >= genCapacity;
      if (dayFull && nightFull && (genCapacity === null || genFull)) {
        alert(`Maximum manpower capacity reached for Machine "${data.name}".\n\n• Day Shift Requirement: ${currentDayCount}/${dayCapacity} Max\n• Night Shift Requirement: ${currentNightCount}/${nightCapacity} Max\n\nCannot assign more operators than the required manpower limit.`);
        return;
      }
    }

    setAssignments(prev => [
      ...prev,
      { empId: '', shiftId: defaultShiftId }
    ]);
  };

  const handleSave = async () => {
    if (data.isNewJob && !jobName.trim()) {
      alert("Job description is required.");
      return;
    }

    const activeRows = assignments.filter(a => !a.isDeleted);

    // 1. Validate empty selections
    if (activeRows.some(a => !a.empId.trim())) {
      alert("Please select an employee for all added assignment rows, or remove empty rows before saving.");
      return;
    }

    // 2. Validate multi-shift uniqueness: One unique employee cannot assign both shifts (e.g. Day and Night)
    const chosenEmpIds = activeRows.map(a => a.empId.trim());
    const duplicateIds = chosenEmpIds.filter((item, index) => chosenEmpIds.indexOf(item) !== index);
    if (duplicateIds.length > 0) {
      const dupNames = Array.from(new Set(duplicateIds)).map(id => {
        const emp = activeEmployees.find((e: string[]) => e[0]?.trim() === id);
        return emp ? `${emp[0]} — ${emp[1]}` : id;
      });
      alert(`One unique employee cannot be assigned to multiple shifts (Day/Night/General) or multiple stations.\n\nDuplicate: ${dupNames.join(', ')}\n\nPlease remove duplicate assignments.`);
      return;
    }

    // 3. Validate conflict with other machines/jobs in the database
    const conflicts = activeRows.filter(a => assignedElsewhereMap.has(a.empId.trim()));
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map(a => {
        const emp = activeEmployees.find((e: string[]) => e[0]?.trim() === a.empId.trim());
        const loc = assignedElsewhereMap.get(a.empId.trim());
        return `${emp ? `${emp[0]} — ${emp[1]}` : a.empId} (Already assigned to: ${loc})`;
      });
      alert(`The following employee(s) are already actively assigned elsewhere:\n\n${conflictNames.join('\n')}\n\nAn employee cannot be reassigned to multiple machines/shifts simultaneously.`);
      return;
    }

    // 4. Validate Shift-Match for each assigned row
    for (const a of activeRows) {
      const p = employeeStateMap.get(a.empId.trim());
      const shiftObj = availableShifts.find((s: string[]) => s[0] === a.shiftId);
      const targetShiftName = normalizeShift(shiftObj ? shiftObj[1] : 'Day Shift');
      if (p && p.currentShift !== targetShiftName && p.currentShift !== 'General') {
        alert(`Shift Mismatch: ${p.name} (${p.id}) is scheduled for "${p.currentShift}", but is being assigned to "${targetShiftName}".\n\nPlease assign employees matching their designated shift.`);
        return;
      }
    }

    // 5. Enforce Machine Capacity Limits per Shift
    if (data.type === 'Machine') {
      if (dayCapacity !== null && currentDayCount > dayCapacity) {
        alert(`Day Shift Capacity Exceeded: Machine "${data.name}" allows a maximum of ${dayCapacity} operator(s) for Day Shift (currently assigned: ${currentDayCount}).\n\nPlease reduce the number of Day Shift operators.`);
        return;
      }
      if (nightCapacity !== null && currentNightCount > nightCapacity) {
        alert(`Night Shift Capacity Exceeded: Machine "${data.name}" allows a maximum of ${nightCapacity} operator(s) for Night Shift (currently assigned: ${currentNightCount}).\n\nPlease reduce the number of Night Shift operators.`);
        return;
      }
      if (genCapacity !== null && currentGenCount > genCapacity) {
        alert(`General Shift Capacity Exceeded: Machine "${data.name}" allows a maximum of ${genCapacity} operator(s) for General Shift (currently assigned: ${currentGenCount}).\n\nPlease reduce the number of General Shift operators.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const machineId = data.isNewJob ? `JOB-${Date.now()}` : data.id;
      const machineName = data.isNewJob ? jobName.trim() : data.name;
      const nowStr = new Date().toISOString();
      const dateStr = nowStr.split('T')[0];
      const assignedBy = userSecurityScope?.employeeName || userSecurityScope?.username || 'System';

      const allRaw = [...(data.day || []), ...(data.night || []), ...(data.general || [])];

      for (const a of assignments) {
        if (a.isDeleted && a.oldId) {
          // Inactivate unassigned/removed row
          const existingRow = allRaw.find((r: any) => r[0] === a.oldId);
          if (existingRow) {
            const newRow = [...existingRow];
            while (newRow.length < 14) newRow.push('');
            newRow[10] = 'Inactive';
            newRow[11] = assignedBy;
            newRow[12] = nowStr;
            await updateRowByPrimaryKey(spreadsheetId, 'ShiftAssignments', a.oldId, newRow);
          }
        } else if (a.oldId) {
          // Existing assignment updated
          const existingRow = allRaw.find((r: any) => r[0] === a.oldId);
          if (existingRow) {
            const shift = availableShifts.find(s => s[0] === a.shiftId);
            const emp = activeEmployees.find(e => e[0] === a.empId);
            if (shift && emp && (existingRow[6] !== a.empId || existingRow[2] !== a.shiftId)) {
              const newRow = [...existingRow];
              while (newRow.length < 14) newRow.push('');
              newRow[2] = shift[0];
              newRow[3] = shift[1];
              newRow[6] = emp[0];
              newRow[7] = emp[1];
              newRow[8] = assignedBy;
              newRow[9] = nowStr;
              newRow[10] = 'Active';
              await updateRowByPrimaryKey(spreadsheetId, 'ShiftAssignments', a.oldId, newRow);
            }
          }
        } else if (!a.oldId && a.empId) {
          // New assignment created
          const shift = availableShifts.find(s => s[0] === a.shiftId);
          const emp = activeEmployees.find(e => e[0] === a.empId);
          if (shift && emp) {
            await appendRow(spreadsheetId, 'ShiftAssignments!A:N', [[
              `SA-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              dateStr,
              shift[0],
              shift[1],
              machineId,
              machineName,
              emp[0],
              emp[1],
              assignedBy,
              nowStr,
              'Active',
              '', '', ''
            ]]);
          }
        }
      }

      onRefresh();
      onClose();
    } catch (e: any) {
      console.error('Save error:', e);
      alert("Failed to save assignments: " + (e?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {data.isNewJob ? 'Assign Non-Machine Job' : `Manage Allocations: ${data.name}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select from currently unassigned operators. Each employee can only be assigned to one shift and station.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {data.type === 'Machine' && (dayCapacity !== null || nightCapacity !== null || genCapacity !== null) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-700">
                Machine Manpower Quota Limits:
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {dayCapacity !== null && (
                  <span className={`px-2.5 py-1 rounded-md font-semibold border ${
                    currentDayCount > dayCapacity ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    currentDayCount === dayCapacity ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    Day Shift: <strong className="font-bold">{currentDayCount}/{dayCapacity}</strong> required
                  </span>
                )}
                {nightCapacity !== null && (
                  <span className={`px-2.5 py-1 rounded-md font-semibold border ${
                    currentNightCount > nightCapacity ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    currentNightCount === nightCapacity ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    Night Shift: <strong className="font-bold">{currentNightCount}/{nightCapacity}</strong> required
                  </span>
                )}
                {genCapacity !== null && (
                  <span className={`px-2.5 py-1 rounded-md font-semibold border ${
                    currentGenCount > genCapacity ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    currentGenCount === genCapacity ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    General Shift: <strong className="font-bold">{currentGenCount}/{genCapacity}</strong> required
                  </span>
                )}
              </div>
            </div>
          )}
          {(data.isNewJob || data.type === 'Non-Machine') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description *</label>
              <input 
                type="text" 
                value={jobName} 
                onChange={e => setJobName(e.target.value)}
                placeholder="e.g. Manual Quality Check / Packing"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          {/* Quick Department and Supervisor Filter for Modal */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Department</label>
              <select
                value={modalDeptFilter}
                onChange={e => setModalDeptFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">All Departments</option>
                {modalDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Supervisor</label>
              <select
                value={modalSupervisorFilter}
                onChange={e => setModalSupervisorFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">All Supervisors</option>
                {modalSupervisors.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">
                Assigned Employees ({assignments.filter(a => !a.isDeleted).length})
              </label>
              <button 
                type="button"
                onClick={handleAddEmployeeRow}
                className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-semibold flex items-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Employee
              </button>
            </div>
            
            <div className="space-y-2.5">
              {assignments.filter(a => !a.isDeleted).map((a, i) => {
                const availableForRow = getAvailableEmployeesForRow(i);
                const currentEmp = activeEmployees.find(e => e[0]?.trim() === a.empId?.trim());
                const rowOptions = currentEmp && !availableForRow.some(e => e[0]?.trim() === a.empId?.trim())
                  ? [currentEmp, ...availableForRow]
                  : availableForRow;

                return (
                  <div key={i} className="flex gap-2.5 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <select 
                        value={a.empId} 
                        onChange={e => {
                          const selectedId = e.target.value;
                          if (selectedId && assignments.some((other, idx) => idx !== i && !other.isDeleted && other.empId === selectedId)) {
                            alert("One unique employee cannot be assigned to multiple shifts (Day/Night/General) or multiple times.");
                            return;
                          }
                          const newA = [...assignments];
                          newA[i].empId = selectedId;
                          setAssignments(newA);
                        }}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-800"
                      >
                        <option value="">Select Unassigned Employee ({availableForRow.length} eligible)...</option>
                        {rowOptions.map(emp => {
                          const p = employeeStateMap.get((emp[0] || '').trim());
                          const shiftLabel = p ? p.currentShift : 'General';
                          return (
                            <option key={emp[0]} value={emp[0]}>
                              {emp[0]} — {emp[1]} ({emp[3] || 'General'}{emp[12] ? ` • Sup: ${emp[12]}` : ''} • {shiftLabel})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    
                    <select
                      value={a.shiftId}
                      onChange={e => {
                        const newA = [...assignments];
                        newA[i].shiftId = e.target.value;
                        setAssignments(newA);
                      }}
                      className="w-36 border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {availableShifts.map(s => (
                        <option key={s[0]} value={s[0]}>{s[1]}</option>
                      ))}
                    </select>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        const newA = [...assignments];
                        if (newA[i].oldId) newA[i].isDeleted = true;
                        else newA.splice(i, 1);
                        setAssignments(newA);
                      }}
                      className="text-rose-500 hover:bg-rose-100 p-2 rounded-lg transition shrink-0"
                      title="Remove assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {assignments.filter(a => !a.isDeleted).length === 0 && (
                <div className="text-center text-xs text-slate-500 py-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                  No employees assigned yet. Click <span className="font-semibold text-indigo-600">"+ Add Employee"</span> to assign an unassigned operator.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5">
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSave} 
            disabled={isSaving}
            className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      </div>
    </div>
  );
}
