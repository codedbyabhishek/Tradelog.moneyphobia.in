/**
 * Performance Analytics Engine
 * Computes advanced trading metrics and performance analysis.
 *
 * NOTE:
 * - Uses stored P&L / base-currency P&L from `Trade` instead of
 *   recomputing ad-hoc to keep calculations consistent with the
 *   rest of the analytics layer.
 */

import { Trade } from '@/lib/types';
import { getTradeBasePnL } from '@/lib/trade-utils';
import { format, startOfWeek } from 'date-fns';

export interface PerformanceMetrics {
  weeklyPnL: Record<string, number>;
  monthlyPnL: Record<string, number>;
  equityCurve: Array<{ date: string; equity: number }>;
  drawdownCurve: Array<{ date: string; drawdown: number; equity: number; peak: number }>;
  drawdownStats: {
    maxDrawdown: number;
    currentDrawdown: number;
    maxDrawdownPct: number;
    currentDrawdownPct: number;
    longestDrawdownStreak: number;
  };
  streakStats: {
    currentWinStreak: number;
    currentLossStreak: number;
    maxWinStreak: number;
    maxLossStreak: number;
    currentOutcome: 'win' | 'loss' | 'breakeven' | 'none';
  };
  bestTradingHours: Record<string, number>;
  bestTradingDays: Record<string, number>;
  symbolPerformance: Array<{ symbol: string; pnl: number; trades: number; winRate: number }>;
  monthlyReturnTargets: Array<{ month: string; target: number; actual: number; percentage: number }>;
  monthlyWinRate: Record<string, number>;
  averageTradeSize: Record<string, number>;
}

/**
 * Calculate weekly profit/loss
 */
export function calculateWeeklyPnL(trades: Trade[]): Record<string, number> {
  const weeklyPnL: Record<string, number> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const weekStart = startOfWeek(date);
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Use base-currency P&L to avoid mixing currencies
    weeklyPnL[weekKey] = (weeklyPnL[weekKey] || 0) + getTradeBasePnL(trade);
  });
  
  return Object.fromEntries(
    Object.entries(weeklyPnL)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-12) // Last 12 weeks
  );
}

/**
 * Calculate monthly profit/loss
 */
export function calculateMonthlyPnL(trades: Trade[]): Record<string, number> {
  const monthlyPnL: Record<string, number> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const monthKey = format(date, 'yyyy-MM');
    
    monthlyPnL[monthKey] = (monthlyPnL[monthKey] || 0) + getTradeBasePnL(trade);
  });
  
  return Object.fromEntries(
    Object.entries(monthlyPnL)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
  );
}

/**
 * Build equity curve (cum P&L over time)
 */
export function calculateEquityCurve(trades: Trade[]): Array<{ date: string; equity: number }> {
  const sorted = [...trades].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const curve: Array<{ date: string; equity: number }> = [];
  let cumulativePnL = 0;
  
  sorted.forEach((trade) => {
    cumulativePnL += getTradeBasePnL(trade);
    curve.push({
      date: format(new Date(trade.date), 'yyyy-MM-dd'),
      equity: cumulativePnL
    });
  });
  
  return curve;
}

/**
 * Calculate drawdown curve and headline drawdown stats
 */
export function calculateDrawdownMetrics(trades: Trade[]): {
  drawdownCurve: Array<{ date: string; drawdown: number; equity: number; peak: number }>;
  drawdownStats: {
    maxDrawdown: number;
    currentDrawdown: number;
    maxDrawdownPct: number;
    currentDrawdownPct: number;
    longestDrawdownStreak: number;
  };
} {
  const equityCurve = calculateEquityCurve(trades);
  const drawdownCurve: Array<{ date: string; drawdown: number; equity: number; peak: number }> = [];

  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let currentStreak = 0;
  let longestDrawdownStreak = 0;

  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    const drawdown = Math.max(0, peak - point.equity);
    const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;

    if (drawdown > 0) {
      currentStreak += 1;
      longestDrawdownStreak = Math.max(longestDrawdownStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    maxDrawdown = Math.max(maxDrawdown, drawdown);
    maxDrawdownPct = Math.max(maxDrawdownPct, drawdownPct);

    drawdownCurve.push({
      date: point.date,
      drawdown: parseFloat(drawdown.toFixed(2)),
      equity: point.equity,
      peak: parseFloat(peak.toFixed(2)),
    });
  }

  const lastPoint = drawdownCurve.at(-1);
  const currentDrawdown = lastPoint?.drawdown ?? 0;
  const currentDrawdownPct = lastPoint && lastPoint.peak > 0
    ? (currentDrawdown / lastPoint.peak) * 100
    : 0;

  return {
    drawdownCurve,
    drawdownStats: {
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      currentDrawdown: parseFloat(currentDrawdown.toFixed(2)),
      maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(1)),
      currentDrawdownPct: parseFloat(currentDrawdownPct.toFixed(1)),
      longestDrawdownStreak,
    },
  };
}

/**
 * Calculate consecutive win/loss streaks
 */
export function calculateStreakStats(trades: Trade[]): {
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentOutcome: 'win' | 'loss' | 'breakeven' | 'none';
} {
  const sorted = [...trades].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let runningWinStreak = 0;
  let runningLossStreak = 0;
  let currentOutcome: 'win' | 'loss' | 'breakeven' | 'none' = 'none';

  for (const trade of sorted) {
    const pnl = getTradeBasePnL(trade);

    if (pnl > 0) {
      runningWinStreak += 1;
      runningLossStreak = 0;
      currentOutcome = 'win';
    } else if (pnl < 0) {
      runningLossStreak += 1;
      runningWinStreak = 0;
      currentOutcome = 'loss';
    } else {
      runningWinStreak = 0;
      runningLossStreak = 0;
      currentOutcome = 'breakeven';
    }

    maxWinStreak = Math.max(maxWinStreak, runningWinStreak);
    maxLossStreak = Math.max(maxLossStreak, runningLossStreak);
  }

  if (currentOutcome === 'win') {
    currentWinStreak = runningWinStreak;
  } else if (currentOutcome === 'loss') {
    currentLossStreak = runningLossStreak;
  }

  return {
    currentWinStreak,
    currentLossStreak,
    maxWinStreak,
    maxLossStreak,
    currentOutcome,
  };
}

/**
 * Find best trading hours
 */
export function calculateBestTradingHours(trades: Trade[]): Record<string, number> {
  const hourPnL: Record<string, number> = {};
  const hourCounts: Record<string, number> = {};
  
  trades.forEach((trade) => {
    // If we have an explicit entryTime, prefer that for hour bucketing.
    let hour: number;
    if (trade.entryTime) {
      hour = parseInt(trade.entryTime.split(':')[0], 10);
    } else {
      const date = new Date(trade.date);
      hour = date.getHours();
    }
    const hourKey = `${hour}:00`;
    
    hourPnL[hourKey] = (hourPnL[hourKey] || 0) + getTradeBasePnL(trade);
    hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
  });
  
  // Return average P&L per hour
  return Object.fromEntries(
    Object.entries(hourPnL).map(([hour, pnl]) => [
      hour,
      pnl / (hourCounts[hour] || 1)
    ])
  );
}

/**
 * Find best trading days
 */
export function calculateBestTradingDays(trades: Trade[]): Record<string, number> {
  const dayPnL: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const dayName = dayNames[date.getDay()];
    
    dayPnL[dayName] = (dayPnL[dayName] || 0) + getTradeBasePnL(trade);
  });
  
  return dayPnL;
}

/**
 * Calculate performance by symbol
 */
export function calculateSymbolPerformance(
  trades: Trade[]
): Array<{ symbol: string; pnl: number; trades: number; winRate: number }> {
  const symbolStats: Record<string, { pnl: number; trades: number; wins: number }> = {};

  trades.forEach((trade) => {
    const symbol = trade.symbol?.trim().toUpperCase();
    if (!symbol) return;

    if (!symbolStats[symbol]) {
      symbolStats[symbol] = { pnl: 0, trades: 0, wins: 0 };
    }

    const pnl = getTradeBasePnL(trade);
    symbolStats[symbol].pnl += pnl;
    symbolStats[symbol].trades += 1;
    if (pnl > 0) {
      symbolStats[symbol].wins += 1;
    }
  });

  return Object.entries(symbolStats)
    .map(([symbol, stats]) => ({
      symbol,
      pnl: stats.pnl,
      trades: stats.trades,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.pnl !== a.pnl) {
        return b.pnl - a.pnl;
      }

      return b.trades - a.trades;
    });
}

/**
 * Calculate monthly return targets progress
 */
export function calculateMonthlyReturnTargets(
  trades: Trade[],
  monthlyTargets: Record<string, number> = {}
): Array<{ month: string; target: number; actual: number; percentage: number }> {
  const monthlyPnL = calculateMonthlyPnL(trades);
  
  return Object.entries(monthlyPnL).map(([month, actual]) => {
    const target = monthlyTargets[month] || 1000;
    return {
      month,
      target,
      actual,
      percentage: (actual / target) * 100
    };
  });
}

/**
 * Calculate win rate by month
 */
export function calculateMonthlyWinRate(trades: Trade[]): Record<string, number> {
  const monthStats: Record<string, { wins: number; total: number }> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!monthStats[monthKey]) {
      monthStats[monthKey] = { wins: 0, total: 0 };
    }
    
    monthStats[monthKey].total++;
    if (getTradeBasePnL(trade) > 0) {
      monthStats[monthKey].wins++;
    }
  });
  
  return Object.fromEntries(
    Object.entries(monthStats).map(([month, stats]) => [
      month,
      (stats.wins / stats.total) * 100
    ])
  );
}

/**
 * Calculate average trade size by month
 */
export function calculateAverageTradeSize(trades: Trade[]): Record<string, number> {
  const monthStats: Record<string, { total: number; count: number }> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!monthStats[monthKey]) {
      monthStats[monthKey] = { total: 0, count: 0 };
    }
    
    // Use base-currency magnitude so averages aren't skewed by mixed currencies
    monthStats[monthKey].total += Math.abs(getTradeBasePnL(trade));
    monthStats[monthKey].count++;
  });
  
  return Object.fromEntries(
    Object.entries(monthStats).map(([month, stats]) => [
      month,
      stats.total / stats.count
    ])
  );
}

/**
 * Generate all performance metrics
 */
export function generatePerformanceMetrics(trades: Trade[]): PerformanceMetrics {
  const { drawdownCurve, drawdownStats } = calculateDrawdownMetrics(trades);

  return {
    weeklyPnL: calculateWeeklyPnL(trades),
    monthlyPnL: calculateMonthlyPnL(trades),
    equityCurve: calculateEquityCurve(trades),
    drawdownCurve,
    drawdownStats,
    streakStats: calculateStreakStats(trades),
    bestTradingHours: calculateBestTradingHours(trades),
    bestTradingDays: calculateBestTradingDays(trades),
    symbolPerformance: calculateSymbolPerformance(trades),
    monthlyReturnTargets: calculateMonthlyReturnTargets(trades),
    monthlyWinRate: calculateMonthlyWinRate(trades),
    averageTradeSize: calculateAverageTradeSize(trades),
  };
}
