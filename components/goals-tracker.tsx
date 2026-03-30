'use client';

import { useState } from 'react';
import { useGoals } from '@/lib/goals-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { TradingGoal, GoalType } from '@/lib/types';
import { Trash2, Plus, Edit } from 'lucide-react';

// Simple ID generator
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const GOAL_TYPES: { value: GoalType; label: string; defaultUnit: string }[] = [
  { value: 'win_rate', label: 'Win Rate Target', defaultUnit: '%' },
  { value: 'profit_target', label: 'Profit Target', defaultUnit: '₹' },
  { value: 'trade_count', label: 'Trade Count', defaultUnit: 'trades' },
  { value: 'risk_management', label: 'Risk Management', defaultUnit: 'R' },
  { value: 'consistency', label: 'Consistency', defaultUnit: 'days' },
];

export default function GoalsTracker() {
  const { goals, addGoal, deleteGoal, updateGoal, updateGoalProgress, markGoalComplete, getProgressPercentage } = useGoals();
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

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trading Goals</h1>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          New Goal
        </Button>
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
