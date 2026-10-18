import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError, parseJsonBody } from '@/lib/server/http';
import { resolveBrokerAccount } from '@/lib/server/broker-accounts';
import { assertBrokerAccountsSchemaReady } from '@/lib/server/schema';
import { toTradeListPayload } from '@/lib/trade-payload';
import type { Trade } from '@/lib/types';

export const runtime = 'nodejs';

interface TradeRow {
  trade_id: string;
  account_id: string;
  trade_json: string;
}

interface TradePayload {
  id?: string;
  date?: string;
  symbol?: string;
  setupName?: string;
  accountId?: string;
}

function parseTradeRows(rows: TradeRow[], includeScreenshots: boolean) {
  return rows.map((row) => {
    const trade = JSON.parse(row.trade_json) as Trade;
    if (!trade || typeof trade !== 'object' || Array.isArray(trade)) {
      throw new Error(`Invalid stored trade payload for trade ${row.trade_id}.`);
    }
    const responseTrade = includeScreenshots ? trade : toTradeListPayload(trade);
    return { ...responseTrade, accountId: row.account_id };
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }
    await assertBrokerAccountsSchemaReady();

    const requestedAccountId = request.nextUrl.searchParams.get('accountId')?.trim();
    const includeScreenshots = request.nextUrl.searchParams.get('includeScreenshots') === 'true';
    let whereClause = 'WHERE user_id = ?';
    const values: unknown[] = [user.id];
    if (requestedAccountId && requestedAccountId !== 'all') {
      const account = await resolveBrokerAccount(user.id, requestedAccountId);
      whereClause += ' AND account_id = ?';
      values.push(account.id);
    }

    const rows = await dbQuery<TradeRow[]>(
      `SELECT trade_id, account_id, trade_json
       FROM trades
       ${whereClause}
       ORDER BY trade_date DESC, updated_at DESC`,
      values,
    );

    return NextResponse.json({ trades: parseTradeRows(rows, includeScreenshots) });
  } catch (error) {
    console.error('[trades/get] error', error);
    return jsonError('Failed to load trades.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }
    await assertBrokerAccountsSchemaReady();

    const body = await parseJsonBody(request);
    if (!body) {
      return jsonError('Invalid trade payload.', 400);
    }
    const trade = body?.trade as TradePayload | undefined;

    if (!trade || typeof trade !== 'object' || !trade.id || !trade.date) {
      return jsonError('Invalid trade payload.', 400);
    }

    const tradeId = String(trade.id || '').trim();
    const tradeDate = String(trade.date || '').trim();
    const symbol = String(trade.symbol || '').trim();
    const setupName = String(trade.setupName || '').trim();

    if (!tradeId || !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) || !symbol || !setupName) {
      return jsonError('Trade ID, date, symbol, and setup name are required.', 400);
    }

    const account = await resolveBrokerAccount(user.id, trade.accountId);
    const tradeJson = JSON.stringify({ ...trade, accountId: account.id });

    await dbExecute(
      `INSERT INTO trades (user_id, account_id, trade_id, trade_json, trade_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         trade_json = VALUES(trade_json),
         trade_date = VALUES(trade_date),
         updated_at = NOW()`,
      [user.id, account.id, tradeId, tradeJson, tradeDate]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/post] error', error);
    return jsonError('Failed to save trade.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }
    await assertBrokerAccountsSchemaReady();

    const requestedAccountId = request.nextUrl.searchParams.get('accountId')?.trim();
    if (requestedAccountId && requestedAccountId !== 'all') {
      const account = await resolveBrokerAccount(user.id, requestedAccountId);
      await dbExecute('DELETE FROM trades WHERE user_id = ? AND account_id = ?', [user.id, account.id]);
    } else {
      await dbExecute('DELETE FROM trades WHERE user_id = ?', [user.id]);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/delete-all] error', error);
    return jsonError('Failed to clear trades.', 500);
  }
}
