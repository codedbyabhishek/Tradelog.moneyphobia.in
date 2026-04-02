'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BillingState, CapitalAdjustment, Currency } from './types';
import { useAuth } from '@/lib/auth-context';
import { clearBootstrap, readBootstrap } from '@/lib/client-bootstrap';
import { DEFAULT_BILLING_STATE, normalizeBillingState } from '@/lib/subscription';

interface SettingsContextType {
  baseCurrency: Currency;
  setBaseCurrency: (currency: Currency) => void;
  startingBalance: number;
  setStartingBalance: (balance: number) => void;
  capitalAdjustments: CapitalAdjustment[];
  saveCapitalAdjustments: (adjustments: CapitalAdjustment[]) => void;
  billingState: BillingState;
  saveBillingState: (billing: BillingState) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_BASE_CURRENCY: Currency = 'INR';
const DEFAULT_STARTING_BALANCE = 0;
const DEFAULT_CAPITAL_ADJUSTMENTS: CapitalAdjustment[] = [];

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [baseCurrency, setBaseCurrencyState] = useState<Currency>(DEFAULT_BASE_CURRENCY);
  const [startingBalance, setStartingBalanceState] = useState<number>(DEFAULT_STARTING_BALANCE);
  const [capitalAdjustments, setCapitalAdjustmentsState] = useState<CapitalAdjustment[]>(DEFAULT_CAPITAL_ADJUSTMENTS);
  const [billingState, setBillingState] = useState<BillingState>(DEFAULT_BILLING_STATE);

  useEffect(() => {
    const load = async () => {
      if (isAuthLoading) return;
      if (!user) {
        setBaseCurrencyState(DEFAULT_BASE_CURRENCY);
        setStartingBalanceState(DEFAULT_STARTING_BALANCE);
        setCapitalAdjustmentsState(DEFAULT_CAPITAL_ADJUSTMENTS);
        setBillingState(DEFAULT_BILLING_STATE);
        clearBootstrap();
        return;
      }

      const bootstrap = readBootstrap(user.id);
      if (bootstrap) {
        const storedCurrency = bootstrap.settings?.baseCurrency;
        const storedStartingBalance = Number(bootstrap.settings?.startingBalance);
        const storedCapitalAdjustments = Array.isArray(bootstrap.settings?.capitalAdjustments)
          ? bootstrap.settings.capitalAdjustments
          : DEFAULT_CAPITAL_ADJUSTMENTS;

        if (storedCurrency) {
          setBaseCurrencyState(storedCurrency as Currency);
        } else {
          setBaseCurrencyState(DEFAULT_BASE_CURRENCY);
        }

        setStartingBalanceState(Number.isFinite(storedStartingBalance) ? storedStartingBalance : DEFAULT_STARTING_BALANCE);
        setCapitalAdjustmentsState(
          storedCapitalAdjustments
            .filter((item: any) => item && item.id && item.date && Number.isFinite(Number(item.amount)))
            .map((item: any) => ({
              id: String(item.id),
              date: String(item.date),
              type: item.type === 'withdrawal' ? 'withdrawal' : 'deposit',
              amount: Number(item.amount),
              note: item.note ? String(item.note) : '',
            }))
        );
        setBillingState(normalizeBillingState(bootstrap.settings?.billing));
        return;
      }

      try {
        const res = await fetch('/api/settings', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const storedCurrency = data?.settings?.baseCurrency;
        const storedStartingBalance = Number(data?.settings?.startingBalance);
        const storedCapitalAdjustments = Array.isArray(data?.settings?.capitalAdjustments)
          ? data.settings.capitalAdjustments
          : DEFAULT_CAPITAL_ADJUSTMENTS;
        if (storedCurrency) {
          setBaseCurrencyState(storedCurrency as Currency);
        }
        if (Number.isFinite(storedStartingBalance)) {
          setStartingBalanceState(storedStartingBalance);
        }
        setBillingState(normalizeBillingState(data?.settings?.billing));
        setCapitalAdjustmentsState(
          storedCapitalAdjustments
            .filter((item: any) => item && item.id && item.date && Number.isFinite(Number(item.amount)))
            .map((item: any) => ({
              id: String(item.id),
              date: String(item.date),
              type: item.type === 'withdrawal' ? 'withdrawal' : 'deposit',
              amount: Number(item.amount),
              note: item.note ? String(item.note) : '',
            }))
        );
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

  const setStartingBalance = (balance: number) => {
    const normalizedBalance = Number.isFinite(balance) ? balance : DEFAULT_STARTING_BALANCE;
    setStartingBalanceState(normalizedBalance);

    if (!user) return;

    void fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key: 'startingBalance', value: normalizedBalance }),
    }).catch((err) => {
      console.error('[SettingsContext] Failed to save settings:', err);
    });
  };

  const saveCapitalAdjustments = (adjustments: CapitalAdjustment[]) => {
    const normalized = [...adjustments]
      .filter((item) => item.id && item.date && Number.isFinite(item.amount))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setCapitalAdjustmentsState(normalized);

    if (!user) return;

    void fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key: 'capitalAdjustments', value: normalized }),
    }).catch((err) => {
      console.error('[SettingsContext] Failed to save settings:', err);
    });
  };

  const saveBillingState = (billing: BillingState) => {
    const normalized = normalizeBillingState(billing);
    setBillingState(normalized);

    if (!user) return;

    void fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key: 'billing', value: normalized }),
    }).catch((err) => {
      console.error('[SettingsContext] Failed to save billing settings:', err);
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        baseCurrency,
        setBaseCurrency,
        startingBalance,
        setStartingBalance,
        capitalAdjustments,
        saveCapitalAdjustments,
        billingState,
        saveBillingState,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
