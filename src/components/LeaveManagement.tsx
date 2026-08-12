import { useState, useEffect, ChangeEvent } from 'react';
import { User } from 'firebase/auth';
import { getRange, appendRow, updateRowByPrimaryKey } from '../lib/sheets';
import { Loader2, Check, X, Download, Search } from 'lucide-react';
import { parseISO, eachDayOfInterval, isFriday, format } from 'date-fns';

export default function LeaveManagement({ spreadsheetId, user, view = 'both' }: { spreadsheetId: string, user: User, view?: 'apply' | 'approve' | 'both' }) {
  const [leaves, setLeaves] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [holidays, setHolidays] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeaves, setSelectedLeaves] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');

  // Leave Form
  const [form, setForm] = useState({ id: '', from: '', to: '', reason: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lRaw, eRaw, hRaw] = await Promise.all([
        getRange(spreadsheetId, 'Leave'),
        getRange(spreadsheetId, 'Employees'),
        getRange(spreadsheetId, 'Holidays'),
      ]);
      const loadedLeaves = lRaw.length > 1 ? lRaw.slice(1) : [];
      let filteredLeaves = loadedLeaves;
      if (user?.email !== 'noor.alam1750@gmail.com' && view === 'apply') {
         filteredLeaves = loadedLeaves.filter(l => l[2] === user?.displayName || l[2] === user?.email);
      }
      setLeaves(filteredLeaves);
      setEmployees(eRaw.length > 1 ? eRaw.slice(1) : []);
      setHolidays(hRaw.length > 1 ? hRaw.slice(1) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [spreadsheetId]);

  const handleApply = async (e: any) => {
    e.preventDefault();
    const emp = employees.find(e => e[0] === form.id);
    if (!emp) return alert('Employee ID not found');

    const fromDate = parseISO(form.from);
    const toDate = parseISO(form.to);
    
    // Generate all days in interval
    const daysInInterval = eachDayOfInterval({ start: fromDate, end: toDate });
    const holidayDates = new Set(holidays.map(h => h[0]));
    
    // Count days that are NOT Fridays and NOT Holidays
    const days = daysInInterval.filter(day => {
      const isWknd = isFriday(day);
      const isHol = holidayDates.has(format(day, 'yyyy-MM-dd'));
      return !isWknd && !isHol;
    }).length;
    
    const leaveId = `L-${Date.now()}`;
    const values = [leaveId, form.id, emp[1], emp[2], emp[3], form.from, form.to, days.toString(), 'Pending', '', form.reason];
    
    try {
      await appendRow(spreadsheetId, 'Leave!A:K', [values]);
      setForm({ id: '', from: '', to: '', reason: '' });
      loadData();
    } catch (err) { alert('Failed to apply'); }
  };

  const handleAction = async (leave: string[], status: 'Approved' | 'Rejected') => {
    try {
      const newValues = [...leave];
      newValues[8] = status; // Status col
      newValues[9] = user.email || 'Admin'; // Signoff col
      await updateRowByPrimaryKey(spreadsheetId, 'Leave', leave[0], newValues);
      loadData();
    } catch (err: any) {
      console.error('Leave action failed:', err);
      alert(`Failed: ${err.message}`);
    }
  };

  const handleBulkAction = async (status: 'Approved' | 'Rejected') => {
    if (selectedLeaves.length === 0) return;
    
    setIsProcessing(true);
    try {
      for (const leaveId of selectedLeaves) {
        const leave = leaves.find(l => l[0] === leaveId);
        if (leave && leave[8] === 'Pending') {
          const newValues = [...leave];
          newValues[8] = status;
          newValues[9] = user.email || 'Admin';
          await updateRowByPrimaryKey(spreadsheetId, 'Leave', leave[0], newValues);
        }
      }
      setSelectedLeaves([]);
      await loadData();
    } catch (err) {
      alert('Failed to process some leaves');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLeaves = leaves.filter(l => {
    const matchesSearch = (l[1] || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (l[2] || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : l[8] === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pendingIds = filteredLeaves.filter(l => l[8] === 'Pending').map(l => l[0]);
      setSelectedLeaves(pendingIds);
    } else {
      setSelectedLeaves([]);
    }
  };

  const handleSelectLeave = (leaveId: string) => {
    setSelectedLeaves(prev => 
      prev.includes(leaveId) ? prev.filter(id => id !== leaveId) : [...prev, leaveId]
    );
  };

  const handleExportPending = () => {
    const pendingLeaves = leaves.filter(l => l[8] === 'Pending');
    if (pendingLeaves.length === 0) {
      alert('No pending leaves to export');
      return;
    }

    const headers = ['Leave_ID', 'ID_No', 'Name', 'Designation', 'Department', 'From_Date', 'To_Date', 'Days', 'Reason', 'Status', 'Supervisor_Signoff'];
    const csvContent = [
      headers.join(','),
      ...pendingLeaves.map(row => {
        // Rearrange array to match new header order
        const reordered = [
          row[0], // Leave_ID
          row[1], // ID_No
          row[2], // Name
          row[3], // Designation
          row[4], // Department
          row[5], // From_Date
          row[6], // To_Date
          row[7], // Days
          row[10], // Reason
          row[8], // Status
          row[9], // Supervisor_Signoff
        ];
        return reordered.map(cell => `"${cell || ''}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pending_leaves_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>;

  return (
    <div className="flex flex-col gap-8">
      {/* Apply Form */}
      {(view === 'apply' || view === 'both') && (
      <div>
        <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Apply for Leave</h2>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
          <form onSubmit={handleApply} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[#73879C] mb-1">Employee ID</label>
              <input 
                list="employees-list-leave"
                required 
                value={form.id} 
                onChange={e => setForm({...form, id: e.target.value})} 
                placeholder="Enter ID"
                className="w-full px-3 py-2 border rounded-sm" 
              />
              <datalist id="employees-list-leave">
                {employees.map(e => <option key={e[0]} value={e[0]}>{e[0]} - {e[1]}</option>)}
              </datalist>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[#73879C] mb-1">From Date</label>
              <input required type="date" value={form.from} onChange={e => setForm({...form, from: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[#73879C] mb-1">To Date</label>
              <input required type="date" value={form.to} onChange={e => setForm({...form, to: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[#73879C] mb-1">Reason</label>
              <input required type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full px-3 py-2 border rounded-sm" placeholder="Reason for leave" />
            </div>
            <div className="w-full md:w-auto">
              <button type="submit" className="w-full bg-[#337AB7] text-white px-6 py-2 rounded-sm hover:bg-[#286090] whitespace-nowrap">Submit Request</button>
            </div>
          </form>
          {form.id && (
            <div className="mt-2 text-sm text-gray-600 font-medium">
              Employee: {employees.find(e => e[0] === form.id)?.[1] || 'Not found'}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Dashboard */}
      {(view === 'approve' || view === 'both') && (
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-xl font-bold">Leave Dashboard (Supervisor View)</h2>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search ID or Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex border border-gray-300 rounded-sm overflow-hidden self-start md:self-auto bg-white">
              <button 
                onClick={() => setStatusFilter('All')}
                className={`px-4 py-2 text-sm font-medium ${statusFilter === 'All' ? 'bg-[#E6E9ED] text-[#73879C]' : 'text-[#73879C] hover:bg-[#F9F9F9]'}`}
              >
                All
              </button>
              <button 
                onClick={() => setStatusFilter('Pending')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${statusFilter === 'Pending' ? 'bg-[#E6E9ED] text-[#73879C]' : 'text-[#73879C] hover:bg-[#F9F9F9]'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => setStatusFilter('Approved')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${statusFilter === 'Approved' ? 'bg-[#E6E9ED] text-[#73879C]' : 'text-[#73879C] hover:bg-[#F9F9F9]'}`}
              >
                Approved
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {selectedLeaves.length > 0 && (
              <>
                <button
                  onClick={() => handleBulkAction('Approved')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-[#26B99A] text-white px-4 py-2 rounded-sm hover:bg-[#169F85] text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Approve ({selectedLeaves.length})
                </button>
                <button
                  onClick={() => handleBulkAction('Rejected')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-sm hover:bg-red-700 text-sm disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject ({selectedLeaves.length})
                </button>
              </>
            )}
          </div>
          <button
            onClick={handleExportPending}
            className="flex items-center gap-2 bg-[#337AB7] text-white px-4 py-2 rounded-sm hover:bg-[#286090] text-sm"
          >
            <Download className="w-4 h-4" /> Export Pending
          </button>
        </div>
        
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F9F9F9]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#337AB7] shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    onChange={handleSelectAll}
                    checked={filteredLeaves.filter(l => l[8] === 'Pending').length > 0 && selectedLeaves.length === filteredLeaves.filter(l => l[8] === 'Pending').length}
                  />
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">ID No</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">Employee Name</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">From Date</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">To Date</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">Days</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">Reason</th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#73879C]">Status</th>
                <th className="px-4 py-3 text-right text-[13px] font-semibold text-[#73879C]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeaves.map((l, i) => (
                <tr key={i} className={selectedLeaves.includes(l[0]) ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3">
                    {l[8] === 'Pending' && (
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#337AB7] shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        checked={selectedLeaves.includes(l[0])}
                        onChange={() => handleSelectLeave(l[0])}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#73879C]">{l[1]}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[#73879C]">{l[2]}</td>
                  <td className="px-4 py-3 text-sm text-[#73879C]">{l[5]}</td>
                  <td className="px-4 py-3 text-sm text-[#73879C]">{l[6]}</td>
                  <td className="px-4 py-3 text-sm">{l[7]}</td>
                  <td className="px-4 py-3 text-sm text-[#73879C]">{l[10] || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      l[8] === 'Approved' ? 'bg-green-100 text-green-800' :
                      l[8] === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {l[8]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {l[8] === 'Pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleAction(l, 'Approved')} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-5 h-5" /></button>
                        <button onClick={() => handleAction(l, 'Rejected')} className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="w-5 h-5" /></button>
                      </div>
                    )}
                    {l[8] !== 'Pending' && <span className="text-gray-400 text-xs">{l[9]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeaves.length === 0 && <div className="p-4 text-center text-[#73879C]">No leave requests found.</div>}
        </div>
      </div>
      )}
    </div>
  );
}
