import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError, parseJsonBody } from '@/lib/server/http';

export const runtime = 'nodejs';

interface TradeRow {
  trade_id: string;
  trade_json: string;
}

interface TradePayload {
  id?: string;
  date?: string;
  symbol?: string;
  setupName?: string;
}

function parseTradeRows(rows: TradeRow[]) {
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.trade_json);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const rows = await dbQuery<TradeRow[]>(
      `SELECT trade_id, trade_json
       FROM trades
       WHERE user_id = ?
       ORDER BY trade_date DESC, updated_at DESC`,
      [user.id]
    );

    return NextResponse.json({ trades: parseTradeRows(rows) });
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

    const tradeJson = JSON.stringify(trade);

    await dbExecute(
      `INSERT INTO trades (user_id, trade_id, trade_json, trade_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         trade_json = VALUES(trade_json),
         trade_date = VALUES(trade_date),
         updated_at = NOW()`,
      [user.id, tradeId, tradeJson, tradeDate]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/post] error', error);
    return jsonError('Failed to save trade.', 500);
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    await dbExecute('DELETE FROM trades WHERE user_id = ?', [user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[trades/delete-all] error', error);
    return jsonError('Failed to clear trades.', 500);
  }
}
