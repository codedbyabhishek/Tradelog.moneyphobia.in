"use client";

import type { ReactNode } from 'react';
import { useMemo, useState } from "react";
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertTriangle, Brain, CalendarRange, Clock3, Gauge, Layers3, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import { Trade } from '@/lib/types';
import { getTradeBasePnL, getTradeCharges, formatBaseCurrencyAmount, convertToBaseCurrency } from '@/lib/trade-utils';
import { isProPlan } from '@/lib/subscription';
import UpgradeBanner from '@/components/upgrade-banner';
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

function HeroMetricCard({
  title,
  value,
  subtitle,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10'
      : tone === 'negative'
        ? 'text-rose-300 border-rose-500/20 bg-rose-500/10'
        : 'text-foreground border-border/70 bg-background/80';

  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl border p-3 sm:p-4 ${toneClass}`}>
      <p className="break-words text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 break-all text-lg font-semibold leading-tight sm:text-xl xl:text-2xl">{value}</p>
      <p className="mt-2 break-words text-[11px] sm:text-xs leading-5 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StatPanel({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'positive' | 'negative' | 'warning' | 'neutral';
}) {
  const accentClass =
    accent === 'positive'
      ? 'text-emerald-300'
      : accent === 'negative'
        ? 'text-rose-300'
        : accent === 'warning'
          ? 'text-amber-300'
          : 'text-foreground';

  return (
    <div className="min-w-0 rounded-2xl border border-border/60 bg-background/60 p-3">
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.16em] leading-4 text-muted-foreground break-words">
        {label}
      </p>
      <p className={`mt-2 text-sm font-semibold leading-5 break-words ${accentClass}`}>{value}</p>
    </div>
  );
}

function InsightSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-2xl border border-border/70 bg-background/70 p-2.5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-muted-foreground break-words">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground break-words">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdvancedAnalytics() {
  const { trades } = useTrades();
  const { billingState } = useSettings();
  const { baseCurrency } = useSettings();
  const proPlan = isProPlan(billingState);

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
    return formatBaseCurrencyAmount(value, baseCurrency);
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

  if (!proPlan) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <UpgradeBanner
          title="Advanced Analytics is available on Traderlogify Pro"
          description="Upgrade to unlock deeper session analysis, risk metrics, duration studies, and advanced performance breakdowns."
        />
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="rounded-[28px] border border-border/70 bg-card p-6">
          <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">Advanced Analytics</Badge>
          <h1 className="text-3xl font-bold text-foreground">Performance command center</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This screen keeps your deeper review metrics, correlations, and risk readouts in one place.
          </p>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No trades yet. Start trading and track your performance here!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-border/70 bg-card px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_30%)]" />
        <div className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <Badge className="border-primary/20 bg-primary/10 text-primary">Advanced Analytics</Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl break-words">
              See the full story behind your trading performance
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base break-words">
              The core purpose stays the same: deeper performance review, emotional and session correlations,
              risk metrics, and a denser stats layer than the main analytics page.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:w-full xl:max-w-[560px] 2xl:max-w-[760px] 2xl:grid-cols-4">
            <HeroMetricCard
              title="Win Rate"
              value={formatPercent(analytics.winRate)}
              subtitle={`${trades.filter((t) => getTradeBasePnL(t) > 0).length} wins across ${trades.length} trades`}
              tone={analytics.winRate >= 50 ? 'positive' : 'negative'}
            />
            <HeroMetricCard
              title="Profit Factor"
              value={analytics.profitFactor.toFixed(2)}
              subtitle={`${formatPnl(analytics.avgWin)} avg win`}
              tone={analytics.profitFactor >= 1 ? 'positive' : 'negative'}
            />
            <HeroMetricCard
              title="Best Day"
              value={formatPnl(analytics.bestDay.pnl)}
              subtitle={analytics.bestDay.date}
              tone={analytics.bestDay.pnl >= 0 ? 'positive' : 'negative'}
            />
            <HeroMetricCard
              title="Worst Day"
              value={formatPnl(analytics.worstDay.pnl)}
              subtitle={analytics.worstDay.date}
              tone="negative"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.winRate.toFixed(1)}%</div>
            <div className="mt-2">
              <Progress value={analytics.winRate} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {trades.filter((t) => getTradeBasePnL(t) > 0).length} wins / {trades.length} trades
            </p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="break-all text-xl font-bold sm:text-2xl">{analytics.profitFactor.toFixed(2)}</div>
              <p className="mt-2 break-words text-xs text-muted-foreground">Avg Win: {formatPnl(analytics.avgWin)}</p>
              <p className="break-words text-xs text-muted-foreground">Avg Loss: {formatPnl(analytics.avgLoss)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Best Day</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className={`break-all text-xl font-bold sm:text-2xl ${analytics.bestDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPnl(analytics.bestDay.pnl)}
              </div>
              <p className="mt-2 break-words text-xs text-muted-foreground">{analytics.bestDay.date}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Worst Day</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className={`break-all text-xl font-bold sm:text-2xl ${analytics.worstDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPnl(analytics.worstDay.pnl)}
              </div>
              <p className="mt-2 break-words text-xs text-muted-foreground">{analytics.worstDay.date}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Your Stats */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-3 flex flex-col gap-3 border-b border-border/60 bg-gradient-to-r from-background/60 to-transparent sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl">Your Stats</CardTitle>
            <CardDescription>
              Trading performance for the selected time range
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">Range:</span>
            <div className="inline-flex flex-wrap rounded-full bg-background/40 border border-border/60 p-1">
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
              <InsightSection
                icon={CalendarRange}
                title="Monthly Performance"
                description="See the strongest and weakest months in the selected range."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatPanel
                    label="Best Month"
                    value={yourStats.monthly.bestMonth ? yourStats.monthly.bestMonth.label : "—"}
                  />
                  <StatPanel
                    label="Best Month P&L"
                    value={yourStats.monthly.bestMonth ? formatPnl(yourStats.monthly.bestMonth.pnl) : "—"}
                    accent={(yourStats.monthly.bestMonth?.pnl ?? 0) >= 0 ? 'positive' : 'negative'}
                  />
                  <StatPanel
                    label="Worst Month"
                    value={yourStats.monthly.worstMonth ? yourStats.monthly.worstMonth.label : "—"}
                    accent={(yourStats.monthly.worstMonth?.pnl ?? 0) >= 0 ? 'positive' : 'negative'}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatPanel
                    label="Worst Month P&L"
                    value={yourStats.monthly.worstMonth ? formatPnl(yourStats.monthly.worstMonth.pnl) : "—"}
                    accent={(yourStats.monthly.worstMonth?.pnl ?? 0) >= 0 ? 'positive' : 'negative'}
                  />
                  <StatPanel
                    label="Average Monthly P&L"
                    value={formatPnl(yourStats.monthly.avgMonthlyPnl)}
                    accent={yourStats.monthly.avgMonthlyPnl >= 0 ? 'positive' : 'negative'}
                  />
                </div>
              </InsightSection>

              <InsightSection
                icon={Gauge}
                title="General Performance"
                description="Core P&L and trade quality numbers for the chosen period."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatPanel label="Total P&L" value={formatPnl(yourStats.general.totalPnl)} accent={yourStats.general.totalPnl >= 0 ? 'positive' : 'negative'} />
                  <StatPanel label="Average Daily Volume" value={yourStats.general.avgDailyVolume > 0 ? yourStats.general.avgDailyVolume.toFixed(1) : "—"} />
                  <StatPanel label="Average Winning Trade" value={formatPnl(yourStats.general.avgWinningTrade)} accent="positive" />
                  <StatPanel label="Average Losing Trade" value={formatPnl(yourStats.general.avgLosingTrade)} accent="negative" />
                </div>
              </InsightSection>

              <InsightSection
                icon={Layers3}
                title="Trade Statistics"
                description="Break down count, streak behavior, and how outcomes are distributed."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatPanel label="Total Trades" value={formatPlainNumber(yourStats.tradeStats.totalTrades)} />
                  <StatPanel label="Winning Trades" value={formatPlainNumber(yourStats.tradeStats.winningTrades)} accent="positive" />
                  <StatPanel label="Losing Trades" value={formatPlainNumber(yourStats.tradeStats.losingTrades)} accent="negative" />
                  <StatPanel label="Break-even Trades" value={formatPlainNumber(yourStats.tradeStats.breakevenTrades)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatPanel label="Max Consecutive Wins" value={formatPlainNumber(yourStats.streaks.maxConsecutiveWins)} accent="positive" />
                  <StatPanel label="Max Consecutive Losses" value={formatPlainNumber(yourStats.streaks.maxConsecutiveLosses)} accent="negative" />
                </div>
              </InsightSection>

              <InsightSection
                icon={TrendingDown}
                title="Trading Costs And Extremes"
                description="Track friction costs and the edge cases that shape your overall expectancy."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatPanel label="Total Commissions" value={formatPnl(yourStats.costs.totalCommissions)} accent="warning" />
                  <StatPanel label="Total Swap" value={yourStats.costs.totalSwap !== 0 ? formatPnl(yourStats.costs.totalSwap) : '—'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatPanel label="Largest Profit" value={yourStats.extremes.largestProfit ? formatPnl(yourStats.extremes.largestProfit) : '—'} accent="positive" />
                  <StatPanel label="Largest Loss" value={yourStats.extremes.largestLoss ? formatPnl(yourStats.extremes.largestLoss) : '—'} accent="negative" />
                </div>
              </InsightSection>

              <InsightSection
                icon={Clock3}
                title="Trade Duration"
                description="Measure how long you tend to hold all trades, wins, and losses."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatPanel label="Avg Hold Time (All)" value={formatDuration(yourStats.durations.avgHoldAll)} />
                  <StatPanel label="Avg Hold Time (Wins)" value={formatDuration(yourStats.durations.avgHoldWinning)} accent="positive" />
                  <StatPanel label="Avg Hold Time (Losses)" value={formatDuration(yourStats.durations.avgHoldLosing)} accent="negative" />
                </div>
              </InsightSection>

              <InsightSection
                icon={Activity}
                title="Trading Activity"
                description="Review how often you trade and how daily outcomes cluster together."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <StatPanel label="Open Trades" value="0" />
                  <StatPanel label="Total Trading Days" value={formatPlainNumber(yourStats.activity.totalTradingDays)} />
                  <StatPanel label="Winning Days" value={formatPlainNumber(yourStats.activity.winningDays)} accent="positive" />
                  <StatPanel label="Losing Days" value={formatPlainNumber(yourStats.activity.losingDays)} accent="negative" />
                  <StatPanel label="Breakeven Days" value={formatPlainNumber(yourStats.activity.breakevenDays)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatPanel label="Max Consecutive Winning Days" value={formatPlainNumber(yourStats.dayStreaks.maxWinningDayStreak)} accent="positive" />
                  <StatPanel label="Max Consecutive Losing Days" value={formatPlainNumber(yourStats.dayStreaks.maxLosingDayStreak)} accent="negative" />
                </div>
              </InsightSection>

              <InsightSection
                icon={Shield}
                title="Daily Performance And Risk"
                description="Study the daily P&L rhythm and how deep drawdowns become over time."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <StatPanel label="Avg Daily P&L" value={formatPnl(yourStats.dailyPerformance.avgDailyPnl)} accent={yourStats.dailyPerformance.avgDailyPnl >= 0 ? 'positive' : 'negative'} />
                  <StatPanel label="Avg Winning Day P&L" value={formatPnl(yourStats.dailyPerformance.avgWinningDayPnl)} accent="positive" />
                  <StatPanel label="Avg Losing Day P&L" value={formatPnl(yourStats.dailyPerformance.avgLosingDayPnl)} accent="negative" />
                  <StatPanel label="Largest Profitable Day" value={formatPnl(yourStats.dailyPerformance.largestProfitableDay)} accent="positive" />
                  <StatPanel label="Largest Losing Day" value={formatPnl(yourStats.dailyPerformance.largestLosingDay)} accent="negative" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatPanel label="Trade Expectancy" value={formatPnl(yourStats.risk.tradeExpectancy)} accent={yourStats.risk.tradeExpectancy >= 0 ? 'positive' : 'negative'} />
                  <StatPanel label="Maximum Drawdown" value={formatPnl(yourStats.risk.maxDrawdown)} accent="negative" />
                  <StatPanel label="Maximum Drawdown %" value={formatPercent(yourStats.risk.maxDrawdownPct)} accent="negative" />
                </div>
              </InsightSection>
            </>
          )}
        </CardContent>
      </Card>

      {/* Emotion Correlation */}
      {analytics.emotionCorrelation.length > 0 && (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Emotion vs Performance</CardTitle>
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
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Session Performance</CardTitle>
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
                <Bar yAxisId="right" dataKey="pnl" fill="#10b981" name={`P&L (${baseCurrency})`} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart for Multi-Metric Analysis */}
      {analytics.emotionCorrelation.length >= 3 && (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" />Performance Radar</CardTitle>
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
