import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export const MASTER_DATABASE_OWNER = 'smltrimsbd@gmail.com';
const ERP_DATABASE_COLLECTION = 'erp_databases';
const ERP_CONFIG_COLLECTION = 'erp_config';
const DATABASE_SETTINGS_DOC = 'database_settings';

export interface CloudDbSettings {
  spreadsheetId: string | null;
  owner: string;
  updatedAt: string;
  updatedBy: string;
  version?: number;
}

let activeTableUnsubscribers: (() => void)[] = [];
let configUnsubscriber: (() => void) | null = null;
let isRealtimeInitialized = false;

/**
 * Normalizes table names to avoid slash / case mismatch
 */
export function cleanTableName(sheetName: string): string {
  return sheetName.split('!')[0].replace(/['"]/g, '').trim();
}

/**
 * Saves or updates a specific ERP table in the Firebase Firestore cloud database.
 * Keyed under smltrimsbd@gmail.com to guarantee a unified real-time multi-user environment.
 */
export async function syncTableToCloud(
  sheetName: string, 
  rows: string[][], 
  userEmail?: string
): Promise<void> {
  const table = cleanTableName(sheetName);
  if (!table || !Array.isArray(rows)) return;

  try {
    const tableDocRef = doc(db, ERP_DATABASE_COLLECTION, MASTER_DATABASE_OWNER, 'tables', table);
    const actor = userEmail || auth?.currentUser?.email || 'smltrimsbd@gmail.com';

    await setDoc(tableDocRef, {
      tableName: table,
      rows,
      rowCount: rows.length,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
      serverTime: serverTimestamp()
    }, { merge: true });

    // Also record a lightweight sync pulse in erp_sync for instant cross-tab notification
    const syncPulseRef = doc(db, 'erp_sync', table);
    setDoc(syncPulseRef, {
      table,
      updatedAt: new Date().toISOString(),
      updatedBy: actor
    }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn(`[Realtime Cloud DB] Failed to sync table "${table}" to Firestore:`, err);
  }
}

/**
 * Fetches the current table data directly from Firestore cloud.
 */
export async function fetchTableFromCloud(sheetName: string): Promise<string[][] | null> {
  const table = cleanTableName(sheetName);
  try {
    const tableDocRef = doc(db, ERP_DATABASE_COLLECTION, MASTER_DATABASE_OWNER, 'tables', table);
    const snap = await getDoc(tableDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.rows)) {
        return data.rows as string[][];
      }
    }
    return null;
  } catch (err) {
    console.warn(`[Realtime Cloud DB] Failed to fetch table "${table}" from Firestore:`, err);
    return null;
  }
}

/**
 * Persists the master Google Spreadsheet ID in the cloud so all users on Netlify,
 * Firebase, and GitHub automatically connect to smltrimsbd@gmail.com's database.
 */
export async function saveCloudSpreadsheetId(
  spreadsheetId: string, 
  userEmail?: string
): Promise<void> {
  try {
    const configDocRef = doc(db, ERP_CONFIG_COLLECTION, DATABASE_SETTINGS_DOC);
    const actor = userEmail || auth?.currentUser?.email || MASTER_DATABASE_OWNER;

    await setDoc(configDocRef, {
      spreadsheetId: spreadsheetId.trim(),
      owner: MASTER_DATABASE_OWNER,
      updatedAt: new Date().toISOString(),
      updatedBy: actor
    }, { merge: true });

    localStorage.setItem('erp_spreadsheet_id', spreadsheetId.trim());
  } catch (err) {
    console.warn('[Realtime Cloud DB] Failed to save cloud spreadsheet ID:', err);
  }
}

/**
 * Fetches the master Google Spreadsheet ID configured for smltrimsbd@gmail.com
 */
export async function getCloudSpreadsheetId(): Promise<string | null> {
  try {
    const configDocRef = doc(db, ERP_CONFIG_COLLECTION, DATABASE_SETTINGS_DOC);
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data() as CloudDbSettings;
      if (data?.spreadsheetId && data.spreadsheetId !== 'local-storage-db') {
        return data.spreadsheetId;
      }
    }
  } catch (err) {
    console.warn('[Realtime Cloud DB] Failed to get cloud spreadsheet ID:', err);
  }
  return null;
}

/**
 * Auto-seeds all default ERP tables in Firestore if the database for smltrimsbd@gmail.com is fresh.
 */
export async function seedCloudDatabaseIfEmpty(initialData: Record<string, string[][]>): Promise<boolean> {
  try {
    const usersTableRef = doc(db, ERP_DATABASE_COLLECTION, MASTER_DATABASE_OWNER, 'tables', 'Users');
    const snap = await getDoc(usersTableRef);

    if (!snap.exists()) {
      console.log(`[Realtime Cloud DB] Initializing master database for ${MASTER_DATABASE_OWNER}...`);
      const batch = writeBatch(db);
      
      for (const [table, rows] of Object.entries(initialData)) {
        const clean = cleanTableName(table);
        const ref = doc(db, ERP_DATABASE_COLLECTION, MASTER_DATABASE_OWNER, 'tables', clean);
        batch.set(ref, {
          tableName: clean,
          rows,
          rowCount: rows.length,
          updatedAt: new Date().toISOString(),
          updatedBy: MASTER_DATABASE_OWNER
        });
      }

      // Also ensure config doc exists
      const configRef = doc(db, ERP_CONFIG_COLLECTION, DATABASE_SETTINGS_DOC);
      const envSheetId = import.meta.env.VITE_SPREADSHEET_ID;
      const validEnvSheetId = envSheetId && !envSheetId.includes('@') ? envSheetId : null;

      batch.set(configRef, {
        spreadsheetId: validEnvSheetId || 'local-storage-db',
        owner: MASTER_DATABASE_OWNER,
        updatedAt: new Date().toISOString(),
        updatedBy: MASTER_DATABASE_OWNER
      }, { merge: true });

      await batch.commit();
      console.log(`[Realtime Cloud DB] Successfully seeded initial cloud database for ${MASTER_DATABASE_OWNER}`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Realtime Cloud DB] Cloud database seeding check encountered:', err);
    return false;
  }
}

/**
 * Initializes full real-time synchronization.
 * Connects all clients (Netlify, Firebase, GitHub, local) to the shared live Firestore database.
 */
export function initRealtimeCloudDatabase(options: {
  onTableUpdated: (tableName: string, rows: string[][]) => void;
  onSpreadsheetIdUpdated: (spreadsheetId: string) => void;
  initialSeedData?: Record<string, string[][]>;
}): () => void {
  if (isRealtimeInitialized) {
    return () => {};
  }
  isRealtimeInitialized = true;

  // 1. Seed if empty
  if (options.initialSeedData) {
    seedCloudDatabaseIfEmpty(options.initialSeedData).catch(() => {});
  }

  // 2. Real-time listener for Database Configuration (Spreadsheet ID & Owner)
  try {
    const configDocRef = doc(db, ERP_CONFIG_COLLECTION, DATABASE_SETTINGS_DOC);
    configUnsubscriber = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CloudDbSettings;
        if (data?.spreadsheetId) {
          options.onSpreadsheetIdUpdated(data.spreadsheetId);
        }
      }
    }, (error) => {
      console.warn('[Realtime Cloud DB] Config snapshot listener warning:', error);
    });
  } catch (e) {
    console.warn('[Realtime Cloud DB] Could not attach config listener:', e);
  }

  // 3. Real-time listener for all ERP Tables in smltrimsbd@gmail.com's cloud database
  try {
    const tablesCollectionRef = collection(db, ERP_DATABASE_COLLECTION, MASTER_DATABASE_OWNER, 'tables');
    const tableUnsub = onSnapshot(tablesCollectionRef, (querySnapshot) => {
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const tableName = change.doc.id;
          if (data && Array.isArray(data.rows)) {
            options.onTableUpdated(tableName, data.rows as string[][]);
          }
        }
      });
    }, (error) => {
      console.warn('[Realtime Cloud DB] Tables snapshot listener warning:', error);
    });

    activeTableUnsubscribers.push(tableUnsub);
  } catch (e) {
    console.warn('[Realtime Cloud DB] Could not attach tables listener:', e);
  }

  return () => {
    isRealtimeInitialized = false;
    if (configUnsubscriber) {
      configUnsubscriber();
      configUnsubscriber = null;
    }
    activeTableUnsubscribers.forEach(unsub => unsub());
    activeTableUnsubscribers = [];
  };
}
