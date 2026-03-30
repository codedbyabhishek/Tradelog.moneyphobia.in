'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trade } from '@/lib/types';
import {
  analyzeBySetup,
  findSimilarTrades,
  compareTrades,
  getTradeInsights,
} from '@/lib/trade-analysis';
import { calculatePnL, calculateRFactor } from '@/lib/trade-utils';
import { TrendingUp, Zap, BarChart3, GitCompare } from 'lucide-react';

interface TradeAnalysisProps {
  trades: Trade[];
}

export function TradeAnalysis({ trades }: TradeAnalysisProps) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [comparisonTrade, setComparisonTrade] = useState<Trade | null>(null);

  const patterns = useMemo(() => analyzeBySetup(trades), [trades]);
  const insights = useMemo(() => getTradeInsights(trades), [trades]);
  const similarTrades = useMemo(() => {
    if (!selectedTrade) return [];
    return findSimilarTrades(selectedTrade, trades);
  }, [selectedTrade, trades]);

  const comparison = useMemo(() => {
    if (!selectedTrade || !comparisonTrade) return null;
    return compareTrades(selectedTrade, comparisonTrade);
  }, [selectedTrade, comparisonTrade]);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-gray-500">No trades yet. Start trading to see analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            AI Trading Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-gray-500 text-sm">Need more trades for insights</p>
          ) : (
            insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-blue-600 font-bold mt-1">★</div>
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Setup Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Setup Performance Analysis
          </CardTitle>
          <CardDescription>Performance metrics by trading setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patterns.slice(0, 10).map((pattern) => (
              <div key={pattern.setupName} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{pattern.setupName}</h4>
                    <p className="text-sm text-gray-600">{pattern.count} trades</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${pattern.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${pattern.totalPnL.toFixed(2)}
                    </div>
                    <Badge variant={pattern.winRate >= 50 ? 'default' : 'secondary'}>
                      {pattern.winRate.toFixed(1)}% Win
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Avg P&L</p>
                    <p className="font-medium">${pattern.avgPnL.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg R-Factor</p>
                    <p className="font-medium">{pattern.avgRFactor.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Consistency</p>
                    <p className="font-medium">${pattern.consistency.toFixed(0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                  <div>
                    <p className="text-gray-600">Best Trade</p>
                    <p className="font-medium text-green-600">+${pattern.bestTrade.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Worst Trade</p>
                    <p className="font-medium text-red-600">-${Math.abs(pattern.worstTrade).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trade Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-purple-600" />
            Trade Comparisons
          </CardTitle>
          <CardDescription>Compare similar trades to identify patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="mb-4">
                Select Trade to Compare
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select First Trade</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-2">
                {trades.slice(-20).map((trade) => (
                  <Button
                    key={trade.id}
                    variant="outline"
                    onClick={() => {
                      setSelectedTrade(trade);
                    }}
                    className="justify-start"
                  >
                    <div className="text-left flex-1">
                      <div>{trade.setupName} - {trade.symbol}</div>
                      <div className="text-xs text-gray-500">
                        ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)} {' '}
                        <span className={calculatePnL(trade) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          (${calculatePnL(trade).toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {selectedTrade && (
            <div className="space-y-4">
              {/* Selected Trade */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold mb-2">Trade 1 (Selected)</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">{selectedTrade.setupName}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${calculatePnL(selectedTrade) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${calculatePnL(selectedTrade).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Similar Trades Section */}
              <div>
                <h4 className="font-semibold mb-2">Similar Trades</h4>
                {similarTrades.length === 0 ? (
                  <p className="text-gray-500 text-sm">No similar trades found</p>
                ) : (
                  <div className="space-y-2">
                    {similarTrades.slice(0, 5).map((trade) => (
                      <Button
                        key={trade.id}
                        variant="outline"
                        onClick={() => setComparisonTrade(trade)}
                        className="w-full justify-start"
                      >
                        <div className="text-left flex-1">
                          <div className="text-sm">
                            {trade.setupName} - {trade.symbol}
                            <span className={`ml-2 font-semibold ${calculatePnL(trade) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${calculatePnL(trade).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {trade.entryDate} • Qty: {trade.quantity}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comparison Results */}
              {comparison && (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Similarities</h4>
                    <ul className="space-y-1">
                      {comparison.similarities.map((sim, idx) => (
                        <li key={idx} className="text-sm text-green-700 flex items-center gap-2">
                          <span className="text-green-600">✓</span> {sim}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Differences</h4>
                    <ul className="space-y-1">
                      {comparison.differences.map((diff, idx) => (
                        <li key={idx} className="text-sm text-blue-700 flex items-center gap-2">
                          <span className="text-blue-600">•</span> {diff}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold">{comparison.outcome}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
