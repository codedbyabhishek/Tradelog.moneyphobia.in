'use client';

import { useState } from 'react';
import { useSettings } from '@/lib/settings-context';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { Currency } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const AVAILABLE_CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

export default function CurrencySettings() {
  const { baseCurrency, setBaseCurrency } = useSettings();
  const { toast } = useToast();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleCurrencyChange = async (value: string) => {
    const nextCurrency = value as Currency;
    if (nextCurrency === baseCurrency) return;

    setSaveState('saving');
    try {
      await setBaseCurrency(nextCurrency);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch (error) {
      setSaveState('idle');
      toast({
        title: 'Currency not saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">Base Currency</CardTitle>
          <span className="text-xs text-muted-foreground">
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Auto-saves'}
          </span>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Select the currency for displaying analytics and P&L summaries across your trading journal
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-foreground">Display Currency:</div>
          <Select value={baseCurrency} onValueChange={(value) => void handleCurrencyChange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency} {CURRENCY_SYMBOLS[currency]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg text-xs sm:text-sm text-muted-foreground">
          <p className="font-medium mb-1">How this works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Each trade retains its original currency (e.g., trades in INR stay in INR)</li>
            <li>P&L is automatically converted to your selected base currency using exchange rates at trade close time</li>
            <li>Analytics, charts, and summaries display values in your selected base currency</li>
            <li>Multi-currency trading is fully supported - all calculations are accurate</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
