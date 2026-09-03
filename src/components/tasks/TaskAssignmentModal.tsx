import React, { useState } from 'react';
import { AssignmentNotification, markAssignmentNotificationAcknowledged } from '../../lib/taskAssignmentNotifier';
import { 
  CheckSquare, 
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
  Volume2
} from 'lucide-react';
import { playTaskAssignedSound } from '../../lib/taskSoundEngine';
import { getEmployeeReminderConfig } from '../../lib/taskReminderEngine';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  notification: AssignmentNotification | null;
  onClose: () => void;
  onNavigateToTasks?: () => void;
  currentEmployeeId: string;
  currentEmployeeName: string;
}

export default function TaskAssignmentModal({
  isOpen,
  notification,
  onClose,
  onNavigateToTasks,
  currentEmployeeId,
  currentEmployeeName
}: TaskAssignmentModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackTime, setAckTime] = useState<string | null>(null);

  if (!isOpen || !notification) return null;

  const handleAcknowledge = () => {
    markAssignmentNotificationAcknowledged(currentEmployeeId, currentEmployeeName, notification.id);
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAcknowledged(true);
    setAckTime(nowStr);
  };

  const handleTestSound = () => {
    const cfg = getEmployeeReminderConfig(currentEmployeeId, currentEmployeeName);
    playTaskAssignedSound(cfg.soundKey, cfg.soundVolume);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'medium':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Dark Indigo Gradient */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-sky-300 shadow-inner">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                    Official Task Assignment
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-400/20 text-sky-200 border border-sky-400/30">
                    ID: {notification.taskId}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">
                  New Task Assigned to You
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTestSound}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Play assignment alert sound"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2">
            Assigned by <strong className="text-white">{notification.assignedByName}</strong> on{' '}
            {new Date(notification.assignedAt).toLocaleDateString()} at{' '}
            {new Date(notification.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Title & Priority */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                {notification.taskTitle}
              </h4>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black border uppercase tracking-wider shrink-0 ${getPriorityColor(notification.priority)}`}>
                {notification.priority}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Category: <strong className="text-slate-800">{notification.category}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Due Date: <strong className="text-slate-800">{notification.dueDate}</strong></span>
              </div>
              {notification.dueTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Time: <strong className="text-slate-800">{notification.dueTime}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Instructions / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Task Instructions & Description
            </label>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-sm text-slate-700 leading-relaxed min-h-[90px]">
              {notification.description ? (
                <p className="whitespace-pre-line">{notification.description}</p>
              ) : (
                <p className="text-slate-400 italic">No additional instructions provided for this task.</p>
              )}
            </div>
          </div>

          {/* Assignee & Assignment Metadata Card */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium block">Assigned To:</span>
              <strong className="text-slate-800 text-sm font-bold block mt-0.5">{notification.assigneeName}</strong>
              <span className="text-slate-500 text-[11px]">{notification.assigneeId}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium block">Assigned By:</span>
              <strong className="text-slate-800 text-sm font-bold block mt-0.5">{notification.assignedByName}</strong>
              <span className="text-slate-500 text-[11px]">Operations & Management</span>
            </div>
          </div>

          {/* Acknowledgement Status Indicator */}
          {(acknowledged || notification.acknowledged) && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-extrabold block text-emerald-800">Task Formally Acknowledged</span>
                <span className="text-emerald-700">
                  Recorded in audit trail at {ackTime || (notification.acknowledgedAt ? new Date(notification.acknowledgedAt).toLocaleTimeString() : 'now')}.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {!(acknowledged || notification.acknowledged) ? (
            <button
              onClick={handleAcknowledge}
              className="w-full sm:w-auto flex-1 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>✓ I Acknowledge & Accept This Task</span>
            </button>
          ) : (
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Accepted & Logged</span>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onNavigateToTasks && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToTasks();
                }}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Go to Daily Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
