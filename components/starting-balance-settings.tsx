'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/settings-context';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function StartingBalanceSettings() {
  const { baseCurrency, startingBalance, setStartingBalance } = useSettings();
  const [draftValue, setDraftValue] = useState(String(startingBalance));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { toast } = useToast();

  useEffect(() => {
    setDraftValue(String(startingBalance));
  }, [startingBalance]);

  const handleSave = async () => {
    const parsed = Number(draftValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast({
        title: 'Invalid starting balance',
        description: 'Enter a valid amount that is zero or greater.',
        variant: 'destructive',
      });
      return;
    }

    setSaveState('saving');
    try {
      await setStartingBalance(parsed);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch (error) {
      setSaveState('idle');
      toast({
        title: 'Starting balance not saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">Starting Balance</CardTitle>
          <span className="text-xs text-muted-foreground">
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Manual save'}
          </span>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Set your initial trading capital so the app can show balance growth alongside your journal results
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-foreground sm:min-w-36">
            Starting Capital:
          </label>
          <div className="flex flex-1 gap-2">
            <div className="flex flex-1 items-center rounded-md border border-border bg-background px-3">
              <span className="mr-2 text-sm text-muted-foreground">{CURRENCY_SYMBOLS[baseCurrency]}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="h-10 w-full bg-transparent outline-none"
                placeholder="0.00"
              />
            </div>
            <Button type="button" onClick={() => void handleSave()} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="rounded-lg bg-muted p-3 text-xs sm:text-sm text-muted-foreground">
          <p className="font-medium mb-1">What this changes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your starting balance stays separate from synced and manual trades</li>
            <li>Current balance becomes starting balance plus cumulative net P&amp;L</li>
            <li>You can update it later if you want the journal to reflect a different capital base</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
