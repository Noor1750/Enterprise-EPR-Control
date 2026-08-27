import { useState } from 'react';
import { 
  X, History, Search, Download, Trash2, 
  CheckCircle2, Clock
} from 'lucide-react';
import { getSecurityAuditLogs, SecurityAuditLogEntry, formatEmailToName } from '../../lib/security';

interface SecurityAuditLogModalProps {
  onClose: () => void;
}

export default function SecurityAuditLogModal({ onClose }: SecurityAuditLogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<SecurityAuditLogEntry[]>(getSecurityAuditLogs());

  const handleClearLogs = () => {
    if (false) {
      return;
    }
    localStorage.removeItem('erp_security_audit_log');
    setLogs([]);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Date', 'Time', 'Admin', 'Target User', 'Role', 'Module', 'Action Type', 'Previous Permission', 'New Permission', 'Source', 'Reason'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.date}"`,
      `"${l.time}"`,
      `"${formatEmailToName(l.adminEmail)}"`,
      `"${formatEmailToName(l.targetUser)}"`,
      `"${l.role}"`,
      `"${l.module}"`,
      `"${l.actionType}"`,
      `"${l.previousPermission}"`,
      `"${l.newPermission}"`,
      `"${l.source}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Security_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.adminEmail.toLowerCase().includes(q) ||
      formatEmailToName(l.adminEmail).toLowerCase().includes(q) ||
      l.targetUser.toLowerCase().includes(q) ||
      formatEmailToName(l.targetUser).toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q) ||
      l.actionType.toLowerCase().includes(q) ||
      (l.reason && l.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Security & Permission Audit Logs</h3>
              <p className="text-xs text-slate-400">
                Tamper-evident record of all role assignments, permission overrides, and security conflict auto-fixes.
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

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg w-64 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Target User</th>
                  <th className="px-4 py-3">Module / Action</th>
                  <th className="px-4 py-3">Change (Old → New)</th>
                  <th className="px-4 py-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{log.date} {log.time}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {log.adminEmail}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-medium text-slate-900">{log.targetUser}</span>
                      {log.role && <span className="block text-[10px] text-slate-400">Role: {log.role}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{log.module}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{log.actionType}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-slate-400">{log.previousPermission}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-bold text-emerald-700">{log.newPermission}</span>
                      <span className="block text-[10px] text-blue-600 font-medium">via {log.source}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs">
              No security audit logs found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Total records: <strong>{logs.length}</strong> entries recorded.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
