import React, { useState, useEffect, useMemo } from 'react';
import { UserSecurityScope, canUserPerformAction } from '../lib/security';
import { Employee } from './kpi/types';
import { 
  GembaWalkItem, 
  getLocalGembaWalkItems, 
  loadGembaWalkDataOptimized,
  saveGembaWalkItemOptimized,
  deleteGembaWalkItemOptimized
} from '../lib/gembaWalkEngine';
import GembaWalkTab from './fiveS/GembaWalkTab';
import { 
  Eye, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Camera, 
  FileText,
  Activity,
  Zap
} from 'lucide-react';
import { resolvePaletteForModule } from '../lib/colorPalettes';

interface GembaWalksProps {
  spreadsheetId: string;
  user: any;
  userSecurityScope: UserSecurityScope | null | undefined;
}

export default function GembaWalks({ spreadsheetId, user, userSecurityScope }: GembaWalksProps) {
  // L1/L2 Instant Synchronous Initialization (0ms UI latency)
  const [items, setItems] = useState<GembaWalkItem[]>(() => getLocalGembaWalkItems());
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('erp_employees_cache');
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Palette styling
  const palette = resolvePaletteForModule('gemba-walks');

  // Permission Checks
  const canEdit = useMemo(() => {
    if (!userSecurityScope) return true;
    if (userSecurityScope.isAdmin || userSecurityScope.isSuperuser || userSecurityScope.isManager || userSecurityScope.isSupervisor) {
      return true;
    }
    if (user?.email?.toLowerCase() === 'noor.alam1750@gmail.com' || user?.email?.toLowerCase() === 'smltrimsbd@gmail.com') {
      return true;
    }
    return (
      canUserPerformAction(userSecurityScope, 'gemba', 'create') ||
      canUserPerformAction(userSecurityScope, 'gemba', 'edit') ||
      canUserPerformAction(userSecurityScope, 'fives', 'create')
    );
  }, [userSecurityScope, user]);

  // Load Data with SWR, Batching, In-Flight Deduplication and Jitter for 200 Concurrent Users
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setIsLoading(true);
    try {
      if (spreadsheetId) {
        const res = await loadGembaWalkDataOptimized(spreadsheetId, { forceRefresh });
        if (res.items && res.items.length > 0) {
          setItems(res.items);
        }
        if (res.employees && res.employees.length > 0) {
          setEmployees(res.employees);
        }
        setIsFromCache(res.fromCache);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to load Gemba Walk module data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial SWR fetch in the background while UI is already responsive
    loadData(false);

    // Listen for updates from other tabs, components, or BroadcastChannel
    const handleSync = (e: any) => {
      if (Array.isArray(e.detail)) {
        setItems(e.detail);
        setLastSyncTime(new Date());
      }
    };
    window.addEventListener('erp-gemba-walk-updated', handleSync);
    return () => window.removeEventListener('erp-gemba-walk-updated', handleSync);
  }, [spreadsheetId]);

  // Save Gemba Walk Item (Optimistic 0ms UI mutation + queued remote persistence)
  const handleSaveItem = async (item: GembaWalkItem) => {
    setIsSyncing(true);
    try {
      const updated = await saveGembaWalkItemOptimized(spreadsheetId, item, {
        id: userSecurityScope?.employeeId || 'ADMIN-001',
        name: userSecurityScope?.employeeName || user?.displayName || 'Gemba Lead',
        email: user?.email
      });
      setItems(updated);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Optimistic save error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete Gemba Walk Item (Optimistic 0ms UI mutation + queued remote deletion)
  const handleDeleteItem = async (id: string) => {
    setIsSyncing(true);
    try {
      const updated = await deleteGembaWalkItemOptimized(spreadsheetId, id);
      setItems(updated);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Optimistic delete error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const open = items.filter(i => i.status === 'Open').length;
    const inProgress = items.filter(i => i.status === 'In Progress').length;
    const resolved = items.filter(i => i.status === 'Resolved').length;
    const closed = items.filter(i => i.status === 'Verified & Closed').length;
    const critical = items.filter(i => (i.status === 'Open' || i.status === 'In Progress') && i.severity === 'Critical').length;
    return { total, open, inProgress, resolved, closed, critical };
  }, [items]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/75 overflow-y-auto">
      {/* Header Banner - Enterprise Clean Architecture */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-4 sticky top-0 z-20 shadow-2xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Gemba Walks
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                  Shop Floor Navigator
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Multi-tier SWR caching, request deduplication, and batch fetching enabled for high concurrency">
                  <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                  Fast Cache Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                13-Point Smart Audits • 5-Why Root Cause • Before/After Photo Evidence & Corrective Actions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Quick Metrics Bar */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-500 font-medium">Total:</span>
                <span className="font-bold text-slate-900">{metrics.total}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-500 font-medium">Active:</span>
                <span className="font-bold text-amber-700">{metrics.open + metrics.inProgress}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500 font-medium">Closed:</span>
                <span className="font-bold text-emerald-700">{metrics.closed + metrics.resolved}</span>
              </div>
              {metrics.critical > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5 bg-rose-100/70 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>{metrics.critical} Critical</span>
                  </div>
                </>
              )}
            </div>

            {/* Syncing/Loading Indicator */}
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <RefreshCw className="w-3 h-3 animate-spin text-rose-600" />
                <span>Syncing...</span>
              </div>
            )}

            {/* Force Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={isLoading || isSyncing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Force Refresh Gemba Walk Records from Google Drive/Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rose-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Module Content */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 flex-1">
        <GembaWalkTab
          items={items}
          employees={employees}
          spreadsheetId={spreadsheetId}
          onSaveItem={handleSaveItem}
          onDeleteItem={handleDeleteItem}
          currentUserEmail={user?.email}
          currentUserName={userSecurityScope?.employeeName || user?.displayName}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
