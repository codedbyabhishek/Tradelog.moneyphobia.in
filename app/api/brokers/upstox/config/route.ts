import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { deleteUpstoxConfig, getStoredUpstoxConfig, saveUpstoxConfig } from '@/lib/server/upstox';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const config = await getStoredUpstoxConfig(user.id);

    return NextResponse.json({
      configured: Boolean(config),
      clientId: config?.clientId || '',
      hasAccessToken: Boolean(config?.accessToken),
      updatedAt: config?.updatedAt || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[upstox/config/get] error', error);
    return jsonError('Failed to load Upstox configuration.', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const clientId = String(body?.clientId || '').trim();
    const incomingAccessToken = String(body?.accessToken || '').trim();
    const existing = await getStoredUpstoxConfig(user.id);
    const accessToken = incomingAccessToken || existing?.accessToken || '';

    if (!clientId || !accessToken) {
      return jsonError('Client ID and access token are required.', 400);
    }

    await saveUpstoxConfig(user.id, {
      clientId,
      accessToken,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[upstox/config/put] error', error);
    return jsonError('Failed to save Upstox configuration.', 500);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await deleteUpstoxConfig(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[upstox/config/delete] error', error);
    return jsonError('Failed to remove Upstox configuration.', 500);
  }
}
