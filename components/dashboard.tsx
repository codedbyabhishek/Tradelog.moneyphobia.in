'use client';

import { useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import {
  getAccountStats,
  getTradeCharges,
  getTradeGrossPnL,
  convertToBaseCurrency,
  formatBaseCurrencyAmount,
  getNetCapitalAdjustments,
  getTradeBasePnL,
} from '@/lib/trade-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, Zap, Clock3, ChevronDown, Activity, ShieldCheck, ArrowUpRight } from 'lucide-react';
import CalendarView from './calendar-view';
import GitHubSyncButton from './github-sync-button';
import FavoritesBoard from './favorites-board';
import BrokerSyncHub from './broker-sync-hub';
import { EmptyStateIllustration } from './brand-illustrations';
import UpgradeBanner from './upgrade-banner';
import { isProPlan } from '@/lib/subscription';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { addMonths, format, isThisYear, startOfMonth, startOfYear, subDays } from 'date-fns';
import { Trade } from '@/lib/types';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  isPositive?: boolean;
}

function StatCard({ icon: Icon, title, value, subtitle, isPositive }: StatCardProps) {
  const valueColorClass =
    isPositive === undefined ? 'text-foreground' : isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <Card className="group relative h-full min-h-[104px] overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl hover:shadow-black/10 sm:min-h-[132px] sm:rounded-3xl sm:shadow-lg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/8 via-primary/[0.03] to-transparent opacity-70 sm:h-20" />
      <CardHeader className="p-2.5 pb-1 sm:p-3.5 sm:pb-1.5">
        <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px] sm:tracking-[0.16em]">
              {title}
            </CardTitle>
          </div>
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border sm:h-9 sm:w-9 sm:rounded-2xl ${
              isPositive !== undefined
                ? isPositive
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
                : 'border-primary/30 bg-primary/10'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isPositive !== undefined ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-primary'}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 flex flex-1 flex-col justify-between p-2.5 pt-0 sm:p-3.5 sm:pt-0">
        <div className={`break-words text-base font-bold leading-tight sm:text-[1.35rem] ${valueColorClass}`}>{value}</div>
        {subtitle && <div className="mt-1 text-[10px] leading-snug text-muted-foreground sm:mt-1.5 sm:text-[11px]">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-xs sm:tracking-[0.2em]">{eyebrow}</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground sm:mt-1.5 sm:text-lg">{title}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:mt-1 sm:text-sm">{description}</p>
      </div>
      <div className="h-px w-24 bg-gradient-to-r from-primary/40 via-border to-transparent sm:mb-1 sm:w-full sm:max-w-[180px]" />
    </div>
  );
}

function TradingActivityCard({
  trades,
  formatBaseAmount,
}: {
  trades: Trade[];
  formatBaseAmount: (value: number, decimals?: number) => string;
}) {
  const [timeFilter, setTimeFilter] = useState<'30d' | '90d' | 'ytd' | '1y'>('ytd');

  const activity = useMemo(() => {
    const validTrades = trades
      .map((trade) => {
        const parsedDate = new Date(trade.date);
        return Number.isNaN(parsedDate.getTime()) ? null : { trade, parsedDate };
      })
      .filter((entry): entry is { trade: (typeof trades)[number]; parsedDate: Date } => Boolean(entry))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    const anchorDate = validTrades.at(-1)?.parsedDate ?? new Date();
    const rangeStart =
      timeFilter === '30d'
        ? subDays(anchorDate, 29)
        : timeFilter === '90d'
          ? subDays(anchorDate, 89)
          : timeFilter === '1y'
            ? subDays(anchorDate, 364)
            : startOfYear(anchorDate);

    const filteredTrades = validTrades.filter(
      (entry) => entry.parsedDate.getTime() >= rangeStart.getTime() && entry.parsedDate.getTime() <= anchorDate.getTime(),
    );
    const dailyMap = new Map<
      string,
      { date: Date; pnl: number; grossPnl: number; charges: number; trades: number; symbols: Set<string> }
    >();

    filteredTrades.forEach(({ trade, parsedDate }) => {
      const key = format(parsedDate, 'yyyy-MM-dd');
      const existing = dailyMap.get(key);
      if (existing) {
        existing.pnl += getTradeBasePnL(trade);
        existing.grossPnl += convertToBaseCurrency(getTradeGrossPnL(trade), trade.currency, trade.exchangeRate);
        existing.charges += convertToBaseCurrency(getTradeCharges(trade), trade.currency, trade.exchangeRate);
        existing.trades += 1;
        if (trade.symbol) {
          existing.symbols.add(trade.symbol.toUpperCase());
        }
        return;
      }

      dailyMap.set(key, {
        date: parsedDate,
        pnl: getTradeBasePnL(trade),
        grossPnl: convertToBaseCurrency(getTradeGrossPnL(trade), trade.currency, trade.exchangeRate),
        charges: convertToBaseCurrency(getTradeCharges(trade), trade.currency, trade.exchangeRate),
        trades: 1,
        symbols: new Set(trade.symbol ? [trade.symbol.toUpperCase()] : []),
      });
    });

    const dayEntries = Array.from(dailyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    const monthBuckets: Array<{
      key: string;
      label: string;
      dots: Array<{ id: string; pnl: number; grossPnl: number; charges: number; trades: number; symbols: string[] }>;
    }> = [];

    for (
      let cursor = startOfMonth(rangeStart);
      cursor.getTime() <= anchorDate.getTime();
      cursor = addMonths(cursor, 1)
    ) {
      const monthKey = format(cursor, 'yyyy-MM');
      monthBuckets.push({
        key: monthKey,
        label: format(cursor, 'MMM'),
        dots: dayEntries
          .filter((entry) => format(entry.date, 'yyyy-MM') === monthKey)
          .map((entry) => ({
            id: format(entry.date, 'yyyy-MM-dd'),
            pnl: entry.pnl,
            grossPnl: entry.grossPnl,
            charges: entry.charges,
            trades: entry.trades,
            symbols: Array.from(entry.symbols).sort(),
          })),
      });
    }

    const greenDays = dayEntries.filter((entry) => entry.pnl > 0).length;
    const redDays = dayEntries.filter((entry) => entry.pnl < 0).length;
    const flatDays = dayEntries.filter((entry) => entry.pnl === 0).length;
    const daysTraded = dayEntries.length;
    const totalPnL = dayEntries.reduce((sum, entry) => sum + entry.pnl, 0);
    const winRate = daysTraded > 0 ? (greenDays / daysTraded) * 100 : 0;
    const bestDay = dayEntries.reduce<(typeof dayEntries)[number] | null>(
      (best, entry) => (!best || entry.pnl > best.pnl ? entry : best),
      null,
    );
    const worstDay = dayEntries.reduce<(typeof dayEntries)[number] | null>(
      (worst, entry) => (!worst || entry.pnl < worst.pnl ? entry : worst),
      null,
    );

    let currentStreak = 0;
    let currentStreakTone: 'win' | 'loss' | 'flat' = 'flat';
    let longestStreak = 0;

    let runningTone: 'win' | 'loss' | 'flat' | null = null;
    let runningStreak = 0;

    dayEntries.forEach((entry) => {
      const tone: 'win' | 'loss' | 'flat' = entry.pnl > 0 ? 'win' : entry.pnl < 0 ? 'loss' : 'flat';
      if (tone === runningTone) {
        runningStreak += 1;
      } else {
        runningTone = tone;
        runningStreak = 1;
      }

      if (tone !== 'flat') {
        longestStreak = Math.max(longestStreak, runningStreak);
      }
    });

    const lastDay = dayEntries.at(-1);
    if (lastDay) {
      currentStreakTone = lastDay.pnl > 0 ? 'win' : lastDay.pnl < 0 ? 'loss' : 'flat';

      if (currentStreakTone !== 'flat') {
        for (let index = dayEntries.length - 1; index >= 0; index -= 1) {
          const entry = dayEntries[index];
          const tone = entry.pnl > 0 ? 'win' : entry.pnl < 0 ? 'loss' : 'flat';
          if (tone !== currentStreakTone) break;
          currentStreak += 1;
        }
      }
    }

    return {
      anchorDate,
      rangeStart,
      monthBuckets,
      daysTraded,
      greenDays,
      redDays,
      flatDays,
      totalPnL,
      winRate,
      currentStreak,
      currentStreakTone,
      longestStreak,
      bestDay,
      worstDay,
    };
  }, [timeFilter, trades]);

  const currentStreakLabel =
    activity.currentStreakTone === 'win'
      ? 'Winning streak'
      : activity.currentStreakTone === 'loss'
        ? 'Losing streak'
        : 'No active streak';

  const timeFilterOptions: Array<{ value: '30d' | '90d' | 'ytd' | '1y'; label: string }> = [
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: 'ytd', label: 'YTD' },
    { value: '1y', label: '1Y' },
  ];

  const rangeLabel =
    timeFilter === 'ytd'
      ? `From ${format(activity.rangeStart, 'MMM d')} to ${format(activity.anchorDate, 'MMM d, yyyy')}`
      : `${format(activity.rangeStart, 'MMM d')} - ${format(activity.anchorDate, 'MMM d, yyyy')}`;

  return (
    <Card className="overflow-hidden rounded-2xl border-white/10 bg-[#0c1016] text-white shadow-lg shadow-black/15 sm:rounded-[28px] sm:shadow-2xl sm:shadow-black/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.12),transparent_24%)]" />
      <CardHeader className="space-y-2.5 border-b border-white/10 p-3 sm:space-y-4 sm:p-5">
        <div className="relative z-10 flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80 sm:text-[11px] sm:tracking-[0.24em]">Trading Activity</p>
            <h2 className="mt-1 text-sm font-semibold sm:mt-1.5 sm:text-xl">Execution snapshot</h2>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:mt-1 sm:text-sm">{activity.daysTraded} active days in selected range</p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="grid w-full grid-cols-4 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:flex sm:w-auto sm:flex-wrap sm:rounded-2xl">
              {timeFilterOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimeFilter(option.value)}
                  className={cn(
                    'h-7 rounded-lg px-1 text-[10px] font-semibold tracking-[0.12em] text-slate-300 hover:bg-white/10 hover:text-white sm:h-8 sm:rounded-xl sm:px-3 sm:text-xs sm:tracking-[0.18em]',
                    timeFilter === option.value && 'bg-white text-slate-950 hover:bg-white hover:text-slate-950',
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-400 sm:gap-x-4 sm:gap-y-2 sm:text-xs">
              <span className="text-slate-500">{rangeLabel}</span>
              <div className="flex items-center gap-2">
                <span>Loss</span>
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500 sm:h-2.5 sm:w-2.5" />
                  <span className="h-2 w-2 rounded-full bg-rose-500/75 sm:h-2.5 sm:w-2.5" />
                  <span className="h-2 w-2 rounded-full bg-rose-500/50 sm:h-2.5 sm:w-2.5" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Profit</span>
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/50 sm:h-2.5 sm:w-2.5" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/75 sm:h-2.5 sm:w-2.5" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 sm:h-2.5 sm:w-2.5" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="-mx-1 overflow-visible sm:mx-0">
          <div className="relative z-10 grid grid-cols-4 gap-1.5 px-1 min-[420px]:grid-cols-6 sm:grid-cols-12 sm:gap-2 sm:px-0">
            {activity.monthBuckets.map((month) => (
              <div key={month.key} className="rounded-lg border border-white/6 bg-white/[0.03] p-1.5 transition-colors hover:bg-white/[0.05] sm:rounded-2xl sm:p-2">
                <p className="mb-1 text-[8px] uppercase tracking-[0.12em] text-slate-500 sm:mb-1.5 sm:text-[10px] sm:tracking-[0.18em]">{month.label}</p>
                <div className="grid min-h-[24px] grid-cols-4 content-start gap-0.5 sm:min-h-[34px] sm:gap-1">
                  {month.dots.length > 0 ? (
                    month.dots.slice(0, 8).map((dot) => (
                      <Popover key={dot.id}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${dot.id}: ${dot.trades} trades, net ${formatBaseAmount(dot.pnl)}`}
                            className={cn(
                              'h-2.5 w-2.5 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1016] sm:h-2.5 sm:w-2.5',
                              dot.pnl > 0 && 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]',
                              dot.pnl < 0 && 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.35)]',
                              dot.pnl === 0 && 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.25)]',
                            )}
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="center"
                          className="w-64 rounded-2xl border-white/10 bg-[#11161f] p-3 text-white shadow-2xl shadow-black/40"
                        >
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trade day</p>
                              <p className="mt-1 text-sm font-semibold text-white">{format(new Date(dot.id), 'EEE, MMM d, yyyy')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Trades</p>
                                <p className="mt-1 font-semibold text-white">{dot.trades}</p>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Symbols</p>
                                <p className="mt-1 truncate font-semibold text-white">{dot.symbols.join(', ') || 'N/A'}</p>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Gross P&amp;L</p>
                                <p className={cn('mt-1 font-semibold', dot.grossPnl >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                                  {formatBaseAmount(dot.grossPnl)}
                                </p>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Net P&amp;L</p>
                                <p className={cn('mt-1 font-semibold', dot.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                                  {formatBaseAmount(dot.pnl)}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Charges</p>
                                <p className="text-sm font-semibold text-slate-200">{formatBaseAmount(dot.charges)}</p>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))
                  ) : (
                    <div className="col-span-4 flex min-h-[24px] items-center justify-center rounded-md border border-dashed border-white/6 text-[8px] text-slate-600 sm:min-h-[34px] sm:rounded-xl sm:text-[10px]">
                      --
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-2.5 p-3 sm:space-y-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 sm:rounded-2xl sm:p-3">
            <p className="text-base font-semibold text-violet-300 sm:text-2xl">{activity.daysTraded}</p>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:mt-1 sm:text-xs">Days traded</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 sm:rounded-2xl sm:p-3">
            <p className="text-base font-semibold text-emerald-300 sm:text-2xl">{activity.greenDays}</p>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:mt-1 sm:text-xs">Green days</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 sm:rounded-2xl sm:p-3">
            <p className="text-base font-semibold text-rose-300 sm:text-2xl">{activity.redDays}</p>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:mt-1 sm:text-xs">Red days</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 sm:rounded-2xl sm:p-3">
            <p className={cn('text-base font-semibold sm:text-2xl', activity.currentStreakTone === 'loss' ? 'text-rose-300' : 'text-violet-300')}>
              {activity.currentStreak}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:mt-1 sm:text-xs">{currentStreakLabel}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/8 bg-white/[0.03] p-2 sm:rounded-2xl sm:p-3 lg:col-span-1">
            <p className={cn('text-base font-semibold sm:text-2xl', activity.totalPnL >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
              {formatBaseAmount(activity.totalPnL, 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:mt-1 sm:text-xs">Total P&amp;L</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5 backdrop-blur-sm sm:rounded-2xl sm:p-3">
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
            <p className="text-slate-300">Daily win rate</p>
            <p className="font-semibold text-emerald-300">{activity.winRate.toFixed(1)}%</p>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/8 sm:mt-3 sm:h-3">
            <div className="flex h-full">
              <div className="bg-emerald-400" style={{ width: `${activity.winRate}%` }} />
              <div className="bg-rose-500" style={{ width: `${Math.max(0, (activity.redDays / Math.max(activity.daysTraded, 1)) * 100)}%` }} />
              <div className="bg-amber-300/80" style={{ width: `${Math.max(0, (activity.flatDays / Math.max(activity.daysTraded, 1)) * 100)}%` }} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-slate-500">
            <span>{activity.greenDays} winning days</span>
            <span>{activity.longestStreak} day best streak</span>
            <span>{activity.redDays} losing days</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/8 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl sm:p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">Best Day</p>
            <p className="mt-1.5 text-base font-semibold text-emerald-300 sm:mt-2 sm:text-xl">
              {activity.bestDay ? formatBaseAmount(activity.bestDay.pnl, 0) : 'N/A'}
            </p>
            <p className="mt-1 text-[11px] text-emerald-100/70 sm:text-xs">
              {activity.bestDay ? `${format(activity.bestDay.date, 'MMM d')} • ${activity.bestDay.trades} trades` : 'Add more history to unlock this insight'}
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/8 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl sm:p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">Worst Day</p>
            <p className="mt-1.5 text-base font-semibold text-rose-300 sm:mt-2 sm:text-xl">
              {activity.worstDay ? formatBaseAmount(activity.worstDay.pnl, 0) : 'N/A'}
            </p>
            <p className="mt-1 text-[11px] text-rose-100/70 sm:text-xs">
              {activity.worstDay ? `${format(activity.worstDay.date, 'MMM d')} • ${activity.worstDay.trades} trades` : 'Add more history to unlock this insight'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { trades } = useTrades();
  const { baseCurrency, startingBalance, capitalAdjustments, billingState } = useSettings();
  const [brokerHubOpen, setBrokerHubOpen] = useState(false);
  const stats = getAccountStats(trades);
  const netCapitalAdjustments = getNetCapitalAdjustments(capitalAdjustments);
  const investedCapital = startingBalance + netCapitalAdjustments;
  const currentBalance = investedCapital + stats.totalPnL;
  const totalPnLPercentage = investedCapital > 0 ? (stats.totalPnL / investedCapital) * 100 : null;
  const formatBaseAmount = (value: number, decimals: number = 2) => formatBaseCurrencyAmount(value, baseCurrency, decimals);
  const latestTrade = useMemo(() => {
    return [...trades]
      .filter((trade) => {
        const parsedDate = new Date(trade.date);
        return !Number.isNaN(parsedDate.getTime());
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;
  }, [trades]);
  const activeTradingDays = useMemo(() => new Set(trades.map((trade) => trade.date)).size, [trades]);
  const averageTradesPerDay = activeTradingDays > 0 ? stats.totalTrades / activeTradingDays : 0;
  const strongMonthTradeCount = useMemo(
    () =>
      trades.filter((trade) => {
        const parsedDate = new Date(trade.date);
        return !Number.isNaN(parsedDate.getTime()) && isThisYear(parsedDate);
      }).length,
    [trades],
  );
  
  // Total brokerage paid across all trades
  const totalBrokerage = trades.reduce((sum, t) => {
    const charges = getTradeCharges(t);
    const baseCharges = t.currency ? convertToBaseCurrency(charges, t.currency, t.exchangeRate) : charges;
    return sum + baseCharges;
  }, 0);
  const proPlan = isProPlan(billingState);
  const primaryCards: StatCardProps[] = [
    {
      icon: DollarSign,
      title: `Current Balance (${baseCurrency})`,
      value: formatBaseAmount(currentBalance),
      subtitle: `Capital: ${formatBaseAmount(investedCapital)}`,
      isPositive: currentBalance >= investedCapital,
    },
    {
      icon: TrendingUp,
      title: `Net P&L (${baseCurrency})`,
      value: formatBaseAmount(stats.totalPnL),
      subtitle: (
        <div className="space-y-1">
          <p className={stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
            {totalPnLPercentage === null ? 'No capital base yet' : `${stats.totalPnL >= 0 ? '+' : ''}${totalPnLPercentage.toFixed(2)}%`}
          </p>
          <p>Avg R: {stats.averageR.toFixed(2)}</p>
        </div>
      ),
      isPositive: stats.totalPnL >= 0,
    },
    {
      icon: Target,
      title: `Max Drawdown (${baseCurrency})`,
      value: formatBaseAmount(stats.maxDrawdown),
      subtitle: 'Peak to trough',
    },
  ];

  const secondaryCards: StatCardProps[] = [
    { icon: Zap, title: 'Total Trades', value: stats.totalTrades, subtitle: `${stats.winRate}% win rate` },
    { icon: Clock3, title: 'Best Timeframe', value: stats.bestTimeFrame, subtitle: 'Highest total P&L timeframe', isPositive: true },
    { icon: Clock3, title: 'Worst Timeframe', value: stats.worstTimeFrame, subtitle: 'Lowest total P&L timeframe', isPositive: false },
  ];

  if (totalBrokerage > 0) {
    secondaryCards.push({
      icon: DollarSign,
      title: `Brokerage Paid (${baseCurrency})`,
      value: formatBaseAmount(totalBrokerage),
      subtitle: 'Total charges deducted',
    });
  }

  const quickInsights = [
    {
      color: 'bg-green-400',
      title: `Win Rate: ${stats.winRate}%`,
      description: stats.winRate >= 50 ? 'Your strike rate is holding above break-even territory.' : 'Focus on trade selection and avoid forcing average setups.',
    },
    {
      color: 'bg-blue-400',
      title: `Average R-Factor: ${stats.averageR.toFixed(2)}`,
      description: stats.averageR >= 1 ? 'Reward is outpacing risk on average.' : 'Risk-to-reward needs tightening to improve expectancy.',
    },
    {
      color: 'bg-cyan-400',
      title: `Current Balance: ${formatBaseAmount(currentBalance)} (${baseCurrency})`,
      description: `Capital base is ${formatBaseAmount(investedCapital)} including deposits and withdrawals.`,
    },
    {
      color: 'bg-yellow-400',
      title: `Net P&L: ${formatBaseAmount(stats.totalPnL)} (${baseCurrency})`,
      description: stats.totalPnL >= 0 ? 'You are net profitable after brokerage deductions.' : 'Losses are still outweighing gains after costs.',
    },
    {
      color: 'bg-orange-400',
      title: `Max Drawdown: ${formatBaseAmount(stats.maxDrawdown)} (${baseCurrency})`,
      description: 'Keep position sizing aligned with the drawdown you can emotionally and financially absorb.',
    },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col bg-background">
      {/* Main content with responsive padding and proper spacing */}
      <div className="flex w-full flex-col gap-2 p-2 sm:gap-3 sm:p-3 lg:gap-4 lg:p-4">
        {!proPlan && (
          <UpgradeBanner
            title="Unlock Dhan sync, advanced analytics, and exports with Pro"
            description="Start free, then upgrade when you want unlimited trades, deeper psychology review, and broker-connected journaling."
          />
        )}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-sm shadow-black/5 sm:rounded-[30px] sm:p-4">
          <SectionIntro
            eyebrow="Performance Snapshot"
            title="Core account metrics"
            description="Your most important account numbers, arranged for fast scanning."
          />

          <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:mt-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            {primaryCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
          <TradingActivityCard trades={trades} formatBaseAmount={formatBaseAmount} />

          <Card className="h-full rounded-2xl border-border bg-card shadow-sm shadow-black/5 sm:rounded-[30px] sm:shadow-lg">
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                Quick Insights
              </CardTitle>
              <p className="text-xs text-muted-foreground sm:text-sm">Short readouts that turn your numbers into action.</p>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0 sm:space-y-2.5 sm:p-4 sm:pt-0">
              {trades.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                  <EmptyStateIllustration className="max-w-[220px]" />
                  <p className="max-w-md text-sm text-muted-foreground">
                    No trades recorded yet. Start logging trades or sync your broker history to unlock dashboard insights.
                  </p>
                </div>
              ) : (
                quickInsights.map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-background/70 sm:gap-3 sm:p-3">
                    <div className={cn('mt-1 h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5', item.color)} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground sm:text-sm">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Collapsible open={brokerHubOpen} onOpenChange={setBrokerHubOpen} className="space-y-2 sm:space-y-2.5">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-sm shadow-black/5 sm:rounded-[30px] sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionIntro
                eyebrow="Broker Connections"
                title="Broker Sync Hub"
                description="Keep broker setup, connection status, and sync actions in one dedicated section instead of mixing them with dashboard stats."
              />
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="h-9 self-start px-3 text-xs sm:h-10 sm:text-sm">
                  {brokerHubOpen ? 'Hide Broker Hub' : 'Show Broker Hub'}
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${brokerHubOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent>
            <BrokerSyncHub />
          </CollapsibleContent>
        </Collapsible>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-sm shadow-black/5 sm:rounded-[30px] sm:p-4">
          <SectionIntro
            eyebrow="Trading Edge"
            title="Where your edge shows up"
            description="Timeframe and setup-level signals separated from the core account metrics."
          />

          <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:mt-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            {secondaryCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
            <Card className="h-full min-h-[108px] rounded-2xl border-border/70 bg-card/95 shadow-sm shadow-black/5 sm:min-h-[144px] sm:rounded-3xl sm:shadow-lg">
              <CardHeader className="p-2.5 pb-1 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 sm:h-9 sm:w-9 sm:rounded-2xl">
                    <TrendingUp className="h-4 w-4 flex-shrink-0 text-green-400" />
                  </span>
                  <span>Best Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between p-2.5 pt-0 sm:p-4 sm:pt-0">
                <div className="break-words text-base font-bold leading-tight text-foreground sm:text-xl">{stats.bestSetup}</div>
                <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">Most profitable setup</p>
              </CardContent>
            </Card>

            <Card className="h-full min-h-[108px] rounded-2xl border-border/70 bg-card/95 shadow-sm shadow-black/5 sm:min-h-[144px] sm:rounded-3xl sm:shadow-lg">
              <CardHeader className="p-2.5 pb-1 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 sm:h-9 sm:w-9 sm:rounded-2xl">
                    <TrendingDown className="h-4 w-4 flex-shrink-0 text-red-400" />
                  </span>
                  <span>Worst Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between p-2.5 pt-0 sm:p-4 sm:pt-0">
                <div className="break-words text-base font-bold leading-tight text-foreground sm:text-xl">{stats.worstSetup}</div>
                <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">Least profitable setup</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-border/70 bg-card/60 p-3 shadow-sm shadow-black/5 sm:space-y-2.5 sm:rounded-[30px] sm:p-4">
          <SectionIntro
            eyebrow="Calendar"
            title="Monthly P&L map"
            description="A day-by-day read on how the month is developing."
          />
          <div className="overflow-hidden rounded-2xl border border-border bg-card sm:rounded-[24px]">
            <CalendarView trades={trades} />
          </div>
        </div>

        <div className="grid gap-2 sm:gap-2.5">
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-lg shadow-black/5 sm:rounded-[30px] sm:p-4 sm:shadow-xl lg:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_40%),linear-gradient(120deg,rgba(59,130,246,0.10),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-sm sm:tracking-wider">Control Center</p>
                  <div>
                    <h1 className="text-lg font-bold text-foreground sm:text-2xl lg:text-3xl">Trading Dashboard</h1>
                    <p className="mt-1 max-w-2xl text-[11px] leading-snug text-muted-foreground sm:mt-1.5 sm:text-sm lg:text-[15px]">
                      Track outcomes, monitor risk, and review execution quality from one sharper command view.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:px-3 sm:text-xs">
                      Total Trades: {stats.totalTrades}
                    </span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:px-3 sm:text-xs">
                      Win Rate: {stats.winRate}%
                    </span>
                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300 sm:px-3 sm:text-xs">
                      Avg R: {stats.averageR.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <GitHubSyncButton trades={trades} />
                </div>
              </div>

              <div className="grid gap-2 sm:gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[22px] sm:p-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs sm:tracking-[0.18em]">
                    <Activity className="h-4 w-4 text-primary" />
                    Desk Pulse
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {stats.totalPnL >= 0 ? 'Performance is positive and compounding.' : 'Performance needs tighter risk control.'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalPnLPercentage === null ? 'Add starting capital to unlock return tracking.' : `${totalPnLPercentage >= 0 ? '+' : ''}${totalPnLPercentage.toFixed(2)}% vs deployed capital.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[22px] sm:p-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs sm:tracking-[0.18em]">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Risk Posture
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">Max drawdown is {formatBaseAmount(stats.maxDrawdown, 0)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Average {averageTradesPerDay.toFixed(1)} trades per active day with {totalBrokerage > 0 ? `${formatBaseAmount(totalBrokerage, 0)} paid in charges.` : 'no charge data yet.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[22px] sm:p-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs sm:tracking-[0.18em]">
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                    Latest Log
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {latestTrade ? `${latestTrade.symbol} on ${format(new Date(latestTrade.date), 'MMM d, yyyy')}` : 'No trades logged yet'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {latestTrade ? `${getTradeBasePnL(latestTrade) >= 0 ? 'Closed green' : 'Closed red'} in ${latestTrade.tradeType}. ${strongMonthTradeCount} trades recorded this year.` : 'Start journaling to unlock your trading timeline.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/10 bg-[#0c1016] text-white shadow-lg shadow-black/15 sm:rounded-[30px] sm:shadow-2xl sm:shadow-black/20">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80 sm:text-[11px] sm:tracking-[0.24em]">Snapshot</p>
            <div className="mt-2.5 space-y-3 sm:mt-3 sm:space-y-4">
              <div>
                <p className="text-sm text-slate-400">Current balance</p>
                <p className="mt-1 break-words text-2xl font-semibold text-white sm:text-3xl">{formatBaseAmount(currentBalance, 0)}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 backdrop-blur-sm sm:rounded-[22px] sm:p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">Net P&amp;L</p>
                  <p className={cn('mt-1.5 break-words text-lg font-semibold sm:mt-2 sm:text-xl', stats.totalPnL >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                    {formatBaseAmount(stats.totalPnL, 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 backdrop-blur-sm sm:rounded-[22px] sm:p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">Capital</p>
                  <p className="mt-1.5 break-words text-lg font-semibold text-slate-100 sm:mt-2 sm:text-xl">{formatBaseAmount(investedCapital, 0)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 backdrop-blur-sm sm:rounded-[22px] sm:p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Trade quality</span>
                  <span>{stats.winRate}% win rate</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(0, stats.winRate))}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{stats.totalTrades} trades</span>
                  <span>{activeTradingDays} active days</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2 rounded-2xl border border-border/70 bg-card/60 p-3 shadow-sm shadow-black/5 sm:space-y-2.5 sm:rounded-[30px] sm:p-4">
          <SectionIntro
            eyebrow="Pinned Focus"
            title="Favorites board"
            description="Keep your best trade ideas, reference setups, and important screenshots close."
          />
          <FavoritesBoard />
        </div>

        {/* Getting Started */}
        {trades.length === 0 && (
          <Card className="bg-primary/10 border-primary">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
              <p className="text-xs sm:text-sm text-foreground">Welcome to your trading journal! Here&apos;s how to get started:</p>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>Click &quot;Add Trade&quot; to record your first trade</li>
                <li>Fill in all trade details including entry, exit, and stop loss</li>
                <li>Add notes about your setup and what you learned</li>
                <li>View your progress in the Trade Log</li>
                <li>Analyze patterns in the Analytics section</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
