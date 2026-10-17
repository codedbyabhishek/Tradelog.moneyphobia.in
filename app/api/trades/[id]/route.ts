import { NextRequest, NextResponse } from 'next/server';
import { dbExecute } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { resolveBrokerAccount } from '@/lib/server/broker-accounts';
import { assertBrokerAccountsSchemaReady } from '@/lib/server/schema';

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
    await assertBrokerAccountsSchemaReady();

    const body = await request.json();
    const trade = body?.trade;
    const { id } = await params;

    if (!trade || typeof trade !== 'object' || !trade.date) {
      return jsonError('Invalid trade payload.', 400);
    }

    const account = await resolveBrokerAccount(user.id, String(trade.accountId || ''));
    const tradeJson = JSON.stringify({ ...trade, id, accountId: account.id });

    await dbExecute(
      `INSERT INTO trades (user_id, account_id, trade_id, trade_json, trade_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         trade_json = VALUES(trade_json),
         trade_date = VALUES(trade_date),
         updated_at = NOW()`,
      [user.id, account.id, id, tradeJson, String(trade.date)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/put] error', error);
    return jsonError('Failed to update trade.', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }
    await assertBrokerAccountsSchemaReady();

    const { id } = await params;

    const requestedAccountId = request.nextUrl.searchParams.get('accountId')?.trim();
    if (requestedAccountId && requestedAccountId !== 'all') {
      const account = await resolveBrokerAccount(user.id, requestedAccountId);
      await dbExecute(
        'DELETE FROM trades WHERE user_id = ? AND account_id = ? AND trade_id = ?',
        [user.id, account.id, id],
      );
    } else {
      await dbExecute('DELETE FROM trades WHERE user_id = ? AND trade_id = ?', [user.id, id]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/delete] error', error);
    return jsonError('Failed to delete trade.', 500);
  }
}
