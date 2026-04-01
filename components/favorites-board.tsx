'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useIdeas } from '@/lib/ideas-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CURRENCY_SYMBOLS, getTradeOutcome } from '@/lib/trade-utils';
import { Lightbulb, Star, TrendingUp } from 'lucide-react';
import { ScreenshotViewer } from './screenshot-viewer';

function formatIdeaDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function FavoriteTradeCard({
  trade,
  onToggle,
}: {
  trade: ReturnType<typeof useTrades>['trades'][number];
  onToggle: () => void;
}) {
  const imageUrl = trade.afterExitScreenshot || trade.beforeTradeScreenshot;
  const outcome = getTradeOutcome(trade.pnl);

  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-[#09090f] text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        {imageUrl ? (
          <ScreenshotViewer imageUrl={imageUrl} title={`${trade.symbol} favorite trade`}>
            <button
              type="button"
              className="h-full w-full cursor-zoom-in"
              aria-label={`Zoom ${trade.symbol} favorite trade image`}
            >
              <Image
                src={imageUrl}
                alt={`${trade.symbol} chart`}
                width={1200}
                height={750}
                unoptimized
                className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
          </ScreenshotViewer>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_38%),linear-gradient(135deg,rgba(39,39,42,1),rgba(9,9,11,1))]" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Badge className="border-amber-400/30 bg-amber-300/15 text-[11px] text-amber-200">
            {trade.setupName}
          </Badge>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onToggle}
            className="h-8 w-8 rounded-full bg-black/35 text-amber-300 hover:bg-black/55 hover:text-amber-200"
          >
            <Star className="h-4 w-4 fill-current" />
          </Button>
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-wide text-zinc-100">{trade.symbol}</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{trade.date}</p>
          </div>
          <Badge className={outcome === 'W' ? 'bg-emerald-500/15 text-emerald-300' : outcome === 'L' ? 'bg-red-500/15 text-red-300' : 'bg-yellow-500/15 text-yellow-300'}>
            {outcome === 'W' ? 'Win' : outcome === 'L' ? 'Loss' : 'Break-even'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Net P&L</p>
            <p className={`mt-1 font-semibold ${trade.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {CURRENCY_SYMBOLS[trade.currency] || '$'}{trade.pnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">R Factor</p>
            <p className="mt-1 font-semibold text-sky-300">{trade.rFactor.toFixed(2)}R</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FavoriteIdeaCard({
  idea,
  onToggle,
  onOpen,
}: {
  idea: ReturnType<typeof useIdeas>['ideas'][number];
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-[#0b0b12] text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        className="relative min-h-[210px] w-full overflow-hidden p-4 text-left cursor-pointer"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_30%),linear-gradient(135deg,rgba(24,24,27,1),rgba(9,9,11,1))]" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge className="border-sky-400/30 bg-sky-300/15 text-[11px] text-sky-200">
                {idea.status}
              </Badge>
              <div>
                <p className="text-lg font-semibold text-zinc-50">{idea.name}</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  {idea.symbol || 'Trade Idea'} • {formatIdeaDate(idea.createdAt)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="h-8 w-8 rounded-full bg-black/35 text-amber-300 hover:bg-black/55 hover:text-amber-200"
            >
              <Star className="h-4 w-4 fill-current" />
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Setup</p>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-100">{idea.setup}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Thesis</p>
            <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{idea.reasoning}</p>
          </div>

          {idea.tags && idea.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {idea.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function EmptyFavoriteCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof TrendingUp;
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-2xl border border-dashed border-border/80 bg-card/40">
      <CardContent className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-full border border-border bg-secondary/50 p-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function FavoritesBoard() {
  const { trades, updateTrade } = useTrades();
  const { ideas, updateIdea } = useIdeas();
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  const favoriteTrades = useMemo(
    () =>
      trades
        .filter((trade) => trade.isFavorite)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6),
    [trades]
  );

  const favoriteIdeas = useMemo(
    () =>
      ideas
        .filter((idea) => idea.isFavorite)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [ideas]
  );

  const selectedIdea = useMemo(
    () => favoriteIdeas.find((idea) => idea.id === selectedIdeaId) || null,
    [favoriteIdeas, selectedIdeaId]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-2">
              <Star className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Favorite Trades</h2>
              <p className="text-sm text-muted-foreground">Pin your best executions so they stay visible like a strategy board.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {favoriteTrades.length > 0 ? (
              favoriteTrades.map((trade) => (
                <FavoriteTradeCard
                  key={trade.id}
                  trade={trade}
                  onToggle={() => updateTrade(trade.id, { ...trade, isFavorite: false })}
                />
              ))
            ) : (
              <>
                <EmptyFavoriteCard
                  icon={TrendingUp}
                  title="No favorite trades yet"
                  description="Open Trade Log and tap the star on the trades you want to keep on this board."
                />
                <EmptyFavoriteCard
                  icon={TrendingUp}
                  title="Build your pattern wall"
                  description="Use this space for your clean executions, A+ setups, or examples you want to review often."
                />
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-2">
              <Lightbulb className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Favorite Trade Ideas</h2>
              <p className="text-sm text-muted-foreground">Keep your strongest concepts and backtesting notes in one visual area.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {favoriteIdeas.length > 0 ? (
              favoriteIdeas.map((idea) => (
                <FavoriteIdeaCard
                  key={idea.id}
                  idea={idea}
                  onToggle={() => updateIdea(idea.id, { ...idea, isFavorite: false })}
                  onOpen={() => setSelectedIdeaId(idea.id)}
                />
              ))
            ) : (
              <>
                <EmptyFavoriteCard
                  icon={Lightbulb}
                  title="No favorite ideas yet"
                  description="Open Trade Ideas and star the setups, experiments, and backtests you want to keep front and center."
                />
                <EmptyFavoriteCard
                  icon={Lightbulb}
                  title="Create a visual research shelf"
                  description="This works well for breakout concepts, pattern notes, and ideas you want to compare side by side."
                />
              </>
            )}
          </div>
        </section>
      </div>

      <Dialog open={Boolean(selectedIdea)} onOpenChange={(open) => !open && setSelectedIdeaId(null)}>
        <DialogContent className="max-w-3xl">
          {selectedIdea ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedIdea.name}</DialogTitle>
                <DialogDescription>
                  {selectedIdea.symbol || 'Trade Idea'} • {selectedIdea.status} • {formatIdeaDate(selectedIdea.updatedAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-sky-400/30 bg-sky-300/15 text-sky-200">
                    {selectedIdea.status}
                  </Badge>
                  {selectedIdea.outcome ? (
                    <Badge variant="outline">{selectedIdea.outcome}</Badge>
                  ) : null}
                  {selectedIdea.timeFrame ? (
                    <Badge variant="outline">{selectedIdea.timeFrame}</Badge>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Setup</p>
                    <p className="mt-2 text-sm text-foreground">{selectedIdea.setup}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reasoning</p>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{selectedIdea.reasoning}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Entry Logic</p>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{selectedIdea.entryLogic}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Exit Logic</p>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{selectedIdea.exitLogic}</p>
                  </div>
                </div>

                {selectedIdea.stopLossLogic ? (
                  <div className="rounded-xl border border-border bg-card/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stop Loss Logic</p>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{selectedIdea.stopLossLogic}</p>
                  </div>
                ) : null}

                {selectedIdea.notes ? (
                  <div className="rounded-xl border border-border bg-card/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{selectedIdea.notes}</p>
                  </div>
                ) : null}

                {selectedIdea.backtestResults || selectedIdea.backtestWinRate !== undefined || selectedIdea.backtestSampleSize !== undefined ? (
                  <div className="rounded-xl border border-border bg-card/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Backtest</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-foreground">
                      {selectedIdea.backtestWinRate !== undefined ? <span>Win Rate: {selectedIdea.backtestWinRate}%</span> : null}
                      {selectedIdea.backtestSampleSize !== undefined ? <span>Sample: {selectedIdea.backtestSampleSize}</span> : null}
                    </div>
                    {selectedIdea.backtestResults ? (
                      <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{selectedIdea.backtestResults}</p>
                    ) : null}
                  </div>
                ) : null}

                {selectedIdea.tags && selectedIdea.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedIdea.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {selectedIdea.screenshot ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Screenshot</p>
                    <ScreenshotViewer imageUrl={selectedIdea.screenshot} title={`${selectedIdea.name} screenshot`}>
                      <button type="button" className="overflow-hidden rounded-xl border border-border">
                        <Image
                          src={selectedIdea.screenshot}
                          alt={`${selectedIdea.name} screenshot`}
                          width={1200}
                          height={800}
                          unoptimized
                          className="max-h-[320px] w-full object-cover"
                        />
                      </button>
                    </ScreenshotViewer>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
