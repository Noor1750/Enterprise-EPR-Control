import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { 
  Loader2, Plus, Edit2, Trash2, Upload, LayoutGrid, List, Shield, 
  Search, Filter, RefreshCw, Calendar, Clock, History, AlertCircle, 
  CheckCircle2, Download, Sparkles, UserX, Users, Briefcase, 
  Shirt, Footprints, HeartHandshake, Eye, AlertTriangle, Sun, Moon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserSecurityScope, filterAuthorizedEmployees, recordSecurityAuditLog } from '../lib/security';
import { 
  ShiftType, 
  ShiftMode, 
  EmployeeShiftState, 
  parseEmployeeShiftState, 
  updateEmployeeShiftAssignment, 
  resumeAutomaticRotation,
  getSaturdayWeekRange, 
  getNextSaturdayWeekRange, 
  getShiftBadgeStyles, 
  getShiftModeBadgeStyles,
  normalizeShift
} from '../lib/shiftEngine';
import { format } from 'date-fns';
import AdminDeleteConfirmModal from './common/AdminDeleteConfirmModal';
import EmployeeAddEditModal from './employee/EmployeeAddEditModal';
import EmployeeProfileModal from './employee/EmployeeProfileModal';
import InactiveEmployeesModal from './employee/InactiveEmployeesModal';
import QuickShiftModal from './employee/QuickShiftModal';
import ShiftHistoryModal from './employee/ShiftHistoryModal';
import ShiftBadge, { ShiftIcon } from './common/ShiftBadge';
import { 
  EmployeeFormData, 
  VOLUNTEER_ROLES, 
  calculateTenure 
} from './employee/employeeTypes';

const getXlsx = () => XLSX;

interface EmployeeDirectoryProps {
  spreadsheetId: string;
  userSecurityScope?: UserSecurityScope;
}

export default function EmployeeDirectory({ spreadsheetId, userSecurityScope }: EmployeeDirectoryProps) {
  const [allEmployeesRaw, setAllEmployeesRaw] = useState<string[][]>([]);
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [managers, setManagers] = useState<string[][]>([]);
  const [shiftHistoryRaw, setShiftHistoryRaw] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters & Views
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [volunteerFilter, setVolunteerFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; emp: EmployeeShiftState | null; password: string } | null>(null);
  
  // Quick Shift Modal state
  const [shiftModalEmployee, setShiftModalEmployee] = useState<EmployeeShiftState | null>(null);
  const [newShiftValue, setNewShiftValue] = useState<ShiftType>('Day Shift');
  const [newShiftMode, setNewShiftMode] = useState<ShiftMode>('Automatic Rotation');
  const [overrideEffectiveDate, setOverrideEffectiveDate] = useState<string>('');
  const [overrideRemarks, setOverrideRemarks] = useState<string>('');
  const [isSavingShift, setIsSavingShift] = useState(false);

  // History & Profile & Inactive Modals
  const [historyModalEmployee, setHistoryModalEmployee] = useState<EmployeeShiftState | null>(null);
  const [profileModalEmployee, setProfileModalEmployee] = useState<EmployeeShiftState | null>(null);
  const [showInactiveModal, setShowInactiveModal] = useState(false);

  // Form State
  const initialFormData: EmployeeFormData = {
    id: '',
    name: '',
    designation: '',
    department: '',
    workingArea: '',
    category: 'Non-Management',
    position: '',
    supervisor: '',
    manager: '',
    status: 'Active',
    inactiveDate: '',
    dateOfJoin: '',
    dateOfBirth: '',
    phone: '',
    emergency: '',
    bloodGroup: '',
    salary: '',
    overtimeRate: '',
    profilePicture: '',
    tShirtSize: '',
    shoeSize: '',
    volunteer: '',
    shift: 'Day Shift',
    shiftMode: 'Automatic Rotation',
    effectiveDate: format(getSaturdayWeekRange(new Date()).startDate, 'yyyy-MM-dd'),
    rotationStartingShift: 'Day Shift',
    remarks: ''
  };

  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Load Data
  const loadData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [empRes, supRes, mgrRes, histRes] = await Promise.all([
        getRange(spreadsheetId, 'Employees!A2:Z'),
        getRange(spreadsheetId, 'Supervisors!A2:D'),
        getRange(spreadsheetId, 'Managers!A2:D'),
        getRange(spreadsheetId, 'Shift_Assignment_History!A2:J')
      ]);

      setAllEmployeesRaw(Array.isArray(empRes) ? empRes : []);
      setSupervisors(Array.isArray(supRes) ? supRes : []);
      setManagers(Array.isArray(mgrRes) ? mgrRes : []);
      setShiftHistoryRaw(Array.isArray(histRes) ? histRes : []);
    } catch (err) {
      console.error('Error loading employee directory:', err);
      showToast('Failed to sync employee data from database.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (spreadsheetId) {
      loadData(true);
    }
  }, [spreadsheetId]);

  // Working Week Boundaries
  const currentWeek = useMemo(() => getSaturdayWeekRange(new Date()), []);
  const nextWeek = useMemo(() => getNextSaturdayWeekRange(new Date()), []);

  // Parse Raw Employees into strongly-typed EmployeeShiftState list
  const employees: EmployeeShiftState[] = useMemo(() => {
    const rawParsed = allEmployeesRaw
      .filter(row => row && row[0] && row[0].trim() !== '')
      .map(row => parseEmployeeShiftState(row, new Date()));

    if (!userSecurityScope || userSecurityScope.role === 'Admin') {
      return rawParsed;
    }

    return filterAuthorizedEmployees(rawParsed, userSecurityScope);
  }, [allEmployeesRaw, userSecurityScope]);

  // Inactive employees list for dedicated reviews
  const inactiveEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'Inactive');
  }, [employees]);

  // Unique Filter Options
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort();
  }, [employees]);

  const workingAreas = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.workingArea).filter(Boolean))).sort();
  }, [employees]);

  // Filtered Employees List
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch = 
          emp.id.toLowerCase().includes(q) ||
          emp.name.toLowerCase().includes(q) ||
          emp.designation.toLowerCase().includes(q) ||
          emp.phone.toLowerCase().includes(q) ||
          emp.workingArea.toLowerCase().includes(q) ||
          emp.volunteer.toLowerCase().includes(q) ||
          emp.remarks.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Department
      if (deptFilter !== 'All' && emp.department !== deptFilter) return false;

      // Category (Management / Non-Management)
      if (categoryFilter !== 'All' && emp.category !== categoryFilter) return false;

      // Status
      if (statusFilter !== 'All' && emp.status !== statusFilter) return false;

      // Volunteer Role Filter
      if (volunteerFilter !== 'All') {
        if (volunteerFilter === 'Any') {
          if (!emp.volunteer || emp.volunteer.trim() === '' || emp.volunteer === 'No') return false;
        } else {
          const roles = (emp.volunteer || '').toLowerCase();
          if (!roles.includes(volunteerFilter.toLowerCase())) return false;
        }
      }

      // Shift Filter
      if (shiftFilter !== 'All' && emp.currentShift !== shiftFilter) return false;

      // Mode Filter
      if (modeFilter !== 'All' && emp.shiftMode !== modeFilter) return false;

      // Working Area
      if (areaFilter !== 'All' && emp.workingArea !== areaFilter) return false;

      return true;
    });
  }, [employees, search, deptFilter, categoryFilter, statusFilter, volunteerFilter, shiftFilter, modeFilter, areaFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'Active').length;
    const inactive = employees.filter(e => e.status === 'Inactive').length;
    const management = employees.filter(e => e.category === 'Management').length;
    const nonManagement = employees.filter(e => e.category !== 'Management').length;
    const dayShift = employees.filter(e => e.status === 'Active' && e.currentShift === 'Day Shift').length;
    const nightShift = employees.filter(e => e.status === 'Active' && e.currentShift === 'Night Shift').length;
    const volunteers = employees.filter(e => e.volunteer && e.volunteer.trim() !== '' && e.volunteer !== 'No').length;

    return { total, active, inactive, management, nonManagement, dayShift, nightShift, volunteers };
  }, [employees]);

  // Open Quick Shift Modal
  const handleOpenShiftModal = (emp: EmployeeShiftState) => {
    setShiftModalEmployee(emp);
    setNewShiftValue(emp.currentShift);
    setNewShiftMode(emp.shiftMode);
    setOverrideEffectiveDate(emp.effectiveDate || format(currentWeek.startDate, 'yyyy-MM-dd'));
    setOverrideRemarks(emp.remarks || '');
  };

  // Save Shift Change
  const handleSaveShiftAssignment = async () => {
    if (!shiftModalEmployee) return;
    setIsSavingShift(true);
    try {
      await updateEmployeeShiftAssignment(
        spreadsheetId,
        shiftModalEmployee,
        newShiftValue,
        newShiftMode,
        overrideEffectiveDate,
        overrideRemarks,
        userSecurityScope,
        allEmployeesRaw
      );
      showToast(`Shift updated for ${shiftModalEmployee.name} (${newShiftValue})`);
      setShiftModalEmployee(null);
      await loadData(false);
    } catch (err) {
      console.error('Failed to update shift:', err);
      showToast('Error saving shift assignment to database.');
    } finally {
      setIsSavingShift(false);
    }
  };

  // Resume Automatic Rotation
  const handleResumeAutoRotation = async () => {
    if (!shiftModalEmployee) return;
    setIsSavingShift(true);
    try {
      await resumeAutomaticRotation(
        spreadsheetId,
        shiftModalEmployee,
        'Day Shift',
        format(currentWeek.startDate, 'yyyy-MM-dd'),
        userSecurityScope
      );
      showToast(`Auto-rotation resumed for ${shiftModalEmployee.name}`);
      setShiftModalEmployee(null);
      await loadData(false);
    } catch (err) {
      console.error('Failed to resume auto rotation:', err);
      showToast('Error resuming automatic rotation.');
    } finally {
      setIsSavingShift(false);
    }
  };

  // Open Add Employee Modal
  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormData,
      effectiveDate: format(currentWeek.startDate, 'yyyy-MM-dd')
    });
    setIsEditing(false);
    setShowAddEditModal(true);
  };

  // Request Edit
  const handleEditClick = (emp: EmployeeShiftState) => {
    setEditModal({ isOpen: true, emp, password: '' });
  };

  // Proceed with Edit
  const proceedWithEdit = (emp: EmployeeShiftState) => {
    setFormData({
      id: emp.id,
      name: emp.name,
      designation: emp.designation,
      department: emp.department,
      workingArea: emp.workingArea,
      category: (emp.category as any) || 'Non-Management',
      position: emp.position || emp.category || 'Non-Management',
      supervisor: emp.supervisor,
      manager: emp.manager,
      status: (emp.status as any) || 'Active',
      inactiveDate: emp.inactiveDate || '',
      dateOfJoin: emp.dateOfJoin,
      dateOfBirth: emp.dateOfBirth || '',
      phone: emp.phone,
      emergency: emp.emergency,
      bloodGroup: emp.bloodGroup,
      salary: emp.salary,
      overtimeRate: emp.overtimeRate,
      profilePicture: emp.profilePicture || '',
      tShirtSize: emp.tShirtSize || '',
      shoeSize: emp.shoeSize || '',
      volunteer: emp.volunteer || '',
      shift: emp.rotationStartingShift || emp.currentShift,
      shiftMode: emp.shiftMode,
      effectiveDate: emp.effectiveDate,
      rotationStartingShift: emp.rotationStartingShift,
      remarks: emp.remarks
    });
    setIsEditing(true);
    setShowAddEditModal(true);
  };

  // Delete Employee Confirmation
  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const deleteEmployeeConfirmed = async (id: string, name: string) => {
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Employees', id);
      showToast(`Employee ${name} (${id}) deleted successfully.`);
      await loadData(false);
    } catch (err) {
      console.error('Delete employee failed:', err);
      showToast('Error deleting employee from database.');
    }
  };

  // Submit Add / Edit Form
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Standard 26-column row payload
      const rowPayload = [
        formData.id.trim(),                              // 0: ID
        formData.name.trim(),                            // 1: Name
        formData.designation.trim(),                     // 2: Designation
        formData.department.trim(),                      // 3: Department
        formData.dateOfJoin.trim(),                      // 4: Date of Join
        formData.category || 'Non-Management',           // 5: Category / Position
        formData.supervisor.trim(),                      // 6: Supervisor
        formData.salary.trim(),                          // 7: Salary
        formData.overtimeRate.trim(),                    // 8: OT Rate
        formData.status,                                 // 9: Status
        formData.status === 'Inactive' ? formData.inactiveDate : '', // 10: Inactive Date
        formData.phone.trim(),                           // 11: Phone
        formData.emergency.trim(),                       // 12: Emergency Contact
        formData.shift,                                  // 13: Shift
        formData.bloodGroup,                             // 14: Blood Group
        formData.workingArea.trim(),                     // 15: Working Area
        formData.profilePicture || '',                   // 16: Profile Picture Data URL
        formData.manager.trim(),                         // 17: Manager
        formData.tShirtSize || '',                       // 18: T-Shirt Size
        formData.shoeSize || '',                         // 19: Shoe Size
        formData.volunteer || '',                        // 20: Volunteer Committees
        formData.dateOfBirth.trim(),                     // 21: Date of Birth
        formData.shiftMode,                              // 22: Shift Mode
        formData.effectiveDate,                          // 23: Effective Date
        formData.rotationStartingShift || formData.shift,// 24: Rotation Starting Shift
        formData.remarks.trim()                          // 25: Remarks / Reason
      ];

      if (isEditing) {
        await updateRowByPrimaryKey(spreadsheetId, 'Employees', formData.id, rowPayload);
        showToast(`Profile for ${formData.name} updated successfully.`);
      } else {
        // Check ID uniqueness
        if (employees.some(e => e.id.toLowerCase() === formData.id.toLowerCase())) {
          alert(`Employee ID ${formData.id} already exists. Please choose a unique ID.`);
          return;
        }
        await appendRow(spreadsheetId, 'Employees!A:Z', [rowPayload]);
        showToast(`Employee ${formData.name} added successfully.`);
      }

      setShowAddEditModal(false);
      await loadData(false);
    } catch (err) {
      console.error('Error saving employee:', err);
      showToast('Error saving employee profile to database.');
    }
  };

  // Bulk Excel Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const xlsx = getXlsx();
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as string[][];

        if (data.length <= 1) {
          alert('Excel file is empty or missing data rows.');
          return;
        }

        const dataRows = data.slice(1).filter(r => r && r[0]);
        let importedCount = 0;

        for (const row of dataRows) {
          const empId = (row[0] || '').toString().trim();
          if (!empId) continue;

          const rowData = [
            empId,                                       // 0: ID
            (row[1] || '').toString().trim(),            // 1: Name
            (row[2] || '').toString().trim(),            // 2: Designation
            (row[3] || '').toString().trim(),            // 3: Department
            (row[4] || '').toString().trim(),            // 4: Join Date
            (row[5] || 'Non-Management').toString().trim(), // 5: Category
            (row[6] || '').toString().trim(),            // 6: Supervisor
            (row[7] || '').toString().trim(),            // 7: Salary
            (row[8] || '').toString().trim(),            // 8: OT Rate
            (row[9] || 'Active').toString().trim(),      // 9: Status
            (row[10] || '').toString().trim(),           // 10: Inactive Date
            (row[11] || '').toString().trim(),           // 11: Phone
            (row[12] || '').toString().trim(),           // 12: Emergency
            (row[13] || 'Day Shift').toString().trim(),  // 13: Shift
            (row[14] || '').toString().trim(),           // 14: Blood Group
            (row[15] || '').toString().trim(),           // 15: Working Area
            (row[16] || '').toString().trim(),           // 16: Profile Picture
            (row[17] || '').toString().trim(),           // 17: Manager
            (row[18] || '').toString().trim(),           // 18: T-Shirt Size
            (row[19] || '').toString().trim(),           // 19: Shoe Size
            (row[20] || '').toString().trim(),           // 20: Volunteer
            (row[21] || '').toString().trim(),           // 21: Date of Birth
            (row[22] || 'Automatic Rotation').toString().trim(), // 22: Shift Mode
            (row[23] || format(new Date(), 'yyyy-MM-dd')).toString().trim(), // 23: Effective Date
            (row[24] || row[13] || 'Day Shift').toString().trim(), // 24: Starting Shift
            (row[25] || '').toString().trim()            // 25: Remarks
          ];

          await appendRow(spreadsheetId, 'Employees!A:Z', [rowData]);
          importedCount++;
        }

        showToast(`Successfully imported ${importedCount} employees.`);
        await loadData(false);
      } catch (err) {
        console.error('Bulk import error:', err);
        showToast('Error processing bulk Excel file.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export Filtered Directory to Excel
  const handleExport = () => {
    const xlsx = getXlsx();
    const exportData = filteredEmployees.map(e => ({
      'Employee ID': e.id,
      'Full Name': e.name,
      'Classification / Category': e.category || 'Non-Management',
      'Department': e.department,
      'Section / Area': e.workingArea,
      'Designation': e.designation,
      'Status': e.status,
      'Inactive Date': e.inactiveDate || '',
      'Service Length': calculateTenure(e.dateOfJoin, e.status === 'Inactive' ? e.inactiveDate : undefined),
      'T-Shirt Size': e.tShirtSize || '',
      'Shoe Size': e.shoeSize || '',
      'Volunteer Committees': e.volunteer || '',
      'Current Week Shift': e.currentShift,
      'Next Week Shift': e.nextWeekShift,
      'Assignment Mode': e.shiftMode,
      'Rotation Starting Shift': e.rotationStartingShift,
      'Shift Effective Date': e.effectiveDate,
      'Supervisor': e.supervisor,
      'Manager': e.manager,
      'Phone': e.phone,
      'Emergency Contact': e.emergency,
      'Blood Group': e.bloodGroup,
      'Date of Join': e.dateOfJoin,
      'Date of Birth': e.dateOfBirth,
      'Remarks': e.remarks
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Employee Directory');
    xlsx.writeFile(wb, `Employee_Directory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const isRestrictedScope = userSecurityScope && userSecurityScope.role !== 'Admin';

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Security Scope Banner */}
      {isRestrictedScope && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between text-amber-900 text-sm shadow-sm">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Security Access Active:</strong> Viewing directory scoped to <strong>{employees.length} employee{employees.length !== 1 ? 's' : ''}</strong>
              {userSecurityScope?.supervisorName ? ` under Supervisor "${userSecurityScope.supervisorName}"` : ''}
              {userSecurityScope?.accessLimitType === 'department' && userSecurityScope?.assignedDepartment ? ` in Department "${userSecurityScope.assignedDepartment}"` : ''}.
            </span>
          </div>
          <span className="bg-amber-200/80 text-amber-800 text-xs px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider">
            {userSecurityScope?.accessLimitType} Scope
          </span>
        </div>
      )}

      {/* Working Week Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Weekly Shift Rotation Schedule (Saturday → Thursday | Friday Off)</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Current Week: <span className="text-amber-400 font-semibold">{currentWeek.label}</span>
            </h2>
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
              Off Day: Friday, {format(currentWeek.offDate, 'dd-MMM')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Next Rotation: <strong className="text-slate-200">{nextWeek.label}</strong> (Employees on Day Shift switch to Night Shift, and Night Shift switch to Day Shift automatically).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button 
            onClick={() => setShowInactiveModal(true)}
            className="bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/60 px-3 py-2 rounded-lg text-xs font-medium flex items-center transition"
          >
            <UserX className="w-3.5 h-3.5 mr-1.5 text-rose-300" />
            Inactive Records ({metrics.inactive})
          </button>

          <button 
            onClick={handleExport}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Directory
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Staff */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-800">{metrics.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              <span className="text-emerald-600 font-semibold">{metrics.active} Active</span> • {metrics.inactive} Inactive
            </div>
          </div>
        </div>

        {/* Management Staff */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-800 text-xs font-semibold uppercase tracking-wider">
            <span>Management</span>
            <span className="text-sm">👔</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-700">{metrics.management}</div>
            <div className="text-[11px] text-purple-600 font-medium mt-0.5">Executives & Officers</div>
          </div>
        </div>

        {/* Non-Management Staff */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800 text-xs font-semibold uppercase tracking-wider">
            <span>Non-Management</span>
            <span className="text-sm">👷</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-700">{metrics.nonManagement}</div>
            <div className="text-[11px] text-blue-600 font-medium mt-0.5">Operators & Technicians</div>
          </div>
        </div>

        {/* Day Shift */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase tracking-wider">
            <span>Day Shift</span>
            <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-400/30" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-700">{metrics.dayShift}</div>
            <div className="text-[11px] text-amber-700/80 font-medium mt-0.5">09:00 AM – 06:00 PM</div>
          </div>
        </div>

        {/* Night Shift */}
        <div className="bg-white p-4 rounded-xl border border-indigo-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-semibold uppercase tracking-wider">
            <span>Night Shift</span>
            <Moon className="w-4.5 h-4.5 text-indigo-600 fill-indigo-400/30" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-indigo-700">{metrics.nightShift}</div>
            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">08:00 PM – 05:00 AM</div>
          </div>
        </div>

        {/* Volunteers */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase tracking-wider">
            <span>Volunteers</span>
            <HeartHandshake className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-700">{metrics.volunteers}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">Safety & Aid Members</div>
          </div>
        </div>
      </div>

      {/* Control Header & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search ID, Name, Phone, Role, Remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Upload */}
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center transition"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Bulk Import
            </button>

            {/* Add Employee Button */}
            <button 
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center shadow-sm transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Employee
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden ml-1">
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-xs font-semibold flex items-center transition ${viewMode === 'table' ? 'bg-slate-100 text-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <List className="w-3.5 h-3.5 mr-1.5" /> Table
              </button>
              <button 
                onClick={() => setViewMode('card')}
                className={`px-3 py-2 text-xs font-semibold flex items-center border-l border-slate-200 transition ${viewMode === 'card' ? 'bg-slate-100 text-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Cards
              </button>
            </div>
          </div>

        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2.5 border-t border-slate-100">
          
          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Classification (Management vs Non-Management) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Classification</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Classifications</option>
              <option value="Management">👔 Management</option>
              <option value="Non-Management">👷 Non-Management</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive (Separated)</option>
            </select>
          </div>

          {/* Volunteer Role Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Volunteer Role</label>
            <select
              value={volunteerFilter}
              onChange={(e) => setVolunteerFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Staff</option>
              <option value="Any">🌟 Any Volunteer Member</option>
              {VOLUNTEER_ROLES.map(r => (
                <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
              ))}
            </select>
          </div>

          {/* Current Shift Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Shift</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Shifts</option>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="General">General Duty</option>
            </select>
          </div>

          {/* Working Area Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Working Area</label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Areas</option>
              {workingAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-medium text-slate-500">Calculating dynamic shift schedules and employee directory...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <UserX className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No employees match your search criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search keywords, status filter, category, or volunteer filter.</p>
          <button 
            onClick={() => {
              setSearch('');
              setDeptFilter('All');
              setCategoryFilter('All');
              setStatusFilter('All');
              setVolunteerFilter('All');
              setShiftFilter('All');
              setAreaFilter('All');
            }}
            className="mt-4 inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3.5 py-2 rounded-lg transition"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Department & Area</th>
                  <th className="px-4 py-3.5 text-center">Apparel Sizes</th>
                  <th className="px-4 py-3.5 text-center">Volunteers</th>
                  <th className="px-4 py-3.5 text-center">Current Shift</th>
                  <th className="px-4 py-3.5 text-center">Next Shift</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {filteredEmployees.map((emp, idx) => {
                  const currentStyle = getShiftBadgeStyles(emp.currentShift);
                  const nextStyle = getShiftBadgeStyles(emp.nextWeekShift);
                  const isInactive = emp.status === 'Inactive';
                  const volunteerList = (emp.volunteer || '').split(',').map(s => s.trim()).filter(Boolean);

                  return (
                    <tr key={`${emp.id}-${idx}`} className="hover:bg-slate-50/70 transition">
                      
                      {/* Photo & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div 
                            onClick={() => setProfileModalEmployee(emp)}
                            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 overflow-hidden shadow-xs cursor-pointer hover:opacity-80 transition"
                          >
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              emp.name.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div 
                              onClick={() => setProfileModalEmployee(emp)}
                              className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center space-x-1"
                            >
                              <span>{emp.name}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">{emp.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Classification Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${emp.category === 'Management' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {emp.category === 'Management' ? '👔 Management' : '👷 Non-Mgmt'}
                        </span>
                      </td>

                      {/* Department & Area */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{emp.department || '—'}</div>
                        <div className="text-[11px] text-slate-500">{emp.workingArea || emp.designation || '—'}</div>
                      </td>

                      {/* Sizes */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {emp.tShirtSize || emp.shoeSize ? (
                          <div className="inline-flex items-center space-x-1.5 text-[11px]">
                            {emp.tShirtSize && (
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold" title="T-Shirt Size">
                                👕 {emp.tShirtSize}
                              </span>
                            )}
                            {emp.shoeSize && (
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold" title="Shoe Size">
                                👟 {emp.shoeSize}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Volunteer Roles */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {volunteerList.length > 0 ? (
                          <div className="inline-flex items-center space-x-1">
                            <span 
                              className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer hover:bg-indigo-100 transition"
                              title={volunteerList.join(', ')}
                              onClick={() => setProfileModalEmployee(emp)}
                            >
                              🌟 {volunteerList.length} Role{volunteerList.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Current Shift */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <ShiftBadge shift={emp.currentShift} size="sm" />
                      </td>

                      {/* Next Shift */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <ShiftBadge shift={emp.nextWeekShift} size="sm" className="opacity-90" />
                      </td>

                      {/* Status & Inactive Date */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isInactive ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Inactive
                            </span>
                            {emp.inactiveDate && (
                              <span className="text-[10px] text-rose-600 mt-0.5 font-mono">
                                {emp.inactiveDate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View Profile */}
                          <button 
                            onClick={() => setProfileModalEmployee(emp)}
                            title="View Full Profile"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Shift Button */}
                          <button 
                            onClick={() => handleOpenShiftModal(emp)}
                            title="Manage / Override Shift"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Clock className="w-4 h-4" />
                          </button>

                          {/* Shift History */}
                          <button 
                            onClick={() => setHistoryModalEmployee(emp)}
                            title="View Shift History"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Edit Employee */}
                          <button 
                            onClick={() => handleEditClick(emp)}
                            title="Edit Profile"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Employee */}
                          <button 
                            onClick={() => handleDelete(emp.id, emp.name)}
                            title="Delete Employee"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing <strong>{filteredEmployees.length}</strong> of <strong>{employees.length}</strong> employees</span>
            <span className="text-[11px] text-slate-400">Shift schedules automatically advance on Saturday 00:00 AM</span>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp, idx) => {
            const currentStyle = getShiftBadgeStyles(emp.currentShift);
            const nextStyle = getShiftBadgeStyles(emp.nextWeekShift);
            const isInactive = emp.status === 'Inactive';
            const volunteerList = (emp.volunteer || '').split(',').map(s => s.trim()).filter(Boolean);

            return (
              <div 
                key={`${emp.id}-${idx}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition flex flex-col justify-between space-y-3.5"
              >
                <div>
                  {/* Top Bar: Photo, Name & Badges */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        onClick={() => setProfileModalEmployee(emp)}
                        className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden shadow-xs cursor-pointer hover:opacity-80 transition shrink-0"
                      >
                        {emp.profilePicture ? (
                          <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          emp.name.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <h4 
                          onClick={() => setProfileModalEmployee(emp)}
                          className="font-bold text-slate-900 text-sm leading-snug hover:text-indigo-600 cursor-pointer"
                        >
                          {emp.name}
                        </h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-500">{emp.id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${emp.category === 'Management' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {emp.category === 'Management' ? '👔 Mgmt' : '👷 Non-Mgmt'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isInactive ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                      {emp.status}
                    </span>
                  </div>

                  {/* Department & Role */}
                  <div className="mt-3 text-xs space-y-0.5">
                    <div className="text-slate-700 font-medium">{emp.designation || 'No Designation'}</div>
                    <div className="text-slate-500">{emp.department} {emp.workingArea ? `• ${emp.workingArea}` : ''}</div>
                  </div>

                  {/* Inactive Date Notice */}
                  {isInactive && emp.inactiveDate && (
                    <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                      Inactive since: <strong>{emp.inactiveDate}</strong>
                    </div>
                  )}

                  {/* Apparel Sizes & Volunteers Row */}
                  {(emp.tShirtSize || emp.shoeSize || volunteerList.length > 0) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {emp.tShirtSize && (
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                          👕 {emp.tShirtSize}
                        </span>
                      )}
                      {emp.shoeSize && (
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                          👟 EU {emp.shoeSize}
                        </span>
                      )}
                      {volunteerList.length > 0 && (
                        <span 
                          onClick={() => setProfileModalEmployee(emp)}
                          className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold cursor-pointer hover:bg-indigo-100"
                        >
                          🌟 {volunteerList.length} Committee{volunteerList.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Shift Box */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold">Current Shift:</span>
                      <ShiftBadge shift={emp.currentShift} size="xs" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Next Week:</span>
                      <ShiftBadge shift={emp.nextWeekShift} size="xs" className="opacity-90" />
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={() => setProfileModalEmployee(emp)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Profile
                  </button>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => handleOpenShiftModal(emp)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Shift Override"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setHistoryModalEmployee(emp)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                      title="History"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleEditClick(emp)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(emp.id, emp.name)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT EMPLOYEE MODAL */}
      <EmployeeAddEditModal
        isOpen={showAddEditModal}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        supervisors={supervisors}
        managers={managers}
        onClose={() => setShowAddEditModal(false)}
        onSubmit={handleEmployeeSubmit}
      />

      {/* MODAL 2: EMPLOYEE PROFILE MODAL */}
      <EmployeeProfileModal
        employee={profileModalEmployee}
        onClose={() => setProfileModalEmployee(null)}
        onEdit={(emp) => handleEditClick(emp)}
        onOpenShift={(emp) => handleOpenShiftModal(emp)}
        onOpenHistory={(emp) => setHistoryModalEmployee(emp)}
      />

      {/* MODAL 3: INACTIVE EMPLOYEES & REPORTS MODAL */}
      <InactiveEmployeesModal
        isOpen={showInactiveModal}
        inactiveEmployees={inactiveEmployees}
        onClose={() => setShowInactiveModal(false)}
        onViewEmployee={(emp) => setProfileModalEmployee(emp)}
      />

      {/* MODAL 4: QUICK SHIFT OVERRIDE MODAL */}
      <QuickShiftModal
        employee={shiftModalEmployee}
        newShiftValue={newShiftValue}
        setNewShiftValue={setNewShiftValue}
        newShiftMode={newShiftMode}
        setNewShiftMode={setNewShiftMode}
        overrideEffectiveDate={overrideEffectiveDate}
        setOverrideEffectiveDate={setOverrideEffectiveDate}
        overrideRemarks={overrideRemarks}
        setOverrideRemarks={setOverrideRemarks}
        isSavingShift={isSavingShift}
        onSave={handleSaveShiftAssignment}
        onResumeRotation={handleResumeAutoRotation}
        onClose={() => setShiftModalEmployee(null)}
      />

      {/* MODAL 5: SHIFT HISTORY MODAL */}
      <ShiftHistoryModal
        employee={historyModalEmployee}
        shiftHistoryRaw={shiftHistoryRaw}
        onClose={() => setHistoryModalEmployee(null)}
      />

      {/* MODAL 6: ADMIN DELETE CONFIRM MODAL */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteModal?.isOpen)}
        title="Delete Employee Record"
        itemName={deleteModal?.name ? `${deleteModal.name} (${deleteModal.id})` : undefined}
        itemDetails="Permanently deletes the employee profile, assigned shifts, and system references."
        warningMessage="This employee profile will be removed from the directory. To authorize this deletion, please enter the Admin Deletion Password."
        confirmButtonText="Verify & Delete Employee"
        onConfirm={async () => {
          if (deleteModal) {
            await deleteEmployeeConfirmed(deleteModal.id, deleteModal.name);
            setDeleteModal(null);
          }
        }}
        onClose={() => setDeleteModal(null)}
      />

      {/* MODAL 7: EDIT VERIFICATION MODAL */}
      {editModal?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-indigo-50 flex justify-between items-center">
              <h3 className="font-bold text-indigo-800">Confirm Modification</h3>
              <button onClick={() => setEditModal(null)} className="text-indigo-500 hover:bg-indigo-100 p-1 rounded-lg">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to modify <strong>{editModal?.emp?.name}</strong> ({editModal?.emp?.id})?
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Two-Step Verification: Admin Password</label>
                <input 
                  type="password" 
                  value={editModal?.password} 
                  onChange={e => setEditModal({ ...editModal, password: e.target.value })}
                  placeholder="Enter fixed password (123456)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancel</button>
              <button 
                onClick={() => {
                  if (editModal?.password !== '123456') {
                    showToast('Incorrect password. Modification cancelled.');
                    return;
                  }
                  if (editModal.emp) proceedWithEdit(editModal.emp);
                  setEditModal(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold"
              >
                Confirm Edit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
