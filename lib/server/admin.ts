import type { AuthUser } from '@/lib/server/auth';
import type { BillingState } from '@/lib/types';

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const adminEmails = parseAdminEmails();

  if (adminEmails.length === 0) {
    return process.env.NODE_ENV !== 'production';
  }

  return adminEmails.includes(normalized);
}

export function canAccessAdmin(user: AuthUser | null) {
  return Boolean(user && isAdminEmail(user.email));
}

export function getAdminBillingOverride(email: string | null | undefined): BillingState | null {
  if (!isAdminEmail(email)) return null;

  return {
    plan: 'pro',
    status: 'active',
    billingCycle: 'yearly',
    startedAt: null,
    renewsAt: null,
    trialEndsAt: null,
  };
}
