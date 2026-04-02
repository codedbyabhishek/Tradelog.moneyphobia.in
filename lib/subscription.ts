import type { BillingState, SubscriptionPlan } from '@/lib/types';

export const DEFAULT_BILLING_STATE: BillingState = {
  plan: 'free',
  status: 'active',
  billingCycle: 'monthly',
  startedAt: null,
  renewsAt: null,
  trialEndsAt: null,
};

export const SUBSCRIPTION_LIMITS = {
  free: {
    trades: 100,
    ideas: 20,
    screenshots: 25,
    exports: false,
    dhanSync: false,
    advancedAnalytics: false,
    emotionAnalyzer: false,
  },
  pro: {
    trades: Infinity,
    ideas: Infinity,
    screenshots: Infinity,
    exports: true,
    dhanSync: true,
    advancedAnalytics: true,
    emotionAnalyzer: true,
  },
} as const;

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: '₹0',
    priceYearly: '₹0',
    description: 'Best for trying the journal and building a basic review habit.',
    cta: 'Start Free',
    features: [
      'Up to 100 trades',
      'Up to 20 trade ideas',
      'Basic dashboard and analytics',
      'Limited screenshots and favorites',
      'Manual trade journaling',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: '₹499/mo',
    priceYearly: '₹4,999/yr',
    description: 'Built for active traders who want deeper review, sync, and analytics.',
    cta: 'Upgrade to Pro',
    features: [
      'Unlimited trades and ideas',
      'Dhan broker sync',
      'Advanced analytics and emotion analyzer',
      'Unlimited screenshots and exports',
      'Priority support and deeper review workflow',
    ],
  },
} as const;

export function normalizeBillingState(value: unknown): BillingState {
  if (!value || typeof value !== 'object') return DEFAULT_BILLING_STATE;

  const input = value as Partial<BillingState>;
  const plan: SubscriptionPlan = input.plan === 'pro' ? 'pro' : 'free';
  const status = input.status && ['inactive', 'active', 'trialing', 'past_due'].includes(input.status)
    ? input.status
    : 'active';

  return {
    plan,
    status,
    billingCycle: input.billingCycle === 'yearly' ? 'yearly' : 'monthly',
    startedAt: input.startedAt || null,
    renewsAt: input.renewsAt || null,
    trialEndsAt: input.trialEndsAt || null,
  };
}

export function getPlanLabel(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PLANS[plan].name;
}

export function isProPlan(billing: BillingState | undefined | null) {
  return normalizeBillingState(billing).plan === 'pro';
}

export function getUsageProgress(used: number, limit: number) {
  if (!Number.isFinite(limit)) return 0;
  if (limit <= 0) return 100;
  return Math.max(0, Math.min(100, (used / limit) * 100));
}
