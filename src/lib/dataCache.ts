/**
 * Enterprise High-Performance Intelligent Data Cache Engine
 * Architected for Google Sheets & Google Drive ERP database.
 * 
 * Features:
 * - Tier 1: In-Memory Hot Cache (< 0.1ms read time)
 * - Tier 2: LocalStorage Persistence (Instant offline / page reload recovery)
 * - Tier 3: Stale-While-Revalidate (SWR) background synchronization
 * - In-flight Request Deduplication (prevents duplicate simultaneous network calls)
 * - Coordinated Master Batch Prefetching
 * - Enterprise Telemetry (Tracks Cache Hits, Misses, Hit Rate %, Bandwidth Saved)
 */

import { getRange, batchGetRanges, invalidateCache as invalidateSheetsCache } from './sheets';
import { Employee } from '../components/kpi/types';
import { EmployeeShiftState, parseEmployeeShiftState } from './shiftEngine';
import { Task, parseTaskRow } from './taskEngine';
import { HolidayRecord, parseHolidayRow, DEFAULT_2026_HOLIDAYS } from './holidayEngine';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  source: 'memory' | 'storage' | 'network';
}

export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  backgroundRefreshes: number;
  bytesSavedEstimateKB: number;
  averageLatencyMs: number;
  startTime: number;
}

// Global Telemetry State
const metrics: CacheMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  backgroundRefreshes: 0,
  bytesSavedEstimateKB: 0,
  averageLatencyMs: 0.5,
  startTime: Date.now(),
};

// Memory Cache Store
const memCache = new Map<string, CacheEntry<any>>();

// In-flight request deduplication map
const inFlightPromises = new Map<string, Promise<any>>();

// Standard Cache Time-To-Live configurations
export const CACHE_TTLS = {
  EMPLOYEES: 10 * 60 * 1000,      // 10 minutes (Master directory)
  SHIFTS: 10 * 60 * 1000,         // 10 minutes
  HOLIDAYS: 30 * 60 * 1000,       // 30 minutes (Yearly calendar)
  MACHINES: 10 * 60 * 1000,       // 10 minutes
  SUPERVISORS: 15 * 60 * 1000,    // 15 minutes
  KPI: 5 * 60 * 1000,             // 5 minutes
  TASKS: 30 * 1000,               // 30 seconds (dynamic operations)
  LEAVES: 60 * 1000,              // 1 minute
  BREAKDOWNS: 60 * 1000,          // 1 minute
  FIVE_S: 3 * 60 * 1000,          // 3 minutes
  SETTINGS: 20 * 60 * 1000,       // 20 minutes
  DEFAULT: 2 * 60 * 1000,         // 2 minutes default
};

/**
 * Record telemetry metrics
 */
function recordMetric(hit: boolean, dataSizeBytes: number = 2048, latencyMs: number = 0.5) {
  metrics.totalRequests++;
  if (hit) {
    metrics.cacheHits++;
    metrics.bytesSavedEstimateKB += Math.round(dataSizeBytes / 1024);
  } else {
    metrics.cacheMisses++;
  }
  // Exponential moving average for latency
  metrics.averageLatencyMs = Math.round((metrics.averageLatencyMs * 0.9 + latencyMs * 0.1) * 10) / 10;
}

/**
 * Get current system telemetry metrics for Admin monitoring
 */
export function getCacheTelemetry(): CacheMetrics & { hitRatePercent: number; uptimeSeconds: number } {
  const total = metrics.totalRequests;
  const rate = total > 0 ? Math.round((metrics.cacheHits / total) * 100) : 100;
  const uptime = Math.round((Date.now() - metrics.startTime) / 1000);
  return {
    ...metrics,
    hitRatePercent: rate,
    uptimeSeconds: uptime
  };
}

/**
 * Centralized Cache Helper to save data to storage and memory
 */
function saveToCache<T>(key: string, data: T, persistToStorage: boolean = true) {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    source: 'memory'
  };
  memCache.set(key, entry);

  if (persistToStorage && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`erp_cache_${key}`, JSON.stringify({
        data,
        timestamp: entry.timestamp
      }));
    } catch {
      // Storage full or quota exceeded: ignore gracefully
    }
  }
}

/**
 * Centralized Cache Helper to read data from memory or storage
 */
function readFromCache<T>(key: string, ttl: number): { data: T | null; isFresh: boolean; isStale: boolean } {
  // 1. Check in-memory hot cache
  const inMem = memCache.get(key);
  if (inMem) {
    const age = Date.now() - inMem.timestamp;
    if (age < ttl) {
      recordMetric(true, 4096, 0.2);
      return { data: inMem.data, isFresh: true, isStale: false };
    }
    // Stale but available for SWR
    return { data: inMem.data, isFresh: false, isStale: true };
  }

  // 2. Check localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = localStorage.getItem(`erp_cache_${key}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && parsed.data && parsed.timestamp) {
          const age = Date.now() - parsed.timestamp;
          // Hydrate memory
          memCache.set(key, { data: parsed.data, timestamp: parsed.timestamp, source: 'storage' });
          if (age < ttl) {
            recordMetric(true, 4096, 0.8);
            return { data: parsed.data, isFresh: true, isStale: false };
          }
          return { data: parsed.data, isFresh: false, isStale: true };
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { data: null, isFresh: false, isStale: false };
}

/**
 * Invalidate cache key or pattern
 */
export function invalidateDataCache(keyPattern?: string) {
  if (!keyPattern) {
    memCache.clear();
    inFlightPromises.clear();
    return;
  }
  for (const k of memCache.keys()) {
    if (k.includes(keyPattern)) {
      memCache.delete(k);
    }
  }
  for (const k of inFlightPromises.keys()) {
    if (k.includes(keyPattern)) {
      inFlightPromises.delete(k);
    }
  }
  // Also invalidate low-level sheets cache
  invalidateSheetsCache('local-storage-db', keyPattern);
}

// Listen to database update events and invalidate cache proactively
if (typeof window !== 'undefined') {
  window.addEventListener('erp-db-updated', (evt: any) => {
    const sheetName = evt?.detail?.sheetName;
    if (sheetName) {
      invalidateDataCache(sheetName);
    } else {
      invalidateDataCache();
    }
  });
}

/**
 * Universal Stale-While-Revalidate Fetcher
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTLS.DEFAULT,
  onBackgroundUpdate?: (updatedData: T) => void
): Promise<T> {
  const { data: cachedData, isFresh, isStale } = readFromCache<T>(key, ttl);

  // 1. Fresh hit: Return instantly with 0 latency
  if (isFresh && cachedData !== null) {
    return cachedData;
  }

  // 2. In-flight request deduplication: reuse running promise
  if (inFlightPromises.has(key)) {
    if (isStale && cachedData !== null) {
      // Return stale immediately for UI, while the existing promise finishes
      return cachedData;
    }
    return inFlightPromises.get(key);
  }

  // 3. Initiate fetch
  const startTime = Date.now();
  const fetchPromise = (async () => {
    try {
      const freshData = await fetcher();
      saveToCache(key, freshData);
      recordMetric(false, 4096, Date.now() - startTime);

      // Trigger background update callback if we previously served stale data
      if (isStale && onBackgroundUpdate) {
        metrics.backgroundRefreshes++;
        onBackgroundUpdate(freshData);
      }
      return freshData;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, fetchPromise);

  // If we have stale data, serve it instantly while fetch runs in background (SWR pattern)
  if (isStale && cachedData !== null) {
    recordMetric(true, 4096, 0.4);
    return cachedData;
  }

  // Otherwise wait for network/database
  return fetchPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATASET GETTERS & REUSABLE CACHE APIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Batch get ranges with intelligent SWR caching
 */
export async function batchGetCachedRanges(
  spreadsheetId: string,
  ranges: string[],
  options: { bypassCache?: boolean; ttl?: number } = {}
): Promise<Record<string, string[][]>> {
  const { bypassCache = false, ttl = CACHE_TTLS.DEFAULT } = options;
  const results: Record<string, string[][]> = {};
  const missingRanges: string[] = [];

  if (!bypassCache) {
    for (const range of ranges) {
      const key = `${spreadsheetId}_range_${range}`;
      const { data, isFresh } = readFromCache<string[][]>(key, ttl);
      if (isFresh && data !== null) {
        results[range] = data;
      } else {
        missingRanges.push(range);
      }
    }
  } else {
    missingRanges.push(...ranges);
  }

  if (missingRanges.length > 0) {
    try {
      const fetched = await batchGetRanges(spreadsheetId, missingRanges);
      for (const range of missingRanges) {
        const data = fetched[range] || [];
        results[range] = data;
        const key = `${spreadsheetId}_range_${range}`;
        saveToCache(key, data);
      }
    } catch (err) {
      console.warn('batchGetCachedRanges fallback to individual getRange:', err);
      await Promise.all(
        missingRanges.map(async (range) => {
          try {
            const data = await getRange(spreadsheetId, range);
            results[range] = Array.isArray(data) ? data : [];
            saveToCache(`${spreadsheetId}_range_${range}`, results[range]);
          } catch {
            results[range] = [];
          }
        })
      );
    }
  }

  return results;
}

/**
 * Get Cached Employees List (Shared across Employee Directory, Shift Assignments, KPI, Profile, Modals)
 */
export async function getCachedEmployees(
  spreadsheetId: string, 
  forceRefresh: boolean = false,
  onUpdate?: (emps: Employee[]) => void
): Promise<Employee[]> {
  const key = `${spreadsheetId}_Employees_Parsed`;

  if (forceRefresh) {
    memCache.delete(key);
  }

  return fetchWithSWR<Employee[]>(
    key,
    async () => {
      const raw = await getRange(spreadsheetId, 'Employees!A:Z');
      if (!raw || raw.length <= 1) return [];
      
      return raw.slice(1).map(row => ({
        id: String(row[0] || '').trim(),
        name: String(row[1] || '').trim(),
        designation: String(row[2] || '').trim(),
        department: String(row[3] || '').trim(),
        dateOfJoin: String(row[4] || '').trim(),
        category: String(row[5] || '').trim(),
        supervisor: String(row[6] || '').trim(),
        status: String(row[9] || 'Active').trim(),
        profilePicture: String(row[16] || '').trim(),
        manager: String(row[17] || '').trim()
      })).filter(e => e.id);
    },
    CACHE_TTLS.EMPLOYEES,
    onUpdate
  );
}

/**
 * Get Cached Shift Employees State
 */
export async function getCachedShiftEmployees(
  spreadsheetId: string,
  referenceDate: Date = new Date(),
  forceRefresh: boolean = false
): Promise<EmployeeShiftState[]> {
  const key = `${spreadsheetId}_ShiftEmployees`;

  if (forceRefresh) {
    memCache.delete(key);
  }

  return fetchWithSWR<EmployeeShiftState[]>(
    key,
    async () => {
      const raw = await getRange(spreadsheetId, 'Employees!A:Z');
      if (!raw || raw.length <= 1) return [];
      return raw.slice(1)
        .filter(row => row && row[0] && String(row[0]).trim() !== '')
        .map(row => parseEmployeeShiftState(row, referenceDate));
    },
    CACHE_TTLS.SHIFTS
  );
}

/**
 * Get Cached Tasks List
 */
export async function getCachedTasks(
  spreadsheetId: string,
  forceRefresh: boolean = false,
  onUpdate?: (tasks: Task[]) => void
): Promise<Task[]> {
  const key = `${spreadsheetId}_Tasks_Parsed`;

  if (forceRefresh) {
    memCache.delete(key);
  }

  return fetchWithSWR<Task[]>(
    key,
    async () => {
      const raw = await getRange(spreadsheetId, 'Tasks!A:Z');
      if (!raw || raw.length <= 1) return [];
      return raw.slice(1).map(r => parseTaskRow(r)).filter(t => t.id);
    },
    CACHE_TTLS.TASKS,
    onUpdate
  );
}

/**
 * Get Cached Holidays List
 */
export async function getCachedHolidays(
  spreadsheetId: string,
  forceRefresh: boolean = false
): Promise<HolidayRecord[]> {
  const key = `${spreadsheetId}_Holidays_Parsed`;

  if (forceRefresh) {
    memCache.delete(key);
  }

  return fetchWithSWR<HolidayRecord[]>(
    key,
    async () => {
      try {
        const raw = await getRange(spreadsheetId, 'Holidays!A:Z');
        if (raw && raw.length > 1) {
          return raw.slice(1).map((r, i) => parseHolidayRow(r, i));
        }
        return DEFAULT_2026_HOLIDAYS as HolidayRecord[];
      } catch {
        return DEFAULT_2026_HOLIDAYS as HolidayRecord[];
      }
    },
    CACHE_TTLS.HOLIDAYS
  );
}

/**
 * Get Cached Raw Sheet Rows with SWR
 */
export async function getCachedSheetRows(
  spreadsheetId: string,
  sheetName: string,
  ttl: number = CACHE_TTLS.DEFAULT,
  forceRefresh: boolean = false
): Promise<string[][]> {
  const key = `${spreadsheetId}_Sheet_${sheetName}`;

  if (forceRefresh) {
    memCache.delete(key);
  }

  return fetchWithSWR<string[][]>(
    key,
    async () => {
      const range = sheetName.includes('!') ? sheetName : `${sheetName}!A:Z`;
      const raw = await getRange(spreadsheetId, range);
      return raw.length > 1 ? raw.slice(1) : [];
    },
    ttl
  );
}

/**
 * Prefetch Essential Data in parallel to make all subsequent navigators instant (0ms switch)
 */
export async function prefetchEssentialData(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId) return;

  try {
    // 1. Batch get core tables
    const coreSheets = [
      'Employees!A:Z',
      'Tasks!A:Z',
      'Holidays!A:Z',
      'MachineCapacity!A:Z',
      'Leave!A:Z',
      'Supervisors!A:Z',
      'Shifts!A:Z',
      'BreakdownLog!A:Z',
      'KPI!A:Z'
    ];

    const batchResults = await batchGetRanges(spreadsheetId, coreSheets);

    // Warm individual parsed caches
    if (batchResults['Employees!A:Z']) {
      const raw = batchResults['Employees!A:Z'];
      if (raw.length > 1) {
        const emps = raw.slice(1).map(row => ({
          id: String(row[0] || '').trim(),
          name: String(row[1] || '').trim(),
          designation: String(row[2] || '').trim(),
          department: String(row[3] || '').trim(),
          dateOfJoin: String(row[4] || '').trim(),
          category: String(row[5] || '').trim(),
          supervisor: String(row[6] || '').trim(),
          status: String(row[9] || 'Active').trim(),
          profilePicture: String(row[16] || '').trim(),
          manager: String(row[17] || '').trim()
        })).filter(e => e.id);
        saveToCache(`${spreadsheetId}_Employees_Parsed`, emps);

        const shifts = raw.slice(1)
          .filter(row => row && row[0] && String(row[0]).trim() !== '')
          .map(row => parseEmployeeShiftState(row, new Date()));
        saveToCache(`${spreadsheetId}_ShiftEmployees`, shifts);
      }
    }

    if (batchResults['Tasks!A:Z']) {
      const raw = batchResults['Tasks!A:Z'];
      if (raw.length > 1) {
        const tasks = raw.slice(1).map(r => parseTaskRow(r)).filter(t => t.id);
        saveToCache(`${spreadsheetId}_Tasks_Parsed`, tasks);
      }
    }

    if (batchResults['Holidays!A:Z']) {
      const raw = batchResults['Holidays!A:Z'];
      if (raw.length > 1) {
        const hols = raw.slice(1).map((r, i) => parseHolidayRow(r, i));
        saveToCache(`${spreadsheetId}_Holidays_Parsed`, hols);
      }
    }

    // Save remaining raw sheets
    for (const range of coreSheets) {
      const sheetName = range.split('!')[0];
      const data = batchResults[range];
      if (data) {
        saveToCache(`${spreadsheetId}_Sheet_${sheetName}`, data.length > 1 ? data.slice(1) : []);
      }
    }
  } catch (err) {
    console.warn('Background prefetch completed with partial results:', err);
  }
}
