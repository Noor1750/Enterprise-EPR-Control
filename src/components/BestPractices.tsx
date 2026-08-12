import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { Loader2, DollarSign, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function BestPractices({ spreadsheetId, user }: { spreadsheetId: string, user: User }) {
  const [practices, setPractices] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [form, setForm] = useState({ id: '', details: '', savings: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pRaw, eRaw] = await Promise.all([
        getRange(spreadsheetId, 'BestPractices'),
        getRange(spreadsheetId, 'Employees'),
      ]);
      setPractices(pRaw.length > 1 ? pRaw.slice(1) : []);
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
    const emp = employees.find(emp => emp[0] === form.id);
    if (!emp) return alert('Select employee');

    if (editingId) {
      try {
        const existing = practices.find(p => p[0] === editingId);
        if (existing) {
          const newValues = [...existing];
          newValues[2] = emp[0];
          newValues[3] = emp[1];
          newValues[4] = emp[2];
          newValues[5] = emp[3];
          newValues[6] = form.details;
          newValues[7] = form.savings;
          await updateRowByPrimaryKey(spreadsheetId, 'BestPractices', editingId, newValues);
        }
        setForm({ id: '', details: '', savings: '' });
        setEditingId(null);
        loadData();
      } catch (err) { alert('Failed to update'); }
    } else {
      const bpId = `BP-${Date.now()}`;
      const date = format(new Date(), 'yyyy-MM-dd');
      const values = [bpId, date, emp[0], emp[1], emp[2], emp[3], form.details, form.savings];
      
      try {
        await appendRow(spreadsheetId, 'BestPractices!A:H', [values]);
        setForm({ id: '', details: '', savings: '' });
        loadData();
      } catch (err) { alert('Failed'); }
    }
  };

  const handleEdit = (p: string[]) => {
    setForm({ id: p[2], details: p[6], savings: p[7] });
    setEditingId(p[0]);
  };

  const handleDelete = async (bpId: string) => {
    
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'BestPractices', bpId);
      if (editingId === bpId) {
        setEditingId(null);
        setForm({ id: '', details: '', savings: '' });
      }
      loadData();
    } catch (err) { alert('Failed to delete'); }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ id: '', details: '', savings: '' });
  };

  const totalSavings = practices.reduce((sum, p) => sum + (parseFloat(p[7]) || 0), 0);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <h3 className="text-green-100 font-medium text-sm uppercase tracking-wider mb-2">Total Savings</h3>
          <div className="flex items-center">
            <DollarSign className="w-10 h-10 opacity-75 mr-2" />
            <span className="text-4xl font-extrabold">{totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Best Practice' : 'Log Best Practice'}</h2>
            {editingId && (
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Employee</label>
              <input 
                list="employees-list-bp"
                required 
                value={form.id} 
                onChange={e => setForm({...form, id: e.target.value})} 
                placeholder="Enter or select ID"
                className="w-full px-3 py-2 border rounded-sm" 
              />
              <datalist id="employees-list-bp">
                {employees.map(e => <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>)}
              </datalist>
              {form.id && (
                <div className="mt-1 text-sm text-gray-600 font-medium">
                  {employees.find(e => e[0] === form.id)?.[1] || 'Employee not found'}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Details/Innovation</label>
              <textarea required rows={4} value={form.details} onChange={e => setForm({...form, details: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Savings (USD)</label>
              <input required type="number" step="0.01" value={form.savings} onChange={e => setForm({...form, savings: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <button type="submit" className="w-full bg-[#337AB7] text-white py-2 rounded-sm hover:bg-[#286090]">
              {editingId ? 'Update' : 'Submit'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Best Practices Log</h2>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {practices.map((p, i) => (
              <div key={i} className={`p-4 hover:bg-[#F9F9F9] ${editingId === p[0] ? 'bg-blue-50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-[#73879C]">{p[3]}</h4>
                    <p className="text-xs text-[#73879C]">{p[4]} • {p[5]} • {p[1]}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      +${parseFloat(p[7]).toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleEdit(p)} className="text-[#337AB7] hover:text-[#286090]" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p[0])} className="text-red-600 hover:text-red-800" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#73879C] mt-2">{p[6]}</p>
              </div>
            ))}
            {practices.length === 0 && <div className="p-8 text-center text-[#73879C]">No best practices recorded yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
