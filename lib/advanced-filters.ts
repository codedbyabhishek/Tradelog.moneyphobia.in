/**
 * Advanced Filter Manager
 * Handles complex trade filtering with date ranges, performance metrics, and custom presets
 */

'use client';

import { Trade } from '@/lib/types';
import { calculatePnL } from '@/lib/trade-utils';

export interface FilterPreset {
  id: string;
  name: string;
  filters: TradeFilters;
  createdAt: number;
}

export interface TradeFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  symbols?: string[];
  setups?: string[];
  minPnL?: number;
  maxPnL?: number;
  winOnly?: boolean;
  lossOnly?: boolean;
  minRiskReward?: number;
  emotions?: string[];
  searchText?: string;
}

/**
 * Apply filters to trades
 */
export function applyFilters(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter((trade) => {
    // Date range filter
    if (filters.dateRange) {
      const tradeDate = new Date(trade.entryDate).getTime();
      const startDate = new Date(filters.dateRange.start).getTime();
      const endDate = new Date(filters.dateRange.end).getTime();
      if (tradeDate < startDate || tradeDate > endDate) {
        return false;
      }
    }

    // Symbol filter
    if (filters.symbols && filters.symbols.length > 0) {
      if (!filters.symbols.includes(trade.symbol)) {
        return false;
      }
    }

    // Setup filter
    if (filters.setups && filters.setups.length > 0) {
      if (!filters.setups.includes(trade.setupName)) {
        return false;
      }
    }

    // P&L range filter
    const pnl = calculatePnL(trade);
    if (filters.minPnL !== undefined && pnl < filters.minPnL) {
      return false;
    }
    if (filters.maxPnL !== undefined && pnl > filters.maxPnL) {
      return false;
    }

    // Win/Loss filter
    if (filters.winOnly && calculatePnL(trade) <= 0) {
      return false;
    }
    if (filters.lossOnly && calculatePnL(trade) >= 0) {
      return false;
    }

    // Risk-Reward filter
    if (filters.minRiskReward !== undefined) {
      const riskReward = Math.abs(
        (trade.exitPrice - trade.entryPrice) / (trade.stopLossPrice - trade.entryPrice)
      ) || 0;
      if (riskReward < filters.minRiskReward) {
        return false;
      }
    }

    // Emotion filter
    if (filters.emotions && filters.emotions.length > 0) {
      if (!trade.emotion || !filters.emotions.includes(trade.emotion)) {
        return false;
      }
    }

    // Search text filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const searchableFields = [
        trade.symbol,
        trade.setupName,
        trade.notes,
        trade.emotion,
      ]
        .filter(Boolean)
        .map((f) => String(f).toLowerCase());

      if (!searchableFields.some((field) => field.includes(searchLower))) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Save filter preset to IndexedDB
 */
export async function saveFilterPreset(
  preset: Omit<FilterPreset, 'id' | 'createdAt'>
): Promise<string> {
  if (!window.indexedDB) throw new Error('IndexedDB not available');

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['trading-journal-filters'], 'readwrite');
      const store = tx.objectStore('trading-journal-filters');

      const id = `preset-${Date.now()}`;
      const newPreset: FilterPreset = {
        id,
        ...preset,
        createdAt: Date.now(),
      };

      const addRequest = store.add(newPreset);
      addRequest.onerror = () => reject(addRequest.error);
      addRequest.onsuccess = () => resolve(id);
    };
  });
}

/**
 * Get all filter presets
 */
export async function getFilterPresets(): Promise<FilterPreset[]> {
  if (!window.indexedDB) return [];

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('trading-journal-filters')) {
        resolve([]);
        return;
      }

      const tx = db.transaction(['trading-journal-filters'], 'readonly');
      const store = tx.objectStore('trading-journal-filters');
      const getAllRequest = store.getAll();

      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
    };
  });
}

/**
 * Delete filter preset
 */
export async function deleteFilterPreset(presetId: string): Promise<void> {
  if (!window.indexedDB) return;

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['trading-journal-filters'], 'readwrite');
      const store = tx.objectStore('trading-journal-filters');
      const deleteRequest = store.delete(presetId);

      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve();
    };
  });
}
