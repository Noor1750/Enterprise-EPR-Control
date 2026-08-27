import { useState, useMemo } from 'react';
import { 
  Grid3X3, Search, Filter, RefreshCw, CheckCircle, AlertTriangle, 
  HelpCircle, ChevronDown, Check, Sparkles, Wrench, Users, Cpu
} from 'lucide-react';
import { getRange, updateRange, appendRow } from '../../lib/sheets';
import { UserSecurityScope } from '../../lib/security';
import { SkillRecord, EmployeeInfo, MachineInfo, SKILL_LEVELS } from './types';

interface SkillMatrixGridProps {
  spreadsheetId: string;
  skills: SkillRecord[];
  employees: EmployeeInfo[];
  machines: MachineInfo[];
  userSecurityScope?: UserSecurityScope;
  onRefresh: () => void;
}

export default function SkillMatrixGrid({
  spreadsheetId,
  skills,
  employees,
  machines,
  userSecurityScope,
  onRefresh
}: SkillMatrixGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [activeCellEdit, setActiveCellEdit] = useState<{ empId: string; machineName: string; processName: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => e.department && set.add(e.department));
    machines.forEach(m => m.department && set.add(m.department));
    return Array.from(set).sort();
  }, [employees, machines]);

  // Filtered operators
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (deptFilter !== 'All' && e.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q);
      }
      return true;
    });
  }, [employees, deptFilter, searchQuery]);

  // Filtered machines for columns
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      if (deptFilter !== 'All' && m.department !== deptFilter) return false;
      return true;
    });
  }, [machines, deptFilter]);

  // Fast lookup Map for current skills: key = `${empId}_${machineName.toLowerCase()}`
  const skillMap = useMemo(() => {
    const map = new Map<string, SkillRecord>();
    skills.forEach(s => {
      const key = `${s.empId.toUpperCase()}_${s.machineName.toLowerCase()}`;
      map.set(key, s);
    });
    return map;
  }, [skills]);

  // Handle cell level update
  const handleSetLevel = async (empId: string, mach: MachineInfo, newLevel: number) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const emp = employees.find(e => e.id.toUpperCase() === empId.toUpperCase());
      const dept = emp?.department || mach.department || '';
      const proc = mach.processName || 'General Operation';
      const evaluatedBy = userSecurityScope?.employeeName || userSecurityScope?.username || 'Matrix Grid';

      const raw = await getRange(spreadsheetId, 'SkillMatrix!A:Z');
      const headers = raw.length > 0 ? raw[0] : ['ID_No', 'Machine_Job', 'Skill_Level', 'Process_Name', 'Department', 'Remarks', 'Evaluated_By', 'Updated_At'];
      const dataRows = raw.length > 1 ? raw.slice(1) : [];

      const rowsMap = new Map<string, string[]>();
      dataRows.forEach(r => {
        const key = `${String(r[0] || '').trim().toUpperCase()}_${String(r[1] || '').trim().toLowerCase()}`;
        rowsMap.set(key, r);
      });

      const cellKey = `${empId.toUpperCase()}_${mach.machineName.toLowerCase()}`;

      if (newLevel === 0) {
        // If 0, delete mapping
        rowsMap.delete(cellKey);
      } else {
        // Update or insert
        const newRow = [
          empId.toUpperCase(),
          mach.machineName,
          String(newLevel),
          proc,
          dept,
          `Updated via Matrix Grid (L${newLevel})`,
          evaluatedBy,
          now
        ];
        rowsMap.set(cellKey, newRow);
      }

      const updatedRows = Array.from(rowsMap.values());
      await updateRange(spreadsheetId, 'SkillMatrix!A1:H' + (updatedRows.length + 1), [headers, ...updatedRows]);
      
      setActiveCellEdit(null);
      onRefresh();
    } catch (err) {
      console.error('Error updating skill in grid:', err);
      alert('Failed to update skill level.');
    } finally {
      setIsSaving(false);
    }
  };

  // Color mapper for cells
  const getCellColor = (level: number) => {
    switch (level) {
      case 5: return 'bg-amber-100 text-amber-900 border-amber-300 font-black';
      case 4: return 'bg-purple-100 text-purple-900 border-purple-300 font-black';
      case 3: return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      case 2: return 'bg-sky-100 text-sky-900 border-sky-300 font-semibold';
      case 1: return 'bg-slate-200 text-slate-800 border-slate-300 font-medium';
      default: return 'bg-slate-50 text-slate-300 border-transparent hover:border-slate-300 hover:text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Grid3X3 className="w-6 h-6 text-indigo-600" />
            Interactive Operator × Machine/Process Skill Matrix
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Click any cell to directly update or assign an operator's competency level (0 to 5) across machines and processes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 outline-none"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200"
            title="Refresh Matrix"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Level Legend Bar */}
      <div className="bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-600">
          <span>Competency Legend:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-slate-100 text-slate-400 border border-slate-200">0</span>
            <span className="text-slate-500">None</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-slate-200 text-slate-700 border border-slate-300">1</span>
            <span className="text-slate-600">Beginner / Supervised</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-sky-100 text-sky-800 border border-sky-300">2</span>
            <span className="text-slate-600">Basic / Independent</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">3</span>
            <span className="text-slate-700 font-semibold">Competent (Target)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-purple-100 text-purple-800 border border-purple-300">4</span>
            <span className="text-slate-600">Advanced</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-amber-100 text-amber-900 border border-amber-300">5</span>
            <span className="text-amber-900 font-bold">Expert / Trainer</span>
          </span>
        </div>
      </div>

      {/* 2D Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-200">
              <tr>
                {/* Fixed Left Header Columns */}
                <th className="sticky left-0 bg-slate-100 z-30 px-4 py-3 font-black text-slate-700 border-r border-slate-200 min-w-[200px]">
                  Operator / Employee
                </th>
                <th className="px-3 py-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">
                  Department
                </th>
                <th className="px-3 py-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[80px]">
                  Skills Count
                </th>
                <th className="px-3 py-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[70px]">
                  Avg Level
                </th>

                {/* Machine / Process Column Headers */}
                {filteredMachines.map(m => {
                  // Calculate how many operators are qualified (level >= 3)
                  let qualifiedCount = 0;
                  employees.forEach(emp => {
                    const s = skillMap.get(`${emp.id.toUpperCase()}_${m.machineName.toLowerCase()}`);
                    if (s && s.level >= 3) qualifiedCount++;
                  });

                  const isCovered = qualifiedCount >= m.reqOperators;

                  return (
                    <th
                      key={`${m.machineName}-${m.machineNo}`}
                      className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-200 min-w-[150px] text-center bg-slate-50/90"
                    >
                      <div className="flex flex-col items-center">
                        <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-indigo-500" />
                          {m.machineName}
                        </div>
                        <div className="text-[10px] text-sky-700 font-medium truncate max-w-[130px]" title={m.processName}>
                          {m.processName || m.department}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          <span className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                            isCovered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {qualifiedCount}/{m.reqOperators || 1} Opr
                          </span>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp, rowIdx) => {
                // Calculate operator stats
                let totalLevel = 0;
                let mappedCount = 0;
                filteredMachines.forEach(m => {
                  const s = skillMap.get(`${emp.id.toUpperCase()}_${m.machineName.toLowerCase()}`);
                  if (s && s.level > 0) {
                    totalLevel += s.level;
                    mappedCount++;
                  }
                });
                const avgLvl = mappedCount > 0 ? (totalLevel / mappedCount).toFixed(1) : '0';

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Sticky Operator Column */}
                    <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 px-4 py-2.5 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-500">{emp.id}</span>
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{emp.name}</div>
                          <div className="text-[10px] text-slate-400">{emp.designation}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-center text-slate-600 border-r border-slate-200">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium">
                        {emp.department}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-center font-bold text-indigo-600 border-r border-slate-200">
                      {mappedCount}
                    </td>

                    <td className="px-3 py-2.5 text-center font-bold text-slate-700 border-r border-slate-200">
                      {avgLvl}
                    </td>

                    {/* Machine Cells */}
                    {filteredMachines.map(m => {
                      const skill = skillMap.get(`${emp.id.toUpperCase()}_${m.machineName.toLowerCase()}`);
                      const currentLevel = skill ? skill.level : 0;
                      const isEditing = activeCellEdit?.empId === emp.id && activeCellEdit?.machineName === m.machineName;

                      return (
                        <td
                          key={`${emp.id}-${m.machineName}`}
                          className="px-2 py-1.5 text-center border-r border-slate-200 relative group"
                        >
                          {isEditing ? (
                            <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-indigo-300 p-2 flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                              {[0, 1, 2, 3, 4, 5].map(lvl => (
                                <button
                                  key={lvl}
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSetLevel(emp.id, m, lvl)}
                                  className={`w-7 h-7 rounded-lg text-xs font-black transition-transform hover:scale-110 flex items-center justify-center border ${
                                    currentLevel === lvl ? 'ring-2 ring-indigo-600' : ''
                                  } ${getCellColor(lvl)}`}
                                  title={lvl === 0 ? 'Clear/No Skill' : `Level ${lvl}`}
                                >
                                  {lvl === 0 ? '✕' : lvl}
                                </button>
                              ))}
                              <button
                                onClick={() => setActiveCellEdit(null)}
                                className="w-5 h-5 rounded-full text-slate-400 hover:text-slate-600 text-xs ml-1"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveCellEdit({ empId: emp.id, machineName: m.machineName, processName: m.processName })}
                              className={`w-8 h-8 rounded-lg text-xs transition-all border flex items-center justify-center mx-auto hover:ring-2 hover:ring-indigo-400 ${getCellColor(currentLevel)}`}
                              title={`${emp.name} - ${m.machineName} (${m.processName}): Level ${currentLevel}`}
                            >
                              {currentLevel > 0 ? currentLevel : '—'}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
