import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Users } from 'lucide-react';
import { 
  ALL_SYSTEM_MODULES, 
  ROLE_DEFAULT_PERMISSIONS, 
  UserRole,
  PermissionType 
} from '../../lib/security';

interface RoleComparisonModalProps {
  onClose: () => void;
}

export default function RoleComparisonModal({ onClose }: RoleComparisonModalProps) {
  const [selectedModuleCategory, setSelectedModuleCategory] = useState('All');
  const [selectedAction, setSelectedAction] = useState<PermissionType>('view');

  const roles: UserRole[] = ['Admin', 'Manager', 'Superuser', 'Supervisor', 'User'];
  const actions: { id: PermissionType; name: string }[] = [
    { id: 'view', name: 'View' },
    { id: 'create', name: 'Create' },
    { id: 'edit', name: 'Edit' },
    { id: 'delete', name: 'Delete' },
    { id: 'approve', name: 'Approve' },
    { id: 'reject', name: 'Reject' },
    { id: 'assign', name: 'Assign' },
    { id: 'export', name: 'Export' },
    { id: 'print', name: 'Print' },
    { id: 'configure', name: 'Configure' }
  ];

  const categories = ['All', ...Array.from(new Set(ALL_SYSTEM_MODULES.map(m => m.category)))];

  const filteredModules = ALL_SYSTEM_MODULES.filter(m => {
    if (selectedModuleCategory !== 'All' && m.category !== selectedModuleCategory) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Role Permission Comparison Matrix</h3>
              <p className="text-xs text-slate-400">
                Side-by-side comparison of baseline permissions and scope across all 5 system roles.
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

        {/* Filters Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Action Filter:</span>
            <div className="flex flex-wrap gap-1">
              {actions.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAction(a.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    selectedAction === a.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Category:</span>
            <select
              value={selectedModuleCategory}
              onChange={e => setSelectedModuleCategory(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium text-slate-700"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 min-w-[200px]">Module / Capability</th>
                  {roles.map(r => (
                    <th key={r} className="px-4 py-3 text-center min-w-[140px]">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-xs inline-block ${
                        r === 'Admin' ? 'bg-rose-100 text-rose-800' :
                        r === 'Manager' ? 'bg-indigo-100 text-indigo-800' :
                        r === 'Superuser' ? 'bg-purple-100 text-purple-800' :
                        r === 'Supervisor' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-200 text-slate-800'
                      }`}>
                        {r}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredModules.map(mod => (
                  <tr key={mod.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{mod.name}</div>
                      <div className="text-[10px] text-slate-400">{mod.category}</div>
                    </td>

                    {roles.map(r => {
                      const permsObj = ROLE_DEFAULT_PERMISSIONS[r]?.[mod.id] || { permissions: [], scope: 'Own Data' };
                      const hasAction = permsObj.permissions.includes(selectedAction);

                      return (
                        <td key={r} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {hasAction ? (
                              <div className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Allowed</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-slate-400 text-xs">
                                <XCircle className="w-4 h-4 text-slate-300" />
                                <span>Denied</span>
                              </div>
                            )}
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              Scope: {permsObj.scope}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Comparing action: <strong className="text-slate-800 uppercase">{selectedAction}</strong> across standard role baselines.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
