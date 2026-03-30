import { dbExecute, dbQuery } from '@/lib/server/db';
import { getDayOfWeek } from '@/lib/trade-utils';
import { Trade } from '@/lib/types';

const DHAN_BASE_URL = 'https://api.dhan.co/v2';
const DHAN_SETTINGS_KEY = 'broker_dhan_config';
const MAX_TRADE_HISTORY_PAGES = 50;

interface DhanConfigRow {
  value_json: string;
}

export interface DhanStoredConfig {
  clientId: string;
  accessToken: string;
  updatedAt: string;
}

interface DhanTradeHistoryItem {
  dhanClientId?: string;
  orderId?: string;
  exchangeOrderId?: string;
  exchangeTradeId?: string;
  transactionType?: string;
  exchangeSegment?: string;
  productType?: string;
  orderType?: string;
  tradingSymbol?: string | null;
  customSymbol?: string | null;
  securityId?: string;
  tradedQuantity?: number;
  tradedPrice?: number;
  createTime?: string;
  updateTime?: string;
  exchangeTime?: string;
  isin?: string;
  instrument?: string;
  drvExpiryDate?: string | null;
  drvOptionType?: string | null;
  drvStrikePrice?: number;
}

interface DhanHoldingItem {
  tradingSymbol?: string;
  securityId?: string;
}

interface DhanPositionItem {
  tradingSymbol?: string;
  securityId?: string;
  positionType?: string;
  netQty?: number;
  realizedProfit?: number;
  unrealizedProfit?: number;
}

interface DhanFundLimit {
  availabelBalance?: number;
  withdrawableBalance?: number;
}

interface OpenLot {
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  symbol: string;
  tradeTime: string;
  exchangeSegment: string;
  productType: string;
  securityId?: string;
  orderId?: string;
  exchangeTradeId?: string;
}

function normalizeDhanDate(value?: string): string {
  if (!value) return new Date().toISOString();
  return value.includes('T') ? value : value.replace(' ', 'T');
}

function tradeTimeToDate(value?: string): string {
  return normalizeDhanDate(value).slice(0, 10);
}

function getTradeTime(value?: string): string | undefined {
  const normalized = normalizeDhanDate(value);
  return normalized.length >= 16 ? normalized.slice(11, 16) : undefined;
}

function dhanSymbol(item: DhanTradeHistoryItem): string {
  return (item.tradingSymbol || item.customSymbol || item.securityId || 'UNKNOWN').toUpperCase();
}

function tradeTypeFromProduct(productType?: string): Trade['tradeType'] {
  switch (productType) {
    case 'INTRADAY':
      return 'Intraday';
    case 'MTF':
      return 'Swing';
    case 'MARGIN':
      return 'Swing';
    case 'CNC':
    default:
      return 'Positional';
  }
}

function buildInstrumentKey(item: DhanTradeHistoryItem): string {
  return [
    dhanSymbol(item),
    item.exchangeSegment || '',
    item.productType || '',
    item.securityId || '',
    item.drvExpiryDate || '',
    item.drvOptionType || '',
    item.drvStrikePrice || '',
  ].join('|');
}

function calculateMatchedPnl(side: 'BUY' | 'SELL', entryPrice: number, exitPrice: number, quantity: number) {
  if (side === 'BUY') {
    return (exitPrice - entryPrice) * quantity;
  }
  return (entryPrice - exitPrice) * quantity;
}

async function dhanFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${DHAN_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'access-token': accessToken,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Dhan API request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

export async function getStoredDhanConfig(userId: number): Promise<DhanStoredConfig | null> {
  const rows = await dbQuery<DhanConfigRow[]>(
    'SELECT value_json FROM user_settings WHERE user_id = ? AND key_name = ? LIMIT 1',
    [userId, DHAN_SETTINGS_KEY]
  );

  if (rows.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rows[0].value_json) as DhanStoredConfig;
    if (!parsed?.clientId || !parsed?.accessToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveDhanConfig(userId: number, config: DhanStoredConfig) {
  await dbExecute(
    `INSERT INTO user_settings (user_id, key_name, value_json, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()`,
    [userId, DHAN_SETTINGS_KEY, JSON.stringify(config)]
  );
}

export async function deleteDhanConfig(userId: number) {
  await dbExecute('DELETE FROM user_settings WHERE user_id = ? AND key_name = ?', [userId, DHAN_SETTINGS_KEY]);
}

export async function getDhanStatus(config: DhanStoredConfig) {
  const [holdings, positions, fundLimit] = await Promise.all([
    dhanFetch<DhanHoldingItem[]>('/holdings', config.accessToken),
    dhanFetch<DhanPositionItem[]>('/positions', config.accessToken),
    dhanFetch<DhanFundLimit>('/fundlimit', config.accessToken),
  ]);

  return {
    holdingsCount: holdings.length,
    positionsCount: positions.length,
    openPositionCount: positions.filter((position) => Number(position.netQty || 0) !== 0).length,
    availableBalance: Number(fundLimit.availabelBalance || 0),
    withdrawableBalance: Number(fundLimit.withdrawableBalance || 0),
    sampleHoldings: holdings.slice(0, 5).map((item) => item.tradingSymbol || item.securityId || 'Unknown'),
  };
}

async function fetchHistoricalTrades(config: DhanStoredConfig, fromDate: string, toDate: string) {
  const allTrades: DhanTradeHistoryItem[] = [];

  for (let page = 0; page < MAX_TRADE_HISTORY_PAGES; page += 1) {
    const pageItems = await dhanFetch<DhanTradeHistoryItem[]>(
      `/trades/${fromDate}/${toDate}/${page}`,
      config.accessToken
    );

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    allTrades.push(...pageItems);

    if (pageItems.length < 100) {
      break;
    }
  }

  return allTrades;
}

function mapDhanTradesToJournalTrades(items: DhanTradeHistoryItem[]): Trade[] {
  const grouped = new Map<string, DhanTradeHistoryItem[]>();

  for (const item of items) {
    const quantity = Number(item.tradedQuantity || 0);
    const price = Number(item.tradedPrice || 0);
    const side = String(item.transactionType || '').toUpperCase();
    if (!quantity || !price || (side !== 'BUY' && side !== 'SELL')) {
      continue;
    }

    const key = buildInstrumentKey(item);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const trades: Trade[] = [];

  for (const groupItems of grouped.values()) {
    const ordered = [...groupItems].sort((a, b) => {
      const timeA = new Date(normalizeDhanDate(a.exchangeTime || a.updateTime || a.createTime)).getTime();
      const timeB = new Date(normalizeDhanDate(b.exchangeTime || b.updateTime || b.createTime)).getTime();
      return timeA - timeB;
    });

    const openLots: OpenLot[] = [];

    for (const item of ordered) {
      let remainingQty = Number(item.tradedQuantity || 0);
      const side = String(item.transactionType || '').toUpperCase() as 'BUY' | 'SELL';
      const price = Number(item.tradedPrice || 0);
      const symbol = dhanSymbol(item);
      const exchangeSegment = item.exchangeSegment || 'NSE_EQ';
      const productType = item.productType || 'INTRADAY';
      const tradeTime = normalizeDhanDate(item.exchangeTime || item.updateTime || item.createTime);

      while (remainingQty > 0) {
        const oppositeIndex = openLots.findIndex((lot) => lot.side !== side && lot.quantity > 0);

        if (oppositeIndex === -1) {
          openLots.push({
            side,
            quantity: remainingQty,
            price,
            symbol,
            tradeTime,
            exchangeSegment,
            productType,
            securityId: item.securityId,
            orderId: item.orderId,
            exchangeTradeId: item.exchangeTradeId,
          });
          remainingQty = 0;
          continue;
        }

        const openLot = openLots[oppositeIndex];
        const matchedQty = Math.min(openLot.quantity, remainingQty);
        const closeDate = tradeTimeToDate(tradeTime);
        const pnl = calculateMatchedPnl(openLot.side, openLot.price, price, matchedQty);
        const entryTime = getTradeTime(openLot.tradeTime);
        const exitTime = getTradeTime(tradeTime);
        const id = [
          'dhan',
          openLot.exchangeTradeId || openLot.orderId || openLot.tradeTime,
          item.exchangeTradeId || item.orderId || tradeTime,
          matchedQty,
        ].join(':');

        trades.push({
          id,
          isFavorite: false,
          date: closeDate,
          dayOfWeek: getDayOfWeek(closeDate),
          symbol,
          tradeType: tradeTypeFromProduct(productType),
          setupName: `Dhan Sync • ${exchangeSegment}`,
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
          rFactor: 0,
          isWin: pnl > 0,
          confidence: 5,
          preNotes: `Imported from Dhan. Open leg ${openLot.side} ${matchedQty} @ ${openLot.price}.`,
          postNotes: `Closed from Dhan sync. Exit ${side} ${matchedQty} @ ${price}. Product ${productType}.`,
          timeFrame: productType,
          limit: openLot.orderId || openLot.securityId || '',
          exit: item.orderId || item.securityId || '',
          ruleFollowed: true,
          entryTime,
          exitTime,
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

export async function syncDhanTradesToJournal(userId: number, config: DhanStoredConfig, fromDate: string, toDate: string) {
  const sourceTrades = await fetchHistoricalTrades(config, fromDate, toDate);
  const mappedTrades = mapDhanTradesToJournalTrades(sourceTrades);

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
