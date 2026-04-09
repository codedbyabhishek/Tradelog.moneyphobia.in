'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/lib/settings-context';
import { useTrades } from '@/lib/trade-context';
import { storePreTradeDraft } from '@/lib/pre-trade-draft';
import {
  getPersonalizedChecklistRecommendations,
  getSimilarTradeInsights,
  getSimilarTradeMatches,
  type PreTradeChecklistInput,
} from '@/lib/pre-trade-matcher';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { ScreenshotViewer } from '@/components/screenshot-viewer';
import { Eye, Sparkles } from 'lucide-react';

interface PreTradeChecklistWorkspaceProps {
  onStartTrade?: () => void;
}

export default function PreTradeChecklistWorkspace({ onStartTrade }: PreTradeChecklistWorkspaceProps) {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency] || '₹';

  const [checklist, setChecklist] = useState<PreTradeChecklistInput>({
    marketTrend: '',
    setupType: '',
    volumeProfile: '',
    emaTouch: '',
    timeFrame: '',
    riskRewardRatio: '',
    marketOpenType: '',
    firstFiveMinuteCandleType: '',
  });
  const [selectedMatchedTradeId, setSelectedMatchedTradeId] = useState<string | null>(null);

  const similarTradeMatches = useMemo(
    () => getSimilarTradeMatches(trades, checklist, 10),
    [trades, checklist],
  );

  const similarTradeInsights = useMemo(
    () => getSimilarTradeInsights(similarTradeMatches),
    [similarTradeMatches],
  );

  const checklistRecommendations = useMemo(
    () => getPersonalizedChecklistRecommendations(trades),
    [trades],
  );

  const selectedMatchedTrade = useMemo(
    () => similarTradeMatches.find((match) => match.trade.id === selectedMatchedTradeId) || null,
    [similarTradeMatches, selectedMatchedTradeId],
  );

  const updateChecklist = (field: keyof PreTradeChecklistInput, value: string) => {
    setChecklist((prev) => ({ ...prev, [field]: value }));
  };

  const startTradeFlow = () => {
    storePreTradeDraft({
      marketTrend: checklist.marketTrend,
      setupType: checklist.setupType,
      volumeProfile: checklist.volumeProfile,
      emaTouch: checklist.emaTouch,
      timeFrame: checklist.timeFrame,
      riskRewardRatio: checklist.riskRewardRatio,
      marketOpenType: checklist.marketOpenType,
      firstFiveMinuteCandleType: checklist.firstFiveMinuteCandleType,
    });
    onStartTrade?.();
  };

  const recommendationCards: Array<{
    label: string;
    field: keyof PreTradeChecklistInput;
    recommendation: ReturnType<typeof getPersonalizedChecklistRecommendations>[keyof ReturnType<typeof getPersonalizedChecklistRecommendations>];
  }> = [
    { label: 'Market Trend', field: 'marketTrend', recommendation: checklistRecommendations.marketTrend },
    { label: 'Setup Type', field: 'setupType', recommendation: checklistRecommendations.setupType },
    { label: 'Volume', field: 'volumeProfile', recommendation: checklistRecommendations.volumeProfile },
    { label: 'EMA Touch', field: 'emaTouch', recommendation: checklistRecommendations.emaTouch },
    { label: 'Timeframe', field: 'timeFrame', recommendation: checklistRecommendations.timeFrame },
    { label: 'Risk-Reward', field: 'riskRewardRatio', recommendation: checklistRecommendations.riskRewardRatio },
    { label: 'Market Open', field: 'marketOpenType', recommendation: checklistRecommendations.marketOpenType },
    { label: 'First 5-Min Candle', field: 'firstFiveMinuteCandleType', recommendation: checklistRecommendations.firstFiveMinuteCandleType },
  ];

  return (
    <div className="flex-1 min-h-screen w-full p-3 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <Card className="border-primary/20 bg-primary/5 shadow-none hover:border-primary/30 hover:shadow-none">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Pre-Trade Smart Checklist
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-sm sm:text-base">
                  Evaluate a trade before you place it. This section uses only your own historical entries to show what has worked for you and which past trades look similar.
                </CardDescription>
              </div>
              <Button type="button" onClick={startTradeFlow} className="w-full lg:w-auto">
                Use These Values In Add Trade
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Checklist Inputs</CardTitle>
            <CardDescription>Fill the same fields that get stored with your trades.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3 sm:p-6 sm:pt-0">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Market Trend</label>
              <select
                value={checklist.marketTrend}
                onChange={(e) => updateChecklist('marketTrend', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select trend</option>
                <option value="Bullish">Bullish</option>
                <option value="Bearish">Bearish</option>
                <option value="Sideways">Sideways</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Setup Type</label>
              <select
                value={checklist.setupType}
                onChange={(e) => updateChecklist('setupType', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select setup type</option>
                <option value="Breakout">Breakout</option>
                <option value="Pullback">Pullback</option>
                <option value="Reversal">Reversal</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Volume</label>
              <select
                value={checklist.volumeProfile}
                onChange={(e) => updateChecklist('volumeProfile', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select volume</option>
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">EMA Touch</label>
              <select
                value={checklist.emaTouch}
                onChange={(e) => updateChecklist('emaTouch', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Timeframe</label>
              <input
                type="text"
                value={checklist.timeFrame}
                onChange={(e) => updateChecklist('timeFrame', e.target.value)}
                placeholder="e.g. 5m, 15m, 1H, Daily"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Risk-Reward Ratio</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={checklist.riskRewardRatio}
                onChange={(e) => updateChecklist('riskRewardRatio', e.target.value)}
                placeholder="e.g. 2.00"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Market Open Type</label>
              <select
                value={checklist.marketOpenType}
                onChange={(e) => updateChecklist('marketOpenType', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select market open</option>
                <option value="Gap Up">Gap Up</option>
                <option value="Gap Down">Gap Down</option>
                <option value="Sideways">Sideways</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">First 5-Min Candle</label>
              <select
                value={checklist.firstFiveMinuteCandleType}
                onChange={(e) => updateChecklist('firstFiveMinuteCandleType', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select candle type</option>
                <option value="Bullish">Bullish</option>
                <option value="Bearish">Bearish</option>
                <option value="Doji">Doji</option>
                <option value="Pinbar">Pinbar</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">What Historically Works For You</CardTitle>
            <CardDescription>Best-performing values from your own journal history. Click apply to load them into this checklist.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3 sm:p-6 sm:pt-0">
            {recommendationCards.map(({ label, field, recommendation }) => (
              <div key={label} className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {recommendation ? recommendation.value : 'Not enough data yet'}
                </p>
                {recommendation ? (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {recommendation.trades} trades • {recommendation.winRate}% win rate • {baseCurrencySymbol}{recommendation.netPnl.toFixed(2)} net
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => updateChecklist(field, recommendation.value)}
                    >
                      Apply
                    </Button>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Log at least two trades with this field to unlock personalized guidance.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Historical Match Signal</CardTitle>
            <CardDescription>Weighted matching based on your stored past trades only.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Similar Trades</p>
                <p className="mt-2 text-xl font-bold text-foreground">{similarTradeInsights.totalSimilarTrades}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Signal</p>
                <p className={`mt-2 text-xl font-bold ${
                  similarTradeInsights.confidenceLabel === 'Strong'
                    ? 'text-green-400'
                    : similarTradeInsights.confidenceLabel === 'Weak'
                    ? 'text-red-400'
                    : similarTradeInsights.confidenceLabel === 'Neutral'
                    ? 'text-yellow-400'
                    : 'text-muted-foreground'
                }`}>
                  {similarTradeInsights.confidenceLabel}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Win Rate</p>
                <p className="mt-2 text-xl font-bold text-foreground">{similarTradeInsights.winRate}%</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Net P&amp;L</p>
                <p className={`mt-2 text-xl font-bold ${similarTradeInsights.netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {baseCurrencySymbol}{similarTradeInsights.netPnl.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Avg Profit</p>
                <p className="mt-2 text-xl font-bold text-green-400">{baseCurrencySymbol}{similarTradeInsights.averageProfit.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Avg Loss</p>
                <p className="mt-2 text-xl font-bold text-red-400">{baseCurrencySymbol}{similarTradeInsights.averageLoss.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Profit Factor</p>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {Number.isFinite(similarTradeInsights.profitFactor) ? similarTradeInsights.profitFactor.toFixed(2) : '∞'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Average R</p>
                <p className={`mt-2 text-xl font-bold ${similarTradeInsights.averageR >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {similarTradeInsights.averageR.toFixed(2)}R
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Top Historical Matches</CardTitle>
            <CardDescription>
              Weighted scoring. High-quality matches: {similarTradeInsights.highQualityMatches}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 sm:p-6 sm:pt-0">
            {similarTradeMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No similar historical trades yet. Keep logging checklist-based trades and this workspace will get sharper over time.
              </p>
            ) : (
              similarTradeMatches.map(({ trade, score, maxScore, matchedFields, matchStrength }) => (
                <div key={trade.id} className="rounded-lg border border-border bg-background/80 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{trade.symbol} • {trade.setupName}</p>
                        <Badge
                          variant="outline"
                          className={
                            matchStrength === 'High'
                              ? 'border-green-500/40 text-green-400'
                              : matchStrength === 'Medium'
                              ? 'border-yellow-500/40 text-yellow-400'
                              : 'border-muted text-muted-foreground'
                          }
                        >
                          {matchStrength}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {trade.date} • {trade.tradeResult} • matched: {matchedFields.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Score</p>
                        <p className="text-lg font-bold text-primary">{score}/{maxScore}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMatchedTradeId(trade.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>PnL: <span className={trade.pnlBase >= 0 ? 'text-green-400' : 'text-red-400'}>{baseCurrencySymbol}{trade.pnlBase.toFixed(2)}</span></span>
                    <span>Trend: {trade.marketTrend || '—'}</span>
                    <span>Type: {trade.setupType || '—'}</span>
                    <span>TF: {trade.timeFrame || '—'}</span>
                    <span>Open: {trade.marketOpenType || '—'}</span>
                    <span>1st Candle: {trade.firstFiveMinuteCandleType || '—'}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(selectedMatchedTrade)} onOpenChange={(open) => !open && setSelectedMatchedTradeId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedMatchedTrade ? `${selectedMatchedTrade.trade.symbol} • ${selectedMatchedTrade.trade.setupName}` : 'Matched Trade'}
              </DialogTitle>
            </DialogHeader>
            {selectedMatchedTrade ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="mt-1 font-semibold">{selectedMatchedTrade.trade.date}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Result</p>
                    <p className="mt-1 font-semibold">{selectedMatchedTrade.trade.tradeResult}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Weighted Score</p>
                    <p className="mt-1 font-semibold text-primary">{selectedMatchedTrade.score}/{selectedMatchedTrade.maxScore}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">P&amp;L</p>
                    <p className={`mt-1 font-semibold ${selectedMatchedTrade.trade.pnlBase >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {baseCurrencySymbol}{selectedMatchedTrade.trade.pnlBase.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground">Market Trend</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.marketTrend || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Setup Type</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.setupType || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Volume</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.volumeProfile || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">EMA Touch</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.emaTouch === undefined ? '—' : selectedMatchedTrade.trade.emaTouch ? 'Yes' : 'No'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Timeframe</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.timeFrame || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Risk-Reward</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.riskRewardRatio?.toFixed(2) || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Market Open</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.marketOpenType || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">First 5-Min Candle</p><p className="mt-1 text-sm font-medium">{selectedMatchedTrade.trade.firstFiveMinuteCandleType || '—'}</p></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Matched Fields</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMatchedTrade.matchedFields.map((field) => (
                      <Badge key={field} variant="outline">{field}</Badge>
                    ))}
                  </div>
                </div>
                {selectedMatchedTrade.trade.beforeTradeScreenshot || selectedMatchedTrade.trade.afterExitScreenshot ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {selectedMatchedTrade.trade.beforeTradeScreenshot ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Before Trade Screenshot</p>
                        <div className="mt-2">
                          <ScreenshotViewer
                            imageUrl={selectedMatchedTrade.trade.beforeTradeScreenshot}
                            title={`${selectedMatchedTrade.trade.symbol} before trade`}
                          />
                        </div>
                      </div>
                    ) : null}
                    {selectedMatchedTrade.trade.afterExitScreenshot ? (
                      <div>
                        <p className="text-xs text-muted-foreground">After Exit Screenshot</p>
                        <div className="mt-2">
                          <ScreenshotViewer
                            imageUrl={selectedMatchedTrade.trade.afterExitScreenshot}
                            title={`${selectedMatchedTrade.trade.symbol} after exit`}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {(selectedMatchedTrade.trade.preNotes || selectedMatchedTrade.trade.postNotes) ? (
                  <div className="space-y-3">
                    {selectedMatchedTrade.trade.preNotes ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Pre-Trade Notes</p>
                        <p className="mt-1 text-sm text-foreground">{selectedMatchedTrade.trade.preNotes}</p>
                      </div>
                    ) : null}
                    {selectedMatchedTrade.trade.postNotes ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Post-Trade Notes</p>
                        <p className="mt-1 text-sm text-foreground">{selectedMatchedTrade.trade.postNotes}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
