import { describe, expect, it } from 'vitest';
import { createDefaultTradingPlan, getTradingPlanProgress, normalizeTradingPlan } from '@/lib/trading-plan';

describe('trading plan helpers', () => {
  it('creates a usable session plan with routine and entry checks', () => {
    const plan = createDefaultTradingPlan();

    expect(plan.preMarketRoutine.length).toBeGreaterThan(0);
    expect(plan.entryCriteria.length).toBeGreaterThan(0);
    expect(getTradingPlanProgress(plan)).toMatchObject({ completed: 0, percent: 0 });
  });

  it('normalizes saved plans and limits unsafe numeric values', () => {
    const plan = normalizeTradingPlan({
      name: '  London breakout  ',
      maxTradesPerDay: 999,
      riskPerTradePercent: -10,
      entryCriteria: [{ id: 'rule-a', label: 'Wait for confirmation', completed: true }],
    });

    expect(plan.name).toBe('London breakout');
    expect(plan.maxTradesPerDay).toBe(50);
    expect(plan.riskPerTradePercent).toBe(0.01);
    expect(plan.entryCriteria).toEqual([{ id: 'rule-a', label: 'Wait for confirmation', completed: true }]);
  });
});
