/**
 * Trading Analytics Engine
 * 
 * Comprehensive analytics algorithms for trade performance analysis:
 * - Expectancy Calculation
 * - R-Multiple Analytics
 * - Setup Quality Score
 * - Rule-Break Detection
 * - Session & Time-Based Performance
 * - Loss Streak & Tilt Protection
 * - Drawdown Analysis
 * - Market Condition Analysis
 */

import { Trade, MarketSession, MarketCondition, RuleViolation } from './types';
import { getTradeBasePnL, BASE_CURRENCY, CURRENCY_SYMBOLS } from './trade-utils';

// ============================================
// TYPES FOR ANALYTICS RESULTS
// ============================================

export interface ExpectancyResult {
  expectancy: number;
  expectancyR: number;
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number;
  avgWinR: number;
  avgLossR: number;
  totalTrades: number;
  interpretation: 'Profitable' | 'Break-Even' | 'Losing';
}

export interface RMultipleStats {
  averageR: number;
  maxR: number;
  minR: number;
  medianR: number;
  percentAbove2R: number;
  percentAbove3R: number;
  percentMinus1R: number;
  percentMinus2ROrWorse: number;
  totalR: number;
  rDistribution: { range: string; count: number; percentage: number }[];
}

export interface SetupQualityScore {
  setupName: string;
  score: number;
  winRate: number;
  avgR: number;
  expectancy: number;
  maxDrawdown: number;
  totalTrades: number;
  totalPnL: number;
  rank: number;
  recommendation: 'Keep' | 'Review' | 'Avoid';
}

export interface RuleBreakAnalysis {
  totalTrades: number;
  rulesFollowedCount: number;
  rulesBrokenCount: number;
  ruleFollowedRate: number;
  pnlWithRulesFollowed: number;
  pnlWithRulesBroken: number;
  avgRWithRulesFollowed: number;
  avgRWithRulesBroken: number;
  winRateWithRulesFollowed: number;
  winRateWithRulesBroken: number;
  violationBreakdown: { violation: RuleViolation; count: number; pnl: number; avgR: number }[];
}

export interface SessionPerformance {
  session: MarketSession;
  totalTrades: number;
  winRate: number;
  avgR: number;
  totalPnL: number;
  expectancy: number;
  bestSession: boolean;
  worstSession: boolean;
}

export interface TimePerformance {
  hour: number;
  displayHour: string;
  totalTrades: number;
  winRate: number;
  avgR: number;
  totalPnL: number;
}

export interface LossStreakAlert {
  currentStreak: number;
  maxStreak: number;
  dailyLossR: number;
  dailyLossLimit: number;
  isOnTilt: boolean;
  alerts: string[];
  recommendation: string;
}

export interface DrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownR: number;
  currentDrawdown: number;
  drawdownPeriods: {
    startDate: string;
    endDate: string;
    drawdownAmount: number;
    drawdownR: number;
    tradesInPeriod: number;
    recoveryTrades: number;
    causedBySetups: string[];
    causedBySessions: MarketSession[];
  }[];
  structuralWeaknesses: string[];
}

export interface MarketConditionPerformance {
  condition: MarketCondition;
  totalTrades: number;
  winRate: number;
  avgR: number;
  totalPnL: number;
  expectancy: number;
}

// ============================================
// EXPECTANCY CALCULATION
// ============================================

/**
 * Calculate trading expectancy
 * Formula: Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss)
 * 
 * @param trades - Array of trades to analyze
 * @returns ExpectancyResult with detailed breakdown
 */
export function calculateExpectancy(trades: Trade[]): ExpectancyResult {
  if (trades.length === 0) {
    return {
      expectancy: 0,
      expectancyR: 0,
      winRate: 0,
      lossRate: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinR: 0,
      avgLossR: 0,
      totalTrades: 0,
      interpretation: 'Break-Even',
    };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  const winRate = wins.length / trades.length;
  const lossRate = losses.length / trades.length;

  // Calculate averages in base currency
  const avgWin = wins.length > 0 
    ? wins.reduce((sum, t) => sum + getTradeBasePnL(t), 0) / wins.length 
    : 0;
  const avgLoss = losses.length > 0 
    ? Math.abs(losses.reduce((sum, t) => sum + getTradeBasePnL(t), 0) / losses.length)
    : 0;

  // Calculate R-based averages
  const avgWinR = wins.length > 0 
    ? wins.reduce((sum, t) => sum + t.rFactor, 0) / wins.length 
    : 0;
  const avgLossR = losses.length > 0 
    ? Math.abs(losses.reduce((sum, t) => sum + t.rFactor, 0) / losses.length)
    : 0;

  // Expectancy formulas
  const expectancy = (winRate * avgWin) - (lossRate * avgLoss);
  const expectancyR = (winRate * avgWinR) - (lossRate * avgLossR);

  let interpretation: 'Profitable' | 'Break-Even' | 'Losing' = 'Break-Even';
  if (expectancy > 0) interpretation = 'Profitable';
  else if (expectancy < 0) interpretation = 'Losing';

  return {
    expectancy: parseFloat(expectancy.toFixed(2)),
    expectancyR: parseFloat(expectancyR.toFixed(3)),
    winRate: parseFloat((winRate * 100).toFixed(2)),
    lossRate: parseFloat((lossRate * 100).toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    avgWinR: parseFloat(avgWinR.toFixed(2)),
    avgLossR: parseFloat(avgLossR.toFixed(2)),
    totalTrades: trades.length,
    interpretation,
  };
}

/**
 * Calculate expectancy grouped by a specific dimension
 */
export function calculateExpectancyBy<K extends string>(
  trades: Trade[],
  groupBy: (trade: Trade) => K | undefined
): Map<K, ExpectancyResult> {
  const groups = new Map<K, Trade[]>();
  
  for (const trade of trades) {
    const key = groupBy(trade);
    if (key === undefined) continue;
    
    const existing = groups.get(key) || [];
    existing.push(trade);
    groups.set(key, existing);
  }

  const results = new Map<K, ExpectancyResult>();
  for (const [key, groupTrades] of groups) {
    results.set(key, calculateExpectancy(groupTrades));
  }

  return results;
}

// Convenience functions for common groupings
export const calculateExpectancyBySetup = (trades: Trade[]) => 
  calculateExpectancyBy(trades, t => t.setupName);

export const calculateExpectancyBySymbol = (trades: Trade[]) => 
  calculateExpectancyBy(trades, t => t.symbol);

export const calculateExpectancyByTimeframe = (trades: Trade[]) => 
  calculateExpectancyBy(trades, t => t.timeFrame);

export const calculateExpectancyBySession = (trades: Trade[]) => 
  calculateExpectancyBy(trades, t => t.session);

// ============================================
// R-MULTIPLE ANALYTICS
// ============================================

/**
 * Calculate comprehensive R-multiple statistics
 */
export function calculateRMultipleStats(trades: Trade[]): RMultipleStats {
  if (trades.length === 0) {
    return {
      averageR: 0,
      maxR: 0,
      minR: 0,
      medianR: 0,
      percentAbove2R: 0,
      percentAbove3R: 0,
      percentMinus1R: 0,
      percentMinus2ROrWorse: 0,
      totalR: 0,
      rDistribution: [],
    };
  }

  const rValues = trades.map(t => t.rFactor).sort((a, b) => a - b);
  const totalR = rValues.reduce((sum, r) => sum + r, 0);
  const averageR = totalR / rValues.length;
  const maxR = Math.max(...rValues);
  const minR = Math.min(...rValues);
  
  // Median calculation
  const mid = Math.floor(rValues.length / 2);
  const medianR = rValues.length % 2 !== 0 
    ? rValues[mid] 
    : (rValues[mid - 1] + rValues[mid]) / 2;

  // Percentage calculations
  const above2R = trades.filter(t => t.rFactor >= 2).length;
  const above3R = trades.filter(t => t.rFactor >= 3).length;
  const minus1R = trades.filter(t => t.rFactor <= -1 && t.rFactor > -2).length;
  const minus2ROrWorse = trades.filter(t => t.rFactor <= -2).length;

  // R Distribution buckets
  const distribution = [
    { range: '< -2R', min: -Infinity, max: -2 },
    { range: '-2R to -1R', min: -2, max: -1 },
    { range: '-1R to 0', min: -1, max: 0 },
    { range: '0 to 1R', min: 0, max: 1 },
    { range: '1R to 2R', min: 1, max: 2 },
    { range: '2R to 3R', min: 2, max: 3 },
    { range: '> 3R', min: 3, max: Infinity },
  ];

  const rDistribution = distribution.map(bucket => {
    const count = trades.filter(t => 
      t.rFactor > bucket.min && t.rFactor <= bucket.max
    ).length;
    return {
      range: bucket.range,
      count,
      percentage: parseFloat(((count / trades.length) * 100).toFixed(1)),
    };
  });

  return {
    averageR: parseFloat(averageR.toFixed(2)),
    maxR: parseFloat(maxR.toFixed(2)),
    minR: parseFloat(minR.toFixed(2)),
    medianR: parseFloat(medianR.toFixed(2)),
    percentAbove2R: parseFloat(((above2R / trades.length) * 100).toFixed(1)),
    percentAbove3R: parseFloat(((above3R / trades.length) * 100).toFixed(1)),
    percentMinus1R: parseFloat(((minus1R / trades.length) * 100).toFixed(1)),
    percentMinus2ROrWorse: parseFloat(((minus2ROrWorse / trades.length) * 100).toFixed(1)),
    totalR: parseFloat(totalR.toFixed(2)),
    rDistribution,
  };
}

// ============================================
// SETUP QUALITY SCORE
// ============================================

/**
 * Calculate quality score for each setup
 * Formula: Setup Score = (Win% × Avg R) ÷ Max Drawdown Factor
 */
export function calculateSetupQualityScores(trades: Trade[]): SetupQualityScore[] {
  const setupGroups = new Map<string, Trade[]>();
  
  for (const trade of trades) {
    const existing = setupGroups.get(trade.setupName) || [];
    existing.push(trade);
    setupGroups.set(trade.setupName, existing);
  }

  const scores: SetupQualityScore[] = [];

  for (const [setupName, setupTrades] of setupGroups) {
    const expectancy = calculateExpectancy(setupTrades);
    const rStats = calculateRMultipleStats(setupTrades);
    
    // Calculate setup-specific drawdown
    let maxDrawdown = 0;
    let runningMax = 0;
    let cumulativePnL = 0;
    for (const trade of setupTrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      cumulativePnL += getTradeBasePnL(trade);
      runningMax = Math.max(runningMax, cumulativePnL);
      maxDrawdown = Math.max(maxDrawdown, runningMax - cumulativePnL);
    }

    const totalPnL = setupTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);

    // Calculate quality score
    // Higher win rate + higher avg R + lower drawdown = better score
    const drawdownFactor = maxDrawdown > 0 ? Math.max(1, maxDrawdown / 1000) : 1;
    const score = ((expectancy.winRate / 100) * rStats.averageR) / drawdownFactor;

    let recommendation: 'Keep' | 'Review' | 'Avoid' = 'Review';
    if (score > 0.5 && expectancy.expectancyR > 0) recommendation = 'Keep';
    else if (score < 0 || expectancy.expectancyR < -0.2) recommendation = 'Avoid';

    scores.push({
      setupName,
      score: parseFloat(score.toFixed(3)),
      winRate: expectancy.winRate,
      avgR: rStats.averageR,
      expectancy: expectancy.expectancyR,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      totalTrades: setupTrades.length,
      totalPnL: parseFloat(totalPnL.toFixed(2)),
      rank: 0, // Will be set after sorting
      recommendation,
    });
  }

  // Sort by score and assign ranks
  scores.sort((a, b) => b.score - a.score);
  scores.forEach((s, i) => s.rank = i + 1);

  return scores;
}

// ============================================
// RULE-BREAK DETECTION
// ============================================

/**
 * Analyze rule-following behavior and its impact on performance
 */
export function analyzeRuleBreaks(trades: Trade[]): RuleBreakAnalysis {
  const rulesFollowed = trades.filter(t => t.ruleFollowed === true);
  const rulesBroken = trades.filter(t => t.ruleFollowed === false);

  const pnlFollowed = rulesFollowed.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
  const pnlBroken = rulesBroken.reduce((sum, t) => sum + getTradeBasePnL(t), 0);

  const avgRFollowed = rulesFollowed.length > 0 
    ? rulesFollowed.reduce((sum, t) => sum + t.rFactor, 0) / rulesFollowed.length 
    : 0;
  const avgRBroken = rulesBroken.length > 0 
    ? rulesBroken.reduce((sum, t) => sum + t.rFactor, 0) / rulesBroken.length 
    : 0;

  const winRateFollowed = rulesFollowed.length > 0
    ? (rulesFollowed.filter(t => t.pnl > 0).length / rulesFollowed.length) * 100
    : 0;
  const winRateBroken = rulesBroken.length > 0
    ? (rulesBroken.filter(t => t.pnl > 0).length / rulesBroken.length) * 100
    : 0;

  // Analyze specific violations
  const violationMap = new Map<RuleViolation, { count: number; pnl: number; totalR: number }>();
  
  for (const trade of trades) {
    if (trade.ruleViolations) {
      for (const violation of trade.ruleViolations) {
        const existing = violationMap.get(violation) || { count: 0, pnl: 0, totalR: 0 };
        existing.count++;
        existing.pnl += getTradeBasePnL(trade);
        existing.totalR += trade.rFactor;
        violationMap.set(violation, existing);
      }
    }
  }

  const violationBreakdown = Array.from(violationMap.entries()).map(([violation, data]) => ({
    violation,
    count: data.count,
    pnl: parseFloat(data.pnl.toFixed(2)),
    avgR: parseFloat((data.totalR / data.count).toFixed(2)),
  })).sort((a, b) => a.pnl - b.pnl); // Sort by P&L impact (worst first)

  return {
    totalTrades: trades.length,
    rulesFollowedCount: rulesFollowed.length,
    rulesBrokenCount: rulesBroken.length,
    ruleFollowedRate: parseFloat(((rulesFollowed.length / trades.length) * 100).toFixed(1)),
    pnlWithRulesFollowed: parseFloat(pnlFollowed.toFixed(2)),
    pnlWithRulesBroken: parseFloat(pnlBroken.toFixed(2)),
    avgRWithRulesFollowed: parseFloat(avgRFollowed.toFixed(2)),
    avgRWithRulesBroken: parseFloat(avgRBroken.toFixed(2)),
    winRateWithRulesFollowed: parseFloat(winRateFollowed.toFixed(1)),
    winRateWithRulesBroken: parseFloat(winRateBroken.toFixed(1)),
    violationBreakdown,
  };
}

// ============================================
// SESSION & TIME-BASED PERFORMANCE
// ============================================

/**
 * Analyze performance by market session
 */
export function analyzeSessionPerformance(trades: Trade[]): SessionPerformance[] {
  const sessions: MarketSession[] = ['Asia', 'London', 'NewYork', 'Overlap_London_NY', 'Overlap_Asia_London', 'Off_Hours'];
  const results: SessionPerformance[] = [];

  for (const session of sessions) {
    const sessionTrades = trades.filter(t => t.session === session);
    
    if (sessionTrades.length === 0) {
      results.push({
        session,
        totalTrades: 0,
        winRate: 0,
        avgR: 0,
        totalPnL: 0,
        expectancy: 0,
        bestSession: false,
        worstSession: false,
      });
      continue;
    }

    const wins = sessionTrades.filter(t => t.pnl > 0).length;
    const totalPnL = sessionTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const avgR = sessionTrades.reduce((sum, t) => sum + t.rFactor, 0) / sessionTrades.length;
    const expectancy = calculateExpectancy(sessionTrades);

    results.push({
      session,
      totalTrades: sessionTrades.length,
      winRate: parseFloat(((wins / sessionTrades.length) * 100).toFixed(1)),
      avgR: parseFloat(avgR.toFixed(2)),
      totalPnL: parseFloat(totalPnL.toFixed(2)),
      expectancy: expectancy.expectancyR,
      bestSession: false,
      worstSession: false,
    });
  }

  // Mark best and worst sessions (only those with trades)
  const withTrades = results.filter(r => r.totalTrades > 0);
  if (withTrades.length > 0) {
    const best = withTrades.reduce((a, b) => a.expectancy > b.expectancy ? a : b);
    const worst = withTrades.reduce((a, b) => a.expectancy < b.expectancy ? a : b);
    best.bestSession = true;
    worst.worstSession = true;
  }

  return results;
}

/**
 * Analyze performance by hour of day
 */
export function analyzeTimePerformance(trades: Trade[]): TimePerformance[] {
  const hourlyStats = new Map<number, { trades: Trade[]; wins: number; totalR: number; totalPnL: number }>();

  for (const trade of trades) {
    if (!trade.entryTime) continue;
    
    const hour = parseInt(trade.entryTime.split(':')[0]);
    const existing = hourlyStats.get(hour) || { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
    existing.trades.push(trade);
    if (trade.pnl > 0) existing.wins++;
    existing.totalR += trade.rFactor;
    existing.totalPnL += getTradeBasePnL(trade);
    hourlyStats.set(hour, existing);
  }

  const results: TimePerformance[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const stats = hourlyStats.get(hour);
    if (!stats || stats.trades.length === 0) {
      results.push({
        hour,
        displayHour: `${hour.toString().padStart(2, '0')}:00`,
        totalTrades: 0,
        winRate: 0,
        avgR: 0,
        totalPnL: 0,
      });
    } else {
      results.push({
        hour,
        displayHour: `${hour.toString().padStart(2, '0')}:00`,
        totalTrades: stats.trades.length,
        winRate: parseFloat(((stats.wins / stats.trades.length) * 100).toFixed(1)),
        avgR: parseFloat((stats.totalR / stats.trades.length).toFixed(2)),
        totalPnL: parseFloat(stats.totalPnL.toFixed(2)),
      });
    }
  }

  return results;
}

// ============================================
// LOSS STREAK & TILT PROTECTION
// ============================================

/**
 * Analyze loss streaks and detect potential tilt
 * @param trades - Array of trades sorted by date
 * @param maxStreakThreshold - Alert threshold for consecutive losses (default: 3)
 * @param dailyLossLimitR - Maximum acceptable daily loss in R (default: 3)
 */
export function analyzeLossStreak(
  trades: Trade[],
  maxStreakThreshold: number = 3,
  dailyLossLimitR: number = 3
): LossStreakAlert {
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate current streak
  let currentStreak = 0;
  for (let i = sortedTrades.length - 1; i >= 0; i--) {
    if (sortedTrades[i].pnl < 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate max streak ever
  let maxStreak = 0;
  let tempStreak = 0;
  for (const trade of sortedTrades) {
    if (trade.pnl < 0) {
      tempStreak++;
      maxStreak = Math.max(maxStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Calculate today's loss in R
  const today = new Date().toISOString().split('T')[0];
  const todaysTrades = sortedTrades.filter(t => t.date === today);
  const dailyLossR = Math.abs(
    todaysTrades
      .filter(t => t.pnl < 0)
      .reduce((sum, t) => sum + t.rFactor, 0)
  );

  // Determine tilt status
  const isOnTilt = currentStreak >= maxStreakThreshold || dailyLossR >= dailyLossLimitR;

  // Generate alerts
  const alerts: string[] = [];
  if (currentStreak >= maxStreakThreshold) {
    alerts.push(`Warning: ${currentStreak} consecutive losses. Consider taking a break.`);
  }
  if (dailyLossR >= dailyLossLimitR) {
    alerts.push(`Daily loss limit reached: ${dailyLossR.toFixed(1)}R lost today.`);
  }
  if (currentStreak >= 2 && currentStreak < maxStreakThreshold) {
    alerts.push(`Caution: ${currentStreak} losses in a row. Stay disciplined.`);
  }

  // Generate recommendation
  let recommendation = 'Trading conditions normal. Continue with your plan.';
  if (isOnTilt) {
    recommendation = 'STOP TRADING. Take a break, review your trades, and return tomorrow.';
  } else if (currentStreak >= 2 || dailyLossR >= dailyLossLimitR * 0.7) {
    recommendation = 'Reduce position size or take a short break before next trade.';
  }

  return {
    currentStreak,
    maxStreak,
    dailyLossR: parseFloat(dailyLossR.toFixed(2)),
    dailyLossLimit: dailyLossLimitR,
    isOnTilt,
    alerts,
    recommendation,
  };
}

// ============================================
// DRAWDOWN ANALYSIS
// ============================================

/**
 * Comprehensive drawdown analysis
 */
export function analyzeDrawdowns(trades: Trade[]): DrawdownAnalysis {
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sortedTrades.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownR: 0,
      currentDrawdown: 0,
      drawdownPeriods: [],
      structuralWeaknesses: [],
    };
  }

  // Calculate equity curve and drawdowns
  let peak = 0;
  let peakR = 0;
  let cumulativePnL = 0;
  let cumulativeR = 0;
  let maxDrawdown = 0;
  let maxDrawdownR = 0;
  
  // Track drawdown periods
  const drawdownPeriods: DrawdownAnalysis['drawdownPeriods'] = [];
  let inDrawdown = false;
  let drawdownStart = '';
  let drawdownTrades: Trade[] = [];
  let drawdownPeak = 0;

  for (const trade of sortedTrades) {
    cumulativePnL += getTradeBasePnL(trade);
    cumulativeR += trade.rFactor;

    if (cumulativePnL > peak) {
      // New peak - end any drawdown period
      if (inDrawdown && drawdownTrades.length > 0) {
        const setups = [...new Set(drawdownTrades.map(t => t.setupName))];
        const sessions = [...new Set(drawdownTrades.map(t => t.session).filter(Boolean))] as MarketSession[];
        const drawdownAmount = drawdownPeak - Math.min(...drawdownTrades.map((_, i) => 
          drawdownTrades.slice(0, i + 1).reduce((sum, t) => sum + getTradeBasePnL(t), drawdownPeak)
        ));
        
        drawdownPeriods.push({
          startDate: drawdownStart,
          endDate: trade.date,
          drawdownAmount: parseFloat(drawdownAmount.toFixed(2)),
          drawdownR: parseFloat((drawdownTrades.reduce((sum, t) => sum + Math.min(0, t.rFactor), 0)).toFixed(2)),
          tradesInPeriod: drawdownTrades.length,
          recoveryTrades: 1, // The trade that ended the drawdown
          causedBySetups: setups,
          causedBySessions: sessions,
        });
      }
      
      peak = cumulativePnL;
      peakR = cumulativeR;
      inDrawdown = false;
      drawdownTrades = [];
    } else {
      // In drawdown
      if (!inDrawdown) {
        inDrawdown = true;
        drawdownStart = trade.date;
        drawdownPeak = peak;
      }
      drawdownTrades.push(trade);
    }

    const currentDD = peak - cumulativePnL;
    const currentDDR = peakR - cumulativeR;
    maxDrawdown = Math.max(maxDrawdown, currentDD);
    maxDrawdownR = Math.max(maxDrawdownR, Math.abs(currentDDR));
  }

  // Current drawdown
  const currentDrawdown = peak - cumulativePnL;

  // Identify structural weaknesses
  const weaknesses: string[] = [];
  
  // Analyze which setups cause most drawdowns
  const setupDrawdownImpact = new Map<string, number>();
  for (const period of drawdownPeriods) {
    for (const setup of period.causedBySetups) {
      setupDrawdownImpact.set(setup, (setupDrawdownImpact.get(setup) || 0) + period.drawdownAmount);
    }
  }
  
  const sortedSetups = [...setupDrawdownImpact.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedSetups.length > 0) {
    weaknesses.push(`Setup "${sortedSetups[0][0]}" contributed most to drawdowns`);
  }

  // Analyze session weaknesses
  const sessionDrawdownImpact = new Map<MarketSession, number>();
  for (const period of drawdownPeriods) {
    for (const session of period.causedBySessions) {
      sessionDrawdownImpact.set(session, (sessionDrawdownImpact.get(session) || 0) + period.drawdownAmount);
    }
  }
  
  const sortedSessions = [...sessionDrawdownImpact.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedSessions.length > 0) {
    weaknesses.push(`${sortedSessions[0][0]} session contributed most to drawdowns`);
  }

  return {
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownR: parseFloat(maxDrawdownR.toFixed(2)),
    currentDrawdown: parseFloat(currentDrawdown.toFixed(2)),
    drawdownPeriods: drawdownPeriods.slice(-5), // Last 5 periods
    structuralWeaknesses: weaknesses,
  };
}

// ============================================
// MARKET CONDITION ANALYSIS
// ============================================

/**
 * Analyze performance by market condition
 */
export function analyzeMarketConditionPerformance(trades: Trade[]): MarketConditionPerformance[] {
  const conditions: MarketCondition[] = ['Trending', 'Ranging', 'High_Volatility', 'Low_Volatility', 'News_Day', 'Normal'];
  const results: MarketConditionPerformance[] = [];

  for (const condition of conditions) {
    const conditionTrades = trades.filter(t => t.marketCondition === condition);
    
    if (conditionTrades.length === 0) {
      results.push({
        condition,
        totalTrades: 0,
        winRate: 0,
        avgR: 0,
        totalPnL: 0,
        expectancy: 0,
      });
      continue;
    }

    const wins = conditionTrades.filter(t => t.pnl > 0).length;
    const totalPnL = conditionTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const avgR = conditionTrades.reduce((sum, t) => sum + t.rFactor, 0) / conditionTrades.length;
    const expectancy = calculateExpectancy(conditionTrades);

    results.push({
      condition,
      totalTrades: conditionTrades.length,
      winRate: parseFloat(((wins / conditionTrades.length) * 100).toFixed(1)),
      avgR: parseFloat(avgR.toFixed(2)),
      totalPnL: parseFloat(totalPnL.toFixed(2)),
      expectancy: expectancy.expectancyR,
    });
  }

  return results;
}

// ============================================
// UTILITY: AUTO-DETECT SESSION FROM TIME
// ============================================

/**
 * Auto-detect market session from entry time
 * Times are in UTC
 */
export function detectSessionFromTime(entryTime: string): MarketSession {
  const [hours, minutes] = entryTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  // Asia: 00:00 - 09:00 UTC
  // London: 07:00 - 16:00 UTC
  // New York: 12:00 - 21:00 UTC
  // Overlaps and off-hours calculated accordingly

  if (totalMinutes >= 0 && totalMinutes < 420) { // 00:00 - 07:00
    return 'Asia';
  } else if (totalMinutes >= 420 && totalMinutes < 540) { // 07:00 - 09:00
    return 'Overlap_Asia_London';
  } else if (totalMinutes >= 540 && totalMinutes < 720) { // 09:00 - 12:00
    return 'London';
  } else if (totalMinutes >= 720 && totalMinutes < 960) { // 12:00 - 16:00
    return 'Overlap_London_NY';
  } else if (totalMinutes >= 960 && totalMinutes < 1260) { // 16:00 - 21:00
    return 'NewYork';
  } else {
    return 'Off_Hours';
  }
}

// ============================================
// COMPREHENSIVE ANALYTICS SUMMARY
// ============================================

export interface AnalyticsSummary {
  expectancy: ExpectancyResult;
  rMultipleStats: RMultipleStats;
  setupScores: SetupQualityScore[];
  ruleBreakAnalysis: RuleBreakAnalysis;
  sessionPerformance: SessionPerformance[];
  timePerformance: TimePerformance[];
  lossStreakAlert: LossStreakAlert;
  drawdownAnalysis: DrawdownAnalysis;
  marketConditionPerformance: MarketConditionPerformance[];
  keyInsights: string[];
}

/**
 * Generate comprehensive analytics summary
 */
export function generateAnalyticsSummary(trades: Trade[]): AnalyticsSummary {
  const expectancy = calculateExpectancy(trades);
  const rMultipleStats = calculateRMultipleStats(trades);
  const setupScores = calculateSetupQualityScores(trades);
  const ruleBreakAnalysis = analyzeRuleBreaks(trades);
  const sessionPerformance = analyzeSessionPerformance(trades);
  const timePerformance = analyzeTimePerformance(trades);
  const lossStreakAlert = analyzeLossStreak(trades);
  const drawdownAnalysis = analyzeDrawdowns(trades);
  const marketConditionPerformance = analyzeMarketConditionPerformance(trades);

  // Generate key insights
  const keyInsights: string[] = [];

  // Expectancy insight
  if (expectancy.expectancyR > 0.3) {
    keyInsights.push(`Strong positive expectancy of ${expectancy.expectancyR}R per trade`);
  } else if (expectancy.expectancyR < 0) {
    keyInsights.push(`Negative expectancy of ${expectancy.expectancyR}R - review your strategy`);
  }

  // Best setup insight
  const bestSetup = setupScores[0];
  if (bestSetup && bestSetup.score > 0) {
    keyInsights.push(`Best setup: ${bestSetup.setupName} with ${bestSetup.winRate}% win rate and ${bestSetup.avgR}R average`);
  }

  // Worst setup insight
  const worstSetup = setupScores[setupScores.length - 1];
  if (worstSetup && worstSetup.recommendation === 'Avoid') {
    keyInsights.push(`Consider dropping: ${worstSetup.setupName} has negative expectancy`);
  }

  // Rule following insight
  if (ruleBreakAnalysis.pnlWithRulesFollowed > 0 && ruleBreakAnalysis.pnlWithRulesBroken < 0) {
    const difference = ruleBreakAnalysis.pnlWithRulesFollowed - ruleBreakAnalysis.pnlWithRulesBroken;
    keyInsights.push(`Following rules would have added ${CURRENCY_SYMBOLS[BASE_CURRENCY]}${difference.toFixed(0)} to your P&L`);
  }

  // Session insight
  const bestSession = sessionPerformance.find(s => s.bestSession);
  const worstSession = sessionPerformance.find(s => s.worstSession);
  if (bestSession && bestSession.totalTrades > 0) {
    keyInsights.push(`Best session: ${bestSession.session} with ${bestSession.expectancy}R expectancy`);
  }
  if (worstSession && worstSession.totalTrades > 0 && worstSession.expectancy < 0) {
    keyInsights.push(`Avoid trading in ${worstSession.session} session (negative expectancy)`);
  }

  // Tilt warning
  if (lossStreakAlert.isOnTilt) {
    keyInsights.push('ALERT: You may be on tilt. Consider stopping for today.');
  }

  // Big winners insight
  if (rMultipleStats.percentAbove2R < 20 && expectancy.winRate > 50) {
    keyInsights.push('Consider letting winners run longer - only ' + rMultipleStats.percentAbove2R + '% of trades reach 2R');
  }

  return {
    expectancy,
    rMultipleStats,
    setupScores,
    ruleBreakAnalysis,
    sessionPerformance,
    timePerformance,
    lossStreakAlert,
    drawdownAnalysis,
    marketConditionPerformance,
    keyInsights,
  };
}
