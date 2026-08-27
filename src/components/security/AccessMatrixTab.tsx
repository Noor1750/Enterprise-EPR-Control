import React, { useState } from 'react';
import { 
  Users, Shield, Filter, Search, Check, X, 
  RotateCcw, Save, CheckCircle2, XCircle, AlertCircle, Info, Sparkles, Sliders
} from 'lucide-react';
import { 
  UserSecurityScope, 
  ALL_SYSTEM_MODULES, 
  ALL_PERMISSION_TYPES, 
  ALL_SCOPE_TYPES,
  PermissionType, 
  ScopeType,
  ROLE_DEFAULT_PERMISSIONS,
  calculateEffectiveUserPermissions,
  parseUserSecurityScope,
  recordSecurityAuditLog,
  grantUserPermissionOverride
} from '../../lib/security';

interface AccessMatrixTabProps {
  users: string[][];
  employees: string[][];
  adminUser: any;
  onRefreshUsers: () => void;
  onOpenUserSummary: (userScope: UserSecurityScope) => void;
}

export default function AccessMatrixTab({
  users,
  employees,
  adminUser,
  onRefreshUsers,
  onOpenUserSummary
}: AccessMatrixTabProps) {
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const parsedUsers = users.map(u => parseUserSecurityScope(u));

  const filteredUsers = parsedUsers.filter(u => {
    if (selectedRole !== 'All' && u.role !== selectedRole) return false;
    if (selectedUserEmail !== 'All' && u.username.toLowerCase() !== selectedUserEmail.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (u.employeeName || '').toLowerCase();
      const email = u.username.toLowerCase();
      const dept = (u.assignedDepartment || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !dept.includes(q)) return false;
    }
    return true;
  });

  const categories = ['All', ...Array.from(new Set(ALL_SYSTEM_MODULES.map(m => m.category)))];

  const filteredModules = ALL_SYSTEM_MODULES.filter(m => {
    if (selectedCategory !== 'All' && m.category !== selectedCategory) return false;
    return true;
  });

  const roles = ['Admin', 'Manager', 'Superuser', 'Supervisor', 'User'];

  const handleToggleUserPermission = (userScope: UserSecurityScope, moduleKey: string, action: PermissionType, currentlyAllowed: boolean) => {
    setIsSaving(true);
    const userKey = userScope.username.toLowerCase();
    try {
      const existingDeniedStr = localStorage.getItem(`erp_denied_perms_${userKey}`);
      const existingDenied: Record<string, PermissionType[]> = existingDeniedStr ? JSON.parse(existingDeniedStr) : {};

      if (currentlyAllowed) {
        if (!existingDenied[moduleKey]) existingDenied[moduleKey] = [];
        if (!existingDenied[moduleKey].includes(action)) existingDenied[moduleKey].push(action);
      } else {
        grantUserPermissionOverride(userScope.username, moduleKey, action);
        if (existingDenied[moduleKey]) {
          existingDenied[moduleKey] = existingDenied[moduleKey].filter(p => p !== action);
        }
      }
      localStorage.setItem(`erp_denied_perms_${userKey}`, JSON.stringify(existingDenied));

      recordSecurityAuditLog({
        adminEmail: adminUser?.email || 'admin@smltrims.com',
        targetUser: userScope.username,
        role: userScope.role,
        module: moduleKey,
        actionType: action,
        previousPermission: currentlyAllowed ? 'Allowed' : 'Denied',
        newPermission: currentlyAllowed ? 'Denied' : 'Allowed',
        source: 'User Override',
        reason: `Matrix view toggle for ${userScope.username}`
      });

      setSuccessNotice(`Updated ${action.toUpperCase()} permission on ${moduleKey} for ${userScope.employeeName || userScope.username}`);
      setTimeout(() => setSuccessNotice(null), 3000);
      onRefreshUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Access & Assignment Scope Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Centralized granular permission management. Configure View, Create, Edit, Delete, Approve, Reject, Assign, Export, and Configure capabilities across all 5 user roles and individual employee overrides.
          </p>
        </div>

        {successNotice && (
          <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user, email or dept..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg w-56 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Role:</span>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Roles ({roles.length})</option>
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">User:</span>
            <select
              value={selectedUserEmail}
              onChange={e => setSelectedUserEmail(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 font-medium max-w-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Users ({parsedUsers.length})</option>
              {parsedUsers.map(u => (
                <option key={u.username} value={u.username}>
                  {u.employeeName || u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Module Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Category:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredUsers.length}</span> user accounts across <span className="font-bold text-slate-800">{filteredModules.length}</span> modules
        </div>
      </div>

      {/* Role Defaults Reference Banner */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900">Standard Role Hierarchy & Inheritance</h4>
              <p className="text-xs text-blue-700 mt-0.5">
                <span className="font-bold">Admin:</span> Full Control • <span className="font-bold">Manager:</span> Department Management • <span className="font-bold">Superuser:</span> Enterprise Operational • <span className="font-bold">Supervisor:</span> Scoped Team Control • <span className="font-bold">User:</span> Personal Scope Only
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-md border border-blue-200 font-semibold text-blue-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Role Default
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-md border border-blue-200 font-semibold text-blue-800">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> User Override
            </span>
          </div>
        </div>
      </div>

      {/* Users Matrix Cards / Grid */}
      <div className="space-y-4">
        {filteredUsers.map((userScope, uIdx) => {
          const authCount = userScope.assignedEmployeeIds.length;
          
          return (
            <div 
              key={uIdx} 
              className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all hover:border-blue-300"
            >
              {/* User Header */}
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    userScope.isAdmin ? 'bg-rose-100 text-rose-800' :
                    userScope.isManager ? 'bg-indigo-100 text-indigo-800' :
                    userScope.isSuperuser ? 'bg-purple-100 text-purple-800' :
                    userScope.isSupervisor ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    {(userScope.employeeName || userScope.username).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{userScope.employeeName || userScope.username}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        userScope.isAdmin ? 'bg-rose-100 text-rose-800' :
                        userScope.isManager ? 'bg-indigo-100 text-indigo-800' :
                        userScope.isSuperuser ? 'bg-purple-100 text-purple-800' :
                        userScope.isSupervisor ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {userScope.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{userScope.username}</span>
                      <span>• Scope: <strong className="text-slate-700 capitalize">{userScope.accessLimitType}</strong></span>
                      {userScope.assignedDepartment && <span>• Dept: <strong className="text-slate-700">{userScope.assignedDepartment}</strong></span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenUserSummary(userScope)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Inspect Effective Access
                  </button>
                </div>
              </div>

              {/* Module Permissions Grid */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 min-w-[170px]">Module</th>
                      <th className="px-2.5 py-2.5 text-center">View</th>
                      <th className="px-2.5 py-2.5 text-center">Create</th>
                      <th className="px-2.5 py-2.5 text-center">Edit</th>
                      <th className="px-2.5 py-2.5 text-center">Delete</th>
                      <th className="px-2.5 py-2.5 text-center">Approve</th>
                      <th className="px-2.5 py-2.5 text-center">Reject</th>
                      <th className="px-2.5 py-2.5 text-center">Assign</th>
                      <th className="px-2.5 py-2.5 text-center">Export</th>
                      <th className="px-2.5 py-2.5 text-center">Print</th>
                      <th className="px-2.5 py-2.5 text-center">Configure</th>
                      <th className="px-4 py-2.5 min-w-[140px]">Data Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredModules.map(mod => {
                      const actions: PermissionType[] = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'print', 'configure'];
                      const viewEff = calculateEffectiveUserPermissions(userScope, mod.id, 'view');
                      
                      return (
                        <tr key={mod.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            <span className="block">{mod.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{mod.category}</span>
                          </td>

                          {actions.map(action => {
                            const eff = calculateEffectiveUserPermissions(userScope, mod.id, action);
                            const isAllowed = eff.allowed;
                            const isUserOverride = eff.source === 'User Override';
                            const isDenied = eff.source === 'Explicit Deny';

                            return (
                              <td key={action} className="px-2 py-2 text-center">
                                  <input 
                                    type="checkbox"
                                    checked={isAllowed}
                                    disabled={userScope.isAdmin || isSaving}
                                    onChange={() => handleToggleUserPermission(userScope, mod.id, action, isAllowed)}
                                    title={`${action.toUpperCase()} - ${mod.name}\nStatus: ${isAllowed ? 'Allowed' : 'Denied'}\nSource: ${eff.source}\nClick to toggle override`}
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                              </td>
                            );
                          })}

                          <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {viewEff.scope}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No matching users found</p>
            <p className="text-xs text-slate-500 mt-0.5">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
}
