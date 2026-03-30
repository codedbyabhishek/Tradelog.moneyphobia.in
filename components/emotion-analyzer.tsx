'use client';

import { useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { useSettings } from '@/lib/settings-context';
import { AlertCircle, TrendingUp, TrendingDown, Zap, Heart, Brain } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

type EmotionMetric = 'entry' | 'exit' | 'overall';

interface EmotionPerformance {
  emotion: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnL: number;
  totalPnL: number;
  consistency: number; // Std dev of P&L (lower is better)
  avgDuration: number; // In minutes
}

interface EmotionCorrelation {
  entryEmotion: string;
  exitEmotion: string;
  tradeCount: number;
  winRate: number;
  avgPnL: number;
}

interface PsychologicalPattern {
  pattern: string;
  description: string;
  tradeCount: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
}

export default function EmotionAnalyzer() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const [emotionMetric, setEmotionMetric] = useState<EmotionMetric>('entry');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');

  const symbol = CURRENCY_SYMBOLS[baseCurrency];

  const filteredTrades = useMemo(() => {
    if (timeFilter === 'all') return trades;
    
    const now = new Date();
    const cutoff = timeFilter === 'week' 
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return trades.filter(t => new Date(t.date) >= cutoff);
  }, [trades, timeFilter]);

  const emotionPerformance = useMemo(() => {
    if (!filteredTrades.length) return [];
    
    const emotions = new Map<string, EmotionPerformance>();
    
    filteredTrades.forEach(trade => {
      const emotion = emotionMetric === 'entry' 
        ? trade.entryEmotion 
        : emotionMetric === 'exit' 
        ? trade.exitEmotion 
        : `${trade.entryEmotion} → ${trade.exitEmotion}`;
      
      if (!emotion) return;
      
      if (!emotions.has(emotion)) {
        emotions.set(emotion, {
          emotion,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          avgPnL: 0,
          totalPnL: 0,
          consistency: 0,
          avgDuration: 0,
        });
      }
      
      const perf = emotions.get(emotion)!;
      perf.totalTrades++;
      if (trade.pnl > 0) perf.wins++;
      if (trade.pnl < 0) perf.losses++;
      perf.totalPnL += trade.pnl;
      
      // Calculate duration
      const duration = new Date(trade.exitDate || new Date()).getTime() - new Date(trade.date).getTime();
      perf.avgDuration = (perf.avgDuration * (perf.totalTrades - 1) + duration / (1000 * 60)) / perf.totalTrades;
    });
    
    // Calculate metrics
    emotions.forEach(perf => {
      perf.winRate = (perf.wins / perf.totalTrades) * 100;
      perf.avgPnL = perf.totalPnL / perf.totalTrades;
      
      // Calculate consistency (standard deviation)
      let sumSquareDiff = 0;
      filteredTrades.forEach(trade => {
        const emotion = emotionMetric === 'entry' 
          ? trade.entryEmotion 
          : emotionMetric === 'exit' 
          ? trade.exitEmotion 
          : `${trade.entryEmotion} → ${trade.exitEmotion}`;
        
        if (emotion === perf.emotion) {
          sumSquareDiff += Math.pow(trade.pnl - perf.avgPnL, 2);
        }
      });
      
      perf.consistency = Math.sqrt(sumSquareDiff / perf.totalTrades);
    });
    
    return Array.from(emotions.values()).sort((a, b) => b.totalTrades - a.totalTrades);
  }, [filteredTrades, emotionMetric]);

  const emotionCorrelations = useMemo(() => {
    if (!filteredTrades.length || emotionMetric !== 'entry') return [];
    
    const correlations = new Map<string, EmotionCorrelation>();
    
    filteredTrades.forEach(trade => {
      if (!trade.entryEmotion || !trade.exitEmotion) return;
      
      const key = `${trade.entryEmotion}|${trade.exitEmotion}`;
      
      if (!correlations.has(key)) {
        correlations.set(key, {
          entryEmotion: trade.entryEmotion,
          exitEmotion: trade.exitEmotion,
          tradeCount: 0,
          winRate: 0,
          avgPnL: 0,
        });
      }
      
      const corr = correlations.get(key)!;
      corr.tradeCount++;
    });
    
    // Calculate metrics
    correlations.forEach(corr => {
      let wins = 0;
      let totalPnL = 0;
      
      filteredTrades.forEach(trade => {
        if (trade.entryEmotion === corr.entryEmotion && trade.exitEmotion === corr.exitEmotion) {
          if (trade.pnl > 0) wins++;
          totalPnL += trade.pnl;
        }
      });
      
      corr.winRate = (wins / corr.tradeCount) * 100;
      corr.avgPnL = totalPnL / corr.tradeCount;
    });
    
    return Array.from(correlations.values())
      .filter(c => c.tradeCount >= 3) // Only show patterns with at least 3 trades
      .sort((a, b) => b.tradeCount - a.tradeCount);
  }, [filteredTrades, emotionMetric]);

  const psychologicalPatterns = useMemo(() => {
    const patterns: PsychologicalPattern[] = [];
    
    if (!emotionPerformance.length) return patterns;
    
    // Find best and worst performing emotions
    const best = emotionPerformance.reduce((a, b) => a.winRate > b.winRate ? a : b);
    const worst = emotionPerformance.reduce((a, b) => a.winRate < b.winRate ? a : b);
    
    if (best.winRate > 60) {
      patterns.push({
        pattern: `${best.emotion} State Excellence`,
        description: `Trading with ${best.emotion} emotion shows superior performance`,
        tradeCount: best.totalTrades,
        impact: 'positive',
        recommendation: `Consider preparing/priming for ${best.emotion} state before trading sessions`
      });
    }
    
    if (worst.winRate < 40 && worst.totalTrades >= 3) {
      patterns.push({
        pattern: `${worst.emotion} State Avoidance`,
        description: `${worst.emotion} emotion correlates with poor performance (${worst.winRate.toFixed(1)}% win rate)`,
        tradeCount: worst.totalTrades,
        impact: 'negative',
        recommendation: `Implement emotional resets or take breaks when you notice ${worst.emotion} feeling`
      });
    }
    
    // Find consistency outliers
    const avgConsistency = emotionPerformance.reduce((sum, p) => sum + p.consistency, 0) / emotionPerformance.length;
    const inconsistent = emotionPerformance.find(p => p.consistency > avgConsistency * 1.5);
    
    if (inconsistent) {
      patterns.push({
        pattern: 'Emotional Volatility',
        description: `${inconsistent.emotion} emotion produces highly variable trade outcomes`,
        tradeCount: inconsistent.totalTrades,
        impact: 'negative',
        recommendation: 'Use risk management rules to control position size during this emotional state'
      });
    }
    
    // Emotional transition patterns
    if (emotionCorrelations.length > 0) {
      const bestTransition = emotionCorrelations.reduce((a, b) => a.winRate > b.winRate ? a : b);
      const worstTransition = emotionCorrelations.reduce((a, b) => a.winRate < b.winRate ? a : b);
      
      if (bestTransition.winRate > 60) {
        patterns.push({
          pattern: 'Beneficial Emotional Transition',
          description: `${bestTransition.entryEmotion} → ${bestTransition.exitEmotion} shows strong performance`,
          tradeCount: bestTransition.tradeCount,
          impact: 'positive',
          recommendation: 'This emotional journey supports good trading outcomes'
        });
      }
      
      if (worstTransition.winRate < 40 && worstTransition.tradeCount >= 3) {
        patterns.push({
          pattern: 'Problematic Emotional Transition',
          description: `${worstTransition.entryEmotion} → ${worstTransition.exitEmotion} shows poor results`,
          tradeCount: worstTransition.tradeCount,
          impact: 'negative',
          recommendation: 'Be aware of this emotional pattern and implement preventative measures'
        });
      }
    }
    
    return patterns;
  }, [emotionPerformance, emotionCorrelations]);

  const emotionMetricData = useMemo(() => {
    return emotionPerformance.slice(0, 8).map(ep => ({
      name: ep.emotion.length > 12 ? ep.emotion.substring(0, 10) + '...' : ep.emotion,
      fullName: ep.emotion,
      winRate: parseFloat(ep.winRate.toFixed(1)),
      avgPnL: parseFloat(ep.avgPnL.toFixed(2)),
      tradeCount: ep.totalTrades,
    }));
  }, [emotionPerformance]);

  if (!trades || trades.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-3xl font-bold">Emotion Psychology Analyzer</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No trades yet. Record emotional states in trades to analyze patterns.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Emotion Psychology Analyzer</h1>
          <p className="text-muted-foreground mt-1">Understand how emotions impact your trading performance</p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6">
          <div className="w-48">
            <label className="text-sm font-medium mb-2 block">Emotion Type</label>
            <Select value={emotionMetric} onValueChange={(v) => setEmotionMetric(v as EmotionMetric)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Emotion</SelectItem>
                <SelectItem value="exit">Exit Emotion</SelectItem>
                <SelectItem value="overall">Emotional Journey</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <label className="text-sm font-medium mb-2 block">Time Period</label>
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Psychological Patterns */}
      {psychologicalPatterns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Key Patterns Detected</h2>
          {psychologicalPatterns.map((pattern, idx) => (
            <Alert key={idx} className={pattern.impact === 'positive' ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : 'border-red-500/50 bg-red-50/30 dark:bg-red-950/20'}>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {pattern.impact === 'positive' ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{pattern.pattern}</p>
                    <p className="text-sm text-muted-foreground">{pattern.description}</p>
                  </div>
                  <Badge>{pattern.tradeCount} trades</Badge>
                </div>
                <div className="ml-8 p-3 bg-background rounded border border-border">
                  <p className="text-sm">
                    <span className="font-semibold">Recommendation:</span> {pattern.recommendation}
                  </p>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Emotion Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {emotionPerformance.slice(0, 6).map((perf, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{perf.emotion}</CardTitle>
                <Badge>{perf.totalTrades} trades</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-medium">Win Rate</p>
                  <p className="text-sm font-bold">{perf.winRate.toFixed(1)}%</p>
                </div>
                <Progress value={perf.winRate} className="h-2" />
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total P&L</span>
                  <span className={perf.totalPnL >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {symbol}{perf.totalPnL.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg per Trade</span>
                  <span className={perf.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {symbol}{perf.avgPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consistency (σ)</span>
                  <span className="font-mono text-xs">{symbol}{perf.consistency.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Duration</span>
                  <span className="text-xs">{perf.avgDuration.toFixed(0)}m</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Win Rate Comparison Chart */}
      {emotionMetricData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Win Rate by {emotionMetric === 'entry' ? 'Entry ' : emotionMetric === 'exit' ? 'Exit ' : 'Overall '}Emotion</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emotionMetricData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border rounded p-2 text-sm">
                          <p className="font-semibold">{data.fullName}</p>
                          <p className="text-xs">Win Rate: {data.winRate}%</p>
                          <p className="text-xs">Trades: {data.tradeCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="winRate" fill="#8b5cf6" name="Win Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Avg P&L Comparison */}
      {emotionMetricData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average P&L by Emotion</CardTitle>
            <CardDescription>Positive/Negative profit average per trade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emotionMetricData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border rounded p-2 text-sm">
                          <p className="font-semibold">{data.fullName}</p>
                          <p className={data.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                            Avg P&L: {symbol}{data.avgPnL}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="avgPnL"
                  fill="#6366f1"
                  name="Avg P&L"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Emotional Transitions */}
      {emotionCorrelations.length > 0 && emotionMetric === 'entry' && (
        <Card>
          <CardHeader>
            <CardTitle>Emotional Transitions</CardTitle>
            <CardDescription>How emotional states change from entry to exit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emotionCorrelations.map((correlation, idx) => (
                <div key={idx} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <p className="font-semibold">{correlation.entryEmotion}</p>
                        <p className="text-xs text-muted-foreground">Entry</p>
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="text-sm">
                        <p className="font-semibold">{correlation.exitEmotion}</p>
                        <p className="text-xs text-muted-foreground">Exit</p>
                      </div>
                    </div>
                    <Badge>{correlation.tradeCount} trades</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Win Rate</p>
                      <p className="font-bold text-lg">{correlation.winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Avg P&L</p>
                      <p className={`font-bold text-lg ${correlation.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {symbol}{correlation.avgPnL.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Frequency</p>
                      <p className="font-bold text-lg">{Math.round((correlation.tradeCount / filteredTrades.length) * 100)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Emotional Trading Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Emotional Consistency</span>
              <span className="text-sm font-bold">
                {emotionPerformance.length > 0 
                  ? (100 - (emotionPerformance.reduce((sum, p) => sum + p.consistency, 0) / (emotionPerformance.length * 500) * 100)).toFixed(0) 
                  : 0}%
              </span>
            </div>
            <Progress 
              value={emotionPerformance.length > 0 
                ? Math.max(0, 100 - (emotionPerformance.reduce((sum, p) => sum + p.consistency, 0) / (emotionPerformance.length * 500) * 100)) 
                : 0} 
              className="h-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">Lower variance in P&L across emotional states indicates better control</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Recommended Actions</p>
              <ul className="text-sm space-y-1">
                {psychologicalPatterns.length > 0 ? psychologicalPatterns.slice(0, 3).map((pattern, idx) => (
                  <li key={idx} className="text-xs">• {pattern.pattern}</li>
                )) : (
                  <li className="text-xs text-muted-foreground">Maintain current emotional discipline</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tracked Emotions</p>
              <div className="flex flex-wrap gap-2">
                {emotionPerformance.slice(0, 5).map((ep, idx) => (
                  <Badge key={idx} variant="outline">{ep.emotion}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
