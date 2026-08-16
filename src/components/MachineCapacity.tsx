import { useState, useEffect } from 'react';
import { getRange, appendRow, updateRange } from '../lib/sheets';
import { Loader2, Edit2, X } from 'lucide-react';

export default function MachineCapacity({ spreadsheetId, view = 'both' }: { spreadsheetId: string, view?: 'machine' | 'skill' | 'both' }) {
  const [machines, setMachines] = useState<string[][]>([]);
  const [skills, setSkills] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [mForm, setMForm] = useState({ name: '', no: '', type: '', speed: '', rboName: '', category: 'Main', department: '' });
  const [sForm, setSForm] = useState({ id: '', machine: '', level: '1' });
  
  const [editingMachineIndex, setEditingMachineIndex] = useState<number | null>(null);
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
  const [skillSearch, setSkillSearch] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mRaw, sRaw, eRaw] = await Promise.all([
        getRange(spreadsheetId, 'MachineCapacity'),
        getRange(spreadsheetId, 'SkillMatrix'),
        getRange(spreadsheetId, 'Employees'),
      ]);
      setMachines(mRaw.length > 1 ? mRaw.slice(1) : []);
      setSkills(sRaw.length > 1 ? sRaw.slice(1) : []);
      setEmployees(eRaw.length > 1 ? eRaw.slice(1) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [spreadsheetId]);

  const handleAddMachine = async (e: any) => {
    e.preventDefault();
    try {
      if (editingMachineIndex !== null) {
        const row = editingMachineIndex + 2;
        await updateRange(spreadsheetId, `MachineCapacity!A${row}:G${row}`, [[mForm.name, mForm.no, mForm.type, mForm.speed, mForm.rboName, mForm.category, mForm.department]]);
        setEditingMachineIndex(null);
      } else {
        await appendRow(spreadsheetId, 'MachineCapacity!A:G', [[mForm.name, mForm.no, mForm.type, mForm.speed, mForm.rboName, mForm.category, mForm.department]]);
      }
      setMForm({ name: '', no: '', type: '', speed: '', rboName: '', category: 'Main', department: '' });
      loadData();
    } catch (err) { alert('Failed'); }
  };

  const handleEditMachine = (index: number, m: string[]) => {
    setEditingMachineIndex(index);
    setMForm({ name: m[0] || '', no: m[1] || '', type: m[2] || '', speed: m[3] || '', rboName: m[4] || '', category: m[5] || 'Main', department: m[6] || '' });
  };

  const handleCancelMachineEdit = () => {
    setEditingMachineIndex(null);
    setMForm({ name: '', no: '', type: '', speed: '', rboName: '', category: 'Main', department: '' });
  };

  const handleAddSkill = async (e: any) => {
    e.preventDefault();
    try {
      if (editingSkillIndex !== null) {
        const row = editingSkillIndex + 2;
        await updateRange(spreadsheetId, `SkillMatrix!A${row}:C${row}`, [[sForm.id, sForm.machine, sForm.level]]);
        setEditingSkillIndex(null);
      } else {
        await appendRow(spreadsheetId, 'SkillMatrix!A:C', [[sForm.id, sForm.machine, sForm.level]]);
      }
      setSForm({ id: '', machine: '', level: '1' });
      loadData();
    } catch (err) { alert('Failed'); }
  };

  const handleEditSkill = (index: number, s: string[]) => {
    setEditingSkillIndex(index);
    setSForm({ id: s[0] || '', machine: s[1] || '', level: s[2] || '1' });
  };

  const handleCancelSkillEdit = () => {
    setEditingSkillIndex(null);
    setSForm({ id: '', machine: '', level: '1' });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>;

  return (
    <div className="flex flex-col gap-8">
      {/* Machine Capacity */}
      {(view === 'machine' || view === 'both') && (
      <div>
        {view === 'both' && <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Machine Capacity</h2>}
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
          <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Machine Name</label>
              <input required placeholder="Name" value={mForm.name} onChange={e => setMForm({...mForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">No of Machine</label>
              <input required placeholder="Count" type="number" value={mForm.no} onChange={e => setMForm({...mForm, no: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Product Type</label>
              <input required placeholder="Type" value={mForm.type} onChange={e => setMForm({...mForm, type: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Speed/Hr</label>
              <input required placeholder="Speed" type="number" value={mForm.speed} onChange={e => setMForm({...mForm, speed: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Allocated RBO Name</label>
              <input required placeholder="RBO Name" value={mForm.rboName} onChange={e => setMForm({...mForm, rboName: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Category</label>
              <select required value={mForm.category} onChange={e => setMForm({...mForm, category: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                <option value="Main">Main</option>
                <option value="Supporting">Supporting</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Department</label>
              <input required placeholder="Department" value={mForm.department} onChange={e => setMForm({...mForm, department: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div className="md:col-span-3 lg:col-span-1 flex gap-2">
              <button type="submit" className="flex-1 bg-[#337AB7] text-white py-2 rounded-sm hover:bg-[#286090]">
                {editingMachineIndex !== null ? 'Update' : 'Add Machine'}
              </button>
              {editingMachineIndex !== null && (
                <button type="button" onClick={handleCancelMachineEdit} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-sm hover:bg-gray-300">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F9F9F9]">
                <tr>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Machine</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">No of Machine</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Type</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Speed/Hr</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Per Hour Capacity</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Daily Capacity</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">RBO Name</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Category</th>
                  <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Department</th>
                  <th className="px-4 py-2 text-right text-[13px] font-semibold text-[#73879C]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {machines.map((m, i) => (
                  <tr key={i} className={editingMachineIndex === i ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-2 text-sm">{m[0]}</td>
                    <td className="px-4 py-2 text-sm">{m[1]}</td>
                    <td className="px-4 py-2 text-sm">{m[2]}</td>
                    <td className="px-4 py-2 text-sm">{m[3]}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-[#337AB7]">{Number(m[1] || 0) * Number(m[3] || 0)}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-[#26B99A]">{Number(m[1] || 0) * Number(m[3] || 0) * 16}</td>
                    <td className="px-4 py-2 text-sm">{m[4]}</td>
                    <td className="px-4 py-2 text-sm">{m[5]}</td>
                    <td className="px-4 py-2 text-sm">{m[6]}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      <button 
                        onClick={() => handleEditMachine(i, m)}
                        className="text-[#337AB7] hover:text-[#286090] p-1"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* Skill Matrix */}
      {(view === 'skill' || view === 'both') && (
      <div>
        {view === 'both' && <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Skill Matrix</h2>}
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
          <form onSubmit={handleAddSkill} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[#73879C] mb-1">Employee</label>
              <input 
                required 
                list="employee-list" 
                placeholder="Search by ID or Name..." 
                value={sForm.id} 
                onChange={e => setSForm({...sForm, id: e.target.value})} 
                className="w-full px-3 py-2 border rounded-sm" 
              />
              <datalist id="employee-list">
                {employees.map(e => <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>)}
              </datalist>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[#73879C] mb-1">Machine</label>
              <select required value={sForm.machine} onChange={e => setSForm({...sForm, machine: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                <option value="">Select Machine</option>
                {machines.map(m => <option key={m[0]} value={m[0]}>{m[0]}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[#73879C] mb-1">Skill Level</label>
              <select required value={sForm.level} onChange={e => setSForm({...sForm, level: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                <option value="1">1 - Basic/Supervised</option>
                <option value="2">2 - Independent</option>
                <option value="3">3 - Expert/Trainer</option>
              </select>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button type="submit" className="flex-1 md:flex-none bg-[#337AB7] text-white px-6 py-2 rounded-sm hover:bg-[#286090]">
                {editingSkillIndex !== null ? 'Update' : 'Map Skill'}
              </button>
              {editingSkillIndex !== null && (
                <button type="button" onClick={handleCancelSkillEdit} className="flex-1 md:flex-none bg-gray-200 text-gray-800 px-4 py-2 rounded-sm hover:bg-gray-300">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <input 
            type="text"
            placeholder="Search mapped skills by ID..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F9F9F9]">
              <tr>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Employee ID</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Machine</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Level</th>
                <th className="px-4 py-2 text-right text-[13px] font-semibold text-[#73879C]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {skills.filter(s => (s[0] || '').toLowerCase().includes(skillSearch.toLowerCase())).map((s, i) => (
                <tr key={i} className={editingSkillIndex === i ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-2 text-sm">{s[0]}</td>
                  <td className="px-4 py-2 text-sm">{s[1]}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${s[2] === '3' ? 'bg-green-100 text-green-800' : s[2] === '2' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      Level {s[2]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <button 
                      onClick={() => handleEditSkill(i, s)}
                      className="text-[#337AB7] hover:text-[#286090] p-1"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
