import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { getStoredUpstoxConfig, getUpstoxStatus } from '@/lib/server/upstox';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const config = await getStoredUpstoxConfig(user.id);

    if (!config) {
      return NextResponse.json({ configured: false });
    }

    const status = await getUpstoxStatus(config);
    return NextResponse.json({ configured: true, status });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[upstox/status/get] error', error);
    return jsonError('Failed to fetch Upstox status.', 500);
  }
}
