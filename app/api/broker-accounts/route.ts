import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createBrokerAccount, listBrokerAccounts } from '@/lib/server/broker-accounts';
import { jsonError, parseJsonBody } from '@/lib/server/http';
import type { BrokerId } from '@/lib/brokers';
import type { Currency } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const accounts = await listBrokerAccounts(user.id);
    return NextResponse.json({ accounts });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error('[broker-accounts/get] error', error);
    return jsonError('Failed to load broker accounts.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody(request);
    if (!body || typeof body !== 'object') return jsonError('Invalid broker account payload.', 400);

    const account = await createBrokerAccount(user.id, {
      brokerId: body.brokerId as BrokerId,
      name: String(body.name || ''),
      accountReference: body.accountReference === undefined ? undefined : String(body.accountReference),
      currency: body.currency as Currency,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    const message = error instanceof Error ? error.message : 'Failed to create broker account.';
    return jsonError(message, 400);
  }
}
