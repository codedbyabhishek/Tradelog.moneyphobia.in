import { NextRequest, NextResponse } from 'next/server';
import { dbExecute } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const body = await request.json();
    const trade = body?.trade;
    const { id } = await params;

    if (!trade || typeof trade !== 'object' || !trade.date) {
      return jsonError('Invalid trade payload.', 400);
    }

    const tradeJson = JSON.stringify({ ...trade, id });

    await dbExecute(
      `INSERT INTO trades (user_id, trade_id, trade_json, trade_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         trade_json = VALUES(trade_json),
         trade_date = VALUES(trade_date),
         updated_at = NOW()`,
      [user.id, id, tradeJson, String(trade.date)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/put] error', error);
    return jsonError('Failed to update trade.', 500);
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const { id } = await params;

    await dbExecute('DELETE FROM trades WHERE user_id = ? AND trade_id = ?', [user.id, id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/delete] error', error);
    return jsonError('Failed to delete trade.', 500);
  }
}
