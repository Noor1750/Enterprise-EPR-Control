import React, { useState, useEffect } from 'react';
import { 
  AssignmentNotification, 
  markAssignmentNotificationAcknowledged, 
  markAssignmentNotificationRead,
  setupAssignmentChannelListener 
} from '../../lib/taskAssignmentNotifier';
import { playTaskAssignedSound } from '../../lib/taskSoundEngine';
import { getEmployeeReminderConfig } from '../../lib/taskReminderEngine';
import { 
  CheckSquare, 
  Bell, 
  X, 
  Check, 
  ExternalLink, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  Volume2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskAssignmentToastProps {
  currentEmployeeId: string;
  currentEmployeeName: string;
  onOpenDetails: (notification: AssignmentNotification) => void;
}

export default function TaskAssignmentToast({
  currentEmployeeId,
  currentEmployeeName,
  onOpenDetails
}: TaskAssignmentToastProps) {
  const [activeNotification, setActiveNotification] = useState<AssignmentNotification | null>(null);
  const [queue, setQueue] = useState<AssignmentNotification[]>([]);

  useEffect(() => {
    const handleTaskAssigned = (e: any) => {
      const notif: AssignmentNotification = e.detail;
      if (!notif) return;

      const cleanMyId = (currentEmployeeId || '').toUpperCase().trim();
      const cleanMyName = (currentEmployeeName || '').toLowerCase().trim();
      const cleanNotifAssigneeId = (notif.assigneeId || '').toUpperCase().trim();
      const cleanNotifAssigneeName = (notif.assigneeName || '').toLowerCase().trim();

      // Ensure this notification belongs to the current logged-in employee
      const matchesUser = 
        (cleanMyId && cleanNotifAssigneeId && cleanMyId === cleanNotifAssigneeId) ||
        (cleanMyName && cleanNotifAssigneeName && cleanNotifAssigneeName.includes(cleanMyName));

      if (matchesUser) {
        // Play notification sound
        const cfg = getEmployeeReminderConfig(currentEmployeeId, currentEmployeeName);
        playTaskAssignedSound(cfg.soundKey, cfg.soundVolume);

        setActiveNotification(prev => {
          if (!prev) return notif;
          setQueue(q => [...q, notif]);
          return prev;
        });
      }
    };

    window.addEventListener('erp-task-assigned', handleTaskAssigned);

    // Multi-tab channel listener
    const cleanupChannel = setupAssignmentChannelListener((notif) => {
      handleTaskAssigned({ detail: notif });
    });

    return () => {
      window.removeEventListener('erp-task-assigned', handleTaskAssigned);
      cleanupChannel();
    };
  }, [currentEmployeeId, currentEmployeeName]);

  const handleDismiss = () => {
    if (activeNotification) {
      markAssignmentNotificationRead(currentEmployeeId, currentEmployeeName, activeNotification.id);
    }
    advanceQueue();
  };

  const handleAcknowledge = () => {
    if (activeNotification) {
      markAssignmentNotificationAcknowledged(currentEmployeeId, currentEmployeeName, activeNotification.id);
    }
    advanceQueue();
  };

  const handleView = () => {
    if (activeNotification) {
      markAssignmentNotificationRead(currentEmployeeId, currentEmployeeName, activeNotification.id);
      onOpenDetails(activeNotification);
    }
    advanceQueue();
  };

  const advanceQueue = () => {
    setActiveNotification(null);
    if (queue.length > 0) {
      setTimeout(() => {
        setQueue(prev => {
          const next = prev[0];
          setActiveNotification(next || null);
          return prev.slice(1);
        });
      }, 300);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <AnimatePresence>
      {activeNotification && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed top-5 right-5 z-[9999] max-w-md w-full shadow-2xl rounded-2xl overflow-hidden border border-indigo-500/40 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white"
          role="alert"
        >
          {/* Glowing Top Edge */}
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-indigo-500 to-rose-400 animate-pulse" />

          <div className="p-4 sm:p-5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-sky-300 shadow-inner">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-400">
                      New Task Assigned
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>Assigned to You</span>
                    <span className="text-xs font-normal text-slate-400">• By {activeNotification.assignedByName}</span>
                  </h4>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Info Card */}
            <div className="mt-3.5 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h5 className="font-extrabold text-sm text-white line-clamp-2">
                  {activeNotification.taskTitle}
                </h5>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${getPriorityBadge(activeNotification.priority)}`}>
                  {activeNotification.priority}
                </span>
              </div>

              {activeNotification.description && (
                <p className="text-xs text-slate-300 line-clamp-2 italic">
                  "{activeNotification.description}"
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-white/10">
                <span className="font-medium text-slate-400">
                  Category: <strong className="text-indigo-200">{activeNotification.category}</strong>
                </span>
                <span className="flex items-center gap-1 text-sky-200 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-sky-300" />
                  Due: {activeNotification.dueDate} {activeNotification.dueTime ? `@ ${activeNotification.dueTime}` : ''}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center justify-between gap-2 pt-1">
              <button
                onClick={handleAcknowledge}
                className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>I Understand</span>
              </button>

              <button
                onClick={handleView}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
