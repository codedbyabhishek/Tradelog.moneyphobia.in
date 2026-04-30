'use client';

import { useMemo } from 'react';
import { useTrades } from '@/lib/trade-context';
import { PerformanceDashboard } from '@/components/performance-dashboard';
import { generatePerformanceMetrics } from '@/lib/performance-analytics';
import { getTradeBasePnL } from '@/lib/trade-utils';

export default function Performance() {
  const { trades } = useTrades();
  const metrics = useMemo(() => generatePerformanceMetrics(trades), [trades]);

  const overview = useMemo(() => {
    const currentEquity = metrics.equityCurve.at(-1)?.equity ?? 0;
    const positiveTrades = trades.filter((trade) => getTradeBasePnL(trade) > 0).length;
    const strongestSymbol = metrics.symbolPerformance[0];

    return {
      currentEquity,
      totalTrades: trades.length,
      hitRate: trades.length > 0 ? (positiveTrades / trades.length) * 100 : 0,
      maxDrawdown: metrics.drawdownStats.maxDrawdown,
      currentStreak:
        metrics.streakStats.currentOutcome === 'win'
          ? `${metrics.streakStats.currentWinStreak}W`
          : metrics.streakStats.currentOutcome === 'loss'
            ? `${metrics.streakStats.currentLossStreak}L`
            : metrics.streakStats.currentOutcome === 'breakeven'
              ? 'BE'
              : 'N/A',
      strongestSymbol: strongestSymbol?.symbol ?? 'N/A',
      strongestSymbolPnl: strongestSymbol?.pnl ?? 0,
    };
  }, [metrics, trades]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <section className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-[28px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.66))] p-6 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))] sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Performance</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Performance Overview
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Track equity growth, drawdowns, streak behavior, symbol leadership, and daily trading rhythm in one
                focused review surface.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-800 dark:text-cyan-100">
                Equity + risk read
              </span>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-100">
                Symbol breakdown
              </span>
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-100">
                Monthly cadence
              </span>
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-800 dark:text-rose-100">
                Streak discipline
              </span>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-xl">
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current Equity</p>
              <p className={`mt-2 text-2xl font-semibold ${overview.currentEquity >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                {formatCurrency(overview.currentEquity)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{overview.totalTrades} trades logged</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current Streak</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{overview.currentStreak}</p>
              <p className="mt-1 text-xs text-muted-foreground">Recent hit rate {formatPercent(overview.hitRate)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Max Drawdown</p>
              <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(overview.maxDrawdown)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Keep this contained as the system scales</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Top Symbol</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{overview.strongestSymbol}</p>
              <p className={`mt-1 text-xs ${overview.strongestSymbolPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(overview.strongestSymbolPnl)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">Dashboard</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Deep performance review</h2>
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Start with equity and monthly flow, then move into risk, streaks, symbols, and daily behavior.
          </p>
        </div>

        <PerformanceDashboard trades={trades} />
      </div>
    </section>
  );
}
