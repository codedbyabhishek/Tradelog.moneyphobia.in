'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/lib/settings-context';
import { Trade } from '@/lib/types';
import { generatePerformanceMetrics } from '@/lib/performance-analytics';
import { formatBaseCurrencyAmount, getTradeBasePnL } from '@/lib/trade-utils';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

interface PerformanceDashboardProps {
  trades: Trade[];
}

export function PerformanceDashboard({ trades }: PerformanceDashboardProps) {
  const { baseCurrency } = useSettings();
  const metrics = useMemo(() => generatePerformanceMetrics(trades), [trades]);

  const renderCurrencyTooltip = (value: number) => formatBaseCurrencyAmount(value, baseCurrency);
  const renderPercentageTooltip = (value: number) => `${value.toFixed(1)}%`;
  const renderCurrencyTooltipValue = (value: ValueType | undefined) => {
    if (typeof value === 'number') return renderCurrencyTooltip(value);
    if (typeof value === 'string') {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? renderCurrencyTooltip(numericValue) : value;
    }
    return value?.join(' / ') ?? '';
  };
  const renderPercentageTooltipValue = (value: ValueType | undefined) => {
    if (typeof value === 'number') return renderPercentageTooltip(value);
    if (typeof value === 'string') {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? renderPercentageTooltip(numericValue) : value;
    }
    return value?.join(' / ') ?? '';
  };

  // Prepare equity curve data
  const equityCurveData = useMemo(() => {
    // Limit to last 50 data points for performance
    return metrics.equityCurve.slice(-50);
  }, [metrics.equityCurve]);

  const drawdownData = useMemo(() => {
    return metrics.drawdownCurve.slice(-50);
  }, [metrics.drawdownCurve]);

  const equitySummary = useMemo(() => {
    const latest = equityCurveData.at(-1)?.equity ?? 0;
    const peak = equityCurveData.reduce((max, point) => Math.max(max, point.equity), 0);
    const trough = equityCurveData.reduce((min, point) => Math.min(min, point.equity), 0);
    const positiveTrades = trades.filter((trade) => getTradeBasePnL(trade) > 0).length;

    return {
      latest,
      peak,
      trough,
      positiveTradeRate: trades.length > 0 ? (positiveTrades / trades.length) * 100 : 0,
    };
  }, [equityCurveData, trades]);

  // Prepare best hours data
  const bestHoursData = useMemo(() => {
    return Object.entries(metrics.bestTradingHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hour, pnl]) => ({
        hour,
        pnl: parseFloat(pnl.toFixed(2))
      }));
  }, [metrics.bestTradingHours]);

  // Prepare best days data
  const bestDaysData = useMemo(() => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayOrder
      .map(day => ({
        day,
        pnl: parseFloat((metrics.bestTradingDays[day] || 0).toFixed(2))
      }))
      .filter(d => d.pnl !== 0);
  }, [metrics.bestTradingDays]);

  // Prepare monthly data
  const monthlyData = useMemo(() => {
    return Object.entries(metrics.monthlyPnL)
      .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
      .map(([month, pnl]) => {
        const winRate = metrics.monthlyWinRate[month] || 0;
        const target = metrics.monthlyReturnTargets.find((m) => m.month === month)?.target || 1000;
        const pnlRounded = parseFloat(pnl.toFixed(2));
        const targetRounded = parseFloat(target.toFixed(2));

        return {
          monthKey: month,
          month: format(new Date(`${month}-01`), 'MMM yyyy'),
          pnl: pnlRounded,
          winRate: parseFloat(winRate.toFixed(1)),
          target: targetRounded,
          targetGap: parseFloat((pnlRounded - targetRounded).toFixed(2)),
          targetHit: pnlRounded >= targetRounded,
          status: pnlRounded >= 0 ? 'positive' : 'negative',
        };
      });
  }, [metrics.monthlyPnL, metrics.monthlyWinRate, metrics.monthlyReturnTargets]);

  const monthlySummary = useMemo(() => {
    const profitableMonths = monthlyData.filter((item) => item.pnl > 0).length;
    const strongestMonth = monthlyData.reduce<(typeof monthlyData)[number] | null>((best, item) => {
      if (!best || item.pnl > best.pnl) return item;
      return best;
    }, null);
    const averageWinRate = monthlyData.length > 0
      ? monthlyData.reduce((sum, item) => sum + item.winRate, 0) / monthlyData.length
      : 0;

    return {
      profitableMonths,
      strongestMonth,
      averageWinRate,
      targetHitMonths: monthlyData.filter((item) => item.targetHit).length,
    };
  }, [monthlyData]);

  const symbolPerformanceData = useMemo(() => {
    return metrics.symbolPerformance
      .slice(0, 8)
      .map((item) => ({
        symbol: item.symbol,
        pnl: parseFloat(item.pnl.toFixed(2)),
        trades: item.trades,
        winRate: parseFloat(item.winRate.toFixed(1)),
      }));
  }, [metrics.symbolPerformance]);

  const heatmapMonth = useMemo(() => {
    const sortedDates = trades
      .map((trade) => new Date(trade.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return sortedDates[0] ?? new Date();
  }, [trades]);

  const heatmapData = useMemo(() => {
    const monthStart = startOfMonth(heatmapMonth);
    const monthEnd = endOfMonth(heatmapMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const byDate = new Map<string, Trade[]>();
    trades.forEach((trade) => {
      const key = format(new Date(trade.date), 'yyyy-MM-dd');
      const existing = byDate.get(key) ?? [];
      existing.push(trade);
      byDate.set(key, existing);
    });

    return allDays.map((date) => {
      const key = format(date, 'yyyy-MM-dd');
      const dayTrades = byDate.get(key) ?? [];
      const pnl = dayTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
      const wins = dayTrades.filter((trade) => getTradeBasePnL(trade) > 0).length;

      return {
        date: key,
        dayOfMonth: date.getDate(),
        pnl: parseFloat(pnl.toFixed(2)),
        trades: dayTrades.length,
        winRate: dayTrades.length > 0 ? parseFloat(((wins / dayTrades.length) * 100).toFixed(1)) : 0,
        isCurrentMonth: isSameMonth(date, heatmapMonth),
        isToday: isToday(date),
      };
    });
  }, [heatmapMonth, trades]);

  const heatmapWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7));
    }
    return weeks;
  }, [heatmapData]);

  const heatmapMonthStats = useMemo(() => {
    const currentMonthDays = heatmapData.filter((day) => day.isCurrentMonth);
    const totalPnL = currentMonthDays.reduce((sum, day) => sum + day.pnl, 0);
    const totalTrades = currentMonthDays.reduce((sum, day) => sum + day.trades, 0);
    const activeDays = currentMonthDays.filter((day) => day.trades > 0);
    const greenDays = activeDays.filter((day) => day.pnl > 0).length;

    return {
      totalPnL,
      totalTrades,
      greenDays,
      activeDays: activeDays.length,
    };
  }, [heatmapData]);

  const getHeatColor = (pnl: number, tradeCount: number) => {
    if (tradeCount === 0) return 'bg-muted/40 text-muted-foreground';
    if (pnl > 1000) return 'bg-emerald-700 text-white';
    if (pnl > 250) return 'bg-emerald-600 text-white';
    if (pnl > 0) return 'bg-emerald-300 text-emerald-950';
    if (pnl < -1000) return 'bg-rose-700 text-white';
    if (pnl < -250) return 'bg-rose-600 text-white';
    if (pnl < 0) return 'bg-rose-300 text-rose-950';
    return 'bg-amber-200 text-amber-950';
  };

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">No trades yet. Start trading to see performance metrics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Equity Curve */}
      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-cyan-500/5">
        <CardHeader className="border-b border-border/60 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Equity Curve</CardTitle>
              <CardDescription>Cumulative P&amp;L with a cleaner read on momentum, peaks, and recovery</CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-700">Current</p>
                <p className={`mt-2 text-xl font-semibold ${equitySummary.latest >= 0 ? 'text-cyan-950 dark:text-cyan-100' : 'text-red-600'}`}>
                  {renderCurrencyTooltip(equitySummary.latest)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">Peak</p>
                <p className="mt-2 text-xl font-semibold text-emerald-950 dark:text-emerald-100">
                  {renderCurrencyTooltip(equitySummary.peak)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-500/20 bg-slate-500/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Hit Rate</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {renderPercentageTooltip(equitySummary.positiveTradeRate)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={equityCurveData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityCurveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={Math.floor(equityCurveData.length / 5)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: ValueType | undefined) => renderCurrencyTooltipValue(value)}
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  color: '#f8fafc',
                }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="none"
                fill="url(#equityCurveFill)"
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#0891b2"
                strokeWidth={3}
                dot={false}
                animationDuration={300}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#0891b2' }}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Lowest Valley</p>
              <p className={`mt-2 text-lg font-semibold ${equitySummary.trough >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                {renderCurrencyTooltip(equitySummary.trough)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trades Mapped</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{equityCurveData.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Narrative</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {equitySummary.latest >= equitySummary.peak * 0.85
                  ? 'The curve is holding close to its highs and showing solid retention.'
                  : 'The curve is off its highs, which makes drawdown and streak sections especially worth watching.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Performance */}
      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-amber-500/5">
        <CardHeader className="border-b border-border/60 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>P&amp;L, target tracking, and win-rate rhythm across months</CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">Profitable</p>
                <p className="mt-2 text-xl font-semibold text-amber-950 dark:text-amber-100">
                  {monthlySummary.profitableMonths}/{monthlyData.length || 0}
                </p>
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                  {monthlySummary.targetHitMonths} target hits
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">Best Month</p>
                <p className="mt-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                  {monthlySummary.strongestMonth?.month ?? 'N/A'}
                </p>
                <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                  {monthlySummary.strongestMonth ? renderCurrencyTooltip(monthlySummary.strongestMonth.pnl) : 'No month yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Avg Win Rate</p>
                <p className="mt-2 text-xl font-semibold text-sky-950 dark:text-sky-100">
                  {renderPercentageTooltip(monthlySummary.averageWinRate)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                tickLine={false}
                axisLine={false}
              />
              <YAxis yAxisId="left" tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={renderPercentageTooltip}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: ValueType | undefined, name: NameType | undefined) => {
                  if (name === 'P&L' || name === 'Target') {
                    return renderCurrencyTooltipValue(value);
                  }
                  return renderPercentageTooltipValue(value);
                }}
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  color: '#f8fafc',
                }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="target" fill="#e2e8f0" radius={[8, 8, 0, 0]} name="Target" />
              <Bar yAxisId="left" dataKey="pnl" name="P&L" radius={[8, 8, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell
                    key={`monthly-pnl-${index}`}
                    fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="winRate"
                stroke="#f59e0b"
                name="Win Rate %"
                strokeWidth={3}
                animationDuration={300}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {monthlyData.slice(-3).map((item) => (
              <div key={item.month} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.month}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Target {renderCurrencyTooltip(item.target)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {renderCurrencyTooltip(item.pnl)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Win rate: {renderPercentageTooltip(item.winRate)}</span>
                  <span className={item.targetHit ? 'text-green-600' : 'text-amber-600'}>
                    {item.targetHit ? 'Target hit' : `${renderCurrencyTooltip(item.targetGap)} vs target`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drawdown Analysis</CardTitle>
          <CardDescription>See how far performance fell from prior peaks and how long recovery took</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Max Drawdown</p>
              <p className="mt-2 text-2xl font-semibold text-red-600">
                {renderCurrencyTooltip(metrics.drawdownStats.maxDrawdown)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{renderPercentageTooltip(metrics.drawdownStats.maxDrawdownPct)} from peak</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Drawdown</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {renderCurrencyTooltip(metrics.drawdownStats.currentDrawdown)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{renderPercentageTooltip(metrics.drawdownStats.currentDrawdownPct)} below latest peak</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Longest Stretch</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{metrics.drawdownStats.longestDrawdownStreak}</p>
              <p className="mt-1 text-xs text-muted-foreground">consecutive trades spent underwater</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recovery Status</p>
              <p className={`mt-2 text-2xl font-semibold ${metrics.drawdownStats.currentDrawdown === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {metrics.drawdownStats.currentDrawdown === 0 ? 'At High' : 'Recovering'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">based on the latest point in the equity curve</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={drawdownData}>
              <defs>
                <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={Math.floor(drawdownData.length / 5)}
              />
              <YAxis tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: ValueType | undefined, name: NameType | undefined) => {
                  if (name === 'drawdown') {
                    return renderCurrencyTooltipValue(value);
                  }
                  return value;
                }}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#ef4444"
                fill="url(#drawdownFill)"
                strokeWidth={2}
                name="Drawdown"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Streak Tracking</CardTitle>
          <CardDescription>Monitor your current run and the strongest win/loss sequences in your journal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Run</p>
              <p className={`mt-2 text-2xl font-semibold ${
                metrics.streakStats.currentOutcome === 'win'
                  ? 'text-green-600'
                  : metrics.streakStats.currentOutcome === 'loss'
                    ? 'text-red-600'
                    : 'text-foreground'
              }`}>
                {metrics.streakStats.currentOutcome === 'win'
                  ? `${metrics.streakStats.currentWinStreak} Wins`
                  : metrics.streakStats.currentOutcome === 'loss'
                    ? `${metrics.streakStats.currentLossStreak} Losses`
                    : metrics.streakStats.currentOutcome === 'breakeven'
                      ? 'Break-Even'
                      : 'No Data'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">based on your most recent closed trades</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Max Win Streak</p>
              <p className="mt-2 text-2xl font-semibold text-green-600">{metrics.streakStats.maxWinStreak}</p>
              <p className="mt-1 text-xs text-muted-foreground">best consecutive winning stretch</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Max Loss Streak</p>
              <p className="mt-2 text-2xl font-semibold text-red-600">{metrics.streakStats.maxLossStreak}</p>
              <p className="mt-1 text-xs text-muted-foreground">deepest consecutive losing stretch</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Bias</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metrics.streakStats.currentOutcome === 'win'
                  ? 'Positive'
                  : metrics.streakStats.currentOutcome === 'loss'
                    ? 'Caution'
                    : metrics.streakStats.currentOutcome === 'breakeven'
                      ? 'Neutral'
                      : 'Waiting'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">quick read on recent sequence momentum</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
              <p className="text-sm font-semibold text-emerald-900">Winning streak note</p>
              <p className="mt-2 text-sm text-emerald-800">
                Your best run so far is {metrics.streakStats.maxWinStreak} consecutive wins.
                {metrics.streakStats.currentWinStreak > 0 ? ` You are currently on a ${metrics.streakStats.currentWinStreak}-trade winning run.` : ''}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
              <p className="text-sm font-semibold text-rose-900">Risk control note</p>
              <p className="mt-2 text-sm text-rose-800">
                Your longest losing stretch is {metrics.streakStats.maxLossStreak} trades.
                {metrics.streakStats.currentLossStreak > 0 ? ` Right now the journal shows ${metrics.streakStats.currentLossStreak} losses in a row, so this may be a good time to slow down and review setups.` : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Trading Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Best Trading Hours</CardTitle>
            <CardDescription>Average P&L by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bestHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: ValueType | undefined) => renderCurrencyTooltipValue(value)} />
                <Bar dataKey="pnl" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {bestHoursData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Best Trading Days */}
        <Card>
          <CardHeader>
            <CardTitle>Best Trading Days</CardTitle>
            <CardDescription>Total P&L by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bestDaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: ValueType | undefined) => renderCurrencyTooltipValue(value)} />
                <Bar dataKey="pnl" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                  {bestDaysData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance by Symbol</CardTitle>
          <CardDescription>Total P&amp;L, trade count, and win rate for your top symbols</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={symbolPerformanceData} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="symbol"
                type="category"
                width={84}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: ValueType | undefined, name: NameType | undefined) => {
                  if (name === 'pnl') {
                    return renderCurrencyTooltipValue(value);
                  }
                  if (name === 'winRate') {
                    return renderPercentageTooltipValue(value);
                  }
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="pnl" name="P&L" radius={[0, 8, 8, 0]}>
                {symbolPerformanceData.map((entry, index) => (
                  <Cell
                    key={`symbol-cell-${index}`}
                    fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {symbolPerformanceData.slice(0, 4).map((item) => (
              <div key={item.symbol} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.symbol}</p>
                    <p className="text-xs text-muted-foreground">{item.trades} trades</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {renderCurrencyTooltip(item.pnl)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Win rate: {renderPercentageTooltip(item.winRate)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading Heatmap</CardTitle>
          <CardDescription>Daily trading activity and P&amp;L for {format(heatmapMonth, 'MMMM yyyy')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Month P&amp;L</p>
              <p className={`mt-2 text-2xl font-semibold ${heatmapMonthStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {renderCurrencyTooltip(heatmapMonthStats.totalPnL)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trades</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{heatmapMonthStats.totalTrades}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Green Days</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {heatmapMonthStats.greenDays}/{heatmapMonthStats.activeDays || 0}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-2">
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="px-1 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {heatmapWeeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-2">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className={[
                        'group relative min-h-24 rounded-xl border border-border/60 p-2 transition-colors',
                        getHeatColor(day.pnl, day.trades),
                        day.isCurrentMonth ? '' : 'opacity-35',
                        day.isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">{day.dayOfMonth}</span>
                        {day.trades > 0 ? (
                          <span className="rounded-full bg-background/30 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                            {day.trades}t
                          </span>
                        ) : null}
                      </div>
                      {day.trades > 0 ? (
                        <div className="mt-4 space-y-1">
                          <p className="text-xs font-semibold">
                            {day.pnl >= 0 ? '+' : ''}{renderCurrencyTooltip(day.pnl)}
                          </p>
                          <p className="text-[11px] opacity-80">Win rate {renderPercentageTooltip(day.winRate)}</p>
                        </div>
                      ) : (
                        <p className="mt-6 text-[11px] opacity-70">No trades</p>
                      )}

                      <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-44 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-xs text-popover-foreground shadow-xl group-hover:block">
                        <p className="font-semibold">{day.date}</p>
                        <p className="mt-1">P&amp;L: {renderCurrencyTooltip(day.pnl)}</p>
                        <p>Trades: {day.trades}</p>
                        {day.trades > 0 ? <p>Win rate: {renderPercentageTooltip(day.winRate)}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-600" />
              <span>Strong green day</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-300" />
              <span>Positive day</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-amber-200" />
              <span>Flat day</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-rose-300" />
              <span>Losing day</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-rose-600" />
              <span>Heavy loss day</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Return Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Return Targets</CardTitle>
          <CardDescription>Progress toward monthly P&L goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.monthlyReturnTargets.slice(-6).map((target) => (
              <div key={target.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{format(new Date(`${target.month}-01`), 'MMM yyyy')}</span>
                  <span className={target.actual >= target.target ? 'text-green-600' : 'text-red-600'}>
                    {renderCurrencyTooltip(target.actual)} / {renderCurrencyTooltip(target.target)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      target.actual >= target.target ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(target.percentage, 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
