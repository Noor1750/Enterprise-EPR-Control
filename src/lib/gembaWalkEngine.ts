import { Employee } from '../components/kpi/types';
import { notifyUniversalAssignment, UniversalAssignmentNotification } from './universalAssignmentNotifier';
import { format, isAfter, parseISO } from 'date-fns';
import { ensureSheetExists, batchGetRanges, updateRowByPrimaryKey, deleteRowByPrimaryKey } from './sheets';
import { safeJsonParse, safeResponseJson } from './safeJson';

export type GembaCategory = 
  | 'Sort (1S)' 
  | 'Set in Order (2S)' 
  | 'Shine (3S)' 
  | 'Standardize (4S)' 
  | 'Sustain (5S)' 
  | 'Safety & Hazard' 
  | 'Visual Management' 
  | 'Waste / Muda' 
  | 'Ergonomics' 
  | 'Equipment Condition';

export type GembaSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type GembaStatus = 'Open' | 'In Progress' | 'Resolved' | 'Verified & Closed';

export interface FiveWhyAnalysis {
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  rootCauseSummary: string;
  systemicCountermeasure?: string;
}

export interface GembaWalkItem {
  id: string;
  date: string; // YYYY-MM-DD
  locationAsset: string; // Location / Asset
  beforePhoto: string; // Picture (before) (base64 or URL)
  observationFinding: string; // Observation / Finding
  category: GembaCategory; // Category
  riskImpact: string; // Risk / Impact
  severity: GembaSeverity; // Severity
  rootCause: string; // Root Cause (5-Why hint)
  fiveWhy?: FiveWhyAnalysis;
  immediateAction: string; // Immediate Action Taken/Status
  responsible: string; // Responsible
  responsibleId?: string; // Responsible Employee ID
  targetDate: string; // Target Date (YYYY-MM-DD)
  afterPhoto?: string; // Picture (after) (base64 or URL)
  status: GembaStatus; // Status
  closureDate?: string;
  closedBy?: string;
  verificationNotes?: string;
  walkerName?: string;
  walkerId?: string;
  createdAt: string;
  updatedAt: string;
}

export const GEMBA_CATEGORIES: { id: GembaCategory; label: string; color: string; badgeClass: string }[] = [
  { 
    id: 'Safety & Hazard', 
    label: 'Safety & Hazard', 
    color: '#ef4444', 
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Sort (1S)', 
    label: 'Sort (1S - Seiri)', 
    color: '#f97316', 
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Set in Order (2S)', 
    label: 'Set in Order (2S - Seiton)', 
    color: '#3b82f6', 
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Shine (3S)', 
    label: 'Shine (3S - Seiso)', 
    color: '#10b981', 
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Standardize (4S)', 
    label: 'Standardize (4S - Seiketsu)', 
    color: '#8b5cf6', 
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Sustain (5S)', 
    label: 'Sustain (5S - Shitsuke)', 
    color: '#06b6d4', 
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Visual Management', 
    label: 'Visual Management', 
    color: '#6366f1', 
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Waste / Muda', 
    label: 'Waste / Muda Elimination', 
    color: '#d97706', 
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Ergonomics', 
    label: 'Ergonomics & Workstation', 
    color: '#14b8a6', 
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300 font-extrabold shadow-2xs' 
  },
  { 
    id: 'Equipment Condition', 
    label: 'Equipment & Tool Condition', 
    color: '#64748b', 
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 font-extrabold shadow-2xs' 
  }
];

export const INITIAL_GEMBA_WALK_ITEMS: GembaWalkItem[] = [
  {
    id: 'GW-2026-001',
    date: '2026-09-01',
    locationAsset: 'Sewing Floor A - Line 4 Station 12',
    beforePhoto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
    observationFinding: 'Foot pedal electrical cables tangled around operator stool leg and protruding 40cm into the transit aisle.',
    category: 'Safety & Hazard',
    riskImpact: 'High trip & fall hazard for line operators and material runners; repetitive friction risks cable insulation breach.',
    severity: 'High',
    rootCause: 'Workstation reconfigured without relocating ceiling drop cord; absence of 5S pre-startup change verification.',
    fiveWhy: {
      why1: 'Why is the power cord trailing across the walkway? Socket is 2.5 meters away from new machine position.',
      why2: 'Why is socket far away? Workstation was moved last Friday to balance line cycle time.',
      why3: 'Why was the drop cord not repositioned? Maintenance work order was not submitted before line move.',
      why4: 'Why was no work order submitted? Line supervisors do not have an electrical safety sign-off requirement for minor line shifts.',
      why5: 'Why is there no sign-off standard? Lack of Management of Change (MOC) 5S checklist for floor layout updates.',
      rootCauseSummary: 'No standardized 5S pre-operational sign-off checklist when reconfiguring sewing line stations.',
      systemicCountermeasure: 'Mandate 5S pre-startup checklist with electrical cable raceway verification for all line adjustments.'
    },
    immediateAction: 'Temporarily wrapped cord with spiral protection sleeve and taped down heavy-duty yellow hazard cable bridge.',
    responsible: 'David Wilson',
    responsibleId: 'EMP006',
    targetDate: '2026-09-08',
    afterPhoto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
    status: 'In Progress',
    walkerName: 'Md. Noor Alam',
    createdAt: '2026-09-01T09:30:00.000Z',
    updatedAt: '2026-09-02T14:15:00.000Z'
  },
  {
    id: 'GW-2026-002',
    date: '2026-09-02',
    locationAsset: 'Finishing Bay 2 - Steam Ironing Zone #3',
    beforePhoto: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60',
    observationFinding: 'Water and condensation puddle accumulating under steam manifold onto smooth ceramic tile walkway.',
    category: 'Shine (3S)',
    riskImpact: 'Severe slip hazard; continuous thermal steam dissipation wasting energy; possible floor tile erosion.',
    severity: 'Critical',
    rootCause: 'Gasket on secondary condensate valve degraded due to missing preventive visual inspection tag schedule.',
    fiveWhy: {
      why1: 'Why is water pooling on the floor? Condensate drainage pipe joint is weeping droplets.',
      why2: 'Why is pipe weeping? Teflon sealing washer is hardened and brittle.',
      why3: 'Why was washer not replaced? Exceeded 6-month preventive lifespan by 45 days.',
      why4: 'Why did preventive maintenance miss it? Valve lacked visual PM date tag or inspection sticker.',
      why5: 'Why was there no visual tag? Secondary steam distribution lines were omitted from visual 5S tag standards.',
      rootCauseSummary: 'Secondary steam manifold joints lacked visual 5S color-coded PM inspection stickers.',
      systemicCountermeasure: 'Install stainless condensate drip pan, replace gasket, and apply quarterly visual PM color tags.'
    },
    immediateAction: 'Placed portable wet floor warning cone, wiped dry, and isolated steam shutoff valve #3 during lunch break.',
    responsible: 'Alex Johnson',
    responsibleId: 'EMP003',
    targetDate: '2026-09-04',
    afterPhoto: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&auto=format&fit=crop&q=60',
    status: 'Resolved',
    closureDate: '2026-09-03',
    closedBy: 'Alex Johnson',
    verificationNotes: 'Replaced Teflon gasket, leak test passed at 4.2 bar, installed visual inspection green tag.',
    walkerName: 'Md. Noor Alam',
    createdAt: '2026-09-02T10:15:00.000Z',
    updatedAt: '2026-09-03T11:00:00.000Z'
  },
  {
    id: 'GW-2026-003',
    date: '2026-09-02',
    locationAsset: 'Cutting Table #1 - Tool Shadow Board',
    beforePhoto: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&auto=format&fit=crop&q=60',
    observationFinding: 'Rotary fabric cutter shears and acrylic edge rulers missing from designated shadow board; scattered on unfinished garment stack.',
    category: 'Set in Order (2S)',
    riskImpact: 'Exposed rotary blade risks fabric cutting damage; search time delay of 6-8 mins per shift; operator finger cut risk.',
    severity: 'Medium',
    rootCause: 'Shadow silhouettes on board peeled off; no operator color-coded accountability tag system for checkout.',
    fiveWhy: {
      why1: 'Why are shears sitting on unfinished fabric? Operator finished cut and did not return tool.',
      why2: 'Why not returned? The designated hook on the board had another pair of scissors placed on it.',
      why3: 'Why were different scissors on that hook? Tool silhouette vinyl had peeled off during cleaning last month.',
      why4: 'Why was vinyl not renewed? Standard tape used instead of industrial solvent-resistant laminated vinyl.',
      why5: 'Why was standard tape used? 5S visual tool shadow standard lacked material durability specification.',
      rootCauseSummary: 'Shadow board markings used non-durable vinyl tape that degraded under solvent cleaning.',
      systemicCountermeasure: 'Laser-cut rigid PVC shadow inserts and implement 1-for-1 tool token accountability ring.'
    },
    immediateAction: 'Collected tools, safely housed rotary cutter in protective sheath, and wiped down board.',
    responsible: 'Jane Smith',
    responsibleId: 'EMP002',
    targetDate: '2026-09-07',
    status: 'Open',
    walkerName: 'Md. Noor Alam',
    createdAt: '2026-09-02T14:45:00.000Z',
    updatedAt: '2026-09-02T14:45:00.000Z'
  },
  {
    id: 'GW-2026-004',
    date: '2026-08-28',
    locationAsset: 'Raw Material Warehouse - Rack Bay B-04',
    beforePhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60',
    observationFinding: 'Overhanging fabric rolls protruding 30cm beyond shelf upright into forklift transit aisle without visual warning.',
    category: 'Visual Management',
    riskImpact: 'Forklift mast collision risk; falling fabric roll causing product loss ($450) and personal injury.',
    severity: 'High',
    rootCause: 'Backstop pallet stopper missing on rear beam; suppliers delivered 1.8m rolls vs standard 1.5m rack depth.',
    fiveWhy: {
      why1: 'Why are fabric rolls protruding? Pallet was pushed too far forward.',
      why2: 'Why was pallet pushed forward? Roll length is 180cm on a 150cm rack beam.',
      why3: 'Why was non-standard roll stored on standard rack? Warehouse intake did not check roll dimension against bay code.',
      why4: 'Why was dimension not checked? Bay visual signs do not specify maximum roll length limits.',
      why5: 'Why do signs lack limit? Visual management standard did not define volumetric envelope tags for textile racks.',
      rootCauseSummary: 'Warehouse rack bays lacked visual volumetric dimensional capacity tags.',
      systemicCountermeasure: 'Install mechanical rear stop bars and color-coded maximum dimension tags on all warehouse bays.'
    },
    immediateAction: 'Re-centered pallet with hand stacker, cordoned off lane with hazard tape until shift end.',
    responsible: 'John Doe',
    responsibleId: 'EMP001',
    targetDate: '2026-09-02',
    afterPhoto: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?w=500&auto=format&fit=crop&q=60',
    status: 'Verified & Closed',
    closureDate: '2026-09-01',
    closedBy: 'Md. Noor Alam',
    verificationNotes: 'Rear safety stopper bars bolted to uprights. Visual bay limit markings installed and verified.',
    walkerName: 'Sarah Connor',
    createdAt: '2026-08-28T11:00:00.000Z',
    updatedAt: '2026-09-01T16:00:00.000Z'
  },
  {
    id: 'GW-2026-005',
    date: '2026-09-03',
    locationAsset: 'Maintenance Workshop - Chemical & Lube Cabinet',
    beforePhoto: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=500&auto=format&fit=crop&q=60',
    observationFinding: 'Three aerosol degreaser cans and machine oil bottles stored unlabelled without GHS safety pictograms.',
    category: 'Standardize (4S)',
    riskImpact: 'Risk of inadvertent chemical cross-contamination, skin contact dermatitis, non-compliance with OSHA / ISO standards.',
    severity: 'Medium',
    rootCause: 'Original bulk dispenser decanted into secondary plastic squeeze bottles without applying secondary GHS label.',
    fiveWhy: {
      why1: 'Why are bottles unlabelled? Decanted from 20L drum into 500ml workshop bottles.',
      why2: 'Why was no label placed? Decanting station had run out of adhesive label sheets.',
      why3: 'Why were label sheets out of stock? No visual kanban trigger for auxiliary safety labels.',
      why4: 'Why was no kanban established? Auxiliary consumables not mapped in 5S visual replenishment system.',
      why5: 'Why not mapped? Chemical dispensing SOP focused on PPE rather than secondary containment labeling.',
      rootCauseSummary: 'Secondary chemical dispensing SOP did not require pre-printed adhesive GHS labels before decanting.',
      systemicCountermeasure: 'Implement Kanban card for GHS safety labels and tether label applicator directly to 20L dispensing taps.'
    },
    immediateAction: 'Identified liquids by batch code, quarantined bottles into hazardous locker, and hand-wrote temporary hazard notices.',
    responsible: 'Emily Davis',
    responsibleId: 'EMP005',
    targetDate: '2026-09-06',
    status: 'In Progress',
    walkerName: 'Md. Noor Alam',
    createdAt: '2026-09-03T08:30:00.000Z',
    updatedAt: '2026-09-03T08:30:00.000Z'
  }
];

const STORAGE_KEY = 'erp_gemba_walk_items';
const GEMBA_CACHE_TTL = 45000; // 45 seconds L1 fresh cache

// In-Memory L1 Cache for sub-millisecond retrieval
let memoryCache: {
  items: GembaWalkItem[];
  employees: Employee[];
  timestamp: number;
  spreadsheetId: string;
} | null = null;

// Deduplication map for concurrent in-flight requests (protects Google Drive/Sheets from spikes)
const inFlightGembaLoads = new Map<string, Promise<{ items: GembaWalkItem[]; employees: Employee[] }>>();

// Cross-tab synchronization channel to keep all open client tabs in sync with 0 API calls
let gembaChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    gembaChannel = new BroadcastChannel('erp_gemba_sync_channel');
    gembaChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'SYNC' && Array.isArray(event.data.items)) {
        if (memoryCache) {
          memoryCache.items = event.data.items;
          memoryCache.timestamp = Date.now();
        }
        window.dispatchEvent(new CustomEvent('erp-gemba-walk-updated', { detail: event.data.items }));
      }
    };
  } catch (e) {
    // Channel fallback
  }
}

export function getLocalGembaWalkItems(): GembaWalkItem[] {
  // If memory cache exists, return it instantly
  if (memoryCache && Array.isArray(memoryCache.items) && memoryCache.items.length > 0) {
    return memoryCache.items;
  }

  if (typeof window === 'undefined') return INITIAL_GEMBA_WALK_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GEMBA_WALK_ITEMS));
      return INITIAL_GEMBA_WALK_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Auto-repair known 404 photo URLs
      let repaired = false;
      const repairedItems = parsed.map((item: GembaWalkItem) => {
        let updated = { ...item };
        if (updated.beforePhoto && (updated.beforePhoto.includes('photo-1581092335397') || updated.beforePhoto.includes('photo-1504917599217'))) {
          if (updated.id === 'GW-2026-001') {
            updated.beforePhoto = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60';
            repaired = true;
          } else if (updated.id === 'GW-2026-003') {
            updated.beforePhoto = 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&auto=format&fit=crop&q=60';
            repaired = true;
          }
        }
        return updated;
      });
      if (repaired) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(repairedItems));
        return repairedItems;
      }
      return parsed;
    }
    return INITIAL_GEMBA_WALK_ITEMS;
  } catch (e) {
    console.warn('Failed to read Gemba Walk items from localStorage:', e);
    return INITIAL_GEMBA_WALK_ITEMS;
  }
}

export function saveLocalGembaWalkItems(items: GembaWalkItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (memoryCache) {
      memoryCache.items = items;
      memoryCache.timestamp = Date.now();
    }
    window.dispatchEvent(new CustomEvent('erp-gemba-walk-updated', { detail: items }));
    if (gembaChannel) {
      try {
        gembaChannel.postMessage({ type: 'SYNC', items });
      } catch (e) {
        // Safe channel fallback
      }
    }
  } catch (e) {
    console.warn('Failed to save Gemba Walk items to localStorage:', e);
  }
}

/**
 * Builds the standard 19-column Google Sheets row array
 */
export function buildGembaRowArray(item: GembaWalkItem): string[] {
  return [
    item.id,
    item.date,
    item.locationAsset,
    item.beforePhoto || '',
    item.observationFinding,
    item.category,
    item.riskImpact,
    item.severity,
    item.rootCause || '',
    item.immediateAction,
    item.responsible,
    item.targetDate,
    item.afterPhoto || '',
    item.status,
    item.closureDate || '',
    item.closedBy || '',
    JSON.stringify(item.fiveWhy || {}),
    item.createdAt,
    item.updatedAt
  ];
}

/**
 * Optimized high-concurrency data loader for Gemba Walks:
 * - Multi-tier: L1 Memory (<1ms) -> L2 LocalStorage (<5ms) -> L3 Google Sheets (batchGet)
 * - In-flight promise deduplication: coalesces concurrent requests into 1 single network call
 * - Jittered background refresh: flattens quota bursts for up to 200 concurrent users
 * - Re-uses cached employees to minimize Google Sheets API bandwidth
 */
export async function loadGembaWalkDataOptimized(
  spreadsheetId: string,
  options: { forceRefresh?: boolean } = {}
): Promise<{ items: GembaWalkItem[]; employees: Employee[]; fromCache: boolean }> {
  const now = Date.now();

  // 1. Instant L1 memory cache hit (<1ms return)
  if (
    !options.forceRefresh &&
    memoryCache &&
    memoryCache.spreadsheetId === spreadsheetId &&
    (now - memoryCache.timestamp < GEMBA_CACHE_TTL)
  ) {
    return {
      items: memoryCache.items,
      employees: memoryCache.employees,
      fromCache: true
    };
  }

  // 2. In-flight request deduplication across concurrent calls (handles up to 200 users cleanly)
  const dedupeKey = `${spreadsheetId}-${options.forceRefresh ? 'force' : 'swr'}`;
  if (inFlightGembaLoads.has(dedupeKey)) {
    const res = await inFlightGembaLoads.get(dedupeKey)!;
    return { ...res, fromCache: false };
  }

  const loadPromise = (async () => {
    let cachedEmployees: Employee[] = [];
    try {
      // Randomized Jitter (50-250ms) on non-forced background revalidations to flatten burst quota spikes
      if (!options.forceRefresh) {
        const jitter = Math.floor(Math.random() * 200);
        if (jitter > 0) {
          await new Promise(r => setTimeout(r, jitter));
        }
      }

      // Check if employees are already in localStorage cache and valid
      let needEmployeesFetch = true;
      if (typeof window !== 'undefined') {
        try {
          const cachedEmpStr = localStorage.getItem('erp_employees_cache');
          if (cachedEmpStr) {
            const parsed = JSON.parse(cachedEmpStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cachedEmployees = parsed;
              needEmployeesFetch = options.forceRefresh ? true : false;
            }
          }
        } catch {
          // ignore
        }
      }

      // 3. Batch fetch ranges: Single HTTP request via values:batchGet
      const rangesToFetch = ['FiveS_GembaWalk!A:S'];
      if (needEmployeesFetch) {
        rangesToFetch.push('Employees!A:Z');
      }

      // Ensure headers exist (cached per session via verifiedSheets in sheets.ts)
      await ensureSheetExists(spreadsheetId, 'FiveS_GembaWalk', [
        'ID', 'Date', 'Location / Asset', 'Before Photo URL', 'Observation Finding',
        'Category', 'Risk / Impact', 'Severity', 'Root Cause (5-Why)', 'Immediate Action',
        'Responsible Person', 'Target Date', 'After Photo URL', 'Status', 'Closure Date',
        'Closed By', 'Five-Why JSON', 'Created At', 'Updated At'
      ]).catch(() => {});

      const batchResults = await batchGetRanges(spreadsheetId, rangesToFetch);
      const gembaRaw = batchResults['FiveS_GembaWalk!A:S'] || [];
      const empRaw = needEmployeesFetch ? (batchResults['Employees!A:Z'] || []) : [];

      let parsedItems: GembaWalkItem[] = [];
      if (gembaRaw && gembaRaw.length > 1) {
        parsedItems = gembaRaw.slice(1).map(row => {
          let parsedFiveWhy;
          try {
            parsedFiveWhy = row[16] ? JSON.parse(row[16]) : undefined;
          } catch {
            // safe fallback
          }
          return {
            id: String(row[0] || '').trim(),
            date: String(row[1] || '').trim(),
            locationAsset: String(row[2] || '').trim(),
            beforePhoto: String(row[3] || '').trim(),
            observationFinding: String(row[4] || '').trim(),
            category: (row[5] as any) || 'Set in Order (2S)',
            riskImpact: String(row[6] || '').trim(),
            severity: (row[7] as any) || 'Medium',
            rootCause: String(row[8] || '').trim(),
            immediateAction: String(row[9] || '').trim(),
            responsible: String(row[10] || '').trim(),
            targetDate: String(row[11] || '').trim(),
            afterPhoto: String(row[12] || '').trim(),
            status: (row[13] as any) || 'Open',
            closureDate: String(row[14] || '').trim(),
            closedBy: String(row[15] || '').trim(),
            fiveWhy: parsedFiveWhy,
            createdAt: String(row[17] || '').trim(),
            updatedAt: String(row[18] || '').trim()
          };
        }).filter(g => g.id);
      }

      // If remote returned items, update local storage and memory
      if (parsedItems.length > 0) {
        saveLocalGembaWalkItems(parsedItems);
      } else {
        // Fallback to local storage
        parsedItems = getLocalGembaWalkItems();
      }

      let parsedEmployees = cachedEmployees;
      if (empRaw && empRaw.length > 1) {
        parsedEmployees = empRaw.slice(1).map(row => ({
          id: String(row[0] || '').trim(),
          name: String(row[1] || '').trim(),
          designation: String(row[2] || '').trim(),
          department: String(row[3] || '').trim(),
          status: String(row[9] || 'Active').trim(),
          workingArea: String(row[15] || row[14] || row[4] || 'Floor 1').trim(),
          shift: String(row[13] || row[15] || 'Day Shift').trim(),
          profilePicture: String(row[16] || '').trim(),
          supervisor: String(row[17] || '').trim(),
          manager: String(row[17] || '').trim(),
        })).filter(e => e.id);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('erp_employees_cache', JSON.stringify(parsedEmployees));
          } catch {
            // safe fallback
          }
        }
      }

      // Update memory cache
      memoryCache = {
        items: parsedItems,
        employees: parsedEmployees,
        timestamp: Date.now(),
        spreadsheetId
      };

      return { items: parsedItems, employees: parsedEmployees };
    } catch (err) {
      console.warn('Optimized Gemba Walk fetch failed, gracefully falling back to local cache:', err);
      const fallbackItems = getLocalGembaWalkItems();
      return { items: fallbackItems, employees: cachedEmployees };
    } finally {
      inFlightGembaLoads.delete(dedupeKey);
    }
  })();

  inFlightGembaLoads.set(dedupeKey, loadPromise);
  const result = await loadPromise;
  return { ...result, fromCache: false };
}

/**
 * Optimistic Gemba Item Mutation with queued background Google Sheets persistence
 */
export async function saveGembaWalkItemOptimized(
  spreadsheetId: string,
  item: GembaWalkItem,
  assignerInfo?: { email?: string; name?: string; id?: string }
): Promise<GembaWalkItem[]> {
  // 1. Instant local optimistic update (0ms UI latency)
  const current = getLocalGembaWalkItems();
  const idx = current.findIndex(i => i.id === item.id);
  let updatedList: GembaWalkItem[];
  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = item;
  } else {
    updatedList = [item, ...current];
  }

  saveLocalGembaWalkItems(updatedList);

  if (memoryCache) {
    memoryCache.items = updatedList;
    memoryCache.timestamp = Date.now();
  }

  // 2. Immediate dispatch of notification if responsible assigned
  if (item.responsible) {
    dispatchGembaAssignmentNotification(
      item,
      assignerInfo?.id || assignerInfo?.email || 'ADMIN-001',
      assignerInfo?.name || 'Gemba Lead'
    );
  }

  // 3. Asynchronous Google Sheets persistence with queueing & primary key resolution
  if (spreadsheetId) {
    const rowData = buildGembaRowArray(item);
    updateRowByPrimaryKey(spreadsheetId, 'FiveS_GembaWalk', item.id, rowData).catch(err => {
      console.warn('Background sync for Gemba item queued or bypassed:', err);
    });
  }

  return updatedList;
}

/**
 * Optimistic Gemba Item Deletion with queued background Google Sheets deletion
 */
export async function deleteGembaWalkItemOptimized(
  spreadsheetId: string,
  id: string
): Promise<GembaWalkItem[]> {
  const current = getLocalGembaWalkItems();
  const updatedList = current.filter(i => i.id !== id);
  saveLocalGembaWalkItems(updatedList);

  if (memoryCache) {
    memoryCache.items = updatedList;
    memoryCache.timestamp = Date.now();
  }

  if (spreadsheetId) {
    deleteRowByPrimaryKey(spreadsheetId, 'FiveS_GembaWalk', id).catch(err => {
      console.warn('Background delete for Gemba item queued or bypassed:', err);
    });
  }

  return updatedList;
}

/**
 * Dispatches an automated Universal Assignment Notification for assigned Gemba Walk actions
 */
export function dispatchGembaAssignmentNotification(
  item: GembaWalkItem,
  assignerId: string = 'ADMIN-001',
  assignerName: string = 'Gemba Walk Lead'
): UniversalAssignmentNotification | null {
  if (!item.responsible || !item.responsible.trim()) return null;

  // Resolve responsibleId if missing
  let resolvedEmpId = item.responsibleId || '';
  if (!resolvedEmpId && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('erp_employees_cache');
      if (cached) {
        const list: Employee[] = JSON.parse(cached);
        const match = list.find(e => 
          e.name.toLowerCase().trim() === item.responsible.toLowerCase().trim() ||
          item.responsible.toLowerCase().includes(e.name.toLowerCase())
        );
        if (match) {
          resolvedEmpId = match.id;
        }
      }
    } catch (e) {
      // Ignore cache read error
    }
  }

  const notif: UniversalAssignmentNotification = {
    id: `asgn-gemba-${item.id}-${Date.now()}`,
    module: 'gemba-walks',
    moduleName: 'Gemba Walks',
    recordId: item.id,
    title: `Gemba Walk Action: ${item.locationAsset}`,
    subtitle: `${item.severity} Priority • Target: ${item.targetDate} • ${item.category}`,
    details: `Observation: "${item.observationFinding}". Immediate Action: "${item.immediateAction || 'Take necessary countermeasure'}". Root Cause: ${item.rootCause || 'Perform 5-Why'}.`,
    priority: item.severity === 'Critical' ? 'Critical' : item.severity === 'High' ? 'High' : item.severity === 'Medium' ? 'Medium' : 'Low',
    status: item.status,
    date: item.targetDate,
    assignedById: assignerId,
    assignedByName: assignerName,
    assigneeId: resolvedEmpId,
    assigneeName: item.responsible,
    assignedAt: new Date().toISOString(),
    read: false,
    acknowledged: false,
    metadata: {
      category: item.category,
      locationAsset: item.locationAsset,
      severity: item.severity,
      immediateAction: item.immediateAction,
      rootCause: item.rootCause,
      beforePhoto: item.beforePhoto
    }
  };

  // 1. Dispatch into Universal Notification Inbox & sound engine
  notifyUniversalAssignment(notif);

  // 2. Dispatch custom event for UI confirmation toast across active screens
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-gemba-assignment-dispatched', {
      detail: {
        notification: notif,
        item,
        responsible: item.responsible,
        responsibleId: resolvedEmpId,
        targetDate: item.targetDate
      }
    }));

    // 3. Native browser push notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`Gemba Action Assigned: ${item.responsible}`, {
          body: `${item.severity} Priority: ${item.locationAsset} - Due ${item.targetDate}`,
          icon: '/favicon.ico'
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }

  return notif;
}

/**
 * Intelligent Fallback for 5-Why & Risk Analysis when offline or without Gemini API Key
 */
export function generateSmartGembaHeuristics(
  observation: string,
  locationAsset: string,
  categoryHint?: string
): {
  category: GembaCategory;
  riskImpact: string;
  severity: GembaSeverity;
  fiveWhy: FiveWhyAnalysis;
  rootCause: string;
  immediateAction: string;
  suggestedTargetDays: number;
} {
  const lower = (observation + ' ' + locationAsset).toLowerCase();

  let category: GembaCategory = (categoryHint as GembaCategory) || 'Set in Order (2S)';
  let severity: GembaSeverity = 'Medium';
  let riskImpact = 'Operational friction, cycle time delay, or workplace inconsistency.';
  let immediateAction = 'Cordon off area, apply temporary visual marker, and notify floor supervisor.';
  let suggestedTargetDays = 5;

  let why1 = 'Why is this condition present? Lack of standardized visual positioning at the station.';
  let why2 = 'Why was it not positioned correctly? Workstation lacked designated shadow outline or visual boundary.';
  let why3 = 'Why is there no boundary? Station layout was modified without updating the 5S visual floor tape.';
  let why4 = 'Why was tape not updated? Maintenance and line balancing changes lacked a visual 5S sign-off.';
  let why5 = 'Why was sign-off missing? 5S sustaining audit was not integrated into daily shift handover checklist.';
  let rootCauseSummary = 'Absence of visual boundary demarcation and daily 5S shift handover sign-off standard.';
  let systemicCountermeasure = 'Apply industrial heavy-duty vinyl tape, implement shadow board, and audit daily.';

  if (lower.includes('oil') || lower.includes('water') || lower.includes('leak') || lower.includes('spill') || lower.includes('puddle') || lower.includes('slip')) {
    category = 'Shine (3S)';
    severity = 'Critical';
    riskImpact = 'Severe employee slip & fall injury risk; fluid contamination of raw materials and floor damage.';
    immediateAction = 'Erect cautionary wet floor signage, deploy absorbent containment socks/granules, and isolate upstream valve.';
    suggestedTargetDays = 2;
    why1 = 'Why is fluid pooling on the floor? Machine valve / hydraulic fitting is weeping liquid.';
    why2 = 'Why is fitting weeping? O-ring seal hardened beyond operational thermal lifespan.';
    why3 = 'Why was seal not replaced prior to failure? Visual preventive maintenance tag was missing from valve.';
    why4 = 'Why was PM tag missing? Auxiliary hydraulic manifolds were not enrolled in the computerized visual PM registry.';
    why5 = 'Why not enrolled? Equipment visual standard focused solely on primary drive motors.';
    rootCauseSummary = 'Auxiliary fluid manifolds lacked visual PM inspection tags and scheduled replacement cycles.';
    systemicCountermeasure = 'Replace seal with high-temp fluoropolymer O-ring, install visual PM tag, and audit all manifold lines.';
  } else if (lower.includes('wire') || lower.includes('cord') || lower.includes('cable') || lower.includes('electric') || lower.includes('trip') || lower.includes('shock') || lower.includes('hazard')) {
    category = 'Safety & Hazard';
    severity = 'High';
    riskImpact = 'High trip & fall danger for floor operators; potential cable chafing leading to short circuit and electrical fire.';
    immediateAction = 'Install durable rubber cable ramp bridge immediately; secure loose slack with Velcro cable ties.';
    suggestedTargetDays = 3;
    why1 = 'Why is cable trailing across walkway? Workstation electrical feed is located on opposite wall.';
    why2 = 'Why is it on opposite wall? Station was moved forward to improve material flow.';
    why3 = 'Why was drop cord not relocated? Facility work order was not submitted prior to production move.';
    why4 = 'Why no work order? Line movement SOP does not mandate electrical utility clearance before startup.';
    why5 = 'Why no mandate? Workstation Change Management lacked 5S Safety pre-audit gate.';
    rootCauseSummary = 'Line relocation process lacks mandatory 5S electrical safety clearance gate before operational restart.';
    systemicCountermeasure = 'Enact pre-startup 5S checklist requiring overhead cable drops or floor-embedded channels for all line moves.';
  } else if (lower.includes('scrap') || lower.includes('excess') || lower.includes('waste') || lower.includes('carton') || lower.includes('clutter') || lower.includes('muda')) {
    category = 'Sort (1S)';
    severity = 'Medium';
    riskImpact = 'Blockage of transit pathways; fire loading increase; confusion between good product and rework items.';
    immediateAction = 'Affix Red Tag, move surplus items to designated Red Tag Holding Area, and sweep perimeter.';
    suggestedTargetDays = 4;
    why1 = 'Why are excess materials accumulated at the station? Output from previous batch was not cleared.';
    why2 = 'Why was it not cleared? Material handler pallet was delayed waiting on packing boxes.';
    why3 = 'Why were boxes delayed? Inventory reorder point in store was depleted.';
    why4 = 'Why depleted without notice? No 2-Bin visual kanban card system for packaging consumables.';
    why5 = 'Why no visual kanban? Packaging inventory was managed on monthly manual batch orders.';
    rootCauseSummary = 'Lack of visual minimum/maximum kanban reorder thresholds for station packaging materials.';
    systemicCountermeasure = 'Establish 2-Bin visual gravity rack with red line reorder trigger for all station packaging.';
  } else if (lower.includes('tool') || lower.includes('wrench') || lower.includes('ruler') || lower.includes('scissors') || lower.includes('shears') || lower.includes('missing') || lower.includes('shadow')) {
    category = 'Set in Order (2S)';
    severity = 'Medium';
    riskImpact = 'Operator search waste (5-10 min/shift); dropped tool damage; product scratch or puncture defect risk.';
    immediateAction = 'Gather tools into temporary foam tool tray; inventory against standard equipment list.';
    suggestedTargetDays = 5;
    why1 = 'Why are tools scattered? No designated, easily accessible location close to operator point-of-use.';
    why2 = 'Why no designated spot? Station shadow board is located 4 steps away behind the operator.';
    why3 = 'Why is board placed behind? Standard board was too large to mount on the primary machine frame.';
    why4 = 'Why was compact holder not made? Ergonomic workstation standard was not tailored to machine geometry.';
    why5 = 'Why not tailored? 5S tool holder guidelines were generic rather than workstation-specific.';
    rootCauseSummary: 'Generic shadow board placement created excessive reach distances, discouraging immediate tool return.';
    systemicCountermeasure = 'Mount compact magnetic shadow rail directly at operator point-of-use with color-matched silhouette vinyl.';
  } else if (lower.includes('label') || lower.includes('sign') || lower.includes('mark') || lower.includes('line') || lower.includes('visual')) {
    category = 'Visual Management';
    severity = 'Medium';
    riskImpact = 'Operator ambiguity, incorrect parts selection, aisle encroachment by carts, audit compliance non-conformance.';
    immediateAction = 'Mark temporary visual boundary with color tape; hand-label station bin with laminated tag.';
    suggestedTargetDays = 4;
    why1 = 'Why is the visual marker missing? Floor tape peeled away under pallet truck traffic.';
    why2 = 'Why did tape peel so quickly? Floor surface was not degreased and primed before tape adhesion.';
    why3 = 'Why was floor not primed? Maintenance team lacked standard floor marking application guide.';
    why4 = 'Why no guide? Visual factory guidelines did not specify heavy-traffic epoxy paint vs standard tape.';
    why5 = 'Why no specification? Visual standards manual had not been updated for high-traffic forklift transit bays.';
    rootCauseSummary = 'Floor marking specifications did not differentiate between light pedestrian and heavy forklift transit lanes.';
    systemicCountermeasure = 'Apply two-part epoxy painted safety walkways with polyurethane clear topcoat in all transit zones.';
  }

  return {
    category,
    riskImpact,
    severity,
    fiveWhy: {
      why1,
      why2,
      why3,
      why4,
      why5,
      rootCauseSummary,
      systemicCountermeasure
    },
    rootCause: rootCauseSummary,
    immediateAction,
    suggestedTargetDays
  };
}

/**
 * Call Server-Side Gemini Smart Assist API (with automatic heuristic fallback)
 */
export async function runGembaSmartAssist(params: {
  observation: string;
  locationAsset: string;
  category?: string;
  imageData?: string;
}): Promise<{
  category: GembaCategory;
  riskImpact: string;
  severity: GembaSeverity;
  fiveWhy: FiveWhyAnalysis;
  rootCause: string;
  immediateAction: string;
  suggestedTargetDays: number;
  source: 'gemini' | 'heuristic';
}> {
  try {
    const res = await fetch('/api/gemini/gemba-smart-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (res.ok) {
      const data = await safeResponseJson<any>(res, null);
      if (data && data.fiveWhy && data.rootCause) {
        return {
          ...data,
          source: 'gemini'
        };
      }
    }
  } catch (err) {
    console.warn('Gemini server assist request failed, falling back to smart heuristics:', err);
  }

  // Graceful, smart fallback
  const fallback = generateSmartGembaHeuristics(params.observation, params.locationAsset, params.category);
  return {
    ...fallback,
    source: 'heuristic'
  };
}
