import type { Trade, ChecklistTimeframe, MarketTrend, SetupType, VolumeProfile } from '@/lib/types';
import { getTradeBasePnL } from '@/lib/trade-utils';

export interface PreTradeChecklistInput {
  marketTrend: MarketTrend | '';
  setupType: SetupType | '';
  volumeProfile: VolumeProfile | '';
  emaTouch: '' | 'Yes' | 'No';
  timeFrame: ChecklistTimeframe | '';
  riskRewardRatio: string;
}

export interface SimilarTradeMatch {
  trade: Trade;
  score: number;
  matchedFields: string[];
}

export interface SimilarTradeInsights {
  totalSimilarTrades: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
}

function normalizeRiskReward(value?: number | string | null) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed.toFixed(2);
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

      if (checklist.marketTrend && trade.marketTrend === checklist.marketTrend) matchedFields.push('Trend');
      if (checklist.setupType && trade.setupType === checklist.setupType) matchedFields.push('Setup');
      if (checklist.volumeProfile && trade.volumeProfile === checklist.volumeProfile) matchedFields.push('Volume');
      if (checklist.emaTouch && trade.emaTouch !== undefined && trade.emaTouch === (checklist.emaTouch === 'Yes')) {
        matchedFields.push('EMA Touch');
      }
      if (checklist.timeFrame && trade.timeFrame === checklist.timeFrame) matchedFields.push('Timeframe');
      if (inputRiskReward && normalizeRiskReward(trade.riskRewardRatio) === inputRiskReward) {
        matchedFields.push('Risk-Reward');
      }

      return {
        trade,
        score: matchedFields.length,
        matchedFields,
      };
    })
    .filter((item) => item.score > 0)
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
    };
  }

  const pnls = matches.map((item) => getTradeBasePnL(item.trade));
  const wins = pnls.filter((pnl) => pnl > 0);
  const losses = pnls.filter((pnl) => pnl < 0);

  return {
    totalSimilarTrades: matches.length,
    winRate: Number(((wins.length / matches.length) * 100).toFixed(2)),
    averageProfit: wins.length ? Number((wins.reduce((sum, pnl) => sum + pnl, 0) / wins.length).toFixed(2)) : 0,
    averageLoss: losses.length ? Number((Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0)) / losses.length).toFixed(2)) : 0,
  };
}
