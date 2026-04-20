'use client';

import type { AppBootstrapData } from '@/lib/bootstrap';

const BOOTSTRAP_STORAGE_KEY = 'td-auth-bootstrap';
const AUTH_USER_STORAGE_KEY = 'td-auth-user';
const RECENT_AUTH_STORAGE_KEY = 'td-recent-auth';
let inMemoryBootstrap: AppBootstrapData | null = null;

export interface CachedAuthUser {
  id: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

export function storeBootstrap(data: AppBootstrapData | null) {
  if (!isBrowser()) return;

  inMemoryBootstrap = data;

  if (!data) {
    window.sessionStorage.removeItem(BOOTSTRAP_STORAGE_KEY);
    return;
  }

  try {
    window.sessionStorage.setItem(BOOTSTRAP_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    window.sessionStorage.removeItem(BOOTSTRAP_STORAGE_KEY);
    console.warn('[client-bootstrap] Failed to persist bootstrap cache, using in-memory fallback.', error);
  }
}

export function readBootstrap(userId?: number | null): AppBootstrapData | null {
  if (!isBrowser()) return null;

  if (inMemoryBootstrap) {
    if (!userId || inMemoryBootstrap.userId === userId) {
      return inMemoryBootstrap;
    }
  }

  const raw = window.sessionStorage.getItem(BOOTSTRAP_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AppBootstrapData;
    if (!parsed || typeof parsed.userId !== 'number') return null;
    if (userId && parsed.userId !== userId) return null;
    inMemoryBootstrap = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearBootstrap() {
  if (!isBrowser()) return;
  inMemoryBootstrap = null;
  window.sessionStorage.removeItem(BOOTSTRAP_STORAGE_KEY);
}

export function markRecentAuth() {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(RECENT_AUTH_STORAGE_KEY, '1');
}

export function consumeRecentAuth() {
  if (!isBrowser()) return false;
  const value = window.sessionStorage.getItem(RECENT_AUTH_STORAGE_KEY) === '1';
  window.sessionStorage.removeItem(RECENT_AUTH_STORAGE_KEY);
  return value;
}

export function storeAuthUser(user: CachedAuthUser | null) {
  if (!isBrowser()) return;

  if (!user) {
    window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function readAuthUser(): CachedAuthUser | null {
  if (!isBrowser()) return null;

  const raw = window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedAuthUser;
    if (!parsed || typeof parsed.id !== 'number' || typeof parsed.email !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthUser() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.sessionStorage.removeItem(RECENT_AUTH_STORAGE_KEY);
}
