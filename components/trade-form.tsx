'use client';

import React from "react"
import { useEffect, useMemo, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { convertFormToTrade } from '@/lib/trade-utils';
import { validateTradeForm, sanitizeString, validateImageFile } from '@/lib/validation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, ChevronDown, Upload, X } from 'lucide-react';
import { TradeFormData, Currency, EmotionTag, MISTAKE_TAG_OPTIONS, MARKET_CONDITION_OPTIONS, RULE_VIOLATION_OPTIONS, type RuleViolation } from '@/lib/types';
import { calculatePnL, calculateRFactor, CURRENCY_SYMBOLS, getTradeOutcome } from '@/lib/trade-utils';
import { ScreenshotViewer } from './screenshot-viewer';
import { useToast } from '@/hooks/use-toast';
import { clearPreTradeDraft, readPreTradeDraft } from '@/lib/pre-trade-draft';
import { useTemplates } from '@/lib/templates-context';

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
const EMOTION_OPTIONS: EmotionTag[] = [
  'Calm',
  'Confident',
  'Anxious',
  'Fearful',
  'Greedy',
  'Frustrated',
  'Revenge',
  'FOMO',
  'Neutral',
];
const RULE_VIOLATION_LABELS: Record<(typeof RULE_VIOLATION_OPTIONS)[number], string> = {
  Early_Entry: 'Early entry',
  Late_Entry: 'Late entry',
  SL_Moved: 'Stop loss moved',
  TP_Moved: 'Target moved',
  Over_Risked: 'Over-risked',
  Under_Risked: 'Under-risked',
  Revenge_Trade: 'Revenge trade',
  FOMO_Entry: 'FOMO entry',
  No_Setup: 'No setup',
};
const MARKET_CONDITION_LABELS: Record<(typeof MARKET_CONDITION_OPTIONS)[number], string> = {
  Trending: 'Trending',
  Ranging: 'Ranging',
  High_Volatility: 'High volatility',
  Low_Volatility: 'Low volatility',
  News_Day: 'News day',
  Normal: 'Normal',
};

const TRADE_FORM_DEFAULTS_KEY = 'journal.tradeFormDefaults.v1';
type ResultEntryMode = 'manual' | 'execution';

export default function TradeForm({ onSuccess }: TradeFormProps) {
  const { addTrade, trades } = useTrades();
  const { templates, incrementUsageCount } = useTemplates();
  const { toast } = useToast();
  const draft = readPreTradeDraft();
  const hasPreTradeDraft = Boolean(draft && Object.values(draft).some(Boolean));
  // Form data state
  const [formData, setFormData] = useState<TradeFormData>(() => {
    let storedDefaults: Partial<TradeFormData> = {};

    if (typeof window !== 'undefined') {
      try {
        storedDefaults = JSON.parse(window.localStorage.getItem(TRADE_FORM_DEFAULTS_KEY) || '{}') as Partial<TradeFormData>;
      } catch (error) {
        console.warn('[v0] Unable to restore trade form defaults', error);
      }
    }

    return {
      date: new Date().toISOString().split('T')[0],
      tags: '',
      symbol: storedDefaults.symbol || '',
      tradeType: storedDefaults.tradeType || 'Intraday',
      setupName: storedDefaults.setupName || '',
      position: storedDefaults.position || 'Buy',
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
      timeFrame: draft?.timeFrame || storedDefaults.timeFrame || '',
      // isWin is now auto-derived from P&L, no longer manually set
      limit: '',
      exit: '',
      marketCondition: 'Normal',
      ruleFollowed: true,
      ruleViolations: [],
      emotionEntry: undefined,
      emotionExit: undefined,
      plannedRTarget: '',
    };
  });

  // Screenshot state
  const [beforeScreenshot, setBeforeScreenshot] = useState<string | null>(null);
  const [afterScreenshot, setAfterScreenshot] = useState<string | null>(null);

  // Validation state for enhanced error handling
  const [errors, setErrors] = useState<Partial<Record<keyof TradeFormData, string>>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCustomSetup, setIsCustomSetup] = useState(
    Boolean(formData.setupName && !PRESET_SETUPS.includes(formData.setupName as (typeof PRESET_SETUPS)[number]))
  );
  const [showChecklistValues, setShowChecklistValues] = useState(false);
  const [showReviewSections, setShowReviewSections] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [useFibonacciLevels, setUseFibonacciLevels] = useState(false);
  const [riskGateAcknowledged, setRiskGateAcknowledged] = useState(false);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState('');
  const [resultEntryMode, setResultEntryMode] = useState<ResultEntryMode>('manual');
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

    setRiskGateAcknowledged(false);
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const defaultsToPersist = {
      tradeType: formData.tradeType,
      position: formData.position,
      timeFrame: formData.timeFrame,
      symbol: formData.symbol,
      setupName: formData.setupName,
    };

    window.localStorage.setItem(TRADE_FORM_DEFAULTS_KEY, JSON.stringify(defaultsToPersist));
  }, [formData.position, formData.setupName, formData.symbol, formData.timeFrame, formData.tradeType]);

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
    setRiskGateAcknowledged(false);
  };

  const handleRuleFollowedChange = (checked: boolean) => {
    setRiskGateAcknowledged(false);
    setFormData((prev) => ({
      ...prev,
      ruleFollowed: checked,
      ruleViolations: checked ? [] : prev.ruleViolations || [],
    }));
  };

  const handleRuleViolationToggle = (violation: RuleViolation, checked: boolean) => {
    setRiskGateAcknowledged(false);
    setFormData((prev) => {
      const nextViolations = new Set(prev.ruleViolations || []);
      if (checked) {
        nextViolations.add(violation);
      } else {
        nextViolations.delete(violation);
      }

      return {
        ...prev,
        ruleFollowed: nextViolations.size === 0,
        ruleViolations: Array.from(nextViolations),
      };
    });
  };

  const handleApplyPlaybook = () => {
    const playbook = templates.find((template) => template.id === selectedPlaybookId);
    if (!playbook) return;

    const playbookNotes = [
      playbook.preNotes,
      playbook.entryRules ? `Entry rules: ${playbook.entryRules}` : '',
      playbook.invalidationRules ? `Invalidation: ${playbook.invalidationRules}` : '',
      playbook.targetRules ? `Target logic: ${playbook.targetRules}` : '',
      playbook.idealConditions ? `Ideal conditions: ${playbook.idealConditions}` : '',
      playbook.commonMistakes ? `Avoid: ${playbook.commonMistakes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    setRiskGateAcknowledged(false);
    setFormData((prev) => ({
      ...prev,
      symbol: playbook.symbol || prev.symbol,
      setupName: playbook.setupName || prev.setupName,
      tradeType: playbook.tradeType || prev.tradeType,
      position: playbook.position || prev.position,
      timeFrame: playbook.timeFrame || prev.timeFrame,
      plannedRTarget: playbook.plannedRTarget ? String(playbook.plannedRTarget) : prev.plannedRTarget,
      marketCondition: (playbook.marketCondition as TradeFormData['marketCondition']) || prev.marketCondition,
      marketTrend: (playbook.marketTrend as TradeFormData['marketTrend']) || prev.marketTrend,
      setupType: (playbook.setupType as TradeFormData['setupType']) || prev.setupType,
      volumeProfile: (playbook.volumeProfile as TradeFormData['volumeProfile']) || prev.volumeProfile,
      emaTouch: playbook.emaTouch || prev.emaTouch,
      riskRewardRatio: playbook.riskRewardRatio || prev.riskRewardRatio,
      marketOpenType: (playbook.marketOpenType as TradeFormData['marketOpenType']) || prev.marketOpenType,
      firstFiveMinuteCandleType: (playbook.firstFiveMinuteCandleType as TradeFormData['firstFiveMinuteCandleType']) || prev.firstFiveMinuteCandleType,
      tags: playbook.tags?.length ? playbook.tags.join(', ') : prev.tags,
      preNotes: playbookNotes || prev.preNotes,
    }));
    incrementUsageCount(playbook.id);
    toast({
      title: 'Playbook applied',
      description: `${playbook.name} has been used to prefill this trade.`,
    });
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
    const validationErrors = validateTradeForm(formData, {
      requireFibonacciLevels: useFibonacciLevels,
      resultMode: resultEntryMode,
    });
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

    if (riskGateWarnings.length > 0 && !riskGateAcknowledged) {
      toast({
        title: 'Review the risk gate first',
        description: 'Please acknowledge the discipline and risk warnings before saving this trade.',
        variant: 'destructive',
      });
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
        marketCondition: 'Normal',
        ruleFollowed: true,
        ruleViolations: [],
        emotionEntry: undefined,
        emotionExit: undefined,
        plannedRTarget: '',
      }));
      clearBeforeScreenshot();
      clearAfterScreenshot();
      clearPreTradeDraft();
      setErrors({});
      setSubmitStatus('success');
      setIsCustomSetup(false);
      setIsCustomLimit(false);
      setIsCustomExit(false);
      setUseFibonacciLevels(false);
      setRiskGateAcknowledged(false);
      setSelectedPlaybookId('');
      setResultEntryMode('manual');

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
  const recentSymbols = useMemo(
    () =>
      Array.from(new Set(trades.map((trade) => trade.symbol).filter(Boolean)))
        .slice(0, 5),
    [trades]
  );
  const recentSetups = useMemo(
    () =>
      Array.from(new Set(trades.map((trade) => trade.setupName).filter(Boolean)))
        .slice(0, 5),
    [trades]
  );
  const selectedPlaybook = templates.find((template) => template.id === selectedPlaybookId) || null;
  const selectedRuleViolations = formData.ruleViolations || [];
  const brokerageValue = parseFloat(formData.brokerage || '0') || 0;
  const exchangeChargesValue = parseFloat(formData.exchangeCharges || '0') || 0;
  const taxesValue = parseFloat(formData.taxes || '0') || 0;
  const totalCharges = brokerageValue + exchangeChargesValue + taxesValue;
  const netManualPnl = formData.manualProfit ? (parseFloat(formData.manualProfit) || 0) - totalCharges : null;
  const plannedRiskAmount =
    formData.entryPrice && formData.quantity && formData.stopLoss
      ? Math.abs((parseFloat(formData.entryPrice) || 0) - (parseFloat(formData.stopLoss) || 0)) * (parseFloat(formData.quantity) || 0)
      : null;
  const recentLossStreak = (() => {
    const sortedTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;

    for (const trade of sortedTrades) {
      if (trade.pnl < 0) {
        streak += 1;
        continue;
      }
      break;
    }

    return streak;
  })();
  const riskGateWarnings = (() => {
    const warnings: string[] = [];
    const rrValue = parseFloat(formData.riskRewardRatio || '0');
    const confidenceValue = parseInt(formData.confidence || '0', 10);
    const plannedRTargetValue = parseFloat(formData.plannedRTarget || '0');

    if (!formData.ruleFollowed) {
      warnings.push('This trade is marked as off-plan. Review whether it deserves to be taken or should be tagged purely as a mistake.');
    }

    if (selectedRuleViolations.length > 0) {
      warnings.push(`Rule violations selected: ${selectedRuleViolations.map((item) => RULE_VIOLATION_LABELS[item as (typeof RULE_VIOLATION_OPTIONS)[number]] || item).join(', ')}.`);
    }

    if (Number.isFinite(rrValue) && rrValue > 0 && rrValue < 1.5) {
      warnings.push('Risk-reward is below 1.5R. Your edge may need a tighter entry or a better target.');
    }

    if (Number.isFinite(confidenceValue) && confidenceValue > 0 && confidenceValue <= 3) {
      warnings.push('Confidence is 3/10 or lower. This usually means the setup is not clear enough yet.');
    }

    if (recentLossStreak >= 2) {
      warnings.push(`You are coming off ${recentLossStreak} losing trade${recentLossStreak > 1 ? 's' : ''} in a row. Consider reducing size or waiting for a cleaner setup.`);
    }

    if (formData.marketCondition === 'News_Day') {
      warnings.push('News day selected. Volatility and slippage risk are higher than usual.');
    }

    if (Number.isFinite(plannedRTargetValue) && plannedRTargetValue > 0 && Number.isFinite(rrValue) && rrValue > 0 && plannedRTargetValue > rrValue) {
      warnings.push('Planned R target is higher than the current risk-reward estimate. Double-check whether the target is realistic.');
    }

    if (selectedPlaybook) {
      const mismatchChecks: Array<{ label: string; playbookValue?: string | null; currentValue?: string | null }> = [
        { label: 'setup', playbookValue: selectedPlaybook.setupName, currentValue: formData.setupName },
        { label: 'time frame', playbookValue: selectedPlaybook.timeFrame, currentValue: formData.timeFrame },
        { label: 'market condition', playbookValue: selectedPlaybook.marketCondition, currentValue: formData.marketCondition },
        { label: 'market trend', playbookValue: selectedPlaybook.marketTrend, currentValue: formData.marketTrend },
        { label: 'setup type', playbookValue: selectedPlaybook.setupType, currentValue: formData.setupType },
      ];

      mismatchChecks.forEach(({ label, playbookValue, currentValue }) => {
        if (playbookValue && currentValue && playbookValue !== currentValue) {
          warnings.push(`Current ${label} differs from the selected playbook (${playbookValue}).`);
        }
      });

      if (
        selectedPlaybook.riskRewardRatio &&
        formData.riskRewardRatio &&
        selectedPlaybook.riskRewardRatio !== formData.riskRewardRatio
      ) {
        warnings.push(`Risk-reward ratio differs from the selected playbook (${selectedPlaybook.riskRewardRatio}).`);
      }

      if (
        selectedPlaybook.plannedRTarget !== undefined &&
        formData.plannedRTarget &&
        Number(formData.plannedRTarget) !== selectedPlaybook.plannedRTarget
      ) {
        warnings.push(`Planned R target differs from the selected playbook (${selectedPlaybook.plannedRTarget}R).`);
      }
    }

    return warnings;
  })();

  // Calculate live P&L and R-Factor for preview (only if prices are provided)
  // Also show auto-derived W/L based on P&L
  const livePreviewValues = (() => {
    try {
      if (resultEntryMode === 'execution' && formData.entryPrice && formData.exitPrice && formData.quantity && formData.stopLoss) {
        const pnl = calculatePnL(
          parseFloat(formData.entryPrice),
          parseFloat(formData.exitPrice),
          parseFloat(formData.quantity),
          formData.position,
          totalCharges
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
  const quickStats = [
    { label: 'Trade type', value: formData.tradeType },
    { label: 'Position', value: formData.position },
    { label: 'Time frame', value: formData.timeFrame || 'Add timeframe' },
    { label: 'Result mode', value: resultEntryMode === 'manual' ? 'Manual P&L' : 'Execution-derived' },
  ];

  return (
    <div className="min-h-full w-full max-w-4xl mx-auto p-3 sm:p-6 lg:p-8">
      <Card className="min-h-full bg-card border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">Add New Trade</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Record your trade details and analysis</CardDescription>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickStats.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/60 bg-background/70 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 lg:space-y-8">
            <Card className="border-primary/20 bg-primary/5 shadow-none">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-lg sm:text-xl">Apply Playbook</CardTitle>
                <CardDescription>
                  Pull in a saved setup so your trade starts with the right structure, context, and notes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-4 pt-0 sm:flex-row sm:items-end sm:p-5 sm:pt-0">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-2">Saved Playbook</label>
                  <select
                    value={selectedPlaybookId}
                    onChange={(e) => setSelectedPlaybookId(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choose a playbook</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} • {template.setupName}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="outline" onClick={handleApplyPlaybook} disabled={!selectedPlaybookId}>
                  Apply Playbook
                </Button>
              </CardContent>
            </Card>

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Core Trade Details</h2>
                <p className="text-sm text-muted-foreground">
                  Keep the main trade facts up top so the first save path stays quick.
                </p>
              </div>

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
                    <label className="block text-sm font-medium text-foreground mb-2">Market Trend</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">Setup Type</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">Volume</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">EMA Touch</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">Risk-Reward Ratio</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">Market Open Type</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">First 5-Min Candle</label>
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
                {recentSymbols.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recentSymbols.map((symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => {
                          setRiskGateAcknowledged(false);
                          setFormData((prev) => ({ ...prev, symbol }));
                        }}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                ) : null}
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
                {recentSetups.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recentSetups.map((setup) => (
                      <button
                        key={setup}
                        type="button"
                        onClick={() => {
                          setRiskGateAcknowledged(false);
                          setIsCustomSetup(!PRESET_SETUPS.includes(setup as (typeof PRESET_SETUPS)[number]));
                          setFormData((prev) => ({ ...prev, setupName: setup }));
                        }}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {setup}
                      </button>
                    ))}
                  </div>
                ) : null}
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
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Execution & Result</h2>
                <p className="text-sm text-muted-foreground">
                  Use manual P&amp;L for quick journaling, or switch to execution-derived mode to calculate the result from prices.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background/60 p-4">
                <label className="block text-sm font-medium text-foreground mb-3">Result Entry Mode</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setResultEntryMode('manual')}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      resultEntryMode === 'manual'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">Manual P&amp;L</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Best when you already know the gross P&amp;L and R result.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResultEntryMode('execution');
                      setFormData((prev) => ({
                        ...prev,
                        manualProfit: '',
                        exitRFactor: '',
                      }));
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.manualProfit;
                        delete next.exitRFactor;
                        return next;
                      });
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      resultEntryMode === 'execution'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">Execution-derived</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requires entry and exit prices, then computes net P&amp;L and R automatically.
                    </p>
                  </button>
                </div>
              </div>

            {/* Entry Price (Optional) and Exit Price (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Entry Price {resultEntryMode === 'execution' ? '*' : '(Optional)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="entryPrice"
                  value={formData.entryPrice}
                  onChange={handleInputChange}
                  placeholder="Leave empty for process-based journaling"
                  className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.entryPrice ? 'border-red-500' : 'border-border'}`}
                />
                {errors.entryPrice && <p className="text-xs text-red-500 mt-1">{errors.entryPrice}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Exit Price {resultEntryMode === 'execution' ? '*' : '(Optional)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="exitPrice"
                  value={formData.exitPrice}
                  onChange={handleInputChange}
                  placeholder="Leave empty for process-based journaling"
                  className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.exitPrice ? 'border-red-500' : 'border-border'}`}
                />
                {errors.exitPrice && <p className="text-xs text-red-500 mt-1">{errors.exitPrice}</p>}
              </div>
            </div>

            {/* Stop Loss and Limit (Fibonacci) */}
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <label
                htmlFor="use-fibonacci-levels"
                className="flex cursor-pointer items-start gap-3 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                <Checkbox
                  id="use-fibonacci-levels"
                  checked={useFibonacciLevels}
                  className="mt-0.5 size-5 border-2 border-primary bg-background shadow-none"
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setUseFibonacciLevels(enabled);
                    if (!enabled) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.limit;
                        delete next.exit;
                        return next;
                      });
                    }
                  }}
                />
                <div className="space-y-1">
                  <div className="block text-sm font-medium text-foreground">
                    Fibonacci Level checklist
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Turn this on only if this trade uses Fibonacci levels. Then limit and exit Fibonacci fields become mandatory.
                  </p>
                </div>
              </label>
            </div>

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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Limit (Fibonacci Level){useFibonacciLevels ? '*' : ''}
                </label>
                <div className="space-y-2">
                  <select
                    name="limit"
                    value={isCustomLimit ? CUSTOM_FIB_VALUE : formData.limit}
                    onChange={handleFibPresetChange('limit')}
                    disabled={!useFibonacciLevels}
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
                        disabled={!useFibonacciLevels}
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Exit (Fibonacci Level){useFibonacciLevels ? '*' : ''}
              </label>
              <div className="space-y-2">
                <select
                  name="exit"
                  value={isCustomExit ? CUSTOM_FIB_VALUE : formData.exit}
                  onChange={handleFibPresetChange('exit')}
                  disabled={!useFibonacciLevels}
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
                      disabled={!useFibonacciLevels}
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
                  onChange={(e) => {
                    setRiskGateAcknowledged(false);
                    setFormData(prev => ({ ...prev, currency: e.target.value as Currency }));
                  }}
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Gross P&amp;L (Before Brokerage){resultEntryMode === 'manual' ? ' *' : ' (Optional override)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currentCurrencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    name="manualProfit"
                    value={formData.manualProfit}
                    onChange={handleInputChange}
                    placeholder="e.g., 250.50 or -125.00"
                    disabled={resultEntryMode === 'execution'}
                    className={`w-full pl-8 pr-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.manualProfit ? 'border-red-500' : 'border-border'}`}
                  />
                </div>
                {errors.manualProfit && <p className="text-xs text-red-500 mt-1">{errors.manualProfit}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {resultEntryMode === 'manual'
                    ? 'Enter gross P&L. Brokerage is auto-deducted. W/L is derived from net P&L.'
                    : 'Execution-derived mode calculates net P&L from entry, exit, quantity, and charges.'}
                </p>
              </div>
            </div>

            {/* R Factor (Mandatory) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                R Factor (Risk Multiple){resultEntryMode === 'manual' ? ' *' : ' (Auto when possible)'}
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                {resultEntryMode === 'manual'
                  ? 'Enter the risk multiple. Sign is auto-corrected based on P&L (loss = negative R).'
                  : 'If left empty, R is derived from P&L, entry, stop loss, and quantity.'}
              </p>
              <input
                type="number"
                step="0.1"
                name="exitRFactor"
                value={formData.exitRFactor}
                onChange={handleInputChange}
                placeholder="e.g., 2.5 (sign auto-corrected based on P&L)"
                disabled={resultEntryMode === 'execution'}
                className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.exitRFactor ? 'border-red-500' : 'border-border'}`}
              />
              {errors.exitRFactor && <p className="text-xs text-red-500 mt-1">{errors.exitRFactor}</p>}
            </div>
            </section>

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

            {(riskGateWarnings.length > 0 || plannedRiskAmount !== null || netManualPnl !== null) && (
              <Card className="border-amber-500/30 bg-amber-500/5 shadow-none">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Pre-Trade Risk Gate
                  </CardTitle>
                  <CardDescription>
                    {selectedPlaybook ? `Comparing this trade against ${selectedPlaybook.name}.` : 'A quick discipline check before this trade gets saved.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Planned risk</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {plannedRiskAmount !== null ? `${currentCurrencySymbol}${plannedRiskAmount.toFixed(2)}` : 'Add entry, stop, and quantity'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Net outcome preview</p>
                      <p className={`mt-1 text-lg font-semibold ${netManualPnl !== null && netManualPnl < 0 ? 'text-red-400' : 'text-foreground'}`}>
                        {netManualPnl !== null ? `${currentCurrencySymbol}${netManualPnl.toFixed(2)}` : 'Add gross P&L'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Recent loss streak</p>
                      <p className={`mt-1 text-lg font-semibold ${recentLossStreak >= 2 ? 'text-amber-300' : 'text-foreground'}`}>
                        {recentLossStreak} trade{recentLossStreak === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  {riskGateWarnings.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-amber-500/20 bg-background/70 p-3">
                      <p className="text-sm font-medium text-foreground">Warnings to review</p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {riskGateWarnings.map((warning) => (
                          <li key={warning} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                      No major discipline warnings right now. This trade looks aligned with the inputs you entered.
                    </div>
                  )}

                  {riskGateWarnings.length > 0 && (
                    <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3">
                      <Checkbox
                        checked={riskGateAcknowledged}
                        onCheckedChange={(checked) => setRiskGateAcknowledged(Boolean(checked))}
                      />
                      <span className="text-sm text-foreground">
                        I reviewed these warnings and still want to save this trade.
                      </span>
                    </label>
                  )}
                </CardContent>
              </Card>
            )}

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Review & Reflection</h2>
                  <p className="text-sm text-muted-foreground">
                    Keep the core trade save path clean, then open this when you want richer context.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewSections((prev) => !prev)}
                >
                  {showReviewSections ? 'Hide Review Fields' : 'Show Review Fields'}
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showReviewSections ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              {showReviewSections ? (
                <div className="space-y-4">
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
                      placeholder="Why did I take this trade? What confirmed the entry?"
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
                      placeholder="What would I repeat, adjust, or avoid next time?"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  </div>

                  <Card className="border-border/70 bg-card/60 shadow-none">
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-base">Discipline & Context Tracker</CardTitle>
                      <CardDescription>
                        Capture whether the trade followed plan, what market environment you were in, and which execution mistakes showed up.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Market Condition</label>
                    <select
                      name="marketCondition"
                      value={formData.marketCondition || 'Normal'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {MARKET_CONDITION_OPTIONS.map((condition) => (
                        <option key={condition} value={condition}>
                          {MARKET_CONDITION_LABELS[condition]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Planned Target (R)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      name="plannedRTarget"
                      value={formData.plannedRTarget || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., 2.0"
                      className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.plannedRTarget ? 'border-red-500' : 'border-border'}`}
                    />
                    {errors.plannedRTarget && <p className="text-xs text-red-500 mt-1">{errors.plannedRTarget}</p>}
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-border bg-background/70 p-3">
                  <Checkbox
                    checked={formData.ruleFollowed}
                    onCheckedChange={(checked) => handleRuleFollowedChange(Boolean(checked))}
                  />
                  <span className="text-sm text-foreground">
                    This trade followed my planned rules and setup criteria.
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Rule Violations</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {RULE_VIOLATION_OPTIONS.map((violation) => (
                      <label
                        key={violation}
                        className="flex items-start gap-3 rounded-lg border border-border bg-background/70 p-3"
                      >
                        <Checkbox
                          checked={selectedRuleViolations.includes(violation)}
                          onCheckedChange={(checked) => handleRuleViolationToggle(violation, Boolean(checked))}
                        />
                        <span className="text-sm text-foreground">{RULE_VIOLATION_LABELS[violation]}</span>
                      </label>
                    ))}
                  </div>
                  {errors.ruleViolations && <p className="text-xs text-red-500 mt-2">{errors.ruleViolations}</p>}
                </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Entry Emotion</label>
                <select
                  name="emotionEntry"
                  value={formData.emotionEntry || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select entry emotion</option>
                  {EMOTION_OPTIONS.map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {emotion}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  How you felt when entering the trade.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Exit Emotion</label>
                <select
                  name="emotionExit"
                  value={formData.emotionExit || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select exit emotion</option>
                  {EMOTION_OPTIONS.map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {emotion}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  How you felt when closing or exiting the trade.
                </p>
              </div>
                  </div>

                  {/* Mistake Tag */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Mistake Tag</label>
                    <select
                      name="mistakeTag"
                      value={formData.mistakeTag || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select mistake tag (if applicable)</option>
                      {MISTAKE_TAG_OPTIONS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use this even for breakeven or winning trades if the process was poor. It helps the weekly review surface repeated mistakes faster.
                    </p>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Attachments</h2>
                  <p className="text-sm text-muted-foreground">
                    Keep chart images available when you need them, without crowding the form every time.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAttachments((prev) => !prev)}
                >
                  {showAttachments ? 'Hide Attachments' : 'Show Attachments'}
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAttachments ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              {showAttachments ? (
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
              ) : null}
            </section>

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
