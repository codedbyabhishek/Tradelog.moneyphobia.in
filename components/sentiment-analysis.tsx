'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade } from '@/lib/types';
import {
  analyzeEmotionImpact,
  calculateSentimentTrends,
  getEmotionalInsights,
  correlateNotesWithPerformance,
} from '@/lib/sentiment-analysis';
import { calculatePnL } from '@/lib/trade-utils';
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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, TrendingUp, Brain } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SentimentAnalysisProps {
  trades: Trade[];
}

const EMOTIONS = ['Confident', 'Frustrated', 'Neutral', 'Anxious', 'Satisfied'];
const EMOTION_COLORS = ['#10b981', '#ef4444', '#6b7280', '#f59e0b', '#3b82f6'];

export function SentimentAnalysis({ trades }: SentimentAnalysisProps) {
  const emotionImpacts = useMemo(() => analyzeEmotionImpact(trades), [trades]);
  const sentimentTrends = useMemo(() => calculateSentimentTrends(trades), [trades]);
  const insights = useMemo(() => getEmotionalInsights(trades), [trades]);
  const keywords = useMemo(() => correlateNotesWithPerformance(trades), [trades]);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-gray-500">No trades yet. Start trading to see sentiment analysis.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare emotion chart data
  const emotionChartData = emotionImpacts.map((impact) => ({
    name: impact.emotion,
    pnl: parseFloat(impact.totalPnL.toFixed(2)),
    count: impact.tradeCount,
  }));

  // Prepare sentiment trend data
  const trendData = sentimentTrends.map((trend) => ({
    date: trend.date.slice(-5), // YYYY-MM -> MM-DD
    sentiment: parseFloat(trend.averageSentiment.toFixed(1)),
    pnl: parseFloat(trend.pnl.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Emotional Trading Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-gray-500 text-sm">Log emotions to see insights</p>
          ) : (
            insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="text-purple-600 font-bold mt-1">💡</div>
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Emotion Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Emotion Impact on Performance</CardTitle>
          <CardDescription>Total P&L by emotional state</CardDescription>
        </CardHeader>
        <CardContent>
          {emotionImpacts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No emotion data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emotionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
                  {emotionChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Emotion Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Emotion Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emotionImpacts.map((impact) => (
              <div key={impact.emotion} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold capitalize">{impact.emotion}</h4>
                  <span className={`text-sm font-bold ${impact.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${impact.totalPnL.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Trades</p>
                    <p className="font-medium">{impact.tradeCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg P&L</p>
                    <p className="font-medium">${impact.avgPnL.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Win Rate</p>
                    <p className="font-medium">{impact.winRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Consistency</p>
                    <p className="font-medium">${impact.consistency.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Trend vs P&L</CardTitle>
          <CardDescription>Track how emotional state correlates with daily P&L</CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[1, 5]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Sentiment (1-5)', angle: 90, position: 'insideRight', offset: -5 }}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === 'pnl') return `$${value.toFixed(2)}`;
                    return value.toFixed(1);
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pnl"
                  stroke="#3b82f6"
                  name="Daily P&L"
                  animationDuration={300}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#a855f7"
                  name="Avg Sentiment"
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Journal Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Journal Keywords</CardTitle>
          <CardDescription>Most impactful words in your trade notes</CardDescription>
        </CardHeader>
        <CardContent>
          {keywords.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Add notes to your trades to see keywords</p>
          ) : (
            <div className="space-y-2">
              {keywords.map((kw) => (
                <div key={kw.keyword} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{kw.keyword}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${kw.impact >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{
                          width: `${Math.min(Math.abs(kw.impact) / 100, 1) * 100}%`,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${kw.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kw.impact >= 0 ? '+' : ''}${kw.impact.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning for negative patterns */}
      {emotionImpacts.length > 0 && emotionImpacts[emotionImpacts.length - 1].totalPnL < 0 && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You tend to lose money when feeling "{emotionImpacts[emotionImpacts.length - 1].emotion}". 
            Consider taking a break or using a automated trading system in these states.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
