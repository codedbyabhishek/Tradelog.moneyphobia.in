import { NextRequest, NextResponse } from 'next/server';
import { deleteDhanConfig, getStoredDhanConfig, saveDhanConfig } from '@/lib/server/dhan';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const config = await getStoredDhanConfig(user.id);

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
    console.error('[dhan/config/get] error', error);
    return jsonError('Failed to load Dhan configuration.', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const clientId = String(body?.clientId || '').trim();
    const incomingAccessToken = String(body?.accessToken || '').trim();
    const existing = await getStoredDhanConfig(user.id);
    const accessToken = incomingAccessToken || existing?.accessToken || '';

    if (!clientId || !accessToken) {
      return jsonError('Client ID and access token are required.', 400);
    }

    await saveDhanConfig(user.id, {
      clientId,
      accessToken,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[dhan/config/put] error', error);
    return jsonError('Failed to save Dhan configuration.', 500);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await deleteDhanConfig(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error('[dhan/config/delete] error', error);
    return jsonError('Failed to remove Dhan configuration.', 500);
  }
}
