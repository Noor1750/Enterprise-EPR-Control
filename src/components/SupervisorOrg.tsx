import { useState, useEffect } from 'react';
import { getRange, appendRow } from '../lib/sheets';
import { Loader2 } from 'lucide-react';
import { Chart } from 'react-google-charts';

export default function SupervisorOrg({ spreadsheetId }: { spreadsheetId: string }) {
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [spreadsheetId]);

  const handleAdd = async (e: any) => {
    e.preventDefault();
    try {
      await appendRow(spreadsheetId, 'Supervisors!A:G', [[form.id, form.l1, form.l2, form.l3, form.l4, form.l5, form.l6]]);
      setForm({ id: '', l1: '', l2: '', l3: '', l4: '', l5: '', l6: '' });
      loadData();
    } catch (err) { alert('Failed'); }
  };

  const getEmpName = (id: string) => {
    if (!id) return '-';
    const e = employees.find(emp => emp[0] === id);
    return e ? e[1] : id;
  };

  const generateChartData = () => {
    const data: any[] = [
      ['Name', 'Manager', 'ToolTip']
    ];
    
    // We need to build a unique list of all employees and their immediate managers.
    // The sheet Supervisors has: [ID_No, Level_1, Level_2, Level_3, Level_4, Level_5, Level_6]
    // Where Level_1 is their immediate supervisor.
    
    const addedNodes = new Set<string>();

    supervisors.forEach(s => {
      const empId = s[0];
      const supervisorId = s[1]; // Immediate manager
      
      if (empId && !addedNodes.has(empId)) {
        data.push([
          { v: empId, f: `${getEmpName(empId)}<div style="color:red; font-style:italic">Employee</div>` },
          supervisorId || '',
          'Employee'
        ]);
        addedNodes.add(empId);
      }
      
      if (supervisorId && !addedNodes.has(supervisorId)) {
        // Find if this supervisor has a supervisor
        const supervisorRecord = supervisors.find(r => r[0] === supervisorId);
        const managersManager = supervisorRecord ? supervisorRecord[1] : '';
        
        data.push([
          { v: supervisorId, f: `${getEmpName(supervisorId)}<div style="color:blue; font-style:italic">Supervisor</div>` },
          managersManager || '',
          'Supervisor'
        ]);
        addedNodes.add(supervisorId);
      }
    });

    return data;
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Map Supervisor Hierarchy</h2>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Employee ID</label>
              <select required value={form.id} onChange={e => setForm({...form, id: e.target.value})} className="w-full px-2 py-1 text-sm border rounded">
                <option value="">Select</option>
                {employees.map(e => <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>)}
              </select>
            </div>
            {[1, 2, 3, 4, 5, 6].map(level => (
              <div key={level}>
                <label className="block text-xs font-medium text-[#73879C] mb-1">Level {level} Supervisor</label>
                <select value={(form as any)[`l${level}`]} onChange={e => setForm({...form, [`l${level}`]: e.target.value})} className="w-full px-2 py-1 text-sm border rounded">
                  <option value="">Select</option>
                  {employees.map(e => <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-end">
              <button type="submit" className="w-full bg-[#337AB7] text-white py-1 px-3 text-sm rounded hover:bg-[#286090]">Map Hierarchy</button>
            </div>
          </form>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Organization Chart (Tabular View)</h2>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F9F9F9]">
              <tr>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">Employee</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">L1</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">L2</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">L3</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">L4</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">L5</th>
                <th className="px-4 py-2 text-left text-[13px] font-semibold text-[#73879C]">L6</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {supervisors.map((s, i) => (
                <tr key={i} className="hover:bg-[#F9F9F9]">
                  <td className="px-4 py-2 font-medium text-[#73879C]">{getEmpName(s[0])}</td>
                  <td className="px-4 py-2 text-[#73879C]">{getEmpName(s[1])}</td>
                  <td className="px-4 py-2 text-[#73879C]">{getEmpName(s[2])}</td>
                  <td className="px-4 py-2 text-[#73879C]">{getEmpName(s[3])}</td>
                  <td className="px-4 py-2 text-[#73879C]">{getEmpName(s[4])}</td>
                  <td className="px-4 py-2 text-[#73879C]">{getEmpName(s[5])}</td>
                  <td className="px-4 py-2 text-[#73879C]">{getEmpName(s[6])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Visual Organization Chart</h2>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-x-auto flex justify-center">
          {supervisors.length > 0 ? (
            <Chart
              chartType="OrgChart"
              data={generateChartData()}
              options={{ allowHtml: true, allowCollapse: true }}
              width="100%"
              height="400px"
            />
          ) : (
            <p className="text-[#73879C]">No supervisor data mapped yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
