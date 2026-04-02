import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscriptionRecord,
  hasProcessedWebhook,
  mapSubscriptionStatusToBilling,
  markWebhookProcessed,
  saveBillingState,
  upsertSubscriptionRecord,
  verifyRazorpayWebhookSignature,
} from '@/lib/server/billing';

export const runtime = 'nodejs';

function getNestedSubscription(payload: any) {
  return (
    payload?.payload?.subscription?.entity ||
    payload?.payload?.subscription ||
    payload?.subscription ||
    null
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';

  try {
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventId = String(body?.payload?.payment?.entity?.id || body?.created_at || '');
    const eventType = String(body?.event || '');
    const subscription = getNestedSubscription(body);

    if (!subscription?.id) {
      return NextResponse.json({ ok: true });
    }

    const processedKey = `${eventType}:${eventId || subscription.id}:${subscription.status || 'unknown'}`;
    if (await hasProcessedWebhook(processedKey)) {
      return NextResponse.json({ ok: true });
    }

    const existing = await getSubscriptionRecord(String(subscription.id));
    if (!existing) {
      return NextResponse.json({ ok: true });
    }

    await upsertSubscriptionRecord({
      userId: existing.user_id,
      subscriptionId: String(subscription.id),
      planCode: 'pro',
      billingCycle: existing.billing_cycle,
      status: String(subscription.status || existing.status || 'created'),
      customerId: subscription.customer_id || null,
      payload: body,
    });

    await saveBillingState(
      existing.user_id,
      mapSubscriptionStatusToBilling(String(subscription.status || existing.status || 'created'), existing.billing_cycle),
    );

    await markWebhookProcessed(processedKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[billing/webhook] error', error);
    return NextResponse.json({ error: 'Failed to process webhook.' }, { status: 500 });
  }
}
