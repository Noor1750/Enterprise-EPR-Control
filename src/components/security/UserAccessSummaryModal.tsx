import { useState } from 'react';
import { 
  X, User, Mail, Building, Briefcase, 
  CheckCircle2, XCircle, Info, Compass, 
  RotateCcw, Sparkles
} from 'lucide-react';
import { 
  UserSecurityScope, 
  ALL_SYSTEM_MODULES, 
  ALL_PERMISSION_TYPES, 
  PermissionType, 
  calculateEffectiveUserPermissions, 
  recordSecurityAuditLog,
  grantUserPermissionOverride
} from '../../lib/security';
import { findNavigator } from '../../lib/navigators';

interface UserAccessSummaryModalProps {
  userScope: UserSecurityScope;
  adminUser: any;
  onClose: () => void;
  onRefresh: () => void;
  employees: string[][];
}

export default function UserAccessSummaryModal({
  userScope,
  adminUser,
  onClose,
  onRefresh,
  employees
}: UserAccessSummaryModalProps) {
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [activeView, setActiveView] = useState<'matrix' | 'details'>('matrix');
  const [auditComment, setAuditComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userKey = userScope.username.toLowerCase();

  // Matched employee row if available
  const matchedEmp = employees.find(e => e[0] === userScope.employeeId || e[1]?.toLowerCase() === userScope.username.toLowerCase());
  const displayName = userScope.employeeName || (matchedEmp ? matchedEmp[1] : userScope.username);

  const handleToggleOverride = (moduleKey: string, action: PermissionType, currentlyAllowed: boolean) => {
    setIsSaving(true);
    try {
      const existingCustomStr = localStorage.getItem(`erp_custom_perms_${userKey}`);
      const existingCustom: Record<string, any> = existingCustomStr ? JSON.parse(existingCustomStr) : {};
      
      const existingDeniedStr = localStorage.getItem(`erp_denied_perms_${userKey}`);
      const existingDenied: Record<string, PermissionType[]> = existingDeniedStr ? JSON.parse(existingDeniedStr) : {};

      if (currentlyAllowed) {
        // Deny this action explicitly
        if (!existingDenied[moduleKey]) existingDenied[moduleKey] = [];
        if (!existingDenied[moduleKey].includes(action)) existingDenied[moduleKey].push(action);
        
        // Remove from custom allows if present
        if (existingCustom[moduleKey]?.permissions) {
          existingCustom[moduleKey].permissions = existingCustom[moduleKey].permissions.filter((p: string) => p !== action);
        }
      } else {
        // Grant this action override
        grantUserPermissionOverride(userScope.username, moduleKey, action);
        if (existingDenied[moduleKey]) {
          existingDenied[moduleKey] = existingDenied[moduleKey].filter((p: string) => p !== action);
        }
      }

      localStorage.setItem(`erp_denied_perms_${userKey}`, JSON.stringify(existingDenied));

      // Record Audit Log
      recordSecurityAuditLog({
        adminEmail: adminUser?.email || 'admin@smltrims.com',
        targetUser: userScope.username,
        role: userScope.role,
        module: moduleKey,
        actionType: action,
        previousPermission: currentlyAllowed ? 'Allowed' : 'Denied',
        newPermission: currentlyAllowed ? 'Denied' : 'Allowed',
        source: 'User Override',
        reason: auditComment.trim() || `Admin manual toggle override for ${action} on ${moduleKey}`
      });

      onRefresh();
    } catch (err) {
      console.error('Failed to toggle override:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAllOverrides = () => {
    if (false) {
      return;
    }
    localStorage.removeItem(`erp_custom_perms_${userKey}`);
    localStorage.removeItem(`erp_denied_perms_${userKey}`);
    recordSecurityAuditLog({
      adminEmail: adminUser?.email || 'admin@smltrims.com',
      targetUser: userScope.username,
      role: userScope.role,
      module: 'ALL_MODULES',
      actionType: 'RESET_ALL',
      previousPermission: 'Custom Overrides',
      newPermission: 'Role Defaults',
      source: 'Role Default',
      reason: 'Admin reset all overrides to standard role defaults'
    });
    onRefresh();
  };

  const filteredModules = selectedModule === 'all' 
    ? ALL_SYSTEM_MODULES 
    : ALL_SYSTEM_MODULES.filter(m => m.id === selectedModule);

  const defaultNavObj = userScope.defaultNavigator ? findNavigator(userScope.defaultNavigator) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">{displayName}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  userScope.isAdmin ? 'bg-rose-500 text-white' :
                  userScope.isManager ? 'bg-indigo-500 text-white' :
                  userScope.isSuperuser ? 'bg-purple-500 text-white' :
                  userScope.isSupervisor ? 'bg-emerald-500 text-white' :
                  'bg-slate-700 text-slate-200'
                }`}>
                  {userScope.role}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  userScope.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {userScope.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {userScope.username}</span>
                {userScope.employeeId && <span className="text-slate-400">• ID: {userScope.employeeId}</span>}
                {userScope.assignedDepartment && <span className="flex items-center gap-1">• <Building className="w-3.5 h-3.5 text-slate-400" /> {userScope.assignedDepartment}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAllOverrides}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
              title="Reset all individual overrides to standard role defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Overrides
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Scope Info Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shrink-0">
          <div>
            <span className="text-slate-400 font-medium block">Data Scope:</span>
            <span className="font-bold text-slate-800 capitalize">{userScope.accessLimitType} ({userScope.assignedDepartment || 'Enterprise'})</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Supervisor Link:</span>
            <span className="font-bold text-slate-800">{userScope.supervisorName || 'Direct / None'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Default Navigator:</span>
            <span className="font-bold text-blue-700 flex items-center gap-1 truncate">
              <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              {defaultNavObj?.name || userScope.defaultNavigator || 'System Default'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Effective Rights Source:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              {userScope.isAdmin ? 'Master Admin' : 'Role + Overrides'}
            </span>
          </div>
        </div>

        {/* Filters and View Switcher */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Filter Module:</span>
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Modules ({ALL_SYSTEM_MODULES.length})</option>
              {ALL_SYSTEM_MODULES.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Role Default</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> User Override</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Explicit Deny</span>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 min-w-[180px]">Module / Capability</th>
                  <th className="px-3 py-3 text-center">View</th>
                  <th className="px-3 py-3 text-center">Create</th>
                  <th className="px-3 py-3 text-center">Edit</th>
                  <th className="px-3 py-3 text-center">Delete</th>
                  <th className="px-3 py-3 text-center">Approve</th>
                  <th className="px-3 py-3 text-center">Reject</th>
                  <th className="px-3 py-3 text-center">Assign</th>
                  <th className="px-3 py-3 text-center">Export</th>
                  <th className="px-3 py-3 text-center">Print</th>
                  <th className="px-3 py-3 text-center">Configure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredModules.map(mod => {
                  const permissions = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'print', 'configure'] as PermissionType[];
                  
                  return (
                    <tr key={mod.id} className="hover:bg-blue-50/40 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="flex flex-col">
                          <span>{mod.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{mod.category}</span>
                        </div>
                      </td>
                      {permissions.map(action => {
                        const eff = calculateEffectiveUserPermissions(userScope, mod.id, action);
                        const isOverridden = eff.source === 'User Override';
                        const isDenied = eff.source === 'Explicit Deny';
                        const isAllowed = eff.allowed;

                        return (
                          <td key={action} className="px-2 py-2 text-center">
                            <button
                              disabled={userScope.isAdmin || isSaving}
                              onClick={() => handleToggleOverride(mod.id, action, isAllowed)}
                              title={`${action.toUpperCase()} on ${mod.name}\nStatus: ${isAllowed ? 'Allowed' : 'Denied'}\nSource: ${eff.source}\nClick to toggle override`}
                              className={`p-1.5 rounded-lg transition inline-flex items-center justify-center ${
                                userScope.isAdmin 
                                  ? 'bg-emerald-50 text-emerald-700 cursor-default'
                                  : isAllowed
                                  ? isOverridden
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 ring-1 ring-blue-400'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : isDenied
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 ring-1 ring-rose-300'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {isAllowed ? (
                                <CheckCircle2 className={`w-4 h-4 ${isOverridden ? 'text-blue-600' : 'text-emerald-600'}`} />
                              ) : (
                                <XCircle className={`w-4 h-4 ${isDenied ? 'text-rose-500' : 'text-slate-300'}`} />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Effective Access Computation:</span> Master Admin permissions cannot be restricted. For all other roles, permissions are automatically computed from the role template plus any specific individual grants or explicit denials shown in blue and red badges above.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Changes to individual overrides are instantly enforced and logged in the Security Audit Trail.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}
