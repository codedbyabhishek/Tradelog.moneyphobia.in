/**
 * IndexedDB Service
 * Handles all database operations for the trading journal
 * Supports trades, ideas, settings, goals, filters, and templates with 500MB+ storage capacity
 */

'use client';

const DB_NAME = 'trading-journal-db';
const DB_VERSION = 2;

// Store names
const TRADES_STORE = 'trades';
const IDEAS_STORE = 'ideas';
const SETTINGS_STORE = 'settings';
const GOALS_STORE = 'trading-journal-goals';
const FILTERS_STORE = 'trading-journal-filters';
const TEMPLATES_STORE = 'trading-journal-templates';

interface DBStores {
  trades: 'trades';
  ideas: 'ideas';
  settings: 'settings';
  goals: 'trading-journal-goals';
  filters: 'trading-journal-filters';
  templates: 'trading-journal-templates';
}

/**
 * Initialize the IndexedDB database
 * Creates object stores if they don't exist
 */
export async function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof window === 'undefined' || !window.indexedDB) {
      const error = new Error('[IndexedDB] IndexedDB is not available in this environment');
      console.error(error.message);
      reject(error);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[IndexedDB] Database opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        console.log('[IndexedDB] Upgrading database...');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create trades store
        if (!db.objectStoreNames.contains(TRADES_STORE)) {
          db.createObjectStore(TRADES_STORE, { keyPath: 'id' });
          console.log('[IndexedDB] Created trades store');
        }

        // Create ideas store
        if (!db.objectStoreNames.contains(IDEAS_STORE)) {
          db.createObjectStore(IDEAS_STORE, { keyPath: 'id' });
          console.log('[IndexedDB] Created ideas store');
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
          console.log('[IndexedDB] Created settings store');
        }

        // Create goals store
        if (!db.objectStoreNames.contains(GOALS_STORE)) {
          db.createObjectStore(GOALS_STORE, { keyPath: 'id' });
          console.log('[IndexedDB] Created goals store');
        }

        // Create filters store
        if (!db.objectStoreNames.contains(FILTERS_STORE)) {
          db.createObjectStore(FILTERS_STORE, { keyPath: 'id' });
          console.log('[IndexedDB] Created filters store');
        }

        // Create templates store
        if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
          db.createObjectStore(TEMPLATES_STORE, { keyPath: 'id' });
          console.log('[IndexedDB] Created templates store');
        }
      };
    } catch (error) {
      console.error('[IndexedDB] Error during initialization:', error);
      reject(error);
    }
  });
}

/**
 * Get a value from IndexedDB
 */
export async function getFromDB<T>(
  store: string,
  key: string
): Promise<T | undefined> {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onerror = () => {
        console.error(`[IndexedDB] Error getting ${key} from ${store}:`, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log(`[IndexedDB] Retrieved ${key} from ${store}:`, request.result);
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to get:', error);
    throw error;
  }
}

/**
 * Put a value into IndexedDB
 */
export async function putToDB<T>(
  store: string,
  data: T
): Promise<void> {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(data);

      request.onerror = () => {
        console.error(`[IndexedDB] Error putting data into ${store}:`, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log(`[IndexedDB] Successfully saved to ${store}:`, data);
        resolve();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to put:', error);
    throw error;
  }
}

/**
 * Get all values from a store
 */
export async function getAllFromDB<T>(store: string): Promise<T[]> {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onerror = () => {
        console.error(`[IndexedDB] Error getting all from ${store}:`, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        const results = request.result || [];
        console.log(`[IndexedDB] Retrieved ${results.length} items from ${store}`);
        resolve(results);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to get all:', error);
    throw error;
  }
}

/**
 * Delete a value from IndexedDB
 */
export async function deleteFromDB(store: string, key: string): Promise<void> {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to delete:', error);
    throw error;
  }
}

/**
 * Clear all data from a store
 */
export async function clearStore(store: string): Promise<void> {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to clear store:', error);
    throw error;
  }
}

/**
 * Migrate data from localStorage to IndexedDB
 * Returns true if migration was performed, false if not needed
 */
export async function migrateFromLocalStorage(
  localStorageKey: string,
  dbStore: string,
  parser?: (data: any) => any
): Promise<boolean> {
  try {
    console.log(`[IndexedDB] Starting migration from localStorage key: ${localStorageKey}`);
    
    const existingData = localStorage.getItem(localStorageKey);
    if (!existingData) {
      console.log(`[IndexedDB] No data found in localStorage for key: ${localStorageKey}`);
      return false; // No data to migrate
    }

    console.log(`[IndexedDB] Found data in localStorage, parsing...`);
    const parsed = JSON.parse(existingData);
    const dataToStore = parser ? parser(parsed) : parsed;

    if (Array.isArray(dataToStore)) {
      // For arrays, store each item individually
      console.log(`[IndexedDB] Migrating array with ${dataToStore.length} items to ${dbStore}`);
      for (const item of dataToStore) {
        if (item.id || item.key) {
          await putToDB(dbStore, item);
        }
      }
    } else {
      // For objects, store with a key
      console.log(`[IndexedDB] Migrating object to ${dbStore}`);
      await putToDB(dbStore, dataToStore);
    }

    console.log(`[IndexedDB] Successfully migrated ${localStorageKey} to ${dbStore}`);
    return true;
  } catch (error) {
    console.error(`[IndexedDB] Migration failed for ${localStorageKey}:`, error);
    return false;
  }
}

/**
 * Get database size estimation
 */
export async function getDBSize(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
      };
    }
    return { usage: 0, quota: 0, percentage: 0 };
  } catch (error) {
    console.error('[IndexedDB] Failed to estimate storage:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if IndexedDB is available and working
 */
export async function checkIndexedDBAvailability(): Promise<{
  available: boolean;
  message: string;
  stores?: string[];
}> {
  try {
    if (typeof window === 'undefined') {
      return { available: false, message: 'Not running in browser context' };
    }

    if (!window.indexedDB) {
      return { available: false, message: 'IndexedDB not available in this browser' };
    }

    console.log('[IndexedDB] Checking availability...');
    const db = await initializeDB();
    
    const storeNames: string[] = [];
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      storeNames.push(db.objectStoreNames[i]);
    }
    
    console.log('[IndexedDB] Available stores:', storeNames);
    
    return {
      available: true,
      message: 'IndexedDB is available and initialized',
      stores: storeNames,
    };
  } catch (error) {
    console.error('[IndexedDB] Availability check failed:', error);
    return {
      available: false,
      message: `IndexedDB check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Export store names for use in other modules
export const STORE_NAMES = {
  TRADES: TRADES_STORE,
  IDEAS: IDEAS_STORE,
  SETTINGS: SETTINGS_STORE,
  GOALS: GOALS_STORE,
  FILTERS: FILTERS_STORE,
  TEMPLATES: TEMPLATES_STORE,
};

/**
 * Global debug function for browser console
 * Usage: window.debugIndexedDB()
 */
if (typeof window !== 'undefined') {
  (window as any).debugIndexedDB = async () => {
    console.clear();
    console.log('╔════════════════════════════════════════╗');
    console.log('║  IndexedDB Debug Information          ║');
    console.log('╚════════════════════════════════════════╝');
    
    const availability = await checkIndexedDBAvailability();
    console.log('\n📊 Availability:', availability.available ? '✅ Yes' : '❌ No');
    console.log('📝 Message:', availability.message);
    
    if (availability.stores) {
      console.log('📦 Available Stores:', availability.stores.join(', '));
    }
    
    if (availability.available) {
      try {
        const trades = await getAllFromDB(STORE_NAMES.TRADES);
        const ideas = await getAllFromDB(STORE_NAMES.IDEAS);
        const settings = await getFromDB(STORE_NAMES.SETTINGS, 'preferences');
        
        console.log('\n📈 Data Statistics:');
        console.log(`  • Trades: ${trades.length || 0}`);
        console.log(`  • Ideas: ${ideas.length || 0}`);
        console.log(`  • Settings: ${settings ? '✅' : '❌'}`);
        
        const dbSize = await getDBSize();
        console.log('\n💾 Storage Usage:');
        console.log(`  • Used: ${formatBytes(dbSize.usage)}`);
        console.log(`  • Quota: ${formatBytes(dbSize.quota)}`);
        console.log(`  • Percentage: ${dbSize.percentage.toFixed(2)}%`);
        
        console.log('\n✅ Everything looks good!');
      } catch (error) {
        console.error('\n❌ Error during data check:', error);
      }
    } else {
      console.log('\n⚠️  IndexedDB is not available in your environment.');
      console.log('This could be due to:');
      console.log('  • Private/Incognito browsing mode');
      console.log('  • Browser does not support IndexedDB');
      console.log('  • IndexedDB is disabled');
    }
    
    console.log('\n════════════════════════════════════════');
  };
}
