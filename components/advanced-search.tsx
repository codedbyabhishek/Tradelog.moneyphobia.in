'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { CheckboxItem } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, Save, Trash2, X } from 'lucide-react';
import {
  TradeFilters,
  FilterPreset,
  applyFilters,
  saveFilterPreset,
  getFilterPresets,
  deleteFilterPreset,
} from '@/lib/advanced-filters';

interface AdvancedSearchProps {
  trades: any[];
  onFiltersChange: (filtered: any[]) => void;
  allSetups: string[];
  allSymbols: string[];
  allEmotions: string[];
}

export function AdvancedSearch({
  trades,
  onFiltersChange,
  allSetups,
  allSymbols,
  allEmotions,
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<TradeFilters>({});
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    loadPresets();
  }, []);

  useEffect(() => {
    const filtered = applyFilters(trades, filters);
    onFiltersChange(filtered);
  }, [filters, trades]);

  async function loadPresets() {
    const loaded = await getFilterPresets();
    setPresets(loaded);
  }

  function handleFilterChange(newFilters: Partial<TradeFilters>) {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }

  function clearFilters() {
    setFilters({});
  }

  async function handleSavePreset() {
    if (!presetName.trim()) return;

    await saveFilterPreset({
      name: presetName,
      filters,
    });

    setPresetName('');
    setShowSavePreset(false);
    loadPresets();
  }

  async function handleDeletePreset(presetId: string) {
    await deleteFilterPreset(presetId);
    loadPresets();
  }

  function handleLoadPreset(preset: FilterPreset) {
    setFilters(preset.filters);
  }

  const activeFilterCount = Object.values(filters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return v !== undefined;
  }).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Advanced Search
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Trade Search</DialogTitle>
          <DialogDescription>
            Filter and search trades by multiple criteria
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="filters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="presets">Saved Presets</TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-4">
            {/* Search Text */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search symbol, setup, notes..."
                  className="pl-8"
                  value={filters.searchText || ''}
                  onChange={(e) =>
                    handleFilterChange({ searchText: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      dateRange: {
                        start: e.target.value,
                        end: filters.dateRange?.end || '',
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      dateRange: {
                        start: filters.dateRange?.start || '',
                        end: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Symbols */}
            <div className="space-y-2">
              <Label>Symbols</Label>
              <div className="grid grid-cols-3 gap-2">
                {allSymbols.map((symbol) => (
                  <div key={symbol} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`symbol-${symbol}`}
                      checked={filters.symbols?.includes(symbol) || false}
                      onChange={(e) => {
                        const current = filters.symbols || [];
                        handleFilterChange({
                          symbols: e.target.checked
                            ? [...current, symbol]
                            : current.filter((s) => s !== symbol),
                        });
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`symbol-${symbol}`} className="text-sm">
                      {symbol}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Setups */}
            <div className="space-y-2">
              <Label>Trading Setups</Label>
              <div className="grid grid-cols-2 gap-2">
                {allSetups.map((setup) => (
                  <div key={setup} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`setup-${setup}`}
                      checked={filters.setups?.includes(setup) || false}
                      onChange={(e) => {
                        const current = filters.setups || [];
                        handleFilterChange({
                          setups: e.target.checked
                            ? [...current, setup]
                            : current.filter((s) => s !== setup),
                        });
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`setup-${setup}`} className="text-sm">
                      {setup}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* P&L Range */}
            <div className="space-y-2">
              <Label>P&L Range ($)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="number"
                    placeholder="Min P&L"
                    value={filters.minPnL || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        minPnL: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max P&L"
                    value={filters.maxPnL || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        maxPnL: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Win/Loss */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="win-only"
                  checked={filters.winOnly || false}
                  onChange={(e) =>
                    handleFilterChange({ winOnly: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="win-only" className="text-sm">
                  Winning Trades Only
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="loss-only"
                  checked={filters.lossOnly || false}
                  onChange={(e) =>
                    handleFilterChange({ lossOnly: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="loss-only" className="text-sm">
                  Losing Trades Only
                </label>
              </div>
            </div>

            {/* Emotions */}
            <div className="space-y-2">
              <Label>Emotions</Label>
              <div className="grid grid-cols-2 gap-2">
                {allEmotions.map((emotion) => (
                  <div key={emotion} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`emotion-${emotion}`}
                      checked={filters.emotions?.includes(emotion) || false}
                      onChange={(e) => {
                        const current = filters.emotions || [];
                        handleFilterChange({
                          emotions: e.target.checked
                            ? [...current, emotion]
                            : current.filter((em) => em !== emotion),
                        });
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`emotion-${emotion}`} className="text-sm">
                      {emotion}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <Dialog open={showSavePreset} onOpenChange={setShowSavePreset}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={activeFilterCount === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Preset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Filter Preset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Preset name (e.g., 'Winning Setups')"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                    />
                    <Button onClick={handleSavePreset} className="w-full">
                      Save Preset
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4">
            {presets.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">
                No saved presets yet. Create filters and save them for quick reuse.
              </p>
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{preset.name}</h4>
                      <p className="text-xs text-gray-500">
                        Created {new Date(preset.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLoadPreset(preset)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePreset(preset.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
