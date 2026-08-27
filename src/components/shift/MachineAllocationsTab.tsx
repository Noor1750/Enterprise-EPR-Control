import React, { useState, useMemo } from 'react';
import { Search, Download, Edit, UserPlus, Check, X, Printer, Settings2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { appendRow, updateRowByPrimaryKey } from '../../lib/sheets';

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

      return {
        id: name, // unique enough for machines in this context
        type: 'Machine',
        dept,
        process,
        name,
        model,
        serial,
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
      'Day Shift': row.day.map((a: any) => a[7]).join(', '),
      'Night Shift': row.night.map((a: any) => a[7]).join(', '),
      'General Shift': row.general.map((a: any) => a[7]).join(', ')
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
                      <span key={a[0]} className="text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{a[7]}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 bg-indigo-50/20">
                  <div className="flex flex-col gap-1">
                    {row.night.map((a: any) => (
                      <span key={a[0]} className="text-[11px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">{a[7]}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 bg-emerald-50/20">
                  <div className="flex flex-col gap-1">
                    {row.general.map((a: any) => (
                      <span key={a[0]} className="text-[11px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{a[7]}</span>
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
          allEmployees={allEmployees}
          onClose={() => setEditModalData(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

function AssignmentEditModal({ spreadsheetId, data, shifts, allEmployees, onClose, onRefresh }: any) {
  const [jobName, setJobName] = useState(data.isNewJob ? '' : data.name);
  const [isSaving, setIsSaving] = useState(false);
  const [assignments, setAssignments] = useState<{empId: string, shiftId: string, oldId?: string, isDeleted?: boolean}[]>(() => {
    if (data.isNewJob) return [];
    const all = [...data.day, ...data.night, ...data.general];
    return all.map(a => ({ empId: a[6], shiftId: a[2], oldId: a[0] }));
  });

  const activeEmployees = allEmployees.filter(e => (e[6] || '').toLowerCase() === 'active');
  const availableShifts = shifts.filter(s => s[0].startsWith('SHF-'));

  const handleSave = async () => {
    if (data.isNewJob && !jobName) {
      alert("Job name is required");
      return;
    }
    
    setIsSaving(true);
    try {
      const machineId = data.isNewJob ? `JOB-${Date.now()}` : data.id;
      const machineName = jobName;
      
      const nowStr = new Date().toISOString();
      const dateStr = nowStr.split('T')[0];

      // Process assignments
      for (const a of assignments) {
        if (a.isDeleted && a.oldId) {
          // Unassign
          const allRaw = [...(data.day || []), ...(data.night || []), ...(data.general || [])];
          const existingRow = allRaw.find((r: any) => r[0] === a.oldId);
          if (existingRow) {
             const newRow = [...existingRow];
             newRow[10] = 'Inactive';
             newRow[11] = 'System';
             newRow[12] = nowStr;
             await updateRowByPrimaryKey(spreadsheetId, 'ShiftAssignments', a.oldId, newRow);
          }
        } else if (!a.oldId) {
          // New assignment
          const shift = availableShifts.find(s => s[0] === a.shiftId);
          const emp = activeEmployees.find(e => e[0] === a.empId);
          if (shift && emp) {
            await appendRow(spreadsheetId, 'ShiftAssignments!A:N', [[
              `SA-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
              dateStr,
              shift[0],
              shift[1],
              machineId,
              machineName,
              emp[0],
              emp[1],
              'System',
              nowStr,
              'Active',
              '', '', ''
            ]]);
          }
        }
      }
      
      onRefresh();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save assignments");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">
            {data.isNewJob ? 'Assign Non-Machine Job' : `Manage Allocations: ${data.name}`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {(data.isNewJob || data.type === 'Non-Machine') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description</label>
              <input 
                type="text" 
                value={jobName} 
                onChange={e => setJobName(e.target.value)}
                placeholder="e.g. Manual Quality Check"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">Assigned Employees</label>
              <button 
                onClick={() => setAssignments([...assignments, { empId: '', shiftId: availableShifts[0]?.[0] }])}
                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 font-medium flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Add Employee
              </button>
            </div>
            
            <div className="space-y-2">
              {assignments.filter(a => !a.isDeleted).map((a, i) => (
                <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <select 
                    value={a.empId} 
                    onChange={e => {
                      const newA = [...assignments];
                      newA[i].empId = e.target.value;
                      setAssignments(newA);
                    }}
                    className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs"
                  >
                    <option value="">Select Employee...</option>
                    {activeEmployees.map(emp => (
                      <option key={emp[0]} value={emp[0]}>{emp[1]} ({emp[0]})</option>
                    ))}
                  </select>
                  
                  <select
                    value={a.shiftId}
                    onChange={e => {
                      const newA = [...assignments];
                      newA[i].shiftId = e.target.value;
                      setAssignments(newA);
                    }}
                    className="w-32 border border-slate-300 rounded px-2 py-1.5 text-xs"
                  >
                    {availableShifts.map(s => (
                      <option key={s[0]} value={s[0]}>{s[1]}</option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={() => {
                      const newA = [...assignments];
                      if (newA[i].oldId) newA[i].isDeleted = true;
                      else newA.splice(i, 1);
                      setAssignments(newA);
                    }}
                    className="text-rose-500 hover:bg-rose-100 p-1.5 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {assignments.filter(a => !a.isDeleted).length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4 bg-slate-50 border border-dashed rounded-lg">
                  No employees assigned yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      </div>
    </div>
  );
}
