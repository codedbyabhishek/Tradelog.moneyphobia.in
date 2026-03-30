'use client';

import { useMemo } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade } from '@/lib/types';
import { getTradeBasePnL, getTradeCharges, CURRENCY_SYMBOLS, BASE_CURRENCY, getEquityCurveInBaseCurrency, formatCurrency, convertToBaseCurrency } from '@/lib/trade-utils';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function Analytics() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();

  // Equity curve data - use base currency P&L for multi-currency accounts
  const equityCurveData = useMemo(() => {
    return getEquityCurveInBaseCurrency(trades, baseCurrency);
  }, [trades, baseCurrency]);

  // Base currency symbol for display
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];

  // Win vs Loss data - derived from P&L, not deprecated isWin field
  const winLossData = useMemo(() => {
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const breakeven = trades.filter(t => t.pnl === 0).length;
    return [
      { name: 'Wins', value: wins },
      { name: 'Losses', value: losses },
      ...(breakeven > 0 ? [{ name: 'Break-Even', value: breakeven }] : []),
    ];
  }, [trades]);

  // Setup performance data - use base currency P&L
  const setupPerformanceData = useMemo(() => {
    const setupMap = new Map<string, { pnl: number; trades: number }>();
    trades.forEach(trade => {
      const existing = setupMap.get(trade.setupName) || { pnl: 0, trades: 0 };
      setupMap.set(trade.setupName, {
        pnl: existing.pnl + getTradeBasePnL(trade),
        trades: existing.trades + 1,
      });
    });

    return Array.from(setupMap.entries()).map(([name, data]) => ({
      name: name.length > 15 ? name.slice(0, 12) + '...' : name,
      pnl: parseFloat(data.pnl.toFixed(2)),
      trades: data.trades,
    }));
  }, [trades]);

  // Day-wise performance - use base currency P&L
  const dayPerformanceData = useMemo(() => {
    const dayMap = new Map<string, number>();
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    trades.forEach(trade => {
      const existing = dayMap.get(trade.dayOfWeek) || 0;
      dayMap.set(trade.dayOfWeek, existing + getTradeBasePnL(trade));
    });

    return dayOrder
      .filter(day => dayMap.has(day))
      .map(day => ({
        day: day.slice(0, 3),
        pnl: parseFloat((dayMap.get(day) || 0).toFixed(2)),
      }));
  }, [trades]);

  // R-Factor distribution
  const rFactorData = useMemo(() => {
    const buckets = {
      'Negative': 0,
      '0-1R': 0,
      '1-2R': 0,
      '2-3R': 0,
      '+3R': 0,
    };

    trades.forEach(trade => {
      if (trade.rFactor < 0) buckets['Negative']++;
      else if (trade.rFactor < 1) buckets['0-1R']++;
      else if (trade.rFactor < 2) buckets['1-2R']++;
      else if (trade.rFactor < 3) buckets['2-3R']++;
      else buckets['+3R']++;
    });

    return Object.entries(buckets).map(([name, value]) => ({
      name,
      value,
    }));
  }, [trades]);

  // Confidence vs P&L - grouped by confidence level with stats
  const confidenceData = useMemo(() => {
    const buckets = new Map<number, { totalPnl: number; wins: number; losses: number; count: number; trades: { pnl: number; name: string }[] }>();

    // Initialize all levels 1-10
    for (let i = 1; i <= 10; i++) {
      buckets.set(i, { totalPnl: 0, wins: 0, losses: 0, count: 0, trades: [] });
    }

    trades.forEach(trade => {
      const level = trade.confidence;
      const pnl = getTradeBasePnL(trade);
      const bucket = buckets.get(level);
      if (bucket) {
        bucket.totalPnl += pnl;
        bucket.count += 1;
        if (pnl > 0) bucket.wins += 1;
        else if (pnl < 0) bucket.losses += 1;
        bucket.trades.push({ pnl, name: `${trade.symbol} - ${trade.date}` });
      }
    });

    const chartData = Array.from(buckets.entries())
      .filter(([, data]) => data.count > 0)
      .map(([level, data]) => ({
        level: `${level}`,
        avgPnl: parseFloat((data.totalPnl / data.count).toFixed(2)),
        totalPnl: parseFloat(data.totalPnl.toFixed(2)),
        winRate: parseFloat(((data.wins / data.count) * 100).toFixed(1)),
        trades: data.count,
        wins: data.wins,
        losses: data.losses,
      }));

    // Find best and worst confidence levels
    const best = chartData.length > 0 ? chartData.reduce((a, b) => a.avgPnl > b.avgPnl ? a : b) : null;
    const worst = chartData.length > 0 ? chartData.reduce((a, b) => a.avgPnl < b.avgPnl ? a : b) : null;

    // High vs low confidence comparison
    const highConf = trades.filter(t => t.confidence >= 7);
    const lowConf = trades.filter(t => t.confidence <= 4);
    const highAvg = highConf.length > 0 ? highConf.reduce((s, t) => s + getTradeBasePnL(t), 0) / highConf.length : 0;
    const lowAvg = lowConf.length > 0 ? lowConf.reduce((s, t) => s + getTradeBasePnL(t), 0) / lowConf.length : 0;
    const highWinRate = highConf.length > 0 ? (highConf.filter(t => getTradeBasePnL(t) > 0).length / highConf.length) * 100 : 0;
    const lowWinRate = lowConf.length > 0 ? (lowConf.filter(t => getTradeBasePnL(t) > 0).length / lowConf.length) * 100 : 0;

    return {
      chartData,
      best,
      worst,
      highConf: { count: highConf.length, avgPnl: parseFloat(highAvg.toFixed(2)), winRate: parseFloat(highWinRate.toFixed(1)) },
      lowConf: { count: lowConf.length, avgPnl: parseFloat(lowAvg.toFixed(2)), winRate: parseFloat(lowWinRate.toFixed(1)) },
    };
  }, [trades]);

  // Drawdown curve - use base currency P&L
  const drawdownData = useMemo(() => {
    let cumulativePnL = 0;
    let runningMax = 0;
    const data = [];

    trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(trade => {
      cumulativePnL += getTradeBasePnL(trade);
      if (cumulativePnL > runningMax) {
        runningMax = cumulativePnL;
      }
      const drawdown = runningMax - cumulativePnL;
      data.push({
        date: trade.date,
        drawdown: parseFloat(drawdown.toFixed(2)),
        balance: parseFloat(cumulativePnL.toFixed(2)),
      });
    });

    return data;
  }, [trades]);

  // Profit vs Loss comparison - use base currency P&L
  const profitLossData = useMemo(() => {
    const profitTrades = trades.filter(t => getTradeBasePnL(t) > 0);
    const lossTrades = trades.filter(t => getTradeBasePnL(t) < 0);

    const totalProfit = profitTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const totalLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0));
    const avgProfit = profitTrades.length > 0 ? totalProfit / profitTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? totalLoss / lossTrades.length : 0;

    return [
      { name: 'Avg Profit Trade', value: parseFloat(avgProfit.toFixed(2)), trades: profitTrades.length },
      { name: 'Avg Loss Trade', value: parseFloat(avgLoss.toFixed(2)), trades: lossTrades.length },
    ];
  }, [trades]);

  // Risk-Reward Ratio data - use base currency P&L
  const riskRewardData = useMemo(() => {
    const profitTrades = trades.filter(t => getTradeBasePnL(t) > 0);
    const lossTrades = trades.filter(t => getTradeBasePnL(t) <= 0);

    const totalProfit = profitTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const totalLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0));

    const riskRewardRatio = totalLoss !== 0 ? totalProfit / totalLoss : 0;
    const profitFactor = totalLoss !== 0 ? totalProfit / (totalLoss || 1) : 0;
    const avgRFactor = trades.length > 0 ? trades.reduce((sum, t) => sum + t.rFactor, 0) / trades.length : 0;

    return {
      riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      avgRFactor: parseFloat(avgRFactor.toFixed(2)),
      bestRFactor: trades.length > 0 ? parseFloat(Math.max(...trades.map(t => t.rFactor)).toFixed(2)) : 0,
    };
  }, [trades]);

  // Win Rate by Setup
  const setupWinRateData = useMemo(() => {
    const setupStats = new Map<string, { wins: number; total: number }>();

    trades.forEach(trade => {
      const existing = setupStats.get(trade.setupName) || { wins: 0, total: 0 };
      setupStats.set(trade.setupName, {
        wins: existing.wins + (trade.pnl > 0 ? 1 : 0),
        total: existing.total + 1,
      });
    });

    return Array.from(setupStats.entries())
      .map(([name, data]) => ({
        name: name.length > 15 ? name.slice(0, 12) + '...' : name,
        winRate: parseFloat(((data.wins / data.total) * 100).toFixed(1)),
        trades: data.total,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

  // Brokerage / charges analytics
  const brokerageData = useMemo(() => {
    const totalBrokerage = trades.reduce((sum, t) => {
      const charges = getTradeCharges(t);
      const baseCharges = t.currency ? convertToBaseCurrency(charges, t.currency, t.exchangeRate) : charges;
      return sum + baseCharges;
    }, 0);

    const totalNetPnL = trades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const totalGrossPnL = totalNetPnL + totalBrokerage;

    // Brokerage by month
    const monthlyBrokerage = new Map<string, { month: string; brokerage: number; trades: number }>();
    trades.forEach(trade => {
      const date = new Date(trade.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthDisplay = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const charges = getTradeCharges(trade);
      const baseCharges = trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges;
      const existing = monthlyBrokerage.get(key) || { month: monthDisplay, brokerage: 0, trades: 0 };
      existing.brokerage += baseCharges;
      existing.trades += 1;
      monthlyBrokerage.set(key, existing);
    });

    const monthlyData = Array.from(monthlyBrokerage.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => ({
        month: data.month,
        brokerage: parseFloat(data.brokerage.toFixed(2)),
        trades: data.trades,
      }));

    const avgBrokeragePerTrade = trades.length > 0 ? totalBrokerage / trades.length : 0;
    const brokerageAsPercentOfGross = totalGrossPnL !== 0 ? (totalBrokerage / Math.abs(totalGrossPnL)) * 100 : 0;

    return {
      totalBrokerage: parseFloat(totalBrokerage.toFixed(2)),
      totalGrossPnL: parseFloat(totalGrossPnL.toFixed(2)),
      totalNetPnL: parseFloat(totalNetPnL.toFixed(2)),
      avgBrokeragePerTrade: parseFloat(avgBrokeragePerTrade.toFixed(2)),
      brokerageAsPercentOfGross: parseFloat(brokerageAsPercentOfGross.toFixed(1)),
      monthlyData,
    };
  }, [trades]);

  // Improvement recommendations - use base currency P&L
  const improvements = useMemo(() => {
    const recommendations = [];
    const stats = {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (trades.filter(t => getTradeBasePnL(t) > 0).length / trades.length) * 100 : 0,
      avgR: trades.length > 0 ? trades.reduce((sum, t) => sum + t.rFactor, 0) / trades.length : 0,
      totalPnL: trades.reduce((sum, t) => sum + getTradeBasePnL(t), 0),
      maxDrawdown: (() => {
        let maxDD = 0;
        let runningMax = 0;
        let cumulativePnL = 0;
        trades.forEach(t => {
          cumulativePnL += getTradeBasePnL(t);
          runningMax = Math.max(runningMax, cumulativePnL);
          maxDD = Math.max(maxDD, runningMax - cumulativePnL);
        });
        return maxDD;
      })(),
    };

    if (stats.winRate < 45) {
      recommendations.push({
        priority: 'high',
        title: 'Improve Win Rate',
        description: `Your win rate is ${stats.winRate.toFixed(1)}%. Target 50%+ by reviewing losing trades for patterns.`,
      });
    }

    if (stats.avgR < 1.5) {
      recommendations.push({
        priority: 'high',
        title: 'Better Risk-Reward',
        description: `Average R is ${stats.avgR.toFixed(2)}. Aim for 2:1 or better risk-reward ratio on entries.`,
      });
    }

    if (stats.maxDrawdown > stats.totalPnL && stats.totalPnL > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Reduce Drawdown',
        description: `Max drawdown (${stats.maxDrawdown.toFixed(2)}) exceeds profits. Consider stricter position sizing.`,
      });
    }

    if (stats.winRate >= 50 && stats.avgR >= 1.5) {
      recommendations.push({
        priority: 'medium',
        title: 'Scale Up',
        description: 'Your metrics look solid. Consider gradually increasing position size.',
      });
    }

    if (stats.totalPnL < 0) {
      recommendations.push({
        priority: 'high',
        title: 'Review Strategy',
        description: 'You\'re in drawdown. Take a break and analyze your recent trades for setup failures.',
      });
    }

    return recommendations.length > 0 ? recommendations : [
      {
        priority: 'low',
        title: 'Keep Trading',
        description: 'You need more trades to generate meaningful insights. Keep maintaining your journal.',
      },
    ];
  }, [trades]);

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  // Main container with proper responsive padding and overflow handling
  return (
    <div className="w-full min-h-screen flex flex-col gap-3 sm:gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6 overflow-hidden">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Analytics</h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Detailed analysis of your trading performance</p>
      </div>

      {trades.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 sm:p-12 text-center">
            <p className="text-muted-foreground">No trades to analyze yet. Add trades to see analytics!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Equity Curve */}
          <Card className="bg-card border-border w-full">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl">Equity Curve</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Cumulative P&L over time</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <ResponsiveContainer width="100%" height={280} minHeight={240}>
                <LineChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                  <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-secondary)',
                      border: `1px solid var(--color-border)`,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => formatCurrency(value, baseCurrency)}
                  />
                  <Line type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full">
            {/* Win vs Loss */}
            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Win vs Loss</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Trade outcome distribution</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={220} minHeight={200}>
                  <PieChart>
                    <Pie data={winLossData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={70} fill="#8884d8" dataKey="value">
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => value} contentStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Setup Performance */}
            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Setup Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">P&L by trading setup</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={220} minHeight={200}>
                  <BarChart data={setupPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-secondary)',
                        border: `1px solid var(--color-border)`,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => formatCurrency(value, baseCurrency)}
                    />
                    <Bar dataKey="pnl" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full">
            {/* Day-wise Performance */}
            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Day-wise Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">P&L by day of week</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={220} minHeight={200}>
                  <BarChart data={dayPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-secondary)',
                        border: `1px solid var(--color-border)`,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => formatCurrency(value, baseCurrency)}
                    />
                    <Bar dataKey="pnl" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* R-Factor Distribution */}
            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">R-Factor Distribution</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Trade outcome in terms of risk reward</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={220} minHeight={200}>
                  <BarChart data={rFactorData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-secondary)',
                        border: `1px solid var(--color-border)`,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Confidence vs P&L */}
          {confidenceData.chartData.length > 0 && (
            <Card className="bg-card border-border w-full">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Confidence vs P&L</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Average P&L and win rate grouped by confidence level (1-10)</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-4">
                {/* Summary: High vs Low confidence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-secondary p-3 sm:p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">High Confidence (7-10)</p>
                    <p className={`text-lg font-bold ${confidenceData.highConf.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      Avg: {baseCurrencySymbol}{confidenceData.highConf.avgPnl.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {confidenceData.highConf.count} trades | {confidenceData.highConf.winRate}% win rate
                    </p>
                  </div>
                  <div className="bg-secondary p-3 sm:p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Low Confidence (1-4)</p>
                    <p className={`text-lg font-bold ${confidenceData.lowConf.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      Avg: {baseCurrencySymbol}{confidenceData.lowConf.avgPnl.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {confidenceData.lowConf.count} trades | {confidenceData.lowConf.winRate}% win rate
                    </p>
                  </div>
                </div>

                {/* Best / Worst confidence level */}
                {confidenceData.best && confidenceData.worst && confidenceData.chartData.length > 1 && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="px-2.5 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400">
                      Best: Level {confidenceData.best.level} ({baseCurrencySymbol}{confidenceData.best.avgPnl} avg, {confidenceData.best.trades} trades)
                    </span>
                    <span className="px-2.5 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                      Worst: Level {confidenceData.worst.level} ({baseCurrencySymbol}{confidenceData.worst.avgPnl} avg, {confidenceData.worst.trades} trades)
                    </span>
                  </div>
                )}

                {/* Bar chart: Avg P&L by confidence level */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Avg P&L per Trade by Confidence</p>
                  <ResponsiveContainer width="100%" height={240} minHeight={200}>
                    <BarChart data={confidenceData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="level"
                        stroke="var(--color-muted-foreground)"
                        style={{ fontSize: '11px' }}
                        label={{ value: 'Confidence Level', position: 'insideBottom', offset: -4, style: { fontSize: '10px', fill: 'var(--color-muted-foreground)' } }}
                      />
                      <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'avgPnl') return [`${baseCurrencySymbol}${value}`, 'Avg P&L'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Confidence: ${label}`}
                      />
                      <Bar dataKey="avgPnl" name="avgPnl" radius={[8, 8, 0, 0]}>
                        {confidenceData.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.avgPnl >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Win rate by confidence level */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Win Rate by Confidence</p>
                  <ResponsiveContainer width="100%" height={200} minHeight={180}>
                    <BarChart data={confidenceData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="level"
                        stroke="var(--color-muted-foreground)"
                        style={{ fontSize: '11px' }}
                        label={{ value: 'Confidence Level', position: 'insideBottom', offset: -4, style: { fontSize: '10px', fill: 'var(--color-muted-foreground)' } }}
                      />
                      <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => [`${value}%`, 'Win Rate']}
                        labelFormatter={(label) => `Confidence: ${label}`}
                      />
                      <Bar dataKey="winRate" name="Win Rate" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-foreground">Level</th>
                        <th className="text-right py-2 px-3 font-medium text-foreground">Trades</th>
                        <th className="text-right py-2 px-3 font-medium text-foreground">Wins</th>
                        <th className="text-right py-2 px-3 font-medium text-foreground">Win Rate</th>
                        <th className="text-right py-2 px-3 font-medium text-foreground">Avg P&L</th>
                        <th className="text-right py-2 px-3 font-medium text-foreground">Total P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {confidenceData.chartData.map((row) => (
                        <tr key={row.level} className="border-b border-border">
                          <td className="py-2 px-3 text-foreground font-medium">{row.level}</td>
                          <td className="text-right py-2 px-3 text-foreground">{row.trades}</td>
                          <td className="text-right py-2 px-3 text-foreground">{row.wins}</td>
                          <td className="text-right py-2 px-3 text-foreground">{row.winRate}%</td>
                          <td className={`text-right py-2 px-3 font-medium ${row.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {baseCurrencySymbol}{row.avgPnl.toFixed(2)}
                          </td>
                          <td className={`text-right py-2 px-3 font-medium ${row.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {baseCurrencySymbol}{row.totalPnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drawdown Curve */}
          {drawdownData.length > 0 && (
            <Card className="bg-card border-border w-full">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Drawdown Curve</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Peak-to-trough decline over time</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={280} minHeight={240}>
                  <LineChart data={drawdownData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-secondary)',
                        border: `1px solid var(--color-border)`,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => formatCurrency(value, baseCurrency)}
                    />
                    <Line type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} dot={false} name="Drawdown" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full">
            {/* Profit vs Loss */}
            {profitLossData.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Avg Profit vs Loss</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Average win vs average loss</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <ResponsiveContainer width="100%" height={220} minHeight={200}>
                    <BarChart data={profitLossData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-secondary)',
                          border: `1px solid var(--color-border)`,
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => formatCurrency(value, baseCurrency)}
                      />
                      <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Win Rate by Setup */}
            {setupWinRateData.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Win Rate by Setup</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Success rate for each setup</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <ResponsiveContainer width="100%" height={220} minHeight={200}>
                    <BarChart data={setupWinRateData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                      <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-secondary)',
                          border: `1px solid var(--color-border)`,
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => `${value.toFixed(1)}%`}
                      />
                      <Bar dataKey="winRate" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Risk-Reward Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full">
            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Risk-Reward Ratio</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-2">
                <div className="text-2xl sm:text-3xl font-bold text-primary">{riskRewardData.riskRewardRatio.toFixed(2)}:1</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Target: 2:1 or higher</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-2">
                <div className={`text-2xl sm:text-3xl font-bold ${riskRewardData.profitFactor >= 1.5 ? 'text-green-400' : riskRewardData.profitFactor > 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {riskRewardData.profitFactor.toFixed(2)}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Profit to Loss Ratio</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avg R-Factor</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-2">
                <div className="text-2xl sm:text-3xl font-bold text-primary">{riskRewardData.avgRFactor.toFixed(2)}R</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Average risk-reward</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Best R-Factor</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-2">
                <div className="text-2xl sm:text-3xl font-bold text-green-400">{riskRewardData.bestRFactor.toFixed(2)}R</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Best single trade</p>
              </CardContent>
            </Card>
          </div>

          {/* Brokerage Paid Section */}
          {brokerageData.totalBrokerage > 0 && (
            <Card className="bg-card border-border w-full">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Brokerage Paid</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Total brokerage and charges deducted from your P&L</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-4">
                {/* Brokerage Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-secondary p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Brokerage ({baseCurrency})</p>
                    <p className="text-lg sm:text-xl font-bold text-orange-400">
                      {baseCurrencySymbol}{brokerageData.totalBrokerage.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Avg Per Trade</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground">
                      {baseCurrencySymbol}{brokerageData.avgBrokeragePerTrade.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">% of Gross P&L</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground">
                      {brokerageData.brokerageAsPercentOfGross.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-secondary p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Gross vs Net</p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs">
                        <span className="text-muted-foreground">Gross: </span>
                        <span className={brokerageData.totalGrossPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {baseCurrencySymbol}{brokerageData.totalGrossPnL.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-xs">
                        <span className="text-muted-foreground">Net: </span>
                        <span className={brokerageData.totalNetPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {baseCurrencySymbol}{brokerageData.totalNetPnL.toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monthly Brokerage Chart */}
                {brokerageData.monthlyData.length > 1 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Monthly Brokerage</p>
                    <ResponsiveContainer width="100%" height={200} minHeight={180}>
                      <BarChart data={brokerageData.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="month" stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                        <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '10px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: any) => [`${baseCurrencySymbol}${value}`, 'Brokerage']}
                        />
                        <Bar dataKey="brokerage" fill="#f97316" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Monthly Brokerage Table */}
                {brokerageData.monthlyData.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-foreground">Month</th>
                          <th className="text-right py-2 px-3 font-medium text-foreground">Trades</th>
                          <th className="text-right py-2 px-3 font-medium text-foreground">Brokerage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brokerageData.monthlyData.map((row, idx) => (
                          <tr key={idx} className="border-b border-border">
                            <td className="py-2 px-3 text-foreground">{row.month}</td>
                            <td className="text-right py-2 px-3 text-foreground">{row.trades}</td>
                            <td className="text-right py-2 px-3 text-orange-400 font-medium">
                              {baseCurrencySymbol}{row.brokerage.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Improvement Areas */}
          <Card className="bg-card border-border w-full">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl">Improvement Areas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Actionable insights for better trading</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-3">
              {improvements.map((improvement, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-b-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    improvement.priority === 'high' ? 'bg-red-400' : improvement.priority === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}></div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{improvement.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{improvement.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-card border-border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Smart Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Best Day */}
              {dayPerformanceData.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Best Trading Day: {dayPerformanceData.reduce((a, b) => (a.pnl > b.pnl ? a : b)).day}
                    </p>
                    <p className="text-xs text-muted-foreground">You trade best on {dayPerformanceData.reduce((a, b) => (a.pnl > b.pnl ? a : b)).day}s</p>
                  </div>
                </div>
              )}

              {/* Overtrading Detection */}
              {trades.length > 20 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">High Trade Volume</p>
                    <p className="text-xs text-muted-foreground">You have {trades.length} trades. Monitor for overtrading and ensure quality over quantity.</p>
                  </div>
                </div>
              )}

              {/* Low Confidence Performance */}
              {(() => {
                const lowConfidence = trades.filter(t => t.confidence <= 3);
                const highConfidence = trades.filter(t => t.confidence >= 8);
                if (lowConfidence.length > 0 && highConfidence.length > 0) {
                  const lowWinRate = (lowConfidence.filter(t => t.pnl > 0).length / lowConfidence.length) * 100;
                  const highWinRate = (highConfidence.filter(t => t.pnl > 0).length / highConfidence.length) * 100;
                  if (lowWinRate > highWinRate) {
                    return (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-400 mt-2"></div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Low Confidence Anomaly</p>
                          <p className="text-xs text-muted-foreground">Your lower confidence trades (1-3) are performing better than high confidence trades. Review your confidence assessment.</p>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Losing Setups */}
              {(() => {
                let worstSetup = '';
                let worstPnL = 0;
                const setupMap = new Map<string, number>();
                trades.forEach(trade => {
                  const existing = setupMap.get(trade.setupName) || 0;
                  setupMap.set(trade.setupName, existing + getTradeBasePnL(trade));
                });

                for (const [setup, pnl] of setupMap) {
                  if (pnl < worstPnL) {
                    worstPnL = pnl;
                    worstSetup = setup;
                  }
                }

                if (worstSetup && worstPnL < -100) {
                  return (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Losing Setup: {worstSetup}</p>
                        <p className="text-xs text-muted-foreground">This setup has lost {baseCurrencySymbol}{Math.abs(worstPnL).toFixed(2)}. Consider reviewing or pausing this strategy.</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Consistency Insight */}
              {trades.length >= 10 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Trade Consistency</p>
                    <p className="text-xs text-muted-foreground">You have {trades.length} trades recorded. Focus on consistency and following your trading rules.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
