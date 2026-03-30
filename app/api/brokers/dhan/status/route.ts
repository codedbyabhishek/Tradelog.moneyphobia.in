import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { getDhanStatus, getStoredDhanConfig } from '@/lib/server/dhan';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const config = await getStoredDhanConfig(user.id);

    if (!config) {
      return NextResponse.json({ configured: false });
    }

    const status = await getDhanStatus(config);
    return NextResponse.json({ configured: true, status });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[dhan/status/get] error', error);
    return jsonError('Failed to fetch Dhan status.', 500);
  }
}
