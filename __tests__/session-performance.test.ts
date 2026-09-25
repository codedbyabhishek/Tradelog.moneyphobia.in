import { describe, expect, it } from 'vitest';
import { calculateCoreSessionPerformance, getCoreTradingSession, inferMarketSessionFromEntryTime } from '@/lib/session-performance';
import type { Trade } from '@/lib/types';

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: 'session-trade',
    date: '2026-09-25',
    dayOfWeek: 'Friday',
    symbol: 'XAUUSD',
    tradeType: 'Intraday',
    setupName: 'Breakout',
    position: 'Buy',
    stopLoss: 100,
    quantity: 1,
    fees: 0,
    pnl: 0,
    currency: 'USD',
    pnlBase: 0,
    exchangeRate: 1,
    tradeResult: 'Break-Even',
    rFactor: 0,
    isWin: false,
    confidence: 5,
    preNotes: '',
    postNotes: '',
    ruleFollowed: true,
    ...overrides,
  };
}

describe('session performance', () => {
  it('uses UTC entry time when a session was not saved', () => {
    expect(inferMarketSessionFromEntryTime('07:30')).toBe('Asia');
    expect(getCoreTradingSession(trade({ entryTime: '07:30' }))).toBe('Asian');
    expect(getCoreTradingSession(trade({ entryTime: '14:15' }))).toBe('New York');
    expect(getCoreTradingSession(trade({ session: 'Overlap_London_NY' }))).toBe('New York');
    expect(getCoreTradingSession(trade({ entryTime: 'not-a-time' }))).toBeUndefined();
  });

  it('calculates core-session P&L, win rate, and excludes off-hours trades', () => {
    const summary = calculateCoreSessionPerformance([
      trade({ id: 'asia-win', session: 'Asia', pnlBase: 100, pnl: 100 }),
      trade({ id: 'london-loss', session: 'London', pnlBase: -20, pnl: -20 }),
      trade({ id: 'ny-win', session: 'NewYork', pnlBase: 40, pnl: 40 }),
      trade({ id: 'off-hours', session: 'Off_Hours', pnlBase: 30, pnl: 30 }),
    ]);

    expect(summary.assignedTrades).toBe(3);
    expect(summary.unassignedTrades).toBe(1);
    expect(summary.sessions).toMatchObject([
      { id: 'Asian', tradeCount: 1, pnl: 100, winRate: 100 },
      { id: 'London', tradeCount: 1, pnl: -20, winRate: 0 },
      { id: 'New York', tradeCount: 1, pnl: 40, winRate: 100 },
    ]);
  });
});
