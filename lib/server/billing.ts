import { createHmac, timingSafeEqual } from 'crypto';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { DEFAULT_BILLING_STATE } from '@/lib/subscription';
import type { BillingState } from '@/lib/types';
import { assertBillingSchemaReady } from '@/lib/server/schema';

type BillingCycle = 'monthly' | 'yearly';

interface RazorpaySubscriptionEntity {
  id: string;
  status?: string;
  customer_id?: string | null;
  current_start?: number | null;
  current_end?: number | null;
  charge_at?: number | null;
  start_at?: number | null;
  ended_at?: number | null;
  short_url?: string | null;
}

interface BillingSubscriptionRow {
  user_id: number;
  subscription_id: string;
  plan_code: string;
  billing_cycle: BillingCycle;
  status: string;
  payload_json: string | null;
}

interface SettingsRow {
  value_json: string;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getRazorpayPublicKey() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
}

function getRazorpayAuthHeader() {
  const keyId = requiredEnv('RAZORPAY_KEY_ID');
  const keySecret = requiredEnv('RAZORPAY_KEY_SECRET');
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

function getPlanIdForCycle(cycle: BillingCycle) {
  return cycle === 'yearly'
    ? requiredEnv('RAZORPAY_PLAN_YEARLY_ID')
    : requiredEnv('RAZORPAY_PLAN_MONTHLY_ID');
}

async function razorpayRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: getRazorpayAuthHeader(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: { description?: string } }).error?.description || 'Razorpay request failed';
    throw new Error(message);
  }

  return data as T;
}

function toIsoDate(timestamp?: number | null) {
  if (!Number.isFinite(timestamp) || !timestamp) return null;
  return new Date(Number(timestamp) * 1000).toISOString();
}

export async function ensureBillingTables() {
  await assertBillingSchemaReady();
}

export async function createRazorpaySubscription({
  userId,
  email,
  name,
  billingCycle,
}: {
  userId: number;
  email: string;
  name?: string | null;
  billingCycle: BillingCycle;
}) {
  await ensureBillingTables();

  const planId = getPlanIdForCycle(billingCycle);
  const totalCount = billingCycle === 'yearly' ? 10 : 120;

  const subscription = await razorpayRequest<RazorpaySubscriptionEntity>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: {
        product: 'Traderlogify',
        userId: String(userId),
        plan: 'pro',
        billingCycle,
        email,
        name: name || '',
      },
    }),
  });

  await upsertSubscriptionRecord({
    userId,
    subscriptionId: subscription.id,
    planCode: 'pro',
    billingCycle,
    status: subscription.status || 'created',
    customerId: subscription.customer_id || null,
    payload: subscription,
  });

  await saveBillingState(userId, {
    plan: 'free',
    status: 'inactive',
    billingCycle,
    startedAt: null,
    renewsAt: null,
    trialEndsAt: null,
  });

  return subscription;
}

export async function upsertSubscriptionRecord({
  userId,
  subscriptionId,
  planCode,
  billingCycle,
  status,
  customerId,
  payload,
}: {
  userId: number;
  subscriptionId: string;
  planCode: string;
  billingCycle: BillingCycle;
  status: string;
  customerId?: string | null;
  payload?: unknown;
}) {
  await ensureBillingTables();

  await dbExecute(
    `INSERT INTO billing_subscriptions
      (user_id, provider, plan_code, billing_cycle, subscription_id, customer_id, status, payload_json, created_at, updated_at)
     VALUES (?, 'razorpay', ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       plan_code = VALUES(plan_code),
       billing_cycle = VALUES(billing_cycle),
       customer_id = VALUES(customer_id),
       status = VALUES(status),
       payload_json = VALUES(payload_json),
       updated_at = NOW()`,
    [
      userId,
      planCode,
      billingCycle,
      subscriptionId,
      customerId || null,
      status,
      payload ? JSON.stringify(payload) : null,
    ],
  );
}

export async function getSubscriptionRecord(subscriptionId: string) {
  await ensureBillingTables();
  const rows = await dbQuery<BillingSubscriptionRow[]>(
    `SELECT user_id, subscription_id, plan_code, billing_cycle, status, payload_json
     FROM billing_subscriptions
     WHERE subscription_id = ?
     LIMIT 1`,
    [subscriptionId],
  );

  return rows[0] || null;
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  return razorpayRequest<RazorpaySubscriptionEntity>(`/subscriptions/${subscriptionId}`, {
    method: 'GET',
  });
}

export async function saveBillingState(userId: number, billing: BillingState) {
  await dbExecute(
    `INSERT INTO user_settings (user_id, key_name, value_json, updated_at)
     VALUES (?, 'billing', ?, NOW())
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()`,
    [userId, JSON.stringify(billing)],
  );
}

export async function getBillingState(userId: number): Promise<BillingState> {
  const rows = await dbQuery<SettingsRow[]>(
    `SELECT value_json
     FROM user_settings
     WHERE user_id = ? AND key_name = 'billing'
     LIMIT 1`,
    [userId],
  );

  if (!rows[0]) return DEFAULT_BILLING_STATE;

  try {
    return {
      ...DEFAULT_BILLING_STATE,
      ...JSON.parse(rows[0].value_json),
    };
  } catch {
    return DEFAULT_BILLING_STATE;
  }
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const webhookSecret = requiredEnv('RAZORPAY_WEBHOOK_SECRET');
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature || '');

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function verifyRazorpayPaymentSignature({
  paymentId,
  subscriptionId,
  signature,
}: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}) {
  const keySecret = requiredEnv('RAZORPAY_KEY_SECRET');
  const expected = createHmac('sha256', keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature || '');

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function markWebhookProcessed(eventId: string) {
  await ensureBillingTables();
  await dbExecute(
    `INSERT IGNORE INTO billing_webhook_events (event_id, provider, created_at)
     VALUES (?, 'razorpay', NOW())`,
    [eventId],
  );
}

export async function hasProcessedWebhook(eventId: string) {
  await ensureBillingTables();
  const rows = await dbQuery<{ event_id: string }[]>(
    `SELECT event_id
     FROM billing_webhook_events
     WHERE event_id = ?
     LIMIT 1`,
    [eventId],
  );
  return rows.length > 0;
}

export function mapSubscriptionStatusToBilling(
  status: string,
  billingCycle: BillingCycle,
  subscription?: Partial<RazorpaySubscriptionEntity> | null,
): BillingState {
  const normalized = status.toLowerCase();
  const startedAt = toIsoDate(subscription?.current_start ?? subscription?.start_at) || null;
  const renewsAt = toIsoDate(subscription?.current_end ?? subscription?.charge_at) || null;
  const trialEndsAt = normalized === 'authenticated' ? toIsoDate(subscription?.charge_at) : null;

  if (normalized === 'active' || normalized === 'authenticated') {
    return {
      plan: 'pro',
      status: normalized === 'authenticated' ? 'trialing' : 'active',
      billingCycle,
      startedAt,
      renewsAt,
      trialEndsAt,
    };
  }

  if (normalized === 'pending' || normalized === 'created') {
    return {
      plan: 'free',
      status: 'inactive',
      billingCycle,
      startedAt: null,
      renewsAt: null,
      trialEndsAt: null,
    };
  }

  if (normalized === 'halted') {
    return {
      plan: 'free',
      status: 'past_due',
      billingCycle,
      startedAt,
      renewsAt,
      trialEndsAt: null,
    };
  }

  return {
    plan: 'free',
    status: 'inactive',
    billingCycle,
    startedAt: null,
    renewsAt: null,
    trialEndsAt: null,
  };
}
