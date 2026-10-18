'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { BrokerId } from '@/lib/brokers';
import type { Currency } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export interface BrokerAccount {
  id: string;
  brokerId: BrokerId;
  name: string;
  accountNumberLast4: string | null;
  currency: Currency;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

type ActiveAccountId = 'all' | string;

interface AccountsContextType {
  accounts: BrokerAccount[];
  activeAccountId: ActiveAccountId;
  activeAccount: BrokerAccount | null;
  defaultAccountId: string | null;
  isLoading: boolean;
  error: string | null;
  setActiveAccountId: (accountId: ActiveAccountId) => void;
  refreshAccounts: () => Promise<void>;
  createAccount: (input: {
    brokerId: BrokerId;
    name: string;
    accountReference?: string;
    currency: Currency;
  }) => Promise<BrokerAccount>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

function storageKey(userId: number) {
  return `trading-journal-active-broker-account:${userId}`;
}

function readStoredAccount(userId: number): ActiveAccountId {
  try {
    return window.localStorage.getItem(storageKey(userId)) || 'all';
  } catch {
    return 'all';
  }
}

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<ActiveAccountId>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setActiveAccountId = useCallback((accountId: ActiveAccountId) => {
    const validId = accountId === 'all' || accounts.some((account) => account.id === accountId) ? accountId : 'all';
    setActiveAccountIdState(validId);
    if (user) {
      try {
        window.localStorage.setItem(storageKey(user.id), validId);
      } catch {
        // The selection continues for this session even when browser storage is unavailable.
      }
    }
  }, [accounts, user]);

  const refreshAccounts = useCallback(async () => {
    if (isAuthLoading) return;
    if (!user) {
      setAccounts([]);
      setActiveAccountIdState('all');
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/broker-accounts', { credentials: 'include', cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Failed to load broker accounts.');
      const loadedAccounts = Array.isArray(payload.accounts) ? payload.accounts as BrokerAccount[] : [];
      setAccounts(loadedAccounts);
      const stored = readStoredAccount(user.id);
      const nextActive = stored === 'all' || loadedAccounts.some((account) => account.id === stored) ? stored : 'all';
      setActiveAccountIdState(nextActive);
      setError(null);
    } catch (err) {
      setAccounts([]);
      setActiveAccountIdState('all');
      setError(err instanceof Error ? err.message : 'Failed to load broker accounts.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthLoading, user]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refreshAccounts();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshAccounts]);

  const createAccount = useCallback(async (input: {
    brokerId: BrokerId;
    name: string;
    accountReference?: string;
    currency: Currency;
  }) => {
    const response = await fetch('/api/broker-accounts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.account) throw new Error(payload?.error || 'Failed to create broker account.');

    const account = payload.account as BrokerAccount;
    setAccounts((current) => [...current, account]);
    setActiveAccountIdState(account.id);
    if (user) {
      try {
        window.localStorage.setItem(storageKey(user.id), account.id);
      } catch {
        // no-op
      }
    }
    return account;
  }, [user]);

  const activeAccount = activeAccountId === 'all'
    ? null
    : accounts.find((account) => account.id === activeAccountId) || null;
  const defaultAccountId = accounts.find((account) => account.isDefault)?.id || accounts[0]?.id || null;

  return (
    <AccountsContext.Provider value={{
      accounts,
      activeAccountId,
      activeAccount,
      defaultAccountId,
      isLoading,
      error,
      setActiveAccountId,
      refreshAccounts,
      createAccount,
    }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) throw new Error('useAccounts must be used within an AccountsProvider');
  return context;
}
