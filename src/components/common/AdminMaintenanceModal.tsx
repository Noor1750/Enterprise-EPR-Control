import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Clock, CheckCircle2, AlertTriangle, RefreshCw, 
  X, Calendar, Database, Shield, Zap, Activity
} from 'lucide-react';
import { 
  getMaintenanceWindowStatus, getMaintenanceLogs, runSafeScheduledMaintenance, 
  setEmergencyMaintenance, MaintenanceLogEntry 
} from '../../lib/maintenanceEngine';

interface AdminMaintenanceModalProps {
  spreadsheetId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminMaintenanceModal({ spreadsheetId, isOpen, onClose }: AdminMaintenanceModalProps) {
  const [status, setStatus] = useState(getMaintenanceWindowStatus());
  const [logs, setLogs] = useState<MaintenanceLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setStatus(getMaintenanceWindowStatus());
    const historicalLogs = await getMaintenanceLogs(spreadsheetId);
    setLogs(historicalLogs);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, spreadsheetId]);

  if (!isOpen) return null;

  const handleRunManualCheck = async () => {
    setIsRunning(true);
    setFeedback('Running non-destructive safety check and cache optimization...');
    try {
      const result = await runSafeScheduledMaintenance(spreadsheetId);
      await loadData();
      setFeedback(`Maintenance run completed successfully. (Log ID: ${result.logId})`);
    } catch (e: any) {
      setFeedback(`Encountered notice: ${e?.message || 'Check skipped'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleEmergency = (active: boolean) => {
    setEmergencyMaintenance(active);
    setStatus(getMaintenanceWindowStatus());
    setFeedback(active ? 'Emergency Maintenance Mode ACTIVATED.' : 'Emergency Maintenance Mode DEACTIVATED.');
  };

  const latestLog = logs[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">Admin Maintenance Operations</h3>
              <p className="text-xs text-slate-400">Weekly routine care & system health monitor</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-xs">
          {feedback && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-900 font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Status Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Current Status</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs ${
                status.isInMaintenance 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {status.isInMaintenance ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {status.isInMaintenance ? 'Maintenance Active' : 'Normal Operation'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Dhaka Time (BST)</span>
              <span className="font-mono font-bold text-sm text-slate-900 block">
                {status.currentDhakaTime}
              </span>
              <span className="text-[10px] text-slate-400">UTC+6 Bangladesh</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Schedule Window</span>
              <span className="font-bold text-xs text-slate-800 block">
                Every Monday
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">3:00 PM – 3:30 PM BST</span>
            </div>
          </div>

          {/* Latest Execution Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" /> Last Maintenance Execution
              </h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {latestLog ? latestLog.status : 'Ready for Monday'}
              </span>
            </div>

            {latestLog ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Date:</span>
                  <span className="font-semibold text-slate-800">{latestLog.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Time Window:</span>
                  <span className="font-semibold text-slate-800">{latestLog.startTime} - {latestLog.endTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Data Integrity:</span>
                  <span className="font-bold text-emerald-600">{latestLog.dataIntegrity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Drive Health:</span>
                  <span className="font-bold text-emerald-600">{latestLog.driveConnectivity}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-1">
                No previous maintenance runs recorded. Automated routine will execute on upcoming Monday.
              </p>
            )}

            {latestLog?.tasksCompleted && latestLog.tasksCompleted.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Completed Tasks
                </span>
                <ul className="space-y-1">
                  {latestLog.tasksCompleted.map((t, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h5 className="font-bold text-slate-900 text-xs">Safe Immediate Diagnostic Run</h5>
              <p className="text-[11px] text-slate-500">
                Executes non-destructive cache optimization and data integrity checks.
              </p>
            </div>
            <button
              onClick={handleRunManualCheck}
              disabled={isRunning}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </button>
          </div>

          {/* Emergency Override Control */}
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
            <div>
              <h5 className="font-bold text-slate-900 text-xs">Emergency Maintenance Mode</h5>
              <p className="text-[11px] text-slate-500">
                Manually hold application in maintenance mode outside scheduled Monday window.
              </p>
            </div>
            {status.isEmergency ? (
              <button
                onClick={() => handleToggleEmergency(false)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Deactivate Emergency
              </button>
            ) : (
              <button
                onClick={() => handleToggleEmergency(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Activate Emergency
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
