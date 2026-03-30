/**
 * Offline Sync Manager
 * Handles queuing and syncing trades when offline
 */

'use client';

interface PendingTrade {
  id: string;
  trade: any;
  timestamp: number;
  retries: number;
}

const PENDING_TRADES_STORE = 'pending-trades';
const MAX_RETRIES = 3;

export async function initOfflineSync() {
  if (typeof window === 'undefined') return;

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Check connection status
  if (navigator.onLine) {
    await syncPendingTrades();
  }
}

async function handleOnline() {
  console.log('[Offline Sync] Connection restored, syncing trades...');
  try {
    await syncPendingTrades();
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.sync.register('sync-trades');
    }
  } catch (error) {
    console.error('[Offline Sync] Sync failed:', error);
  }
}

function handleOffline() {
  console.log('[Offline Sync] Connection lost, trades will sync when online');
}

export async function addPendingTrade(trade: any): Promise<string> {
  if (!window.indexedDB) {
    throw new Error('IndexedDB not available');
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      try {
        let objectStore;
        if (!db.objectStoreNames.contains(PENDING_TRADES_STORE)) {
          // Create store if it doesn't exist
          const upgradeTx = request.transaction;
          objectStore = upgradeTx.objectStore(PENDING_TRADES_STORE);
        } else {
          const tx = db.transaction([PENDING_TRADES_STORE], 'readwrite');
          objectStore = tx.objectStore(PENDING_TRADES_STORE);
        }

        const id = `pending-${Date.now()}`;
        const pending: PendingTrade = {
          id,
          trade,
          timestamp: Date.now(),
          retries: 0
        };

        const addRequest = objectStore.add(pending);
        addRequest.onsuccess = () => resolve(id);
        addRequest.onerror = () => reject(addRequest.error);
      } catch (error) {
        reject(error);
      }
    };
  });
}

export async function syncPendingTrades(): Promise<void> {
  if (!window.indexedDB) return;

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PENDING_TRADES_STORE)) {
        resolve();
        return;
      }

      const tx = db.transaction([PENDING_TRADES_STORE], 'readwrite');
      const store = tx.objectStore(PENDING_TRADES_STORE);
      const getAllRequest = store.getAll();

      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = async () => {
        const pending: PendingTrade[] = getAllRequest.result;

        for (const item of pending) {
          try {
            // Attempt to sync
            const response = await fetch('/api/trades', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.trade)
            });

            if (response.ok) {
              // Delete from pending
              const deleteRequest = store.delete(item.id);
              deleteRequest.onerror = () => {
                console.error('[Offline Sync] Failed to remove synced trade:', item.id);
              };
            } else if (item.retries < MAX_RETRIES) {
              // Retry
              item.retries++;
              const updateRequest = store.put(item);
              updateRequest.onerror = () => {
                console.error('[Offline Sync] Failed to update retry count:', item.id);
              };
            }
          } catch (error) {
            console.error('[Offline Sync] Sync error for trade:', item.id, error);
            if (item.retries < MAX_RETRIES) {
              item.retries++;
              const updateRequest = store.put(item);
              updateRequest.onerror = () => {
                console.error('[Offline Sync] Failed to update retry count:', item.id);
              };
            }
          }
        }

        resolve();
      };
    };
  });
}

export async function getPendingTradeCount(): Promise<number> {
  if (!window.indexedDB) return 0;

  return new Promise((resolve) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => resolve(0);
    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PENDING_TRADES_STORE)) {
        resolve(0);
        return;
      }

      const tx = db.transaction([PENDING_TRADES_STORE], 'readonly');
      const countRequest = tx.objectStore(PENDING_TRADES_STORE).count();

      countRequest.onerror = () => resolve(0);
      countRequest.onsuccess = () => resolve(countRequest.result);
    };
  });
}
