import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { resolveBrokerAccount } from '@/lib/server/broker-accounts';
import { assertBrokerAccountsSchemaReady } from '@/lib/server/schema';
import { mergeTradeScreenshots } from '@/lib/trade-payload';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface TradeRow {
  account_id: string;
  trade_json: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);
    await assertBrokerAccountsSchemaReady();

    const { id } = await params;
    const requestedAccountId = request.nextUrl.searchParams.get('accountId')?.trim();
    const values: unknown[] = [user.id, id];
    let accountFilter = '';
    if (requestedAccountId) {
      const account = await resolveBrokerAccount(user.id, requestedAccountId);
      accountFilter = ' AND account_id = ?';
      values.push(account.id);
    }

    const rows = await dbQuery<TradeRow[]>(
      `SELECT account_id, trade_json FROM trades
       WHERE user_id = ? AND trade_id = ?${accountFilter}
       ORDER BY updated_at DESC LIMIT 1`,
      values,
    );
    if (!rows[0]) return jsonError('Trade not found.', 404);

    const trade = JSON.parse(rows[0].trade_json);
    return NextResponse.json({ trade: { ...trade, accountId: rows[0].account_id } });
  } catch (error) {
    console.error('[trades/get-one] error', error);
    return jsonError('Failed to load trade details.', 500);
  }
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
    const existingRows = await dbQuery<TradeRow[]>(
      `SELECT account_id, trade_json FROM trades
       WHERE user_id = ? AND trade_id = ? AND account_id = ?
       LIMIT 1`,
      [user.id, id, account.id],
    );
    const existingTrade = existingRows[0] ? JSON.parse(existingRows[0].trade_json) : {};
    const clearScreenshots = Array.isArray(body?.clearScreenshots)
      ? body.clearScreenshots.filter((field: unknown) => (
        field === 'beforeTradeScreenshot' ||
        field === 'afterExitScreenshot' ||
        field === 'hftScreenshot'
      ))
      : [];
    const mergedTrade = mergeTradeScreenshots(
      existingTrade,
      { ...trade, id, accountId: account.id },
      clearScreenshots,
    );
    const tradeJson = JSON.stringify(mergedTrade);

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
