import { Trade } from '@/lib/types';
import { calculatePnL, calculateRFactor, convertFormToTrade } from '@/lib/trade-utils';
import { applyFilters, TradeFilters } from '@/lib/advanced-filters';
import { generatePerformanceMetrics } from '@/lib/performance-analytics';

describe('Trade Utils', () => {
  describe('calculatePnL', () => {
    it('should calculate profit for buy position', () => {
      const trade: Trade = {
        id: '1',
        symbol: 'AAPL',
        setupName: 'Breakout',
        entryPrice: 100,
        exitPrice: 110,
        stopLossPrice: 95,
        quantity: 10,
        entryDate: '2024-01-01T10:00:00',
        exitDate: '2024-01-01T12:00:00',
        direction: 'buy',
        emotion: 'confident',
        notes: 'Test trade',
        image_urls: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(calculatePnL(trade)).toBe(100); // (110 - 100) * 10
    });

    it('should calculate loss for buy position', () => {
      const trade: Trade = {
        id: '1',
        symbol: 'AAPL',
        setupName: 'Breakout',
        entryPrice: 100,
        exitPrice: 95,
        stopLossPrice: 90,
        quantity: 10,
        entryDate: '2024-01-01T10:00:00',
        exitDate: '2024-01-01T12:00:00',
        direction: 'buy',
        emotion: 'confident',
        notes: 'Test trade',
        image_urls: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(calculatePnL(trade)).toBe(-50); // (95 - 100) * 10
    });

    it('should calculate profit for sell position', () => {
      const trade: Trade = {
        id: '1',
        symbol: 'AAPL',
        setupName: 'Breakdown',
        entryPrice: 100,
        exitPrice: 90,
        stopLossPrice: 105,
        quantity: 10,
        entryDate: '2024-01-01T10:00:00',
        exitDate: '2024-01-01T12:00:00',
        direction: 'sell',
        emotion: 'confident',
        notes: 'Test trade',
        image_urls: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(calculatePnL(trade)).toBe(100); // (100 - 90) * 10
    });
  });

  describe('calculateRFactor', () => {
    it('should calculate R-Factor correctly', () => {
      const trade: Trade = {
        id: '1',
        symbol: 'AAPL',
        setupName: 'Breakout',
        entryPrice: 100,
        exitPrice: 120,
        stopLossPrice: 95,
        quantity: 10,
        entryDate: '2024-01-01T10:00:00',
        exitDate: '2024-01-01T12:00:00',
        direction: 'buy',
        emotion: 'confident',
        notes: 'Test trade',
        image_urls: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const rFactor = calculateRFactor(trade);
      expect(rFactor).toBeCloseTo(4); // (120-100)/(100-95) = 20/5 = 4
    });
  });
});

describe('Advanced Filters', () => {
  const testTrades: Trade[] = [
    {
      id: '1',
      symbol: 'AAPL',
      setupName: 'Breakout',
      entryPrice: 100,
      exitPrice: 110,
      stopLossPrice: 95,
      quantity: 10,
      entryDate: '2024-01-15T10:00:00',
      exitDate: '2024-01-15T12:00:00',
      direction: 'buy',
      emotion: 'confident',
      notes: 'Good setup',
      image_urls: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '2',
      symbol: 'GOOGL',
      setupName: 'Breakdown',
      entryPrice: 100,
      exitPrice: 95,
      stopLossPrice: 105,
      quantity: 5,
      entryDate: '2024-01-20T14:00:00',
      exitDate: '2024-01-20T16:00:00',
      direction: 'sell',
      emotion: 'neutral',
      notes: '',
      image_urls: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  it('should filter by symbol', () => {
    const filters: TradeFilters = { symbols: ['AAPL'] };
    const result = applyFilters(testTrades, filters);
    expect(result.length).toBe(1);
    expect(result[0].symbol).toBe('AAPL');
  });

  it('should filter by setup', () => {
    const filters: TradeFilters = { setups: ['Breakout'] };
    const result = applyFilters(testTrades, filters);
    expect(result.length).toBe(1);
    expect(result[0].setupName).toBe('Breakout');
  });

  it('should filter winning trades', () => {
    const filters: TradeFilters = { winOnly: true };
    const result = applyFilters(testTrades, filters);
    expect(result.length).toBe(1);
    expect(calculatePnL(result[0])).toBeGreaterThan(0);
  });

  it('should filter by date range', () => {
    const filters: TradeFilters = {
      dateRange: {
        start: '2024-01-16',
        end: '2024-01-21',
      },
    };
    const result = applyFilters(testTrades, filters);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });
});

describe('Performance Analytics', () => {
  const testTrades: Trade[] = [
    {
      id: '1',
      symbol: 'AAPL',
      setupName: 'Breakout',
      entryPrice: 100,
      exitPrice: 110,
      stopLossPrice: 95,
      quantity: 10,
      entryDate: '2024-01-01T10:00:00',
      exitDate: '2024-01-01T12:00:00',
      direction: 'buy',
      emotion: 'confident',
      notes: 'Good setup',
      image_urls: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '2',
      symbol: 'GOOGL',
      setupName: 'Breakout',
      entryPrice: 100,
      exitPrice: 95,
      stopLossPrice: 105,
      quantity: 5,
      entryDate: '2024-01-02T14:00:00',
      exitDate: '2024-01-02T16:00:00',
      direction: 'sell',
      emotion: 'neutral',
      notes: '',
      image_urls: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
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
