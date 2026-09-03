import React, { useState, useEffect, useRef } from 'react';
import { 
  UniversalAssignmentNotification, 
  markUniversalNotificationAcknowledged, 
  markUniversalNotificationRead,
  setupUniversalChannelListener 
} from '../../lib/universalAssignmentNotifier';
import { playUniversalAssignmentSound } from '../../lib/taskSoundEngine';
import { getEmployeeReminderConfig } from '../../lib/taskReminderEngine';
import { getModuleTheme } from '../../lib/moduleVisualThemes';
import { 
  X, 
  Check, 
  ExternalLink, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  Volume2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UniversalAssignmentToastProps {
  currentEmployeeId: string;
  currentEmployeeName: string;
  onOpenDetails: (notification: UniversalAssignmentNotification) => void;
  onNavigateToModule?: (moduleId: string) => void;
}

export default function UniversalAssignmentToast({
  currentEmployeeId,
  currentEmployeeName,
  onOpenDetails,
  onNavigateToModule
}: UniversalAssignmentToastProps) {
  const [activeNotification, setActiveNotification] = useState<UniversalAssignmentNotification | null>(null);
  const [queue, setQueue] = useState<UniversalAssignmentNotification[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanMyId = (currentEmployeeId || '').toUpperCase().trim();
  const cleanMyName = (currentEmployeeName || '').toLowerCase().trim();

  useEffect(() => {
    const handleAssignment = (e: any) => {
      const notif: UniversalAssignmentNotification = e.detail;
      if (!notif) return;

      const cleanNotifAssigneeId = (notif.assigneeId || '').toUpperCase().trim();
      const cleanNotifAssigneeName = (notif.assigneeName || '').toLowerCase().trim();

      // Ensure this notification belongs to the currently logged in employee
      const matchesUser = 
        (cleanMyId && cleanNotifAssigneeId && cleanMyId === cleanNotifAssigneeId) ||
        (cleanMyName && cleanNotifAssigneeName && cleanNotifAssigneeName.includes(cleanMyName));

      if (matchesUser) {
        // Play notification sound
        const cfg = getEmployeeReminderConfig(currentEmployeeId, currentEmployeeName);
        playUniversalAssignmentSound(notif.module, cfg.soundKey, cfg.soundVolume);

        setActiveNotification(prev => {
          if (!prev) return notif;
          // Avoid duplicate enqueueing
          setQueue(q => {
            if (q.some(item => item.id === notif.id)) return q;
            return [...q, notif];
          });
          return prev;
        });
      }
    };

    window.addEventListener('erp-universal-assigned', handleAssignment);
    window.addEventListener('erp-task-assigned', handleAssignment);

    // Multi-tab channel listener
    const cleanupChannel = setupUniversalChannelListener((notif) => {
      handleAssignment({ detail: notif });
    });

    return () => {
      window.removeEventListener('erp-universal-assigned', handleAssignment);
      window.removeEventListener('erp-task-assigned', handleAssignment);
      cleanupChannel();
    };
  }, [cleanMyId, cleanMyName, currentEmployeeId, currentEmployeeName]);

  // Auto-dismiss logic with pause on hover
  useEffect(() => {
    if (!activeNotification) {
      setProgress(100);
      return;
    }

    if (isPaused) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      return;
    }

    const DURATION = 10000; // 10 seconds per toast
    const INTERVAL_MS = 100;
    const step = (INTERVAL_MS / DURATION) * 100;

    setProgress(100);

    progressIntervalRef.current = setInterval(() => {
      setProgress(p => Math.max(0, p - step));
    }, INTERVAL_MS);

    autoDismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, DURATION);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    };
  }, [activeNotification, isPaused]);

  const advanceQueue = () => {
    setQueue(prevQueue => {
      if (prevQueue.length > 0) {
        const [nextNotif, ...rest] = prevQueue;
        setActiveNotification(nextNotif);
        return rest;
      } else {
        setActiveNotification(null);
        return [];
      }
    });
  };

  const handleDismiss = () => {
    if (activeNotification) {
      markUniversalNotificationRead(currentEmployeeId, currentEmployeeName, activeNotification.id);
    }
    advanceQueue();
  };

  const handleAcknowledge = () => {
    if (activeNotification) {
      markUniversalNotificationAcknowledged(currentEmployeeId, currentEmployeeName, activeNotification.id);
    }
    advanceQueue();
  };

  const handleView = () => {
    if (activeNotification) {
      markUniversalNotificationRead(currentEmployeeId, currentEmployeeName, activeNotification.id);
      onOpenDetails(activeNotification);
    }
    advanceQueue();
  };

  const handleDirectJump = () => {
    if (activeNotification) {
      markUniversalNotificationRead(currentEmployeeId, currentEmployeeName, activeNotification.id);
      const theme = getModuleTheme(activeNotification.module);
      if (onNavigateToModule && theme.navigatorId) {
        onNavigateToModule(theme.navigatorId);
      } else {
        onOpenDetails(activeNotification);
      }
    }
    advanceQueue();
  };

  if (!activeNotification) return null;

  const theme = getModuleTheme(activeNotification.module);
  const IconComponent = theme.icon;

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500 text-white animate-pulse';
      case 'high':
        return 'bg-amber-500 text-white';
      case 'medium':
        return 'bg-sky-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  return (
    <div 
      className="fixed top-5 right-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] sm:w-[420px] pointer-events-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNotification.id}
          initial={{ opacity: 0, y: -25, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.94 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden ring-1 ring-black/10"
        >
          {/* Top Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${theme.toastGradient} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Card Header & Content */}
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              {/* Module Custom Icon Avatar */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.toastGradient} flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-indigo-500/10`}>
                <IconComponent className="w-6 h-6 animate-bounce" />
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {/* Module Badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
                    <IconComponent className="w-3 h-3" />
                    {theme.name}
                  </span>

                  {/* Priority Pill */}
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getPriorityStyle(activeNotification.priority)}`}>
                    {activeNotification.priority}
                  </span>

                  {/* Multi-queue indicator */}
                  {queue.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      +{queue.length} more
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {activeNotification.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                  {activeNotification.subtitle}
                </p>

                {activeNotification.details && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
                    "{activeNotification.details}"
                  </p>
                )}

                {/* Sub-meta footer */}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-indigo-500" />
                    By {activeNotification.assignedByName || 'Management'}
                  </span>
                  {activeNotification.date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      {activeNotification.date}
                    </span>
                  )}
                </div>
              </div>

              {/* Close / Dismiss Cross */}
              <button
                onClick={handleDismiss}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={handleDirectJump}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${theme.toastGradient} hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Go to {theme.name}
              </button>

              <button
                onClick={handleAcknowledge}
                className="py-2 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                I Understand
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
