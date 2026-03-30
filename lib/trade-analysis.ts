/**
 * Trade Analysis Engine
 * Compare similar trades and identify patterns
 */

import { Trade } from '@/lib/types';
import { calculatePnL, calculateRFactor } from '@/lib/trade-utils';

export interface TradePattern {
  setupName: string;
  count: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  avgRFactor: number;
  bestTrade: number;
  worstTrade: number;
  consistency: number; // Standard deviation
}

export interface TradeComparison {
  trade1: Trade;
  trade2: Trade;
  similarities: string[];
  differences: string[];
  outcome: string;
}

/**
 * Analyze trades by setup
 */
export function analyzeBySetup(trades: Trade[]): TradePattern[] {
  const setupGroups: Record<string, Trade[]> = {};

  trades.forEach((trade) => {
    if (!setupGroups[trade.setupName]) {
      setupGroups[trade.setupName] = [];
    }
    setupGroups[trade.setupName].push(trade);
  });

  return Object.entries(setupGroups)
    .map(([setupName, setupTrades]) => {
      const pnls = setupTrades.map(calculatePnL);
      const rFactors = setupTrades.map(calculateRFactor);
      const winningTrades = pnls.filter((p) => p > 0).length;

      // Calculate standard deviation
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
      const variance = pnls.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / pnls.length;
      const consistency = Math.sqrt(variance);

      return {
        setupName,
        count: setupTrades.length,
        totalPnL: pnls.reduce((a, b) => a + b, 0),
        avgPnL: pnls.reduce((a, b) => a + b, 0) / pnls.length,
        winRate: (winningTrades / setupTrades.length) * 100,
        avgRFactor: rFactors.reduce((a, b) => a + b, 0) / rFactors.length,
        bestTrade: Math.max(...pnls),
        worstTrade: Math.min(...pnls),
        consistency,
      };
    })
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

/**
 * Find similar trades
 */
export function findSimilarTrades(
  targetTrade: Trade,
  allTrades: Trade[],
  threshold: number = 80
): Trade[] {
  return allTrades
    .filter((t) => t.id !== targetTrade.id && t.setupName === targetTrade.setupName)
    .sort((a, b) => {
      const aSimilarity = calculateTradeSimilarity(targetTrade, a);
      const bSimilarity = calculateTradeSimilarity(targetTrade, b);
      return bSimilarity - aSimilarity;
    })
    .filter((t) => calculateTradeSimilarity(targetTrade, t) >= threshold);
}

/**
 * Calculate similarity between two trades (0-100)
 */
export function calculateTradeSimilarity(trade1: Trade, trade2: Trade): number {
  let similarity = 0;

  // Setup match (40 points)
  if (trade1.setupName === trade2.setupName) {
    similarity += 40;
  }

  // Symbol match (20 points)
  if (trade1.symbol === trade2.symbol) {
    similarity += 20;
  }

  // Entry/Exit price proximity (20 points)
  const priceDiffPercent = Math.abs(trade1.entryPrice - trade2.entryPrice) / trade1.entryPrice;
  if (priceDiffPercent < 0.01) {
    similarity += 20;
  } else if (priceDiffPercent < 0.05) {
    similarity += 15;
  } else if (priceDiffPercent < 0.1) {
    similarity += 10;
  }

  // Risk-Reward similarity (20 points)
  const rr1 = Math.abs(trade1.exitPrice - trade1.entryPrice) / (trade1.stopLossPrice - trade1.entryPrice);
  const rr2 = Math.abs(trade2.exitPrice - trade2.entryPrice) / (trade2.stopLossPrice - trade2.entryPrice);
  const rrDiff = Math.abs(rr1 - rr2);
  if (rrDiff < 0.5) {
    similarity += 20;
  } else if (rrDiff < 1) {
    similarity += 10;
  }

  return Math.min(similarity, 100);
}

/**
 * Compare two trades
 */
export function compareTrades(trade1: Trade, trade2: Trade): TradeComparison {
  const similarities: string[] = [];
  const differences: string[] = [];

  if (trade1.setupName === trade2.setupName) {
    similarities.push(`Same setup: ${trade1.setupName}`);
  } else {
    differences.push(`Different setups: ${trade1.setupName} vs ${trade2.setupName}`);
  }

  if (trade1.symbol === trade2.symbol) {
    similarities.push(`Same symbol: ${trade1.symbol}`);
  } else {
    differences.push(`Different symbols: ${trade1.symbol} vs ${trade2.symbol}`);
  }

  const priceDiff = Math.abs(trade1.entryPrice - trade2.entryPrice);
  if (priceDiff < 1) {
    similarities.push(`Similar entry price: $${trade1.entryPrice.toFixed(2)} vs $${trade2.entryPrice.toFixed(2)}`);
  } else {
    differences.push(`Different entry price: $${trade1.entryPrice.toFixed(2)} vs $${trade2.entryPrice.toFixed(2)}`);
  }

  const pnl1 = calculatePnL(trade1);
  const pnl2 = calculatePnL(trade2);
  if ((pnl1 > 0 && pnl2 > 0) || (pnl1 < 0 && pnl2 < 0)) {
    similarities.push(`Both ${pnl1 > 0 ? 'winning' : 'losing'} trades`);
  } else {
    differences.push(`Different outcome: Trade 1 ${pnl1 > 0 ? 'won' : 'lost'}, Trade 2 ${pnl2 > 0 ? 'won' : 'lost'}`);
  }

  const outcome = pnl1 > pnl2 
    ? `Trade 1 performed better (+$${(pnl1 - pnl2).toFixed(2)})`
    : pnl2 > pnl1
    ? `Trade 2 performed better (+$${(pnl2 - pnl1).toFixed(2)})`
    : 'Both trades had same outcome';

  return {
    trade1,
    trade2,
    similarities,
    differences,
    outcome,
  };
}

/**
 * Get trading insights
 */
export function getTradeInsights(trades: Trade[]): string[] {
  const insights: string[] = [];
  const patterns = analyzeBySetup(trades);

  // Best setup
  const bestSetup = patterns[0];
  if (bestSetup) {
    insights.push(
      `Your best setup is "${bestSetup.setupName}" with ${bestSetup.winRate.toFixed(1)}% win rate on ${bestSetup.count} trades`
    );
  }

  // Consistency
  const consistentSetups = patterns.filter((p) => p.consistency < 100 && p.count >= 5);
  if (consistentSetups.length > 0) {
    insights.push(
      `Your most consistent setup is "${consistentSetups[0].setupName}" with $${consistentSetups[0].consistency.toFixed(2)} standard deviation`
    );
  }

  // Win rate trend
  const recentTrades = trades.slice(-10);
  const recentWinRate = (recentTrades.filter((t) => calculatePnL(t) > 0).length / recentTrades.length) * 100;
  const overallWinRate = (trades.filter((t) => calculatePnL(t) > 0).length / trades.length) * 100;
  
  if (recentWinRate > overallWinRate + 10) {
    insights.push(`Great momentum! Recent win rate (${recentWinRate.toFixed(1)}%) is above average`);
  } else if (recentWinRate < overallWinRate - 10) {
    insights.push(`Win rate has declined recently. Review your recent trades for patterns`);
  }

  // Best performing setup by total PnL
  const topPerformer = patterns.find((p) => p.totalPnL === Math.max(...patterns.map((x) => x.totalPnL)));
  if (topPerformer && topPerformer.totalPnL > 0) {
    insights.push(`"${topPerformer.setupName}" is your most profitable setup: $${topPerformer.totalPnL.toFixed(2)} total`);
  }

  return insights;
}
