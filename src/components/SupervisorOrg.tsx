import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { getRange, appendRow } from '../lib/sheets';
import { Loader2, Users, Network, UserCheck, Shield, ChevronRight, ChevronDown } from 'lucide-react';

interface SupervisorOrgProps {
  spreadsheetId: string;
}

export default function SupervisorOrg({ spreadsheetId }: SupervisorOrgProps) {
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');

  const [form, setForm] = useState({ id: '', l1: '', l2: '', l3: '', l4: '', l5: '', l6: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sRaw, eRaw] = await Promise.all([
        getRange(spreadsheetId, 'Supervisors'),
        getRange(spreadsheetId, 'Employees'),
      ]);
      setSupervisors(sRaw.length > 1 ? sRaw.slice(1) : []);
      setEmployees(eRaw.length > 1 ? eRaw.slice(1) : []);
    } catch (err) {
      console.error('Failed to load supervisor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [spreadsheetId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id) return;
    try {
      await appendRow(spreadsheetId, 'Supervisors!A:G', [[form.id, form.l1, form.l2, form.l3, form.l4, form.l5, form.l6]]);
      setForm({ id: '', l1: '', l2: '', l3: '', l4: '', l5: '', l6: '' });
      loadData();
    } catch (err) {
      alert('Failed to save supervisor hierarchy mapping.');
    }
  };

  const getEmpDetails = (id: string) => {
    if (!id) return { id: '', name: '-', designation: '', dept: '' };
    const e = employees.find(emp => emp[0] === id);
    return {
      id,
      name: e ? e[1] : id,
      designation: e ? e[2] : '',
      dept: e ? e[3] : ''
    };
  };

  // Build tree data structures for pure React hierarchical tree visualization
  const orgTree = useMemo(() => {
    // Map employee ID to their supervisor IDs
    const empToL1Map = new Map<string, string>();
    supervisors.forEach(s => {
      if (s[0] && s[1]) {
        empToL1Map.set(s[0].trim(), s[1].trim());
      }
    });

    // Group direct subordinates under each manager
    const managerToSubordinates = new Map<string, string[]>();
    const allEmployeeIds = new Set<string>();

    supervisors.forEach(s => {
      const empId = s[0]?.trim();
      const l1 = s[1]?.trim();
      if (empId) {
        allEmployeeIds.add(empId);
        if (l1) {
          allEmployeeIds.add(l1);
          const current = managerToSubordinates.get(l1) || [];
          if (!current.includes(empId)) current.push(empId);
          managerToSubordinates.set(l1, current);
        }
      }
    });

    // Top-level managers (those who are supervisors but don't have an L1 in the map, or have no parent)
    const roots: string[] = [];
    allEmployeeIds.forEach(id => {
      if (!empToL1Map.has(id)) {
        roots.push(id);
      }
    });

    return {
      roots: roots.length > 0 ? roots : Array.from(allEmployeeIds),
      managerToSubordinates,
      empToL1Map
    };
  }, [supervisors]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1ABB9C]" />
        <p className="text-xs font-semibold text-slate-500">Loading Organization Hierarchy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#1ABB9C]" />
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Supervisor & Organization Hierarchy</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Map reporting lines, approval chains, and multi-level supervisor assignments across all departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search hierarchy..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Mapping Form */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Map Supervisor Reporting Chain</span>
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Employee</label>
            <select
              required
              value={form.id}
              onChange={e => setForm({ ...form, id: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-hidden"
            >
              <option value="">Select Employee</option>
              {employees.map(e => (
                <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>
              ))}
            </select>
          </div>

          {[1, 2, 3, 4, 5, 6].map(level => (
            <div key={level}>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Level {level}</label>
              <select
                value={(form as any)[`l${level}`]}
                onChange={e => setForm({ ...form, [`l${level}`]: e.target.value })}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-hidden"
              >
                <option value="">None</option>
                {employees.map(e => (
                  <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="sm:col-span-2 lg:col-span-8 flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Save Hierarchy Mapping</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visual Hierarchy Cards */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1ABB9C]" />
          <span>Interactive Hierarchy Tree</span>
        </h3>

        {orgTree.roots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgTree.roots
              .filter(id => {
                if (!filterSearch) return true;
                const emp = getEmpDetails(id);
                return emp.name.toLowerCase().includes(filterSearch.toLowerCase()) || emp.id.toLowerCase().includes(filterSearch.toLowerCase());
              })
              .map(rootId => {
                const rootEmp = getEmpDetails(rootId);
                const subordinates = orgTree.managerToSubordinates.get(rootId) || [];

                return (
                  <div key={rootId} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                    {/* Supervisor Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {rootEmp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{rootEmp.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{rootEmp.designation || 'Supervisor'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold">{rootEmp.id}</span>
                          {rootEmp.dept && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">{rootEmp.dept}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {subordinates.length} Direct
                      </span>
                    </div>

                    {/* Direct Subordinates List */}
                    <div className="mt-3 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Reports</div>
                      {subordinates.length > 0 ? (
                        subordinates.map(subId => {
                          const subEmp = getEmpDetails(subId);
                          return (
                            <div key={subId} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {subEmp.name.substring(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 truncate text-[11px]">{subEmp.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{subEmp.designation || subId}</div>
                                </div>
                              </div>
                              <span className="font-mono text-[10px] font-semibold text-slate-400 ml-2">{subId}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-1">No direct reports mapped.</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            No supervisor reporting data mapped yet. Use the form above to add supervisory levels.
          </div>
        )}
      </div>

      {/* Tabular View */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-600" />
          <span>Detailed Supervisor Matrix</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Level 1 (Direct)</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Level 2</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Level 3</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Level 4</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Level 5</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Level 6</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {supervisors
                .filter(s => {
                  if (!filterSearch) return true;
                  const eName = getEmpDetails(s[0]).name;
                  return eName.toLowerCase().includes(filterSearch.toLowerCase()) || (s[0] && s[0].toLowerCase().includes(filterSearch.toLowerCase()));
                })
                .map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      <div>{getEmpDetails(s[0]).name}</div>
                      <div className="font-mono text-[10px] text-slate-400 font-normal">{s[0]}</div>
                    </td>
                    {[1, 2, 3, 4, 5, 6].map(lvl => {
                      const sup = getEmpDetails(s[lvl]);
                      return (
                        <td key={lvl} className="px-3 py-2.5 text-slate-600">
                          {s[lvl] ? (
                            <div>
                              <div className="font-semibold text-slate-800">{sup.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{s[lvl]}</div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              {supervisors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No supervisor records mapped in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
