import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Shield, Check, X, Search, User, Mail, Building, 
  Sparkles, Save, RotateCcw, AlertCircle, CheckCircle2, 
  Layers, Lock, Unlock, Compass, CheckSquare, RefreshCw,
  Info, ExternalLink, Filter, SlidersHorizontal, ChevronRight, Eye, Edit3
} from 'lucide-react';
import { UserSecurityScope } from '../../lib/security';
import { getSystemNavigators, SystemNavigator } from '../../lib/navigators';
import { 
  getUserAdditionalAccessFromStorage, 
  buildUserAdditionalAccessMatrix,
  saveUserAdditionalAccessMatrix,
  NavigatorEffectivePermission,
  fetchAllAdditionalAccessFromDatabase,
  normalizeUserId,
  calculateNavigatorEffectiveAccess
} from '../../lib/additionalAccess';

interface AdditionalAccessControlsTabProps {
  users: string[][];
  employees: string[][];
  adminUser: any;
  userSecurityScope?: UserSecurityScope;
  spreadsheetId?: string;
  onRefresh?: () => void;
  preselectedUserEmail?: string;
}

export default function AdditionalAccessControlsTab({
  users = [],
  employees = [],
  adminUser,
  userSecurityScope,
  spreadsheetId,
  onRefresh,
  preselectedUserEmail
}: AdditionalAccessControlsTabProps) {
  // Parsed user list
  const userList = useMemo(() => {
    return (users || []).map(row => {
      const email = String(row[0] || '').trim();
      const role = String(row[2] || 'User').trim();
      const status = String(row[3] || 'Active').trim();
      const accessLevelRaw = String(row[4] || 'All').trim();
      const supervisor = String(row[5] || '').trim();
      const accessLimit = String(row[6] || 'all').trim();
      const assignedEmpIds = String(row[7] || '').trim();
      const assignedDept = String(row[8] || '').trim();
      const employeeId = String(row[9] || '').trim();
      const employeeName = String(row[10] || '').trim();
      const inputPermsRaw = String(row[11] || 'all').trim();

      // Find matching employee record for profile picture / name
      const matchedEmp = employees.find(e => 
        (e[0] && e[0].trim() === employeeId) || 
        (e[1] && e[1].trim().toLowerCase() === email.toLowerCase())
      );

      const displayName = employeeName || (matchedEmp ? matchedEmp[1] : email.split('@')[0]);

      const accessLevels = accessLevelRaw.split(',').map(s => s.trim()).filter(Boolean);
      const inputPermissions = inputPermsRaw.split(',').map(s => s.trim()).filter(Boolean);

      const scope: UserSecurityScope = {
        username: email,
        role,
        status,
        accessLimitType: accessLimit as any,
        assignedDepartment: assignedDept,
        assignedEmployeeIds: assignedEmpIds.split(',').map(s => s.trim()).filter(Boolean),
        supervisorName: supervisor,
        accessLevel: accessLevels,
        inputPermissions,
        employeeId: employeeId || (matchedEmp ? matchedEmp[0] : ''),
        employeeName: displayName,
        isAdmin: role === 'Admin',
        isManager: role === 'Manager',
        isSuperuser: role === 'Superuser',
        isSupervisor: role === 'Supervisor',
        isUser: role === 'User'
      };

      return {
        email,
        displayName,
        role,
        status,
        employeeId: scope.employeeId,
        department: assignedDept || (matchedEmp ? matchedEmp[3] : 'Enterprise'),
        scope
      };
    }).filter(u => u.email);
  }, [users, employees]);

  // Selected User
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>(() => {
    if (preselectedUserEmail) return preselectedUserEmail.toLowerCase();
    const firstNonAdmin = userList.find(u => u.role !== 'Admin');
    return (firstNonAdmin || userList[0])?.email || '';
  });

  const selectedUserObj = useMemo(() => {
    return userList.find(u => u.email.toLowerCase() === selectedUserEmail.toLowerCase()) || userList[0];
  }, [userList, selectedUserEmail]);

  // Matrix state
  const [matrixData, setMatrixData] = useState<NavigatorEffectivePermission[]>([]);
  const [initialMatrixData, setInitialMatrixData] = useState<NavigatorEffectivePermission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Load user's matrix whenever selectedUserObj changes
  const loadUserMatrix = useCallback(() => {
    if (!selectedUserObj) return;
    const additionalRecords = getUserAdditionalAccessFromStorage(selectedUserObj.email);
    const matrix = buildUserAdditionalAccessMatrix(selectedUserObj.scope, additionalRecords);
    setMatrixData(matrix);
    setInitialMatrixData(JSON.parse(JSON.stringify(matrix)));
  }, [selectedUserObj]);

  useEffect(() => {
    loadUserMatrix();
  }, [loadUserMatrix]);

  // Sync with database if needed
  useEffect(() => {
    if (spreadsheetId) {
      fetchAllAdditionalAccessFromDatabase(spreadsheetId).then(() => {
        loadUserMatrix();
      });
    }
  }, [spreadsheetId, loadUserMatrix]);

  // Handle View Only Checkbox Toggle
  const handleToggleView = (navigatorId: string) => {
    setMatrixData(prev => prev.map(item => {
      if (item.navigatorId !== navigatorId) return item;

      // If view is currently checked and edit is checked -> unchecking view also unchecks edit
      let newView = !item.additionalView;
      let newEdit = item.additionalEdit;

      if (!newView) {
        newEdit = false;
      }

      const { effectiveAccess, effectiveLabel, isExtended, statusNote } = calculateNavigatorEffectiveAccess(
        item.currentAccess,
        newView,
        newEdit
      );

      return {
        ...item,
        additionalView: newView,
        additionalEdit: newEdit,
        effectiveAccess,
        effectiveAccessLabel: effectiveLabel,
        isExtendedByAdditional: isExtended,
        statusNote
      };
    }));
  };

  // Handle View & Edit Checkbox Toggle
  const handleToggleEdit = (navigatorId: string) => {
    setMatrixData(prev => prev.map(item => {
      if (item.navigatorId !== navigatorId) return item;

      const newEdit = !item.additionalEdit;
      // Rule: "View & Edit" automatically includes "View"
      const newView = newEdit ? true : item.additionalView;

      const { effectiveAccess, effectiveLabel, isExtended, statusNote } = calculateNavigatorEffectiveAccess(
        item.currentAccess,
        newView,
        newEdit
      );

      return {
        ...item,
        additionalView: newView,
        additionalEdit: newEdit,
        effectiveAccess,
        effectiveAccessLabel: effectiveLabel,
        isExtendedByAdditional: isExtended,
        statusNote
      };
    }));
  };

  // Quick Action: Grant View to All Navigators
  const handleGrantViewAll = () => {
    setMatrixData(prev => prev.map(item => {
      const newView = true;
      const newEdit = item.additionalEdit;
      const { effectiveAccess, effectiveLabel, isExtended, statusNote } = calculateNavigatorEffectiveAccess(
        item.currentAccess,
        newView,
        newEdit
      );
      return {
        ...item,
        additionalView: newView,
        additionalEdit: newEdit,
        effectiveAccess,
        effectiveAccessLabel: effectiveLabel,
        isExtendedByAdditional: isExtended,
        statusNote
      };
    }));
  };

  // Quick Action: Grant View & Edit to All Navigators
  const handleGrantEditAll = () => {
    setMatrixData(prev => prev.map(item => {
      const newView = true;
      const newEdit = true;
      const { effectiveAccess, effectiveLabel, isExtended, statusNote } = calculateNavigatorEffectiveAccess(
        item.currentAccess,
        newView,
        newEdit
      );
      return {
        ...item,
        additionalView: newView,
        additionalEdit: newEdit,
        effectiveAccess,
        effectiveAccessLabel: effectiveLabel,
        isExtendedByAdditional: isExtended,
        statusNote
      };
    }));
  };

  // Quick Action: Clear all additional permissions for this user
  const handleClearAllAdditional = () => {
    setMatrixData(prev => prev.map(item => {
      const newView = false;
      const newEdit = false;
      const { effectiveAccess, effectiveLabel, isExtended, statusNote } = calculateNavigatorEffectiveAccess(
        item.currentAccess,
        newView,
        newEdit
      );
      return {
        ...item,
        additionalView: newView,
        additionalEdit: newEdit,
        effectiveAccess,
        effectiveAccessLabel: effectiveLabel,
        isExtendedByAdditional: isExtended,
        statusNote
      };
    }));
  };

  // Reset to saved state
  const handleResetToSaved = () => {
    setMatrixData(JSON.parse(JSON.stringify(initialMatrixData)));
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  // Save changes to database and storage
  const handleSaveAdditionalAccess = async () => {
    if (!selectedUserObj) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const updatePayload = matrixData.map(item => ({
        navigatorId: item.navigatorId,
        canView: item.additionalView,
        canEdit: item.additionalEdit
      }));

      const res = await saveUserAdditionalAccessMatrix(
        selectedUserObj.email,
        selectedUserObj.scope,
        updatePayload,
        adminUser?.email || 'admin@smltrimsbd.com',
        spreadsheetId
      );

      if (res.success) {
        setSaveSuccessMsg(res.message);
        setInitialMatrixData(JSON.parse(JSON.stringify(matrixData)));
        if (onRefresh) onRefresh();
        setTimeout(() => setSaveSuccessMsg(null), 5000);
      } else {
        setSaveErrorMsg(res.message || 'Failed to save additional permissions.');
      }
    } catch (err: any) {
      console.error('Error saving additional access:', err);
      setSaveErrorMsg(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Has unsaved changes?
  const hasUnsavedChanges = useMemo(() => {
    if (matrixData.length !== initialMatrixData.length) return false;
    return matrixData.some((item, idx) => {
      const init = initialMatrixData[idx];
      if (!init) return false;
      return item.additionalView !== init.additionalView || item.additionalEdit !== init.additionalEdit;
    });
  }, [matrixData, initialMatrixData]);

  // Filter categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    matrixData.forEach(item => cats.add(item.category));
    return ['All', ...Array.from(cats)];
  }, [matrixData]);

  // Filtered rows for display
  const filteredMatrix = useMemo(() => {
    return matrixData.filter(item => {
      const matchesSearch = 
        item.navigatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [matrixData, searchQuery, categoryFilter]);

  // Aggregate Metrics for Selected User
  const stats = useMemo(() => {
    const total = matrixData.length;
    const baseAccessible = matrixData.filter(m => m.currentAccess !== 'none').length;
    const additionalViewCount = matrixData.filter(m => m.additionalView && !m.additionalEdit).length;
    const additionalEditCount = matrixData.filter(m => m.additionalEdit).length;
    const finalAccessible = matrixData.filter(m => m.effectiveAccess !== 'none').length;
    const finalEditAccessible = matrixData.filter(m => m.effectiveAccess === 'edit').length;

    return {
      total,
      baseAccessible,
      additionalViewCount,
      additionalEditCount,
      finalAccessible,
      finalEditAccessible
    };
  }, [matrixData]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">User-Wise Additional Access Controls</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active Security Layer
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Provide individual users with extra navigator and action permissions on top of their base role configuration. 
                Additional access dynamically extends permissions without altering or reducing the user's existing access.
              </p>
            </div>
          </div>

          {/* Quick Logic Formula Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-xs flex flex-col gap-1 min-w-[240px]">
            <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Access Rule Engine
            </span>
            <div className="font-mono text-[11px] text-white font-semibold">
              Final = Base Access + Additional
            </div>
            <span className="text-[10px] text-slate-300">
              ✓ View &amp; Edit automatically includes View.
            </span>
          </div>
        </div>
      </div>

      {/* User Selection & Overview Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Select Target User:
            </label>
            <select
              value={selectedUserEmail}
              onChange={e => setSelectedUserEmail(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
            >
              {userList.map(u => (
                <option key={u.email} value={u.email}>
                  {u.displayName} ({u.role}) — {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Selected User Summary Badge */}
          {selectedUserObj && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center shrink-0 border border-indigo-200 text-sm">
                {(selectedUserObj.displayName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 truncate">{selectedUserObj.displayName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedUserObj.role === 'Admin' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    selectedUserObj.role === 'Manager' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                    selectedUserObj.role === 'Supervisor' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    {selectedUserObj.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate mt-0.5">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {selectedUserObj.email}</span>
                  {selectedUserObj.employeeId && <span>• ID: {selectedUserObj.employeeId}</span>}
                  <span>• {selectedUserObj.department}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetToSaved}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 disabled:opacity-40 transition flex items-center gap-1.5"
            title="Discard unsaved changes"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Discard
          </button>
          <button
            onClick={handleSaveAdditionalAccess}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md flex items-center gap-2 transition ${
              hasUnsavedChanges 
                ? 'bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-400/50 animate-pulse' 
                : 'bg-slate-700 hover:bg-slate-800 opacity-90'
            } disabled:opacity-40 disabled:animate-none`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving to Database...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Additional Permissions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl p-3.5 text-xs flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveErrorMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3.5 text-xs flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{saveErrorMsg}</span>
          </div>
          <button onClick={() => setSaveErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium block text-[11px]">Total Navigators</span>
          <span className="text-lg font-extrabold text-slate-800 mt-0.5 block">{stats.total}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium block text-[11px]">Base Role Access</span>
          <span className="text-lg font-extrabold text-slate-700 mt-0.5 block">{stats.baseAccessible}</span>
        </div>
        <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 shadow-xs">
          <span className="text-blue-600 font-medium block text-[11px]">+ Additional View</span>
          <span className="text-lg font-extrabold text-blue-800 mt-0.5 block">+{stats.additionalViewCount}</span>
        </div>
        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 shadow-xs">
          <span className="text-indigo-600 font-medium block text-[11px]">+ Additional Edit</span>
          <span className="text-lg font-extrabold text-indigo-800 mt-0.5 block">+{stats.additionalEditCount}</span>
        </div>
        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-emerald-600 font-medium block text-[11px]">Final Accessible</span>
          <span className="text-lg font-extrabold text-emerald-800 mt-0.5 block">{stats.finalAccessible}</span>
        </div>
        <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-purple-600 font-medium block text-[11px]">Final Full Edit</span>
          <span className="text-lg font-extrabold text-purple-800 mt-0.5 block">{stats.finalEditAccessible}</span>
        </div>
      </div>

      {/* Filter and Quick Action Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Search and Category Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1 w-full md:w-auto">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search navigator or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  categoryFilter === cat 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Batch Tools */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 text-xs">
          <button
            onClick={handleGrantViewAll}
            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold flex items-center gap-1 transition"
            title="Tick View Only for all navigators"
          >
            <Eye className="w-3.5 h-3.5" />
            + View All
          </button>
          <button
            onClick={handleGrantEditAll}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold flex items-center gap-1 transition"
            title="Tick View & Edit for all navigators"
          >
            <Edit3 className="w-3.5 h-3.5" />
            + Edit All
          </button>
          <button
            onClick={handleClearAllAdditional}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 font-semibold flex items-center gap-1 transition"
            title="Clear all additional checkboxes for this user"
          >
            <X className="w-3.5 h-3.5" />
            Clear Additional
          </button>
        </div>
      </div>

      {/* Main Additional Access Control Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 min-w-[240px]">Access Point / Navigator</th>
                <th className="px-4 py-3.5 text-center min-w-[140px]">
                  <div className="flex flex-col items-center">
                    <span>Current Access</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Base Role)</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center min-w-[130px] bg-blue-50/50 border-x border-blue-100">
                  <div className="flex flex-col items-center">
                    <span className="text-blue-900 font-bold">☑ View Only</span>
                    <span className="text-[10px] text-blue-600 font-normal">Additional Grant</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center min-w-[130px] bg-indigo-50/50 border-r border-indigo-100">
                  <div className="flex flex-col items-center">
                    <span className="text-indigo-900 font-bold">☑ View &amp; Edit</span>
                    <span className="text-[10px] text-indigo-600 font-normal">Includes View</span>
                  </div>
                </th>
                <th className="px-5 py-3.5 text-center min-w-[160px]">
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-slate-800">Final / Effective Access</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Base + Additional)</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 min-w-[200px]">Access Resolution Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Compass className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">No matching navigators found</p>
                    <p className="text-[11px] mt-1">Try adjusting your search query or category filter.</p>
                  </td>
                </tr>
              ) : (
                filteredMatrix.map(item => {
                  const isBaseEdit = item.currentAccess === 'edit';
                  const isBaseView = item.currentAccess === 'view';

                  return (
                    <tr 
                      key={item.navigatorId} 
                      className={`hover:bg-slate-50/80 transition ${
                        item.isExtendedByAdditional ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      {/* Navigator & Category */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shrink-0 mt-0.5">
                            <Compass className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block leading-tight">
                              {item.navigatorName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                {item.category}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-xs">
                                {item.description}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Access Badge */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.currentAccess === 'edit' 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                            : item.currentAccess === 'view'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {item.currentAccessLabel}
                        </span>
                      </td>

                      {/* Additional View Checkbox */}
                      <td className="px-4 py-3.5 text-center bg-blue-50/30 border-x border-blue-100/60">
                        <label className="inline-flex items-center justify-center p-1.5 rounded-lg cursor-pointer hover:bg-blue-100/60 transition select-none">
                          <input
                            type="checkbox"
                            checked={item.additionalView}
                            onChange={() => handleToggleView(item.navigatorId)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Additional View & Edit Checkbox */}
                      <td className="px-4 py-3.5 text-center bg-indigo-50/30 border-r border-indigo-100/60">
                        <label className="inline-flex items-center justify-center p-1.5 rounded-lg cursor-pointer hover:bg-indigo-100/60 transition select-none">
                          <input
                            type="checkbox"
                            checked={item.additionalEdit}
                            onChange={() => handleToggleEdit(item.navigatorId)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Final / Effective Access Badge */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                            item.effectiveAccess === 'edit'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.effectiveAccess === 'view'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {item.effectiveAccess === 'edit' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            {item.effectiveAccess === 'view' && <Eye className="w-3.5 h-3.5 text-blue-600" />}
                            {item.effectiveAccess === 'none' && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                            {item.effectiveAccessLabel}
                          </span>

                          {item.isExtendedByAdditional && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-200">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                              Extended
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Resolution Notes */}
                      <td className="px-4 py-3.5 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{item.statusNote}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Additional permissions are applied in real time. Changes are stored in Google Sheets table <strong className="font-mono text-slate-700">UserAdditionalAccess</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Unsaved modifications
              </span>
            )}
            <button
              onClick={handleSaveAdditionalAccess}
              disabled={isSaving || !hasUnsavedChanges}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-xs flex items-center gap-1.5"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
