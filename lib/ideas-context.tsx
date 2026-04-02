'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { TradeIdea } from './types';
import { useAuth } from '@/lib/auth-context';
import { clearBootstrap, readBootstrap } from '@/lib/client-bootstrap';

interface IdeasContextType {
  ideas: TradeIdea[];
  addIdea: (idea: TradeIdea) => void;
  deleteIdea: (id: string) => void;
  updateIdea: (id: string, idea: TradeIdea) => void;
  exportJSON: () => void;
  exportCSV: () => void;
  importJSON: (file: Blob) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export const IdeasContext = createContext<IdeasContextType | undefined>(undefined);

async function ideasRequest(url: string, init?: RequestInit) {
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

export function IdeasProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [ideas, setIdeas] = useState<TradeIdea[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeIdeas = async () => {
      if (isAuthLoading) return;
      if (!user) {
        setIdeas([]);
        setError(null);
        clearBootstrap();
        return;
      }

      const bootstrap = readBootstrap(user.id);
      if (bootstrap) {
        setIdeas((bootstrap.ideas || []).map((idea) => ({
          ...idea,
          isFavorite: Boolean(idea.isFavorite),
        })));
        setError(null);
        return;
      }

      try {
        const res = await ideasRequest('/api/ideas', { method: 'GET' });
        const data = await res.json();
        setIdeas(((data.ideas || []) as TradeIdea[]).map((idea) => ({
          ...idea,
          isFavorite: Boolean(idea.isFavorite),
        })));
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load ideas';
        setError(message);
      }
    };

    void initializeIdeas();
  }, [user, isAuthLoading]);

  const addIdea = (idea: TradeIdea) => {
    if (!idea.id || !idea.name) {
      setError('Invalid idea: missing required fields');
      return;
    }

    setIdeas((prev) => [{ ...idea, isFavorite: Boolean(idea.isFavorite) }, ...prev]);
    void ideasRequest('/api/ideas', {
      method: 'POST',
      body: JSON.stringify({ idea }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to save idea');
    });
  };

  const deleteIdea = (id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id));

    void ideasRequest(`/api/ideas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to delete idea');
    });
  };

  const updateIdea = (id: string, updatedIdea: TradeIdea) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...updatedIdea, isFavorite: Boolean(updatedIdea.isFavorite) } : i)));

    void ideasRequest(`/api/ideas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ idea: updatedIdea }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to update idea');
    });
  };

  const exportJSON = () => {
    try {
      if (ideas.length === 0) {
        setError('No ideas to export');
        return;
      }

      const data = JSON.stringify(ideas, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-ideas-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export ideas';
      setError(message);
    }
  };

  const exportCSV = () => {
    try {
      if (ideas.length === 0) {
        setError('No ideas to export');
        return;
      }

      const headers = [
        'Created',
        'Updated',
        'Name',
        'Symbol',
        'Setup',
        'Reasoning',
        'Entry Logic',
        'Exit Logic',
        'Stop Loss Logic',
        'Time Frame',
        'Status',
        'Outcome',
        'Tags',
      ];

      const rows = ideas.map((i) => [
        i.createdAt,
        i.updatedAt,
        i.name,
        i.symbol || '',
        i.setup,
        i.reasoning,
        i.entryLogic,
        i.exitLogic,
        i.stopLossLogic || '',
        i.timeFrame || '',
        i.status,
        i.outcome || '',
        (i.tags || []).join(';'),
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-ideas-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export ideas';
      setError(message);
    }
  };

  const clearError = () => setError(null);

  const importJSON = async (file: Blob) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid file format: expected an array of ideas');
      }

      const validIdeas = parsed.every((idea) => {
        return typeof idea === 'object' && idea.id && idea.name && idea.createdAt && idea.updatedAt;
      });

      if (!validIdeas) {
        throw new Error('Invalid idea data: missing required fields');
      }

      const existingIds = new Set(ideas.map((i) => i.id));
      const newIdeas = parsed.filter((idea: TradeIdea) => !existingIds.has(idea.id));

      await Promise.all(
        newIdeas.map((idea: TradeIdea) =>
          ideasRequest('/api/ideas', {
            method: 'POST',
            body: JSON.stringify({ idea }),
          })
        )
      );

      setIdeas((prev) => [...prev, ...newIdeas]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import ideas';
      setError(message);
      throw err;
    }
  };

  return (
    <IdeasContext.Provider value={{ ideas, addIdea, deleteIdea, updateIdea, exportJSON, exportCSV, importJSON, error, clearError }}>
      {children}
    </IdeasContext.Provider>
  );
}

export function useIdeas() {
  const context = useContext(IdeasContext);
  if (!context) {
    throw new Error('useIdeas must be used within a IdeasProvider');
  }
  return context;
}
