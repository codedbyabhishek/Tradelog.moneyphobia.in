'use client';

import { useState } from 'react';
import { useIdeas } from '@/lib/ideas-context';
import { TradeIdea, IdeaStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Lightbulb, Search, Filter, Pencil, Trash2, ChevronDown, ChevronUp, FlaskConical, CheckCircle2, XCircle, Archive, Star } from 'lucide-react';
import { ScreenshotViewer } from '@/components/screenshot-viewer';
import IdeaForm from './idea-form';

const STATUS_CONFIG: Record<IdeaStatus, { label: string; color: string; icon: typeof Lightbulb }> = {
  idea: { label: 'Idea', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Lightbulb },
  backtesting: { label: 'Backtesting', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', icon: FlaskConical },
  validated: { label: 'Validated', color: 'bg-green-500/10 text-green-400 border-green-500/30', icon: CheckCircle2 },
  invalidated: { label: 'Invalidated', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: XCircle },
  archived: { label: 'Archived', color: 'bg-muted text-muted-foreground border-border', icon: Archive },
};

const OUTCOME_COLORS = {
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  failure: 'bg-red-500/10 text-red-400 border-red-500/30',
  partial: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  pending: 'bg-muted text-muted-foreground border-border',
};

export default function IdeasList() {
  const { ideas, deleteIdea, updateIdea } = useIdeas();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<TradeIdea | null>(null);

  if (editingIdea) {
    return (
      <IdeaForm
        editIdea={editingIdea}
        onSuccess={() => setEditingIdea(null)}
      />
    );
  }

  const filtered = ideas.filter(idea => {
    const matchesSearch = search === '' ||
      idea.name.toLowerCase().includes(search.toLowerCase()) ||
      idea.setup.toLowerCase().includes(search.toLowerCase()) ||
      (idea.symbol && idea.symbol.toLowerCase().includes(search.toLowerCase())) ||
      (idea.tags && idea.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || idea.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = ideas.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 overflow-auto min-h-screen flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Trade Ideas & Backtesting</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Log trade ideas and backtesting results. These are independent of your live trades and do not affect P&L.
          </p>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
          {(Object.entries(STATUS_CONFIG) as [IdeaStatus, typeof STATUS_CONFIG[IdeaStatus]][]).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(prev => prev === status ? 'all' : status)}
                className={`p-3 rounded-lg border transition-colors flex items-center gap-2 ${
                  statusFilter === status ? 'ring-2 ring-primary' : ''
                } ${config.color}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-medium">{config.label}</p>
                  <p className="text-lg font-bold">{statusCounts[status] || 0}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas by name, symbol, setup, or tag..."
              className="w-full pl-10 pr-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {statusFilter !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')} className="flex-shrink-0">
              <Filter className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Ideas List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {ideas.length === 0
                ? 'No trade ideas yet. Click "Add Idea" to get started!'
                : 'No ideas match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((idea) => {
              const config = STATUS_CONFIG[idea.status];
              const StatusIcon = config.icon;
              const isExpanded = expandedId === idea.id;

              return (
                <Card key={idea.id} className="bg-card border-border">
                  <CardHeader className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : idea.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <CardTitle className="text-base sm:text-lg">{idea.name}</CardTitle>
                          {idea.symbol && (
                            <Badge variant="outline" className="text-xs">{idea.symbol}</Badge>
                          )}
                          {idea.isFavorite && (
                            <Badge className="border border-amber-500/30 bg-amber-500/10 text-xs text-amber-400">
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              Favorite
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs border ${config.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          {idea.outcome && (
                            <Badge className={`text-xs border ${OUTCOME_COLORS[idea.outcome]}`}>
                              {idea.outcome.charAt(0).toUpperCase() + idea.outcome.slice(1)}
                            </Badge>
                          )}
                          {idea.timeFrame && (
                            <span className="text-xs text-muted-foreground">{idea.timeFrame}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(idea.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateIdea(idea.id, { ...idea, isFavorite: !idea.isFavorite });
                          }}
                          title={idea.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          className={idea.isFavorite ? 'text-amber-400 hover:text-amber-300' : ''}
                        >
                          <Star className={`w-4 h-4 ${idea.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setEditingIdea(idea); }}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              title="Delete"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete &quot;{idea.name}&quot;. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteIdea(idea.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="border-t border-border pt-4 space-y-4">
                        {/* Setup & Reasoning */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Setup</p>
                            <p className="text-sm text-foreground">{idea.setup}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Reasoning</p>
                            <p className="text-sm text-foreground">{idea.reasoning}</p>
                          </div>
                        </div>

                        {/* Entry & Exit Logic */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Entry Logic</p>
                            <p className="text-sm text-foreground">{idea.entryLogic}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Exit Logic</p>
                            <p className="text-sm text-foreground">{idea.exitLogic}</p>
                          </div>
                        </div>

                        {/* SL Logic */}
                        {idea.stopLossLogic && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Stop Loss Logic</p>
                            <p className="text-sm text-foreground">{idea.stopLossLogic}</p>
                          </div>
                        )}

                        {/* Backtest Data */}
                        {(idea.backtestWinRate || idea.backtestSampleSize || idea.backtestResults) && (
                          <div className="p-3 bg-secondary rounded-lg border border-border">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Backtest Results</p>
                            <div className="flex gap-4 flex-wrap mb-2">
                              {idea.backtestWinRate !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Win Rate</p>
                                  <p className="text-sm font-bold text-foreground">{idea.backtestWinRate}%</p>
                                </div>
                              )}
                              {idea.backtestSampleSize !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Sample Size</p>
                                  <p className="text-sm font-bold text-foreground">{idea.backtestSampleSize}</p>
                                </div>
                              )}
                            </div>
                            {idea.backtestResults && (
                              <p className="text-sm text-foreground">{idea.backtestResults}</p>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {idea.notes && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{idea.notes}</p>
                          </div>
                        )}

                        {/* Tags */}
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {idea.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Screenshot */}
                        {idea.screenshot && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Screenshot</p>
                            <ScreenshotViewer imageUrl={idea.screenshot} title={`${idea.name} - Screenshot`} />
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(idea.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
