import { useState, useEffect } from 'react';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { Loader2, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Holidays({ spreadsheetId }: { spreadsheetId: string }) {
  const [holidays, setHolidays] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), type: 'Weekend', desc: '' });
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const rawData = await getRange(spreadsheetId, 'Holidays');
      const data = rawData.length > 1 ? rawData.slice(1) : [];
      setHolidays(data.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()));
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
      if (isEditing) {
        await updateRowByPrimaryKey(spreadsheetId, 'Holidays', form.date, [form.date, form.type, form.desc]);
        setIsEditing(false);
      } else {
        const existing = holidays.find(h => h[0] === form.date);
        if (existing) {
          alert('Holiday already exists for this date. Use edit instead.');
          return;
        }
        await appendRow(spreadsheetId, 'Holidays!A:C', [[form.date, form.type, form.desc]]);
      }
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), type: 'Weekend', desc: '' });
      loadData();
    } catch (err) { alert('Failed'); }
  };

  const handleEdit = (h: string[]) => {
    setForm({ date: h[0], type: h[1] || 'Weekend', desc: h[2] || '' });
    setIsEditing(true);
  };

  const handleDelete = async (date: string) => {
    
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Holidays', date);
      loadData();
    } catch (err) { alert('Failed to delete'); }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">{isEditing ? 'Edit Holiday' : 'Add Holiday'}</h2>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Date</label>
              <input required readOnly={isEditing} type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={`w-full px-3 py-2 border rounded-sm ${isEditing ? 'bg-gray-100 text-[#73879C]' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                <option value="Weekend">Weekend</option>
                <option value="Special">Special Holiday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#73879C] mb-1">Description</label>
              <input required value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="w-full px-3 py-2 border rounded-sm" placeholder="e.g. New Year Celebration" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-[#337AB7] text-white py-2 rounded-sm hover:bg-[#286090]">
                {isEditing ? 'Update' : 'Add to Calendar'}
              </button>
              {isEditing && (
                <button type="button" onClick={() => { setIsEditing(false); setForm({ date: format(new Date(), 'yyyy-MM-dd'), type: 'Weekend', desc: '' }); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-sm hover:bg-gray-300">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Holiday Calendar List</h2>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F9F9F9]">
              <tr>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">Date</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">Type</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">Description</th>
                <th className="px-4 py-3 text-right text-[13px] font-semibold text-[#73879C]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {holidays.map((h, i) => (
                <tr key={i} className={isEditing && form.date === h[0] ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3 text-sm font-medium text-[#73879C]">{h[0]}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${h[1] === 'Special' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                      {h[1]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#73879C]">{h[2]}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button onClick={() => handleEdit(h)} className="text-[#337AB7] hover:text-[#286090] p-1 mr-2" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(h[0])} className="text-red-600 hover:text-red-800 p-1" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#73879C]">No holidays added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
