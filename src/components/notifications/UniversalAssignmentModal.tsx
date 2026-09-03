import React, { useState } from 'react';
import { 
  UniversalAssignmentNotification, 
  markUniversalNotificationAcknowledged 
} from '../../lib/universalAssignmentNotifier';
import { getModuleTheme } from '../../lib/moduleVisualThemes';
import { playUniversalAssignmentSound } from '../../lib/taskSoundEngine';
import { getEmployeeReminderConfig } from '../../lib/taskReminderEngine';
import { 
  X, 
  Check, 
  Calendar, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Volume2,
  ExternalLink,
  Briefcase,
  AlertTriangle,
  Target
} from 'lucide-react';

interface UniversalAssignmentModalProps {
  isOpen: boolean;
  notification: UniversalAssignmentNotification | null;
  onClose: () => void;
  onNavigateToModule?: (moduleId: string) => void;
  currentEmployeeId: string;
  currentEmployeeName: string;
}

export default function UniversalAssignmentModal({
  isOpen,
  notification,
  onClose,
  onNavigateToModule,
  currentEmployeeId,
  currentEmployeeName
}: UniversalAssignmentModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackTime, setAckTime] = useState<string | null>(null);

  if (!isOpen || !notification) return null;

  const theme = getModuleTheme(notification.module);
  const IconComponent = theme.icon;

  const handleAcknowledge = () => {
    markUniversalNotificationAcknowledged(currentEmployeeId, currentEmployeeName, notification.id);
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAcknowledged(true);
    setAckTime(nowStr);
  };

  const handleTestSound = () => {
    const cfg = getEmployeeReminderConfig(currentEmployeeId, currentEmployeeName);
    playUniversalAssignmentSound(notification.module, cfg.soundKey, cfg.soundVolume);
  };

  const handleNavigate = () => {
    if (onNavigateToModule && theme.navigatorId) {
      onNavigateToModule(theme.navigatorId);
      onClose();
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300';
      case 'medium':
        return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Module Signature Header */}
        <div className={`bg-gradient-to-r ${theme.modalGradient} px-6 py-5 text-white relative`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                    Official {theme.name} Notification
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/15 text-white border border-white/20">
                    Ref: {notification.recordId}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight mt-0.5">
                  Assigned to Your Profile
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTestSound}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Play module audio alert"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-160px)]">
          {/* Main Title & Subtitle Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityStyle(notification.priority)}`}>
                {notification.priority} Priority
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
                {theme.name}
              </span>
              {notification.status && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  Status: {notification.status}
                </span>
              )}
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
              {notification.title}
            </h2>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
              {notification.subtitle}
            </p>
          </div>

          {/* Description & Full Details */}
          {notification.details && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Operational Notes & Instructions
              </label>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {notification.details}
              </div>
            </div>
          )}

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Assigned By</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {notification.assignedByName || 'Operations Lead'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Date / Schedule</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {notification.date || 'Immediate Active'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Navigator Module</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {theme.name}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Logged Timestamp</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(notification.assignedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Module-Specific Extra Metadata */}
          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Additional Module Parameters
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(notification.metadata).map(([k, v]) => (
                  <div key={k} className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-indigo-100/60 dark:border-indigo-900/40">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">{k}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledgment Stamping Feedback */}
          {(acknowledged || notification.acknowledged) && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-bold">Assignment Formally Acknowledged.</span>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  Confirmation recorded at {ackTime || (notification.acknowledgedAt ? new Date(notification.acknowledgedAt).toLocaleTimeString() : 'now')}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!acknowledged && !notification.acknowledged && (
              <button
                onClick={handleAcknowledge}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                I Understand
              </button>
            )}

            <button
              onClick={handleNavigate}
              className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${theme.toastGradient} hover:brightness-110 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98`}
            >
              <span>Open in {theme.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
