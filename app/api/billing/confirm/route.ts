import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import {
  fetchRazorpaySubscription,
  getSubscriptionRecord,
  mapSubscriptionStatusToBilling,
  saveBillingState,
  upsertSubscriptionRecord,
  verifyRazorpayPaymentSignature,
} from '@/lib/server/billing';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const paymentId = String(body?.razorpay_payment_id || '').trim();
    const subscriptionId = String(body?.razorpay_subscription_id || '').trim();
    const signature = String(body?.razorpay_signature || '').trim();

    if (!paymentId || !subscriptionId || !signature) {
      return jsonError('Missing Razorpay payment confirmation fields.', 400);
    }

    const existing = await getSubscriptionRecord(subscriptionId);
    if (!existing || existing.user_id !== user.id) {
      return jsonError('Subscription not found for this account.', 404);
    }

    if (
      !verifyRazorpayPaymentSignature({
        paymentId,
        subscriptionId,
        signature,
      })
    ) {
      return jsonError('Invalid payment signature.', 401);
    }

    const subscription = await fetchRazorpaySubscription(subscriptionId);
    const nextStatus = String(subscription.status || existing.status || 'created');

    await upsertSubscriptionRecord({
      userId: existing.user_id,
      subscriptionId,
      planCode: existing.plan_code,
      billingCycle: existing.billing_cycle,
      status: nextStatus,
      customerId: subscription.customer_id || null,
      payload: {
        verification: {
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        },
        subscription,
      },
    });

    const billing = mapSubscriptionStatusToBilling(nextStatus, existing.billing_cycle, subscription);
    await saveBillingState(existing.user_id, billing);

    return NextResponse.json({
      ok: true,
      billing,
      subscriptionId,
      paymentId,
    });
  } catch (error) {
    console.error('[billing/confirm] error', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to confirm payment.', 500);
  }
}
