import { useState, useEffect, useRef } from 'react';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { Loader2, Plus, Edit2, Trash2, Upload, LayoutGrid, List } from 'lucide-react';
import * as XLSX from 'xlsx';

const getXlsx = () => XLSX.utils ? XLSX : (XLSX as any).default;

interface EmployeeDirectoryProps {
  spreadsheetId: string;
}

export default function EmployeeDirectory({ spreadsheetId }: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<string[][]>([]);
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [managers, setManagers] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', designation: '', department: '', dateOfJoin: '',
    position: '', supervisor: '', salary: '', overtimeRate: '',
    status: 'Active', inactiveDate: '', phone: '', emergency: '', shift: 'General', bloodGroup: '',
    workingArea: '', profilePicture: '', manager: '',
    tShirtSize: '', shoeSize: '', volunteer: 'No', dateOfBirth: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dataRaw = await getRange(spreadsheetId, 'Employees');
      const data = dataRaw.length > 1 ? dataRaw.slice(1) : [];
      setEmployees(data);
      
      const supDataRaw = await getRange(spreadsheetId, 'Supervisors');
      const supData = supDataRaw.length > 1 ? supDataRaw.slice(1) : [];
      // supData has Name in [0] and Role in [1]
      const sups = supData.filter(row => row[1] === 'Supervisor');
      const mgrs = supData.filter(row => row[1] === 'Manager');
      setSupervisors(sups);
      setManagers(mgrs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spreadsheetId]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const values = [
      formData.id, formData.name, formData.designation, formData.department,
      formData.dateOfJoin, formData.position, formData.supervisor, formData.salary,
      formData.overtimeRate, formData.status, formData.inactiveDate, formData.phone,
      formData.emergency, formData.shift, formData.bloodGroup, formData.workingArea, formData.profilePicture, formData.manager,
      formData.tShirtSize, formData.shoeSize, formData.volunteer, formData.dateOfBirth
    ];

    try {
      if (isEditing) {
        await updateRowByPrimaryKey(spreadsheetId, 'Employees', formData.id, values);
      } else {
        await appendRow(spreadsheetId, 'Employees!A:V', [values]);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save data. ' + err);
    }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const xlsx = getXlsx();
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        
        // Skip header row
        const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
        
        // Pad rows to 21 columns if needed
        const paddedRows = rows.map(row => {
          const padded = [...row];
          while (padded.length < 21) padded.push('');
          return padded.map(val => val ? String(val) : '');
        });

        if (paddedRows.length > 0) {
          // Add in chunks or all at once
          await appendRow(spreadsheetId, 'Employees!A:U', paddedRows);
          alert(`Successfully uploaded ${paddedRows.length} employees.`);
          loadData();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to process Excel file.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (row: string[]) => {
    setFormData({
      id: row[0] || '', name: row[1] || '', designation: row[2] || '', department: row[3] || '',
      dateOfJoin: row[4] || '', position: row[5] || '', supervisor: row[6] || '', salary: row[7] || '',
      overtimeRate: row[8] || '', status: row[9] || 'Active', inactiveDate: row[10] || '',
      phone: row[11] || '', emergency: row[12] || '', shift: row[13] || 'General', bloodGroup: row[14] || '',
      workingArea: row[15] || '', profilePicture: row[16] || '', manager: row[17] || '',
      tShirtSize: row[18] || '', shoeSize: row[19] || '', volunteer: row[20] || 'No', dateOfBirth: row[21] || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Employees', id);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete.');
    }
  };

  const filtered = employees.filter(e => 
    (e[0] || '').toLowerCase().includes(search.toLowerCase()) || 
    (e[1] || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <h1 className="text-xl font-medium text-[#73879C]">Employee Directory</h1>
        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#26B99A] text-white px-4 py-2 rounded-sm hover:bg-[#169F85] flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" /> Bulk Upload
          </button>
          <button 
            onClick={() => {
              setFormData({id: '', name: '', designation: '', department: '', dateOfJoin: '', position: '', supervisor: '', salary: '', overtimeRate: '', status: 'Active', inactiveDate: '', phone: '', emergency: '', shift: 'General', bloodGroup: '', workingArea: '', profilePicture: '', manager: '', tShirtSize: '', shoeSize: '', volunteer: 'No', dateOfBirth: ''});
              setIsEditing(false);
              setShowModal(true);
            }}
            className="bg-[#337AB7] text-white px-4 py-2 rounded-sm hover:bg-[#286090] flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Employee
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <input 
          type="text"
          placeholder="Search by ID or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex border rounded-sm overflow-hidden self-start md:self-auto">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 flex items-center ${viewMode === 'table' ? 'bg-[#E6E9ED] text-[#73879C]' : 'bg-white text-[#73879C] hover:bg-[#F9F9F9]'}`}
          >
            <List className="w-4 h-4 mr-2" /> Table
          </button>
          <button 
            onClick={() => setViewMode('card')}
            className={`px-4 py-2 flex items-center border-l ${viewMode === 'card' ? 'bg-[#E6E9ED] text-[#73879C]' : 'bg-white text-[#73879C] hover:bg-[#F9F9F9]'}`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Cards
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F9F9F9]">
                  <tr>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">ID</th>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Name</th>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Department</th>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Designation</th>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Supervisor</th>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Manager</th>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Working Area</th>
                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Status</th>
                    <th className="px-6 py-3 text-right text-[13px] font-semibold text-[#73879C]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F9F9F9]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#73879C]">{row[0]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C] flex items-center gap-3">
                        {row[16] ? (
                          <img src={row[16]} alt={row[1]} className="w-8 h-8 rounded-full object-cover border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#337AB7] font-bold text-xs">
                            {row[1]?.charAt(0) || 'U'}
                          </div>
                        )}
                        {row[1]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">{row[3]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">{row[2]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">{row[6]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">{row[17]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">{row[15]}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row[9] === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {row[9]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEdit(row)} className="text-[#337AB7] hover:text-blue-900 mr-4"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(row[0])} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="p-4 text-center text-[#73879C]">No employees found.</div>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((row, i) => (
                <div key={i} className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600 relative">
                    <div className="absolute -bottom-10 left-6">
                      {row[16] ? (
                        <img src={row[16]} alt={row[1]} className="w-20 h-20 rounded-full object-cover border-4 border-white bg-white shadow-sm" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${row[9] === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {row[9]}
                      </span>
                    </div>
                  </div>
                  <div className="pt-12 pb-4 px-6 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-[#73879C]">{row[1] || 'Unnamed Employee'}</h3>
                    <p className="text-sm font-medium text-[#337AB7] mb-1">{row[2] || 'No Designation'}</p>
                    <p className="text-xs text-[#73879C] mb-4">{row[3] || 'No Department'}</p>
                    
                    <div className="mt-auto space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-400">ID</span>
                        <span className="font-medium text-[#73879C]">{row[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Supervisor</span>
                        <span className="font-medium text-[#73879C]">{row[6] || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Manager</span>
                        <span className="font-medium text-[#73879C]">{row[17] || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Working Area</span>
                        <span className="font-medium text-[#73879C]">{row[15] || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Blood Group</span>
                        <span className="font-medium text-[#73879C]">{row[14] || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sizes</span>
                        <span className="font-medium text-[#73879C]">
                          {row[18] ? `T: ${row[18]}` : ''} {row[19] ? `| S: ${row[19].split('/')[0].trim()}` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volunteer</span>
                        <span className={`font-medium text-right ${row[20] && row[20] !== 'No' && row[20] !== 'No / None' ? 'text-green-600' : 'text-[#73879C]'}`}>{row[20] || 'No'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#F9F9F9] px-6 py-3 border-t border-[#E6E9ED] flex justify-end space-x-3">
                    <button onClick={() => handleEdit(row)} className="text-[#337AB7] hover:text-[#286090] p-1"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(row[0])} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full p-8 text-center text-[#73879C] bg-white rounded-lg border border-dashed">
                  No employees found matching your search.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F9F9F9]0 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">{isEditing ? 'Edit Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">ID No *</label>
                <input required readOnly={isEditing} value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Name *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Designation</label>
                <input value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Department</label>
                <input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Supervisor</label>
                <select value={formData.supervisor} onChange={e => setFormData({...formData, supervisor: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="">Select Supervisor...</option>
                  {supervisors.map(s => (
                    <option key={s[0]} value={s[0]}>{s[0]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Manager</label>
                <select value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="">Select Manager...</option>
                  {managers.map(m => (
                    <option key={m[0]} value={m[0]}>{m[0]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Working Area</label>
                <input value={formData.workingArea} onChange={e => setFormData({...formData, workingArea: e.target.value})} className="w-full px-3 py-2 border rounded-sm" placeholder="e.g. Floor 1, Zone B" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Profile Picture URL</label>
                <input type="url" value={formData.profilePicture} onChange={e => setFormData({...formData, profilePicture: e.target.value})} className="w-full px-3 py-2 border rounded-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Date of Join</label>
                <input type="date" value={formData.dateOfJoin} onChange={e => setFormData({...formData, dateOfJoin: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Birthday</label>
                <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Shift</label>
                <select value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="General">General Shift</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              {formData.status === 'Inactive' && (
                <div>
                  <label className="block text-sm font-medium text-[#73879C] mb-1">Inactive Date</label>
                  <input type="date" value={formData.inactiveDate} onChange={e => setFormData({...formData, inactiveDate: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Salary</label>
                <input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Overtime Rate</label>
                <input type="number" step="0.01" value={formData.overtimeRate} onChange={e => setFormData({...formData, overtimeRate: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Phone</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Emergency Contact</label>
                <input value={formData.emergency} onChange={e => setFormData({...formData, emergency: e.target.value})} className="w-full px-3 py-2 border rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Blood Group</label>
                <select value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="">Select...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">T-Shirt Size</label>
                <select value={formData.tShirtSize} onChange={e => setFormData({...formData, tShirtSize: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="">Select...</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="XXXL">XXXL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Shoe Size</label>
                <select value={formData.shoeSize} onChange={e => setFormData({...formData, shoeSize: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="">Select...</option>
                  <option value="UK 5 / EU 39">UK 5 / EU 39</option>
                  <option value="UK 6 / EU 40">UK 6 / EU 40</option>
                  <option value="UK 7 / EU 41">UK 7 / EU 41</option>
                  <option value="UK 8 / EU 42">UK 8 / EU 42</option>
                  <option value="UK 9 / EU 43">UK 9 / EU 43</option>
                  <option value="UK 10 / EU 44">UK 10 / EU 44</option>
                  <option value="UK 11 / EU 45">UK 11 / EU 45</option>
                  <option value="UK 12 / EU 46">UK 12 / EU 46</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Volunteer</label>
                <select value={formData.volunteer} onChange={e => setFormData({...formData, volunteer: e.target.value})} className="w-full px-3 py-2 border rounded-sm">
                  <option value="No">No / None</option>
                  <option value="Fire Fighter">Fire Fighter</option>
                  <option value="Fire Rescue">Fire Rescue</option>
                  <option value="Safety">Safety</option>
                  <option value="First Aid">First Aid</option>
                  <option value="Fire First Aid">Fire First Aid</option>
                  <option value="CSR">CSR</option>
                  <option value="Sports">Sports</option>
                  <option value="Employee Engagement">Employee Engagement</option>
                  <option value="5S">5S</option>
                  <option value="Sustainability">Sustainability</option>
                </select>
              </div>
              
              <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 flex justify-end gap-2">
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

