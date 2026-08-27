import React, { useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, 
  Wrench, Sparkles, RefreshCw, User, Sliders
} from 'lucide-react';
import { 
  parseUserSecurityScope, 
  detectPermissionConflicts, 
  PermissionConflict, 
  recordSecurityAuditLog,
  UserSecurityScope
} from '../../lib/security';

interface PermissionConflictsTabProps {
  users: string[][];
  adminUser: any;
  onRefreshUsers: () => void;
  onOpenUserSummary: (userScope: UserSecurityScope) => void;
}

export default function PermissionConflictsTab({
  users,
  adminUser,
  onRefreshUsers,
  onOpenUserSummary
}: PermissionConflictsTabProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedUsers = users.map(u => parseUserSecurityScope(u));
  
  // Aggregate all conflicts across all users
  const userConflicts: { user: UserSecurityScope; conflicts: PermissionConflict[] }[] = [];
  let totalConflictsCount = 0;

  parsedUsers.forEach(u => {
    const conflicts = detectPermissionConflicts(u);
    if (conflicts.length > 0) {
      userConflicts.push({ user: u, conflicts });
      totalConflictsCount += conflicts.length;
    }
  });

  const handleFixSingleConflict = (user: UserSecurityScope, conflict: PermissionConflict) => {
    setIsFixing(true);
    try {
      conflict.autoFixAction();
      recordSecurityAuditLog({
        adminEmail: adminUser?.email || 'admin@smltrims.com',
        targetUser: user.username,
        role: user.role,
        module: conflict.moduleKey,
        actionType: 'RESOLVE_CONFLICT',
        previousPermission: 'Conflicted Rules',
        newPermission: 'Resolved',
        source: 'Conflict Auto-Fix',
        reason: `Auto-fixed conflict: ${conflict.description}`
      });

      setSuccessMessage(`Resolved conflict for ${user.employeeName || user.username} on ${conflict.moduleName}`);
      setTimeout(() => setSuccessMessage(null), 3500);
      onRefreshUsers();
    } catch (err) {
      console.error('Failed to fix conflict:', err);
    } finally {
      setIsFixing(false);
    }
  };

  const handleFixAllConflictsForUser = (user: UserSecurityScope, conflicts: PermissionConflict[]) => {
    setIsFixing(true);
    try {
      conflicts.forEach(c => c.autoFixAction());
      recordSecurityAuditLog({
        adminEmail: adminUser?.email || 'admin@smltrims.com',
        targetUser: user.username,
        role: user.role,
        module: 'ALL_CONFLICTS',
        actionType: 'BATCH_RESOLVE',
        previousPermission: `${conflicts.length} Conflicts`,
        newPermission: 'Resolved',
        source: 'Conflict Auto-Fix',
        reason: `Bulk auto-resolved all ${conflicts.length} permission conflicts`
      });

      setSuccessMessage(`Resolved all ${conflicts.length} conflicts for ${user.employeeName || user.username}`);
      setTimeout(() => setSuccessMessage(null), 3500);
      onRefreshUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setIsFixing(false);
    }
  };

  const handleFixAllSystemConflicts = () => {
    if (false) {
      return;
    }
    setIsFixing(true);
    try {
      userConflicts.forEach(item => {
        item.conflicts.forEach(c => c.autoFixAction());
      });
      recordSecurityAuditLog({
        adminEmail: adminUser?.email || 'admin@smltrims.com',
        targetUser: 'SYSTEM_WIDE',
        role: 'ALL',
        module: 'ALL_MODULES',
        actionType: 'GLOBAL_CONFLICT_FIX',
        previousPermission: `${totalConflictsCount} Conflicts`,
        newPermission: 'All Resolved',
        source: 'Conflict Auto-Fix',
        reason: `Global auto-resolution of ${totalConflictsCount} conflicts`
      });
      setSuccessMessage(`Successfully resolved all ${totalConflictsCount} conflicts across the application!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      onRefreshUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">
              Permission Conflicts & Logical Anomaly Detector
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              totalConflictsCount > 0 ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {totalConflictsCount} {totalConflictsCount === 1 ? 'Conflict' : 'Conflicts'} Detected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Detects logical contradictions such as &quot;Edit without View&quot;, &quot;Delete without View/Edit&quot;, &quot;Approve without View&quot;, or &quot;Export without View&quot;. All conflicts can be auto-resolved with a single click.
          </p>
        </div>

        {totalConflictsCount > 0 && (
          <button
            onClick={handleFixAllSystemConflicts}
            disabled={isFixing}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Fix All ({totalConflictsCount}) Conflicts
          </button>
        )}
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Conflicts List */}
      <div className="space-y-4">
        {userConflicts.map(({ user, conflicts }) => (
          <div 
            key={user.username} 
            className="bg-white rounded-xl border border-purple-200 shadow-xs overflow-hidden"
          >
            {/* User Header */}
            <div className="px-6 py-4 bg-purple-50/50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-200 text-purple-800 font-bold text-xs flex items-center justify-center">
                  {(user.employeeName || user.username).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{user.employeeName || user.username}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                      {user.role}
                    </span>
                    <span className="text-xs text-purple-600 font-semibold">
                      ({conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {user.username} {user.assignedDepartment ? `• ${user.assignedDepartment}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenUserSummary(user)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition"
                >
                  Inspect Matrix
                </button>
                <button
                  onClick={() => handleFixAllConflictsForUser(user, conflicts)}
                  disabled={isFixing}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Fix All for User
                </button>
              </div>
            </div>

            {/* Individual Conflicts Table */}
            <div className="divide-y divide-slate-100">
              {conflicts.map(conflict => (
                <div key={conflict.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${
                      conflict.severity === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{conflict.moduleName}</span>
                        <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {conflict.type}
                        </span>
                        <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                          conflict.severity === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {conflict.severity} Severity
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {conflict.description}
                      </p>
                      <p className="text-[11px] text-purple-700 font-medium mt-1">
                        💡 Recommendation: {conflict.recommendation}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFixSingleConflict(user, conflict)}
                    disabled={isFixing}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Wrench className="w-3.5 h-3.5 text-purple-400" />
                    Auto-Fix Rule
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {userConflicts.length === 0 && (
          <div className="bg-white p-12 text-center rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-emerald-900">Zero Permission Conflicts Detected</h3>
            <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
              All role templates, user grants, overrides, and view/edit/delete combinations are logically consistent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
