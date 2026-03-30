"use client";

import { useMemo, useState } from "react";
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trade } from '@/lib/types';
import { getTradeBasePnL, getTradeCharges, CURRENCY_SYMBOLS, BASE_CURRENCY, formatCurrency, convertToBaseCurrency } from '@/lib/trade-utils';
import { calculateExpectancy } from '@/lib/analytics-engine';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

interface Analytics {
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestDay: { date: string; pnl: number };
  worstDay: { date: string; pnl: number };
  emotionCorrelation: { emotion: string; wins: number; losses: number; winRate: number }[];
  sessionPerformance: { session: string; winRate: number; pnl: number }[];
}

export default function AdvancedAnalytics() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];

  // Time range in days for "Your Stats" section (default: last 30 days)
  const [statsRangeDays, setStatsRangeDays] = useState<number>(30);

  const filteredTrades = useMemo<Trade[]>(() => {
    if (!trades || trades.length === 0) return [];
    if (statsRangeDays === -1) return trades;

    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - statsRangeDays + 1);

    return trades.filter((t) => {
      const d = new Date(t.date);
      return d >= cutoff;
    });
  }, [trades, statsRangeDays]);

  // Pre-compute daily aggregates for filtered trades
  const dailyAggregates = useMemo(() => {
    if (!filteredTrades.length) return { byDate: new Map<string, { pnl: number; volume: number }>(), orderedDates: [] as string[] };

    const byDate = new Map<string, { pnl: number; volume: number }>();
    filteredTrades.forEach((trade) => {
      const key = trade.date;
      const existing = byDate.get(key) || { pnl: 0, volume: 0 };
      existing.pnl += getTradeBasePnL(trade);
      existing.volume += trade.quantity;
      byDate.set(key, existing);
    });

    const orderedDates = Array.from(byDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return { byDate, orderedDates };
  }, [filteredTrades]);

  const yourStats = useMemo(() => {
    if (!filteredTrades.length) {
      return null;
    }

    const totalTrades = filteredTrades.length;
    const basePnls = filteredTrades.map((t) => getTradeBasePnL(t));

    // Monthly aggregates
    const monthlyMap = new Map<string, { label: string; pnl: number }>();
    filteredTrades.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const existing = monthlyMap.get(key) || { label, pnl: 0 };
      existing.pnl += getTradeBasePnL(t);
      monthlyMap.set(key, existing);
    });
    const monthlyArray = Array.from(monthlyMap.values());
    const bestMonth = monthlyArray.length
      ? monthlyArray.reduce((a, b) => (b.pnl > a.pnl ? b : a))
      : null;
    const worstMonth = monthlyArray.length
      ? monthlyArray.reduce((a, b) => (b.pnl < a.pnl ? b : a))
      : null;
    const avgMonthlyPnl =
      monthlyArray.length > 0
        ? monthlyArray.reduce((sum, m) => sum + m.pnl, 0) / monthlyArray.length
        : 0;

    // General performance
    const totalPnl = basePnls.reduce((sum, v) => sum + v, 0);

    const { byDate, orderedDates } = dailyAggregates;
    const totalTradingDays = orderedDates.length;

    const avgDailyVolume =
      totalTradingDays > 0
        ? orderedDates.reduce((sum, d) => sum + (byDate.get(d)?.volume ?? 0), 0) / totalTradingDays
        : 0;

    const winningTrades = filteredTrades.filter((t) => getTradeBasePnL(t) > 0);
    const losingTrades = filteredTrades.filter((t) => getTradeBasePnL(t) < 0);
    const breakevenTrades = filteredTrades.filter((t) => getTradeBasePnL(t) === 0);

    const avgWinningTrade =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0) / winningTrades.length
        : 0;
    const avgLosingTrade =
      losingTrades.length > 0
        ? Math.abs(
            losingTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0) /
              losingTrades.length,
          )
        : 0;

    // Trade streaks (wins / losses)
    const sortedByDate = [...filteredTrades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    sortedByDate.forEach((t) => {
      const pnl = getTradeBasePnL(t);
      if (pnl > 0) {
        currentWinStreak += 1;
        currentLossStreak = 0;
      } else if (pnl < 0) {
        currentLossStreak += 1;
        currentWinStreak = 0;
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    });

    // Trading costs
    const totalCommissions = filteredTrades.reduce((sum, t) => {
      const charges = getTradeCharges(t);
      const baseCharges = t.currency
        ? convertToBaseCurrency(charges, t.currency, t.exchangeRate)
        : charges;
      return sum + baseCharges;
    }, 0);
    const totalSwap = 0; // Not tracked in current schema

    // Trade extremes
    const largestProfit =
      winningTrades.length > 0
        ? Math.max(...winningTrades.map((t) => getTradeBasePnL(t)))
        : 0;
    const largestLoss =
      losingTrades.length > 0
        ? Math.min(...losingTrades.map((t) => getTradeBasePnL(t)))
        : 0;

    // Trade durations (using entryTime/exitTime on same date where available)
    const computeDurations = (tradesSubset: Trade[]) => {
      const minutes: number[] = [];
      tradesSubset.forEach((t) => {
        if (!t.entryTime || !t.exitTime) return;
        const [eh, em] = t.entryTime.split(':').map(Number);
        const [xh, xm] = t.exitTime.split(':').map(Number);
        const diff = (xh * 60 + xm) - (eh * 60 + em);
        if (Number.isFinite(diff) && diff >= 0) {
          minutes.push(diff);
        }
      });
      if (!minutes.length) return 0;
      return minutes.reduce((s, v) => s + v, 0) / minutes.length;
    };

    const avgHoldAll = computeDurations(filteredTrades);
    const avgHoldWinning = computeDurations(winningTrades);
    const avgHoldLosing = computeDurations(losingTrades);

    // Trading activity by day
    let winningDays = 0;
    let losingDays = 0;
    let breakevenDays = 0;
    orderedDates.forEach((d) => {
      const pnl = byDate.get(d)?.pnl ?? 0;
      if (pnl > 0) winningDays += 1;
      else if (pnl < 0) losingDays += 1;
      else breakevenDays += 1;
    });

    // Day streaks
    let maxWinningDayStreak = 0;
    let maxLosingDayStreak = 0;
    let currentWinningDayStreak = 0;
    let currentLosingDayStreak = 0;
    orderedDates.forEach((d) => {
      const pnl = byDate.get(d)?.pnl ?? 0;
      if (pnl > 0) {
        currentWinningDayStreak += 1;
        currentLosingDayStreak = 0;
      } else if (pnl < 0) {
        currentLosingDayStreak += 1;
        currentWinningDayStreak = 0;
      } else {
        currentWinningDayStreak = 0;
        currentLosingDayStreak = 0;
      }
      maxWinningDayStreak = Math.max(maxWinningDayStreak, currentWinningDayStreak);
      maxLosingDayStreak = Math.max(maxLosingDayStreak, currentLosingDayStreak);
    });

    // Daily performance
    const totalDailyPnl = orderedDates.reduce(
      (sum, d) => sum + (byDate.get(d)?.pnl ?? 0),
      0,
    );
    const winningDayPnls = orderedDates
      .map((d) => byDate.get(d)?.pnl ?? 0)
      .filter((v) => v > 0);
    const losingDayPnls = orderedDates
      .map((d) => byDate.get(d)?.pnl ?? 0)
      .filter((v) => v < 0);

    const avgDailyPnl =
      totalTradingDays > 0 ? totalDailyPnl / totalTradingDays : 0;
    const avgWinningDayPnl =
      winningDayPnls.length > 0
        ? winningDayPnls.reduce((s, v) => s + v, 0) / winningDayPnls.length
        : 0;
    const avgLosingDayPnl =
      losingDayPnls.length > 0
        ? Math.abs(
            losingDayPnls.reduce((s, v) => s + v, 0) / losingDayPnls.length,
          )
        : 0;
    const largestProfitableDay = winningDayPnls.length
      ? Math.max(...winningDayPnls)
      : 0;
    const largestLosingDay = losingDayPnls.length
      ? Math.min(...losingDayPnls)
      : 0;

    // Risk metrics
    const expectancyResult = calculateExpectancy(filteredTrades);

    // Max drawdown and percentage
    let peak = 0;
    let cumulative = 0;
    let maxDrawdown = 0;
    let peakAtMaxDD = 0;
    sortedByDate.forEach((t) => {
      cumulative += getTradeBasePnL(t);
      if (cumulative > peak) {
        peak = cumulative;
      }
      const dd = peak - cumulative;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        peakAtMaxDD = peak;
      }
    });
    const maxDrawdownPct =
      peakAtMaxDD > 0 ? (maxDrawdown / peakAtMaxDD) * 100 : 0;

    return {
      monthly: {
        bestMonth,
        worstMonth,
        avgMonthlyPnl,
      },
      general: {
        totalPnl,
        avgDailyVolume,
        avgWinningTrade,
        avgLosingTrade,
      },
      tradeStats: {
        totalTrades,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        breakevenTrades: breakevenTrades.length,
      },
      streaks: {
        maxConsecutiveWins: maxWinStreak,
        maxConsecutiveLosses: maxLossStreak,
      },
      costs: {
        totalCommissions,
        totalSwap,
      },
      extremes: {
        largestProfit,
        largestLoss,
      },
      durations: {
        avgHoldAll,
        avgHoldWinning,
        avgHoldLosing,
      },
      activity: {
        openTrades: 0,
        totalTradingDays,
        winningDays,
        losingDays,
        breakevenDays,
      },
      dayStreaks: {
        maxWinningDayStreak,
        maxLosingDayStreak,
      },
      dailyPerformance: {
        avgDailyPnl,
        avgWinningDayPnl,
        avgLosingDayPnl,
        largestProfitableDay,
        largestLosingDay,
      },
      risk: {
        tradeExpectancy: expectancyResult.expectancy,
        maxDrawdown,
        maxDrawdownPct,
      },
    };
  }, [filteredTrades, dailyAggregates]);

  const formatDuration = (minutes: number): string => {
    if (!minutes || !Number.isFinite(minutes)) return '—';
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    if (hours <= 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatPnl = (value: number | null | undefined): string => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    if (value === 0) return `${baseCurrencySymbol}0`;
    return `${baseCurrencySymbol}${value.toFixed(2)}`;
  };

  const formatPlainNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return value.toString();
  };

  const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return `${value.toFixed(1)}%`;
  };

  const analytics = useMemo<Analytics>(() => {
    if (!trades || trades.length === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        bestDay: { date: 'N/A', pnl: 0 },
        worstDay: { date: 'N/A', pnl: 0 },
        emotionCorrelation: [],
        sessionPerformance: [],
      };
    }

    // Basic statistics
    const wins = trades.filter(t => getTradeBasePnL(t) > 0);
    const losses = trades.filter(t => getTradeBasePnL(t) < 0);
    const winRate = (wins.length / trades.length) * 100;

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + getTradeBasePnL(t), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + getTradeBasePnL(t), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Best/Worst days (by net P&L)
    const dailyPnL = new Map<string, number>();
    trades.forEach(trade => {
      const date = new Date(trade.date).toLocaleDateString();
      const current = dailyPnL.get(date) || 0;
      dailyPnL.set(date, current + getTradeBasePnL(trade));
    });

    const days = Array.from(dailyPnL.entries()).sort(([, a], [, b]) => b - a);
    const bestDay = days.length > 0 ? { date: days[0][0], pnl: days[0][1] } : { date: 'N/A', pnl: 0 };
    const worstDay = days.length > 0 ? { date: days[days.length - 1][0], pnl: days[days.length - 1][1] } : { date: 'N/A', pnl: 0 };

    // Emotion correlation
    const emotionStats = new Map<string, { wins: number; losses: number }>();
    trades.forEach(trade => {
      const emotions = [];
      if (trade.emotionEntry) emotions.push(trade.emotionEntry);
      if (trade.emotionExit) emotions.push(trade.emotionExit);

      emotions.forEach(emotion => {
        const current = emotionStats.get(emotion) || { wins: 0, losses: 0 };
        if (getTradeBasePnL(trade) > 0) {
          current.wins++;
        } else if (getTradeBasePnL(trade) < 0) {
          current.losses++;
        }
        emotionStats.set(emotion, current);
      });
    });

    const emotionCorrelation = Array.from(emotionStats.entries())
      .map(([emotion, stats]) => ({
        emotion,
        ...stats,
        winRate: (stats.wins / (stats.wins + stats.losses)) * 100,
      }))
      .sort((a, b) => b.winRate - a.winRate);

    // Session performance (if data available)
    const sessionStats = new Map<string, { wins: number; total: number; pnl: number }>();
    trades.forEach(trade => {
      if (trade.session) {
        const current = sessionStats.get(trade.session) || { wins: 0, total: 0, pnl: 0 };
        current.total++;
        current.pnl += getTradeBasePnL(trade);
        if (getTradeBasePnL(trade) > 0) current.wins++;
        sessionStats.set(trade.session, current);
      }
    });

    const sessionPerformance = Array.from(sessionStats.entries()).map(([session, stats]) => ({
      session,
      winRate: (stats.wins / stats.total) * 100,
      pnl: stats.pnl,
    }));

    return {
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      bestDay,
      worstDay,
      emotionCorrelation,
      sessionPerformance,
    };
  }, [trades]);

  if (!trades || trades.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No trades yet. Start trading and track your performance here!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Advanced Analytics</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.winRate.toFixed(1)}%</div>
            <div className="mt-2">
              <Progress value={analytics.winRate} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{trades.filter(t => getTradeBasePnL(t) > 0).length} wins / {trades.length} trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.profitFactor.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">Avg Win: {baseCurrencySymbol}{analytics.avgWin.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Avg Loss: {baseCurrencySymbol}{analytics.avgLoss.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.bestDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {baseCurrencySymbol}{analytics.bestDay.pnl.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{analytics.bestDay.date}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Worst Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.worstDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {baseCurrencySymbol}{analytics.worstDay.pnl.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{analytics.worstDay.date}</p>
          </CardContent>
        </Card>
      </div>

      {/* Your Stats */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl">Your Stats</CardTitle>
            <CardDescription>
              Trading performance for the selected time range
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">Range:</span>
            <div className="inline-flex rounded-full bg-background/40 border border-border/60 p-1">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setStatsRangeDays(days)}
                  className={`px-2 py-1 rounded-full ${
                    statsRangeDays === days
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {days}d
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStatsRangeDays(-1)}
                className={`px-2 py-1 rounded-full ${
                  statsRangeDays === -1
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!yourStats ? (
            <p className="text-sm text-muted-foreground">
              No data in the selected range. Try expanding the date range or add trades.
            </p>
          ) : (
            <>
              {/* Monthly Performance */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Monthly Performance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Best Month</p>
                    <p className="text-sm font-semibold">
                      {yourStats.monthly.bestMonth
                        ? yourStats.monthly.bestMonth.label
                        : "—"}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        (yourStats.monthly.bestMonth?.pnl ?? 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {yourStats.monthly.bestMonth
                        ? formatPnl(yourStats.monthly.bestMonth.pnl)
                        : "—"}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Worst Month</p>
                    <p className="text-sm font-semibold">
                      {yourStats.monthly.worstMonth
                        ? yourStats.monthly.worstMonth.label
                        : "—"}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        (yourStats.monthly.worstMonth?.pnl ?? 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {yourStats.monthly.worstMonth
                        ? formatPnl(yourStats.monthly.worstMonth.pnl)
                        : "—"}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Average Monthly P&amp;L
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        yourStats.monthly.avgMonthlyPnl >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatPnl(yourStats.monthly.avgMonthlyPnl)}
                    </p>
                  </div>
                </div>
              </section>

              {/* General Performance */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  General Performance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total P&amp;L</p>
                    <p
                      className={`text-sm font-semibold ${
                        yourStats.general.totalPnl >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatPnl(yourStats.general.totalPnl)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Average Daily Volume
                    </p>
                    <p className="text-sm font-semibold">
                      {yourStats.general.avgDailyVolume > 0
                        ? yourStats.general.avgDailyVolume.toFixed(1)
                        : "—"}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Average Winning Trade
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatPnl(yourStats.general.avgWinningTrade)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Average Losing Trade
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPnl(yourStats.general.avgLosingTrade)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Trade Statistics & Streaks */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Trade Statistics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Trades
                    </p>
                    <p className="text-sm font-semibold">
                      {formatPlainNumber(yourStats.tradeStats.totalTrades)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Winning Trades
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatPlainNumber(yourStats.tradeStats.winningTrades)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Losing Trades
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPlainNumber(yourStats.tradeStats.losingTrades)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Break-even Trades
                    </p>
                    <p className="text-sm font-semibold">
                      {formatPlainNumber(yourStats.tradeStats.breakevenTrades)}
                    </p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  Streak Statistics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Max Consecutive Wins
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatPlainNumber(yourStats.streaks.maxConsecutiveWins)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Max Consecutive Losses
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPlainNumber(yourStats.streaks.maxConsecutiveLosses)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Trading Costs & Extremes */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Trading Costs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Commissions
                    </p>
                    <p className="text-sm font-semibold text-orange-400">
                      {formatPnl(yourStats.costs.totalCommissions)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Swap</p>
                    <p className="text-sm font-semibold">
                      {yourStats.costs.totalSwap !== 0
                        ? formatPnl(yourStats.costs.totalSwap)
                        : '—'}
                    </p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  Trade Extremes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Largest Profit
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {yourStats.extremes.largestProfit
                        ? formatPnl(yourStats.extremes.largestProfit)
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Largest Loss
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {yourStats.extremes.largestLoss
                        ? formatPnl(yourStats.extremes.largestLoss)
                        : '—'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Trade Duration */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Trade Duration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Hold Time (All)
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDuration(yourStats.durations.avgHoldAll)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Hold Time (Wins)
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDuration(yourStats.durations.avgHoldWinning)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Hold Time (Losses)
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDuration(yourStats.durations.avgHoldLosing)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Trading Activity & Day Streaks */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Trading Activity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Open Trades</p>
                    <p className="text-sm font-semibold">0</p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Trading Days
                    </p>
                    <p className="text-sm font-semibold">
                      {formatPlainNumber(yourStats.activity.totalTradingDays)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Winning Days
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatPlainNumber(yourStats.activity.winningDays)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Losing Days
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPlainNumber(yourStats.activity.losingDays)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Breakeven Days
                    </p>
                    <p className="text-sm font-semibold">
                      {formatPlainNumber(yourStats.activity.breakevenDays)}
                    </p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  Day Streaks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Max Consecutive Winning Days
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatPlainNumber(yourStats.dayStreaks.maxWinningDayStreak)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Max Consecutive Losing Days
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPlainNumber(yourStats.dayStreaks.maxLosingDayStreak)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Daily Performance & Risk Metrics */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Daily Performance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Daily P&amp;L
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        yourStats.dailyPerformance.avgDailyPnl >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatPnl(yourStats.dailyPerformance.avgDailyPnl)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Winning Day P&amp;L
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatPnl(yourStats.dailyPerformance.avgWinningDayPnl)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Losing Day P&amp;L
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPnl(yourStats.dailyPerformance.avgLosingDayPnl)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Largest Profitable Day
                    </p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatPnl(yourStats.dailyPerformance.largestProfitableDay)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Largest Losing Day
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPnl(yourStats.dailyPerformance.largestLosingDay)}
                    </p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  Risk Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Trade Expectancy
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        yourStats.risk.tradeExpectancy >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatPnl(yourStats.risk.tradeExpectancy)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Maximum Drawdown
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPnl(yourStats.risk.maxDrawdown)}
                    </p>
                  </div>
                  <div className="bg-background/60 border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Maximum Drawdown %
                    </p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatPercent(yourStats.risk.maxDrawdownPct)}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>

      {/* Emotion Correlation */}
      {analytics.emotionCorrelation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Emotion vs Performance</CardTitle>
            <CardDescription>Win rate by emotional state during trading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.emotionCorrelation.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.emotion}</span>
                      <Badge variant={item.winRate >= 50 ? 'default' : 'destructive'}>
                        {item.winRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.wins}W / {item.losses}L</span>
                  </div>
                  <Progress value={item.winRate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Performance */}
      {analytics.sessionPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Performance</CardTitle>
            <CardDescription>Performance by trading session</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.sessionPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="winRate" fill="#8b5cf6" name="Win Rate %" />
                <Bar yAxisId="right" dataKey="pnl" fill="#10b981" name={`P&L (${BASE_CURRENCY})`} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart for Multi-Metric Analysis */}
      {analytics.emotionCorrelation.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Radar</CardTitle>
            <CardDescription>Multi-dimensional performance view</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={analytics.emotionCorrelation}>
                <PolarGrid />
                <PolarAngleAxis dataKey="emotion" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Win Rate %" dataKey="winRate" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
