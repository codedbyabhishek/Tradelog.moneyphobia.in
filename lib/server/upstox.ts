import { dbExecute, dbQuery } from '@/lib/server/db';
import { decryptBrokerCredentials, encryptBrokerCredentials } from '@/lib/server/credentials';
import { getDayOfWeek, getTradeResultLabel } from '@/lib/trade-utils';
import type { Trade } from '@/lib/types';

const UPSTOX_BASE_URL = 'https://api.upstox.com';
const UPSTOX_SETTINGS_KEY = 'broker_upstox_config';
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

interface UpstoxConfigRow {
  value_json: string;
}

export interface UpstoxStoredConfig {
  clientId: string;
  accessToken: string;
  updatedAt: string;
}

interface UpstoxTradeHistoryItem {
  exchange?: string;
  segment?: string;
  option_type?: string;
  quantity?: number;
  amount?: number;
  trade_id?: string;
  trade_date?: string;
  transaction_type?: string;
  scrip_name?: string;
  strike_price?: number | string;
  expiry?: string;
  price?: number;
  isin?: string;
  symbol?: string;
  instrument_token?: string;
}

interface UpstoxTradeHistoryResponse {
  status?: string;
  data?: UpstoxTradeHistoryItem[];
  meta_data?: {
    page?: {
      page_number?: number;
      total_pages?: number;
    };
  };
}

interface UpstoxDayTradeResponse {
  status?: string;
  data?: Array<{ trade_id?: string }>;
}

interface OpenLot {
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  symbol: string;
  segment: string;
  tradeDate: string;
  tradeId?: string;
  expiry?: string;
  optionType?: string;
  strikePrice?: string;
}

async function upstoxFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${UPSTOX_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upstox API request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

export async function getStoredUpstoxConfig(userId: number): Promise<UpstoxStoredConfig | null> {
  const rows = await dbQuery<UpstoxConfigRow[]>(
    'SELECT value_json FROM user_settings WHERE user_id = ? AND key_name = ? LIMIT 1',
    [userId, UPSTOX_SETTINGS_KEY]
  );

  if (rows.length === 0) return null;

  try {
    const parsed = decryptBrokerCredentials<UpstoxStoredConfig>(rows[0].value_json);
    if (!parsed?.clientId || !parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveUpstoxConfig(userId: number, config: UpstoxStoredConfig) {
  await dbExecute(
    `INSERT INTO user_settings (user_id, key_name, value_json, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()`,
    [userId, UPSTOX_SETTINGS_KEY, encryptBrokerCredentials(config)]
  );
}

export async function deleteUpstoxConfig(userId: number) {
  await dbExecute('DELETE FROM user_settings WHERE user_id = ? AND key_name = ?', [userId, UPSTOX_SETTINGS_KEY]);
}

export async function getUpstoxStatus(config: UpstoxStoredConfig) {
  const todayTrades = await upstoxFetch<UpstoxDayTradeResponse>(
    '/v2/order/trades/get-trades-for-day',
    config.accessToken
  );

  return {
    todayTrades: todayTrades.data?.length || 0,
    tokenValidated: true,
  };
}

async function fetchHistoricalTrades(config: UpstoxStoredConfig, fromDate: string, toDate: string) {
  const allTrades: UpstoxTradeHistoryItem[] = [];

  for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
    const params = new URLSearchParams({
      start_date: fromDate,
      end_date: toDate,
      page_number: String(pageNumber),
      page_size: String(PAGE_SIZE),
    });

    const response = await upstoxFetch<UpstoxTradeHistoryResponse>(
      `/v2/charges/historical-trades?${params.toString()}`,
      config.accessToken
    );

    const pageTrades = response.data || [];
    if (pageTrades.length === 0) break;

    allTrades.push(...pageTrades);

    const totalPages = response.meta_data?.page?.total_pages || pageNumber;
    if (pageNumber >= totalPages) break;
  }

  return allTrades;
}

function buildInstrumentKey(item: UpstoxTradeHistoryItem) {
  return [
    item.symbol || item.scrip_name || item.instrument_token || 'UNKNOWN',
    item.segment || '',
    item.expiry || '',
    item.option_type || '',
    item.strike_price || '',
  ].join('|');
}

function calculateMatchedPnl(side: 'BUY' | 'SELL', entryPrice: number, exitPrice: number, quantity: number) {
  if (side === 'BUY') {
    return (exitPrice - entryPrice) * quantity;
  }
  return (entryPrice - exitPrice) * quantity;
}

function tradeTypeFromSegment(segment?: string): Trade['tradeType'] {
  if (segment === 'FO') return 'Intraday';
  if (segment === 'COM' || segment === 'CD') return 'Swing';
  return 'Positional';
}

function mapUpstoxTradesToJournalTrades(items: UpstoxTradeHistoryItem[]): Trade[] {
  const grouped = new Map<string, UpstoxTradeHistoryItem[]>();

  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const side = String(item.transaction_type || '').toUpperCase();
    if (!quantity || !price || (side !== 'BUY' && side !== 'SELL')) continue;

    const key = buildInstrumentKey(item);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const trades: Trade[] = [];

  for (const groupItems of grouped.values()) {
    const ordered = [...groupItems].sort((a, b) => {
      const dateA = new Date(a.trade_date || '').getTime();
      const dateB = new Date(b.trade_date || '').getTime();
      return dateA - dateB;
    });

    const openLots: OpenLot[] = [];

    for (const item of ordered) {
      let remainingQty = Number(item.quantity || 0);
      const side = String(item.transaction_type || '').toUpperCase() as 'BUY' | 'SELL';
      const price = Number(item.price || 0);
      const symbol = (item.symbol || item.scrip_name || item.instrument_token || 'UNKNOWN').toUpperCase();
      const segment = item.segment || 'EQ';
      const tradeDate = item.trade_date || new Date().toISOString().slice(0, 10);

      while (remainingQty > 0) {
        const oppositeIndex = openLots.findIndex((lot) => lot.side !== side && lot.quantity > 0);

        if (oppositeIndex === -1) {
          openLots.push({
            side,
            quantity: remainingQty,
            price,
            symbol,
            segment,
            tradeDate,
            tradeId: item.trade_id,
            expiry: item.expiry,
            optionType: item.option_type,
            strikePrice: item.strike_price ? String(item.strike_price) : undefined,
          });
          remainingQty = 0;
          continue;
        }

        const openLot = openLots[oppositeIndex];
        const matchedQty = Math.min(openLot.quantity, remainingQty);
        const closeDate = tradeDate;
        const pnl = calculateMatchedPnl(openLot.side, openLot.price, price, matchedQty);
        const id = [
          'upstox',
          openLot.tradeId || openLot.tradeDate,
          item.trade_id || tradeDate,
          matchedQty,
        ].join(':');

        trades.push({
          id,
          isFavorite: false,
          date: closeDate,
          dayOfWeek: getDayOfWeek(closeDate),
          symbol,
          tradeType: tradeTypeFromSegment(segment),
          setupName: `Upstox Sync • ${segment}`,
          position: openLot.side === 'BUY' ? 'Buy' : 'Sell',
          entryPrice: openLot.price,
          exitPrice: price,
          stopLoss: openLot.price,
          quantity: matchedQty,
          fees: 0,
          pnl,
          currency: 'INR',
          pnlBase: pnl,
          exchangeRate: 1,
          tradeResult: getTradeResultLabel(pnl),
          rFactor: 0,
          isWin: pnl > 0,
          confidence: 5,
          preNotes: `Imported from Upstox. Open leg ${openLot.side} ${matchedQty} @ ${openLot.price}.`,
          postNotes: `Closed from Upstox sync. Exit ${side} ${matchedQty} @ ${price}. Segment ${segment}.`,
          timeFrame: segment,
          limit: openLot.tradeId || '',
          exit: item.trade_id || '',
          ruleFollowed: true,
          marketCondition: 'Normal',
          isScaledEntry: false,
          isScaledExit: false,
        });

        openLot.quantity -= matchedQty;
        remainingQty -= matchedQty;

        if (openLot.quantity <= 0) {
          openLots.splice(oppositeIndex, 1);
        }
      }
    }
  }

  return trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function syncUpstoxTradesToJournal(userId: number, config: UpstoxStoredConfig, fromDate: string, toDate: string) {
  const sourceTrades = await fetchHistoricalTrades(config, fromDate, toDate);
  const mappedTrades = mapUpstoxTradesToJournalTrades(sourceTrades);

  if (mappedTrades.length === 0) {
    return {
      imported: 0,
      updated: 0,
      sourceTrades: sourceTrades.length,
      matchedTrades: 0,
    };
  }

  const ids = mappedTrades.map((trade) => trade.id);
  const placeholders = ids.map(() => '?').join(', ');
  const existingRows = await dbQuery<{ trade_id: string }[]>(
    `SELECT trade_id FROM trades WHERE user_id = ? AND trade_id IN (${placeholders})`,
    [userId, ...ids]
  );
  const existingIds = new Set(existingRows.map((row) => row.trade_id));

  for (const trade of mappedTrades) {
    await dbExecute(
      `INSERT INTO trades (user_id, trade_id, trade_json, trade_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         trade_json = VALUES(trade_json),
         trade_date = VALUES(trade_date),
         updated_at = NOW()`,
      [userId, trade.id, JSON.stringify(trade), trade.date]
    );
  }

  const updated = mappedTrades.filter((trade) => existingIds.has(trade.id)).length;
  const imported = mappedTrades.length - updated;

  return {
    imported,
    updated,
    sourceTrades: sourceTrades.length,
    matchedTrades: mappedTrades.length,
  };
}
