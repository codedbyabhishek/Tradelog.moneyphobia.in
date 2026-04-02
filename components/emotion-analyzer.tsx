'use client';

import { useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { getTradeBasePnL, CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Brain, Heart, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Trade } from '@/lib/types';

type EmotionMetric = 'entry' | 'exit' | 'overall';
type TimeFilter = 'all' | 'month' | 'week';

interface EmotionPerformance {
  emotion: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnL: number;
  totalPnL: number;
  consistency: number;
  avgDuration: number;
}

interface EmotionCorrelation {
  entryEmotion: string;
  exitEmotion: string;
  tradeCount: number;
  winRate: number;
  avgPnL: number;
}

interface PsychologicalPattern {
  pattern: string;
  description: string;
  tradeCount: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
}

const MIN_PATTERN_TRADES = 3;

function getSelectedEmotion(trade: Trade, metric: EmotionMetric): string | null {
  if (metric === 'entry') return trade.emotionEntry ?? null;
  if (metric === 'exit') return trade.emotionExit ?? null;
  if (!trade.emotionEntry || !trade.emotionExit) return null;
  return `${trade.emotionEntry} → ${trade.emotionExit}`;
}

function getTradeDurationMinutes(trade: Trade): number | null {
  if (!trade.entryTime || !trade.exitTime) return null;

  const [entryHours, entryMinutes] = trade.entryTime.split(':').map(Number);
  const [exitHours, exitMinutes] = trade.exitTime.split(':').map(Number);
  const diff = exitHours * 60 + exitMinutes - (entryHours * 60 + entryMinutes);

  if (!Number.isFinite(diff) || diff < 0) return null;
  return diff;
}

function getDateCutoff(timeFilter: TimeFilter): Date | null {
  if (timeFilter === 'all') return null;
  const now = new Date();
  return timeFilter === 'week'
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export default function EmotionAnalyzer() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const [emotionMetric, setEmotionMetric] = useState<EmotionMetric>('entry');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const symbol = CURRENCY_SYMBOLS[baseCurrency];

  const filteredTrades = useMemo(() => {
    const cutoff = getDateCutoff(timeFilter);
    if (!cutoff) return trades;
    return trades.filter((trade) => new Date(trade.date) >= cutoff);
  }, [timeFilter, trades]);

  const analyzedTrades = useMemo(
    () => filteredTrades.filter((trade) => getSelectedEmotion(trade, emotionMetric)),
    [emotionMetric, filteredTrades],
  );

  const emotionPerformance = useMemo(() => {
    if (!analyzedTrades.length) return [];

    const emotionMap = new Map<
      string,
      { pnlValues: number[]; durations: number[]; totalTrades: number; wins: number; losses: number; totalPnL: number }
    >();

    analyzedTrades.forEach((trade) => {
      const emotion = getSelectedEmotion(trade, emotionMetric);
      if (!emotion) return;

      const pnl = getTradeBasePnL(trade);
      const duration = getTradeDurationMinutes(trade);
      const existing = emotionMap.get(emotion) ?? {
        pnlValues: [],
        durations: [],
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
      };

      existing.totalTrades += 1;
      existing.totalPnL += pnl;
      existing.pnlValues.push(pnl);
      if (pnl > 0) existing.wins += 1;
      if (pnl < 0) existing.losses += 1;
      if (duration !== null) existing.durations.push(duration);

      emotionMap.set(emotion, existing);
    });

    return Array.from(emotionMap.entries())
      .map(([emotion, data]) => {
        const avgPnL = data.totalPnL / data.totalTrades;
        const consistency = Math.sqrt(
          data.pnlValues.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnL, 2), 0) / data.totalTrades,
        );
        const avgDuration = data.durations.length
          ? data.durations.reduce((sum, minutes) => sum + minutes, 0) / data.durations.length
          : 0;

        return {
          emotion,
          totalTrades: data.totalTrades,
          wins: data.wins,
          losses: data.losses,
          winRate: (data.wins / data.totalTrades) * 100,
          avgPnL,
          totalPnL: data.totalPnL,
          consistency,
          avgDuration,
        };
      })
      .sort((a, b) => {
        if (b.totalTrades !== a.totalTrades) return b.totalTrades - a.totalTrades;
        return b.avgPnL - a.avgPnL;
      });
  }, [analyzedTrades, emotionMetric]);

  const emotionCorrelations = useMemo(() => {
    if (!filteredTrades.length || emotionMetric !== 'entry') return [];

    const correlationMap = new Map<
      string,
      { entryEmotion: string; exitEmotion: string; pnls: number[]; tradeCount: number; wins: number }
    >();

    filteredTrades.forEach((trade) => {
      if (!trade.emotionEntry || !trade.emotionExit) return;

      const key = `${trade.emotionEntry}|${trade.emotionExit}`;
      const pnl = getTradeBasePnL(trade);
      const existing = correlationMap.get(key) ?? {
        entryEmotion: trade.emotionEntry,
        exitEmotion: trade.emotionExit,
        pnls: [],
        tradeCount: 0,
        wins: 0,
      };

      existing.tradeCount += 1;
      existing.pnls.push(pnl);
      if (pnl > 0) existing.wins += 1;
      correlationMap.set(key, existing);
    });

    return Array.from(correlationMap.values())
      .filter((item) => item.tradeCount >= MIN_PATTERN_TRADES)
      .map((item) => ({
        entryEmotion: item.entryEmotion,
        exitEmotion: item.exitEmotion,
        tradeCount: item.tradeCount,
        winRate: (item.wins / item.tradeCount) * 100,
        avgPnL: item.pnls.reduce((sum, pnl) => sum + pnl, 0) / item.tradeCount,
      }))
      .sort((a, b) => b.tradeCount - a.tradeCount);
  }, [emotionMetric, filteredTrades]);

  const summary = useMemo(() => {
    const sampleReady = emotionPerformance.filter((item) => item.totalTrades >= 2);
    const bestEmotion = [...sampleReady].sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.avgPnL - a.avgPnL;
    })[0] ?? null;

    const worstEmotion = [...sampleReady].sort((a, b) => {
      if (a.winRate !== b.winRate) return a.winRate - b.winRate;
      return a.avgPnL - b.avgPnL;
    })[0] ?? null;

    const trackedTradeCount = analyzedTrades.length;
    const coverage = filteredTrades.length ? (trackedTradeCount / filteredTrades.length) * 100 : 0;
    const totalPnL = analyzedTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
    const avgConsistency = emotionPerformance.length
      ? emotionPerformance.reduce((sum, item) => sum + item.consistency, 0) / emotionPerformance.length
      : 0;

    return {
      bestEmotion,
      worstEmotion,
      trackedTradeCount,
      coverage,
      totalPnL,
      avgConsistency,
    };
  }, [analyzedTrades, emotionPerformance, filteredTrades]);

  const psychologicalPatterns = useMemo(() => {
    const patterns: PsychologicalPattern[] = [];
    const sampleReady = emotionPerformance.filter((item) => item.totalTrades >= MIN_PATTERN_TRADES);

    if (!sampleReady.length) return patterns;

    const best = [...sampleReady].sort((a, b) => {
      if (b.avgPnL !== a.avgPnL) return b.avgPnL - a.avgPnL;
      return b.winRate - a.winRate;
    })[0];

    const worst = [...sampleReady].sort((a, b) => {
      if (a.avgPnL !== b.avgPnL) return a.avgPnL - b.avgPnL;
      return a.winRate - b.winRate;
    })[0];

    if (best.avgPnL > 0 || best.winRate >= 60) {
      patterns.push({
        pattern: `${best.emotion} State Excellence`,
        description: `${best.emotion} has your strongest emotional profile with ${best.winRate.toFixed(1)}% win rate and ${symbol}${best.avgPnL.toFixed(0)} average P&L.`,
        tradeCount: best.totalTrades,
        impact: 'positive',
        recommendation: `Recreate the routines, preparation, and market conditions that tend to put you into ${best.emotion}.`,
      });
    }

    if (worst.avgPnL < 0 || worst.winRate <= 40) {
      patterns.push({
        pattern: `${worst.emotion} State Avoidance`,
        description: `${worst.emotion} is dragging results with ${worst.winRate.toFixed(1)}% win rate and ${symbol}${worst.avgPnL.toFixed(0)} average P&L.`,
        tradeCount: worst.totalTrades,
        impact: 'negative',
        recommendation: `Use a cooldown, smaller size, or a no-trade rule when you notice ${worst.emotion}.`,
      });
    }

    const unstable = [...sampleReady].sort((a, b) => b.consistency - a.consistency)[0];
    const stable = [...sampleReady].sort((a, b) => a.consistency - b.consistency)[0];

    if (unstable && unstable.consistency > stable.consistency * 1.5) {
      patterns.push({
        pattern: 'Emotional Volatility',
        description: `${unstable.emotion} has the widest spread in outcomes, which suggests inconsistent execution under that state.`,
        tradeCount: unstable.totalTrades,
        impact: 'negative',
        recommendation: 'Reduce risk and follow a stricter checklist when this emotion shows up.',
      });
    }

    if (emotionCorrelations.length > 0) {
      const bestTransition = [...emotionCorrelations].sort((a, b) => {
        if (b.avgPnL !== a.avgPnL) return b.avgPnL - a.avgPnL;
        return b.winRate - a.winRate;
      })[0];
      const worstTransition = [...emotionCorrelations].sort((a, b) => {
        if (a.avgPnL !== b.avgPnL) return a.avgPnL - b.avgPnL;
        return a.winRate - b.winRate;
      })[0];

      if (bestTransition.avgPnL > 0 || bestTransition.winRate >= 60) {
        patterns.push({
          pattern: 'Beneficial Emotional Transition',
          description: `${bestTransition.entryEmotion} → ${bestTransition.exitEmotion} is your strongest transition pattern.`,
          tradeCount: bestTransition.tradeCount,
          impact: 'positive',
          recommendation: 'Note what changed during the trade that helped this transition finish well.',
        });
      }

      if (worstTransition.avgPnL < 0 || worstTransition.winRate <= 40) {
        patterns.push({
          pattern: 'Problematic Emotional Transition',
          description: `${worstTransition.entryEmotion} → ${worstTransition.exitEmotion} is repeatedly associated with weak outcomes.`,
          tradeCount: worstTransition.tradeCount,
          impact: 'negative',
          recommendation: 'Review these trades together and identify the trigger that shifted the emotion in the wrong direction.',
        });
      }
    }

    return patterns.slice(0, 4);
  }, [emotionCorrelations, emotionPerformance, symbol]);

  const emotionMetricData = useMemo(
    () =>
      emotionPerformance.slice(0, 8).map((item) => ({
        name: item.emotion.length > 14 ? `${item.emotion.slice(0, 12)}...` : item.emotion,
        fullName: item.emotion,
        winRate: Number(item.winRate.toFixed(1)),
        avgPnL: Number(item.avgPnL.toFixed(2)),
        tradeCount: item.totalTrades,
      })),
    [emotionPerformance],
  );

  const emotionalHealthScore = useMemo(() => {
    if (!emotionPerformance.length) return 0;
    const consistencyPenalty = Math.min(summary.avgConsistency / 500, 1) * 35;
    const coverageBonus = Math.min(summary.coverage, 100) * 0.25;
    const patternPenalty = psychologicalPatterns.filter((item) => item.impact === 'negative').length * 8;
    return Math.max(0, Math.min(100, 70 + coverageBonus - consistencyPenalty - patternPenalty));
  }, [emotionPerformance.length, psychologicalPatterns, summary.avgConsistency, summary.coverage]);

  if (!trades.length) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-3xl font-bold">Emotion Psychology Analyzer</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trades yet. Record emotional states in trades to analyze patterns.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analyzedTrades.length) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
          <h1 className="text-3xl font-bold">Emotion Psychology Analyzer</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This analyzer is ready, but the current trade selection does not have enough emotion data yet.
            Add entry and exit emotions to your trades to unlock psychology patterns.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row">
            <div className="w-full md:w-56">
              <label className="mb-2 block text-sm font-medium">Emotion Type</label>
              <Select value={emotionMetric} onValueChange={(value) => setEmotionMetric(value as EmotionMetric)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Emotion</SelectItem>
                  <SelectItem value="exit">Exit Emotion</SelectItem>
                  <SelectItem value="overall">Emotional Journey</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-56">
              <label className="mb-2 block text-sm font-medium">Time Period</label>
              <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/50 shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Heart className="h-3.5 w-3.5" />
              Emotion-aware performance review
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Emotion Psychology Analyzer</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                See which emotional states help your execution, which ones hurt it, and how your
                entry-to-exit emotional journey is affecting real trading outcomes.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border/60 bg-background/75 shadow-none">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tracked Trades</p>
                  <p className="mt-2 text-2xl font-semibold">{summary.trackedTradeCount}</p>
                </div>
                <Brain className="h-8 w-8 text-primary/70" />
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/75 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coverage</p>
                <p className="mt-2 text-2xl font-semibold">{summary.coverage.toFixed(0)}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Emotion data coverage in this view</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/75 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Best State</p>
                <p className="mt-2 truncate text-base font-semibold">
                  {summary.bestEmotion?.emotion ?? 'Need 2+ trades'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.bestEmotion
                    ? `${summary.bestEmotion.winRate.toFixed(1)}% win rate`
                    : 'More samples needed for a reliable signal'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/75 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Emotional Drag</p>
                <p className="mt-2 truncate text-base font-semibold">
                  {summary.worstEmotion?.emotion ?? 'Need 2+ trades'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.worstEmotion
                    ? `${symbol}${summary.worstEmotion.avgPnL.toFixed(0)} average P&L`
                    : 'More samples needed for a reliable signal'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Analysis Settings</CardTitle>
          <CardDescription>Switch between entry, exit, or full emotional journey analysis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row">
          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm font-medium">Emotion Type</label>
            <Select value={emotionMetric} onValueChange={(value) => setEmotionMetric(value as EmotionMetric)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Emotion</SelectItem>
                <SelectItem value="exit">Exit Emotion</SelectItem>
                <SelectItem value="overall">Emotional Journey</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm font-medium">Time Period</label>
            <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-1 items-end">
            <Alert className="w-full border-primary/20 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertTitle>Signal quality</AlertTitle>
              <AlertDescription>
                Patterns are strongest when each emotion has at least {MIN_PATTERN_TRADES} trades in the
                selected period.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {psychologicalPatterns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Key Patterns Detected</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {psychologicalPatterns.map((pattern) => (
              <Alert
                key={pattern.pattern}
                className={
                  pattern.impact === 'positive'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : pattern.impact === 'negative'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-border bg-background'
                }
              >
                {pattern.impact === 'positive' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : pattern.impact === 'negative' ? (
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <AlertTitle>{pattern.pattern}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{pattern.description}</p>
                  <p className="text-xs text-muted-foreground">{pattern.tradeCount} supporting trades</p>
                  <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-sm">
                    <span className="font-medium">Recommendation:</span> {pattern.recommendation}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {emotionPerformance.slice(0, 6).map((performance) => (
          <Card key={performance.emotion} className="overflow-hidden">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{performance.emotion}</CardTitle>
                  <CardDescription>
                    {performance.totalTrades >= MIN_PATTERN_TRADES
                      ? 'Reliable sample'
                      : 'Low sample, treat carefully'}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{performance.totalTrades} trades</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">Win Rate</span>
                  <span className="font-semibold">{performance.winRate.toFixed(1)}%</span>
                </div>
                <Progress value={performance.winRate} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Total P&L</p>
                  <p className={performance.totalPnL >= 0 ? 'mt-1 font-semibold text-emerald-600' : 'mt-1 font-semibold text-rose-600'}>
                    {symbol}{performance.totalPnL.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Avg Per Trade</p>
                  <p className={performance.avgPnL >= 0 ? 'mt-1 font-semibold text-emerald-600' : 'mt-1 font-semibold text-rose-600'}>
                    {symbol}{performance.avgPnL.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Consistency</p>
                  <p className="mt-1 font-semibold">{symbol}{performance.consistency.toFixed(0)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Avg Hold Time</p>
                  <p className="mt-1 font-semibold">
                    {performance.avgDuration > 0 ? `${performance.avgDuration.toFixed(0)}m` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {emotionMetricData.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Win Rate by {emotionMetric === 'entry' ? 'Entry ' : emotionMetric === 'exit' ? 'Exit ' : 'Journey '}
                Emotion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={emotionMetricData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-background p-3 text-sm shadow-lg">
                          <p className="font-semibold">{data.fullName}</p>
                          <p className="text-xs text-muted-foreground">Win rate: {data.winRate}%</p>
                          <p className="text-xs text-muted-foreground">Trades: {data.tradeCount}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="winRate" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average P&amp;L by Emotion</CardTitle>
              <CardDescription>Base-currency P&amp;L per trade for each emotional state.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={emotionMetricData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-background p-3 text-sm shadow-lg">
                          <p className="font-semibold">{data.fullName}</p>
                          <p className={data.avgPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            Avg P&amp;L: {symbol}{data.avgPnL}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avgPnL" radius={[8, 8, 0, 0]}>
                    {emotionMetricData.map((item) => (
                      <Cell key={item.fullName} fill={item.avgPnL >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {emotionCorrelations.length > 0 && emotionMetric === 'entry' && (
        <Card>
          <CardHeader>
            <CardTitle>Emotional Transitions</CardTitle>
            <CardDescription>How entry emotions tend to resolve by the time you exit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {emotionCorrelations.map((correlation) => (
              <div key={`${correlation.entryEmotion}-${correlation.exitEmotion}`} className="rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-semibold">{correlation.entryEmotion}</p>
                      <p className="text-xs text-muted-foreground">Entry</p>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div>
                      <p className="text-sm font-semibold">{correlation.exitEmotion}</p>
                      <p className="text-xs text-muted-foreground">Exit</p>
                    </div>
                  </div>
                  <Badge variant="outline">{correlation.tradeCount} trades</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="mt-1 text-lg font-semibold">{correlation.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Avg P&amp;L</p>
                    <p className={correlation.avgPnL >= 0 ? 'mt-1 text-lg font-semibold text-emerald-600' : 'mt-1 text-lg font-semibold text-rose-600'}>
                      {symbol}{correlation.avgPnL.toFixed(0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="mt-1 text-lg font-semibold">
                      {Math.round((correlation.tradeCount / filteredTrades.length) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Emotional Trading Health
          </CardTitle>
          <CardDescription>
            A lighter-weight health score based on emotional coverage, consistency, and risk patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Emotional Health Score</span>
              <span className="text-sm font-semibold">{emotionalHealthScore.toFixed(0)}%</span>
            </div>
            <Progress value={emotionalHealthScore} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Higher scores mean better emotional coverage and more stable outcomes across the emotions you log.
            </p>
          </div>

          <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recommended Focus</p>
              <div className="space-y-2 text-sm">
                {psychologicalPatterns.length > 0 ? (
                  psychologicalPatterns.slice(0, 3).map((pattern) => (
                    <div key={pattern.pattern} className="rounded-xl bg-muted/40 p-3">
                      <p className="font-medium">{pattern.pattern}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pattern.recommendation}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                    Keep logging emotions consistently to unlock stronger psychology feedback.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tracked Emotions</p>
              <div className="flex flex-wrap gap-2">
                {emotionPerformance.slice(0, 8).map((item) => (
                  <Badge key={item.emotion} variant="outline">
                    {item.emotion}
                  </Badge>
                ))}
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Emotion-aware P&amp;L</p>
                <p className={summary.totalPnL >= 0 ? 'mt-1 font-semibold text-emerald-600' : 'mt-1 font-semibold text-rose-600'}>
                  {symbol}{summary.totalPnL.toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
