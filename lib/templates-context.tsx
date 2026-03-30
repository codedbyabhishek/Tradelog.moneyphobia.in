'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export interface TradeTemplate {
  id: string;
  name: string;
  description: string;
  symbol: string;
  setupName: string;
  tradeType: 'Intraday' | 'Swing' | 'Scalping' | 'Positional';
  position?: 'Buy' | 'Sell';
  timeFrame?: string;
  riskPercent?: number;
  plannedRTarget?: number;
  preNotes?: string;
  session?: string;
  marketCondition?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

interface TemplatesContextType {
  templates: TradeTemplate[];
  addTemplate: (template: TradeTemplate) => void;
  deleteTemplate: (id: string) => void;
  updateTemplate: (id: string, template: TradeTemplate) => void;
  getTemplate: (id: string) => TradeTemplate | undefined;
  incrementUsageCount: (id: string) => void;
  error: string | null;
  clearError: () => void;
}

export const TemplatesContext = createContext<TemplatesContextType | undefined>(undefined);

async function templatesRequest(url: string, init?: RequestInit) {
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

export function TemplatesProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (isAuthLoading) return;
      if (!user) {
        setTemplates([]);
        setError(null);
        return;
      }

      try {
        const res = await templatesRequest('/api/templates', { method: 'GET' });
        const data = await res.json();
        setTemplates((data.templates || []) as TradeTemplate[]);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load templates';
        setError(message);
      }
    };

    void initialize();
  }, [user, isAuthLoading]);

  const addTemplate = (template: TradeTemplate) => {
    if (!template.id || !template.name || !template.setupName) {
      setError('Invalid template: missing required fields');
      return;
    }

    setTemplates((prev) => [template, ...prev]);
    void templatesRequest('/api/templates', {
      method: 'POST',
      body: JSON.stringify({ template }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    });
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    void templatesRequest(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    });
  };

  const updateTemplate = (id: string, updatedTemplate: TradeTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? updatedTemplate : t)));

    void templatesRequest(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ template: updatedTemplate }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    });
  };

  const getTemplate = (id: string): TradeTemplate | undefined => {
    return templates.find((t) => t.id === id);
  };

  const incrementUsageCount = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) {
      setError('Template not found');
      return;
    }

    const updated = {
      ...template,
      usageCount: template.usageCount + 1,
      updatedAt: new Date().toISOString(),
    };

    updateTemplate(id, updated);
  };

  const clearError = () => setError(null);

  return (
    <TemplatesContext.Provider
      value={{ templates, addTemplate, deleteTemplate, updateTemplate, getTemplate, incrementUsageCount, error, clearError }}
    >
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (!context) {
    throw new Error('useTemplates must be used within a TemplatesProvider');
  }
  return context;
}
