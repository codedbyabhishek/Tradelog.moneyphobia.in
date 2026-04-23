'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Currency, Trade } from './types';
import { convertToBaseCurrency, getExchangeRateToBase, getTradeResultLabel } from './trade-utils';
import { useAuth } from '@/lib/auth-context';
import { clearBootstrap, readBootstrap } from '@/lib/client-bootstrap';
import { useSettings } from '@/lib/settings-context';
import { isProPlan, SUBSCRIPTION_LIMITS } from '@/lib/subscription';

interface TradeContextType {
  trades: Trade[];
  addTrade: (trade: Trade) => void;
  deleteTrade: (id: string) => void;
  clearTrades: () => Promise<void>;
  updateTrade: (id: string, trade: Trade) => void;
  refreshTrades: () => Promise<void>;
  exportJSON: () => void;
  exportCSV: () => void;
  importJSON: (file: File) => Promise<void>;
  error: string | null;
  clearError: () => void;
  storagePercentage: number;
}

export const TradeContext = createContext<TradeContextType | undefined>(undefined);

function normalizeTrade(trade: any): Trade {
  if (trade.currency && trade.pnlBase !== undefined) {
    return {
      ...trade,
      isFavorite: Boolean(trade.isFavorite),
      isWin: trade.pnl > 0,
      tradeResult: trade.tradeResult || getTradeResultLabel(trade.pnl),
    };
  }

  const currency: Currency = trade.currency || 'INR';
  const exchangeRate = getExchangeRateToBase(currency);
  const pnlBase = convertToBaseCurrency(trade.pnl, currency, exchangeRate);

  return {
    ...trade,
    isFavorite: Boolean(trade.isFavorite),
    currency,
    pnlBase,
    exchangeRate,
    isWin: trade.pnl > 0,
    tradeResult: trade.tradeResult || getTradeResultLabel(trade.pnl),
  };
}

async function apiRequest(url: string, init?: RequestInit) {
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

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { billingState } = useSettings();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [storagePercentage] = useState(0);

  const refreshTrades = useCallback(async () => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setTrades([]);
      setError(null);
      clearBootstrap();
      return;
    }

    const bootstrap = readBootstrap(user.id);
    if (bootstrap) {
      setTrades(bootstrap.trades.map(normalizeTrade));
      setError(null);
      return;
    }

    try {
      const res = await apiRequest('/api/trades', { method: 'GET' });
      const data = await res.json();
      const loadedTrades = Array.isArray(data.trades) ? data.trades.map(normalizeTrade) : [];
      setTrades(loadedTrades);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trades';
      setError(message);
    }
  }, [isAuthLoading, user]);

  useEffect(() => {
    void refreshTrades();
  }, [refreshTrades]);

  const addTrade = (trade: Trade) => {
    try {
      const pro = isProPlan(billingState);
      const tradeLimit = SUBSCRIPTION_LIMITS[pro ? 'pro' : 'free'].trades;
      if (trades.length >= tradeLimit) {
        throw new Error('Free plan limit reached. Upgrade to Pro to add more trades.');
      }

      if (!trade.id || !trade.date || !trade.symbol) {
        throw new Error('Invalid trade data: missing required fields');
      }

      const normalized = normalizeTrade(trade);
      setTrades((prev) => [...prev, normalized]);

      void apiRequest('/api/trades', {
        method: 'POST',
        body: JSON.stringify({ trade: normalized }),
      }).catch((err) => {
        console.error('[TradeContext] Failed to save trade:', err);
        setError(err instanceof Error ? err.message : 'Failed to save trade');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add trade';
      setError(message);
    }
  };

  const deleteTrade = (id: string) => {
    try {
      if (!id) {
        throw new Error('Trade ID is required');
      }

      setTrades((prev) => prev.filter((t) => t.id !== id));

      void apiRequest(`/api/trades/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch((err) => {
        console.error('[TradeContext] Failed to delete trade:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete trade');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete trade';
      setError(message);
    }
  };

  const clearTrades = async () => {
    try {
      setTrades([]);
      await apiRequest('/api/trades', {
        method: 'DELETE',
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear trades';
      setError(message);
      await refreshTrades();
      throw err;
    }
  };

  const updateTrade = (id: string, updatedTrade: Trade) => {
    try {
      if (!id) {
        throw new Error('Trade ID is required');
      }
      if (!updatedTrade.id || !updatedTrade.date || !updatedTrade.symbol) {
        throw new Error('Invalid trade data');
      }

      const normalized = normalizeTrade(updatedTrade);
      setTrades((prev) => prev.map((t) => (t.id === id ? normalized : t)));

      void apiRequest(`/api/trades/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ trade: normalized }),
      }).catch((err) => {
        console.error('[TradeContext] Failed to update trade:', err);
        setError(err instanceof Error ? err.message : 'Failed to update trade');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update trade';
      setError(message);
    }
  };

  const exportJSON = () => {
    try {
      if (trades.length === 0) {
        setError('No trades to export');
        return;
      }

      const data = JSON.stringify(trades, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-journal-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export trades';
      setError(message);
    }
  };

  const exportCSV = () => {
    try {
      if (trades.length === 0) {
        setError('No trades to export');
        return;
      }

      const headers = [
        'Date',
        'Day',
        'Symbol',
        'Type',
        'Setup',
        'Position',
        'Currency',
        'Entry',
        'Exit',
        'Stop Loss',
        'Quantity',
        'Fees',
        'P&L',
        'P&L (Base)',
        'R-Factor',
        'Outcome',
        'Confidence',
        'Time Frame',
        'Market Trend',
        'Setup Type',
        'Volume',
        'EMA Touch',
        'Risk Reward Ratio',
        'Planned R Target',
        'Market Condition',
        'Rule Followed',
        'Rule Violations',
        'Mistake Tag',
        'Limit',
        'Exit Level',
      ];

      const rows = trades.map((t) => {
        const outcome = t.tradeResult || getTradeResultLabel(t.pnl);
        return [
          t.date,
          t.dayOfWeek,
          t.symbol,
          t.tradeType,
          t.setupName,
          t.position,
          t.currency || 'USD',
          t.entryPrice ? t.entryPrice.toFixed(2) : 'N/A',
          t.exitPrice ? t.exitPrice.toFixed(2) : 'N/A',
          t.stopLoss.toFixed(2),
          String(t.quantity),
          t.fees.toFixed(2),
          t.pnl.toFixed(2),
          t.pnlBase?.toFixed(2) || t.pnl.toFixed(2),
          t.rFactor.toFixed(2),
          outcome,
          String(t.confidence),
          t.timeFrame || '',
          t.marketTrend || '',
          t.setupType || '',
          t.volumeProfile || '',
          t.emaTouch === undefined ? '' : t.emaTouch ? 'Yes' : 'No',
          t.riskRewardRatio ?? '',
          t.plannedRTarget ?? '',
          t.marketCondition || '',
          t.ruleFollowed ? 'Yes' : 'No',
          (t.ruleViolations || []).join(';'),
          t.mistakeTag || '',
          t.limit || '',
          t.exit || '',
        ];
      });

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-journal-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export trades';
      setError(message);
    }
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error('Invalid JSON format: Expected an array of trades');
      }

      const validTrades = imported.filter((trade: any) => {
        return trade.id && trade.date && trade.symbol && typeof trade.pnl === 'number';
      });

      if (validTrades.length === 0) {
        throw new Error('No valid trades found in file');
      }

      const migratedTrades = validTrades.map(normalizeTrade);

      await Promise.all(
        migratedTrades.map((trade: Trade) =>
          apiRequest('/api/trades', {
            method: 'POST',
            body: JSON.stringify({ trade }),
          })
        )
      );

      setTrades((prev) => [...prev, ...migratedTrades]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during import';
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <TradeContext.Provider
      value={{
        trades,
        addTrade,
        deleteTrade,
        clearTrades,
        updateTrade,
        refreshTrades,
        exportJSON,
        exportCSV,
        importJSON,
        error,
        clearError,
        storagePercentage,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTrades must be used within a TradeProvider');
  }
  return context;
}
