'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { TradingGoal } from './types';
import { useAuth } from '@/lib/auth-context';

interface GoalsContextType {
  goals: TradingGoal[];
  addGoal: (goal: TradingGoal) => void;
  deleteGoal: (id: string) => void;
  updateGoal: (id: string, goal: TradingGoal) => void;
  updateGoalProgress: (id: string, newValue: number) => void;
  markGoalComplete: (id: string) => void;
  getProgressPercentage: (goal: TradingGoal) => number;
  error: string | null;
  clearError: () => void;
}

export const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

async function goalsRequest(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const body = await res.json();
      message = body?.error || message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return res;
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [goals, setGoals] = useState<TradingGoal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (isAuthLoading) return;
      if (!user) {
        setGoals([]);
        setError(null);
        return;
      }

      try {
        const res = await goalsRequest('/api/goals', { method: 'GET' });
        const data = await res.json();
        setGoals((data.goals || []) as TradingGoal[]);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load goals';
        setError(message);
      }
    };

    void initialize();
  }, [user, isAuthLoading]);

  const addGoal = (goal: TradingGoal) => {
    if (!goal.id || !goal.title) {
      setError('Invalid goal: missing required fields');
      return;
    }

    setGoals((prev) => [goal, ...prev]);
    void goalsRequest('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    });
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));

    void goalsRequest(`/api/goals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    });
  };

  const updateGoal = (id: string, updatedGoal: TradingGoal) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));

    void goalsRequest(`/api/goals/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ goal: updatedGoal }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    });
  };

  const updateGoalProgress = (id: string, newValue: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) {
      setError('Goal not found');
      return;
    }

    const progress = Math.min(100, (newValue / goal.targetValue) * 100);
    const status = progress >= 100 ? 'completed' : goal.status;

    const updated = {
      ...goal,
      currentValue: newValue,
      progress,
      status: status as 'active' | 'completed' | 'failed' | 'abandoned',
      updatedAt: new Date().toISOString(),
    };

    updateGoal(id, updated);
  };

  const markGoalComplete = (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) {
      setError('Goal not found');
      return;
    }

    const updated = {
      ...goal,
      status: 'completed' as const,
      currentValue: goal.targetValue,
      progress: 100,
      updatedAt: new Date().toISOString(),
    };

    updateGoal(id, updated);
  };

  const getProgressPercentage = (goal: TradingGoal): number => {
    return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  };

  const clearError = () => setError(null);

  return (
    <GoalsContext.Provider
      value={{
        goals,
        addGoal,
        deleteGoal,
        updateGoal,
        updateGoalProgress,
        markGoalComplete,
        getProgressPercentage,
        error,
        clearError,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}
