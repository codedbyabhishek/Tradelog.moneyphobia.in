'use client';

import { useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade } from '@/lib/types';

type ReviewPeriod = 'weekly' | 'monthly';

interface PeriodStats {
  startDate: string;
  endDate: string;
  trades: Trade[];
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winPercent: number;
  totalPnL: number;
  avgRFactor: number;
  setupStats: Map<string, { count: number; pnl: number; wins: number; winRate: number }>;
  mistakeStats: Map<string, number>;
  bestSetup: { name: string; pnl: number; count: number; winRate: number } | null;
  worstMistake: { name: string; count: number } | null;
}

export default function WeeklyReview() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];
  const [period, setPeriod] = useState<ReviewPeriod>('weekly');

  const getPeriodStats = (periodType: ReviewPeriod): PeriodStats[] => {
    if (trades.length === 0) return [];

    const sortedTrades = [...trades].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const stats: PeriodStats[] = [];
    let groupedTrades: { [key: string]: Trade[] } = {};

    sortedTrades.forEach(trade => {
      const tradeDate = new Date(trade.date);
      let key: string;

      if (periodType === 'weekly') {
        // Get week number (ISO 8601)
        const startOfYear = new Date(tradeDate.getFullYear(), 0, 1);
        const diff = tradeDate.getTime() - startOfYear.getTime();
        const dayOfWeek = tradeDate.getDay();
        const msPerDay = 86400000;
        const dayNumber = Math.floor(diff / msPerDay);
        const weekNumber = Math.ceil((dayNumber + startOfYear.getDay() + 1) / 7);
        key = `${tradeDate.getFullYear()}-W${weekNumber}`;
      } else {
        // Monthly
        key = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedTrades[key]) {
        groupedTrades[key] = [];
      }
      groupedTrades[key].push(trade);
    });

    Object.entries(groupedTrades).forEach(([key, periodTrades]) => {
      const wins = periodTrades.filter(t => t.pnl > 0).length;
      const losses = periodTrades.filter(t => t.pnl < 0).length;
      const totalPnL = periodTrades.reduce((sum, t) => sum + t.pnl, 0);
      const avgR = periodTrades.length > 0 
        ? periodTrades.reduce((sum, t) => sum + t.rFactor, 0) / periodTrades.length 
        : 0;

      // Setup stats
      const setupStats = new Map<string, { count: number; pnl: number; winRate: number }>();
      periodTrades.forEach(trade => {
        const existing = setupStats.get(trade.setupName) || { count: 0, pnl: 0, wins: 0 };
        const isWin = trade.pnl > 0;
        const newWins = existing.wins + (isWin ? 1 : 0);
        const newCount = existing.count + 1;
        setupStats.set(trade.setupName, {
          count: newCount,
          pnl: existing.pnl + trade.pnl,
          wins: newWins,
          winRate: Math.round((newWins / newCount) * 100),
        });
      });

      // Mistake stats
      const mistakeStats = new Map<string, number>();
      periodTrades.forEach(trade => {
        if (trade.mistakeTag) {
          mistakeStats.set(trade.mistakeTag, (mistakeStats.get(trade.mistakeTag) || 0) + 1);
        }
      });

      // Best setup
      let bestSetup: { name: string; pnl: number; count: number; winRate: number } | null = null;
      setupStats.forEach((stats, setupName) => {
        if (!bestSetup || stats.pnl > bestSetup.pnl) {
          bestSetup = { name: setupName, pnl: stats.pnl, count: stats.count, winRate: stats.winRate };
        }
      });

      // Worst habit
      let worstMistake: { name: string; count: number } | null = null;
      mistakeStats.forEach((count, mistake) => {
        if (!worstMistake || count > worstMistake.count) {
          worstMistake = { name: mistake, count };
        }
      });

      // Get date range
      const periodDateRange = periodTrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const startDate = periodDateRange[0]?.date || '';
      const endDate = periodDateRange[periodDateRange.length - 1]?.date || '';

      stats.push({
        startDate,
        endDate,
        trades: periodTrades,
        totalTrades: periodTrades.length,
        winCount: wins,
        lossCount: losses,
        winPercent: periodTrades.length > 0 ? Math.round((wins / periodTrades.length) * 100) : 0,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        avgRFactor: parseFloat(avgR.toFixed(2)),
        setupStats,
        mistakeStats,
        bestSetup,
        worstMistake,
      });
    });

    return stats;
  };

  const periodStats = useMemo(() => getPeriodStats(period), [trades, period]);

  if (trades.length === 0) {
    return (
      <div className="p-8">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Weekly/Monthly Review</CardTitle>
            <CardDescription>No trades yet. Start logging trades to see your weekly and monthly summaries.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Weekly/Monthly Review</h1>
        <p className="text-muted-foreground">Track your performance across trading weeks and months</p>
      </div>

      {/* Period Toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => setPeriod('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            period === 'weekly'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setPeriod('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            period === 'monthly'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Period Stats Cards */}
      <div className="space-y-6">
        {periodStats.map((stats, idx) => (
          <Card key={idx} className="border-border">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">
                    {period === 'weekly' ? 'Week' : 'Month'} of {new Date(stats.startDate).toLocaleDateString()}
                  </CardTitle>
                  <CardDescription>
                    {stats.startDate} to {stats.endDate}
                  </CardDescription>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold ${
                  stats.totalPnL >= 0 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {baseCurrencySymbol}{stats.totalPnL.toFixed(2)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Total Trades */}
                <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Total Trades</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalTrades}</p>
                </div>

                {/* Win % */}
                <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Win %</p>
                  <p className="text-2xl font-bold text-foreground">{stats.winPercent}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.winCount}W / {stats.lossCount}L
                  </p>
                </div>

                {/* Avg R */}
                <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Avg R</p>
                  <p className={`text-2xl font-bold ${stats.avgRFactor >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.avgRFactor >= 0 ? '+' : ''}{stats.avgRFactor.toFixed(2)}R
                  </p>
                </div>

                {/* Best Setup */}
                <div className="bg-secondary p-4 rounded-lg col-span-2 md:col-span-1">
                  <p className="text-sm text-muted-foreground mb-2">Best Setup</p>
                  {stats.bestSetup ? (
                    <>
                      <p className="font-bold text-foreground text-sm truncate">{stats.bestSetup.name}</p>
                      <p className={`text-lg font-bold mt-1 ${
                        stats.bestSetup.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {baseCurrencySymbol}{stats.bestSetup.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.bestSetup.winRate}% WR
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
              </div>

              {/* Worst Habit */}
              {stats.worstMistake && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Most Common Mistake</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{stats.worstMistake.name}</p>
                    <span className="bg-destructive/30 text-destructive px-3 py-1 rounded-full text-sm font-semibold">
                      {stats.worstMistake.count} times
                    </span>
                  </div>
                </div>
              )}

              {/* Setup Breakdown */}
              {stats.setupStats.size > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Setup Performance</p>
                  <div className="space-y-2">
                    {Array.from(stats.setupStats.entries())
                      .sort((a, b) => b[1].pnl - a[1].pnl)
                      .map(([setupName, data]) => (
                        <div key={setupName} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{setupName}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.count} trade{data.count > 1 ? 's' : ''} • {data.winRate}% WR
                            </p>
                          </div>
                          <p className={`font-bold ${data.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.pnl >= 0 ? '+' : ''}{baseCurrencySymbol}{data.pnl.toFixed(2)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Mistakes Breakdown */}
              {stats.mistakeStats.size > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Mistake Breakdown</p>
                  <div className="space-y-2">
                    {Array.from(stats.mistakeStats.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([mistake, count]) => (
                        <div key={mistake} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <p className="font-medium text-foreground">{mistake}</p>
                          <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
