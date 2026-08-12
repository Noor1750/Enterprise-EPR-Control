import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { Loader2, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isFriday } from 'date-fns';

export default function OvertimeCalendar({ spreadsheetId, user }: { spreadsheetId: string, user: User }) {
  const [otData, setOtData] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [holidays, setHolidays] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  
  // Log OT Form
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), hours: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [oRaw, eRaw, hRaw] = await Promise.all([
        getRange(spreadsheetId, 'Overtime'),
        getRange(spreadsheetId, 'Employees'),
        getRange(spreadsheetId, 'Holidays'),
      ]);
      const loadedOt = oRaw.length > 1 ? oRaw.slice(1) : [];
      let filteredOt = loadedOt;
      if (user?.email !== 'noor.alam1750@gmail.com') {
         filteredOt = loadedOt.filter(o => o[3] === user?.displayName || o[3] === user?.email);
      }
      setOtData(filteredOt);
      setEmployees(eRaw.length > 1 ? eRaw.slice(1) : []);
      setHolidays(hRaw.length > 1 ? hRaw.slice(1) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [spreadsheetId]);

  const handleDeleteOT = async () => {
    const existingOT = otData.find(ot => ot[2] === selectedEmp && ot[1] === form.date);
    if (existingOT) {
      
      try {
        await deleteRowByPrimaryKey(spreadsheetId, 'Overtime', existingOT[0]);
        
        setForm({ ...form, hours: '' });
        setShowModal(false);
        loadData();
      } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete');
      }
    }
  };

  const handleCellClick = (empId: string, date: string, currentHours: number) => {
    setSelectedEmp(empId);
    setForm({ date, hours: currentHours ? currentHours.toString() : '' });
    setShowModal(true);
  };

  const handleLogOT = async (e: any) => {
    e.preventDefault();
    if (!selectedEmp) return alert('Select an employee first');
    const emp = employees.find(e => e[0] === selectedEmp);
    if (!emp) return;

    const existingOT = otData.find(ot => ot[2] === selectedEmp && ot[1] === form.date);
    if (existingOT) {
      const newValues = [...existingOT];
      newValues[6] = form.hours;
      try {
        await updateRowByPrimaryKey(spreadsheetId, 'Overtime', existingOT[0], newValues);
        setForm({ ...form, hours: '' });
        setShowModal(false);
        loadData();
      } catch (err) { alert('Failed to update'); }
      return;
    }

    const otId = `OT-${Date.now()}`;
    const values = [otId, form.date, emp[0], emp[1], emp[2], emp[3], form.hours];
    
    try {
      await appendRow(spreadsheetId, 'Overtime!A:G', [values]);
      setForm({ ...form, hours: '' });
      setShowModal(false);
      loadData();
    } catch (err) { alert('Failed'); }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const currentMonthStr = format(currentDate, 'yyyy-MM');
  const monthOt = otData.filter(ot => ot[1]?.startsWith(currentMonthStr));

  // group by employee
  const empOtMap = new Map();
  monthOt.forEach(ot => {
    const empId = ot[2];
    const hours = parseFloat(ot[6] || '0');
    if (hours <= 0) return;

    if (!empOtMap.has(empId)) {
      empOtMap.set(empId, {
        id: empId,
        name: ot[3],
        designation: ot[4],
        section: ot[5],
        days: {} as Record<number, number>,
        total: 0
      });
    }
    const day = parseInt(ot[1].split('-')[2], 10);
    empOtMap.get(empId).days[day] = (empOtMap.get(empId).days[day] || 0) + hours;
    empOtMap.get(empId).total += hours;
  });

  const tableData = Array.from(empOtMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  const holidayDates = new Set(holidays.map(h => h[0]));

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
          <div className="flex space-x-2">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 border rounded hover:bg-[#F9F9F9]"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 border rounded hover:bg-[#F9F9F9]"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#337AB7] text-white px-4 py-2 rounded-sm hover:bg-[#286090] flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Log Overtime
        </button>
      </div>

      <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-x-auto">
        <table className="min-w-max w-full divide-y divide-gray-200 table-auto border-collapse">
          <thead className="bg-[#F9F9F9]">
            <tr>
              <th className="px-3 py-2 border text-center text-[13px] font-semibold text-[#73879C]">SL</th>
              <th className="px-3 py-2 border text-left text-[13px] font-semibold text-[#73879C]">ID No</th>
              <th className="px-3 py-2 border text-left text-[13px] font-semibold text-[#73879C]">Employee Name</th>
              <th className="px-3 py-2 border text-left text-[13px] font-semibold text-[#73879C]">Designation</th>
              <th className="px-3 py-2 border text-left text-[13px] font-semibold text-[#73879C]">Section</th>
              {daysInMonth.map(d => {
                const isWknd = isFriday(d);
                const isHol = holidayDates.has(format(d, 'yyyy-MM-dd'));
                let bgClass = '';
                if (isHol) bgClass = 'bg-red-50';
                else if (isWknd) bgClass = 'bg-[#8ab5df] !text-[#73879C]';
                return (
                  <th key={d.toString()} className={`px-2 py-2 border text-center text-xs font-medium text-[#73879C] ${bgClass}`}>
                    {format(d, 'd')}
                  </th>
                )
              })}
              <th className="px-3 py-2 border text-center text-[13px] font-semibold text-[#73879C]">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row, i) => (
              <tr key={row.id} className="hover:bg-[#F9F9F9]">
                <td className="px-3 py-2 border text-center text-sm text-[#73879C]">{i + 1}</td>
                <td className="px-3 py-2 border text-sm font-medium text-[#73879C]">{row.id}</td>
                <td className="px-3 py-2 border text-sm text-[#73879C]">{row.name}</td>
                <td className="px-3 py-2 border text-sm text-[#73879C]">{row.designation}</td>
                <td className="px-3 py-2 border text-sm text-[#73879C]">{row.section}</td>
                {daysInMonth.map(d => {
                  const dayNum = parseInt(format(d, 'd'), 10);
                  const hours = row.days[dayNum];
                  const isWknd = isFriday(d);
                  const isHol = holidayDates.has(format(d, 'yyyy-MM-dd'));
                  let bgClass = '';
                  if (isHol) bgClass = 'bg-red-50';
                  else if (isWknd) bgClass = 'bg-[#8ab5df] !text-[#73879C]';
                  return (
                    <td 
                      key={d.toString()} 
                      onClick={() => handleCellClick(row.id, format(d, 'yyyy-MM-dd'), hours || 0)}
                      className={`px-2 py-2 border text-center text-sm font-medium text-[#73879C] cursor-pointer hover:bg-blue-50 transition-colors ${bgClass}`}
                      title={`Click to edit OT for ${format(d, 'MMM d, yyyy')}`}
                    >
                      {hours || ''}
                    </td>
                  );
                })}
                <td className="px-3 py-2 border text-center text-sm font-bold text-[#73879C]">{row.total}</td>
              </tr>
            ))}
            {tableData.length === 0 && (
              <tr>
                <td colSpan={6 + daysInMonth.length} className="px-6 py-8 text-center text-[#73879C]">
                  No overtime recorded for {format(currentDate, 'MMMM yyyy')}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F9F9F9]0 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Log Overtime</h2>
              {otData.find(ot => ot[2] === selectedEmp && ot[1] === form.date) && (
                <button type="button" onClick={handleDeleteOT} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50" title="Delete Overtime">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <form onSubmit={handleLogOT} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Employee</label>
                <input 
                  list="employees-list"
                  required
                  value={selectedEmp} 
                  onChange={e => setSelectedEmp(e.target.value)} 
                  placeholder="Enter or select Employee ID"
                  className="w-full px-3 py-2 border rounded-sm" 
                />
                <datalist id="employees-list">
                  {employees.map(e => <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>)}
                </datalist>
                {selectedEmp && (
                  <div className="mt-1 text-sm text-gray-600 font-medium">
                    {employees.find(e => e[0] === selectedEmp)?.[1] || 'Employee not found'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Date</label>
                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Hours</label>
                <input required type="number" step="0.5" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-sm text-[#73879C] hover:bg-[#F9F9F9]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#337AB7] text-white rounded-sm hover:bg-[#286090]">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
