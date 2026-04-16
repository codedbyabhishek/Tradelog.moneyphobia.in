import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createRazorpaySubscription, getRazorpayPublicKey } from '@/lib/server/billing';
import { isUnauthorizedError, jsonError, parseJsonBody } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody(request);
    if (body === null) {
      return jsonError('Invalid subscription payload.', 400);
    }
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
      customer: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonError('Unauthorized', 401);
    }
    console.error('[billing/subscribe] error', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to create subscription.', 500);
  }
}
