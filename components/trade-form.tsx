'use client';

import React from "react"
import { useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { convertFormToTrade } from '@/lib/trade-utils';
import { validateTradeForm, sanitizeString, validateImageFile } from '@/lib/validation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Upload, X } from 'lucide-react';
import { TradeFormData, Currency } from '@/lib/types';
import { calculatePnL, calculateRFactor, CURRENCY_SYMBOLS, getTradeOutcome } from '@/lib/trade-utils';
import { ScreenshotViewer } from './screenshot-viewer';
import { useToast } from '@/hooks/use-toast';
import { clearPreTradeDraft, readPreTradeDraft } from '@/lib/pre-trade-draft';

interface TradeFormProps {
  onSuccess?: () => void;
}

export const PRESET_SETUPS = [
  'FOMO',
  'PINBAR',
  'BULLISH REVERSE PINBAR',
  'BEARISH REVERSE PINBAR',
  'PINBAR FAILURE',
  '0.382 Fib Retracement',
  '0.702 Fib Retracement',
  'EMA RESISTANCE',
  'EMA SUPPORT',
  'SUPPORT',
  'RESISTANCE',
  'LIQUIDITY GRAB',
  'BREAKOUT',
  'BREAKDOWN',
  'REVERSAL',
  'WEDGE',
  'TRIANGLE',
  'DOUBLE TOP',
  'DOUBLE BOTTOM',
  'HEAD & SHOULDERS',
  'TRENDLINE BOUNCE',
  'MOVING AVERAGE CROSS',
  'RSI DIVERGENCE',
  'MACD SIGNAL',
  'FLAG PATTERN',
  'CHANNEL BOUNCE',
  'GAP FILL',
] as const;

export const FIB_LEVEL_OPTIONS = [
  'L-0.07',
  'L-0.05',
  'L-0.01',
  'L0',
  'L0.283',
  'L0.382',
  'L0.5',
  'L0.702',
  'L0.786',
  'L1',
  'L1.27',
  'L1.4',
  'L2',
  'L2.7',
  'L3',
] as const;

const CUSTOM_FIB_VALUE = '__custom__';

export default function TradeForm({ onSuccess }: TradeFormProps) {
  const { addTrade } = useTrades();
  const { toast } = useToast();
  const draft = readPreTradeDraft();
  const hasPreTradeDraft = Boolean(draft && Object.values(draft).some(Boolean));
  // Form data state
  const [formData, setFormData] = useState<TradeFormData>({
    date: new Date().toISOString().split('T')[0],
    tags: '',
    symbol: '',
    tradeType: 'Intraday',
    setupName: '',
    position: 'Buy',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    quantity: '',
    fees: '0',
    brokerage: '0',
    exchangeCharges: '0',
    taxes: '0',
    manualProfit: '',
    currency: 'INR', // Default currency
    marketTrend: draft?.marketTrend || '',
    setupType: draft?.setupType || '',
    volumeProfile: draft?.volumeProfile || '',
    emaTouch: draft?.emaTouch || '',
    riskRewardRatio: draft?.riskRewardRatio || '',
    marketOpenType: draft?.marketOpenType || '',
    firstFiveMinuteCandleType: draft?.firstFiveMinuteCandleType || '',
    confidence: '5',
    preNotes: '',
    postNotes: '',
    mistakeTag: undefined,
    exitRFactor: '',
    timeFrame: draft?.timeFrame || '',
    // isWin is now auto-derived from P&L, no longer manually set
    limit: '',
    exit: '',
    ruleFollowed: true,
  });

  // Screenshot state
  const [beforeScreenshot, setBeforeScreenshot] = useState<string | null>(null);
  const [afterScreenshot, setAfterScreenshot] = useState<string | null>(null);

  // Validation state for enhanced error handling
  const [errors, setErrors] = useState<Partial<Record<keyof TradeFormData, string>>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCustomSetup, setIsCustomSetup] = useState(false);
  const [showChecklistValues, setShowChecklistValues] = useState(false);
  const [isCustomLimit, setIsCustomLimit] = useState(
    Boolean(formData.limit && !FIB_LEVEL_OPTIONS.includes(formData.limit as (typeof FIB_LEVEL_OPTIONS)[number]))
  );
  const [isCustomExit, setIsCustomExit] = useState(
    Boolean(formData.exit && !FIB_LEVEL_OPTIONS.includes(formData.exit as (typeof FIB_LEVEL_OPTIONS)[number]))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Sanitize text inputs to prevent XSS
    // Pass trim=false during live typing so spaces between words are preserved
    let sanitizedValue = value;
    const textFields = ['symbol', 'setupName', 'preNotes', 'postNotes', 'timeFrame', 'tags', 'riskRewardRatio'];
    if (textFields.includes(name)) {
      sanitizedValue = sanitizeString(value, false);
    }
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleSetupPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__custom__') {
      setIsCustomSetup(true);
      setFormData((prev) => ({ ...prev, setupName: '' }));
      return;
    }

    setIsCustomSetup(false);
    setFormData((prev) => ({ ...prev, setupName: selected }));
  };

  const handleFibPresetChange = (field: 'limit' | 'exit') => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;

    if (field === 'limit') {
      setIsCustomLimit(selected === CUSTOM_FIB_VALUE);
    } else {
      setIsCustomExit(selected === CUSTOM_FIB_VALUE);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: selected === CUSTOM_FIB_VALUE ? '' : selected,
    }));
  };

  const handlePasteImage = (type: 'before' | 'after') => async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;

        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast({
            title: 'Invalid image',
            description: validation.error ?? 'Please upload a valid screenshot (JPEG, PNG, WebP, max 5MB).',
            variant: 'destructive',
          });
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (type === 'before') {
            setBeforeScreenshot(result);
          } else {
            setAfterScreenshot(result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleBeforeScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid image',
        description: validation.error ?? 'Please upload a valid screenshot (JPEG, PNG, WebP, max 5MB).',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setBeforeScreenshot(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAfterScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid image',
        description: validation.error ?? 'Please upload a valid screenshot (JPEG, PNG, WebP, max 5MB).',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAfterScreenshot(result);
    };
    reader.readAsDataURL(file);
  };

  const clearBeforeScreenshot = () => {
    setBeforeScreenshot(null);
  };

  const clearAfterScreenshot = () => {
    setAfterScreenshot(null);
  };

  /**
   * Validate form data before submission using centralized validation
   */
  const validateForm = (): boolean => {
    const validationErrors = validateTradeForm(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');

    // Validate form data
    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    try {
      const trade = convertFormToTrade({
        ...formData,
        beforeTradeScreenshot: beforeScreenshot || undefined,
        afterExitScreenshot: afterScreenshot || undefined,
      });
      addTrade(trade);

      // Reset form after successful submission (keep the same currency preference)
      setFormData(prev => ({
        date: new Date().toISOString().split('T')[0],
        tags: '',
        symbol: '',
        tradeType: 'Intraday',
        setupName: '',
        position: 'Buy',
        entryPrice: '',
        exitPrice: '',
        stopLoss: '',
        quantity: '',
        fees: '0',
        brokerage: '0',
        exchangeCharges: '0',
        taxes: '0',
        manualProfit: '',
        currency: prev.currency, // Keep the user's preferred currency
        marketTrend: '',
        setupType: '',
        volumeProfile: '',
        emaTouch: '',
        riskRewardRatio: '',
        marketOpenType: '',
        firstFiveMinuteCandleType: '',
        confidence: '5',
        preNotes: '',
        postNotes: '',
        mistakeTag: undefined,
        exitRFactor: '',
        timeFrame: '',
        limit: '',
        exit: '',
        ruleFollowed: true,
      }));
      clearBeforeScreenshot();
      clearAfterScreenshot();
      clearPreTradeDraft();
      setErrors({});
      setSubmitStatus('success');
      setIsCustomSetup(false);
      setIsCustomLimit(false);
      setIsCustomExit(false);

      // Trigger callback and auto-clear success message
      if (onSuccess) onSuccess();
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('[v0] Trade submission error:', error);
      setSubmitStatus('error');
    }
  };

  // Get current currency symbol
  const currentCurrencySymbol = CURRENCY_SYMBOLS[formData.currency] || '₹';

  // Calculate live P&L and R-Factor for preview (only if prices are provided)
  // Also show auto-derived W/L based on P&L
  const livePreviewValues = (() => {
    try {
      if (formData.entryPrice && formData.exitPrice && formData.quantity && formData.stopLoss) {
        const pnl = calculatePnL(
          parseFloat(formData.entryPrice),
          parseFloat(formData.exitPrice),
          parseFloat(formData.quantity),
          formData.position,
          parseFloat(formData.fees) || 0
        );
        const rFactor = calculateRFactor(
          pnl,
          parseFloat(formData.stopLoss),
          parseFloat(formData.entryPrice),
          formData.position,
          parseFloat(formData.quantity)
        );
        const outcome = getTradeOutcome(pnl);
        return { pnl: pnl.toFixed(2), rFactor: rFactor.toFixed(2), outcome };
      }
      // Also show preview when manualProfit is entered
      if (formData.manualProfit) {
        const grossPnl = parseFloat(formData.manualProfit);
        const brokerageVal = parseFloat(formData.brokerage || '0') || 0;
        const exchangeVal = parseFloat(formData.exchangeCharges || '0') || 0;
        const taxesVal = parseFloat(formData.taxes || '0') || 0;
        const totalCharges = brokerageVal + exchangeVal + taxesVal;
        const netPnl = grossPnl - totalCharges;
        const outcome = getTradeOutcome(netPnl);
        return { pnl: netPnl.toFixed(2), grossPnl: grossPnl.toFixed(2), charges: totalCharges.toFixed(2), rFactor: formData.exitRFactor || '0', outcome };
      }
    } catch {
      return null;
    }
    return null;
  })();

  // Show validation error for checkbox
  const getCheckboxError = (fieldName: string): boolean => {
    return fieldName in errors;
  };

  return (
    <div className="flex-1 min-h-screen p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <Card className="bg-card border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">Add New Trade</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Record your trade details and analysis</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 lg:space-y-8">
            <Card className="border-primary/20 bg-primary/5 shadow-none hover:border-primary/30 hover:shadow-none focus-within:border-primary/40 focus-within:shadow-none">
              <CardHeader className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Pre-Trade Checklist Values</CardTitle>
                    <CardDescription>
                      The smart checklist stays in the dedicated Pre-Trade page. This screen keeps the original Add New Trade flow while still saving checklist data with the trade.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowChecklistValues((prev) => !prev)}
                  >
                    {showChecklistValues ? 'Hide Checklist' : 'Show Checklist'}
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showChecklistValues ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              {showChecklistValues ? (
              <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
                <div className="rounded-lg border border-border bg-background/80 p-3 text-sm text-muted-foreground">
                  {hasPreTradeDraft
                    ? 'Checklist values were prefilled from your latest Pre-Trade session. Adjust anything here before saving.'
                    : 'Use the Pre-Trade page for smart historical guidance, or fill these checklist values manually here.'}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Market Trend*</label>
                    <select
                      name="marketTrend"
                      value={formData.marketTrend}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.marketTrend ? 'border-red-500' : 'border-border'}`}
                    >
                      <option value="">Select trend</option>
                      <option value="Bullish">Bullish</option>
                      <option value="Bearish">Bearish</option>
                      <option value="Sideways">Sideways</option>
                    </select>
                    {errors.marketTrend && <p className="text-xs text-red-500 mt-1">{errors.marketTrend}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Setup Type*</label>
                    <select
                      name="setupType"
                      value={formData.setupType}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.setupType ? 'border-red-500' : 'border-border'}`}
                    >
                      <option value="">Select setup type</option>
                      <option value="Breakout">Breakout</option>
                      <option value="Pullback">Pullback</option>
                      <option value="Reversal">Reversal</option>
                    </select>
                    {errors.setupType && <p className="text-xs text-red-500 mt-1">{errors.setupType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Volume*</label>
                    <select
                      name="volumeProfile"
                      value={formData.volumeProfile}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.volumeProfile ? 'border-red-500' : 'border-border'}`}
                    >
                      <option value="">Select volume</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                    </select>
                    {errors.volumeProfile && <p className="text-xs text-red-500 mt-1">{errors.volumeProfile}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">EMA Touch*</label>
                    <select
                      name="emaTouch"
                      value={formData.emaTouch}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.emaTouch ? 'border-red-500' : 'border-border'}`}
                    >
                      <option value="">Select option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {errors.emaTouch && <p className="text-xs text-red-500 mt-1">{errors.emaTouch}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Risk-Reward Ratio*</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="riskRewardRatio"
                      value={formData.riskRewardRatio}
                      onChange={handleInputChange}
                      placeholder="e.g., 2.00"
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.riskRewardRatio ? 'border-red-500' : 'border-border'}`}
                    />
                    {errors.riskRewardRatio && <p className="text-xs text-red-500 mt-1">{errors.riskRewardRatio}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Market Open Type*</label>
                    <select
                      name="marketOpenType"
                      value={formData.marketOpenType}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.marketOpenType ? 'border-red-500' : 'border-border'}`}
                    >
                      <option value="">Select market open</option>
                      <option value="Gap Up">Gap Up</option>
                      <option value="Gap Down">Gap Down</option>
                      <option value="Sideways">Sideways</option>
                    </select>
                    {errors.marketOpenType && <p className="text-xs text-red-500 mt-1">{errors.marketOpenType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">First 5-Min Candle*</label>
                    <select
                      name="firstFiveMinuteCandleType"
                      value={formData.firstFiveMinuteCandleType}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.firstFiveMinuteCandleType ? 'border-red-500' : 'border-border'}`}
                    >
                      <option value="">Select candle type</option>
                      <option value="Bullish">Bullish</option>
                      <option value="Bearish">Bearish</option>
                      <option value="Doji">Doji</option>
                      <option value="Pinbar">Pinbar</option>
                    </select>
                    {errors.firstFiveMinuteCandleType && <p className="text-xs text-red-500 mt-1">{errors.firstFiveMinuteCandleType}</p>}
                  </div>
                </div>
              </CardContent>
              ) : null}
            </Card>

            {/* Date and Trade Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Trade Date*</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Trade Type*</label>
                <select
                  name="tradeType"
                  value={formData.tradeType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Intraday</option>
                  <option>Swing</option>
                  <option>Scalping</option>
                  <option>Positional</option>
                </select>
              </div>
            </div>

            {/* Symbol and Setup Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Market / Symbol*</label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., AAPL, EURUSD"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Setup Name*</label>
                <div className="space-y-2">
                  <select
                    value={
                      isCustomSetup
                        ? '__custom__'
                        : PRESET_SETUPS.includes(formData.setupName as (typeof PRESET_SETUPS)[number])
                        ? formData.setupName
                        : ''
                    }
                    onChange={handleSetupPresetChange}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a setup</option>
                    {PRESET_SETUPS.map((setup) => (
                      <option key={setup} value={setup}>
                        {setup}
                      </option>
                    ))}
                    <option value="__custom__">Custom setup...</option>
                  </select>
                  {isCustomSetup && (
                    <input
                      type="text"
                      name="setupName"
                      value={formData.setupName}
                      onChange={handleInputChange}
                      placeholder="Type your custom setup name"
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.setupName ? 'border-red-500' : 'border-border'}`}
                    />
                  )}
                </div>
                {errors.setupName && <p className="text-xs text-red-500 mt-1">{errors.setupName}</p>}
              </div>
            </div>

            {/* Position and Time Frame */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Position*</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Buy</option>
                  <option>Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time Frame (When Entered)*</label>
                <input
                  type="text"
                  name="timeFrame"
                  value={formData.timeFrame}
                  onChange={handleInputChange}
                  placeholder="e.g., 5m, 15m, 1h, Daily"
                  className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.timeFrame ? 'border-red-500' : 'border-border'}`}
                />
                {errors.timeFrame && <p className="text-xs text-red-500 mt-1">{errors.timeFrame}</p>}
              </div>
            </div>

            {/* Entry Price (Optional) and Exit Price (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Entry Price (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  name="entryPrice"
                  value={formData.entryPrice}
                  onChange={handleInputChange}
                  placeholder="Leave empty for process-based journaling"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.entryPrice && <p className="text-xs text-red-500 mt-1">{errors.entryPrice}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Exit Price (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  name="exitPrice"
                  value={formData.exitPrice}
                  onChange={handleInputChange}
                  placeholder="Leave empty for process-based journaling"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.exitPrice && <p className="text-xs text-red-500 mt-1">{errors.exitPrice}</p>}
              </div>
            </div>

            {/* Stop Loss and Limit (Fibonacci) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Stop Loss*</label>
                <input
                  type="number"
                  step="0.01"
                  name="stopLoss"
                  value={formData.stopLoss}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.stopLoss ? 'border-red-500' : 'border-border'}`}
                />
                {errors.stopLoss && <p className="text-xs text-red-500 mt-1">{errors.stopLoss}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Limit (Fibonacci Level)*</label>
                <div className="space-y-2">
                  <select
                    name="limit"
                    value={isCustomLimit ? CUSTOM_FIB_VALUE : formData.limit}
                    onChange={handleFibPresetChange('limit')}
                    className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.limit ? 'border-red-500' : 'border-border'}`}
                  >
                    <option value="">Select Fibonacci Level</option>
                    {FIB_LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                    <option value={CUSTOM_FIB_VALUE}>Custom level...</option>
                  </select>
                  {isCustomLimit ? (
                    <>
                      <input
                        type="text"
                        name="limit"
                        value={formData.limit}
                        onChange={handleInputChange}
                        placeholder="e.g., L1.618 or Custom TP"
                        className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.limit ? 'border-red-500' : 'border-border'}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Examples: <span className="font-medium text-foreground">L1.618</span>, <span className="font-medium text-foreground">L2.236</span>, <span className="font-medium text-foreground">BE</span>, <span className="font-medium text-foreground">Trail Exit</span>
                      </p>
                    </>
                  ) : null}
                </div>
                {errors.limit && <p className="text-xs text-red-500 mt-1">{errors.limit}</p>}
              </div>
            </div>

            {/* Exit (Fibonacci Level) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Exit (Fibonacci Level)*</label>
              <div className="space-y-2">
                <select
                  name="exit"
                  value={isCustomExit ? CUSTOM_FIB_VALUE : formData.exit}
                  onChange={handleFibPresetChange('exit')}
                  className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.exit ? 'border-red-500' : 'border-border'}`}
                >
                  <option value="">Select Fibonacci Exit Level</option>
                  {FIB_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                  <option value={CUSTOM_FIB_VALUE}>Custom level...</option>
                </select>
                {isCustomExit ? (
                  <>
                    <input
                      type="text"
                      name="exit"
                      value={formData.exit}
                      onChange={handleInputChange}
                      placeholder="e.g., L2.236 or Manual exit zone"
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.exit ? 'border-red-500' : 'border-border'}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Examples: <span className="font-medium text-foreground">L1.618</span>, <span className="font-medium text-foreground">L2.236</span>, <span className="font-medium text-foreground">BE</span>, <span className="font-medium text-foreground">Trail Exit</span>
                    </p>
                  </>
                ) : null}
              </div>
              {errors.exit && <p className="text-xs text-red-500 mt-1">{errors.exit}</p>}
            </div>

            {/* Quantity / Lot Size */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Quantity / Lot Size*</label>
                <input
                  type="number"
                  step="0.01"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.quantity ? 'border-red-500' : 'border-border'}`}
                />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
              </div>
            </div>

            {/* Brokerage */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Brokerage / Charges</label>
              <p className="text-xs text-muted-foreground mb-3">
                Auto-deducted from the P&L you enter below to calculate Net P&L.
              </p>
              <input
                type="number"
                step="0.01"
                name="brokerage"
                value={formData.brokerage}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Currency and P&L (Mandatory) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Currency*</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as Currency }))}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Gross P&L (Before Brokerage) - Mandatory*</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currentCurrencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    name="manualProfit"
                    value={formData.manualProfit}
                    onChange={handleInputChange}
                    placeholder="e.g., 250.50 or -125.00"
                    className={`w-full pl-8 pr-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.manualProfit ? 'border-red-500' : 'border-border'}`}
                  />
                </div>
                {errors.manualProfit && <p className="text-xs text-red-500 mt-1">{errors.manualProfit}</p>}
                <p className="text-xs text-muted-foreground mt-1">Enter gross P&L. Brokerage is auto-deducted. W/L derived from net P&L.</p>
              </div>
            </div>

            {/* R Factor (Mandatory) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">R Factor (Risk Multiple) - Mandatory*</label>
              <p className="text-xs text-muted-foreground mb-2">Enter the risk multiple. Sign is auto-corrected based on P&L (loss = negative R).</p>
              <input
                type="number"
                step="0.1"
                name="exitRFactor"
                value={formData.exitRFactor}
                onChange={handleInputChange}
                placeholder="e.g., 2.5 (sign auto-corrected based on P&L)"
                className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.exitRFactor ? 'border-red-500' : 'border-border'}`}
              />
              {errors.exitRFactor && <p className="text-xs text-red-500 mt-1">{errors.exitRFactor}</p>}
            </div>

            {/* Confidence */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Confidence Level: {formData.confidence}/10</label>
              <input
                type="range"
                name="confidence"
                min="1"
                max="10"
                value={formData.confidence}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>

            {/* Live Preview - shows auto-derived W/L with brokerage deducted */}
            {livePreviewValues && (
              <div className="p-4 bg-secondary rounded-lg border border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Net P&L ({formData.currency})</p>
                    <p className={`text-lg font-bold ${parseFloat(livePreviewValues.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentCurrencySymbol}{livePreviewValues.pnl}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">R-Factor</p>
                    <p className="text-lg font-bold text-blue-400">{livePreviewValues.rFactor}R</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trade Outcome (Auto)</p>
                    <p className={`text-lg font-bold ${
                      livePreviewValues.outcome === 'W' ? 'text-green-400' : 
                      livePreviewValues.outcome === 'L' ? 'text-red-400' : 
                      'text-yellow-400'
                    }`}>
                      {livePreviewValues.outcome === 'W' ? 'Win' : 
                       livePreviewValues.outcome === 'L' ? 'Loss' : 
                       'Break-Even'}
                    </p>
                  </div>
                </div>
                {'grossPnl' in livePreviewValues && parseFloat(livePreviewValues.charges || '0') > 0 && (
                  <div className="flex gap-4 text-xs border-t border-border pt-2">
                    <span className="text-muted-foreground">
                      Gross: <span className={parseFloat(livePreviewValues.grossPnl || '0') >= 0 ? 'text-green-400' : 'text-red-400'}>{currentCurrencySymbol}{livePreviewValues.grossPnl}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Brokerage/Charges: <span className="text-orange-400">-{currentCurrencySymbol}{livePreviewValues.charges}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Trade Tags</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., A+, breakout, FOMO, news, high confidence"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas to improve filtering and analytics.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Pre-Trade Notes</label>
              <textarea
                name="preNotes"
                value={formData.preNotes}
                onChange={handleInputChange}
                placeholder="What was your setup? Why did you take this trade?"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Post-Trade Notes</label>
              <textarea
                name="postNotes"
                value={formData.postNotes}
                onChange={handleInputChange}
                placeholder="How did it go? What did you learn from this trade?"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>

            {/* Mistake Tag */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Mistake Tag (For Losing Trades)</label>
              <select
                name="mistakeTag"
                value={formData.mistakeTag || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select mistake tag (if applicable)</option>
                <option value="No mistake (good loss)">No mistake (good loss)</option>
                <option value="Overtrading">Overtrading</option>
                <option value="Early exit">Early exit</option>
                <option value="Late entry">Late entry</option>
                <option value="SL hunt fear">SL hunt fear</option>
                <option value="Greed">Greed</option>
              </select>
            </div>

            {/* Screenshot Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Before Trade Screenshot */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Before Trade</label>
                {beforeScreenshot ? (
                  <div className="relative inline-block w-full">
                    <ScreenshotViewer imageUrl={beforeScreenshot} title="Before Trade Screenshot" />
                    <button
                      type="button"
                      onClick={clearBeforeScreenshot}
                      className="absolute top-2 right-2 p-1 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div
                    onPaste={handlePasteImage('before')}
                    className="flex items-center justify-center w-full p-4 sm:p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <label className="w-full text-center cursor-pointer">
                      <div>
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-muted-foreground mb-2" />
                        <span className="text-xs sm:text-sm text-foreground block">Upload or paste</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleBeforeScreenshot} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* After Exit Screenshot */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">After Exit</label>
                {afterScreenshot ? (
                  <div className="relative inline-block w-full">
                    <ScreenshotViewer imageUrl={afterScreenshot} title="After Exit Screenshot" />
                    <button
                      type="button"
                      onClick={clearAfterScreenshot}
                      className="absolute top-2 right-2 p-1 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div
                    onPaste={handlePasteImage('after')}
                    className="flex items-center justify-center w-full p-4 sm:p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <label className="w-full text-center cursor-pointer">
                      <div>
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-muted-foreground mb-2" />
                        <span className="text-xs sm:text-sm text-foreground block">Upload or paste</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleAfterScreenshot} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base py-2 sm:py-2.5">
              Add Trade
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
