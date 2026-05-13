'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthUser,
  clearBootstrap,
  consumeRecentAuth,
  markRecentAuth,
  rememberAuthUser,
  readAuthUser,
  readBootstrap,
  storeAuthUser,
  storeBootstrap,
} from '@/lib/client-bootstrap';
import type { AppBootstrapData } from '@/lib/bootstrap';
import { trackEvent } from '@/lib/analytics';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

interface AuthPayload {
  user: AuthUser | null;
  bootstrap?: AppBootstrapData;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_API_TIMEOUT_MS = 30000;

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

function normalizeClientError(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request took too long. Please try again.';
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = AUTH_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => readAuthUser());
  const [hasRecentAuth] = useState(() => {
    const cachedUser = readAuthUser();
    return Boolean(cachedUser && consumeRecentAuth());
  });
  const [isLoading, setIsLoading] = useState(() => !(hasRecentAuth || Boolean(readAuthUser())));
  const [error, setError] = useState<string | null>(null);

  const refreshSession = async () => {
    try {
      const cachedUser = readAuthUser();
      const cachedBootstrap = cachedUser ? readBootstrap(cachedUser.id) : null;
      const res = await fetchWithTimeout('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: cachedUser && cachedBootstrap?.userId === cachedUser.id
          ? { 'x-bootstrap-cache-user': String(cachedUser.id) }
          : undefined,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setCurrentUser(null);
          clearAuthUser();
          clearBootstrap();
        } else {
          setError(await parseApiError(res, 'Failed to restore your session.'));
        }
        return;
      }

      const data = await res.json();
      setCurrentUser(data.user || null);
      storeAuthUser(data.user || null);
      if (!data.user) {
        storeBootstrap(null);
      } else if ('bootstrap' in data) {
        storeBootstrap(data.bootstrap || null);
      }
      setError(null);
    } catch (error) {
      setError(normalizeClientError(error, 'Failed to restore your session.'));
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await refreshSession();
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const message = await parseApiError(res, 'Failed to login.');
        setError(message);
        throw new Error(message);
      }

      const data = (await res.json()) as AuthPayload;
      setCurrentUser(data.user || null);
      storeAuthUser(data.user || null);
      rememberAuthUser(data.user || null);
      storeBootstrap(data.user ? data.bootstrap || null : null);
      markRecentAuth();
      setError(null);
      trackEvent('login', {
        method: 'email',
      });
    } catch (error) {
      const message = normalizeClientError(error, 'Failed to login.');
      setError(message);
      throw new Error(message);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await fetchWithTimeout('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const message = await parseApiError(res, 'Failed to create account.');
        setError(message);
        throw new Error(message);
      }

      const data = (await res.json()) as AuthPayload;
      setCurrentUser(data.user || null);
      storeAuthUser(data.user || null);
      rememberAuthUser(data.user || null);
      storeBootstrap(data.user ? data.bootstrap || null : null);
      markRecentAuth();
      setError(null);
      trackEvent('sign_up', {
        method: 'email',
      });
    } catch (error) {
      const message = normalizeClientError(error, 'Failed to create account.');
      setError(message);
      throw new Error(message);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await fetchWithTimeout('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      if (!res.ok) {
        const message = await parseApiError(res, 'Failed to sign in with Google.');
        setError(message);
        throw new Error(message);
      }

      const data = (await res.json()) as AuthPayload;
      setCurrentUser(data.user || null);
      storeAuthUser(data.user || null);
      rememberAuthUser(data.user || null);
      storeBootstrap(data.user ? data.bootstrap || null : null);
      markRecentAuth();
      setError(null);
      trackEvent('login', {
        method: 'google',
      });
    } catch (error) {
      const message = normalizeClientError(error, 'Failed to sign in with Google.');
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    const res = await fetchWithTimeout('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const message = await parseApiError(res, 'Failed to logout.');
      setError(message);
      throw new Error(message);
    }

    setCurrentUser(null);
    clearAuthUser();
    clearBootstrap();
    setError(null);
  };

  const clearError = () => setError(null);

  const value = useMemo(
    () => ({ user: currentUser, isLoading, error, login, signup, loginWithGoogle, logout, refreshSession, clearError }),
    [currentUser, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
