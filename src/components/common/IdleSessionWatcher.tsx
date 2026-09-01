import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react';

interface IdleSessionWatcherProps {
  onLogout: () => void;
  idleTimeoutMinutes?: number; // default 15 mins
  warningSeconds?: number; // default 60 secs
  userEmail?: string;
}

export default function IdleSessionWatcher({
  onLogout,
  idleTimeoutMinutes = 15,
  warningSeconds = 60
}: IdleSessionWatcherProps) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds);

  const idleTimeoutMs = idleTimeoutMinutes * 60 * 1000;
  const warningMs = warningSeconds * 1000;

  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const performLogout = useCallback(() => {
    setIsWarningOpen(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    onLogout();
  }, [onLogout]);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isWarningOpen) {
      setIsWarningOpen(false);
      setSecondsRemaining(warningSeconds);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [isWarningOpen, warningSeconds]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      // If modal is not open, refresh timestamp
      if (!isWarningOpen) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check interval every 2 seconds
    const interval = setInterval(() => {
      if (isWarningOpen) return;

      const elapsed = Date.now() - lastActivityRef.current;
      const triggerThreshold = idleTimeoutMs - warningMs;

      if (elapsed >= triggerThreshold) {
        setIsWarningOpen(true);
        const remaining = Math.max(0, Math.ceil((idleTimeoutMs - elapsed) / 1000));
        setSecondsRemaining(remaining > 0 ? remaining : warningSeconds);
      }
    }, 2000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [idleTimeoutMs, warningMs, isWarningOpen, warningSeconds]);

  // Countdown timer when warning modal is open
  useEffect(() => {
    if (isWarningOpen) {
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            performLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isWarningOpen, performLogout]);

  return (
    <AnimatePresence>
      {isWarningOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm select-none animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl shadow-black/90 text-white relative overflow-hidden"
          >
            {/* Background warning ambient glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Session Inactivity Notice
                </h3>
                <p className="text-xs text-amber-300 font-medium flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  Auto-logout due to inactivity
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              You have been inactive for a while. For enterprise security and data privacy, your session will automatically terminate in:
            </p>

            {/* Countdown Box */}
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-inner">
              <span className="text-xs font-semibold text-slate-400">Remaining Active Time</span>
              <div className="flex items-baseline gap-1 font-mono font-black text-2xl text-amber-400">
                <span>{secondsRemaining}</span>
                <span className="text-xs font-bold text-amber-500/80">sec</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetIdleTimer}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Stay Logged In</span>
              </button>

              <button
                type="button"
                onClick={performLogout}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-500/50 text-rose-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out Now</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
