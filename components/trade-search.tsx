'use client';

import { useState, useMemo } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useFilters } from '@/lib/filters-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trade, TradeOutcome, TradeFilter, EmotionTag } from '@/lib/types';
import { Trash2, Save, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function TradeSearch() {
  const { trades } = useTrades();
  const { filters, addFilter, deleteFilter, applyFilter } = useFilters();
  const [showNewFilter, setShowNewFilter] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [appliedFilterId, setAppliedFilterId] = useState<string | null>(null);
  const [tempFilter, setTempFilter] = useState<Partial<TradeFilter>>({
    symbols: [],
    setupNames: [],
    tradeTypes: [],
    currencyFilter: [],
    outcomeFilter: [],
    emotionTags: [],
  });

  const filteredTrades = useMemo(() => {
    if (!appliedFilterId) return trades;
    const filter = filters.find(f => f.id === appliedFilterId);
    if (!filter) return trades;
    return applyFilter(filter, trades);
  }, [trades, filters, appliedFilterId, applyFilter]);

  const symbols = Array.from(new Set(trades.map(t => t.symbol)));
  const setupNames = Array.from(new Set(trades.map(t => t.setupName)));
  const emotions: EmotionTag[] = ['Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'Frustrated', 'Revenge', 'FOMO', 'Neutral'];

  const handleSaveFilter = () => {
    if (!filterName || !filterName.trim()) {
      alert('Please enter a filter name');
      return;
    }

    const now = new Date().toISOString();
    const newFilter: TradeFilter = {
      id: generateId(),
      name: filterName,
      ...tempFilter,
      dateRange: tempFilter.dateRange,
      createdAt: now,
      updatedAt: now,
    } as TradeFilter;

    addFilter(newFilter);
    setFilterName('');
    setTempFilter({
      symbols: [],
      setupNames: [],
      tradeTypes: [],
      currencyFilter: [],
      outcomeFilter: [],
      emotionTags: [],
    });
    setShowNewFilter(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Search & Filter Trades</h1>
        <Button onClick={() => setShowNewFilter(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Filter
        </Button>
      </div>

      {/* Saved Filters */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Saved Filters</h2>
        {filters.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No saved filters yet. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map(filter => (
              <Card
                key={filter.id}
                className={`cursor-pointer transition-all ${appliedFilterId === filter.id ? 'border-primary' : ''}`}
                onClick={() => setAppliedFilterId(filter.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{filter.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFilter(filter.id);
                        if (appliedFilterId === filter.id) setAppliedFilterId(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {filter.symbols && filter.symbols.length > 0 && (
                    <div>
                      <span className="font-medium">Symbols:</span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {filter.symbols.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {filter.outcomeFilter && filter.outcomeFilter.length > 0 && (
                    <div>
                      <span className="font-medium">Outcomes:</span>
                      <div className="flex gap-1 mt-1">
                        {filter.outcomeFilter.map(o => <Badge key={o} variant="outline">{o}</Badge>)}
                      </div>
                    </div>
                  )}
                  {appliedFilterId === filter.id && (
                    <Badge className="bg-primary mt-2">Active</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Filtered Results */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Trades
            {appliedFilterId && <Badge className="ml-2">Filtered: {filteredTrades.length}</Badge>}
          </h2>
          {appliedFilterId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAppliedFilterId(null)}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {filteredTrades.length === 0 ? (
              <p className="text-muted-foreground">No trades found matching the filter criteria.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTrades.map(trade => (
                  <div key={trade.id} className="p-2 border rounded flex justify-between items-center">
                    <div>
                      <p className="font-medium">{trade.symbol} - {trade.setupName}</p>
                      <p className="text-sm text-muted-foreground">{trade.date} | {trade.tradeType}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </p>
                      <Badge variant={trade.pnl >= 0 ? 'default' : 'destructive'} className="text-xs">
                        {trade.rFactor.toFixed(2)}R
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Filter Dialog */}
      <Dialog open={showNewFilter} onOpenChange={setShowNewFilter}>
        <DialogContent className="max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Filter</DialogTitle>
            <DialogDescription>Save filter criteria for quick access later</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Filter Name</label>
              <Input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., Profitable Intraday Trades"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Symbols</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {symbols.map(symbol => (
                  <div key={symbol} className="flex items-center gap-2">
                    <Checkbox
                      checked={tempFilter.symbols?.includes(symbol) || false}
                      onCheckedChange={(checked) => {
                        const symbols = tempFilter.symbols || [];
                        if (checked) {
                          setTempFilter({ ...tempFilter, symbols: [...symbols, symbol] });
                        } else {
                          setTempFilter({ ...tempFilter, symbols: symbols.filter(s => s !== symbol) });
                        }
                      }}
                    />
                    <label className="text-sm cursor-pointer">{symbol}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Setups</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {setupNames.map(setup => (
                  <div key={setup} className="flex items-center gap-2">
                    <Checkbox
                      checked={tempFilter.setupNames?.includes(setup) || false}
                      onCheckedChange={(checked) => {
                        const setups = tempFilter.setupNames || [];
                        if (checked) {
                          setTempFilter({ ...tempFilter, setupNames: [...setups, setup] });
                        } else {
                          setTempFilter({ ...tempFilter, setupNames: setups.filter(s => s !== setup) });
                        }
                      }}
                    />
                    <label className="text-sm cursor-pointer">{setup}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Outcomes</label>
              <div className="space-y-2">
                {['W', 'L', 'BE'].map((outcome: any) => (
                  <div key={outcome} className="flex items-center gap-2">
                    <Checkbox
                      checked={tempFilter.outcomeFilter?.includes(outcome) || false}
                      onCheckedChange={(checked) => {
                        const outcomes = tempFilter.outcomeFilter || [];
                        if (checked) {
                          setTempFilter({ ...tempFilter, outcomeFilter: [...outcomes, outcome] });
                        } else {
                          setTempFilter({ ...tempFilter, outcomeFilter: outcomes.filter(o => o !== outcome) });
                        }
                      }}
                    />
                    <label className="text-sm cursor-pointer">
                      {outcome === 'W' ? 'Wins' : outcome === 'L' ? 'Losses' : 'Break-even'}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewFilter(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFilter} className="gap-2">
                <Save className="w-4 h-4" />
                Save Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
