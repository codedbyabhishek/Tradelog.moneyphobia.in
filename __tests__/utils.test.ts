import { describe, expect, it } from 'vitest';
import { Trade, TradeFormData } from '@/lib/types';
import { calculatePnL, calculateRFactor, convertFormToTrade } from '@/lib/trade-utils';
import { generatePerformanceMetrics } from '@/lib/performance-analytics';
import { getTradeShareLayout } from '@/lib/share-card';

function trade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    date: '2026-01-15',
    dayOfWeek: 'Thursday',
    symbol: 'AAPL',
    tradeType: 'Intraday',
    setupName: 'Breakout',
    position: 'Buy',
    entryPrice: 100,
    exitPrice: 110,
    stopLoss: 95,
    quantity: 10,
    fees: 0,
    pnl: 100,
    currency: 'INR',
    pnlBase: 100,
    exchangeRate: 1,
    tradeResult: 'Win',
    rFactor: 2,
    isWin: true,
    confidence: 7,
    preNotes: 'Entry followed the plan.',
    postNotes: 'Target achieved.',
    ruleFollowed: true,
    ...overrides,
  };
}

const form: TradeFormData = {
  date: '2026-01-15',
  tags: 'breakout, earnings',
  symbol: 'aapl',
  tradeType: 'Intraday',
  setupName: 'Breakout',
  position: 'Buy',
  entryPrice: '100',
  exitPrice: '110',
  stopLoss: '95',
  quantity: '10',
  fees: '0',
  currency: 'INR',
  marketTrend: '',
  setupType: '',
  volumeProfile: '',
  emaTouch: '',
  riskRewardRatio: '',
  marketOpenType: '',
  firstFiveMinuteCandleType: '',
  confidence: '7',
  preNotes: 'Entry followed the plan.',
  postNotes: 'Target achieved.',
  hftScreenshot: 'data:image/png;base64,hft-screenshot',
  timeFrame: '15m',
  limit: 'L0.5',
  exit: 'L1',
  ruleFollowed: true,
};

describe('trade calculations', () => {
  it('calculates net P&L for buy and sell positions', () => {
    expect(calculatePnL(100, 110, 10, 'Buy', 5)).toBe(95);
    expect(calculatePnL(100, 90, 10, 'Sell', 5)).toBe(95);
  });

  it('derives a positive R-multiple from execution risk', () => {
    expect(calculateRFactor(200, 95, 100, 'Buy', 10)).toBe(4);
  });

  it('creates a canonical journal trade from a form submission', () => {
    const result = convertFormToTrade(form);

    expect(result.symbol).toBe('AAPL');
    expect(result.pnl).toBe(100);
    expect(result.pnlBase).toBe(100);
    expect(result.tradeResult).toBe('Win');
    expect(result.tags).toEqual(['breakout', 'earnings']);
    expect(result.hftScreenshot).toBe('data:image/png;base64,hft-screenshot');
  });
});

describe('trade share card formats', () => {
  it('uses platform-ready dimensions for story, post, and landscape exports', () => {
    expect(getTradeShareLayout('story')).toMatchObject({ width: 1080, height: 1920 });
    expect(getTradeShareLayout('post')).toMatchObject({ width: 1080, height: 1080 });
    expect(getTradeShareLayout('landscape')).toMatchObject({ width: 1920, height: 1080 });
  });
});

describe('Performance Analytics', () => {
  const testTrades: Trade[] = [
    trade({ id: 'trade-1', date: '2026-01-01', pnl: 100, pnlBase: 100 }),
    trade({
      id: 'trade-2',
      date: '2026-01-02',
      symbol: 'GOOGL',
      pnl: -25,
      pnlBase: -25,
      tradeResult: 'Loss',
      isWin: false,
    }),
  ];

  it('should generate performance metrics', () => {
    const metrics = generatePerformanceMetrics(testTrades);
    expect(metrics).toHaveProperty('weeklyPnL');
    expect(metrics).toHaveProperty('monthlyPnL');
    expect(metrics).toHaveProperty('equityCurve');
    expect(metrics).toHaveProperty('bestTradingHours');
    expect(metrics).toHaveProperty('bestTradingDays');
  });

  it('should calculate equity curve', () => {
    const metrics = generatePerformanceMetrics(testTrades);
    expect(metrics.equityCurve.length).toBeGreaterThan(0);
    expect(metrics.equityCurve[0]).toHaveProperty('date');
    expect(metrics.equityCurve[0]).toHaveProperty('equity');
  });
});
