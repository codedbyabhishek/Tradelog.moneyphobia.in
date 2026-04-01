'use client';

import { useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trade } from '@/lib/types';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  getTradeBasePnL,
  getTradeCharges,
  CURRENCY_SYMBOLS,
  getEquityCurveInBaseCurrency,
  formatCurrency,
  convertToBaseCurrency,
  getCapitalAdjustmentAmount,
  getNetCapitalAdjustments,
} from '@/lib/trade-utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { EmptyStateIllustration } from './brand-illustrations';

type DateRangeKey = 'all' | '7d' | '30d' | 'month' | 'custom';
type BrokerFilter = 'all' | 'manual' | 'dhan';

const DATE_RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
  { key: 'all', label: 'All Time' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const CHART_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

function isDhanTrade(trade: Trade) {
  return trade.id.startsWith('dhan:');
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeStart(range: DateRangeKey, now: Date) {
  const start = new Date(now);

  if (range === '7d') {
    start.setDate(start.getDate() - 6);
    return getLocalDateString(start);
  }

  if (range === '30d') {
    start.setDate(start.getDate() - 29);
    return getLocalDateString(start);
  }

  if (range === 'month') {
    start.setDate(1);
    return getLocalDateString(start);
  }

  return null;
}

export default function Analytics() {
  const { trades } = useTrades();
  const { baseCurrency, startingBalance, capitalAdjustments } = useSettings();
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [setupFilter, setSetupFilter] = useState<string>('all');
  const [brokerFilter, setBrokerFilter] = useState<BrokerFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];
  const netCapitalAdjustments = getNetCapitalAdjustments(capitalAdjustments);
  const investedCapital = startingBalance + netCapitalAdjustments;

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades]);

  const setupOptions = useMemo(() => {
    return [...new Set(trades.map((trade) => trade.setupName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [trades]);

  const dateBounds = useMemo(() => {
    const now = new Date();

    if (dateRange === 'custom') {
      return {
        start: customStartDate || null,
        end: customEndDate || null,
      };
    }

    return {
      start: getRangeStart(dateRange, now),
      end: dateRange === 'all' ? null : getLocalDateString(now),
    };
  }, [dateRange, customStartDate, customEndDate]);

  const filteredTrades = useMemo(() => {
    return sortedTrades.filter((trade) => {
      if (setupFilter !== 'all' && trade.setupName !== setupFilter) return false;
      if (brokerFilter === 'dhan' && !isDhanTrade(trade)) return false;
      if (brokerFilter === 'manual' && isDhanTrade(trade)) return false;

      if (dateBounds.start && trade.date < dateBounds.start) return false;
      if (dateBounds.end && trade.date > dateBounds.end) return false;
      return true;
    });
  }, [sortedTrades, setupFilter, brokerFilter, dateBounds]);

  const capitalAdjustmentsBeforeWindow = useMemo(() => {
    if (!dateBounds.start) return [];
    return capitalAdjustments.filter((adjustment) => adjustment.date < dateBounds.start!);
  }, [capitalAdjustments, dateBounds.start]);

  const capitalAdjustmentsInWindow = useMemo(() => {
    return capitalAdjustments.filter((adjustment) => {
      if (dateBounds.start && adjustment.date < dateBounds.start) return false;
      if (dateBounds.end && adjustment.date > dateBounds.end) return false;
      return true;
    });
  }, [capitalAdjustments, dateBounds]);

  const filteredCapitalBase = useMemo(() => {
    return startingBalance + getNetCapitalAdjustments(capitalAdjustmentsBeforeWindow);
  }, [startingBalance, capitalAdjustmentsBeforeWindow]);

  const totalAccountPnL = useMemo(() => {
    return trades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
  }, [trades]);

  const currentAccountBalance = investedCapital + totalAccountPnL;
  const totalAccountReturnPct = investedCapital > 0 ? (totalAccountPnL / investedCapital) * 100 : null;

  const filteredSummary = useMemo(() => {
    const totalPnL = filteredTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
    const wins = filteredTrades.filter((trade) => getTradeBasePnL(trade) > 0).length;
    const losses = filteredTrades.filter((trade) => getTradeBasePnL(trade) < 0).length;
    const breakeven = filteredTrades.length - wins - losses;
    const totalCharges = filteredTrades.reduce((sum, trade) => {
      const charges = getTradeCharges(trade);
      return sum + (trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges);
    }, 0);
    const avgTrade = filteredTrades.length > 0 ? totalPnL / filteredTrades.length : 0;
    const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;
    const filteredReturnPct = filteredCapitalBase > 0 ? (totalPnL / filteredCapitalBase) * 100 : null;

    return {
      totalPnL,
      wins,
      losses,
      breakeven,
      totalCharges,
      avgTrade,
      winRate,
      filteredReturnPct,
    };
  }, [filteredTrades, filteredCapitalBase]);

  const equityCurveData = useMemo(() => {
    return getEquityCurveInBaseCurrency(filteredTrades, baseCurrency, filteredCapitalBase, capitalAdjustmentsInWindow);
  }, [filteredTrades, baseCurrency, filteredCapitalBase, capitalAdjustmentsInWindow]);

  const balanceMilestones = useMemo(() => {
    let runningBalance = filteredCapitalBase;
    let peakBalance = filteredCapitalBase;
    let maxDrawdown = 0;
    let sawEvent = false;

    for (const point of equityCurveData) {
      sawEvent = true;
      runningBalance = point.balance;
      peakBalance = Math.max(peakBalance, runningBalance);
      maxDrawdown = Math.max(maxDrawdown, peakBalance - runningBalance);
    }

    return {
      startBalance: startingBalance,
      netCapitalAdjustments: getNetCapitalAdjustments(capitalAdjustmentsInWindow),
      investedCapital: filteredCapitalBase + getNetCapitalAdjustments(capitalAdjustmentsInWindow),
      currentBalance: sawEvent ? runningBalance : filteredCapitalBase,
      peakBalance,
      maxDrawdown,
    };
  }, [equityCurveData, filteredCapitalBase, startingBalance, capitalAdjustmentsInWindow]);

  const winLossData = useMemo(() => {
    return [
      { name: 'Wins', value: filteredSummary.wins },
      { name: 'Losses', value: filteredSummary.losses },
      ...(filteredSummary.breakeven > 0 ? [{ name: 'Break-Even', value: filteredSummary.breakeven }] : []),
    ].filter((item) => item.value > 0);
  }, [filteredSummary]);

  const setupPerformanceData = useMemo(() => {
    const setupMap = new Map<string, { pnl: number; trades: number }>();

    filteredTrades.forEach((trade) => {
      const existing = setupMap.get(trade.setupName) || { pnl: 0, trades: 0 };
      setupMap.set(trade.setupName, {
        pnl: existing.pnl + getTradeBasePnL(trade),
        trades: existing.trades + 1,
      });
    });

    return Array.from(setupMap.entries())
      .map(([name, data]) => ({
        name: name.length > 15 ? `${name.slice(0, 12)}...` : name,
        pnl: parseFloat(data.pnl.toFixed(2)),
        trades: data.trades,
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8);
  }, [filteredTrades]);

  const brokerPerformanceData = useMemo(() => {
    const groups: Record<string, { label: string; pnl: number; trades: number }> = {
      manual: { label: 'Manual', pnl: 0, trades: 0 },
      dhan: { label: 'Dhan', pnl: 0, trades: 0 },
    };

    filteredTrades.forEach((trade) => {
      const key = isDhanTrade(trade) ? 'dhan' : 'manual';
      groups[key].pnl += getTradeBasePnL(trade);
      groups[key].trades += 1;
    });

    return Object.values(groups)
      .filter((group) => group.trades > 0)
      .map((group) => ({
        ...group,
        pnl: parseFloat(group.pnl.toFixed(2)),
      }));
  }, [filteredTrades]);

  const dayPerformanceData = useMemo(() => {
    const dayMap = new Map<string, number>();
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    filteredTrades.forEach((trade) => {
      dayMap.set(trade.dayOfWeek, (dayMap.get(trade.dayOfWeek) || 0) + getTradeBasePnL(trade));
    });

    return dayOrder
      .filter((day) => dayMap.has(day))
      .map((day) => ({
        day: day.slice(0, 3),
        pnl: parseFloat((dayMap.get(day) || 0).toFixed(2)),
      }));
  }, [filteredTrades]);

  const monthlyTable = useMemo(() => {
    const monthlyMap = new Map<string, { month: string; trades: number; wins: number; pnl: number; charges: number }>();

    filteredTrades.forEach((trade) => {
      const date = new Date(trade.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const charges = getTradeCharges(trade);
      const baseCharges = trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges;
      const existing = monthlyMap.get(key) || { month: label, trades: 0, wins: 0, pnl: 0, charges: 0 };

      existing.trades += 1;
      existing.wins += getTradeBasePnL(trade) > 0 ? 1 : 0;
      existing.pnl += getTradeBasePnL(trade);
      existing.charges += baseCharges;
      monthlyMap.set(key, existing);
    });

    const adjustmentMap = new Map<string, number>();

    capitalAdjustmentsInWindow.forEach((adjustment) => {
      const monthKey = adjustment.date.slice(0, 7);
      adjustmentMap.set(monthKey, (adjustmentMap.get(monthKey) || 0) + getCapitalAdjustmentAmount(adjustment));
    });

    const keys = Array.from(new Set([...monthlyMap.keys(), ...adjustmentMap.keys()])).sort((a, b) => a.localeCompare(b));
    const rows: Array<{
      month: string;
      trades: number;
      winRate: number;
      pnl: number;
      charges: number;
      capitalChange: number;
      endingBalance: number;
    }> = [];
    let runningBalance = filteredCapitalBase;

    for (const key of keys) {
      const row = monthlyMap.get(key) || {
        month: new Date(`${key}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        trades: 0,
        wins: 0,
        pnl: 0,
        charges: 0,
      };
      const capitalChange = adjustmentMap.get(key) || 0;
      const winRate = row.trades > 0 ? (row.wins / row.trades) * 100 : 0;

      runningBalance += row.pnl + capitalChange;
      rows.push({
        month: row.month,
        trades: row.trades,
        winRate: parseFloat(winRate.toFixed(1)),
        pnl: parseFloat(row.pnl.toFixed(2)),
        charges: parseFloat(row.charges.toFixed(2)),
        capitalChange: parseFloat(capitalChange.toFixed(2)),
        endingBalance: parseFloat(runningBalance.toFixed(2)),
      });
    }

    return rows;
  }, [filteredTrades, filteredCapitalBase, capitalAdjustmentsInWindow]);

  const topSetups = useMemo(() => {
    const rows = [...setupPerformanceData];
    return {
      best: rows.length > 0 ? rows[0] : null,
      worst: rows.length > 0 ? rows[rows.length - 1] : null,
    };
  }, [setupPerformanceData]);

  return (
    <div className="w-full min-h-screen flex flex-col gap-3 sm:gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6 overflow-hidden">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Analytics</h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
          Analyze returns, balance growth, setups, and broker performance with filterable views
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Date range, broker source, and setup filters update the analytics cards and charts below
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            {DATE_RANGE_OPTIONS.map((option) => (
              <Button
                key={option.key}
                type="button"
                variant={dateRange === option.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Broker Filter</label>
              <Select value={brokerFilter} onValueChange={(value) => setBrokerFilter(value as BrokerFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trades</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="dhan">Dhan Synced Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Setup Filter</label>
              <Select value={setupFilter} onValueChange={setSetupFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Setups</SelectItem>
                  {setupOptions.map((setup) => (
                    <SelectItem key={setup} value={setup}>
                      {setup}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Account Balance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-2xl font-bold ${currentAccountBalance >= investedCapital ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(currentAccountBalance, baseCurrency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Capital Base: {formatCurrency(investedCapital, baseCurrency)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Return</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-2xl font-bold ${totalAccountPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalAccountReturnPct === null ? 'Set Start Balance' : `${totalAccountReturnPct.toFixed(2)}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Whole account based on current contributed capital</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Filtered Net P&amp;L</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-2xl font-bold ${filteredSummary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(filteredSummary.totalPnL, baseCurrency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredSummary.filteredReturnPct === null ? 'Set capital base for % view' : `${filteredSummary.filteredReturnPct.toFixed(2)}% of current contributed capital`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Filtered Win Rate</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-foreground">{filteredSummary.winRate.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredTrades.length} trades, avg {formatCurrency(filteredSummary.avgTrade, baseCurrency)} per trade
            </p>
          </CardContent>
        </Card>
      </div>

      {filteredTrades.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 sm:p-12">
            <Empty className="border-0 p-0">
              <EmptyStateIllustration />
              <EmptyHeader>
                <EmptyTitle>No trades match the current analytics filters</EmptyTitle>
                <EmptyDescription>
                  Broaden the date range, switch the broker filter, or choose a different setup to restore your charts.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your balance curve appears once matching trades exist</p>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Peak Balance</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xl font-bold text-foreground">{formatCurrency(balanceMilestones.peakBalance, baseCurrency)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xl font-bold text-red-400">{formatCurrency(balanceMilestones.maxDrawdown, baseCurrency)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Charges</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xl font-bold text-orange-400">{formatCurrency(filteredSummary.totalCharges, baseCurrency)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Net Capital Change</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-xl font-bold ${balanceMilestones.netCapitalAdjustments >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(balanceMilestones.netCapitalAdjustments, baseCurrency)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Best Setup In View</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-lg font-bold text-foreground">{topSetups.best?.name || 'N/A'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {topSetups.best ? formatCurrency(topSetups.best.pnl, baseCurrency) : 'No setup data'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl">Equity Curve</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Capital base plus in-range deposits, withdrawals, and net P&amp;L for the current filter selection
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <ResponsiveContainer width="100%" height={300} minHeight={240}>
                <LineChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                  <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value, baseCurrency)}
                  />
                  <Line type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Win vs Loss</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Outcome split for the current view</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={240} minHeight={200}>
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      dataKey="value"
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Broker Comparison</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manual vs Dhan performance inside the current date range</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {brokerPerformanceData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No broker data available for this view.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240} minHeight={200}>
                    <BarChart data={brokerPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="label" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => formatCurrency(value, baseCurrency)}
                      />
                      <Bar dataKey="pnl" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Setup Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Top setups by net P&amp;L in the current view</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={260} minHeight={220}>
                  <BarChart data={setupPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => formatCurrency(value, baseCurrency)}
                    />
                    <Bar dataKey="pnl" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Day-wise Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">See which weekdays are helping or hurting performance</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={260} minHeight={220}>
                  <BarChart data={dayPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => formatCurrency(value, baseCurrency)}
                    />
                    <Bar dataKey="pnl" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Monthly Performance Table</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Month-by-month trades, win rate, capital change, charges, net P&amp;L, and ending balance for the current filter set
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Month</th>
                      <th className="px-4 py-3 font-medium">Trades</th>
                      <th className="px-4 py-3 font-medium">Win Rate</th>
                      <th className="px-4 py-3 font-medium">Capital</th>
                      <th className="px-4 py-3 font-medium">Net P&amp;L</th>
                      <th className="px-4 py-3 font-medium">Charges</th>
                      <th className="px-4 py-3 font-medium">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTable.map((row, index) => (
                      <tr key={`${row.month}-${index}`} className="border-t border-border">
                        <td className="px-4 py-3 text-foreground">{row.month}</td>
                        <td className="px-4 py-3 text-foreground">{row.trades}</td>
                        <td className="px-4 py-3 text-foreground">{row.winRate.toFixed(1)}%</td>
                        <td className={`px-4 py-3 font-medium ${row.capitalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {baseCurrencySymbol}{row.capitalChange.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 font-medium ${row.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {baseCurrencySymbol}{row.pnl.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-orange-400">{baseCurrencySymbol}{row.charges.toFixed(2)}</td>
                        <td className="px-4 py-3 text-foreground">{baseCurrencySymbol}{row.endingBalance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
