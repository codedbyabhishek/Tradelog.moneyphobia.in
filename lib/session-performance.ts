import type { MarketSession, Trade } from '@/lib/types';
import { getTradeBasePnL } from '@/lib/trade-utils';

export type CoreTradingSession = 'Asian' | 'London' | 'New York';

export type CoreSessionPerformance = {
  id: CoreTradingSession;
  tradeCount: number;
  wins: number;
  winRate: number | null;
  pnl: number;
  averageTrade: number | null;
  tradeShare: number;
};

export type CoreSessionPerformanceSummary = {
  sessions: CoreSessionPerformance[];
  assignedTrades: number;
  unassignedTrades: number;
};

export const CORE_TRADING_SESSIONS: Array<{ id: CoreTradingSession; startMinute: number; endMinute: number }> = [
  { id: 'Asian', startMinute: 0, endMinute: 480 },
  { id: 'London', startMinute: 480, endMinute: 780 },
  { id: 'New York', startMinute: 780, endMinute: 1320 },
];

function isMarketSession(value: unknown): value is MarketSession {
  return typeof value === 'string' && [
    'Asia',
    'London',
    'NewYork',
    'Overlap_London_NY',
    'Overlap_Asia_London',
    'Off_Hours',
  ].includes(value);
}

export function inferMarketSessionFromEntryTime(entryTime: string | undefined): MarketSession | undefined {
  if (!entryTime || !/^\d{1,2}:\d{2}$/.test(entryTime)) return undefined;
  const [hours, minutes] = entryTime.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return undefined;
  }

  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 480) return 'Asia';
  if (totalMinutes < 780) return 'London';
  if (totalMinutes < 1320) return 'NewYork';
  return 'Off_Hours';
}

export function getCoreTradingSession(trade: Pick<Trade, 'session' | 'entryTime'>): CoreTradingSession | undefined {
  const session = isMarketSession(trade.session) ? trade.session : inferMarketSessionFromEntryTime(trade.entryTime);

  switch (session) {
    case 'Asia':
      return 'Asian';
    case 'London':
      return 'London';
    case 'NewYork':
      return 'New York';
    case 'Overlap_Asia_London':
      return 'London';
    case 'Overlap_London_NY':
      return 'New York';
    default:
      return undefined;
  }
}

/**
 * Builds the main Performance-page session summary in the account's base currency.
 * Overlap records roll into the next core market so this three-session view remains unambiguous.
 */
export function calculateCoreSessionPerformance(trades: Trade[]): CoreSessionPerformanceSummary {
  const records = new Map<CoreTradingSession, { tradeCount: number; wins: number; pnl: number }>(
    CORE_TRADING_SESSIONS.map(({ id }) => [id, { tradeCount: 0, wins: 0, pnl: 0 }]),
  );
  let unassignedTrades = 0;

  for (const trade of trades) {
    const session = getCoreTradingSession(trade);
    if (!session) {
      unassignedTrades += 1;
      continue;
    }

    const record = records.get(session)!;
    const pnl = getTradeBasePnL(trade);
    record.tradeCount += 1;
    record.wins += pnl > 0 ? 1 : 0;
    record.pnl += pnl;
  }

  const assignedTrades = [...records.values()].reduce((sum, item) => sum + item.tradeCount, 0);
  const sessions = CORE_TRADING_SESSIONS.map(({ id }) => {
    const record = records.get(id)!;
    return {
      id,
      tradeCount: record.tradeCount,
      wins: record.wins,
      winRate: record.tradeCount ? (record.wins / record.tradeCount) * 100 : null,
      pnl: record.pnl,
      averageTrade: record.tradeCount ? record.pnl / record.tradeCount : null,
      tradeShare: assignedTrades ? (record.tradeCount / assignedTrades) * 100 : 0,
    } satisfies CoreSessionPerformance;
  });

  return { sessions, assignedTrades, unassignedTrades };
}
