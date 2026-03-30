'use client';

import React, { useState } from 'react';
import { useIdeas } from '@/lib/ideas-context';
import { TradeIdea, IdeaStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScreenshotViewer } from '@/components/screenshot-viewer';
import { Upload, X } from 'lucide-react';

interface IdeaFormProps {
  onSuccess?: () => void;
  editIdea?: TradeIdea;
}

export default function IdeaForm({ onSuccess, editIdea }: IdeaFormProps) {
  const { addIdea, updateIdea } = useIdeas();
  const isEditing = !!editIdea;

  const [formData, setFormData] = useState({
    name: editIdea?.name || '',
    symbol: editIdea?.symbol || '',
    setup: editIdea?.setup || '',
    reasoning: editIdea?.reasoning || '',
    entryLogic: editIdea?.entryLogic || '',
    exitLogic: editIdea?.exitLogic || '',
    stopLossLogic: editIdea?.stopLossLogic || '',
    timeFrame: editIdea?.timeFrame || '',
    status: editIdea?.status || 'idea' as IdeaStatus,
    outcome: editIdea?.outcome || '' as TradeIdea['outcome'] | '',
    notes: editIdea?.notes || '',
    backtestResults: editIdea?.backtestResults || '',
    backtestWinRate: editIdea?.backtestWinRate?.toString() || '',
    backtestSampleSize: editIdea?.backtestSampleSize?.toString() || '',
    tags: editIdea?.tags?.join(', ') || '',
  });

  const [screenshot, setScreenshot] = useState<string | null>(editIdea?.screenshot || null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshot(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setScreenshot(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Idea name is required';
    if (!formData.setup.trim()) newErrors.setup = 'Setup is required';
    if (!formData.reasoning.trim()) newErrors.reasoning = 'Reasoning is required';
    if (!formData.entryLogic.trim()) newErrors.entryLogic = 'Entry logic is required';
    if (!formData.exitLogic.trim()) newErrors.exitLogic = 'Exit logic is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');

    if (!validate()) {
      setSubmitStatus('error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const idea: TradeIdea = {
        id: editIdea?.id || Date.now().toString(),
        createdAt: editIdea?.createdAt || now,
        updatedAt: now,
        name: formData.name.trim(),
        symbol: formData.symbol.trim() || undefined,
        setup: formData.setup.trim(),
        reasoning: formData.reasoning.trim(),
        entryLogic: formData.entryLogic.trim(),
        exitLogic: formData.exitLogic.trim(),
        stopLossLogic: formData.stopLossLogic.trim() || undefined,
        timeFrame: formData.timeFrame.trim() || undefined,
        status: formData.status as IdeaStatus,
        outcome: formData.outcome ? formData.outcome as TradeIdea['outcome'] : undefined,
        notes: formData.notes.trim(),
        screenshot: screenshot || undefined,
        backtestResults: formData.backtestResults.trim() || undefined,
        backtestWinRate: formData.backtestWinRate ? parseFloat(formData.backtestWinRate) : undefined,
        backtestSampleSize: formData.backtestSampleSize ? parseInt(formData.backtestSampleSize) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };

      if (isEditing) {
        updateIdea(idea.id, idea);
      } else {
        addIdea(idea);
      }

      if (!isEditing) {
        setFormData({
          name: '', symbol: '', setup: '', reasoning: '', entryLogic: '', exitLogic: '',
          stopLossLogic: '', timeFrame: '', status: 'idea', outcome: '', notes: '',
          backtestResults: '', backtestWinRate: '', backtestSampleSize: '', tags: '',
        });
        setScreenshot(null);
      }

      setErrors({});
      setSubmitStatus('success');
      if (onSuccess) onSuccess();
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('[v0] Idea submission error:', error);
      setSubmitStatus('error');
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2 bg-input border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors[field] ? 'border-red-500' : 'border-border'}`;

  return (
    <div className="flex-1 min-h-screen p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <Card className="bg-card border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
            {isEditing ? 'Edit Trade Idea' : 'New Trade Idea'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Log ideas and backtesting trades. These do not affect your real P&L stats.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* Idea Name and Symbol */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Idea Name*</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., NIFTY Breakout Setup"
                  className={inputClass('name')}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Symbol (Optional)</label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., NIFTY, AAPL"
                  className={inputClass('symbol')}
                />
              </div>
            </div>

            {/* Setup and Time Frame */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Setup / Pattern*</label>
                <input
                  type="text"
                  name="setup"
                  value={formData.setup}
                  onChange={handleInputChange}
                  placeholder="e.g., Bullish Flag, Fib Retracement"
                  className={inputClass('setup')}
                />
                {errors.setup && <p className="text-xs text-red-500 mt-1">{errors.setup}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time Frame</label>
                <input
                  type="text"
                  name="timeFrame"
                  value={formData.timeFrame}
                  onChange={handleInputChange}
                  placeholder="e.g., 15m, 1h, Daily"
                  className={inputClass('timeFrame')}
                />
              </div>
            </div>

            {/* Reasoning */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Reasoning / Thesis*</label>
              <textarea
                name="reasoning"
                value={formData.reasoning}
                onChange={handleInputChange}
                placeholder="Why do you think this setup will work? What is the market context?"
                className={inputClass('reasoning')}
                rows={3}
              />
              {errors.reasoning && <p className="text-xs text-red-500 mt-1">{errors.reasoning}</p>}
            </div>

            {/* Entry and Exit Logic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Entry Logic*</label>
                <textarea
                  name="entryLogic"
                  value={formData.entryLogic}
                  onChange={handleInputChange}
                  placeholder="When and how would you enter?"
                  className={inputClass('entryLogic')}
                  rows={3}
                />
                {errors.entryLogic && <p className="text-xs text-red-500 mt-1">{errors.entryLogic}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Exit Logic*</label>
                <textarea
                  name="exitLogic"
                  value={formData.exitLogic}
                  onChange={handleInputChange}
                  placeholder="When and how would you exit?"
                  className={inputClass('exitLogic')}
                  rows={3}
                />
                {errors.exitLogic && <p className="text-xs text-red-500 mt-1">{errors.exitLogic}</p>}
              </div>
            </div>

            {/* Stop Loss Logic */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Stop Loss Logic</label>
              <textarea
                name="stopLossLogic"
                value={formData.stopLossLogic}
                onChange={handleInputChange}
                placeholder="Where would your stop loss be placed and why?"
                className={inputClass('stopLossLogic')}
                rows={2}
              />
            </div>

            {/* Status and Outcome */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status*</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={inputClass('status')}
                >
                  <option value="idea">Idea (Not Tested)</option>
                  <option value="backtesting">Backtesting</option>
                  <option value="validated">Validated</option>
                  <option value="invalidated">Invalidated</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Outcome</label>
                <select
                  name="outcome"
                  value={formData.outcome}
                  onChange={handleInputChange}
                  className={inputClass('outcome')}
                >
                  <option value="">Pending</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>

            {/* Backtesting Section */}
            {(formData.status === 'backtesting' || formData.status === 'validated' || formData.status === 'invalidated') && (
              <div className="p-4 bg-secondary rounded-lg border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Backtest Data</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Win Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="backtestWinRate"
                      value={formData.backtestWinRate}
                      onChange={handleInputChange}
                      placeholder="e.g., 65"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Sample Size</label>
                    <input
                      type="number"
                      name="backtestSampleSize"
                      value={formData.backtestSampleSize}
                      onChange={handleInputChange}
                      placeholder="e.g., 50"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Backtest Notes</label>
                  <textarea
                    name="backtestResults"
                    value={formData.backtestResults}
                    onChange={handleInputChange}
                    placeholder="Describe backtesting observations, edge cases, etc."
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">General Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional notes, observations, or links..."
                className={inputClass('notes')}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tags (comma separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., breakout, momentum, mean-reversion"
                className={inputClass('tags')}
              />
            </div>

            {/* Screenshot */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Screenshot</label>
              {screenshot ? (
                <div className="relative inline-block w-full">
                  <ScreenshotViewer 
                    imageUrl={screenshot} 
                    title={`${formData.name || 'Idea'} - Screenshot`}
                  >
                    <div className="cursor-pointer hover:opacity-80 transition-opacity rounded-lg border border-border overflow-hidden w-full">
                      <img src={screenshot} alt="Idea screenshot" className="w-full rounded-lg border border-border max-h-64 object-cover" />
                    </div>
                  </ScreenshotViewer>
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="absolute top-2 right-2 p-1 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onPaste={handlePasteImage}
                  className="flex items-center justify-center w-full p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                >
                  <label className="w-full text-center cursor-pointer">
                    <div>
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                      <span className="text-sm text-foreground block">Upload or paste screenshot</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {/* Submit */}
            {submitStatus === 'success' && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400">{isEditing ? 'Idea updated!' : 'Idea saved!'}</p>
              </div>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base py-2 sm:py-2.5">
              {isEditing ? 'Update Idea' : 'Save Idea'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
