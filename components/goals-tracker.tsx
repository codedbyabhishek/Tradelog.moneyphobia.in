'use client';

import { useMemo, useState } from 'react';
import { useGoals } from '@/lib/goals-context';
import { useTrades } from '@/lib/trade-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { TradingGoal, GoalType, type ChallengeConfig, type ChallengeTemplate, type Trade } from '@/lib/types';
import { Trash2, Plus, Edit, ShieldCheck, Flame, CalendarRange } from 'lucide-react';

// Simple ID generator
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const GOAL_TYPES: { value: GoalType; label: string; defaultUnit: string }[] = [
  { value: 'win_rate', label: 'Win Rate Target', defaultUnit: '%' },
  { value: 'profit_target', label: 'Profit Target', defaultUnit: '₹' },
  { value: 'trade_count', label: 'Trade Count', defaultUnit: 'trades' },
  { value: 'risk_management', label: 'Risk Management', defaultUnit: 'R' },
  { value: 'consistency', label: 'Consistency', defaultUnit: 'days' },
];

const CHALLENGE_PRESETS: Array<{
  id: ChallengeTemplate;
  title: string;
  description: string;
  days: number;
  icon: typeof ShieldCheck;
  config: ChallengeConfig;
}> = [
  {
    id: 'discipline_30',
    title: '30-Day Discipline Challenge',
    description: 'Every day in the challenge window should stay rule-followed, mistake-light, and confident.',
    days: 30,
    icon: ShieldCheck,
    config: {
      requireRuleFollowed: true,
      requireMistakeFree: true,
      minConfidence: 6,
    },
  },
  {
    id: 'a_plus_week',
    title: 'A+ Setups Only Week',
    description: 'For one week, only take high-quality setups that match your chosen playbook labels.',
    days: 7,
    icon: Flame,
    config: {
      allowedSetups: ['BREAKOUT', 'PULLBACK', 'REVERSAL', 'PINBAR'],
      requireRuleFollowed: true,
      requireMistakeFree: true,
      minConfidence: 7,
    },
  },
  {
    id: 'no_overtrading_week',
    title: 'No Overtrading Week',
    description: 'Limit daily trade count and keep every session controlled for a full week.',
    days: 7,
    icon: CalendarRange,
    config: {
      maxTradesPerDay: 3,
      requireRuleFollowed: true,
    },
  },
];

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function getDateRangeDays(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function isMistakeFree(trade: Trade) {
  return !trade.mistakeTag || trade.mistakeTag === 'No mistake (good loss)';
}

function isChallengeTradeCompliant(trade: Trade, config: ChallengeConfig) {
  if (config.requireRuleFollowed && !trade.ruleFollowed) return false;
  if (config.requireMistakeFree && !isMistakeFree(trade)) return false;
  if (config.minConfidence && trade.confidence < config.minConfidence) return false;
  if (config.allowedSetups?.length && !config.allowedSetups.includes(trade.setupName)) return false;
  return true;
}

function evaluateChallenge(goal: TradingGoal, trades: Trade[]) {
  const startDate = goal.startDate;
  const endDate = goal.endDate;
  const today = formatDate(new Date());
  const effectiveEnd = today < endDate ? today : endDate;
  const daysToEvaluate = startDate > effectiveEnd ? [] : getDateRangeDays(startDate, effectiveEnd);
  const challengeTrades = trades.filter((trade) => trade.date >= startDate && trade.date <= endDate);
  const tradesByDay = new Map<string, Trade[]>();

  challengeTrades.forEach((trade) => {
    const list = tradesByDay.get(trade.date) || [];
    list.push(trade);
    tradesByDay.set(trade.date, list);
  });

  const config = goal.challengeConfig || {};
  let compliantDays = 0;
  let violatedDays = 0;
  const violationNotes: string[] = [];

  daysToEvaluate.forEach((date) => {
    const dayTrades = tradesByDay.get(date) || [];
    let compliant = true;

    if (goal.challengeTemplate === 'no_overtrading_week') {
      if (config.maxTradesPerDay && dayTrades.length > config.maxTradesPerDay) {
        compliant = false;
        violationNotes.push(`${date}: took ${dayTrades.length} trades (limit ${config.maxTradesPerDay})`);
      }
      if (compliant && !dayTrades.every((trade) => isChallengeTradeCompliant(trade, config))) {
        compliant = false;
        violationNotes.push(`${date}: at least one trade broke the discipline rules`);
      }
    } else {
      if (!dayTrades.every((trade) => isChallengeTradeCompliant(trade, config))) {
        compliant = false;
        violationNotes.push(`${date}: at least one trade was outside the challenge rules`);
      }
    }

    if (compliant) {
      compliantDays += 1;
    } else {
      violatedDays += 1;
    }
  });

  const totalDays = goal.targetValue || daysToEvaluate.length || 1;
  const progress = Math.min(100, (compliantDays / totalDays) * 100);
  const completed = daysToEvaluate.length >= totalDays && compliantDays === totalDays;
  const failed = daysToEvaluate.length >= totalDays && compliantDays < totalDays;

  return {
    totalDays,
    elapsedDays: daysToEvaluate.length,
    compliantDays,
    violatedDays,
    progress,
    challengeTrades,
    violationNotes,
    completed,
    failed,
  };
}

export default function GoalsTracker() {
  const { goals, addGoal, deleteGoal, updateGoal, updateGoalProgress, markGoalComplete, getProgressPercentage } = useGoals();
  const { trades } = useTrades();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TradingGoal>>({});

  const handleOpenDialog = (goal?: TradingGoal) => {
    if (goal) {
      setEditingId(goal.id);
      setFormData(goal);
    } else {
      setEditingId(null);
      setFormData({
        type: 'win_rate',
        status: 'active',
        targetValue: 50,
        currentValue: 0,
      });
    }
    setOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.description || formData.targetValue === undefined) {
      alert('Please fill all required fields');
      return;
    }

    const goalType = GOAL_TYPES.find(g => g.value === formData.type);
    const now = new Date().toISOString();

    if (editingId) {
      updateGoal(editingId, {
        ...(formData as TradingGoal),
        updatedAt: now,
      });
    } else {
      addGoal({
        id: generateId(),
        title: formData.title,
        description: formData.description,
        type: formData.type || 'win_rate',
        targetValue: formData.targetValue,
        currentValue: 0,
        unit: goalType?.defaultUnit || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }

    setOpen(false);
    setFormData({});
  };

  const standardGoals = goals.filter((g) => g.mode !== 'challenge');
  const activeGoals = standardGoals.filter(g => g.status === 'active');
  const completedGoals = standardGoals.filter(g => g.status === 'completed');
  const challengeGoals = goals.filter((g) => g.mode === 'challenge');
  const challengeEvaluations = useMemo(
    () =>
      challengeGoals.map((goal) => ({
        goal,
        preset: CHALLENGE_PRESETS.find((preset) => preset.id === goal.challengeTemplate),
        evaluation: evaluateChallenge(goal, trades),
      })),
    [challengeGoals, trades],
  );

  const startChallenge = (presetId: ChallengeTemplate) => {
    const preset = CHALLENGE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    const now = new Date().toISOString();
    const startDate = formatDate(new Date());

    addGoal({
      id: generateId(),
      mode: 'challenge',
      challengeTemplate: preset.id,
      challengeConfig: preset.config,
      title: preset.title,
      description: preset.description,
      type: 'consistency',
      targetValue: preset.days,
      currentValue: 0,
      unit: 'days',
      startDate,
      endDate: addDays(startDate, preset.days - 1),
      progress: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trading Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track both classic goals and behavior-driven challenge runs.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          New Goal
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Challenge Mode</h2>
          <p className="text-sm text-muted-foreground">Start a short behavioral sprint and let the journal score it automatically from your trades.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {CHALLENGE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <Card key={preset.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {preset.title}
                  </CardTitle>
                  <CardDescription>{preset.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Runs for {preset.days} day{preset.days === 1 ? '' : 's'}
                  </div>
                  <Button onClick={() => startChallenge(preset.id)} className="w-full">
                    Start Challenge
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Challenges</h2>
        {challengeEvaluations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No active challenge yet. Start one of the presets above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {challengeEvaluations.map(({ goal, preset, evaluation }) => (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {goal.title}
                        {evaluation.completed ? <Badge className="bg-green-600">Completed ✓</Badge> : null}
                        {evaluation.failed ? <Badge variant="destructive">Finished with misses</Badge> : null}
                      </CardTitle>
                      <CardDescription>{goal.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteGoal(goal.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-sm text-muted-foreground">Compliant Days</p>
                      <p className="mt-1 text-2xl font-bold">{evaluation.compliantDays}/{evaluation.totalDays}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-sm text-muted-foreground">Challenge Trades</p>
                      <p className="mt-1 text-2xl font-bold">{evaluation.challengeTrades.length}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-sm text-muted-foreground">Violated Days</p>
                      <p className="mt-1 text-2xl font-bold">{evaluation.violatedDays}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-sm text-muted-foreground">Window</p>
                      <p className="mt-1 text-sm font-semibold">{goal.startDate} to {goal.endDate}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">{evaluation.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={evaluation.progress} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      {preset?.title || 'Challenge'} is tracking day-by-day compliance automatically from your journal.
                    </p>
                  </div>

                  {goal.challengeConfig ? (
                    <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-2">Rules</p>
                      <div className="space-y-1">
                        {goal.challengeConfig.requireRuleFollowed ? <p>Rule-followed trades only</p> : null}
                        {goal.challengeConfig.requireMistakeFree ? <p>No mistake-tagged trades</p> : null}
                        {goal.challengeConfig.minConfidence ? <p>Minimum confidence: {goal.challengeConfig.minConfidence}/10</p> : null}
                        {goal.challengeConfig.maxTradesPerDay ? <p>Max {goal.challengeConfig.maxTradesPerDay} trades per day</p> : null}
                        {goal.challengeConfig.allowedSetups?.length ? <p>Allowed setups: {goal.challengeConfig.allowedSetups.join(', ')}</p> : null}
                      </div>
                    </div>
                  ) : null}

                  {evaluation.violationNotes.length > 0 ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                      <p className="mb-2 text-sm font-medium text-foreground">Recent misses</p>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {evaluation.violationNotes.slice(0, 5).map((note) => (
                          <p key={note}>{note}</p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                      Clean run so far. Keep stacking disciplined days.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Goals */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Goals</h2>
        {activeGoals.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No active goals. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeGoals.map(goal => (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <CardDescription>{goal.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(goal)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGoal(goal.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                    <Progress value={goal.progress} className="h-3" />
                    <p className="text-sm text-muted-foreground">{goal.progress.toFixed(0)}% complete</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Input
                      type="number"
                      placeholder="Update progress"
                      value=""
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          updateGoalProgress(goal.id, value);
                        }
                      }}
                      className="w-32"
                    />
                    {goal.progress < 100 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markGoalComplete(goal.id)}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {goal.startDate} to {goal.endDate}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Completed Goals</h2>
          <div className="grid gap-4">
            {completedGoals.map(goal => (
              <Card key={goal.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {goal.title}
                        <Badge className="bg-green-600">Completed ✓</Badge>
                      </CardTitle>
                      <CardDescription>{goal.description}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Goal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
            <DialogDescription>
              Set a trading goal and track your progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Goal Type</label>
              <Select
                value={formData.type || 'win_rate'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value as GoalType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map(gt => (
                    <SelectItem key={gt.value} value={gt.value}>
                      {gt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Achieve 60% Win Rate"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Why is this goal important?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Target Value</label>
                <Input
                  type="number"
                  value={formData.targetValue || 0}
                  onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                  placeholder="50"
                />
              </div>

              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingId ? 'Update' : 'Create'} Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
