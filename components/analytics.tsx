'use client';

import { useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  getTradeBasePnL,
  getTradeCharges,
  getEquityCurveInBaseCurrency,
  formatBaseCurrencyAmount,
  convertToBaseCurrency,
  getCapitalAdjustmentAmount,
  getNetCapitalAdjustments,
  calculateRFactor,
} from '@/lib/trade-utils';
import { BROKER_DEFINITIONS, getBrokerDefinition, getBrokerIdFromTrade, type BrokerId } from '@/lib/brokers';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  Legend,
} from 'recharts';
import { EmptyStateIllustration } from './brand-illustrations';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, X } from 'lucide-react';

type DateRangeKey = 'today' | '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';
type BrokerFilter = 'all' | BrokerId;
type OutcomeFilter = 'all' | 'winners' | 'losers';

const DATE_RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '3 Months' },
  { key: '1y', label: '1 Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

const CHART_COLORS = ['#10b981', '#ff4d6d', '#3b82f6', '#f59e0b', '#8b5cf6'];
const POSITIVE_CHART = '#10b981';
const NEGATIVE_CHART = '#ff4d6d';
const NEUTRAL_CHART = '#7c3aed';

function AnalyticsTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>;
  label?: string;
  formatter?: (value: number, name?: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[180px] rounded-2xl border border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur">
      {label ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p> : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((item, index) => (
          <div key={`${item.name || 'value'}-${index}`} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || 'var(--color-primary)' }}
              />
              <span>{item.name || 'Value'}</span>
            </div>
            <span className="font-semibold text-foreground">
              {formatter && typeof item.value === 'number'
                ? formatter(item.value, item.name)
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeStart(range: DateRangeKey, now: Date) {
  const start = new Date(now);

  if (range === 'today') {
    return getLocalDateString(start);
  }

  if (range === '7d') {
    start.setDate(start.getDate() - 6);
    return getLocalDateString(start);
  }

  if (range === '30d') {
    start.setDate(start.getDate() - 29);
    return getLocalDateString(start);
  }

  if (range === '90d') {
    start.setDate(start.getDate() - 89);
    return getLocalDateString(start);
  }

  if (range === '1y') {
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    return getLocalDateString(start);
  }

  return null;
}

export default function Analytics() {
  const { trades } = useTrades();
  const { baseCurrency, startingBalance, capitalAdjustments } = useSettings();
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [setupFilter, setSetupFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [brokerFilter, setBrokerFilter] = useState<BrokerFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const formatBaseAmount = (value: number, decimals: number = 2) => formatBaseCurrencyAmount(value, baseCurrency, decimals);
  const netCapitalAdjustments = getNetCapitalAdjustments(capitalAdjustments);
  const investedCapital = startingBalance + netCapitalAdjustments;

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades]);

  const setupOptions = useMemo(() => {
    return [...new Set(trades.map((trade) => trade.setupName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [trades]);

  const tagOptions = useMemo(() => {
    return [...new Set(trades.flatMap((trade) => trade.tags || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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
      if (tagFilter !== 'all' && !(trade.tags || []).includes(tagFilter)) return false;
      if (brokerFilter !== 'all' && getBrokerIdFromTrade(trade) !== brokerFilter) return false;
      if (outcomeFilter === 'winners' && getTradeBasePnL(trade) <= 0) return false;
      if (outcomeFilter === 'losers' && getTradeBasePnL(trade) >= 0) return false;

      if (dateBounds.start && trade.date < dateBounds.start) return false;
      if (dateBounds.end && trade.date > dateBounds.end) return false;
      return true;
    });
  }, [sortedTrades, setupFilter, tagFilter, brokerFilter, outcomeFilter, dateBounds]);

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

  const longShortData = useMemo(() => {
    const longTrades = filteredTrades.filter((trade) => trade.position === 'Buy');
    const shortTrades = filteredTrades.filter((trade) => trade.position === 'Sell');

    return [
      {
        name: 'Long',
        value: longTrades.length,
        pnl: longTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0),
      },
      {
        name: 'Short',
        value: shortTrades.length,
        pnl: shortTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0),
      },
    ].filter((item) => item.value > 0);
  }, [filteredTrades]);

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
    const groups = new Map<BrokerId, { label: string; pnl: number; trades: number }>();

    filteredTrades.forEach((trade) => {
      const brokerId = getBrokerIdFromTrade(trade);
      const broker = getBrokerDefinition(brokerId);
      const existing = groups.get(brokerId) || { label: broker.shortLabel, pnl: 0, trades: 0 };
      existing.pnl += getTradeBasePnL(trade);
      existing.trades += 1;
      groups.set(brokerId, existing);
    });

    return Array.from(groups.values())
      .filter((group) => group.trades > 0)
      .map((group) => ({
        ...group,
        pnl: parseFloat(group.pnl.toFixed(2)),
      }));
  }, [filteredTrades]);

  const tagPerformanceData = useMemo(() => {
    const tagMap = new Map<string, { pnl: number; trades: number; wins: number }>();

    filteredTrades.forEach((trade) => {
      (trade.tags || []).forEach((tag) => {
        const pnl = getTradeBasePnL(trade);
        const existing = tagMap.get(tag) || { pnl: 0, trades: 0, wins: 0 };
        tagMap.set(tag, {
          pnl: existing.pnl + pnl,
          trades: existing.trades + 1,
          wins: existing.wins + (pnl > 0 ? 1 : 0),
        });
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        pnl: parseFloat(data.pnl.toFixed(2)),
        trades: data.trades,
        winRate: data.trades > 0 ? parseFloat(((data.wins / data.trades) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
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

  const recentTrades = useMemo(() => {
    return [...filteredTrades]
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.exitTime || b.entryTime || '').localeCompare(a.exitTime || a.entryTime || '');
      })
      .slice(0, 6);
  }, [filteredTrades]);

  const quickStats = useMemo(() => {
    const winningTrades = filteredTrades.filter((trade) => getTradeBasePnL(trade) > 0);
    const losingTrades = filteredTrades.filter((trade) => getTradeBasePnL(trade) < 0);
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const averageWinner =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0) / winningTrades.length
        : 0;
    const averageLoser =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0) / losingTrades.length
        : 0;

    const bestTrade = sortedTrades.reduce<(typeof sortedTrades)[number] | null>(
      (best, trade) => (!best || getTradeBasePnL(trade) > getTradeBasePnL(best) ? trade : best),
      null,
    );
    const worstTrade = sortedTrades.reduce<(typeof sortedTrades)[number] | null>(
      (worst, trade) => (!worst || getTradeBasePnL(trade) < getTradeBasePnL(worst) ? trade : worst),
      null,
    );

    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    sortedTrades.forEach((trade) => {
      const pnl = getTradeBasePnL(trade);

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

    const averageRiskReward =
      filteredTrades.length > 0
        ? filteredTrades.reduce((sum, trade) => {
            if (typeof trade.riskRewardRatio === 'number' && Number.isFinite(trade.riskRewardRatio)) {
              return sum + trade.riskRewardRatio;
            }

            if (trade.entryPrice !== undefined && trade.stopLoss !== undefined) {
              return sum + Math.abs(calculateRFactor(trade));
            }

            return sum;
          }, 0) / filteredTrades.length
        : 0;

    const openTrades = filteredTrades.filter((trade) => trade.exitPrice === undefined || trade.exitPrice === null).length;

    return {
      averageWinner,
      averageLoser,
      bestTrade,
      worstTrade,
      maxWinStreak,
      maxLossStreak,
      averageRiskReward,
      openTrades,
    };
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

  const outcomeTotal = winLossData.reduce((sum, item) => sum + item.value, 0);

  const quickStatsCards = [
    {
      label: 'Avg Winner',
      value: formatBaseAmount(quickStats.averageWinner),
      tone: 'text-emerald-400',
    },
    {
      label: 'Avg Loser',
      value: formatBaseAmount(quickStats.averageLoser),
      tone: 'text-red-400',
    },
    {
      label: 'Best Trade',
      value: quickStats.bestTrade ? formatBaseAmount(getTradeBasePnL(quickStats.bestTrade)) : 'N/A',
      tone: 'text-emerald-400',
    },
    {
      label: 'Worst Trade',
      value: quickStats.worstTrade ? formatBaseAmount(getTradeBasePnL(quickStats.worstTrade)) : 'N/A',
      tone: 'text-red-400',
    },
    {
      label: 'Win Streak',
      value: `${quickStats.maxWinStreak}`,
      tone: 'text-foreground',
    },
    {
      label: 'Loss Streak',
      value: `${quickStats.maxLossStreak}`,
      tone: 'text-foreground',
    },
    {
      label: 'Risk:Reward',
      value: quickStats.averageRiskReward > 0 ? `1:${quickStats.averageRiskReward.toFixed(2)}` : 'N/A',
      tone: 'text-foreground',
    },
    {
      label: 'Open Trades',
      value: `${quickStats.openTrades}`,
      tone: 'text-foreground',
    },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col gap-3 sm:gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6 overflow-hidden">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Analytics</h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
          Analyze returns, balance growth, setups, and broker performance with filterable views
        </p>
      </div>

      <Card className="overflow-hidden border-border bg-[#0d0d11] text-white">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Time Period</p>
              <div className="flex flex-wrap gap-2">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setDateRange(option.key)}
                    className={`min-h-11 rounded-2xl border px-5 text-sm font-semibold transition-colors ${
                      dateRange === option.key
                        ? 'border-[#1f6fff] bg-[#1668ff] text-white shadow-[0_0_0_1px_rgba(22,104,255,0.25)]'
                        : 'border-white/10 bg-white/[0.06] text-white/55 hover:bg-white/[0.09] hover:text-white/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Filter By</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All Trades' },
                  { key: 'winners', label: 'Winners', icon: CheckCircle2 },
                  { key: 'losers', label: 'Losers', icon: X },
                ].map((option) => {
                  const Icon = option.icon;
                  const isActive = outcomeFilter === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setOutcomeFilter(option.key as OutcomeFilter)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-5 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'border-[#1f6fff] bg-[#1668ff] text-white shadow-[0_0_0_1px_rgba(22,104,255,0.25)]'
                          : 'border-white/10 bg-white/[0.06] text-white/55 hover:bg-white/[0.09] hover:text-white/80'
                      }`}
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:max-w-2xl">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            <Select value={brokerFilter} onValueChange={(value) => setBrokerFilter(value as BrokerFilter)}>
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.06] text-white">
                <SelectValue placeholder="Broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {BROKER_DEFINITIONS.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.status === 'live' ? broker.label : `${broker.label} (Coming Soon)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={setupFilter} onValueChange={setSetupFilter}>
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.06] text-white">
                <SelectValue placeholder="Setup" />
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

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.06] text-white">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tagOptions.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {formatBaseAmount(currentAccountBalance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Capital Base: {formatBaseAmount(investedCapital)}</p>
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
              {formatBaseAmount(filteredSummary.totalPnL)}
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
              {filteredTrades.length} trades, avg {formatBaseAmount(filteredSummary.avgTrade)} per trade
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
                <p className="text-xl font-bold text-foreground">{formatBaseAmount(balanceMilestones.peakBalance)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xl font-bold text-red-400">{formatBaseAmount(balanceMilestones.maxDrawdown)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Charges</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xl font-bold text-orange-400">{formatBaseAmount(filteredSummary.totalCharges)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Net Capital Change</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-xl font-bold ${balanceMilestones.netCapitalAdjustments >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatBaseAmount(balanceMilestones.netCapitalAdjustments)}
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
                  {topSetups.best ? formatBaseAmount(topSetups.best.pnl) : 'No setup data'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="flex h-full flex-col bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Quick Stats</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Fast read on winners, losers, streaks, risk profile, and open positions
                </CardDescription>
              </CardHeader>
              <CardContent className="grid flex-1 grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-4 sm:p-6 sm:pt-0">
                {quickStatsCards.map((item) => (
                  <div key={item.label} className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-border bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <p className={`mt-2 text-lg font-semibold ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Recent Trades</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Latest trades inside the current filter selection
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0 sm:p-6 sm:pt-0">
                {recentTrades.map((trade) => {
                  const pnl = getTradeBasePnL(trade);
                  return (
                    <div key={trade.id} className="flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border border-border bg-background/50 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{trade.symbol}</p>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">
                            {trade.position}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {trade.date} • {trade.setupName || 'No setup'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatBaseAmount(pnl)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{trade.quantity} qty</p>
                      </div>
                    </div>
                  );
                })}
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
                <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.36} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 10" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                  <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                  <Tooltip
                    content={<AnalyticsTooltip formatter={(value) => formatBaseAmount(value)} />}
                  />
                  <Area type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={3} fill="url(#equityFill)" />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--color-primary)', stroke: 'var(--color-background)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <Card className="flex h-full flex-col bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Win/Loss Distribution</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Outcome split for the current view</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 items-center p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={290} minHeight={240}>
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={4}
                      labelLine={false}
                      dataKey="value"
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-semibold">
                      Outcomes
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[12px]">
                      {outcomeTotal} trades
                    </text>
                    <Tooltip content={<AnalyticsTooltip formatter={(value) => `${value}`} />} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Long vs Short</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Position mix for the current filtered trades</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-3 sm:p-6">
                <div className="flex flex-1 items-center">
                  <ResponsiveContainer width="100%" height={290} minHeight={240}>
                    <PieChart>
                      <Pie
                        data={longShortData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={86}
                        paddingAngle={4}
                        labelLine={false}
                        dataKey="value"
                      >
                        {longShortData.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-semibold">
                        Positions
                      </text>
                      <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[12px]">
                        {longShortData.reduce((sum, item) => sum + item.value, 0)} trades
                      </text>
                      <Tooltip content={<AnalyticsTooltip formatter={(value) => `${value}`} />} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {longShortData.map((item) => (
                    <div key={item.name} className="flex min-h-[88px] flex-col justify-between rounded-2xl border border-border bg-background/50 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.name}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{item.value} trades</p>
                      <p className={`mt-1 text-xs font-medium ${item.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatBaseAmount(item.pnl)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Broker Comparison</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manual and broker-synced performance inside the current date range</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 items-center p-3 sm:p-6">
                {brokerPerformanceData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No broker data available for this view.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={290} minHeight={240}>
                    <BarChart data={brokerPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <defs>
                        <linearGradient id="brokerBar" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 10" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <Tooltip
                        content={<AnalyticsTooltip formatter={(value) => formatBaseAmount(value)} />}
                      />
                      <Bar dataKey="pnl" fill="url(#brokerBar)" radius={[12, 12, 4, 4]} />
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
                    <CartesianGrid strokeDasharray="2 10" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      content={<AnalyticsTooltip formatter={(value) => formatBaseAmount(value)} />}
                    />
                    <Bar dataKey="pnl" radius={[12, 12, 4, 4]}>
                      {setupPerformanceData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.pnl >= 0 ? POSITIVE_CHART : NEGATIVE_CHART}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Day-wise Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">See which weekdays are helping or hurting performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Best Day</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-400">
                      {dayPerformanceData.length > 0
                        ? dayPerformanceData.reduce((best, item) => (item.pnl > best.pnl ? item : best)).day
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Worst Day</p>
                    <p className="mt-2 text-sm font-semibold text-red-400">
                      {dayPerformanceData.length > 0
                        ? dayPerformanceData.reduce((worst, item) => (item.pnl < worst.pnl ? item : worst)).day
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Active Days</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{dayPerformanceData.length}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260} minHeight={220}>
                  <BarChart data={dayPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="2 10" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      content={<AnalyticsTooltip formatter={(value) => formatBaseAmount(value)} />}
                    />
                    <Bar dataKey="pnl" radius={[12, 12, 4, 4]}>
                      {dayPerformanceData.map((entry) => (
                        <Cell
                          key={entry.day}
                          fill={entry.pnl >= 0 ? POSITIVE_CHART : NEGATIVE_CHART}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {tagPerformanceData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Tag Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Review which tags perform best inside the current filtered view
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {tagPerformanceData.slice(0, 6).map((item) => (
                    <div key={item.tag} className="rounded-xl border border-border bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tag</p>
                          <p className="mt-1 text-base font-semibold text-foreground break-words">#{item.tag}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${item.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {item.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="mt-1 font-semibold text-foreground">{item.trades}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net P&L</p>
                          <p className={`mt-1 font-semibold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatBaseAmount(item.pnl)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                          {formatBaseAmount(row.capitalChange)}
                        </td>
                        <td className={`px-4 py-3 font-medium ${row.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatBaseAmount(row.pnl)}
                        </td>
                        <td className="px-4 py-3 text-orange-400">{formatBaseAmount(row.charges)}</td>
                        <td className="px-4 py-3 text-foreground">{formatBaseAmount(row.endingBalance)}</td>
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
