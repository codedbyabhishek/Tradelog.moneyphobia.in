'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { useTrades } from '@/lib/trade-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trade } from '@/lib/types';
import { Trash2, Eye, Filter, Star, Pencil, Upload, X } from 'lucide-react';
import { CURRENCY_SYMBOLS, getTradeOutcome } from '@/lib/trade-utils';
import { ScreenshotViewer } from './screenshot-viewer';
import { useToast } from '@/hooks/use-toast';
import { validateImageFile } from '@/lib/validation';
import { FIB_LEVEL_OPTIONS, PRESET_SETUPS } from './trade-form';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { EmptyStateIllustration } from './brand-illustrations';

function isBrokerSyncedTrade(trade: Trade) {
  return trade.id.startsWith('dhan:');
}

function isJournalEnrichedTrade(trade: Trade) {
  return Boolean(
    trade.tags?.length ||
    trade.beforeTradeScreenshot ||
      trade.afterExitScreenshot ||
      trade.preNotes?.trim() ||
      trade.postNotes?.trim() ||
      (trade.setupName && !trade.setupName.startsWith('Dhan Sync')) ||
      trade.limit ||
      trade.exit
  );
}

export default function TradeLog() {
  const { trades, deleteTrade, updateTrade } = useTrades();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editSetupName, setEditSetupName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editTimeFrame, setEditTimeFrame] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editExit, setEditExit] = useState('');
  const [editIsCustomSetup, setEditIsCustomSetup] = useState(false);
  const [editPreNotes, setEditPreNotes] = useState('');
  const [editPostNotes, setEditPostNotes] = useState('');
  const [editBeforeScreenshot, setEditBeforeScreenshot] = useState<string | null>(null);
  const [editAfterScreenshot, setEditAfterScreenshot] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'pnl'>('date');
  const [filterSetup, setFilterSetup] = useState('All');
  const { toast } = useToast();

  const setupNames = useMemo(() => {
    return ['All', ...new Set(trades.map(t => t.setupName))];
  }, [trades]);

  const filteredAndSortedTrades = useMemo(() => {
    let filtered = filterSetup === 'All' ? trades : trades.filter(t => t.setupName === filterSetup);

    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.pnl - a.pnl;
      }
    });
  }, [trades, sortBy, filterSetup]);

  const openEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setEditSetupName(trade.setupName || '');
    setEditTags(trade.tags?.join(', ') || '');
    setEditTimeFrame(trade.timeFrame || '');
    setEditLimit(trade.limit || '');
    setEditExit(trade.exit || '');
    setEditIsCustomSetup(!PRESET_SETUPS.includes((trade.setupName || '') as (typeof PRESET_SETUPS)[number]));
    setEditPreNotes(trade.preNotes || '');
    setEditPostNotes(trade.postNotes || '');
    setEditBeforeScreenshot(trade.beforeTradeScreenshot || null);
    setEditAfterScreenshot(trade.afterExitScreenshot || null);
  };

  const closeEditTrade = () => {
    setEditingTrade(null);
    setEditSetupName('');
    setEditTags('');
    setEditTimeFrame('');
    setEditLimit('');
    setEditExit('');
    setEditIsCustomSetup(false);
    setEditPreNotes('');
    setEditPostNotes('');
    setEditBeforeScreenshot(null);
    setEditAfterScreenshot(null);
  };

  const handleEditScreenshot = (type: 'before' | 'after') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid image',
        description: validation.error ?? 'Please upload a valid screenshot (JPEG, PNG, WebP, max 5MB).',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === 'before') {
        setEditBeforeScreenshot(result);
      } else {
        setEditAfterScreenshot(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditSetupPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__custom__') {
      setEditIsCustomSetup(true);
      setEditSetupName('');
      return;
    }

    setEditIsCustomSetup(false);
    setEditSetupName(selected);
  };

  const handleSaveTradeEdits = () => {
    if (!editingTrade) return;

    const updatedTrade: Trade = {
      ...editingTrade,
      tags: Array.from(new Set(editTags.split(',').map((tag) => tag.trim()).filter(Boolean))),
      setupName: editSetupName.trim() || editingTrade.setupName,
      timeFrame: editTimeFrame.trim() || undefined,
      limit: editLimit || undefined,
      exit: editExit || undefined,
      preNotes: editPreNotes,
      postNotes: editPostNotes,
      beforeTradeScreenshot: editBeforeScreenshot || undefined,
      afterExitScreenshot: editAfterScreenshot || undefined,
    };

    updateTrade(editingTrade.id, updatedTrade);
    setSelectedTrade((current) => (current?.id === updatedTrade.id ? updatedTrade : current));
    closeEditTrade();
    toast({
      title: 'Trade Updated',
      description: 'Your trade details, Fibonacci levels, notes, and screenshots were saved.',
    });
  };

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6 min-w-0">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Trade Log</h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">View and manage all your trades</p>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select
            value={filterSetup}
            onChange={e => setFilterSetup(e.target.value)}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {setupNames.map(setup => (
              <option key={setup} value={setup}>
                {setup}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground flex-shrink-0">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'date' | 'pnl')}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="date">Date (Newest)</option>
            <option value="pnl">P&L (Highest)</option>
          </select>
        </div>

        <span className="text-sm text-muted-foreground">{filteredAndSortedTrades.length} trades</span>
      </div>

      {/* Table/Cards */}
      {filteredAndSortedTrades.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 sm:p-12 text-center">
            <Empty className="border-0 p-0">
              <EmptyStateIllustration />
              <EmptyHeader>
                <EmptyTitle>No trades found</EmptyTitle>
                <EmptyDescription>
                  Add your first trade, sync Dhan history, or change the current filter to start reviewing entries.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Structured review starts here</p>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block w-full min-w-0">
            <Card className="bg-card border-border overflow-hidden">
              <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary">
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Date</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Day</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Symbol</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Setup</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Pos</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Entry</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Exit</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Net P&L</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">R</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">W/L</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Conf</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Fav</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Act</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTrades.map(trade => (
                    <tr key={trade.id} className="border-b border-border hover:bg-secondary transition-colors">
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground">{trade.date}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">{trade.dayOfWeek.slice(0, 3)}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{trade.symbol}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground max-w-[260px]" title={trade.setupName}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate">{trade.setupName}</span>
                          {isBrokerSyncedTrade(trade) && (
                            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                              Dhan Synced
                            </span>
                          )}
                          {isJournalEnrichedTrade(trade) && (
                            <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                              Journal Enriched
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${trade.position === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.position === 'Buy' ? 'B' : 'S'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right text-foreground">{trade.entryPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.entryPrice.toFixed(2)}` : 'N/A'}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right text-foreground">{trade.exitPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.exitPrice.toFixed(2)}` : 'N/A'}</td>
                      <td className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {CURRENCY_SYMBOLS[trade.currency] || '$'}{trade.pnl.toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right text-foreground">{trade.rFactor.toFixed(2)}R</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center">
                        {/* W/L derived from P&L, not deprecated isWin field */}
                        <span className={`text-xs font-semibold ${
                          getTradeOutcome(trade.pnl) === 'W' ? 'text-green-400' : 
                          getTradeOutcome(trade.pnl) === 'L' ? 'text-red-400' : 
                          'text-yellow-400'
                        }`}>
                          {getTradeOutcome(trade.pnl)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm text-foreground">{trade.confidence}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center">
                        <button
                          type="button"
                          onClick={() => updateTrade(trade.id, { ...trade, isFavorite: !trade.isFavorite })}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            trade.isFavorite
                              ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                          aria-label={trade.isFavorite ? 'Remove trade from favorites' : 'Add trade to favorites'}
                          title={trade.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`h-4 w-4 ${trade.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button onClick={() => setSelectedTrade(trade)} className="text-primary hover:text-primary/80 transition-colors p-1" title="View">
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={() => openEditTrade(trade)} className="text-blue-400 hover:text-blue-300 transition-colors p-1" title="Edit">
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={() => deleteTrade(trade.id)} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden space-y-2 sm:space-y-3">
            {filteredAndSortedTrades.map(trade => (
              <Card key={trade.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground text-lg">{trade.symbol}</p>
                        {trade.isFavorite && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                            <Star className="mr-1 h-3 w-3 fill-current" />
                            Favorite
                          </span>
                        )}
                        {isBrokerSyncedTrade(trade) && (
                          <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                            Dhan Synced
                          </span>
                        )}
                        {isJournalEnrichedTrade(trade) && (
                          <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-400">
                            Journal Enriched
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{trade.date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${trade.position === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.position}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Entry</p>
                      <p className="font-semibold text-foreground truncate">{trade.entryPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.entryPrice.toFixed(2)}` : 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Exit</p>
                      <p className="font-semibold text-foreground truncate">{trade.exitPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.exitPrice.toFixed(2)}` : 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Setup</p>
                      <p className="font-semibold text-foreground text-xs truncate" title={trade.setupName}>{trade.setupName}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="font-semibold text-foreground">{trade.confidence}/10</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Net P&L ({trade.currency || 'USD'})</p>
                      <p className={`font-bold text-sm truncate ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {CURRENCY_SYMBOLS[trade.currency] || '$'}{trade.pnl.toFixed(2)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">R-Factor</p>
                      <p className="font-bold text-sm text-primary">{trade.rFactor.toFixed(2)}R</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Result</p>
                      {/* W/L derived from P&L */}
                      <p className={`font-bold text-sm ${
                        getTradeOutcome(trade.pnl) === 'W' ? 'text-green-400' : 
                        getTradeOutcome(trade.pnl) === 'L' ? 'text-red-400' : 
                        'text-yellow-400'
                      }`}>
                        {getTradeOutcome(trade.pnl) === 'W' ? 'Win' : 
                         getTradeOutcome(trade.pnl) === 'L' ? 'Loss' : 
                         'Break-Even'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => updateTrade(trade.id, { ...trade, isFavorite: !trade.isFavorite })}
                      className={`flex-1 flex items-center justify-center gap-1 transition-colors py-2 ${
                        trade.isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      type="button"
                    >
                      <Star className={`w-4 h-4 ${trade.isFavorite ? 'fill-current' : ''}`} />
                      <span className="text-xs font-medium">{trade.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                    </button>
                    <button onClick={() => setSelectedTrade(trade)} className="flex-1 flex items-center justify-center gap-1 text-primary hover:text-primary/80 transition-colors py-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-medium">Details</span>
                    </button>
                    <button onClick={() => openEditTrade(trade)} className="flex-1 flex items-center justify-center gap-1 text-blue-400 hover:text-blue-300 transition-colors py-2">
                      <Pencil className="w-4 h-4" />
                      <span className="text-xs font-medium">Edit</span>
                    </button>
                    <button onClick={() => deleteTrade(trade.id)} className="flex-1 flex items-center justify-center gap-1 text-red-400 hover:text-red-300 transition-colors py-2">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Delete</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal - Accessible overlay with proper focus management */}
      {selectedTrade && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-auto"
          onClick={() => setSelectedTrade(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-detail-title"
        >
          {/* Modal content with proper overflow handling */}
          <Card
            className="bg-card border-border w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header with close button */}
            <CardHeader className="sticky top-0 bg-card border-b border-border p-3 sm:p-4 lg:p-6 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle id="trade-detail-title" className="text-lg sm:text-xl lg:text-2xl break-words">
                      {selectedTrade.symbol} - {selectedTrade.tradeType}
                    </CardTitle>
                    {isBrokerSyncedTrade(selectedTrade) && (
                      <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                        Dhan Synced
                      </span>
                    )}
                    {isJournalEnrichedTrade(selectedTrade) && (
                      <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-400">
                        Journal Enriched
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs sm:text-sm mt-1">{selectedTrade.date}</CardDescription>
                </div>
                {/* Accessible close button */}
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Close trade details"
                  type="button"
                >
                  <span className="text-xl leading-none">✕</span>
                </button>
              </div>
            </CardHeader>
            {/* Scrollable content area */}
            <CardContent className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
              {/* Trade Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className={`text-lg font-bold ${selectedTrade.position === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>{selectedTrade.position}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Setup Name</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.setupName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Frame</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.timeFrame || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Limit (Fibonacci)</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.limit || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exit (Fibonacci)</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.exit || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.currency || 'USD'} ({CURRENCY_SYMBOLS[selectedTrade.currency] || '$'})</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entry Price</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.entryPrice ? `${CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}${selectedTrade.entryPrice.toFixed(2)}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exit Price</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.exitPrice ? `${CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}${selectedTrade.exitPrice.toFixed(2)}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stop Loss</p>
                  <p className="text-lg font-bold text-foreground">{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.stopLoss.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fees</p>
                  <p className="text-lg font-bold text-foreground">{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.fees.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.confidence}/10</p>
                </div>
              </div>

              {/* Results - shows currency and auto-derived outcome */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-secondary rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Net P&L ({selectedTrade.currency || 'USD'})</p>
                  <p className={`text-2xl font-bold ${selectedTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.pnl.toFixed(2)}
                  </p>
                  {selectedTrade.fees > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Gross: <span className={(selectedTrade.pnl + selectedTrade.fees) >= 0 ? 'text-green-400' : 'text-red-400'}>{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{(selectedTrade.pnl + selectedTrade.fees).toFixed(2)}</span>
                      {' '} | Charges: <span className="text-orange-400">-{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.fees.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">R-Factor</p>
                  <p className="text-2xl font-bold text-primary">{selectedTrade.rFactor.toFixed(2)}R</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outcome (Auto)</p>
                  <p className={`text-2xl font-bold ${
                    getTradeOutcome(selectedTrade.pnl) === 'W' ? 'text-green-400' : 
                    getTradeOutcome(selectedTrade.pnl) === 'L' ? 'text-red-400' : 
                    'text-yellow-400'
                  }`}>
                    {getTradeOutcome(selectedTrade.pnl) === 'W' ? 'Win' : 
                     getTradeOutcome(selectedTrade.pnl) === 'L' ? 'Loss' : 
                     'Break-Even'}
                  </p>
                </div>
                {selectedTrade.exitRFactor !== undefined && (
                  <div className="col-span-full">
                    <p className="text-xs text-muted-foreground">Exit R Multiple</p>
                    <p className={`text-2xl font-bold ${selectedTrade.exitRFactor > 0 ? 'text-green-400' : selectedTrade.exitRFactor < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {selectedTrade.exitRFactor > 0 ? '+' : ''}{selectedTrade.exitRFactor.toFixed(2)}R
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedTrade.tags && selectedTrade.tags.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Trade Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrade.tags.map((tag) => (
                      <span key={tag} className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTrade.preNotes && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Pre-Trade Notes</p>
                  <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg">{selectedTrade.preNotes}</p>
                </div>
              )}

              {selectedTrade.postNotes && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Post-Trade Notes</p>
                  <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg">{selectedTrade.postNotes}</p>
                </div>
              )}

              {/* Mistake Tag */}
              {selectedTrade.mistakeTag && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Mistake Tag</p>
                  <span className="inline-block px-3 py-1 bg-destructive/20 text-destructive rounded-full text-sm font-medium">
                    {selectedTrade.mistakeTag}
                  </span>
                </div>
              )}

              {/* Screenshots */}
              {(selectedTrade.beforeTradeScreenshot || selectedTrade.afterExitScreenshot) && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Trade Screenshots</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTrade.beforeTradeScreenshot && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Before Trade</p>
                        <ScreenshotViewer imageUrl={selectedTrade.beforeTradeScreenshot} title="Before Trade Screenshot" />
                      </div>
                    )}
                    {selectedTrade.afterExitScreenshot && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">After Exit</p>
                        <ScreenshotViewer imageUrl={selectedTrade.afterExitScreenshot} title="After Exit Screenshot" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button onClick={() => setSelectedTrade(null)} className="w-full bg-primary hover:bg-primary/90">
                Close
              </Button>
              <Button onClick={() => openEditTrade(selectedTrade)} variant="outline" className="w-full">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Trade
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {editingTrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/60 p-2 sm:p-4"
          onClick={closeEditTrade}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-trade-title"
        >
          <Card
            className="my-auto flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="sticky top-0 flex-shrink-0 border-b border-border bg-card p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle id="edit-trade-title" className="text-xl">Edit Trade</CardTitle>
                  <CardDescription className="mt-1">
                    Update notes and screenshots for {editingTrade.symbol} on {editingTrade.date}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={closeEditTrade}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Close edit trade modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trade</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{editingTrade.symbol}</p>
                  <p className="text-sm text-muted-foreground">{editingTrade.setupName}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Imported / Manual</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {isBrokerSyncedTrade(editingTrade) ? 'Dhan Synced Trade' : 'Manual Trade'}
                  </p>
                  <p className="text-sm text-muted-foreground">Editing here does not change broker sync credentials.</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Journal Status</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {isJournalEnrichedTrade(editingTrade) ? 'Journal Enriched' : 'Base Import'}
                  </p>
                  <p className="text-sm text-muted-foreground">Notes, setup labels, fib levels, and screenshots count as enrichment.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Setup Name</label>
                  <div className="space-y-2">
                    <select
                      value={
                        editIsCustomSetup
                          ? '__custom__'
                          : PRESET_SETUPS.includes(editSetupName as (typeof PRESET_SETUPS)[number])
                            ? editSetupName
                            : ''
                      }
                      onChange={handleEditSetupPresetChange}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a setup</option>
                      {PRESET_SETUPS.map((setup) => (
                        <option key={setup} value={setup}>
                          {setup}
                        </option>
                      ))}
                      <option value="__custom__">Custom setup...</option>
                    </select>
                    {editIsCustomSetup && (
                      <input
                        type="text"
                        value={editSetupName}
                        onChange={(e) => setEditSetupName(e.target.value)}
                        placeholder="Type your custom setup name"
                        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Time Frame</label>
                  <input
                    type="text"
                    value={editTimeFrame}
                    onChange={(e) => setEditTimeFrame(e.target.value)}
                    placeholder="e.g. 5m, 15m, 1h"
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Trade Tags</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="e.g. A+, breakout, revenge, news"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Limit (Fibonacci Level)</label>
                  <select
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Fibonacci Level</option>
                    {FIB_LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Exit (Fibonacci Level)</label>
                  <select
                    value={editExit}
                    onChange={(e) => setEditExit(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Fibonacci Exit Level</option>
                    {FIB_LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Pre-Trade Notes</label>
                <textarea
                  value={editPreNotes}
                  onChange={(e) => setEditPreNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add notes about the setup, context, and plan..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Post-Trade Notes</label>
                <textarea
                  value={editPostNotes}
                  onChange={(e) => setEditPostNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add review notes, mistakes, or lessons learned..."
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground">Before Trade Screenshot</label>
                    {editBeforeScreenshot && (
                      <button
                        type="button"
                        onClick={() => setEditBeforeScreenshot(null)}
                        className="text-xs text-red-400 transition-colors hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    <Upload className="h-4 w-4" />
                    Upload before-trade image
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditScreenshot('before')} />
                  </label>
                  {editBeforeScreenshot && (
                    <ScreenshotViewer imageUrl={editBeforeScreenshot} title="Before Trade Screenshot">
                      <button type="button" className="w-full overflow-hidden rounded-lg border border-border">
                        <Image
                          src={editBeforeScreenshot}
                          alt="Before trade"
                          width={1200}
                          height={800}
                          unoptimized
                          className="max-h-56 w-full object-cover"
                        />
                      </button>
                    </ScreenshotViewer>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground">After Exit Screenshot</label>
                    {editAfterScreenshot && (
                      <button
                        type="button"
                        onClick={() => setEditAfterScreenshot(null)}
                        className="text-xs text-red-400 transition-colors hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    <Upload className="h-4 w-4" />
                    Upload after-exit image
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditScreenshot('after')} />
                  </label>
                  {editAfterScreenshot && (
                    <ScreenshotViewer imageUrl={editAfterScreenshot} title="After Exit Screenshot">
                      <button type="button" className="w-full overflow-hidden rounded-lg border border-border">
                        <Image
                          src={editAfterScreenshot}
                          alt="After exit"
                          width={1200}
                          height={800}
                          unoptimized
                          className="max-h-56 w-full object-cover"
                        />
                      </button>
                    </ScreenshotViewer>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeEditTrade}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveTradeEdits}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
