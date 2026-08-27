import { useState, useEffect, useMemo } from 'react';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { 
  Loader2, Plus, Edit2, Trash2, KeyRound, Upload, X, Shield, 
  Users, UserCheck, CheckSquare, Square, Search, Filter, 
  Building2, ArrowRight, UserPlus, Sparkles, Check, ChevronDown, User as UserIcon,
  Crown, Lock, Unlock, Mail, IdCard, Sliders, CalendarDays, Compass, Cloud,
  AlertTriangle, ShieldAlert, CheckCircle2, History, Eye, RefreshCw
} from 'lucide-react';
import HolidayManagement from './settings/HolidayManagement';
import NavigatorManagement from './settings/NavigatorManagement';
import GoogleDriveSettings from './settings/GoogleDriveSettings';
import ERPSettings from './settings/ERPSettings';
import UserAccessSummaryModal from './security/UserAccessSummaryModal';
import AccessMatrixTab from './security/AccessMatrixTab';
import AccessNotSetTab from './security/AccessNotSetTab';
import PermissionConflictsTab from './security/PermissionConflictsTab';
import RoleComparisonModal from './security/RoleComparisonModal';
import ImpersonationPreviewModal from './security/ImpersonationPreviewModal';
import SecurityAuditLogModal from './security/SecurityAuditLogModal';
import AdminDeleteConfirmModal from './common/AdminDeleteConfirmModal';
import { 
  AccessLimitType, 
  UserSecurityScope, 
  parseUserSecurityScope, 
  getAccessLimitDescription, 
  filterAuthorizedEmployees,
  formatEmailToName,
  scanApplicationAccessStatus,
  detectPermissionConflicts,
  recordSecurityAuditLog
} from '../lib/security';
import { DEFAULT_SYSTEM_NAVIGATORS, findNavigator } from '../lib/navigators';

interface UserManagementProps {
  spreadsheetId: string;
  user?: any;
  userSecurityScope?: UserSecurityScope;
  initialTab?: 'users' | 'access' | 'accessNotSet' | 'conflicts' | 'navigator' | 'supervisors' | 'assignSupervisor' | 'holidays' | 'database';
}

const TAB_MODULES = [
  'Employee Directory',
  'Monthly KPI',
  'Machine & Skills',
  'Leave Management',
  'Overtime',
  'Holidays',
  'Best Practices',
  'Reports & Export',
  'Settings',
  'Salary',
  'Overtime Rate'
];

const EDIT_MODULES = [
  'Edit Employee Directory',
  'Edit Monthly KPI',
  'Edit Machine & Skills',
  'Edit Leave Management',
  'Edit Overtime',
  'Edit Holidays',
  'Edit Best Practices'
];

const UPLOAD_MODULES = [
  'Upload Employee Directory',
  'Upload Monthly KPI',
  'Upload Machine & Skills',
  'Upload Leave Management',
  'Upload Overtime',
  'Upload Holidays',
  'Upload Best Practices'
];

const INPUT_PERMISSIONS_OPTIONS = [
  { id: 'leave', name: 'Leave Applications & Approvals', desc: 'Create, signoff and manage staff leaves' },
  { id: 'overtime', name: 'Overtime Logging & Batch Entry', desc: 'Enter and update daily OT hours' },
  { id: 'kpi', name: 'Monthly KPI Evaluations', desc: 'Score and evaluate staff monthly KPI' },
  { id: 'skills', name: 'Machine & Skill Matrix Mapping', desc: 'Assign machine skills and levels' },
  { id: 'tasks', name: 'Daily Task Assignments', desc: 'Create and assign tasks to staff' },
  { id: 'directory', name: 'Employee Profiles Modification', desc: 'Update staff directory fields' }
];

export default function UserManagement({ spreadsheetId, user, userSecurityScope, initialTab }: UserManagementProps) {
  const [users, setUsers] = useState<string[][]>([]);
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'access' | 'accessNotSet' | 'conflicts' | 'navigator' | 'supervisors' | 'assignSupervisor' | 'holidays' | 'database' | 'erpSettings'>(initialTab || 'users');
  
  // Security Modal States
  const [showAccessSummaryModal, setShowAccessSummaryModal] = useState(false);
  const [summaryUserScope, setSummaryUserScope] = useState<UserSecurityScope | null>(null);
  const [showRoleComparisonModal, setShowRoleComparisonModal] = useState(false);
  const [showImpersonationModal, setShowImpersonationModal] = useState(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);

  // User Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Quick Scope Modal State
  const [showQuickScopeModal, setShowQuickScopeModal] = useState(false);
  const [scopeUserRow, setScopeUserRow] = useState<string[] | null>(null);

  // Form data for User
  const [formData, setFormData] = useState({
    username: '', // Gmail ID
    password: '',
    role: 'Standard User',
    status: 'Active',
    accessLevel: [] as string[],
    supervisorName: '',
    accessLimitType: 'all' as AccessLimitType,
    assignedEmployeeIds: [] as string[],
    assignedDepartment: '',
    employeeId: '',
    employeeName: '',
    inputPermissions: ['all'] as string[],
    defaultNavigator: ''
  });

  // Security Health Audit
  const securityReport = useMemo(() => {
    return scanApplicationAccessStatus(users, employees, supervisors);
  }, [users, employees, supervisors]);

  // Overall Conflict Count
  const totalConflictsCount = useMemo(() => {
    let count = 0;
    users.forEach(u => {
      const scope = parseUserSecurityScope(u);
      count += detectPermissionConflicts(scope).length;
    });
    return count;
  }, [users]);

  // Employee picker search & filter inside modal
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerDept, setPickerDept] = useState('All');

  // Supervisor Form State
  const [supFormData, setSupFormData] = useState({
    name: '',
    role: 'Supervisor',
    department: '',
    gmailId: '',
    employeeId: ''
  });
  const [isEditingSup, setIsEditingSup] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [editingSupOriginalName, setEditingSupOriginalName] = useState('');
  
  // Admin Password Protected Deletion Modal State
  const [deleteModalTarget, setDeleteModalTarget] = useState<{
    type: 'user' | 'supervisor';
    id: string;
    name?: string;
    details?: string;
  } | null>(null);

  // Bulk supervisor assignment to employees
  const [bulkSupervisorName, setBulkSupervisorName] = useState('');
  const [bulkSupervisorGmail, setBulkSupervisorGmail] = useState('');
  const [bulkSupervisorEmpId, setBulkSupervisorEmpId] = useState('');
  const [bulkSelectedEmpIds, setBulkSelectedEmpIds] = useState<string[]>([]);
  const [bulkEmpSearch, setBulkEmpSearch] = useState('');
  const [bulkEmpDept, setBulkEmpDept] = useState('All');
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // Extract unique departments from employees
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      const dept = e[3];
      if (dept) set.add(dept.trim());
    });
    return Array.from(set).sort();
  }, [employees]);

  // List of distinct supervisor / manager names
  const availableSupervisors = useMemo(() => {
    const set = new Set<string>();
    supervisors.forEach(s => {
      if (s[0]) set.add(s[0].trim());
    });
    // Also include supervisors currently listed in employees
    employees.forEach(e => {
      if (e[6]) set.add(e[6].trim());
      if (e[17]) set.add(e[17].trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [supervisors, employees]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRaw, supRaw, empRaw] = await Promise.all([
        getRange(spreadsheetId, 'Users!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Supervisors!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Employees!A:Z').catch(() => []),
      ]);

      const usersData = usersRaw.length > 1 ? usersRaw.slice(1) : [];
      setUsers(usersData);
      localStorage.setItem('erp_local_users', JSON.stringify(usersData));
      
      setSupervisors(supRaw.length > 1 ? supRaw.slice(1) : []);
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

  // Calculate live preview of accessible employees for current formData
  const currentAccessibleEmployees = useMemo(() => {
    const scope: UserSecurityScope = {
      username: formData.username,
      role: formData.role as any,
      status: formData.status as any,
      accessLevel: formData.accessLevel,
      supervisorName: formData.supervisorName,
      accessLimitType: formData.accessLimitType,
      assignedEmployeeIds: formData.assignedEmployeeIds,
      assignedDepartment: formData.assignedDepartment,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      inputPermissions: formData.inputPermissions,
      isAdmin: formData.role === 'Admin' || formData.username.toLowerCase() === 'noor.alam1750@gmail.com',
      isSuperuser: formData.role === 'Superuser',
      isManager: formData.role === 'Manager',
      isSupervisor: formData.role === 'Supervisor' || formData.role === 'Manager' || formData.role === 'Superuser',
      isUser: formData.role === 'Standard User' || formData.role === 'User'
    };
    return filterAuthorizedEmployees(employees, scope);
  }, [formData, employees]);

  // Filtered employee list for the picker in user modal
  const filteredPickerEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = pickerSearch === '' || 
        emp[0]?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        emp[1]?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        emp[2]?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        emp[3]?.toLowerCase().includes(pickerSearch.toLowerCase());
      
      const matchesDept = pickerDept === 'All' || emp[3] === pickerDept;
      return matchesSearch && matchesDept;
    });
  }, [employees, pickerSearch, pickerDept]);

  const handleSelectAllPicker = () => {
    const allFilteredIds = filteredPickerEmployees.map(e => e[0].toUpperCase());
    setFormData(prev => ({
      ...prev,
      assignedEmployeeIds: Array.from(new Set([...prev.assignedEmployeeIds, ...allFilteredIds]))
    }));
  };

  const handleDeselectAllPicker = () => {
    const filteredIdsSet = new Set(filteredPickerEmployees.map(e => e[0].toUpperCase()));
    setFormData(prev => ({
      ...prev,
      assignedEmployeeIds: prev.assignedEmployeeIds.filter(id => !filteredIdsSet.has(id))
    }));
  };

  const toggleEmployeeSelection = (empId: string) => {
    const upper = empId.toUpperCase();
    setFormData(prev => {
      const exists = prev.assignedEmployeeIds.some(id => id.toUpperCase() === upper);
      return {
        ...prev,
        assignedEmployeeIds: exists
          ? prev.assignedEmployeeIds.filter(id => id.toUpperCase() !== upper)
          : [...prev.assignedEmployeeIds, upper]
      };
    });
  };

  const toggleInputPermission = (permId: string) => {
    setFormData(prev => {
      let current = [...prev.inputPermissions];
      if (current.includes('all')) {
        current = INPUT_PERMISSIONS_OPTIONS.map(p => p.id);
      }
      if (current.includes(permId)) {
        current = current.filter(p => p !== permId);
      } else {
        current.push(permId);
      }
      return { ...prev, inputPermissions: current };
    });
  };

  const handleSelectEmployeeLink = (empId: string) => {
    const emp = employees.find(e => e[0] === empId);
    if (!emp) return;

    setFormData(prev => ({
      ...prev,
      employeeId: emp[0],
      employeeName: emp[1],
      assignedDepartment: emp[3] || prev.assignedDepartment,
      supervisorName: emp[6] || prev.supervisorName,
      username: prev.username || (emp[11] && emp[11].includes('@') ? emp[11] : '')
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const values = [
      formData.username, 
      formData.password || 'OAUTH_GOOGLE',
      formData.role, 
      formData.status, 
      formData.accessLevel.join(','),
      formData.supervisorName,
      formData.accessLimitType,
      formData.assignedEmployeeIds.join(','),
      formData.assignedDepartment,
      formData.employeeId,
      formData.employeeName,
      formData.inputPermissions.join(','),
      formData.defaultNavigator || ''
    ];

    try {
      if (isEditing) {
        await updateRowByPrimaryKey(spreadsheetId, 'Users', formData.username, values);
      } else {
        await appendRow(spreadsheetId, 'Users!A:M', [values]);
      }
      if (formData.defaultNavigator) {
        localStorage.setItem(`erp_user_default_nav_${formData.username.toLowerCase()}`, formData.defaultNavigator);
      } else {
        localStorage.removeItem(`erp_user_default_nav_${formData.username.toLowerCase()}`);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save user.');
    }
  };

  const handleEdit = (row: string[]) => {
    const scope = parseUserSecurityScope(row);
    // Try to lookup employee name if not present
    let empName = scope.employeeName || '';
    let empId = scope.employeeId || '';
    if (!empName || !empId) {
      const match = employees.find(e => e[0] === empId || e[1]?.toLowerCase() === scope.username.toLowerCase() || (e[11] && e[11].includes(scope.username)));
      if (match) {
        empId = empId || match[0];
        empName = empName || match[1];
      }
    }

    setFormData({
      username: scope.username,
      password: row[1] === 'OAUTH_GOOGLE' ? '' : row[1],
      role: scope.role,
      status: scope.status,
      accessLevel: scope.accessLevel,
      supervisorName: scope.supervisorName,
      accessLimitType: scope.accessLimitType,
      assignedEmployeeIds: scope.assignedEmployeeIds,
      assignedDepartment: scope.assignedDepartment,
      employeeId: empId,
      employeeName: empName,
      inputPermissions: scope.inputPermissions || ['all'],
      defaultNavigator: scope.defaultNavigator || row[12] || ''
    });
    setPickerSearch('');
    setPickerDept('All');
    setIsEditing(true);
    setShowModal(true);
  };

  const handleOpenQuickScope = (row: string[]) => {
    setScopeUserRow(row);
    const scope = parseUserSecurityScope(row);
    setFormData({
      username: scope.username,
      password: row[1] === 'OAUTH_GOOGLE' ? '' : row[1],
      role: scope.role,
      status: scope.status,
      accessLevel: scope.accessLevel,
      supervisorName: scope.supervisorName,
      accessLimitType: scope.accessLimitType,
      assignedEmployeeIds: scope.assignedEmployeeIds,
      assignedDepartment: scope.assignedDepartment,
      employeeId: scope.employeeId || '',
      employeeName: scope.employeeName || '',
      inputPermissions: scope.inputPermissions || ['all'],
      defaultNavigator: scope.defaultNavigator || row[12] || ''
    });
    setPickerSearch('');
    setPickerDept('All');
    setShowQuickScopeModal(true);
  };

  const handleSaveQuickScope = async () => {
    if (!scopeUserRow) return;
    const values = [
      formData.username, 
      scopeUserRow[1] || 'OAUTH_GOOGLE',
      formData.role, 
      formData.status, 
      formData.accessLevel.join(','),
      formData.supervisorName,
      formData.accessLimitType,
      formData.assignedEmployeeIds.join(','),
      formData.assignedDepartment,
      formData.employeeId || scopeUserRow[9] || '',
      formData.employeeName || scopeUserRow[10] || '',
      formData.inputPermissions.join(','),
      formData.defaultNavigator || scopeUserRow[12] || ''
    ];

    try {
      await updateRowByPrimaryKey(spreadsheetId, 'Users', formData.username, values);
      setShowQuickScopeModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to update access scope.');
    }
  };

  const handleAccessChange = (module: string) => {
    setFormData(prev => ({
      ...prev,
      accessLevel: prev.accessLevel.includes(module)
        ? prev.accessLevel.filter(m => m !== module)
        : [...prev.accessLevel, module]
    }));
  };

  const handleDelete = (username: string) => {
    if (username.toLowerCase() === 'noor.alam1750@gmail.com') {
      alert('Cannot delete the primary Admin account.');
      return;
    }
    const userRow = users.find(u => u[0] === username);
    setDeleteModalTarget({
      type: 'user',
      id: username,
      name: userRow ? (userRow[10] || userRow[0]) : username,
      details: userRow ? `Role: ${userRow[2] || 'User'} | Department: ${userRow[8] || 'All'}` : undefined
    });
  };

  // Supervisor Management Handlers
  const handleSupSubmit = async (e: any) => {
    e.preventDefault();
    const values = [
      supFormData.name, 
      supFormData.role, 
      supFormData.department,
      supFormData.gmailId,
      supFormData.employeeId
    ];
    try {
      if (isEditingSup) {
        await updateRowByPrimaryKey(spreadsheetId, 'Supervisors', editingSupOriginalName, values);
      } else {
        await appendRow(spreadsheetId, 'Supervisors!A:E', [values]);
      }
      setShowSupModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save supervisor.');
    }
  };

  const handleSupEdit = (row: string[]) => {
    setEditingSupOriginalName(row[0]);
    setSupFormData({
      name: row[0] || '',
      role: row[1] || 'Supervisor',
      department: row[2] || '',
      gmailId: row[3] || '',
      employeeId: row[4] || ''
    });
    setIsEditingSup(true);
    setShowSupModal(true);
  };

  const handleSupDelete = (name: string) => {
    const supRow = supervisors.find(s => s[0] === name);
    setDeleteModalTarget({
      type: 'supervisor',
      id: name,
      name: name,
      details: supRow ? `Department: ${supRow[2] || 'All'} | Email: ${supRow[3] || 'N/A'}` : undefined
    });
  };

  const handleExecuteDeleteModal = async () => {
    if (!deleteModalTarget) return;
    try {
      if (deleteModalTarget.type === 'user') {
        await deleteRowByPrimaryKey(spreadsheetId, 'Users', deleteModalTarget.id);
      } else if (deleteModalTarget.type === 'supervisor') {
        await deleteRowByPrimaryKey(spreadsheetId, 'Supervisors', deleteModalTarget.id);
      }
      setDeleteModalTarget(null);
      await loadData();
    } catch (err) {
      console.error('Failed delete operation:', err);
      alert(`Failed to delete ${deleteModalTarget.type}.`);
    }
  };

  // Bulk assign supervisor name to selected employees
  const handleBulkAssignSupervisor = async () => {
    if (!bulkSupervisorName) {
      alert('Please specify a Supervisor Name.');
      return;
    }
    if (bulkSelectedEmpIds.length === 0) {
      alert('Please select at least one employee.');
      return;
    }

    setIsSavingBulk(true);
    try {
      for (const empId of bulkSelectedEmpIds) {
        const empRow = employees.find(e => e[0] === empId);
        if (empRow) {
          const updatedRow = [...empRow];
          while (updatedRow.length < 22) updatedRow.push('');
          updatedRow[6] = bulkSupervisorName; // Supervisor_Name is column G (index 6)
          await updateRowByPrimaryKey(spreadsheetId, 'Employees', empId, updatedRow);
        }
      }

      // Also ensure Supervisor is recorded in Supervisors sheet with Gmail if provided
      if (bulkSupervisorGmail || bulkSupervisorEmpId) {
        const supValues = [
          bulkSupervisorName,
          'Supervisor',
          bulkEmpDept !== 'All' ? bulkEmpDept : 'Production',
          bulkSupervisorGmail,
          bulkSupervisorEmpId
        ];
        const supExists = supervisors.some(s => s[0]?.toLowerCase() === bulkSupervisorName.toLowerCase());
        if (!supExists) {
          await appendRow(spreadsheetId, 'Supervisors!A:E', [supValues]);
        }
      }

      setBulkSuccessMsg(`Successfully assigned ${bulkSupervisorName} as supervisor for ${bulkSelectedEmpIds.length} employee(s)!`);
      setBulkSelectedEmpIds([]);
      loadData();
      setTimeout(() => setBulkSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to bulk assign supervisor:', err);
      alert('Failed to assign supervisor.');
    } finally {
      setIsSavingBulk(false);
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><Crown className="w-3 h-3 text-rose-600" /> Admin</span>;
      case 'superuser':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-600" /> Superuser</span>;
      case 'manager':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">Manager</span>;
      case 'supervisor':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">Supervisor</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-medium">Standard User</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Security Tools */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800">
                    Security & Access Control Management
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    securityReport.healthColor === 'green' ? 'bg-emerald-100 text-emerald-800' :
                    securityReport.healthColor === 'amber' ? 'bg-amber-100 text-amber-800' :
                    securityReport.healthColor === 'purple' ? 'bg-purple-100 text-purple-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      securityReport.healthColor === 'green' ? 'bg-emerald-500' :
                      securityReport.healthColor === 'amber' ? 'bg-amber-500' :
                      securityReport.healthColor === 'purple' ? 'bg-purple-500' :
                      'bg-rose-500'
                    }`} />
                    {securityReport.health}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centralized user-wise accessibility, granular permissions, conflict detection, supervisor hierarchies, and data isolation scopes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('accessNotSet')}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
              title="Inspect unconfigured or missing access items"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Check Access Configuration
            </button>
            <button
              onClick={() => setShowRoleComparisonModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 text-slate-600" />
              Compare Roles
            </button>
            <button
              onClick={() => setShowImpersonationModal(true)}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
            >
              <Eye className="w-4 h-4 text-purple-600" />
              Preview Access As
            </button>
            <button
              onClick={() => setShowAuditLogModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              <History className="w-4 h-4 text-slate-600" />
              Audit Logs
            </button>
            {activeTab === 'users' && (
              <button
                onClick={() => {
                  setFormData({
                    username: '',
                    password: '',
                    role: 'Standard User',
                    status: 'Active',
                    accessLevel: ['Employee Directory'],
                    supervisorName: '',
                    accessLimitType: 'all',
                    assignedEmployeeIds: [],
                    assignedDepartment: '',
                    employeeId: '',
                    employeeName: '',
                    inputPermissions: ['all'],
                    defaultNavigator: ''
                  });
                  setIsEditing(false);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Add New User
              </button>
            )}
            {activeTab === 'supervisors' && (
              <button
                onClick={() => {
                  setSupFormData({
                    name: '',
                    role: 'Supervisor',
                    department: '',
                    gmailId: '',
                    employeeId: ''
                  });
                  setIsEditingSup(false);
                  setShowSupModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Add Supervisor / Manager
              </button>
            )}
          </div>
        </div>

        {/* Health Stats Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Users</span>
            <span className="text-base font-bold text-slate-800">{users.length}</span>
          </div>
          <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-600 block uppercase">Fully Configured</span>
            <span className="text-base font-bold text-emerald-700">{securityReport.summary.fullyConfiguredUsers}</span>
          </div>
          <div 
            onClick={() => setActiveTab('accessNotSet')}
            className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200 cursor-pointer hover:border-amber-400 transition"
          >
            <span className="text-[10px] font-bold text-amber-600 block uppercase">Access Not Set</span>
            <span className="text-base font-bold text-amber-700">{securityReport.summary.accessNotSetUsers + securityReport.summary.partiallyConfiguredUsers}</span>
          </div>
          <div 
            onClick={() => setActiveTab('conflicts')}
            className="bg-purple-50/50 p-2.5 rounded-lg border border-purple-200 cursor-pointer hover:border-purple-400 transition"
          >
            <span className="text-[10px] font-bold text-purple-600 block uppercase">Conflicts</span>
            <span className="text-base font-bold text-purple-700">{totalConflictsCount}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Supervisors</span>
            <span className="text-base font-bold text-slate-800">{supervisors.length}</span>
          </div>
          <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-200">
            <span className="text-[10px] font-bold text-blue-600 block uppercase">System Health</span>
            <span className="text-base font-bold text-blue-800">{securityReport.completionPercentage}%</span>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          User Accounts & Roles ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'access'
              ? 'border-blue-600 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Access & Assignment Scope Matrix
        </button>

        <button
          onClick={() => setActiveTab('accessNotSet')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'accessNotSet'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          ⚠️ Access Not Set
          {securityReport.summary.accessNotSetUsers > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
              {securityReport.summary.accessNotSetUsers}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'conflicts'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-purple-500" />
          ⚠️ Permission Conflicts
          {totalConflictsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 text-purple-900 font-bold">
              {totalConflictsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('navigator')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'navigator'
              ? 'border-blue-600 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Compass className="w-4 h-4 text-blue-600" />
          Navigator Settings & Default Assignment
        </button>

        <button
          onClick={() => setActiveTab('supervisors')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'supervisors'
              ? 'border-blue-600 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Supervisors Registry & Gmail Link
        </button>

        <button
          onClick={() => setActiveTab('assignSupervisor')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'assignSupervisor'
              ? 'border-blue-600 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Assign Supervisor to Staff
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'holidays'
              ? 'border-blue-600 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-blue-600" />
          Official Holidays & Calendar
        </button>

        <button
          onClick={() => setActiveTab('erpSettings')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'erpSettings'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/30'
              : 'border-transparent text-slate-500 hover:text-indigo-700'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          ERP Settings
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'database'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-indigo-600'
          }`}
        >
          <Cloud className="w-4 h-4 text-indigo-600" />
          Google Drive & Cloud DB Migration
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : activeTab === 'users' ? (
        /* TAB 1: USERS LIST */
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="px-6 py-3.5">Employee / Account</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Supervisor / Dept</th>
                  <th className="px-6 py-3.5">Assignment Scope</th>
                  <th className="px-6 py-3.5">Default Navigator</th>
                  <th className="px-6 py-3.5">Input Control</th>
                  <th className="px-6 py-3.5">Security Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((row, i) => {
                  const scope = parseUserSecurityScope(row);
                  const authEmps = filterAuthorizedEmployees(employees, scope);
                  const desc = getAccessLimitDescription(scope, authEmps.length);
                  const empMatch = employees.find(e => e[0] === scope.employeeId || e[1]?.toLowerCase() === scope.username.toLowerCase());
                  const displayName = scope.employeeName || (empMatch ? empMatch[1] : formatEmailToName(row[0]));

                  // Compute configuration status for this user
                  const userConflicts = detectPermissionConflicts(scope);
                  const isConflicted = userConflicts.length > 0;
                  const isNotSet = (!scope.role || scope.role === 'Standard User') && (!scope.accessLevel || scope.accessLevel.length === 0);
                  const isPartiallySet = !scope.supervisorName && !scope.assignedDepartment && !scope.isAdmin;

                  return (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center ${
                            scope.isAdmin ? 'bg-rose-100 text-rose-700' :
                            scope.isSuperuser ? 'bg-indigo-100 text-indigo-700' :
                            scope.isSupervisor ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              {displayName}
                              {scope.employeeId && (
                                <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {scope.employeeId}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{row[0]}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderRoleBadge(scope.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                        {scope.supervisorName ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            {scope.supervisorName}
                          </span>
                        ) : scope.assignedDepartment ? (
                          <span className="text-slate-600 font-medium">{scope.assignedDepartment}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                            scope.accessLimitType === 'all' || scope.isAdmin
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : scope.accessLimitType === 'supervised'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : scope.accessLimitType === 'selected'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            <Users className="w-3 h-3" />
                            {desc}
                          </span>
                          <button
                            onClick={() => handleOpenQuickScope(row)}
                            className="text-[11px] text-blue-600 hover:underline font-medium"
                          >
                            Limit
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {scope.defaultNavigator ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                            <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {findNavigator(scope.defaultNavigator)?.name || scope.defaultNavigator}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic flex items-center gap-1.5 text-xs">
                            <Compass className="w-3.5 h-3.5 text-slate-300" />
                            System Default
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {scope.isAdmin || (scope.inputPermissions && scope.inputPermissions.includes('all')) ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Unlock className="w-3 h-3" /> Full Input
                          </span>
                        ) : scope.inputPermissions && scope.inputPermissions.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                            <Sliders className="w-3 h-3" /> {scope.inputPermissions.length} Modules
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Lock className="w-3 h-3" /> Read Only
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {scope.status === 'Inactive' ? (
                            <span className="px-2 py-0.5 inline-flex text-[11px] font-bold rounded-full bg-slate-100 text-slate-600">
                              Inactive
                            </span>
                          ) : isConflicted ? (
                            <span 
                              onClick={() => setActiveTab('conflicts')}
                              className="px-2 py-0.5 inline-flex text-[11px] font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200 cursor-pointer"
                              title={`${userConflicts.length} conflicts detected`}
                            >
                              ⚠️ {userConflicts.length} Conflicts
                            </span>
                          ) : isNotSet ? (
                            <span 
                              onClick={() => setActiveTab('accessNotSet')}
                              className="px-2 py-0.5 inline-flex text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200 cursor-pointer"
                            >
                              ⚠️ Access Not Set
                            </span>
                          ) : isPartiallySet ? (
                            <span className="px-2 py-0.5 inline-flex text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              🟡 Partially Set
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 inline-flex text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              🟢 Fully Configured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSummaryUserScope(scope);
                              setShowAccessSummaryModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Inspect Effective User Permissions Summary"
                          >
                            <Sparkles className="w-4 h-4 text-blue-600" />
                          </button>
                          <button 
                            onClick={() => handleEdit(row)} 
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition" 
                            title="Edit User & Permissions"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {row[0]?.toLowerCase() !== 'noor.alam1750@gmail.com' && (
                            <button 
                              onClick={() => handleDelete(row[0])} 
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" 
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">
                      No users found. Click &quot;Add New User&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'access' ? (
        /* TAB 2: ACCESS MATRIX TAB */
        <AccessMatrixTab
          users={users}
          employees={employees}
          adminUser={user}
          onRefreshUsers={loadData}
          onOpenUserSummary={(scope) => {
            setSummaryUserScope(scope);
            setShowAccessSummaryModal(true);
          }}
        />
      ) : activeTab === 'accessNotSet' ? (
        /* TAB: ⚠️ ACCESS NOT SET SCANNER */
        <AccessNotSetTab
          users={users}
          employees={employees}
          supervisors={supervisors}
          onOpenUserModal={(row) => {
            if (row) handleEdit(row);
            else {
              setFormData({
                username: '',
                password: '',
                role: 'Standard User',
                status: 'Active',
                accessLevel: ['Employee Directory'],
                supervisorName: '',
                accessLimitType: 'all',
                assignedEmployeeIds: [],
                assignedDepartment: '',
                employeeId: '',
                employeeName: '',
                inputPermissions: ['all'],
                defaultNavigator: ''
              });
              setIsEditing(false);
              setShowModal(true);
            }
          }}
          onOpenAssignSupervisor={() => setActiveTab('assignSupervisor')}
          onOpenNavigatorManagement={() => setActiveTab('navigator')}
          onOpenSupervisorsRegistry={() => setActiveTab('supervisors')}
          onOpenUserSummary={(scope) => {
            setSummaryUserScope(scope);
            setShowAccessSummaryModal(true);
          }}
          onRefreshAll={loadData}
        />
      ) : activeTab === 'conflicts' ? (
        /* TAB: ⚠️ PERMISSION CONFLICTS DETECTOR */
        <PermissionConflictsTab
          users={users}
          adminUser={user}
          onRefreshUsers={loadData}
          onOpenUserSummary={(scope) => {
            setSummaryUserScope(scope);
            setShowAccessSummaryModal(true);
          }}
        />
      ) : activeTab === 'navigator' ? (
        /* TAB: NAVIGATOR MASTER SETTINGS & DEFAULT ASSIGNMENT */
        <NavigatorManagement
          spreadsheetId={spreadsheetId}
          users={users}
          employees={employees}
          user={user}
          userSecurityScope={userSecurityScope}
          onRefreshUsers={loadData}
        />
      ) : activeTab === 'supervisors' ? (
        /* TAB 3: SUPERVISORS REGISTRY */
        <div className="bg-white border border-[#E6E9ED] rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Supervisors & Managers Registry</h2>
              <p className="text-xs text-gray-500">Supervisors linked with their Gmail ID and unique Employee ID.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supervisor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Gmail ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supervised Staff</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supervisors.map((row, i) => {
                  const supName = row[0];
                  const reportsCount = employees.filter(e => {
                    const s = e[6]?.toLowerCase() || '';
                    const m = e[17]?.toLowerCase() || '';
                    const match = supName.toLowerCase();
                    return s.includes(match) || m.includes(match);
                  }).length;

                  return (
                    <tr key={i} className="hover:bg-blue-50/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {supName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-gray-700">
                        {row[4] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {row[3] ? (
                          <span className="flex items-center gap-1 text-blue-700">
                            <Mail className="w-3 h-3" /> {row[3]}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                          row[1] === 'Manager' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {row[1]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row[2] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md text-xs">
                          <Users className="w-3.5 h-3.5" />
                          {reportsCount} Staff
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleSupEdit(row)} 
                            className="p-1.5 text-[#337AB7] hover:bg-blue-50 rounded-md transition-colors" 
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleSupDelete(row[0])} 
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" 
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {supervisors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                      No supervisors configured. Click &quot;Add Supervisor / Manager&quot; to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'assignSupervisor' ? (
        /* TAB 4: SET EMPLOYEE SUPERVISOR IN BULK */
        <div className="bg-white border border-[#E6E9ED] rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Supervisor with Gmail ID & Employee Unique ID
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Select one or multiple employees and assign their Supervisor Name and Supervisor account in the master system.
            </p>
          </div>

          {bulkSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {bulkSuccessMsg}
            </div>
          )}

          {/* Supervisor Target Selector & Action */}
          <div className="bg-gray-50/80 p-5 rounded-lg border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Supervisor Name *
                </label>
                <input
                  type="text"
                  list="bulk-supervisor-options"
                  value={bulkSupervisorName}
                  onChange={e => {
                    const val = e.target.value;
                    setBulkSupervisorName(val);
                    const matchedEmp = employees.find(emp => emp[1]?.toLowerCase() === val.toLowerCase());
                    if (matchedEmp) {
                      setBulkSupervisorEmpId(matchedEmp[0]);
                      if (matchedEmp[11] && matchedEmp[11].includes('@')) {
                        setBulkSupervisorGmail(matchedEmp[11]);
                      }
                    }
                  }}
                  placeholder="Select or enter supervisor name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <datalist id="bulk-supervisor-options">
                  {availableSupervisors.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                  {employees.map((e, idx) => (
                    <option key={`${e[0]}-${idx}`} value={e[1]}>{e[0]} - {e[1]}</option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Supervisor Employee Unique ID
                </label>
                <input
                  type="text"
                  value={bulkSupervisorEmpId}
                  onChange={e => setBulkSupervisorEmpId(e.target.value)}
                  placeholder="e.g. EMP001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Supervisor Gmail ID
                </label>
                <input
                  type="email"
                  value={bulkSupervisorGmail}
                  onChange={e => setBulkSupervisorGmail(e.target.value)}
                  placeholder="e.g. supervisor@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-600">
                Selected Staff to Assign: <span className="text-blue-700 font-bold">{bulkSelectedEmpIds.length}</span> employees
              </div>
              <button
                type="button"
                disabled={isSavingBulk || bulkSelectedEmpIds.length === 0 || !bulkSupervisorName}
                onClick={handleBulkAssignSupervisor}
                className="px-5 py-2 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {isSavingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply Supervisor Assignment
              </button>
            </div>
          </div>

          {/* Search & Filter for bulk assignment */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={bulkEmpSearch}
                  onChange={e => setBulkEmpSearch(e.target.value)}
                  placeholder="Search employee ID or name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-md"
                />
              </div>
              <select
                value={bulkEmpDept}
                onChange={e => setBulkEmpDept(e.target.value)}
                className="text-xs border border-gray-300 rounded-md px-2.5 py-1.5 bg-white"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const filtered = employees.filter(e => {
                    const matchSearch = bulkEmpSearch === '' || 
                      e[0]?.toLowerCase().includes(bulkEmpSearch.toLowerCase()) ||
                      e[1]?.toLowerCase().includes(bulkEmpSearch.toLowerCase());
                    const matchDept = bulkEmpDept === 'All' || e[3] === bulkEmpDept;
                    return matchSearch && matchDept;
                  }).map(e => e[0]);
                  setBulkSelectedEmpIds(Array.from(new Set([...bulkSelectedEmpIds, ...filtered])));
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
              >
                Select Filtered
              </button>
              <button
                type="button"
                onClick={() => setBulkSelectedEmpIds([])}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Table of employees for supervisor assignment */}
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Select</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Designation</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Current Supervisor</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {employees
                  .filter(e => {
                    const matchSearch = bulkEmpSearch === '' || 
                      e[0]?.toLowerCase().includes(bulkEmpSearch.toLowerCase()) ||
                      e[1]?.toLowerCase().includes(bulkEmpSearch.toLowerCase());
                    const matchDept = bulkEmpDept === 'All' || e[3] === bulkEmpDept;
                    return matchSearch && matchDept;
                  })
                  .map((emp, idx) => {
                    const isChecked = bulkSelectedEmpIds.includes(emp[0]);
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => {
                          setBulkSelectedEmpIds(prev => 
                            isChecked ? prev.filter(id => id !== emp[0]) : [...prev, emp[0]]
                          );
                        }}
                        className={`cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/70' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-2">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-blue-600"
                          />
                        </td>
                        <td className="px-4 py-2 font-bold text-gray-900">{emp[0]}</td>
                        <td className="px-4 py-2 font-medium text-gray-800">{emp[1]}</td>
                        <td className="px-4 py-2 text-gray-600">{emp[3] || '-'}</td>
                        <td className="px-4 py-2 text-gray-600">{emp[2] || '-'}</td>
                        <td className="px-4 py-2">
                          {emp[6] ? (
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {emp[6]}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'holidays' ? (
        /* TAB 5: HOLIDAYS & CALENDAR MANAGEMENT */
        <HolidayManagement 
          spreadsheetId={spreadsheetId} 
          user={user} 
          userSecurityScope={userSecurityScope} 
        />
      ) : activeTab === 'erpSettings' ? (
        <ERPSettings />
      ) : (
        /* TAB 6: GOOGLE DRIVE & CLOUD DB MIGRATION */
        <GoogleDriveSettings 
          spreadsheetId={spreadsheetId} 
          user={user} 
        />
      )}

      {/* FULL USER CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-[#F7F7F7] rounded-xl max-w-5xl w-full border border-gray-300 shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="bg-white p-5 border-b border-[#E6E9ED] flex justify-between items-center sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    {isEditing ? `Edit User: ${formData.employeeName || formData.username}` : 'Create New User Account'}
                  </h2>
                  <p className="text-xs text-gray-500">Configure role, employee linking by Unique ID, and input/assignment limits.</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#337AB7] text-white text-xs font-bold rounded-md hover:bg-[#286090] flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Save User & Security Permissions
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* SECTION 1: LINK EMPLOYEE RECORD BY UNIQUE ID */}
              <div className="bg-white p-6 rounded-lg border border-indigo-200 shadow-sm space-y-4 ring-1 ring-indigo-50">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <IdCard className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Link Employee Record by Unique ID
                      </h3>
                      <p className="text-xs text-gray-500">Auto-populates full name, department, designation, and supervisor.</p>
                    </div>
                  </div>
                  {formData.employeeId && (
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-mono font-bold">
                      Linked: {formData.employeeId} - {formData.employeeName}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Choose Employee (By ID or Name)
                    </label>
                    <select
                      value={formData.employeeId}
                      onChange={e => handleSelectEmployeeLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Employee to Link --</option>
                      {employees.map((e, idx) => (
                        <option key={`${e[0]}-${idx}`} value={e[0]}>
                          {e[0]} - {e[1]} ({e[3]})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Employee Full Name</label>
                    <input 
                      value={formData.employeeName} 
                      onChange={e => setFormData({...formData, employeeName: e.target.value})} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                      placeholder="e.g. Md. Noor Alam"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Employee Unique ID</label>
                    <input 
                      value={formData.employeeId} 
                      onChange={e => setFormData({...formData, employeeId: e.target.value})} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white font-mono"
                      placeholder="e.g. EMP001"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: ACCOUNT PROFILE & ROLES */}
              <div className="bg-white p-6 rounded-lg border border-[#E6E9ED] shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-3 uppercase tracking-wider flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  Account Profile & Role Tier
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Gmail ID / Login Username *</label>
                    <input 
                      required 
                      readOnly={isEditing} 
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value})} 
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${isEditing ? 'bg-gray-100 text-gray-600' : 'bg-white'}`}
                      placeholder="e.g. supervisor@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">User Role Tier *</label>
                    <select 
                      value={formData.role} 
                      onChange={e => {
                        const newRole = e.target.value;
                        setFormData(prev => ({
                          ...prev, 
                          role: newRole,
                          accessLimitType: newRole === 'Supervisor' ? 'supervised' : prev.accessLimitType
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white font-semibold"
                    >
                      <option value="Admin">👑 Admin (Full System Control)</option>
                      <option value="Superuser">✨ Superuser (Elevated Enterprise Scope)</option>
                      <option value="Manager">💼 Manager (Multi-Department)</option>
                      <option value="Supervisor">👔 Supervisor (Team Lead)</option>
                      <option value="Standard User">👤 Standard User</option>
                      <option value="Operator">⚙️ Operator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Account Status</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center uppercase">
                      <KeyRound className="w-3.5 h-3.5 mr-1 text-gray-500" /> Password (Optional if OAuth)
                    </label>
                    <input 
                      type="password"
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      placeholder={isEditing ? "•••••• (Leave blank to keep unchanged)" : "Enter password"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Linked Supervisor Name</label>
                    <input
                      type="text"
                      list="user-supervisor-list"
                      value={formData.supervisorName}
                      onChange={e => setFormData({...formData, supervisorName: e.target.value})}
                      placeholder="e.g. Sarah Connor"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    />
                    <datalist id="user-supervisor-list">
                      {availableSupervisors.map((s, idx) => (
                        <option key={idx} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Assigned Department</label>
                    <select
                      value={formData.assignedDepartment}
                      onChange={e => setFormData({...formData, assignedDepartment: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">-- No specific department --</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center uppercase">
                      <Compass className="w-3.5 h-3.5 mr-1 text-blue-600" /> Default Landing Navigator
                    </label>
                    <select
                      value={formData.defaultNavigator}
                      onChange={e => setFormData({...formData, defaultNavigator: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white font-medium text-gray-800"
                    >
                      <option value="">-- System Default (ERP Dashboard) --</option>
                      {DEFAULT_SYSTEM_NAVIGATORS.map(nav => (
                        <option key={nav.id} value={nav.id}>
                          🧭 {nav.name} ({nav.category} - {nav.moduleName})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Automatically opens when this user logs into the ERP if authorized.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: INPUT CONTROL & PERMISSIONS (For Admin control over Superuser / Users) */}
              <div className="bg-white p-6 rounded-lg border border-purple-200 shadow-sm space-y-4 ring-1 ring-purple-50">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Admin Input & Editing Control
                      </h3>
                      <p className="text-xs text-gray-500">
                        Admin can restrict or customize which operational data this user is allowed to input and submit.
                      </p>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, inputPermissions: ['all'] }))}
                      className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
                        formData.inputPermissions.includes('all') ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Allow All Inputs
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, inputPermissions: [] }))}
                      className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
                        formData.inputPermissions.length === 0 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Read Only (No Input)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {INPUT_PERMISSIONS_OPTIONS.map(opt => {
                    const isChecked = formData.inputPermissions.includes('all') || formData.inputPermissions.includes(opt.id);
                    return (
                      <label 
                        key={opt.id} 
                        className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                          isChecked ? 'bg-purple-50/60 border-purple-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleInputPermission(opt.id)}
                          className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-gray-900">{opt.name}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: EMPLOYEE ACCESS LIMIT POLICY */}
              <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm space-y-5 ring-1 ring-blue-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Employee Assignment & Visibility Scope
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Determines which employees this user can view and assign to across all modules.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
                    <Users className="w-3.5 h-3.5" />
                    Authorized Staff: {currentAccessibleEmployees.length} of {employees.length}
                  </div>
                </div>

                {/* Policy Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, accessLimitType: 'all'})}
                    className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      formData.accessLimitType === 'all'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                        <span>🌐 All Staff</span>
                        {formData.accessLimitType === 'all' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Full enterprise company-wide scope.</p>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700 mt-2">All {employees.length} Employees</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, accessLimitType: 'supervised'})}
                    className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      formData.accessLimitType === 'supervised'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                        <span>👔 Supervised</span>
                        {formData.accessLimitType === 'supervised' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Direct reports to supervisor name.</p>
                    </div>
                    <div className="text-[10px] font-bold text-blue-700 mt-2">
                      {formData.supervisorName || 'Needs supervisor name'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, accessLimitType: 'selected'})}
                    className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      formData.accessLimitType === 'selected'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                        <span>🎯 Selected List</span>
                        {formData.accessLimitType === 'selected' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Custom chosen employee list.</p>
                    </div>
                    <div className="text-[10px] font-bold text-purple-700 mt-2">
                      {formData.assignedEmployeeIds.length} Selected
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, accessLimitType: 'department'})}
                    className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      formData.accessLimitType === 'department'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                        <span>🏢 Department</span>
                        {formData.accessLimitType === 'department' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Specific department employees.</p>
                    </div>
                    <div className="text-[10px] font-bold text-indigo-700 mt-2">
                      {formData.assignedDepartment || 'Pick dept'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, accessLimitType: 'self'})}
                    className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      formData.accessLimitType === 'self'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                        <span>👤 Self Only</span>
                        {formData.accessLimitType === 'self' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Own employee record only.</p>
                    </div>
                    <div className="text-[10px] font-bold text-gray-600 mt-2">1 Record</div>
                  </button>
                </div>

                {/* Specific Employee Selection Table */}
                {(formData.accessLimitType === 'selected' || formData.accessLimitType === 'supervised') && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        {formData.accessLimitType === 'selected' 
                          ? 'Select Specific Employees for this User:'
                          : 'Additional Specific Employees (Optional Exceptions):'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={handleSelectAllPicker} className="text-xs text-blue-700 font-semibold hover:underline">Select All</button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={handleDeselectAllPicker} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={e => setPickerSearch(e.target.value)}
                          placeholder="Search ID, name, designation..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md"
                        />
                      </div>
                      <select
                        value={pickerDept}
                        onChange={e => setPickerDept(e.target.value)}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                      >
                        <option value="All">All Departments</option>
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 bg-white rounded-md border border-gray-200 custom-scrollbar">
                      {filteredPickerEmployees.map((emp, idx) => {
                        const isChecked = formData.assignedEmployeeIds.some(id => id.toUpperCase() === emp[0]?.toUpperCase());
                        return (
                          <label key={idx} className="flex items-center justify-between p-2.5 hover:bg-gray-50 cursor-pointer text-xs transition-colors">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleEmployeeSelection(emp[0])}
                                className="rounded text-blue-600"
                              />
                              <span className="font-mono font-bold text-gray-900">{emp[0]}</span>
                              <span className="font-medium text-gray-800">{emp[1]}</span>
                              <span className="text-gray-400 text-[11px]">({emp[2] || '-'})</span>
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium">{emp[3]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: MODULE VISIBILITY */}
              <div className="bg-white p-6 rounded-lg border border-[#E6E9ED] shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-3 uppercase tracking-wider">
                  Navigation Module Access Permissions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {TAB_MODULES.map(module => (
                    <label key={module} className="flex items-center cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.accessLevel.includes(module) || formData.accessLevel.includes('All')}
                        onChange={() => handleAccessChange(module)}
                        className="w-4 h-4 text-[#337AB7] bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2 text-xs font-medium text-gray-700 group-hover:text-gray-900">{module}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* QUICK ACCESS SCOPE MODAL */}
      {showQuickScopeModal && scopeUserRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Configure Assignment Limit: {formData.employeeName || formData.username}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Control which employees this user is permitted to see and assign to.</p>
              </div>
              <button onClick={() => setShowQuickScopeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supervisor Link */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Linked Supervisor Name
              </label>
              <input
                type="text"
                list="quick-supervisor-options"
                value={formData.supervisorName}
                onChange={e => setFormData({...formData, supervisorName: e.target.value})}
                placeholder="e.g. Sarah Connor"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white"
              />
              <datalist id="quick-supervisor-options">
                {availableSupervisors.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>

            {/* Access Limit Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Access Limit Policy
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', name: '🌐 All Staff', sub: 'Full Access' },
                  { id: 'supervised', name: '👔 Supervised', sub: 'Direct Reports' },
                  { id: 'selected', name: '🎯 Selected', sub: 'Custom Checkboxes' },
                  { id: 'department', name: '🏢 Department', sub: 'Dept Only' },
                  { id: 'self', name: '👤 Self', sub: 'Own Profile' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({...formData, accessLimitType: opt.id as AccessLimitType})}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      formData.accessLimitType === opt.id
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xs">{opt.name}</div>
                    <div className="text-[10px] text-gray-500 font-normal">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Department field if department mode */}
            {formData.accessLimitType === 'department' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={formData.assignedDepartment}
                  onChange={e => setFormData({...formData, assignedDepartment: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Employee Checkboxes if Selected */}
            {formData.accessLimitType === 'selected' && (
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Selected Employees ({formData.assignedEmployeeIds.length}):</span>
                  <div className="space-x-2">
                    <button type="button" onClick={handleSelectAllPicker} className="text-blue-700 hover:underline">Select All</button>
                    <button type="button" onClick={handleDeselectAllPicker} className="text-gray-500 hover:text-gray-700">Clear</button>
                  </div>
                </div>
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Filter employees..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md mb-2"
                />
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white rounded border border-gray-200">
                  {filteredPickerEmployees.map((emp, idx) => {
                    const isChecked = formData.assignedEmployeeIds.some(id => id.toUpperCase() === emp[0]?.toUpperCase());
                    return (
                      <label key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEmployeeSelection(emp[0])}
                            className="rounded text-blue-600"
                          />
                          <span className="font-bold text-gray-900">{emp[0]}</span>
                          <span className="text-gray-800">{emp[1]}</span>
                        </div>
                        <span className="text-[11px] text-gray-500">{emp[3]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Count Preview */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900">Total Authorized Staff:</span>
              <span className="font-bold text-blue-700 bg-white px-2.5 py-1 rounded border border-blue-200">
                {currentAccessibleEmployees.length} of {employees.length} employees
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickScopeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickScope}
                className="px-5 py-2 bg-[#337AB7] hover:bg-[#286090] text-white rounded-md text-xs font-bold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPERVISOR CREATE/EDIT MODAL */}
      {showSupModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              {isEditingSup ? 'Edit Supervisor / Manager' : 'Add Supervisor / Manager'}
            </h2>
            <form onSubmit={handleSupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Supervisor Name *</label>
                <input 
                  required 
                  list="sup-emp-names"
                  value={supFormData.name} 
                  onChange={e => {
                    const nameVal = e.target.value;
                    setSupFormData(prev => ({ ...prev, name: nameVal }));
                    const match = employees.find(emp => emp[1]?.toLowerCase() === nameVal.toLowerCase());
                    if (match) {
                      setSupFormData(prev => ({
                        ...prev,
                        employeeId: match[0],
                        department: match[3] || prev.department,
                        gmailId: (match[11] && match[11].includes('@')) ? match[11] : prev.gmailId
                      }));
                    }
                  }} 
                  placeholder="Supervisor name or choose employee..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" 
                />
                <datalist id="sup-emp-names">
                  {employees.map((e, idx) => (
                    <option key={`${e[0]}-${idx}`} value={e[1]}>{e[0]} - {e[1]} ({e[3]})</option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Employee Unique ID</label>
                  <input 
                    value={supFormData.employeeId} 
                    onChange={e => setSupFormData({...supFormData, employeeId: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono" 
                    placeholder="e.g. EMP001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Role *</label>
                  <select 
                    value={supFormData.role} 
                    onChange={e => setSupFormData({...supFormData, role: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white font-semibold"
                  >
                    <option value="Supervisor">Supervisor</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Supervisor Gmail ID</label>
                <input 
                  type="email"
                  value={supFormData.gmailId} 
                  onChange={e => setSupFormData({...supFormData, gmailId: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs" 
                  placeholder="e.g. supervisor@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Department</label>
                <input 
                  value={supFormData.department} 
                  onChange={e => setSupFormData({...supFormData, department: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs" 
                  placeholder="e.g. Cutting, Sewing, Quality"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setShowSupModal(false)} 
                  className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#337AB7] text-white rounded-md text-xs font-bold hover:bg-[#286090] shadow-sm"
                >
                  Save Supervisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER EFFECTIVE ACCESS SUMMARY MODAL */}
      {showAccessSummaryModal && summaryUserScope && (
        <UserAccessSummaryModal
          userScope={summaryUserScope}
          adminUser={user}
          employees={employees}
          onClose={() => {
            setShowAccessSummaryModal(false);
            setSummaryUserScope(null);
          }}
          onRefresh={loadData}
        />
      )}

      {/* ROLE COMPARISON MODAL */}
      {showRoleComparisonModal && (
        <RoleComparisonModal
          onClose={() => setShowRoleComparisonModal(false)}
        />
      )}

      {/* IMPERSONATION PREVIEW MODAL */}
      {showImpersonationModal && (
        <ImpersonationPreviewModal
          users={users}
          employees={employees}
          onClose={() => setShowImpersonationModal(false)}
        />
      )}

      {/* SECURITY AUDIT LOGS MODAL */}
      {showAuditLogModal && (
        <SecurityAuditLogModal
          onClose={() => setShowAuditLogModal(false)}
        />
      )}

      {/* ADMIN PASSWORD DELETION MODAL */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteModalTarget)}
        title={deleteModalTarget?.type === 'user' ? 'Delete User Account' : 'Delete Supervisor Record'}
        itemName={deleteModalTarget?.name || deleteModalTarget?.id}
        itemDetails={deleteModalTarget?.details}
        warningMessage={
          deleteModalTarget?.type === 'user'
            ? 'Deleting this user account will revoke their system access permissions permanently. Enter Admin Deletion Password to confirm.'
            : 'Deleting this supervisor record will unassign them from supervisory workflows. Enter Admin Deletion Password to confirm.'
        }
        confirmButtonText={deleteModalTarget?.type === 'user' ? 'Verify & Delete User' : 'Verify & Delete Supervisor'}
        onConfirm={handleExecuteDeleteModal}
        onClose={() => setDeleteModalTarget(null)}
      />
    </div>
  );
}

