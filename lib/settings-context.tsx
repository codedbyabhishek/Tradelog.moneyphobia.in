'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BillingState, CapitalAdjustment, Currency } from './types';
import { useAuth } from '@/lib/auth-context';
import { clearBootstrap, readBootstrap, storeBootstrap } from '@/lib/client-bootstrap';
import type { AppBootstrapData } from '@/lib/bootstrap';
import { DEFAULT_BILLING_STATE, normalizeBillingState } from '@/lib/subscription';
import { createDefaultTradingPlan, normalizeTradingPlan, TRADING_PLAN_SETTING_KEY, type TradingPlan } from '@/lib/trading-plan';

interface SettingsContextType {
  baseCurrency: Currency;
  setBaseCurrency: (currency: Currency) => Promise<void>;
  startingBalance: number;
  setStartingBalance: (balance: number) => Promise<void>;
  capitalAdjustments: CapitalAdjustment[];
  saveCapitalAdjustments: (adjustments: CapitalAdjustment[]) => Promise<void>;
  billingState: BillingState;
  saveBillingState: (billing: BillingState) => Promise<void>;
  tradingPlan: TradingPlan;
  saveTradingPlan: (plan: TradingPlan) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_BASE_CURRENCY: Currency = 'INR';
const DEFAULT_STARTING_BALANCE = 0;
const DEFAULT_CAPITAL_ADJUSTMENTS: CapitalAdjustment[] = [];

function normalizeCapitalAdjustments(input: unknown): CapitalAdjustment[] {
  if (!Array.isArray(input)) {
    return DEFAULT_CAPITAL_ADJUSTMENTS;
  }

  return input
    .filter((item: any) => item && item.id && item.date && Number.isFinite(Number(item.amount)))
    .map((item: any) => ({
      id: String(item.id),
      date: String(item.date),
      type: item.type === 'withdrawal' ? 'withdrawal' : 'deposit',
      amount: Number(item.amount),
      note: item.note ? String(item.note) : '',
    }));
}

function updateBootstrapSettings(
  userId: number,
  updater: (settings: AppBootstrapData['settings']) => AppBootstrapData['settings']
) {
  const bootstrap = readBootstrap(userId);
  if (!bootstrap) return;

  storeBootstrap({
    ...bootstrap,
    settings: updater(bootstrap.settings || {}),
  });
}

async function persistSetting(key: string, value: unknown) {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ key, value }),
  });

  if (!res.ok) {
    let message = 'Failed to save settings';
    try {
      const body = await res.json();
      message = body?.error || message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [baseCurrency, setBaseCurrencyState] = useState<Currency>(DEFAULT_BASE_CURRENCY);
  const [startingBalance, setStartingBalanceState] = useState<number>(DEFAULT_STARTING_BALANCE);
  const [capitalAdjustments, setCapitalAdjustmentsState] = useState<CapitalAdjustment[]>(DEFAULT_CAPITAL_ADJUSTMENTS);
  const [billingState, setBillingState] = useState<BillingState>(DEFAULT_BILLING_STATE);
  const [tradingPlan, setTradingPlan] = useState<TradingPlan>(() => createDefaultTradingPlan());

  useEffect(() => {
    const load = async () => {
      if (isAuthLoading) return;
      if (!user) {
        setBaseCurrencyState(DEFAULT_BASE_CURRENCY);
        setStartingBalanceState(DEFAULT_STARTING_BALANCE);
        setCapitalAdjustmentsState(DEFAULT_CAPITAL_ADJUSTMENTS);
        setBillingState(DEFAULT_BILLING_STATE);
        setTradingPlan(createDefaultTradingPlan());
        clearBootstrap();
        return;
      }

      const bootstrap = readBootstrap(user.id);
      if (bootstrap) {
        const storedCurrency = bootstrap.settings?.baseCurrency;
        const storedStartingBalance = Number(bootstrap.settings?.startingBalance);
        const storedCapitalAdjustments = normalizeCapitalAdjustments(bootstrap.settings?.capitalAdjustments);

        if (storedCurrency) {
          setBaseCurrencyState(storedCurrency as Currency);
        } else {
          setBaseCurrencyState(DEFAULT_BASE_CURRENCY);
        }

        setStartingBalanceState(Number.isFinite(storedStartingBalance) ? storedStartingBalance : DEFAULT_STARTING_BALANCE);
        setCapitalAdjustmentsState(storedCapitalAdjustments);
        setBillingState(normalizeBillingState(bootstrap.settings?.billing));
        setTradingPlan(normalizeTradingPlan(bootstrap.settings?.tradingPlan));
        return;
      }

      try {
        const res = await fetch('/api/settings', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const storedCurrency = data?.settings?.baseCurrency;
        const storedStartingBalance = Number(data?.settings?.startingBalance);
        const storedCapitalAdjustments = normalizeCapitalAdjustments(data?.settings?.capitalAdjustments);
        if (storedCurrency) {
          setBaseCurrencyState(storedCurrency as Currency);
        }
        if (Number.isFinite(storedStartingBalance)) {
          setStartingBalanceState(storedStartingBalance);
        }
        setBillingState(normalizeBillingState(data?.settings?.billing));
        const storedTradingPlan = normalizeTradingPlan(data?.settings?.tradingPlan);
        setTradingPlan(storedTradingPlan);
        setCapitalAdjustmentsState(storedCapitalAdjustments);

        if (user) {
          updateBootstrapSettings(user.id, (settings) => ({
            ...settings,
            ...(storedCurrency ? { baseCurrency: storedCurrency as Currency } : {}),
            ...(Number.isFinite(storedStartingBalance) ? { startingBalance: storedStartingBalance } : {}),
            capitalAdjustments: storedCapitalAdjustments,
            billing: normalizeBillingState(data?.settings?.billing),
            tradingPlan: storedTradingPlan,
          }));
        }
      } catch (error) {
        console.error('[SettingsContext] Failed to load settings:', error);
      }
    };

    void load();
  }, [user, isAuthLoading]);

  const setBaseCurrency = async (currency: Currency) => {
    if (currency === baseCurrency) return;
    const previousCurrency = baseCurrency;
    setBaseCurrencyState(currency);
    if (user) {
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        baseCurrency: currency,
      }));
    }

    if (!user) return;

    try {
      await persistSetting('baseCurrency', currency);
    } catch (err) {
      setBaseCurrencyState(previousCurrency);
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        baseCurrency: previousCurrency,
      }));
      throw err;
    }
  };

  const setStartingBalance = async (balance: number) => {
    const normalizedBalance = Number.isFinite(balance) ? balance : DEFAULT_STARTING_BALANCE;
    if (normalizedBalance === startingBalance) return;
    const previousBalance = startingBalance;
    setStartingBalanceState(normalizedBalance);
    if (user) {
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        startingBalance: normalizedBalance,
      }));
    }

    if (!user) return;

    try {
      await persistSetting('startingBalance', normalizedBalance);
    } catch (err) {
      setStartingBalanceState(previousBalance);
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        startingBalance: previousBalance,
      }));
      throw err;
    }
  };

  const saveCapitalAdjustments = async (adjustments: CapitalAdjustment[]) => {
    const normalized = [...adjustments]
      .filter((item) => item.id && item.date && Number.isFinite(item.amount))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (JSON.stringify(normalized) === JSON.stringify(capitalAdjustments)) return;

    const previousAdjustments = capitalAdjustments;
    setCapitalAdjustmentsState(normalized);
    if (user) {
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        capitalAdjustments: normalized,
      }));
    }

    if (!user) return;

    try {
      await persistSetting('capitalAdjustments', normalized);
    } catch (err) {
      setCapitalAdjustmentsState(previousAdjustments);
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        capitalAdjustments: previousAdjustments,
      }));
      throw err;
    }
  };

  const saveBillingState = async (billing: BillingState) => {
    const normalized = normalizeBillingState(billing);
    if (JSON.stringify(normalized) === JSON.stringify(billingState)) return;
    const previousBilling = billingState;
    setBillingState(normalized);
    if (user) {
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        billing: normalized,
      }));
    }

    if (!user) return;

    try {
      await persistSetting('billing', normalized);
    } catch (err) {
      setBillingState(previousBilling);
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        billing: previousBilling,
      }));
      throw err;
    }
  };

  const saveTradingPlan = async (plan: TradingPlan) => {
    const normalized = normalizeTradingPlan(plan);
    if (JSON.stringify(normalized) === JSON.stringify(tradingPlan)) return;

    const previousPlan = tradingPlan;
    setTradingPlan(normalized);
    if (user) {
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        tradingPlan: normalized,
      }));
    }

    if (!user) return;

    try {
      await persistSetting(TRADING_PLAN_SETTING_KEY, normalized);
    } catch (err) {
      setTradingPlan(previousPlan);
      updateBootstrapSettings(user.id, (settings) => ({
        ...settings,
        tradingPlan: previousPlan,
      }));
      throw err;
    }
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
        tradingPlan,
        saveTradingPlan,
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
