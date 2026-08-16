import { useState, useEffect } from 'react';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { Loader2, Plus, Edit2, Trash2, KeyRound, Upload, X } from 'lucide-react';

interface UserManagementProps {
  spreadsheetId: string;
}

const TAB_MODULES = [
  'Employee Directory',
  'Machine & Skills',
  'Leave Management',
  'Overtime',
  'Holidays',
  'Best Practices',
  'Organization Chart',
  'Reports & Export',
  'Settings',
  'Salary',
  'Overtime Rate'
];

const EDIT_MODULES = [
  'Edit Employee Directory',
  'Edit Machine & Skills',
  'Edit Leave Management',
  'Edit Overtime',
  'Edit Holidays',
  'Edit Best Practices'
];

const UPLOAD_MODULES = [
  'Upload Employee Directory',
  'Upload Machine & Skills',
  'Upload Leave Management',
  'Upload Overtime',
  'Upload Holidays',
  'Upload Best Practices'
];

export default function UserManagement({ spreadsheetId }: UserManagementProps) {
  const [users, setUsers] = useState<string[][]>([]);
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'supervisors'>('users');
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Standard User',
    status: 'Active',
    accessLevel: [] as string[]
  });

  const [supFormData, setSupFormData] = useState({
    name: '',
    role: 'Supervisor',
    department: ''
  });
  const [isEditingSup, setIsEditingSup] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [editingSupOriginalName, setEditingSupOriginalName] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const usersRaw = await getRange(spreadsheetId, 'Users');
      const usersData = usersRaw.length > 1 ? usersRaw.slice(1) : [];
      setUsers(usersData);
      localStorage.setItem('erp_local_users', JSON.stringify(usersData));
      
      const supRaw = await getRange(spreadsheetId, 'Supervisors');
      setSupervisors(supRaw.length > 1 ? supRaw.slice(1) : []);

      const empRaw = await getRange(spreadsheetId, 'Employees').catch(() => []);
      setEmployees(empRaw.length > 1 ? empRaw.slice(1) : []);
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
      formData.username, 
      formData.password || 'OAUTH_GOOGLE',
      formData.role, 
      formData.status, 
      formData.accessLevel.join(',')
    ];

    try {
      if (isEditing) {
        await updateRowByPrimaryKey(spreadsheetId, 'Users', formData.username, values);
      } else {
        await appendRow(spreadsheetId, 'Users!A:E', [values]);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save user.');
    }
  };

  const handleEdit = (row: string[]) => {
    setFormData({
      username: row[0] || '',
      password: row[1] === 'OAUTH_GOOGLE' ? '' : row[1],
      role: row[2] || 'Standard User',
      status: row[3] || 'Active',
      accessLevel: row[4] ? row[4].split(',') : []
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAccessChange = (module: string) => {
    setFormData(prev => ({
      ...prev,
      accessLevel: prev.accessLevel.includes(module)
        ? prev.accessLevel.filter(m => m !== module)
        : [...prev.accessLevel, module]
    }));
  };

  const handleDelete = async (username: string) => {
    
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Users', username);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  const handleSupSubmit = async (e: any) => {
    e.preventDefault();
    const values = [supFormData.name, supFormData.role, supFormData.department];
    try {
      if (isEditingSup) {
        await updateRowByPrimaryKey(spreadsheetId, 'Supervisors', editingSupOriginalName, values);
      } else {
        await appendRow(spreadsheetId, 'Supervisors!A:C', [values]);
      }
      setShowSupModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save supervisor/manager.');
    }
  };

  const handleSupEdit = (row: string[]) => {
    setSupFormData({
      name: row[0] || '',
      role: row[1] || 'Supervisor',
      department: row[2] || ''
    });
    setEditingSupOriginalName(row[0] || '');
    setIsEditingSup(true);
    setShowSupModal(true);
  };

  const handleSupDelete = async (name: string) => {
    
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Supervisors', name);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#73879C]">Settings & User Management</h1>
          <p className="text-sm text-[#73879C]">Manage user accounts, roles, and supervisors.</p>
        </div>
        <div className="flex bg-white rounded-sm border p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-sm ${activeTab === 'users' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-[#73879C] hover:text-[#73879C]'}`}
          >
            System Users
          </button>
          <button
            onClick={() => setActiveTab('supervisors')}
            className={`px-4 py-2 text-sm font-medium rounded-sm ${activeTab === 'supervisors' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-[#73879C] hover:text-[#73879C]'}`}
          >
            Supervisors & Managers
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white p-4 rounded-sm border border-[#E6E9ED] shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[#73879C]">Global Database ID</h3>
          <p className="text-xs text-gray-500 mt-1">Share this ID with other users so they can connect to the same database.</p>
        </div>
        <div className="flex items-center space-x-2">
          <code className="bg-gray-100 px-3 py-1.5 rounded text-sm text-gray-700 border border-gray-200 select-all">
            {spreadsheetId}
          </code>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#337AB7]" /></div>
      ) : activeTab === 'users' ? (
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
          <div className="p-4 border-b bg-[#F9F9F9] flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">System Users</h2>
            <button 
              onClick={() => {
                setFormData({username: '', password: '', role: 'Standard User', status: 'Active', accessLevel: []});
                setIsEditing(false);
                setShowModal(true);
              }}
              className="bg-[#337AB7] text-white px-3 py-1.5 text-sm rounded-sm hover:bg-[#286090] flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F9F9F9]">
                <tr>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Username / Email</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Role</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Status</th>
                  <th className="px-6 py-3 text-right text-[13px] font-semibold text-[#73879C]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((row, i) => (
                  <tr key={i} className="hover:bg-[#F9F9F9]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#73879C]">{row[0]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">{row[2]}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row[3] === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {row[3]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(row)} className="text-[#337AB7] hover:text-blue-900 mr-4" title="Edit User">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(row[0])} className="text-red-600 hover:text-red-900" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-[#73879C]">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
          <div className="p-4 border-b bg-[#F9F9F9] flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Supervisors & Managers List</h2>
            <button 
              onClick={() => {
                setSupFormData({name: '', role: 'Supervisor', department: ''});
                setIsEditingSup(false);
                setShowSupModal(true);
              }}
              className="bg-[#337AB7] text-white px-3 py-1.5 text-sm rounded-sm hover:bg-[#286090] flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Person
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F9F9F9]">
                <tr>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Name</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Role</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#73879C]">Department</th>
                  <th className="px-6 py-3 text-right text-[13px] font-semibold text-[#73879C]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supervisors.map((row, i) => (
                  <tr key={i} className="hover:bg-[#F9F9F9]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#73879C]">{row[0]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row[1] === 'Manager' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'}`}>
                        {row[1] || 'Supervisor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#73879C]">{row[2] || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleSupEdit(row)} className="text-[#337AB7] hover:text-blue-900 mr-4" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleSupDelete(row[0])} className="text-red-600 hover:text-red-900" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {supervisors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-[#73879C]">No personnel found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Screen Modal mimicking the requested layout */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F9F9F9] flex flex-col">
          <form onSubmit={handleSubmit} className="min-h-screen flex flex-col">
            
            {/* Top Bar */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit User & Reset Password' : 'Add New User'}</h2>
              <div className="flex space-x-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 text-sm font-medium text-[#73879C] hover:text-[#73879C]"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#337AB7] text-white text-sm font-medium rounded hover:bg-[#286090] flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Save Changes
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto w-full p-6 space-y-8 flex-1">
              
              {/* Profile Photo */}
              <div className="bg-white p-6 rounded-lg border border-[#E6E9ED] shadow-sm flex items-start space-x-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#E6E9ED]">
                  <span className="text-gray-400">Photo</span>
                </div>
                <div className="flex flex-col justify-center h-24">
                  <span className="text-xs font-semibold text-[#73879C] mb-1 uppercase">Profile Photo</span>
                  <button type="button" className="text-[#337AB7] hover:text-[#286090] text-sm font-medium flex items-center mb-1">
                    <Upload className="w-4 h-4 mr-1" /> Change Photo
                  </button>
                  <span className="text-xs text-gray-400">Recommended: Square image, max 2MB.</span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-xs font-semibold text-[#73879C] mb-1 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#73879C] mb-1 uppercase">User Role</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    <option value="Standard User">Standard User</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Admins have full access to all tabs and actions.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#73879C] mb-1 uppercase">Username</label>
                  <input 
                    required 
                    readOnly={isEditing} 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${isEditing ? 'bg-[#F9F9F9] text-[#73879C]' : ''}`}
                    placeholder="Username or email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#73879C] mb-1 uppercase">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#73879C] mb-1 flex items-center uppercase">
                    <KeyRound className="w-3 h-3 mr-1" /> Password
                  </label>
                  <input 
                    type="password"
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder={isEditing ? "•••••• (Unchanged)" : "Enter password"}
                    className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                  />
                  <p className="text-[11px] text-gray-400 mt-1 italic">Leave blank to keep existing password.</p>
                </div>
              </div>

              {/* Tab Visibility Access */}
              <div className="pt-6">
                <h3 className="text-sm font-bold text-[#73879C] border-b pb-3 mb-6">Tab Visibility Access</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {TAB_MODULES.map(module => (
                    <label key={module} className="flex items-center cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.accessLevel.includes(module)}
                        onChange={() => handleAccessChange(module)}
                        className="w-4 h-4 text-[#337AB7] bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-[#73879C] group-hover:text-[#73879C]">{module}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Edit / Action Access */}
              <div className="pt-6">
                <h3 className="text-sm font-bold text-[#73879C] border-b pb-3 mb-6">Edit / Action Access</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {EDIT_MODULES.map(module => (
                    <label key={module} className="flex items-center cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.accessLevel.includes(module)}
                        onChange={() => handleAccessChange(module)}
                        className="w-4 h-4 text-[#337AB7] bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-[#73879C] group-hover:text-[#73879C]">{module}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Upload Access */}
              <div className="pt-6 pb-12">
                <h3 className="text-sm font-bold text-[#73879C] border-b pb-3 mb-6">Upload Access</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {UPLOAD_MODULES.map(module => (
                    <label key={module} className="flex items-center cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.accessLevel.includes(module)}
                        onChange={() => handleAccessChange(module)}
                        className="w-4 h-4 text-[#337AB7] bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-[#73879C] group-hover:text-[#73879C]">{module}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* Supervisor Modal */}
      {showSupModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F9F9F9]0 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-md w-full p-6 m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">{isEditingSup ? 'Edit Person' : 'Add Person'}</h2>
            <form onSubmit={handleSupSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Name *</label>
                <input 
                  required 
                  list="employee-names-list"
                  value={supFormData.name} 
                  onChange={e => setSupFormData({...supFormData, name: e.target.value})} 
                  placeholder="Search by ID or Name..."
                  className="w-full px-3 py-2 border rounded-sm" 
                />
                <datalist id="employee-names-list">
                  {employees.map(e => (
                    <option key={e[0]} value={e[1]}>{e[0]} - {e[1]}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Role *</label>
                <select 
                  value={supFormData.role} 
                  onChange={e => setSupFormData({...supFormData, role: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-sm"
                >
                  <option value="Supervisor">Supervisor</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#73879C] mb-1">Department</label>
                <input 
                  value={supFormData.department} 
                  onChange={e => setSupFormData({...supFormData, department: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-sm" 
                  placeholder="e.g. IT, Production"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setShowSupModal(false)} className="px-4 py-2 border rounded-sm text-[#73879C] hover:bg-[#F9F9F9]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#337AB7] text-white rounded-sm hover:bg-[#286090]">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

