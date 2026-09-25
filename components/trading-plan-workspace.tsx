'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle2, Circle, Clock3, Plus, RefreshCcw, Save, ShieldCheck, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/lib/settings-context';
import { createDefaultTradingPlan, getTradingPlanProgress, type TradingPlan, type TradingPlanChecklistItem } from '@/lib/trading-plan';
import { buildAppPath } from '@/lib/app-routes';

type ChecklistKey = 'preMarketRoutine' | 'entryCriteria';

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return 'Not saved yet';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function ChecklistSection({
  title,
  description,
  items,
  onToggle,
  onRemove,
  allowRemove,
}: {
  title: string;
  description: string;
  items: TradingPlanChecklistItem[];
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  allowRemove?: boolean;
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-3 transition-colors hover:border-primary/30"
          >
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`${item.completed ? 'Mark incomplete' : 'Complete'}: ${item.label}`}
            >
              {item.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
            </button>
            <span className={`min-w-0 flex-1 text-sm ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {item.label}
            </span>
            {allowRemove && onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-100 transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove ${item.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function TradingPlanWorkspace() {
  const router = useRouter();
  const { toast } = useToast();
  const { tradingPlan, saveTradingPlan } = useSettings();
  const [draft, setDraft] = useState<TradingPlan>(tradingPlan);
  const [newCriterion, setNewCriterion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setDraft(tradingPlan);
    setIsDirty(false);
  }, [tradingPlan]);

  const progress = useMemo(() => getTradingPlanProgress(draft), [draft]);
  const routineProgress = useMemo(
    () => getTradingPlanProgress({ ...draft, entryCriteria: [] }),
    [draft],
  );
  const entryProgress = useMemo(
    () => getTradingPlanProgress({ ...draft, preMarketRoutine: [] }),
    [draft],
  );
  const maxPlannedRisk = draft.maxTradesPerDay * draft.riskPerTradePercent;

  const updateDraft = (updater: (current: TradingPlan) => TradingPlan) => {
    setDraft((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
    setIsDirty(true);
  };

  const toggleChecklistItem = (key: ChecklistKey, id: string) => {
    updateDraft((current) => ({
      ...current,
      [key]: current[key].map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
    }));
  };

  const removeEntryCriterion = (id: string) => {
    updateDraft((current) => ({
      ...current,
      entryCriteria: current.entryCriteria.filter((item) => item.id !== id),
    }));
  };

  const addEntryCriterion = () => {
    const label = newCriterion.trim();
    if (!label) return;

    updateDraft((current) => ({
      ...current,
      entryCriteria: [
        ...current.entryCriteria,
        { id: `entry-${Date.now()}`, label: label.slice(0, 240), completed: false },
      ],
    }));
    setNewCriterion('');
  };

  const save = async () => {
    setIsSaving(true);
    try {
      await saveTradingPlan(draft);
      setIsDirty(false);
      toast({ title: 'Plan saved', description: 'Your trading plan is synced to this account.' });
      return true;
    } catch (error) {
      toast({
        title: 'Plan could not be saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveAndOpenPreTrade = async () => {
    if (isDirty && !(await save())) return;
    router.push(buildAppPath('pre-trade'));
  };

  const resetPlan = () => {
    setDraft(createDefaultTradingPlan());
    setIsDirty(true);
    toast({ title: 'Plan reset', description: 'The default structure is ready for your edits. Save it when you are happy.' });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-3 sm:gap-6 sm:p-6 lg:p-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Target className="h-3.5 w-3.5" />
                Plan workspace
              </span>
              {draft.isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Circle className="h-3.5 w-3.5" /> Paused
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Prepare the session. Trade with structure.</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Turn your edge into a repeatable plan: get ready before the open, validate the entry, and protect the session with clear limits.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[290px] lg:justify-end">
            <Button variant="outline" onClick={resetPlan} disabled={isSaving}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset draft
            </Button>
            <Button onClick={() => void save()} disabled={!isDirty || isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving…' : isDirty ? 'Save changes' : 'Saved'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="min-w-0">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Plan name</span>
            <input
              value={draft.name}
              onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value.slice(0, 80) }))}
              className="mt-2 w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 text-base font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. London range break and retest"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => updateDraft((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Use this plan today
          </label>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.72fr)]">
        <div className="space-y-5">
          <ChecklistSection
            title="Pre-market routine"
            description={`${routineProgress.completed}/${routineProgress.total} complete — clear the noise before you look for a trade.`}
            items={draft.preMarketRoutine}
            onToggle={(id) => toggleChecklistItem('preMarketRoutine', id)}
          />

          <ChecklistSection
            title="Entry criteria"
            description={`${entryProgress.completed}/${entryProgress.total} confirmed — only take trades that meet the plan.`}
            items={draft.entryCriteria}
            onToggle={(id) => toggleChecklistItem('entryCriteria', id)}
            onRemove={removeEntryCriterion}
            allowRemove
          />

          <Card className="border-border bg-card shadow-none">
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="text-base sm:text-lg">Add entry criterion</CardTitle>
              <CardDescription>Capture a rule that must be true before you enter.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-0 sm:flex-row sm:p-5 sm:pt-0">
              <input
                value={newCriterion}
                onChange={(event) => setNewCriterion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addEntryCriterion();
                  }
                }}
                className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Retest holds above the session high"
              />
              <Button type="button" variant="outline" onClick={addEntryCriterion} disabled={!newCriterion.trim()}>
                <Plus className="mr-2 h-4 w-4" /> Add rule
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-none">
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="text-base sm:text-lg">Trade management rules</CardTitle>
              <CardDescription>Define how you manage risk, partials, and invalidation once you are in.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              <textarea
                value={draft.tradeManagementRules}
                onChange={(event) => updateDraft((current) => ({ ...current, tradeManagementRules: event.target.value.slice(0, 4000) }))}
                rows={5}
                className="w-full resize-y rounded-xl border border-border bg-input px-3 py-3 text-sm leading-6 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Write the rules you will follow after entry..."
              />
              <p className="mt-2 text-xs text-muted-foreground">Keep it specific: when to reduce, where to move a stop, and what invalidates the idea.</p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <Card className="border-primary/25 bg-card shadow-none">
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="flex items-center justify-between gap-3 text-base sm:text-lg">
                Plan readiness
                <span className="text-2xl font-bold text-primary">{progress.percent}%</span>
              </CardTitle>
              <CardDescription>{progress.completed} of {progress.total} checks completed</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xl font-bold text-foreground">{draft.entryCriteria.length}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Entry rules</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xl font-bold text-foreground">{draft.maxTradesPerDay}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Max trades</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-none">
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><ShieldCheck className="h-5 w-5 text-primary" /> Risk controls</CardTitle>
              <CardDescription>Limits create the guardrails for every session.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0 sm:p-5 sm:pt-0">
              <label>
                <span className="text-xs text-muted-foreground">Max trades / day</span>
                <input type="number" min="1" max="50" value={draft.maxTradesPerDay} onChange={(event) => updateDraft((current) => ({ ...current, maxTradesPerDay: Number(event.target.value) || 1 }))} className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <label>
                <span className="text-xs text-muted-foreground">Risk / trade (%)</span>
                <input type="number" min="0.01" max="100" step="0.1" value={draft.riskPerTradePercent} onChange={(event) => updateDraft((current) => ({ ...current, riskPerTradePercent: Number(event.target.value) || 0.01 }))} className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <label>
                <span className="text-xs text-muted-foreground">Max daily loss</span>
                <input type="number" min="0" value={draft.maxDailyLoss} onChange={(event) => updateDraft((current) => ({ ...current, maxDailyLoss: Math.max(0, Number(event.target.value) || 0) }))} className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <label>
                <span className="text-xs text-muted-foreground">Daily target</span>
                <input type="number" min="0" value={draft.dailyProfitTarget} onChange={(event) => updateDraft((current) => ({ ...current, dailyProfitTarget: Math.max(0, Number(event.target.value) || 0) }))} className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <div className="col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="font-medium text-foreground">Maximum planned exposure: {maxPlannedRisk.toFixed(2)}%</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">This is your max trades × risk per trade. It is a planning guardrail, not a live broker limit.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-none">
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Clock3 className="h-5 w-5 text-primary" /> Trading window</CardTitle>
              <CardDescription>Define when you are allowed to trade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
              <label className="block">
                <span className="text-xs text-muted-foreground">Session</span>
                <input value={draft.tradingWindow} onChange={(event) => updateDraft((current) => ({ ...current, tradingWindow: event.target.value.slice(0, 100) }))} className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="e.g. 08:00–11:00 IST" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">News buffer (minutes)</span>
                <input type="number" min="0" max="240" value={draft.newsBufferMinutes} onChange={(event) => updateDraft((current) => ({ ...current, newsBufferMinutes: Math.max(0, Number(event.target.value) || 0) }))} className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <p className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs leading-5 text-muted-foreground">Avoid new entries {draft.newsBufferMinutes} minutes before and after high-impact events unless that is explicitly part of the setup.</p>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <p className="text-sm font-semibold text-foreground">Ready to execute?</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Move to Pre-Trade to validate the live setup against your journal history.</p>
            <Button className="mt-4 w-full" onClick={() => void saveAndOpenPreTrade()} disabled={isSaving}>
              Open Pre-Trade
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Last saved {formatUpdatedAt(tradingPlan.updatedAt)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
