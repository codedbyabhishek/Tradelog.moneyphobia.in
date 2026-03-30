'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Trade, TradeFilter } from './types';
import { useAuth } from '@/lib/auth-context';

interface FiltersContextType {
  filters: TradeFilter[];
  addFilter: (filter: TradeFilter) => void;
  deleteFilter: (id: string) => void;
  updateFilter: (id: string, filter: TradeFilter) => void;
  applyFilter: (filter: TradeFilter, trades: Trade[]) => Trade[];
  error: string | null;
  clearError: () => void;
}

export const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

async function filtersRequest(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const body = await res.json();
      message = body?.error || message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return res;
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [filters, setFilters] = useState<TradeFilter[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (isAuthLoading) return;
      if (!user) {
        setFilters([]);
        setError(null);
        return;
      }

      try {
        const res = await filtersRequest('/api/filters', { method: 'GET' });
        const data = await res.json();
        setFilters((data.filters || []) as TradeFilter[]);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load filters';
        setError(message);
      }
    };

    void initialize();
  }, [user, isAuthLoading]);

  const addFilter = (filter: TradeFilter) => {
    if (!filter.id || !filter.name) {
      setError('Invalid filter: missing required fields');
      return;
    }

    setFilters((prev) => [filter, ...prev]);
    void filtersRequest('/api/filters', {
      method: 'POST',
      body: JSON.stringify({ filter }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to save filter');
    });
  };

  const deleteFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));

    void filtersRequest(`/api/filters/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to delete filter');
    });
  };

  const updateFilter = (id: string, updatedFilter: TradeFilter) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? updatedFilter : f)));

    void filtersRequest(`/api/filters/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ filter: updatedFilter }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to update filter');
    });
  };

  const applyFilter = (filter: TradeFilter, trades: Trade[]): Trade[] => {
    return trades.filter((trade) => {
      if (filter.dateRange) {
        const tradeDate = new Date(trade.date).getTime();
        const startDate = new Date(filter.dateRange.start).getTime();
        const endDate = new Date(filter.dateRange.end).getTime();
        if (tradeDate < startDate || tradeDate > endDate) return false;
      }

      if (filter.symbols && filter.symbols.length > 0 && !filter.symbols.includes(trade.symbol)) return false;
      if (filter.setupNames && filter.setupNames.length > 0 && !filter.setupNames.includes(trade.setupName)) return false;
      if (filter.tradeTypes && filter.tradeTypes.length > 0 && !filter.tradeTypes.includes(trade.tradeType)) return false;
      if (filter.currencyFilter && filter.currencyFilter.length > 0 && !filter.currencyFilter.includes(trade.currency)) return false;
      if (filter.minPnL !== undefined && trade.pnl < filter.minPnL) return false;
      if (filter.maxPnL !== undefined && trade.pnl > filter.maxPnL) return false;
      if (filter.minRFactor !== undefined && trade.rFactor < filter.minRFactor) return false;
      if (filter.maxRFactor !== undefined && trade.rFactor > filter.maxRFactor) return false;

      if (filter.outcomeFilter && filter.outcomeFilter.length > 0) {
        const outcome = trade.pnl > 0 ? 'W' : trade.pnl < 0 ? 'L' : 'BE';
        if (!filter.outcomeFilter.includes(outcome)) return false;
      }

      if (filter.ruleFollowedOnly && !trade.ruleFollowed) return false;

      if (filter.emotionTags && filter.emotionTags.length > 0) {
        const emotions = [trade.emotionEntry, trade.emotionExit].filter(Boolean);
        if (!emotions.some((e) => filter.emotionTags?.includes(e as any))) return false;
      }

      if (filter.sessions && filter.sessions.length > 0) {
        if (!filter.sessions.includes(trade.session as any)) return false;
      }

      return true;
    });
  };

  const clearError = () => setError(null);

  return (
    <FiltersContext.Provider value={{ filters, addFilter, deleteFilter, updateFilter, applyFilter, error, clearError }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
