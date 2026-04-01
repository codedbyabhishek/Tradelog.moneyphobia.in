'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/settings-context';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StartingBalanceSettings() {
  const { baseCurrency, startingBalance, setStartingBalance } = useSettings();
  const [draftValue, setDraftValue] = useState(String(startingBalance));

  useEffect(() => {
    setDraftValue(String(startingBalance));
  }, [startingBalance]);

  const handleSave = () => {
    const parsed = Number(draftValue);
    setStartingBalance(Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Starting Balance</CardTitle>
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
            <Button type="button" onClick={handleSave}>
              Save
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
