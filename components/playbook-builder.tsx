'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTemplates, type TradeTemplate } from '@/lib/templates-context';
import { MARKET_CONDITION_OPTIONS } from '@/lib/types';
import { PRESET_SETUPS } from '@/components/trade-form';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { formatBaseCurrencyAmount, getTradeBasePnL } from '@/lib/trade-utils';
import { BookOpen, PencilLine, PlusCircle, Trash2, TrendingUp, AlertTriangle, Target } from 'lucide-react';

type PlaybookFormState = {
  name: string;
  description: string;
  symbol: string;
  setupName: string;
  tradeType: TradeTemplate['tradeType'];
  position: NonNullable<TradeTemplate['position']>;
  timeFrame: string;
  plannedRTarget: string;
  marketCondition: string;
  marketTrend: string;
  setupType: string;
  volumeProfile: string;
  emaTouch: '' | 'Yes' | 'No';
  riskRewardRatio: string;
  marketOpenType: string;
  firstFiveMinuteCandleType: string;
  entryRules: string;
  invalidationRules: string;
  targetRules: string;
  idealConditions: string;
  commonMistakes: string;
  preNotes: string;
  tags: string;
};

const EMPTY_PLAYBOOK: PlaybookFormState = {
  name: '',
  description: '',
  symbol: '',
  setupName: '',
  tradeType: 'Intraday',
  position: 'Buy',
  timeFrame: '',
  plannedRTarget: '',
  marketCondition: 'Normal',
  marketTrend: '',
  setupType: '',
  volumeProfile: '',
  emaTouch: '',
  riskRewardRatio: '',
  marketOpenType: '',
  firstFiveMinuteCandleType: '',
  entryRules: '',
  invalidationRules: '',
  targetRules: '',
  idealConditions: '',
  commonMistakes: '',
  preNotes: '',
  tags: '',
};

function toFormState(template?: TradeTemplate | null): PlaybookFormState {
  if (!template) return EMPTY_PLAYBOOK;

  return {
    name: template.name || '',
    description: template.description || '',
    symbol: template.symbol || '',
    setupName: template.setupName || '',
    tradeType: template.tradeType || 'Intraday',
    position: template.position || 'Buy',
    timeFrame: template.timeFrame || '',
    plannedRTarget: template.plannedRTarget ? String(template.plannedRTarget) : '',
    marketCondition: template.marketCondition || 'Normal',
    marketTrend: template.marketTrend || '',
    setupType: template.setupType || '',
    volumeProfile: template.volumeProfile || '',
    emaTouch: template.emaTouch || '',
    riskRewardRatio: template.riskRewardRatio || '',
    marketOpenType: template.marketOpenType || '',
    firstFiveMinuteCandleType: template.firstFiveMinuteCandleType || '',
    entryRules: template.entryRules || '',
    invalidationRules: template.invalidationRules || '',
    targetRules: template.targetRules || '',
    idealConditions: template.idealConditions || '',
    commonMistakes: template.commonMistakes || '',
    preNotes: template.preNotes || '',
    tags: (template.tags || []).join(', '),
  };
}

function getPlaybookMatches(template: TradeTemplate, trades: ReturnType<typeof useTrades>['trades']) {
  return trades.filter((trade) => {
    if (trade.setupName !== template.setupName) return false;
    if (template.symbol && trade.symbol !== template.symbol) return false;
    if (template.timeFrame && trade.timeFrame !== template.timeFrame) return false;
    if (template.marketCondition && trade.marketCondition !== template.marketCondition) return false;
    return true;
  });
}

function isPresetSetup(setupName: string) {
  return PRESET_SETUPS.includes(setupName as (typeof PRESET_SETUPS)[number]);
}

function isCustomSetup(setupName?: string) {
  return Boolean(setupName && !isPresetSetup(setupName));
}

export default function PlaybookBuilder() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PlaybookFormState>(EMPTY_PLAYBOOK);
  const [isCustomSetupName, setIsCustomSetupName] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || null,
    [templates, selectedId],
  );
  const formatBaseAmount = (value: number, decimals: number = 2) => formatBaseCurrencyAmount(value, baseCurrency, decimals);
  const playbookStats = useMemo(() => {
    const stats = new Map<string, {
      trades: number;
      winRate: number;
      avgR: number;
      totalPnL: number;
      avgPnL: number;
      topMistake: string | null;
      lastTradedAt: string | null;
    }>();

    templates.forEach((template) => {
      const matches = getPlaybookMatches(template, trades);
      const wins = matches.filter((trade) => trade.pnl > 0).length;
      const totalPnL = matches.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
      const avgR = matches.length > 0 ? matches.reduce((sum, trade) => sum + trade.rFactor, 0) / matches.length : 0;
      const mistakeCounts = new Map<string, number>();
      matches.forEach((trade) => {
        if (trade.mistakeTag) {
          mistakeCounts.set(trade.mistakeTag, (mistakeCounts.get(trade.mistakeTag) || 0) + 1);
        }
      });

      let topMistake: string | null = null;
      let topMistakeCount = 0;
      mistakeCounts.forEach((count, mistake) => {
        if (count > topMistakeCount) {
          topMistake = mistake;
          topMistakeCount = count;
        }
      });

      const lastTradedAt = matches
        .map((trade) => trade.date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

      stats.set(template.id, {
        trades: matches.length,
        winRate: matches.length > 0 ? (wins / matches.length) * 100 : 0,
        avgR,
        totalPnL,
        avgPnL: matches.length > 0 ? totalPnL / matches.length : 0,
        topMistake,
        lastTradedAt,
      });
    });

    return stats;
  }, [templates, trades]);
  const selectedTemplateStats = selectedTemplate ? playbookStats.get(selectedTemplate.id) : null;

  const handleChange = (field: keyof PlaybookFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSetupNameChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustomSetupName(true);
      setForm((prev) => ({
        ...prev,
        setupName: isPresetSetup(prev.setupName) ? '' : prev.setupName,
      }));
      return;
    }

    setIsCustomSetupName(false);
    handleChange('setupName', value);
  };

  const handleNewPlaybook = () => {
    setSelectedId(null);
    setForm(EMPTY_PLAYBOOK);
    setIsCustomSetupName(false);
  };

  const handleSelectPlaybook = (template: TradeTemplate) => {
    setSelectedId(template.id);
    setForm(toFormState(template));
    setIsCustomSetupName(isCustomSetup(template.setupName));
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.setupName.trim()) {
      window.alert('Playbook name and setup name are required.');
      return;
    }

    const now = new Date().toISOString();
    const payload: TradeTemplate = {
      id: selectedTemplate?.id || Date.now().toString(),
      name: form.name.trim(),
      description: form.description.trim(),
      symbol: form.symbol.trim().toUpperCase(),
      setupName: form.setupName.trim(),
      tradeType: form.tradeType,
      position: form.position,
      timeFrame: form.timeFrame.trim(),
      plannedRTarget: form.plannedRTarget ? parseFloat(form.plannedRTarget) : undefined,
      preNotes: form.preNotes.trim(),
      marketCondition: form.marketCondition || undefined,
      marketTrend: form.marketTrend || undefined,
      setupType: form.setupType || undefined,
      volumeProfile: form.volumeProfile || undefined,
      emaTouch: form.emaTouch || undefined,
      riskRewardRatio: form.riskRewardRatio.trim() || undefined,
      marketOpenType: form.marketOpenType || undefined,
      firstFiveMinuteCandleType: form.firstFiveMinuteCandleType || undefined,
      entryRules: form.entryRules.trim() || undefined,
      invalidationRules: form.invalidationRules.trim() || undefined,
      targetRules: form.targetRules.trim() || undefined,
      idealConditions: form.idealConditions.trim() || undefined,
      commonMistakes: form.commonMistakes.trim() || undefined,
      tags: form.tags
        ? Array.from(new Set(form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)))
        : undefined,
      createdAt: selectedTemplate?.createdAt || now,
      updatedAt: now,
      usageCount: selectedTemplate?.usageCount || 0,
    };

    if (selectedTemplate) {
      updateTemplate(selectedTemplate.id, payload);
    } else {
      addTemplate(payload);
      setSelectedId(payload.id);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this playbook?')) return;
    deleteTemplate(id);
    if (selectedId === id) {
      handleNewPlaybook();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Playbook Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Define your repeatable setups with market context, entry rules, invalidation, target logic, and common failure points. Then apply them directly in Add Trade.
          </p>
        </div>
        <Button type="button" onClick={handleNewPlaybook} className="self-start">
          <PlusCircle className="w-4 h-4 mr-2" />
          New Playbook
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Saved Playbooks
            </CardTitle>
            <CardDescription>Choose a playbook to edit or review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No playbooks yet. Create your first one to make trade entry faster and more disciplined.
              </div>
            ) : (
              templates.map((template) => {
                const isActive = template.id === selectedId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectPlaybook(template)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      isActive ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:bg-secondary/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{template.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{template.setupName} • {template.tradeType}</p>
                        {playbookStats.get(template.id) ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {playbookStats.get(template.id)?.trades || 0} trades • {playbookStats.get(template.id)?.winRate.toFixed(0) || 0}% win
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
                        {template.usageCount} uses
                      </span>
                    </div>
                    {template.description ? (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-3">{template.description}</p>
                    ) : null}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{selectedTemplate ? 'Edit Playbook' : 'Create Playbook'}</CardTitle>
                <CardDescription>
                  {selectedTemplate && selectedTemplateStats
                    ? `Matched ${selectedTemplateStats.trades} trade${selectedTemplateStats.trades === 1 ? '' : 's'} from your journal for this playbook.`
                    : 'Build the setup once, then reuse it across trades.'}
                </CardDescription>
              </div>
              {selectedTemplate ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm(toFormState(selectedTemplate));
                      setIsCustomSetupName(isCustomSetup(selectedTemplate.setupName));
                    }}
                  >
                    <PencilLine className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => handleDelete(selectedTemplate.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedTemplate && selectedTemplateStats ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    Win Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{selectedTemplateStats.winRate.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedTemplateStats.trades} matched trades</p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    Average R
                  </p>
                  <p className={`mt-2 text-2xl font-bold ${selectedTemplateStats.avgR >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedTemplateStats.avgR.toFixed(2)}R
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Per trade expectancy signal</p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total P&L</p>
                  <p className={`mt-2 text-2xl font-bold ${selectedTemplateStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatBaseAmount(selectedTemplateStats.totalPnL)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Avg {formatBaseAmount(selectedTemplateStats.avgPnL)} per trade</p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                    Repeated Mistake
                  </p>
                  <p className="mt-2 text-lg font-bold text-foreground">{selectedTemplateStats.topMistake || 'None yet'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedTemplateStats.lastTradedAt ? `Last traded on ${selectedTemplateStats.lastTradedAt}` : 'No trade history yet'}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Playbook Name*</label>
                <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="A+ Trend Pullback" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Setup Name*</label>
                <div className="space-y-2">
                  <select
                    value={
                      isCustomSetupName
                        ? '__custom__'
                        : isPresetSetup(form.setupName)
                          ? form.setupName
                          : ''
                    }
                    onChange={(e) => handleSetupNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground"
                  >
                    <option value="">Select setup</option>
                    {PRESET_SETUPS.map((setup) => (
                      <option key={setup} value={setup}>{setup}</option>
                    ))}
                    <option value="__custom__">Custom setup...</option>
                  </select>
                  {isCustomSetupName ? (
                    <input
                      type="text"
                      value={form.setupName}
                      onChange={(e) => handleChange('setupName', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground"
                      placeholder="Type your custom setup name"
                    />
                  ) : null}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="What this setup is, when it works, and why it is in your playbook." />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Symbol Focus</label>
                <input value={form.symbol} onChange={(e) => handleChange('symbol', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="NIFTY, BTCUSD" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Trade Type</label>
                <select value={form.tradeType} onChange={(e) => handleChange('tradeType', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="Intraday">Intraday</option>
                  <option value="Swing">Swing</option>
                  <option value="Scalping">Scalping</option>
                  <option value="Positional">Positional</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Position Bias</label>
                <select value={form.position} onChange={(e) => handleChange('position', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time Frame</label>
                <input value={form.timeFrame} onChange={(e) => handleChange('timeFrame', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="5m, 15m, 1H" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Planned R Target</label>
                <input value={form.plannedRTarget} onChange={(e) => handleChange('plannedRTarget', e.target.value)} type="number" step="0.1" min="0" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="2.0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Risk Reward Ratio</label>
                <input value={form.riskRewardRatio} onChange={(e) => handleChange('riskRewardRatio', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="2.0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Market Condition</label>
                <select value={form.marketCondition} onChange={(e) => handleChange('marketCondition', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  {MARKET_CONDITION_OPTIONS.map((condition) => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Market Trend</label>
                <select value={form.marketTrend} onChange={(e) => handleChange('marketTrend', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="">Select trend</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                  <option value="Sideways">Sideways</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Setup Type</label>
                <select value={form.setupType} onChange={(e) => handleChange('setupType', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="">Select setup type</option>
                  <option value="Breakout">Breakout</option>
                  <option value="Pullback">Pullback</option>
                  <option value="Reversal">Reversal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Volume Profile</label>
                <select value={form.volumeProfile} onChange={(e) => handleChange('volumeProfile', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="">Select volume</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">EMA Touch</label>
                <select value={form.emaTouch} onChange={(e) => handleChange('emaTouch', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Market Open Type</label>
                <select value={form.marketOpenType} onChange={(e) => handleChange('marketOpenType', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="">Select open</option>
                  <option value="Gap Up">Gap Up</option>
                  <option value="Gap Down">Gap Down</option>
                  <option value="Sideways">Sideways</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">First 5-Min Candle</label>
                <select value={form.firstFiveMinuteCandleType} onChange={(e) => handleChange('firstFiveMinuteCandleType', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground">
                  <option value="">Select candle</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                  <option value="Doji">Doji</option>
                  <option value="Pinbar">Pinbar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Entry Rules</label>
                <textarea value={form.entryRules} onChange={(e) => handleChange('entryRules', e.target.value)} rows={4} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="What has to be true before you enter?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Invalidation Rules</label>
                <textarea value={form.invalidationRules} onChange={(e) => handleChange('invalidationRules', e.target.value)} rows={4} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="When is the setup no longer valid?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Target Logic</label>
                <textarea value={form.targetRules} onChange={(e) => handleChange('targetRules', e.target.value)} rows={4} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="How should you manage profit targets?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ideal Conditions</label>
                <textarea value={form.idealConditions} onChange={(e) => handleChange('idealConditions', e.target.value)} rows={4} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="What market environment makes this setup strongest?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Common Mistakes</label>
                <textarea value={form.commonMistakes} onChange={(e) => handleChange('commonMistakes', e.target.value)} rows={4} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="How do you usually mess this one up?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Prefill Trade Notes</label>
                <textarea value={form.preNotes} onChange={(e) => handleChange('preNotes', e.target.value)} rows={4} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="These notes can flow into the Add Trade screen." />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
              <input value={form.tags} onChange={(e) => handleChange('tags', e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground" placeholder="trend, A+, continuation, opening range" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleSave}>
                {selectedTemplate ? 'Update Playbook' : 'Save Playbook'}
              </Button>
              {selectedTemplate ? (
                <Button type="button" variant="outline" onClick={handleNewPlaybook}>
                  Start New
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
