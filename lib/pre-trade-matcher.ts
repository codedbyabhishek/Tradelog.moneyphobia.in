import type {
  Trade,
  MarketTrend,
  SetupType,
  VolumeProfile,
  MarketOpenType,
  FirstFiveMinuteCandleType,
} from '@/lib/types';
import { getTradeBasePnL } from '@/lib/trade-utils';

export interface PreTradeChecklistInput {
  marketTrend: MarketTrend | '';
  setupType: SetupType | '';
  volumeProfile: VolumeProfile | '';
  emaTouch: '' | 'Yes' | 'No';
  timeFrame: string;
  riskRewardRatio: string;
  marketOpenType: MarketOpenType | '';
  firstFiveMinuteCandleType: FirstFiveMinuteCandleType | '';
}

export interface SimilarTradeMatch {
  trade: Trade;
  score: number;
  maxScore: number;
  matchStrength: 'High' | 'Medium' | 'Low';
  matchedFields: string[];
}

export interface SimilarTradeInsights {
  totalSimilarTrades: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  netPnl: number;
  profitFactor: number;
  averageR: number;
  confidenceLabel: 'Strong' | 'Neutral' | 'Weak' | 'Insufficient Data';
  highQualityMatches: number;
}

export interface ChecklistRecommendation {
  label: string;
  value: string;
  trades: number;
  winRate: number;
  netPnl: number;
  averageR: number;
}

export interface PersonalizedChecklistRecommendations {
  marketTrend: ChecklistRecommendation | null;
  setupType: ChecklistRecommendation | null;
  volumeProfile: ChecklistRecommendation | null;
  emaTouch: ChecklistRecommendation | null;
  timeFrame: ChecklistRecommendation | null;
  riskRewardRatio: ChecklistRecommendation | null;
  marketOpenType: ChecklistRecommendation | null;
  firstFiveMinuteCandleType: ChecklistRecommendation | null;
}

const FIELD_WEIGHTS = {
  marketTrend: 2,
  setupType: 3,
  volumeProfile: 1,
  emaTouch: 1,
  timeFrame: 3,
  riskRewardRatio: 2,
  marketOpenType: 2,
  firstFiveMinuteCandleType: 2,
} as const;

const MAX_SCORE = Object.values(FIELD_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

function normalizeRiskReward(value?: number | string | null) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function riskRewardMatches(input: number | null, tradeValue: number | null) {
  if (input === null || tradeValue === null) return false;
  return Math.abs(input - tradeValue) <= 0.25;
}

function buildRecommendation<T extends string>(
  trades: Trade[],
  getValue: (trade: Trade) => T | null,
  formatValue: (value: T) => string = (value) => value,
): ChecklistRecommendation | null {
  const stats = new Map<T, { trades: number; wins: number; netPnl: number; totalR: number }>();

  for (const trade of trades) {
    const value = getValue(trade);
    if (!value) continue;

    const current = stats.get(value) || { trades: 0, wins: 0, netPnl: 0, totalR: 0 };
    current.trades += 1;
    if (trade.pnl > 0) current.wins += 1;
    current.netPnl += getTradeBasePnL(trade);
    current.totalR += trade.rFactor;
    stats.set(value, current);
  }

  const ranked = [...stats.entries()]
    .map(([value, data]) => ({
      label: formatValue(value),
      value: formatValue(value),
      trades: data.trades,
      winRate: Number(((data.wins / data.trades) * 100).toFixed(2)),
      netPnl: Number(data.netPnl.toFixed(2)),
      averageR: Number((data.totalR / data.trades).toFixed(2)),
    }))
    .filter((item) => item.trades >= 2)
    .sort((a, b) => {
      if (b.netPnl !== a.netPnl) return b.netPnl - a.netPnl;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.averageR !== a.averageR) return b.averageR - a.averageR;
      return b.trades - a.trades;
    });

  return ranked[0] || null;
}

export function getPersonalizedChecklistRecommendations(trades: Trade[]): PersonalizedChecklistRecommendations {
  return {
    marketTrend: buildRecommendation(trades, (trade) => trade.marketTrend || null),
    setupType: buildRecommendation(trades, (trade) => trade.setupType || null),
    volumeProfile: buildRecommendation(trades, (trade) => trade.volumeProfile || null),
    emaTouch: buildRecommendation(trades, (trade) => {
      if (trade.emaTouch === undefined) return null;
      return trade.emaTouch ? 'Yes' : 'No';
    }),
    timeFrame: buildRecommendation(trades, (trade) => trade.timeFrame || null),
    riskRewardRatio: buildRecommendation(
      trades,
      (trade) => {
        const normalized = normalizeRiskReward(trade.riskRewardRatio);
        return normalized === null ? null : normalized.toFixed(2);
      },
      (value) => value,
    ),
    marketOpenType: buildRecommendation(trades, (trade) => trade.marketOpenType || null),
    firstFiveMinuteCandleType: buildRecommendation(trades, (trade) => trade.firstFiveMinuteCandleType || null),
  };
}

export function getSimilarTradeMatches(
  trades: Trade[],
  checklist: PreTradeChecklistInput,
  limit = 10,
): SimilarTradeMatch[] {
  const inputRiskReward = normalizeRiskReward(checklist.riskRewardRatio);

  return trades
    .map((trade) => {
      const matchedFields: string[] = [];
      let score = 0;

      if (checklist.marketTrend && trade.marketTrend === checklist.marketTrend) {
        matchedFields.push('Trend');
        score += FIELD_WEIGHTS.marketTrend;
      }
      if (checklist.setupType && trade.setupType === checklist.setupType) {
        matchedFields.push('Setup');
        score += FIELD_WEIGHTS.setupType;
      }
      if (checklist.volumeProfile && trade.volumeProfile === checklist.volumeProfile) {
        matchedFields.push('Volume');
        score += FIELD_WEIGHTS.volumeProfile;
      }
      if (checklist.emaTouch && trade.emaTouch !== undefined && trade.emaTouch === (checklist.emaTouch === 'Yes')) {
        matchedFields.push('EMA Touch');
        score += FIELD_WEIGHTS.emaTouch;
      }
      if (checklist.timeFrame && trade.timeFrame === checklist.timeFrame) {
        matchedFields.push('Timeframe');
        score += FIELD_WEIGHTS.timeFrame;
      }
      if (checklist.marketOpenType && trade.marketOpenType === checklist.marketOpenType) {
        matchedFields.push('Market Open');
        score += FIELD_WEIGHTS.marketOpenType;
      }
      if (
        checklist.firstFiveMinuteCandleType &&
        trade.firstFiveMinuteCandleType === checklist.firstFiveMinuteCandleType
      ) {
        matchedFields.push('First 5m Candle');
        score += FIELD_WEIGHTS.firstFiveMinuteCandleType;
      }
      if (riskRewardMatches(inputRiskReward, normalizeRiskReward(trade.riskRewardRatio))) {
        matchedFields.push('Risk-Reward');
        score += FIELD_WEIGHTS.riskRewardRatio;
      }

      const matchStrength: SimilarTradeMatch['matchStrength'] =
        score >= 10 ? 'High' : score >= 6 ? 'Medium' : 'Low';

      return {
        trade,
        score,
        maxScore: MAX_SCORE,
        matchStrength,
        matchedFields,
      };
    })
    .filter((item) => item.score >= 3 || (item.score > 0 && item.matchStrength !== 'Low'))
    .filter((item) => item.matchedFields.length > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.trade.date).getTime() - new Date(a.trade.date).getTime();
    })
    .slice(0, limit);
}

export function getSimilarTradeInsights(matches: SimilarTradeMatch[]): SimilarTradeInsights {
  if (matches.length === 0) {
    return {
      totalSimilarTrades: 0,
      winRate: 0,
      averageProfit: 0,
      averageLoss: 0,
      netPnl: 0,
      profitFactor: 0,
      averageR: 0,
      confidenceLabel: 'Insufficient Data',
      highQualityMatches: 0,
    };
  }

  const pnls = matches.map((item) => getTradeBasePnL(item.trade));
  const wins = pnls.filter((pnl) => pnl > 0);
  const losses = pnls.filter((pnl) => pnl < 0);
  const grossProfit = wins.reduce((sum, pnl) => sum + pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
  const averageR = matches.reduce((sum, item) => sum + item.trade.rFactor, 0) / matches.length;
  const highQualityMatches = matches.filter((match) => match.matchStrength === 'High').length;
  const winRate = Number(((wins.length / matches.length) * 100).toFixed(2));
  const netPnl = Number(pnls.reduce((sum, pnl) => sum + pnl, 0).toFixed(2));

  let confidenceLabel: SimilarTradeInsights['confidenceLabel'] = 'Neutral';
  if (matches.length < 3) {
    confidenceLabel = 'Insufficient Data';
  } else if (winRate >= 65 && netPnl > 0 && highQualityMatches >= Math.max(2, Math.ceil(matches.length * 0.25))) {
    confidenceLabel = 'Strong';
  } else if (winRate < 45 || netPnl < 0) {
    confidenceLabel = 'Weak';
  }

  return {
    totalSimilarTrades: matches.length,
    winRate,
    averageProfit: wins.length ? Number((wins.reduce((sum, pnl) => sum + pnl, 0) / wins.length).toFixed(2)) : 0,
    averageLoss: losses.length ? Number((Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0)) / losses.length).toFixed(2)) : 0,
    netPnl,
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0,
    averageR: Number(averageR.toFixed(2)),
    confidenceLabel,
    highQualityMatches,
  };
}
