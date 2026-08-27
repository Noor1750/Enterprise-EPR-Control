import { useState } from 'react';
import { 
  X, Eye, Shield, Users, Compass, 
  CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  Menu, CheckSquare, Calendar, Clock, Wrench, Briefcase, Target, Award, DownloadCloud, Settings
} from 'lucide-react';
import { 
  UserSecurityScope, 
  parseUserSecurityScope, 
  ALL_SYSTEM_MODULES, 
  ALL_PERMISSION_TYPES, 
  PermissionType,
  calculateEffectiveUserPermissions, 
  UserRole 
} from '../../lib/security';
import { findNavigator } from '../../lib/navigators';

interface ImpersonationPreviewModalProps {
  users: string[][];
  employees: string[][];
  onClose: () => void;
}

export default function ImpersonationPreviewModal({
  users,
  employees,
  onClose
}: ImpersonationPreviewModalProps) {
  const parsedUsers = users.map(u => parseUserSecurityScope(u));
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>(parsedUsers[0]?.username || '');
  const [activeTab, setActiveTab] = useState<'navigation' | 'matrix' | 'scope'>('navigation');

  const selectedScope = parsedUsers.find(u => u.username.toLowerCase() === selectedUserEmail.toLowerCase()) || parsedUsers[0];

  const allNavItems = [
    { id: 'dashboard', name: 'ERP Dashboard', icon: Menu, moduleKey: 'dashboard' },
    { id: 'tasks', name: 'Daily Tasks', icon: CheckSquare, moduleKey: 'tasks' },
    { id: 'breakdown', name: 'Breakdown Log', icon: AlertTriangle, moduleKey: 'breakdown' },
    { id: 'directory', name: 'Employee Directory', icon: Users, moduleKey: 'directory' },
    { id: 'leave', name: 'Leave Management', icon: Calendar, moduleKey: 'leave' },
    { id: 'overtime', name: 'Overtime & Attendance', icon: Clock, moduleKey: 'overtime' },
    { id: 'machine', name: 'Machine Capacity', icon: Wrench, moduleKey: 'machine' },
    { id: 'shifts', name: 'Shift Assignments', icon: Briefcase, moduleKey: 'shifts' },
    { id: 'skills', name: 'Skill Matrix', icon: Target, moduleKey: 'skills' },
    { id: 'kpi', name: 'Monthly KPI', icon: Target, moduleKey: 'kpi' },
    { id: 'practices', name: 'Best Practices', icon: Award, moduleKey: 'practices' },
    { id: 'reports', name: 'Reports & Export', icon: DownloadCloud, moduleKey: 'reports' },
    { id: 'settings', name: 'Settings & Security', icon: Settings, moduleKey: 'settings' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 font-bold">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Access Preview & User Impersonation</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                  Read-Only Simulation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate exact navigation, visible screens, allowed action buttons, and dataset visibility for any role or account.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Selector Banner */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Preview User:</span>
            <select
              value={selectedUserEmail}
              onChange={e => setSelectedUserEmail(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 min-w-[260px]"
            >
              {parsedUsers.map(u => (
                <option key={u.username} value={u.username}>
                  {u.employeeName || u.username} ({u.role} - {u.accessLimitType})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('navigation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'navigation' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Simulated Navigation
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'matrix' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Action Permissions
            </button>
            <button
              onClick={() => setActiveTab('scope')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'scope' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Data Scope Summary
            </button>
          </div>
        </div>

        {/* User Profile Snapshot */}
        <div className="px-6 py-3 bg-purple-50/40 border-b border-purple-100 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400 font-medium">Role: </span>
              <strong className="text-purple-900">{selectedScope.role}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Department: </span>
              <strong className="text-slate-800">{selectedScope.assignedDepartment || 'None / All'}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Supervisor: </span>
              <strong className="text-slate-800">{selectedScope.supervisorName || 'Direct'}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Landing Navigator: </span>
              <strong className="text-blue-700">{findNavigator(selectedScope.defaultNavigator || '')?.name || selectedScope.defaultNavigator || 'System Default'}</strong>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'navigation' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sidebar Navigation Items for {selectedScope.employeeName || selectedScope.username}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allNavItems.map(item => {
                  const viewEff = calculateEffectiveUserPermissions(selectedScope, item.moduleKey, 'view');
                  const isVisible = viewEff.allowed;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border flex items-center justify-between transition ${
                        isVisible
                          ? 'bg-white border-slate-200 shadow-xs'
                          : 'bg-slate-50 border-slate-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isVisible ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400">
                            Scope: <strong className="text-slate-600">{viewEff.scope}</strong>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isVisible ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Hidden
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Simulated Action Rights (Create, Edit, Delete, Approve, Export)
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-3 py-3 text-center">View</th>
                      <th className="px-3 py-3 text-center">Create</th>
                      <th className="px-3 py-3 text-center">Edit</th>
                      <th className="px-3 py-3 text-center">Delete</th>
                      <th className="px-3 py-3 text-center">Approve</th>
                      <th className="px-3 py-3 text-center">Export</th>
                      <th className="px-3 py-3 text-center">Configure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {ALL_SYSTEM_MODULES.map(mod => {
                      const actions: PermissionType[] = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'configure'];
                      return (
                        <tr key={mod.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {mod.name}
                          </td>
                          {actions.map(a => {
                            const eff = calculateEffectiveUserPermissions(selectedScope, mod.id, a);
                            return (
                              <td key={a} className="px-3 py-3 text-center">
                                {eff.allowed ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'scope' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                <h4 className="font-bold text-sm text-purple-900 mb-2">Data Isolation & Visibility Rules</h4>
                <div className="space-y-2 text-xs text-purple-800">
                  <p>• <strong className="font-bold">Access Limit Mode:</strong> {selectedScope.accessLimitType.toUpperCase()}</p>
                  <p>• <strong className="font-bold">Authorized Department:</strong> {selectedScope.assignedDepartment || 'Enterprise / All'}</p>
                  <p>• <strong className="font-bold">Supervisor Link:</strong> {selectedScope.supervisorName || 'Direct'}</p>
                  <p>• <strong className="font-bold">Assigned Specific Employee IDs:</strong> {selectedScope.assignedEmployeeIds.length > 0 ? selectedScope.assignedEmployeeIds.join(', ') : 'None / Dynamic'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Impersonation preview does not execute backend writes or mutate user session data.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            Exit Simulation
          </button>
        </div>
      </div>
    </div>
  );
}
