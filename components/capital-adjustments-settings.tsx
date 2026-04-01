'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CapitalAdjustment } from '@/lib/types';
import { useSettings } from '@/lib/settings-context';
import { CURRENCY_SYMBOLS, getNetCapitalAdjustments } from '@/lib/trade-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CapitalAdjustmentsSettings() {
  const { baseCurrency, capitalAdjustments, saveCapitalAdjustments } = useSettings();
  const [date, setDate] = useState('');
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const sortedAdjustments = useMemo(() => {
    return [...capitalAdjustments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [capitalAdjustments]);

  const totalNetAdjustment = getNetCapitalAdjustments(capitalAdjustments);

  const handleAdd = () => {
    const parsedAmount = Number(amount);
    if (!date || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const next: CapitalAdjustment = {
      id: `capital-${Date.now()}`,
      date,
      type,
      amount: parsedAmount,
      note: note.trim(),
    };

    saveCapitalAdjustments([...capitalAdjustments, next]);
    setDate('');
    setType('deposit');
    setAmount('');
    setNote('');
  };

  const handleDelete = (id: string) => {
    saveCapitalAdjustments(capitalAdjustments.filter((item) => item.id !== id));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Deposits & Withdrawals</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Track capital added to or removed from the account so balance charts reflect real account movement
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value === 'withdrawal' ? 'withdrawal' : 'deposit')}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
          <div className="flex items-center rounded-md border border-border bg-background px-3">
            <span className="mr-2 text-sm text-muted-foreground">{CURRENCY_SYMBOLS[baseCurrency]}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-full bg-transparent outline-none text-sm"
              placeholder="Amount"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Note (optional)"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Net capital change: <span className={totalNetAdjustment >= 0 ? 'text-green-400' : 'text-red-400'}>
              {CURRENCY_SYMBOLS[baseCurrency]}{totalNetAdjustment.toFixed(2)}
            </span>
          </p>
          <Button type="button" onClick={handleAdd}>
            Add Entry
          </Button>
        </div>

        {sortedAdjustments.length > 0 ? (
          <div className="space-y-2">
            {sortedAdjustments.map((adjustment) => (
              <div
                key={adjustment.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {adjustment.type === 'withdrawal' ? 'Withdrawal' : 'Deposit'} on {adjustment.date}
                  </p>
                  <p className={`text-sm ${adjustment.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>
                    {adjustment.type === 'withdrawal' ? '-' : '+'}
                    {CURRENCY_SYMBOLS[baseCurrency]}{adjustment.amount.toFixed(2)}
                  </p>
                  {adjustment.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">{adjustment.note}</p>
                  ) : null}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDelete(adjustment.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No deposits or withdrawals added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
