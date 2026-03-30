/**
 * Sentiment Analysis Engine
 * Analyzes emotional patterns and their impact on trading performance
 */

import { Trade } from '@/lib/types';
import { calculatePnL } from '@/lib/trade-utils';

export interface EmotionImpact {
  emotion: string;
  tradeCount: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  consistency: number;
}

export interface SentimentTrend {
  date: string;
  averageSentiment: number; // 1-5 scale
  pnl: number;
  trades: number;
}

/**
 * Analyze emotion impact on trading
 */
export function analyzeEmotionImpact(trades: Trade[]): EmotionImpact[] {
  const emotionGroups: Record<string, Trade[]> = {};

  trades.forEach((trade) => {
    const emotion = trade.emotion || 'neutral';
    if (!emotionGroups[emotion]) {
      emotionGroups[emotion] = [];
    }
    emotionGroups[emotion].push(trade);
  });

  return Object.entries(emotionGroups)
    .map(([emotion, emotionTrades]) => {
      const pnls = emotionTrades.map(calculatePnL);
      const winningTrades = pnls.filter((p) => p > 0).length;

      // Calculate consistency
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
      const variance = pnls.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / pnls.length;
      const consistency = Math.sqrt(variance);

      return {
        emotion,
        tradeCount: emotionTrades.length,
        totalPnL: pnls.reduce((a, b) => a + b, 0),
        avgPnL: mean,
        winRate: (winningTrades / emotionTrades.length) * 100,
        consistency,
      };
    })
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

/**
 * Calculate sentiment score from text (basic NLP)
 */
export function calculateSentimentScore(text: string): number {
  // Positive words: +1
  const positiveWords = ['good', 'great', 'excellent', 'strong', 'confident', 'focused', 'disciplined', 'calm', 'patient'];
  // Negative words: -1
  const negativeWords = ['bad', 'poor', 'weak', 'anxious', 'scared', 'confused', 'rushed', 'greedy', 'frustrated'];

  let score = 3; // Neutral baseline

  const lowerText = text.toLowerCase();
  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score++;
  });
  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score--;
  });

  return Math.max(1, Math.min(5, score));
}

/**
 * Track sentiment trends over time
 */
export function calculateSentimentTrends(trades: Trade[]): SentimentTrend[] {
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );

  const trends: Record<string, { sentiments: number[]; pnl: number; count: number }> = {};

  sortedTrades.forEach((trade) => {
    const date = trade.entryDate.split('T')[0];
    if (!trends[date]) {
      trends[date] = { sentiments: [], pnl: 0, count: 0 };
    }

    const sentiment = calculateSentimentScore(trade.notes || '');
    trends[date].sentiments.push(sentiment);
    trends[date].pnl += calculatePnL(trade);
    trends[date].count++;
  });

  return Object.entries(trends)
    .map(([date, data]) => ({
      date,
      averageSentiment: data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length,
      pnl: data.pnl,
      trades: data.count,
    }))
    .slice(-30); // Last 30 days
}

/**
 * Get emotional insights
 */
export function getEmotionalInsights(trades: Trade[]): string[] {
  const insights: string[] = [];
  const emotionImpacts = analyzeEmotionImpact(trades);

  // Best emotion
  const bestEmotion = emotionImpacts[0];
  if (bestEmotion) {
    insights.push(
      `Your best trades are when you feel "${bestEmotion.emotion}" (${bestEmotion.tradeCount} trades, ${bestEmotion.winRate.toFixed(1)}% win rate)`
    );
  }

  // Worst emotion
  const worstEmotion = emotionImpacts[emotionImpacts.length - 1];
  if (worstEmotion && worstEmotion.totalPnL < 0) {
    insights.push(
      `Avoid trading when feeling "${worstEmotion.emotion}" - ${worstEmotion.tradeCount} trades with -$${Math.abs(worstEmotion.totalPnL).toFixed(2)} loss`
    );
  }

  // Consistency pattern
  const mostConsistent = emotionImpacts.find((e) => e.consistency === Math.min(...emotionImpacts.map((x) => x.consistency)));
  if (mostConsistent) {
    insights.push(
      `When "${mostConsistent.emotion}", your results are most consistent (${mostConsistent.consistency.toFixed(0)} stdev)`
    );
  }

  // Emotional control
  const positiveEmotions = ['confident', 'focused', 'calm', 'disciplined'];
  const positiveTradesCount = trades.filter((t) => {
    const emotion = t.emotion || '';
    return positiveEmotions.some((e) => emotion.toLowerCase().includes(e));
  }).length;

  if (positiveTradesCount > trades.length * 0.7) {
    insights.push(
      `Excellent emotional control! ${((positiveTradesCount / trades.length) * 100).toFixed(1)}% of trades made with positive mindset`
    );
  }

  return insights;
}

/**
 * Correlate journal notes with P&L
 */
export function correlateNotesWithPerformance(trades: Trade[]): { keyword: string; impact: number }[] {
  const keywords: Record<string, { pnl: number; count: number }> = {};

  trades.forEach((trade) => {
    if (!trade.notes) return;

    const words = trade.notes.toLowerCase().split(/\s+/).slice(0, 10); // First 10 words
    const pnl = calculatePnL(trade);

    words.forEach((word) => {
      if (word.length < 4) return; // Skip short words

      if (!keywords[word]) {
        keywords[word] = { pnl: 0, count: 0 };
      }
      keywords[word].pnl += pnl;
      keywords[word].count++;
    });
  });

  return Object.entries(keywords)
    .filter(([, data]) => data.count >= 3) // Only keywords used 3+ times
    .map(([keyword, data]) => ({
      keyword,
      impact: data.pnl / data.count,
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 10);
}
