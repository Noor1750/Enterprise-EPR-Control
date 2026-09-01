import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mountain, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { subscribeLoadingState, LoadingState } from '../../lib/loadingEngine';
import { getErpName, getErpIcon, getErpIconAnimation } from '../../lib/appSettings';

export default function GlobalLoadingScreen() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    title: 'Loading Workspace...',
    subtitle: 'Please wait...',
    isSimulated: true
  });

  useEffect(() => {
    const unsubscribe = subscribeLoadingState(setLoadingState);
    return () => unsubscribe();
  }, []);

  if (!loadingState.isLoading) return null;

  const erpName = getErpName();
  const erpIcon = getErpIcon();
  const erpIconAnim = getErpIconAnimation();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md select-none"
        style={{ pointerEvents: 'all' }}
        role="progressbar"
        aria-valuenow={loadingState.progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div 
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative max-w-md w-[92%] sm:w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 text-white overflow-hidden"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center p-1">
                  {erpIcon ? (
                    <img 
                      src={erpIcon} 
                      alt="ERP Logo" 
                      className={`w-9 h-9 object-contain ${
                        erpIconAnim === 'pulse' ? 'animate-pulse' :
                        erpIconAnim === 'spin' ? 'animate-spin' :
                        erpIconAnim === 'bounce' ? 'animate-bounce' :
                        'animate-pulse drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]'
                      }`}
                    />
                  ) : (
                    <Mountain className="w-5 h-5 text-indigo-400 animate-pulse" />
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black tracking-widest text-slate-300 uppercase">{erpName}</h4>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Enterprise Engine</span>
                </div>
              </div>
            </div>

            {/* Percentage Display Badge */}
            <div className="flex items-baseline gap-0.5 px-3.5 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono font-black text-lg shadow-inner">
              <span>{Math.min(100, Math.max(0, loadingState.progress))}</span>
              <span className="text-xs text-indigo-400 font-bold">%</span>
            </div>
          </div>

          {/* Main Content & Title */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              <h3 className="text-base font-bold text-slate-100 tracking-tight line-clamp-1">
                {loadingState.title || 'Loading...'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {loadingState.subtitle || 'Please wait while operational data and layouts are rendered.'}
            </p>
            {loadingState.stepName && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-800/50 mt-1">
                <Layers className="w-3 h-3" />
                <span>{loadingState.stepName}</span>
              </div>
            )}
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-2">
            <div className="h-2.5 w-full bg-slate-950/90 rounded-full overflow-hidden p-0.5 border border-slate-800/80 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 shadow-sm relative"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, Math.max(2, loadingState.progress))}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              >
                {/* Glowing leading edge */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/70 rounded-full blur-[1px]" />
              </motion.div>
            </div>

            {/* Bottom Status Ticker */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
              <span>Synchronizing system state</span>
              <span className="font-mono text-slate-400">Loading… {loadingState.progress}%</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
