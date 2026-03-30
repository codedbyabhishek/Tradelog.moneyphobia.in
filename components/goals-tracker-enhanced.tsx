'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trade } from '@/lib/types';
import { calculatePnL } from '@/lib/trade-utils';
import { Target, TrendingUp, Check, X, Plus, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export interface Goal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  targetAmount: number;
  period: string; // YYYY-MM-DD or YYYY-MM or YYYY-Www
  createdAt: number;
  notes?: string;
}

interface GoalsTrackerProps {
  trades: Trade[];
}

export function GoalsTracker({ trades }: GoalsTrackerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalType, setNewGoalType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Calculate progress for each goal
  const goalProgress = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const currentWeek = format(startOfWeek(now), 'yyyy-MM-dd');
    const currentMonth = format(now, 'yyyy-MM');

    return goals.map((goal) => {
      let relevantTrades: Trade[] = [];

      if (goal.type === 'daily' && goal.period === today) {
        relevantTrades = trades.filter((t) => t.entryDate.startsWith(today));
      } else if (goal.type === 'weekly' && goal.period === currentWeek) {
        const weekEnd = format(endOfWeek(now), 'yyyy-MM-dd');
        relevantTrades = trades.filter((t) => {
          const tDate = t.entryDate.split('T')[0];
          return tDate >= currentWeek && tDate <= weekEnd;
        });
      } else if (goal.type === 'monthly' && goal.period === currentMonth) {
        relevantTrades = trades.filter((t) => t.entryDate.startsWith(currentMonth));
      }

      const actualAmount = relevantTrades.reduce((sum, t) => sum + calculatePnL(t), 0);
      const percentage = (actualAmount / goal.targetAmount) * 100;
      const isCompleted = actualAmount >= goal.targetAmount;

      return {
        goal,
        actualAmount,
        percentage: Math.min(percentage, 100),
        isCompleted,
        remainingAmount: Math.max(0, goal.targetAmount - actualAmount),
      };
    });
  }, [goals, trades]);

  function addGoal() {
    if (!newGoalAmount) return;

    const now = new Date();
    let period = '';

    if (newGoalType === 'daily') {
      period = format(now, 'yyyy-MM-dd');
    } else if (newGoalType === 'weekly') {
      period = format(startOfWeek(now), 'yyyy-MM-dd');
    } else {
      period = format(now, 'yyyy-MM');
    }

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      type: newGoalType,
      targetAmount: parseFloat(newGoalAmount),
      period,
      createdAt: Date.now(),
    };

    setGoals([...goals, newGoal]);
    setNewGoalAmount('');
  }

  function deleteGoal(goalId: string) {
    setGoals(goals.filter((g) => g.id !== goalId));
  }

  // Summary stats
  const activeGoals = goalProgress.filter((gp) => gp.goal.period === formatPeriod(new Date(), gp.goal.type));
  const completedGoals = activeGoals.filter((g) => g.isCompleted).length;
  const totalTargeted = activeGoals.reduce((sum, g) => sum + g.goal.targetAmount, 0);
  const totalActual = activeGoals.reduce((sum, g) => sum + g.actualAmount, 0);

  function formatPeriod(date: Date, type: string) {
    if (type === 'daily') {
      return format(date, 'yyyy-MM-dd');
    } else if (type === 'weekly') {
      return format(startOfWeek(date), 'yyyy-MM-dd');
    } else {
      return format(date, 'yyyy-MM');
    }
  }

  return (
    <div className="space-y-6">
      {/* Add New Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label>Goal Amount ($)</Label>
              <Input
                type="number"
                placeholder="e.g., 500"
                value={newGoalAmount}
                onChange={(e) => setNewGoalAmount(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label>Period</Label>
              <select
                value={newGoalType}
                onChange={(e) => setNewGoalType(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={addGoal} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Summary */}
      {activeGoals.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle>Current Goals Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Active Goals</p>
                <p className="text-2xl font-bold">{activeGoals.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedGoals}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Target</p>
                <p className="text-2xl font-bold">${totalTargeted.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Actual P&L</p>
                <p className={`text-2xl font-bold ${totalActual >= totalTargeted ? 'text-green-600' : 'text-orange-600'}`}>
                  ${totalActual.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      {activeGoals.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-gray-500">No goals set yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeGoals.map((gp) => (
            <Card key={gp.goal.id} className={gp.isCompleted ? 'border-green-200 bg-green-50' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold capitalize">
                        {gp.goal.type} Goal
                      </h4>
                      {gp.isCompleted && (
                        <Badge className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {gp.goal.period}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteGoal(gp.goal.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      ${gp.actualAmount.toFixed(2)} / ${gp.goal.targetAmount.toFixed(2)}
                    </span>
                    <span className={`font-semibold ${gp.percentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                      {gp.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={gp.percentage}
                    className="h-3"
                  />
                </div>

                {/* Remaining Amount */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600">Remaining</p>
                    <p className="font-semibold">
                      ${gp.remainingAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600">Status</p>
                    <p className={gp.isCompleted ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                      {gp.isCompleted ? '✓ Goal Met!' : 'In Progress'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Historical Goals */}
      {goalProgress.length > activeGoals.length && (
        <Card>
          <CardHeader>
            <CardTitle>Past Goals</CardTitle>
            <CardDescription>Previously completed periods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goalProgress.filter((gp) => gp.goal.period !== formatPeriod(new Date(), gp.goal.type)).map((gp) => (
                <div key={gp.goal.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium capitalize">
                      {gp.goal.type} - {gp.goal.period}
                    </p>
                    <p className="text-sm text-gray-600">
                      Target: ${gp.goal.targetAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${gp.actualAmount >= gp.goal.targetAmount ? 'text-green-600' : 'text-red-600'}`}>
                      ${gp.actualAmount.toFixed(2)}
                    </p>
                    {gp.isCompleted ? (
                      <span className="text-xs text-green-600">✓ Completed</span>
                    ) : (
                      <span className="text-xs text-red-600">✗ Missed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
