import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createRazorpaySubscription, getRazorpayPublicKey } from '@/lib/server/billing';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const billingCycle = body?.billingCycle === 'yearly' ? 'yearly' : 'monthly';

    if (!getRazorpayPublicKey()) {
      return jsonError('Razorpay is not configured yet.', 503);
    }

    const subscription = await createRazorpaySubscription({
      userId: user.id,
      email: user.email,
      name: user.name,
      billingCycle,
    });

    return NextResponse.json({
      keyId: getRazorpayPublicKey(),
      subscriptionId: subscription.id,
      billingCycle,
    });
  } catch (error) {
    console.error('[billing/subscribe] error', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to create subscription.', 500);
  }
}
