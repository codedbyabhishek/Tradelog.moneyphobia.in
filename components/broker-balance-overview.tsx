'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DhanStatus {
  availableBalance: number;
  withdrawableBalance: number | null;
}

interface UpstoxFundMargin {
  used_margin?: number;
  payin_amount?: number;
  span_margin?: number;
  adhoc_margin?: number;
  notional_cash?: number;
  available_margin?: number;
  exposure_margin?: number;
}

interface UpstoxStatus {
  funds: Record<string, UpstoxFundMargin>;
}

interface BrokerStatusState<T> {
  configured: boolean;
  status: T | null;
  error: string | null;
}

interface BrokerStatusResponse<T> {
  configured: boolean;
  status?: T;
  error?: string;
}

const UPSTOX_DETAILS: Array<[keyof UpstoxFundMargin, string]> = [
  ['used_margin', 'Used margin'],
  ['notional_cash', 'Notional cash'],
  ['payin_amount', 'Pay-in'],
  ['span_margin', 'SPAN margin'],
  ['exposure_margin', 'Exposure margin'],
  ['adhoc_margin', 'Ad hoc margin'],
];

function formatInr(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

async function loadBrokerStatus<T>(url: string): Promise<BrokerStatusState<T>> {
  try {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
    const payload = (await response.json()) as BrokerStatusResponse<T>;
    if (!response.ok) {
      throw new Error(payload.error || `Broker status request failed (${response.status}).`);
    }
    if (payload.configured && !payload.status) {
      throw new Error('The broker did not return balance data.');
    }
    return {
      configured: Boolean(payload.configured),
      status: payload.configured ? payload.status || null : null,
      error: null,
    };
  } catch (error) {
    return {
      configured: false,
      status: null,
      error: error instanceof Error ? error.message : 'Unable to load broker balance.',
    };
  }
}

function UpstoxSegment({ name, funds }: { name: string; funds: UpstoxFundMargin }) {
  const details = UPSTOX_DETAILS.filter(([key]) => funds[key] !== undefined);
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs capitalize text-muted-foreground">{name} · available margin</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatInr(funds.available_margin)}</p>
        </div>
        {details.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-primary">Details</summary>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {details.map(([key, label]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium text-foreground">{formatInr(funds[key])}</dd>
                </div>
              ))}
            </dl>
          </details>
        ) : null}
      </div>
    </div>
  );
}

export default function BrokerBalanceOverview() {
  const [dhan, setDhan] = useState<BrokerStatusState<DhanStatus>>({
    configured: false,
    status: null,
    error: null,
  });
  const [upstox, setUpstox] = useState<BrokerStatusState<UpstoxStatus>>({
    configured: false,
    status: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const loadBalances = useCallback(async () => {
    const [dhanResult, upstoxResult] = await Promise.all([
      loadBrokerStatus<DhanStatus>('/api/brokers/dhan/status'),
      loadBrokerStatus<UpstoxStatus>('/api/brokers/upstox/status'),
    ]);
    setDhan(dhanResult);
    setUpstox(upstoxResult);
    setLastCheckedAt(new Date());
    setIsLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBalances();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBalances]);

  const hasConfiguredBroker = dhan.configured || upstox.configured;
  const hasError = Boolean(dhan.error || upstox.error);

  return (
    <Card className="border-border/80 bg-card/90">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4 text-primary" />
            Broker balances
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Live cash and margin from your connected accounts.
          </p>
        </div>
        {hasConfiguredBroker ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-3.5 animate-spin sm:mr-2" /> : <RefreshCw className="size-3.5 sm:mr-2" />}
            <span className="sr-only sm:not-sr-only">{isLoading ? 'Refreshing' : 'Refresh'}</span>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!isLoading && !hasConfiguredBroker && !hasError ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">See your broker funds here</p>
              <p className="mt-1 text-xs text-muted-foreground">Connect Dhan or Upstox once. We only read your account details.</p>
            </div>
            <Button asChild size="sm">
              <Link href="/app/broker-hub">Connect a broker</Link>
            </Button>
          </div>
        ) : null}

        {hasError ? (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-amber-900 dark:text-amber-200">
              Couldn’t refresh {dhan.error && upstox.error ? 'broker balances' : `${dhan.error ? 'Dhan' : 'Upstox'} balance`}. Check the connection and try again.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/broker-hub">Check connection</Link>
            </Button>
          </div>
        ) : null}

        {isLoading && !lastCheckedAt ? <p className="text-sm text-muted-foreground">Checking connected accounts…</p> : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {dhan.configured && dhan.status ? (
            <div className="space-y-2 rounded-xl border border-border/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Dhan · INR</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Available to trade</p>
                </div>
                <p className="text-lg font-semibold text-foreground">{formatInr(dhan.status.availableBalance)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Withdrawable: {formatInr(dhan.status.withdrawableBalance)}
              </p>
            </div>
          ) : null}

          {upstox.configured && upstox.status ? (
            <div className="space-y-2 rounded-xl border border-border/70 p-3">
              <h3 className="text-sm font-semibold text-foreground">Upstox · INR</h3>
              {Object.entries(upstox.status.funds).length > 0 ? (
                Object.entries(upstox.status.funds).map(([segment, funds]) => (
                  <UpstoxSegment key={segment} name={segment} funds={funds} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No funds were reported for this account.</p>
              )}
            </div>
          ) : null}
        </div>

        {hasConfiguredBroker && lastCheckedAt ? (
          <p className="text-xs text-muted-foreground">
            These are cash/margin figures, not total account equity. Updated {lastCheckedAt.toLocaleTimeString()}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
