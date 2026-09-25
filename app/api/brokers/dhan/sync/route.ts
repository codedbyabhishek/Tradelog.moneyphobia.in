import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { getStoredDhanConfig, syncDhanTradesToJournal } from '@/lib/server/dhan';
import { jsonError } from '@/lib/server/http';
import { consumeRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const rateLimit = await consumeRateLimit({
      prefix: 'broker-dhan-sync',
      identifier: String(user.id),
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
      blockDurationMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return jsonError(
        'Too many Dhan sync attempts. Please wait before trying again.',
        429,
        { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) }
      );
    }

    const config = await getStoredDhanConfig(user.id);

    if (!config) {
      return jsonError('Configure your Dhan account first.', 400);
    }

    const body = await request.json();
    const fromDate = String(body?.fromDate || '').trim();
    const toDate = String(body?.toDate || '').trim();

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return jsonError('Provide valid from and to dates in YYYY-MM-DD format.', 400);
    }

    const result = await syncDhanTradesToJournal(user.id, config, fromDate, toDate);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[dhan/sync/post] error', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to sync trades from Dhan.', 500);
  }
}
