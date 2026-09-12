import React, { useState, useEffect } from 'react';
import { 
  getAssistantAuditLogs, 
  clearAssistantAuditLogs 
} from '../../lib/assistant/assistantSecurityFilter';
import { 
  AssistantAuditEntry, 
  ASSISTANT_PROFILES 
} from '../../types/assistant';
import { 
  Shield, 
  Trash2, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Filter
} from 'lucide-react';

export const AssistantAuditView: React.FC = () => {
  const [logs, setLogs] = useState<AssistantAuditEntry[]>([]);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Success' | 'Denied'>('ALL');

  const refreshLogs = () => {
    setLogs(getAssistantAuditLogs());
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the assistant activity audit logs?')) {
      clearAssistantAuditLogs();
      refreshLogs();
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sml_assistant_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter(log => {
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const q = filterText.toLowerCase();
    const matchesQuery = !q || 
      log.query.toLowerCase().includes(q) ||
      log.userEmail.toLowerCase().includes(q) ||
      (log.actionTaken && log.actionTaken.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  return (
    <div id="assistant-audit-panel" className="p-4 space-y-4 max-w-4xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Virtual Assistant Audit Trail</h2>
            <p className="text-xs text-slate-300">
              Real-time enterprise activity logging, security enforcement, and RBAC governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search query, employee, or action..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'Success', 'Denied'] as const).map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {status === 'ALL' ? 'All Status' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No audit records found matching the filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
            {filteredLogs.map(log => {
              const profile = ASSISTANT_PROFILES.find(p => p.id === log.assistantProfileId) || ASSISTANT_PROFILES[0];

              return (
                <div key={log.id} className="p-3.5 hover:bg-slate-850/50 transition-colors space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      {log.status === 'Success' ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Denied
                        </span>
                      )}

                      <span className="text-slate-300 font-medium">
                        {log.userEmail} ({log.role})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className="text-slate-400">{profile.name}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-mono bg-slate-950/70 p-2 rounded border border-slate-800/80">
                    "{log.query}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Action: <strong className="text-slate-300">{log.actionTaken}</strong></span>
                    {log.topic && <span className="capitalize">Topic: {log.topic}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
