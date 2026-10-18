import { describe, expect, it } from 'vitest';
import { calculateMonthlyReturnTargets } from '@/lib/performance-analytics';
import type { Trade } from '@/lib/types';

const trades = [
  { id: 'trade-1', date: '2026-09-10', pnl: 300, pnlBase: 300 },
  { id: 'trade-2', date: '2026-10-10', pnl: -100, pnlBase: -100 },
] as Trade[];

describe('calculateMonthlyReturnTargets', () => {
  it('uses the configured monthly target for each month', () => {
    expect(calculateMonthlyReturnTargets(trades, {}, 500)).toEqual([
      { month: '2026-09', target: 500, actual: 300, percentage: 60 },
      { month: '2026-10', target: 500, actual: -100, percentage: -20 },
    ]);
  });

  it('uses a month-specific target when supplied', () => {
    expect(calculateMonthlyReturnTargets(trades, { '2026-09': 250 }, 500)[0]).toEqual({
      month: '2026-09',
      target: 250,
      actual: 300,
      percentage: 120,
    });
  });

  it('handles a zero target without producing a non-finite progress value', () => {
    expect(calculateMonthlyReturnTargets(trades, {}, 0).map(({ percentage }) => percentage)).toEqual([100, 0]);
  });
});
