import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { getStoredUpstoxConfig, syncUpstoxTradesToJournal } from '@/lib/server/upstox';

export const runtime = 'nodejs';

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const config = await getStoredUpstoxConfig(user.id);

    if (!config) {
      return jsonError('Configure your Upstox account first.', 400);
    }

    const body = await request.json();
    const fromDate = String(body?.fromDate || '').trim();
    const toDate = String(body?.toDate || '').trim();

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return jsonError('Provide valid from and to dates in YYYY-MM-DD format.', 400);
    }

    const result = await syncUpstoxTradesToJournal(user.id, config, fromDate, toDate);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[upstox/sync/post] error', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to sync trades from Upstox.', 500);
  }
}
