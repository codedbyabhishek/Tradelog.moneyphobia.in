'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Currency } from './types';
import { useAuth } from '@/lib/auth-context';

interface SettingsContextType {
  baseCurrency: Currency;
  setBaseCurrency: (currency: Currency) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_BASE_CURRENCY: Currency = 'INR';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [baseCurrency, setBaseCurrencyState] = useState<Currency>(DEFAULT_BASE_CURRENCY);

  useEffect(() => {
    const load = async () => {
      if (isAuthLoading) return;
      if (!user) {
        setBaseCurrencyState(DEFAULT_BASE_CURRENCY);
        return;
      }

      try {
        const res = await fetch('/api/settings', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const stored = data?.settings?.baseCurrency;
        if (stored) {
          setBaseCurrencyState(stored as Currency);
        }
      } catch (error) {
        console.error('[SettingsContext] Failed to load settings:', error);
      }
    };

    void load();
  }, [user, isAuthLoading]);

  const setBaseCurrency = (currency: Currency) => {
    setBaseCurrencyState(currency);

    if (!user) return;

    void fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key: 'baseCurrency', value: currency }),
    }).catch((err) => {
      console.error('[SettingsContext] Failed to save settings:', err);
    });
  };

  return <SettingsContext.Provider value={{ baseCurrency, setBaseCurrency }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
