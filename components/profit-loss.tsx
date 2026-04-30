'use client';

import { useContext, useState } from 'react';
import { TradeContext } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { getTradeBasePnL, getTradeCharges, getTradeGrossPnL, formatBaseCurrencyAmount, convertToBaseCurrency, getCapitalAdjustmentAmount, getNetCapitalAdjustments } from '@/lib/trade-utils';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, ArrowUpRight, CalendarRange, Share2, Target, Wallet } from 'lucide-react';
import ShareCardDialog from '@/components/share-card-dialog';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function sortedDateKeys(dates: string[]) {
  return [...dates].sort((a, b) => a.localeCompare(b));
}

export default function ProfitLoss() {
  const { baseCurrency, startingBalance, capitalAdjustments } = useSettings();
  const context = useContext(TradeContext);
  const trades = context?.trades ?? [];
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const totalPnL = trades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
  const netCapitalAdjustments = getNetCapitalAdjustments(capitalAdjustments);
  const investedCapital = startingBalance + netCapitalAdjustments;
  const currentBalance = investedCapital + totalPnL;
  const totalPnLPercentage = investedCapital > 0 ? (totalPnL / investedCapital) * 100 : null;
  const winningTrades = trades.filter((trade) => trade.pnl > 0).length;
  const losingTrades = trades.filter((trade) => trade.pnl < 0).length;
  const activeDaysCount = new Set(sortedDateKeys(trades.map((trade) => trade.date))).size;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  const formatBaseAmount = (value: number, decimals: number = 0) => formatBaseCurrencyAmount(value, baseCurrency, decimals);

  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate cumulative P&L using base currency
  const cumulativeData = [
    ...sortedTrades.map((trade) => ({
      date: trade.date,
      amount: getTradeBasePnL(trade),
      kind: 'trade' as const,
      symbol: trade.symbol,
      label: trade.symbol,
      order: 1,
    })),
    ...capitalAdjustments.map((adjustment) => ({
      date: adjustment.date,
      amount: getCapitalAdjustmentAmount(adjustment),
      kind: 'capital' as const,
      symbol: adjustment.type === 'withdrawal' ? 'Withdrawal' : 'Deposit',
      label: adjustment.type === 'withdrawal' ? 'Withdrawal' : 'Deposit',
      order: 0,
    })),
  ]
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return a.order - b.order;
    })
    .reduce((acc: any[], event) => {
      const lastCumulative = acc.length > 0 ? acc[acc.length - 1].cumulativePnL : 0;
      const cumulativePnL = event.kind === 'trade' ? lastCumulative + event.amount : lastCumulative;
      const lastBalance = acc.length > 0 ? acc[acc.length - 1].accountBalance : startingBalance;
      const accountBalance = lastBalance + event.amount;

      return [
        ...acc,
        {
          date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          pnl: event.kind === 'trade' ? event.amount : 0,
          cumulativePnL,
          accountBalance,
          symbol: event.symbol,
          eventLabel: event.label,
          eventType: event.kind,
          capitalFlow: event.kind === 'capital' ? event.amount : 0,
        },
      ];
    }, []);

  // Daily P&L Summary - using base currency to avoid mixing currencies
  // Now includes gross P&L, charges, and net P&L breakdown
  const dailyPnL = sortedTrades.reduce((acc: any, trade) => {
    const dateKey = trade.date;
    const basePnL = getTradeBasePnL(trade);
    const charges = getTradeCharges(trade);
    const baseCharges = trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges;
    const grossPnL = getTradeGrossPnL(trade);
    const baseGrossPnL = trade.currency ? convertToBaseCurrency(grossPnL, trade.currency, trade.exchangeRate) : grossPnL;
    const existing = acc.find((d: any) => d.date === dateKey);
    if (existing) {
      existing.pnl += basePnL;
      existing.grossPnl += baseGrossPnL;
      existing.charges += baseCharges;
      existing.trades += 1;
    } else {
      acc.push({
        date: dateKey,
        displayDate: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
        pnl: basePnL,
        grossPnl: baseGrossPnL,
        charges: baseCharges,
        trades: 1,
      });
    }
    return acc;
  }, []);

  // Monthly P&L Summary - using base currency
  const monthlyPnL = sortedTrades.reduce((acc: any, trade) => {
    const date = new Date(trade.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthDisplay = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const basePnL = getTradeBasePnL(trade);
    
    const existing = acc.find((m: any) => m.key === monthKey);
    if (existing) {
      existing.pnl += basePnL;
      existing.trades += 1;
    } else {
      acc.push({
        key: monthKey,
        month: monthDisplay,
        pnl: basePnL,
        trades: 1,
      });
    }
    return acc;
  }, []);

  // P&L by Symbol - using base currency and deriving W/L from P&L
  const symbolPnL = sortedTrades.reduce((acc: any, trade) => {
    const basePnL = getTradeBasePnL(trade);
    const isWin = trade.pnl > 0; // Derive from P&L, not deprecated isWin field
    const existing = acc.find((s: any) => s.symbol === trade.symbol);
    if (existing) {
      existing.pnl += basePnL;
      existing.wins += isWin ? 1 : 0;
      existing.losses += trade.pnl < 0 ? 1 : 0;
      existing.count += 1;
    } else {
      acc.push({
        symbol: trade.symbol,
        pnl: basePnL,
        wins: isWin ? 1 : 0,
        losses: trade.pnl < 0 ? 1 : 0,
        count: 1,
      });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.pnl - a.pnl);

  // P&L by Setup - using base currency and deriving W/L from P&L
  const setupPnL = sortedTrades.reduce((acc: any, trade) => {
    const basePnL = getTradeBasePnL(trade);
    const isWin = trade.pnl > 0; // Derive from P&L, not deprecated isWin field
    const existing = acc.find((s: any) => s.setup === trade.setupName);
    if (existing) {
      existing.pnl += basePnL;
      existing.wins += isWin ? 1 : 0;
      existing.losses += trade.pnl < 0 ? 1 : 0;
      existing.count += 1;
    } else {
      acc.push({
        setup: trade.setupName,
        pnl: basePnL,
        wins: isWin ? 1 : 0,
        losses: trade.pnl < 0 ? 1 : 0,
        count: 1,
      });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.pnl - a.pnl);

  // Total charges and gross P&L
  const totalCharges = trades.reduce((sum, trade) => {
    const charges = getTradeCharges(trade);
    return sum + (trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges);
  }, 0);
  const totalGrossPnL = totalPnL + totalCharges;
  const averageTrade = trades.length > 0 ? totalPnL / trades.length : 0;
  const largestWin = sortedTrades.reduce((max, trade) => Math.max(max, getTradeBasePnL(trade)), Number.NEGATIVE_INFINITY);
  const largestLoss = sortedTrades.reduce((min, trade) => Math.min(min, getTradeBasePnL(trade)), Number.POSITIVE_INFINITY);
  const balanceRange = cumulativeData.length > 0
    ? cumulativeData.reduce(
        (range, point) => ({
          low: Math.min(range.low, point.accountBalance),
          high: Math.max(range.high, point.accountBalance),
        }),
        { low: cumulativeData[0].accountBalance, high: cumulativeData[0].accountBalance }
      )
    : null;
  const latestPoint = cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1] : null;
  const balanceChange = latestPoint ? latestPoint.accountBalance - startingBalance : 0;
  const summaryStats = [
    {
      label: 'Win Rate',
      value: trades.length > 0 ? `${winRate.toFixed(1)}%` : '—',
      subtext: `${winningTrades} wins / ${losingTrades} losses`,
      icon: Target,
      tone: winRate >= 50 ? 'positive' : 'negative',
    },
    {
      label: 'Average Trade',
      value: trades.length > 0 ? formatBaseAmount(averageTrade) : '—',
      subtext: `${trades.length} closed trades`,
      icon: CalendarRange,
      tone: averageTrade >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Largest Win',
      value: Number.isFinite(largestWin) && largestWin > 0 ? formatBaseAmount(largestWin) : '—',
      subtext: 'Best single trade',
      icon: ArrowUpRight,
      tone: 'positive',
    },
    {
      label: 'Largest Loss',
      value: Number.isFinite(largestLoss) && largestLoss < 0 ? formatBaseAmount(largestLoss) : '—',
      subtext: 'Worst single trade',
      icon: ArrowDownRight,
      tone: 'negative',
    },
  ];

  const getToneClass = (tone: 'positive' | 'negative' | 'neutral') => {
    if (tone === 'positive') return 'text-emerald-400';
    if (tone === 'negative') return 'text-rose-400';
    return 'text-foreground';
  };
  
  // FIXED: Best Day = highest POSITIVE daily P&L only
  const positiveDays = dailyPnL.filter((day: any) => day.pnl > 0);
  const bestDay = positiveDays.length > 0 
    ? positiveDays.reduce((max: any, day: any) => (day.pnl > max.pnl ? day : max)) 
    : null;
  
  // FIXED: Worst Day = most NEGATIVE daily P&L only
  const negativeDays = dailyPnL.filter((day: any) => day.pnl < 0);
  const worstDay = negativeDays.length > 0 
    ? negativeDays.reduce((min: any, day: any) => (day.pnl < min.pnl ? day : min)) 
    : null;
  
  // Best Month = highest positive monthly P&L
  const positiveMonths = monthlyPnL.filter((month: any) => month.pnl > 0);
  const bestMonth = positiveMonths.length > 0 
    ? positiveMonths.reduce((max: any, month: any) => (month.pnl > max.pnl ? month : max)) 
    : null;

  if (!context) return null;

  return (
    <div className="flex-1 overflow-auto min-h-screen flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Profit & Loss Summary</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Track your earnings and identify profitable patterns</p>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-card p-4 sm:mb-8 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">Shareable Performance Card</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Export a polished P&amp;L card for today, the last 7 days, or any custom range with privacy toggles, mini charts, and theme styling.
              </p>
            </div>
            <Button type="button" onClick={() => setIsShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share P&amp;L
            </Button>
          </div>
        </div>

        {/* Overall Summary - All values in base currency */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%)] p-4 sm:p-6 lg:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                    <Wallet className="h-3.5 w-3.5" />
                    Performance snapshot in {baseCurrency}
                  </div>
                  <p className="text-sm text-muted-foreground">Current account balance</p>
                  <p className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${currentBalance >= investedCapital ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatBaseAmount(currentBalance)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {totalPnL >= 0 ? '+' : ''}{formatBaseAmount(totalPnL)} net P&amp;L
                    </span>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                      Capital base {formatBaseAmount(investedCapital)}
                    </span>
                    {totalPnLPercentage !== null && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {totalPnL >= 0 ? '+' : ''}{totalPnLPercentage.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
                  <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Gross P&amp;L</p>
                    <p className={`mt-2 text-xl font-semibold ${totalGrossPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatBaseAmount(totalGrossPnL)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Before fees and charges</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Charges</p>
                    <p className="mt-2 text-xl font-semibold text-amber-400">-{formatBaseAmount(totalCharges)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Brokerage, taxes, and fees</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Best Day</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-400">{bestDay ? formatBaseAmount(bestDay.pnl) : '—'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{bestDay ? bestDay.displayDate : 'No profitable days yet'}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Worst Day</p>
                    <p className="mt-2 text-xl font-semibold text-rose-400">{worstDay ? formatBaseAmount(worstDay.pnl) : '—'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{worstDay ? worstDay.displayDate : 'No losing days yet'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</p>
                      <p className={`mt-2 text-xl font-semibold ${getToneClass(stat.tone as 'positive' | 'negative' | 'neutral')}`}>{stat.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{stat.subtext}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-2 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Active Trading Days</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{activeDaysCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Days with at least one closed trade</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Best Month</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-400">{bestMonth ? formatBaseAmount(bestMonth.pnl) : '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{bestMonth ? bestMonth.month : 'No profitable months yet'}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Capital Adjustments</p>
              <p className={`mt-2 text-2xl font-semibold ${netCapitalAdjustments >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netCapitalAdjustments >= 0 ? '+' : ''}{formatBaseAmount(netCapitalAdjustments)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Deposits and withdrawals applied</p>
            </div>
          </div>
        </div>

        {/* Cumulative P&L Chart */}
        {cumulativeData.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card sm:mb-8">
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">Account Balance Over Time</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A cleaner equity curve showing how closed-trade P&amp;L and capital flows shaped the account.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Latest</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{latestPoint ? formatBaseAmount(latestPoint.accountBalance) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">High</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-400">{balanceRange ? formatBaseAmount(balanceRange.high) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Low</p>
                    <p className="mt-1 text-sm font-semibold text-rose-400">{balanceRange ? formatBaseAmount(balanceRange.low) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">From Start</p>
                    <p className={`mt-1 text-sm font-semibold ${balanceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {balanceChange >= 0 ? '+' : ''}{formatBaseAmount(balanceChange)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-6">
              <ResponsiveContainer width="100%" height={320} minHeight={240}>
                <AreaChart data={cumulativeData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.38} />
                      <stop offset="60%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    width={88}
                    tickFormatter={(value) => formatBaseAmount(Number(value))}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(16,185,129,0.35)', strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '14px',
                      boxShadow: '0 18px 50px rgba(15, 23, 42, 0.18)',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    formatter={(value: number | string | undefined, name?: string, item?: any) => {
                      const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                      if (name === 'accountBalance') return [formatBaseAmount(numericValue), 'Balance'];
                      if (name === 'capitalFlow') {
                        if (!numericValue) return null;
                        return [`${numericValue >= 0 ? '+' : ''}${formatBaseAmount(numericValue)}`, item?.payload?.eventLabel || 'Capital Flow'];
                      }
                      return [`${numericValue >= 0 ? '+' : ''}${formatBaseAmount(numericValue)}`, 'Trade P&L'];
                    }}
                  />
                  <ReferenceLine
                    y={investedCapital}
                    stroke="rgba(148,163,184,0.6)"
                    strokeDasharray="6 6"
                    ifOverflow="extendDomain"
                    label={{ value: 'Capital base', position: 'insideTopLeft', fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accountBalance"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#balanceFill)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                    dot={false}
                    name="accountBalance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily P&L Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {dailyPnL.length > 0 && (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Daily P&L ({baseCurrency})</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {dailyPnL.map((day: any, idx: number) => (
                  <div key={idx} className="p-2 hover:bg-secondary rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">{day.displayDate}</p>
                        <p className="text-xs text-muted-foreground">{day.trades} trade(s)</p>
                      </div>
                      <p className={`text-lg font-bold ${day.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatBaseAmount(day.pnl)}
                      </p>
                    </div>
                    {day.charges > 0 && (
                      <div className="flex gap-4 mt-1 ml-0">
                        <span className="text-xs text-muted-foreground">
                          Gross: <span className={day.grossPnl >= 0 ? 'text-green-400' : 'text-red-400'}>{formatBaseAmount(day.grossPnl)}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Charges: <span className="text-orange-400">-{formatBaseAmount(day.charges)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {monthlyPnL.length > 0 && (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Monthly P&L ({baseCurrency})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monthlyPnL.map((month: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2 hover:bg-secondary rounded">
                    <div>
                      <p className="text-sm font-medium text-foreground">{month.month}</p>
                      <p className="text-xs text-muted-foreground">{month.trades} trade(s)</p>
                    </div>
                    <p className={`text-lg font-bold ${month.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatBaseAmount(month.pnl)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* P&L by Symbol - using base currency */}
        {symbolPnL.length > 0 && (
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">P&L by Symbol ({baseCurrency})</h3>
            <div className="overflow-x-auto -mx-4 sm:-mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 font-medium text-foreground">Symbol</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Trades</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Wins</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Win %</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {symbolPnL.map((symbol: any, idx: number) => (
                    <tr key={idx} className="border-b border-border hover:bg-secondary">
                      <td className="py-3 px-4 font-semibold text-foreground">{symbol.symbol}</td>
                      <td className="text-right py-3 px-4 text-foreground">{symbol.count}</td>
                      <td className="text-right py-3 px-4 text-green-400">{symbol.wins}</td>
                      <td className="text-right py-3 px-4 text-foreground">
                        {((symbol.wins / symbol.count) * 100).toFixed(1)}%
                      </td>
                      <td className={`text-right py-3 px-4 font-bold ${symbol.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatBaseAmount(symbol.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* P&L by Setup - using base currency */}
        {setupPnL.length > 0 && (
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">P&L by Setup ({baseCurrency})</h3>
            <div className="overflow-x-auto -mx-4 sm:-mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 font-medium text-foreground">Setup</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Trades</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Wins</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Win %</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {setupPnL.map((setup: any, idx: number) => (
                    <tr key={idx} className="border-b border-border hover:bg-secondary">
                      <td className="py-3 px-4 font-semibold text-foreground">{setup.setup}</td>
                      <td className="text-right py-3 px-4 text-foreground">{setup.count}</td>
                      <td className="text-right py-3 px-4 text-green-400">{setup.wins}</td>
                      <td className="text-right py-3 px-4 text-foreground">
                        {((setup.wins / setup.count) * 100).toFixed(1)}%
                      </td>
                      <td className={`text-right py-3 px-4 font-bold ${setup.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatBaseAmount(setup.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {trades.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No trades yet. Start trading and track your P&L!</p>
          </div>
        )}
      </div>
      <ShareCardDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        mode="performance"
        trades={trades}
      />
    </div>
  );
}
