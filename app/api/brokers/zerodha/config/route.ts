import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { deleteZerodhaConfig, getStoredZerodhaConfig } from '@/lib/server/zerodha';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const config = await getStoredZerodhaConfig(user.id);

    return NextResponse.json({
      configured: Boolean(config),
      apiKey: config?.apiKey || '',
      hasApiSecret: Boolean(config?.apiSecret),
      redirectUri: config?.redirectUri || '',
      updatedAt: config?.updatedAt || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[zerodha/config/get] error', error);
    return jsonError('Failed to load Zerodha configuration.', 500);
  }
}

export async function PUT() {
  return jsonError('Zerodha sync is coming soon and cannot be configured yet.', 503);
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await deleteZerodhaConfig(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[zerodha/config/delete] error', error);
    return jsonError('Failed to remove Zerodha configuration.', 500);
  }
}
