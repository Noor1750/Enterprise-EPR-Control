import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, X, Zap, Database, Server, RefreshCw, 
  CheckCircle2, HardDrive, ShieldCheck, Clock
} from 'lucide-react';
import { getCacheTelemetry, invalidateDataCache, prefetchEssentialData } from '../../lib/dataCache';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
}

export default function PerformanceMonitorModal({ isOpen, onClose, spreadsheetId }: Props) {
  const [metrics, setMetrics] = useState(getCacheTelemetry());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flushedNotice, setFlushedNotice] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setMetrics(getCacheTelemetry());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFlushCache = () => {
    invalidateDataCache();
    setMetrics(getCacheTelemetry());
    setFlushedNotice(true);
    setTimeout(() => setFlushedNotice(false), 2000);
  };

  const handleWarmCache = async () => {
    setIsRefreshing(true);
    await prefetchEssentialData(spreadsheetId);
    setMetrics(getCacheTelemetry());
    setIsRefreshing(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  Performance & Cache Telemetry
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Google Drive & Sheets Data Optimization Engine</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 my-5">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Cache Hit Rate</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {metrics.hitRatePercent}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Read requests served from RAM/Cache</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Bandwidth Saved</span>
                <Database className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {metrics.bytesSavedEstimateKB > 1024 
                  ? `${(metrics.bytesSavedEstimateKB / 1024).toFixed(1)} MB` 
                  : `${metrics.bytesSavedEstimateKB} KB`}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Eliminated redundant Google Sheets reads</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Average Latency</span>
                <Clock className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400 font-mono">
                {metrics.averageLatencyMs} ms
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Sub-millisecond instant memory hits</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Operations</span>
                <Server className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="text-2xl font-black text-slate-200 font-mono">
                {metrics.totalRequests}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.cacheHits} Hits • {metrics.cacheMisses} Misses
              </p>
            </div>
          </div>

          {/* Detailed Info */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300 space-y-2 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Background SWR Refreshes:</span>
              <span className="font-mono font-bold text-slate-200">{metrics.backgroundRefreshes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> High-Concurrency Google Sheets DB
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Engine Uptime:</span>
              <span className="font-mono text-slate-200">{metrics.uptimeSeconds}s</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleWarmCache}
              disabled={isRefreshing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Prefetching...' : 'Prefetch & Warm Cache'}</span>
            </button>

            <button
              onClick={handleFlushCache}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <HardDrive className="w-3.5 h-3.5 text-rose-400" />
              <span>Flush Cache</span>
            </button>
          </div>

          {flushedNotice && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Local and in-memory caches flushed successfully</span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
