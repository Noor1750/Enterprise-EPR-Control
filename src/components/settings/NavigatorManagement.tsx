import React, { useState, useMemo } from 'react';
import { 
  Compass, Search, Shield, Check, X, AlertTriangle, 
  History, Sliders, CheckSquare, Square, RefreshCw, 
  User, Building, Filter, ExternalLink, ArrowRight,
  Info, CheckCircle2, XCircle, AlertCircle, Sparkles
} from 'lucide-react';
import { UserSecurityScope, formatEmailToName, parseUserSecurityScope } from '../../lib/security';
import { 
  SystemNavigator, 
  getSystemNavigators, 
  saveSystemNavigators, 
  getNavigatorIcon, 
  hasNavigatorAccess, 
  findNavigator, 
  getDefaultNavigatorHistory, 
  addDefaultNavigatorHistoryEntry, 
  canUserManageTargetDefaultNavigator,
  DefaultNavigatorHistoryEntry 
} from '../../lib/navigators';
import { updateRowByPrimaryKey } from '../../lib/sheets';

interface NavigatorManagementProps {
  spreadsheetId: string;
  users: string[][];
  employees: string[][];
  user: any;
  userSecurityScope?: UserSecurityScope;
  onRefreshUsers: () => void;
}

export default function NavigatorManagement({
  spreadsheetId,
  users,
  employees,
  user,
  userSecurityScope,
  onRefreshUsers
}: NavigatorManagementProps) {
  // System Navigators Master State
  const [navigators, setNavigators] = useState<SystemNavigator[]>(getSystemNavigators());
  const [activeSection, setActiveSection] = useState<'assignment' | 'master'>('assignment');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'All' | 'Assigned' | 'Unassigned'>('All');
  const [navigatorFilter, setNavigatorFilter] = useState('All');

  // Bulk Selection State
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTargetNavigator, setBulkTargetNavigator] = useState<string>('dashboard');
  const [bulkNote, setBulkNote] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Single User Assignment Modal State
  const [editingUserRow, setEditingUserRow] = useState<string[] | null>(null);
  const [selectedNavigatorId, setSelectedNavigatorId] = useState<string>('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [isSavingSingle, setIsSavingSingle] = useState(false);

  // History / Audit Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilterUser, setHistoryFilterUser] = useState<string>('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('All');
  const [historyList, setHistoryList] = useState<DefaultNavigatorHistoryEntry[]>(getDefaultNavigatorHistory());

  // Notification / Feedback State
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Toggle Navigator Active Status
  const handleToggleNavigatorStatus = (navId: string) => {
    if (!userSecurityScope?.isAdmin) {
      showToast('Only Administrators can change system navigator active status.', 'error');
      return;
    }

    const updated = navigators.map(n => {
      if (n.id === navId) {
        const nextStatus = n.status === 'Active' ? 'Inactive' : 'Active';
        return { ...n, status: nextStatus as 'Active' | 'Inactive' };
      }
      return n;
    });

    setNavigators(updated);
    saveSystemNavigators(updated);
    showToast(`Navigator status updated.`, 'success');
  };

  // Extract departments list for filter
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e[3]) set.add(e[3]);
    });
    users.forEach(u => {
      if (u[8]) set.add(u[8]);
    });
    return Array.from(set).sort();
  }, [employees, users]);

  // Enriched User Data with Navigator Resolution & Permissions
  const enrichedUsers = useMemo(() => {
    return users.map(row => {
      const scope = parseUserSecurityScope(row);
      const username = scope.username;
      const role = scope.role;
      const dept = scope.assignedDepartment;
      const empId = scope.employeeId;
      const empName = scope.employeeName || formatEmailToName(username);
      
      // Check manage permission
      const managePerm = canUserManageTargetDefaultNavigator(
        userSecurityScope,
        username,
        role,
        empId,
        dept
      );

      const assignedNavKey = scope.defaultNavigator || '';
      const matchedNav = assignedNavKey ? findNavigator(assignedNavKey) : undefined;
      
      let accessStatus: 'authorized' | 'unauthorized' | 'inactive' | 'none' = 'none';
      if (matchedNav) {
        if (matchedNav.status !== 'Active') {
          accessStatus = 'inactive';
        } else if (hasNavigatorAccess(matchedNav, scope, scope.accessLevel)) {
          accessStatus = 'authorized';
        } else {
          accessStatus = 'unauthorized';
        }
      }

      return {
        row,
        scope,
        username,
        role,
        dept,
        empId,
        empName,
        canManage: managePerm.allowed,
        manageReason: managePerm.reason,
        assignedNavKey,
        assignedNavObj: matchedNav,
        accessStatus
      };
    });
  }, [users, userSecurityScope, navigators]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return enrichedUsers.filter(u => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          u.username.toLowerCase().includes(q) ||
          u.empName.toLowerCase().includes(q) ||
          (u.empId && u.empId.toLowerCase().includes(q)) ||
          u.role.toLowerCase().includes(q) ||
          u.dept.toLowerCase().includes(q) ||
          (u.assignedNavObj && u.assignedNavObj.name.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Role filter
      if (roleFilter !== 'All' && u.role.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      // Dept filter
      if (deptFilter !== 'All' && u.dept !== deptFilter) {
        return false;
      }

      // Assignment status filter
      if (assignmentFilter === 'Assigned' && !u.assignedNavKey) return false;
      if (assignmentFilter === 'Unassigned' && u.assignedNavKey) return false;

      // Navigator specific filter
      if (navigatorFilter !== 'All') {
        if (!u.assignedNavObj || u.assignedNavObj.id !== navigatorFilter) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedUsers, searchQuery, roleFilter, deptFilter, assignmentFilter, navigatorFilter]);

  // Selection handlers
  const handleToggleSelectUser = (username: string, canManage: boolean) => {
    if (!canManage) return;
    setSelectedUsernames(prev => 
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const handleSelectAllManageable = () => {
    const manageable = filteredUsers.filter(u => u.canManage).map(u => u.username);
    const allSelected = manageable.every(u => selectedUsernames.includes(u));
    if (allSelected) {
      setSelectedUsernames(prev => prev.filter(u => !manageable.includes(u)));
    } else {
      setSelectedUsernames(Array.from(new Set([...selectedUsernames, ...manageable])));
    }
  };

  // Open Single User Modal
  const handleOpenAssignModal = (userItem: typeof enrichedUsers[0]) => {
    if (!userItem.canManage) {
      showToast(userItem.manageReason || 'You do not have permission to manage this user.', 'error');
      return;
    }
    setEditingUserRow(userItem.row);
    setSelectedNavigatorId(userItem.assignedNavObj?.id || userItem.assignedNavKey || '');
    setAssignmentNote('');
  };

  // Save Single User Assignment
  const handleSaveSingleAssignment = async () => {
    if (!editingUserRow) return;
    setIsSavingSingle(true);

    try {
      const scope = parseUserSecurityScope(editingUserRow);
      const username = scope.username;
      const prevNav = scope.defaultNavigator || 'System Default';
      const targetNavObj = findNavigator(selectedNavigatorId);
      const newNavName = targetNavObj ? targetNavObj.name : selectedNavigatorId || '';
      
      // Update row in spreadsheet
      const updatedRow = [...editingUserRow];
      while (updatedRow.length < 13) updatedRow.push('');
      updatedRow[12] = selectedNavigatorId; // Column 12 is Default_Navigator

      // Save to Google Sheets
      await updateRowByPrimaryKey(spreadsheetId, 'Users', username, updatedRow);

      // Save to LocalStorage fallback for instant hydration
      localStorage.setItem(`erp_user_default_nav_${username.toLowerCase()}`, selectedNavigatorId);

      // Record in Audit History
      const actionType = !selectedNavigatorId 
        ? 'REMOVED' 
        : prevNav === 'System Default' || !prevNav 
          ? 'ASSIGNED' 
          : 'CHANGED';

      addDefaultNavigatorHistoryEntry({
        userId: username,
        userName: scope.employeeName || formatEmailToName(username),
        employeeId: scope.employeeId,
        previousNavigator: prevNav,
        newNavigator: newNavName || 'System Default (None)',
        action: actionType,
        changedBy: userSecurityScope?.employeeName || user.email || 'Admin',
        notes: assignmentNote || (actionType === 'REMOVED' ? 'Reverted to system default' : `Assigned ${newNavName}`)
      });

      // Refresh data
      setHistoryList(getDefaultNavigatorHistory());
      onRefreshUsers();
      setEditingUserRow(null);
      showToast(`Default Navigator updated for ${scope.employeeName || username}!`, 'success');
    } catch (err) {
      console.error('Failed to save default navigator:', err);
      showToast('Failed to update Default Navigator. Please try again.', 'error');
    } finally {
      setIsSavingSingle(false);
    }
  };

  // Quick Remove Default Navigator
  const handleQuickRemove = async (userItem: typeof enrichedUsers[0]) => {
    if (!userItem.canManage) {
      showToast(userItem.manageReason || 'Permission denied.', 'error');
      return;
    }

    if (false) {
      return;
    }

    try {
      const updatedRow = [...userItem.row];
      while (updatedRow.length < 13) updatedRow.push('');
      updatedRow[12] = '';

      await updateRowByPrimaryKey(spreadsheetId, 'Users', userItem.username, updatedRow);
      localStorage.removeItem(`erp_user_default_nav_${userItem.username.toLowerCase()}`);

      addDefaultNavigatorHistoryEntry({
        userId: userItem.username,
        userName: userItem.empName,
        employeeId: userItem.empId,
        previousNavigator: userItem.assignedNavObj?.name || userItem.assignedNavKey,
        newNavigator: 'System Default (Skill Matrix)',
        action: 'REMOVED',
        changedBy: userSecurityScope?.employeeName || user.email || 'Admin',
        notes: 'Cleared user-specific default navigator assignment.'
      });

      setHistoryList(getDefaultNavigatorHistory());
      onRefreshUsers();
      showToast(`Default Navigator removed for ${userItem.empName}.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove default navigator.', 'error');
    }
  };

  // Bulk Assignment Handler
  const handleExecuteBulkAssignment = async () => {
    if (selectedUsernames.length === 0) return;
    const targetNav = findNavigator(bulkTargetNavigator);
    if (!targetNav) {
      showToast('Please choose a valid navigator.', 'error');
      return;
    }

    setIsSavingBulk(true);
    let successCount = 0;

    try {
      for (const username of selectedUsernames) {
        const userItem = enrichedUsers.find(u => u.username === username);
        if (userItem && userItem.canManage) {
          const updatedRow = [...userItem.row];
          while (updatedRow.length < 13) updatedRow.push('');
          updatedRow[12] = targetNav.id;

          await updateRowByPrimaryKey(spreadsheetId, 'Users', username, updatedRow);
          localStorage.setItem(`erp_user_default_nav_${username.toLowerCase()}`, targetNav.id);

          addDefaultNavigatorHistoryEntry({
            userId: username,
            userName: userItem.empName,
            employeeId: userItem.empId,
            previousNavigator: userItem.assignedNavObj?.name || 'System Default',
            newNavigator: targetNav.name,
            action: 'ASSIGNED',
            changedBy: userSecurityScope?.employeeName || user.email || 'Admin',
            notes: bulkNote || `Bulk assignment to ${targetNav.name}`
          });
          successCount++;
        }
      }

      setHistoryList(getDefaultNavigatorHistory());
      onRefreshUsers();
      setSelectedUsernames([]);
      setShowBulkModal(false);
      setBulkNote('');
      showToast(`Successfully assigned "${targetNav.name}" to ${successCount} selected user(s)!`, 'success');
    } catch (err) {
      console.error('Failed bulk assignment:', err);
      showToast('Error during bulk assignment. Some users may not have updated.', 'error');
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyList.filter(entry => {
      if (historyFilterUser) {
        if (entry.userId.toLowerCase() !== historyFilterUser.toLowerCase()) return false;
      }
      if (historyActionFilter !== 'All') {
        if (entry.action !== historyActionFilter) return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        return (
          entry.userName.toLowerCase().includes(q) ||
          entry.userId.toLowerCase().includes(q) ||
          entry.previousNavigator.toLowerCase().includes(q) ||
          entry.newNavigator.toLowerCase().includes(q) ||
          entry.changedBy.toLowerCase().includes(q) ||
          (entry.notes && entry.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [historyList, historyFilterUser, historyActionFilter, historySearch]);

  // Statistics
  const stats = useMemo(() => {
    const totalUsers = enrichedUsers.length;
    const assignedCount = enrichedUsers.filter(u => u.assignedNavKey).length;
    const activeNavs = navigators.filter(n => n.status === 'Active').length;
    
    // Most popular default
    const counts: Record<string, number> = {};
    enrichedUsers.forEach(u => {
      if (u.assignedNavObj) {
        counts[u.assignedNavObj.name] = (counts[u.assignedNavObj.name] || 0) + 1;
      }
    });
    let topNav = 'None';
    let topCount = 0;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > topCount) {
        topCount = count;
        topNav = name;
      }
    });

    return { totalUsers, assignedCount, activeNavs, topNav, topCount };
  }, [enrichedUsers, navigators]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : toastMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Navigators</div>
            <div className="text-2xl font-black text-gray-900 mt-1">{navigators.length}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{stats.activeNavs} Active in system</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Compass className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned Users</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{stats.assignedCount} <span className="text-xs font-semibold text-gray-400">/ {stats.totalUsers}</span></div>
            <div className="text-[11px] text-gray-500 mt-0.5">{Math.round((stats.assignedCount / (stats.totalUsers || 1)) * 100)}% auto-landing</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Top Default Landing</div>
            <div className="text-sm font-bold text-gray-900 mt-1 truncate max-w-[170px]" title={stats.topNav}>{stats.topNav}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{stats.topCount} assigned users</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Audit Trail Logs</div>
            <div className="text-2xl font-black text-gray-800 mt-1">{historyList.length}</div>
            <button 
              onClick={() => { setHistoryFilterUser(''); setShowHistoryModal(true); }}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline mt-0.5 flex items-center gap-1"
            >
              <History className="w-3 h-3" /> View History Log
            </button>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-Tabs: 1. Default Navigator Assignment | 2. Navigator Master Management */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-3 gap-3">
        <button
          onClick={() => setActiveSection('assignment')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeSection === 'assignment'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <User className="w-4 h-4" />
          Default Navigator User Assignment
          <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-semibold">
            {enrichedUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('master')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeSection === 'master'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Navigator Master Configuration & Status
          <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.2 rounded-full font-semibold">
            {navigators.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: DEFAULT NAVIGATOR ASSIGNMENT */}
      {activeSection === 'assignment' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search user name, ID, Gmail, department, or navigator..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedUsernames.length > 0 && (
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Assign Default to Selected ({selectedUsernames.length})
                  </button>
                )}

                <button
                  onClick={() => { setHistoryFilterUser(''); setShowHistoryModal(true); }}
                  className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-gray-500" />
                  Assignment History
                </button>

                <button
                  onClick={onRefreshUsers}
                  className="p-2 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg text-xs transition-colors"
                  title="Reload Users"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 text-xs">
              <span className="text-gray-400 font-medium flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Superuser">Superuser</option>
                <option value="Manager">Manager</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Standard User">Standard User</option>
                <option value="Operator">Operator</option>
              </select>

              {/* Department filter */}
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700"
              >
                <option value="All">All Departments</option>
                {departmentOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Assignment Status filter */}
              <select
                value={assignmentFilter}
                onChange={e => setAssignmentFilter(e.target.value as any)}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700 font-medium"
              >
                <option value="All">All Assignments</option>
                <option value="Assigned">Custom Default Set</option>
                <option value="Unassigned">System Default (Not Set)</option>
              </select>

              {/* Navigator Filter */}
              <select
                value={navigatorFilter}
                onChange={e => setNavigatorFilter(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700"
              >
                <option value="All">All Navigators</option>
                {navigators.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>

              {(searchQuery || roleFilter !== 'All' || deptFilter !== 'All' || assignmentFilter !== 'All' || navigatorFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('All');
                    setDeptFilter('All');
                    setAssignmentFilter('All');
                    setNavigatorFilter('All');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline ml-2"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* User Table with Default Navigator Column */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing <span className="font-bold text-gray-800">{filteredUsers.length}</span> user accounts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllManageable}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {filteredUsers.filter(u => u.canManage).every(u => selectedUsernames.includes(u.username)) && selectedUsernames.length > 0
                    ? 'Deselect All'
                    : 'Select All Filtered'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-4 py-3">Employee / User Account</th>
                    <th className="px-4 py-3">Role Tier</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Access Modules</th>
                    <th className="px-4 py-3">Assigned Default Navigator</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        <Compass className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No users match the current search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(userItem => {
                      const isSelected = selectedUsernames.includes(userItem.username);
                      const NavIcon = userItem.assignedNavObj ? getNavigatorIcon(userItem.assignedNavObj.iconName) : Compass;

                      return (
                        <tr 
                          key={userItem.username}
                          className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!userItem.canManage}
                              onChange={() => handleToggleSelectUser(userItem.username, userItem.canManage)}
                              className="rounded text-blue-600 focus:ring-blue-500 disabled:opacity-30 cursor-pointer"
                              title={userItem.canManage ? 'Select for bulk assignment' : (userItem.manageReason || 'No permission')}
                            />
                          </td>

                          {/* User & Employee Info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                                {userItem.empName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                  {userItem.empName}
                                  {userItem.empId && (
                                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 rounded">
                                      {userItem.empId}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 truncate max-w-[200px]" title={userItem.username}>
                                  {userItem.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              userItem.role === 'Admin'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : userItem.role === 'Superuser'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : userItem.role === 'Manager' || userItem.role === 'Supervisor'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {userItem.role}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3 text-gray-600 font-medium">
                            {userItem.dept || (
                              <span className="text-gray-400 italic">All / None</span>
                            )}
                          </td>

                          {/* Access Modules preview */}
                          <td className="px-4 py-3">
                            {userItem.scope.isAdmin || userItem.scope.accessLevel.includes('All') ? (
                              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Full Enterprise Scope
                              </span>
                            ) : userItem.scope.accessLevel.length === 0 ? (
                              <span className="text-[11px] text-amber-700 font-medium">
                                Standard User
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {userItem.scope.accessLevel.slice(0, 2).map((m, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                    {m}
                                  </span>
                                ))}
                                {userItem.scope.accessLevel.length > 2 && (
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    +{userItem.scope.accessLevel.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Assigned Default Navigator */}
                          <td className="px-4 py-3">
                            {userItem.assignedNavObj ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                                  <NavIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{userItem.assignedNavObj.name}</span>
                                </div>

                                {/* Security / Validity Badge */}
                                {userItem.accessStatus === 'authorized' ? (
                                  <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Authorized (Active)</span>
                                  </div>
                                ) : userItem.accessStatus === 'inactive' ? (
                                  <div className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 font-semibold" title="Navigator is deactivated in master settings">
                                    <XCircle className="w-3 h-3" />
                                    <span>Deactivated (Fallback)</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-semibold" title={`Requires '${userItem.assignedNavObj.moduleName}' access permission`}>
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>No Access (Fallback)</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-400 flex items-center gap-1.5 text-xs">
                                <Compass className="w-3.5 h-3.5 text-gray-300" />
                                <span>Default (Skill Matrix)</span>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {userItem.canManage ? (
                                <>
                                  <button
                                    onClick={() => handleOpenAssignModal(userItem)}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition-colors"
                                  >
                                    {userItem.assignedNavKey ? 'Change' : 'Assign'}
                                  </button>

                                  {userItem.assignedNavKey && (
                                    <button
                                      onClick={() => handleQuickRemove(userItem)}
                                      className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                      title="Remove Default Navigator"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setHistoryFilterUser(userItem.username);
                                      setShowHistoryModal(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                    title="View User Assignment History"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic" title={userItem.manageReason || 'Restricted'}>
                                  Locked
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: NAVIGATOR MASTER MANAGEMENT & STATUS */}
      {activeSection === 'master' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Application Master Navigators Configuration
            </h3>
            <p className="text-xs text-gray-500">
              Manage system navigators, access module prerequisites, and active landing availability. Inactive navigators are hidden and trigger automatic fallback for assigned users.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navigators.map(nav => {
              const Icon = getNavigatorIcon(nav.iconName);
              const assignedCount = enrichedUsers.filter(u => u.assignedNavObj?.id === nav.id).length;

              return (
                <div 
                  key={nav.id} 
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    nav.status === 'Active' 
                      ? 'bg-white border-gray-200 shadow-xs hover:shadow-md' 
                      : 'bg-gray-50 border-gray-200 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${
                          nav.status === 'Active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{nav.name}</h4>
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            {nav.category}
                          </span>
                        </div>
                      </div>

                      {/* Active Status Switch */}
                      <button
                        onClick={() => handleToggleNavigatorStatus(nav.id)}
                        disabled={!userSecurityScope?.isAdmin}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                          nav.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title={userSecurityScope?.isAdmin ? 'Click to toggle active/inactive' : 'Admin only'}
                      >
                        {nav.status === 'Active' ? '✓ Active' : '✕ Inactive'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 mb-3 min-h-[36px]">
                      {nav.description}
                    </p>

                    <div className="space-y-1.5 py-2 border-t border-gray-100 text-xs">
                      <div className="flex justify-between items-center text-gray-500">
                        <span>Required Access Module:</span>
                        <span className="font-semibold text-gray-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {nav.moduleName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500">
                        <span>Users Assigned Default:</span>
                        <span className="font-bold text-indigo-600">
                          {assignedCount} users
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => {
                        setNavigatorFilter(nav.id);
                        setActiveSection('assignment');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
                    >
                      View Assigned Users <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SINGLE USER ASSIGN DEFAULT NAVIGATOR MODAL */}
      {editingUserRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Assign Default Landing Navigator
                  </h3>
                  <p className="text-xs text-gray-500">
                    User: <span className="font-bold text-gray-800">{editingUserRow[10] || editingUserRow[0]}</span> ({editingUserRow[2] || 'User'})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUserRow(null)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              {/* User Scope Summary Card */}
              {(() => {
                const scope = parseUserSecurityScope(editingUserRow);
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="text-gray-500">Department: <span className="font-semibold text-gray-800">{scope.assignedDepartment || 'All'}</span></div>
                      <div className="text-gray-500">Current Assigned Default: <span className="font-bold text-blue-700">{scope.defaultNavigator || 'System Default (None)'}</span></div>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-500 font-medium">Access Modules: </span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[11px]">
                        {scope.isAdmin || scope.accessLevel.includes('All') ? 'Full Company Access' : scope.accessLevel.join(', ') || 'Standard'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Navigator Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Target Default Navigator *
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                  {/* Option: Revert to System Default */}
                  <button
                    type="button"
                    onClick={() => setSelectedNavigatorId('')}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                      selectedNavigatorId === ''
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-gray-500" />
                        <span>System Default (ERP Dashboard)</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">No custom override. Uses default ERP start module.</p>
                    </div>
                    {selectedNavigatorId === '' && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>

                  {/* All System Navigators */}
                  {navigators.map(nav => {
                    const scope = parseUserSecurityScope(editingUserRow);
                    const isAuthorized = hasNavigatorAccess(nav, scope, scope.accessLevel);
                    const isSelected = selectedNavigatorId === nav.id;
                    const Icon = getNavigatorIcon(nav.iconName);

                    return (
                      <button
                        key={nav.id}
                        type="button"
                        onClick={() => setSelectedNavigatorId(nav.id)}
                        className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="pr-2">
                          <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                            <span>{nav.name}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{nav.description}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {isAuthorized ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                ✓ Authorized
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200" title="User does not have access permissions for this module">
                                ⚠️ Requires {nav.moduleName}
                              </span>
                            )}

                            {nav.status !== 'Active' && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assignment Reason / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Audit Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={assignmentNote}
                  onChange={e => setAssignmentNote(e.target.value)}
                  placeholder="e.g. Assigned to Production Navigator for line supervisor role"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setSelectedNavigatorId('')}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline"
              >
                Clear Default Override
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUserRow(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingSingle}
                  onClick={handleSaveSingleAssignment}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingSingle ? 'Saving...' : 'Save Default Navigator'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK ASSIGNMENT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Bulk Assign Default Navigator
                  </h3>
                  <p className="text-xs text-gray-500">
                    Assigning to <span className="font-bold text-indigo-700">{selectedUsernames.length} selected users</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Choose Target Default Navigator *
                </label>
                <select
                  value={bulkTargetNavigator}
                  onChange={e => setBulkTargetNavigator(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg font-semibold text-gray-800"
                >
                  {navigators.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.category} - {n.moduleName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason / Notes for Audit Trail
                </label>
                <input
                  type="text"
                  value={bulkNote}
                  onChange={e => setBulkNote(e.target.value)}
                  placeholder="e.g. Department batch assignment for Q3 production team"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                />
              </div>

              {/* Confirmation Alert */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Confirmation Required</div>
                  <div>
                    You are about to assign <span className="font-bold">{findNavigator(bulkTargetNavigator)?.name}</span> as the default Navigator for <span className="font-bold">{selectedUsernames.length}</span> selected users. Continue?
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingBulk}
                onClick={handleExecuteBulkAssignment}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingBulk ? 'Applying...' : 'Confirm & Apply Bulk Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL / ASSIGNMENT HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Default Navigator Assignment Audit Trail
                  </h3>
                  <p className="text-xs text-gray-500">
                    Chronological history of default navigator assignments, modifications, removals, and auto-fallbacks.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* History Filters */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                {historyFilterUser && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    User: {historyFilterUser}
                    <button onClick={() => setHistoryFilterUser('')} className="hover:text-blue-900">×</button>
                  </span>
                )}

                <select
                  value={historyActionFilter}
                  onChange={e => setHistoryActionFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700"
                >
                  <option value="All">All Actions</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="CHANGED">CHANGED</option>
                  <option value="REMOVED">REMOVED</option>
                  <option value="FALLBACK_REDIRECT">FALLBACK_REDIRECT</option>
                </select>
              </div>
            </div>

            {/* History Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-2">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Date & Time</th>
                    <th className="px-3 py-2.5">User / Employee</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Previous Navigator</th>
                    <th className="px-3 py-2.5">New Default Navigator</th>
                    <th className="px-3 py-2.5">Changed By</th>
                    <th className="px-3 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        No audit history records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-gray-900">{entry.userName}</div>
                          <div className="text-[10px] text-gray-400">{entry.userId}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            entry.action === 'ASSIGNED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.action === 'CHANGED'
                                ? 'bg-blue-100 text-blue-800'
                                : entry.action === 'REMOVED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                          }`}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">
                          {entry.previousNavigator}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-gray-900">
                          {entry.newNavigator}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {entry.changedBy}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 italic max-w-xs truncate" title={entry.notes}>
                          {entry.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
