'use client';

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

const AVAILABLE_CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

export default function CurrencySettings() {
  const { baseCurrency, setBaseCurrency } = useSettings();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Base Currency</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Select the currency for displaying analytics and P&L summaries across your trading journal
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-foreground">Display Currency:</div>
          <Select value={baseCurrency} onValueChange={(value) => setBaseCurrency(value as Currency)}>
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
