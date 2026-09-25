'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Globe2, Landmark, Sunrise } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Currency, Trade } from '@/lib/types';
import { formatBaseCurrencyAmount } from '@/lib/trade-utils';
import { calculateCoreSessionPerformance, type CoreTradingSession } from '@/lib/session-performance';

const SESSION_VISUALS: Record<CoreTradingSession, {
  icon: typeof Sunrise;
  time: string;
  bar: string;
  iconClass: string;
  valueClass: string;
}> = {
  Asian: {
    icon: Sunrise,
    time: '00:00 – 08:00 UTC',
    bar: 'from-amber-400 to-amber-500',
    iconClass: 'bg-amber-500/15 text-amber-500',
    valueClass: 'text-amber-500',
  },
  London: {
    icon: Landmark,
    time: '08:00 – 13:00 UTC',
    bar: 'from-blue-500 to-blue-600',
    iconClass: 'bg-blue-500/15 text-blue-500',
    valueClass: 'text-blue-500',
  },
  'New York': {
    icon: Building2,
    time: '13:00 – 22:00 UTC',
    bar: 'from-teal-400 to-emerald-500',
    iconClass: 'bg-teal-500/15 text-teal-500',
    valueClass: 'text-teal-500',
  },
};

function getCurrentUtcMinutes() {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function formatMetric(value: number | null, formatter: (value: number) => string) {
  return value === null ? '—' : formatter(value);
}

export function SessionPerformanceCard({ trades, baseCurrency }: { trades: Trade[]; baseCurrency: Currency }) {
  const summary = useMemo(() => calculateCoreSessionPerformance(trades), [trades]);
  const [utcMinutes, setUtcMinutes] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => setUtcMinutes(getCurrentUtcMinutes());
    updateTime();
    const interval = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const nowPosition = utcMinutes === null ? null : Math.min(99.5, Math.max(0.5, (utcMinutes / 1440) * 100));
  const formatCurrency = (value: number) => formatBaseCurrencyAmount(value, baseCurrency);

  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <CardHeader className="border-b border-border/80 p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Globe2 className="h-5 w-5 text-primary" />
          Session Performance
        </CardTitle>
        <CardDescription>Breakdown by trading session — Asian, London, and New York. Times shown in UTC.</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-b border-border/80 px-4 py-5 sm:px-5">
          <div className="relative pt-7" aria-label="24-hour trading session timeline in UTC">
            {nowPosition !== null ? (
              <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2" style={{ left: `${nowPosition}%` }}>
                <span className="relative inline-flex rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                  Now
                  <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-foreground" />
                </span>
                <span className="mx-auto mt-1 block h-11 w-px bg-foreground/80" />
              </div>
            ) : null}
            <div className="grid h-11 grid-cols-[8fr_5fr_9fr_2fr] overflow-hidden rounded-xl border border-border/60 bg-muted/50">
              {summary.sessions.map((session) => {
                const visual = SESSION_VISUALS[session.id];
                return (
                  <div key={session.id} className={`flex items-center justify-center bg-gradient-to-r ${visual.bar} px-2 text-center text-xs font-bold text-white shadow-inner`}>
                    {session.id}
                  </div>
                );
              })}
              <div className="bg-muted/80" aria-label="Off-hours" />
            </div>
            <div className="mt-2 grid grid-cols-[8fr_5fr_9fr_2fr] text-[10px] text-muted-foreground sm:text-xs">
              <span>00:00</span>
              <span>08:00</span>
              <span>13:00</span>
              <span className="text-right">24:00</span>
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-border/80 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {summary.sessions.map((session) => {
            const visual = SESSION_VISUALS[session.id];
            const Icon = visual.icon;
            const pnlClass = session.tradeCount === 0
              ? 'text-muted-foreground'
              : session.pnl >= 0
                ? visual.valueClass
                : 'text-red-500';

            return (
              <div key={session.id} className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${visual.iconClass}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{session.id}</h3>
                    <p className="text-xs text-muted-foreground">{visual.time}</p>
                  </div>
                </div>

                <p className={`mt-4 text-2xl font-bold tracking-tight ${pnlClass}`}>
                  {session.tradeCount ? formatCurrency(session.pnl) : '—'}
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full bg-gradient-to-r ${visual.bar}`} style={{ width: `${session.tradeShare}%` }} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Trades</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">{session.tradeCount || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Win rate</dt>
                    <dd className={`mt-1 text-sm font-semibold ${session.winRate === null ? 'text-foreground' : visual.valueClass}`}>
                      {formatMetric(session.winRate, (value) => `${value.toFixed(1)}%`)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Avg trade</dt>
                    <dd className={`mt-1 text-sm font-semibold ${pnlClass}`}>{formatMetric(session.averageTrade, formatCurrency)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Trade share</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">{session.tradeCount ? `${session.tradeShare.toFixed(0)}%` : '—'}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>

        {summary.unassignedTrades > 0 ? (
          <p className="border-t border-border/80 px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-5">
            {summary.unassignedTrades} trade{summary.unassignedTrades === 1 ? '' : 's'} excluded because no supported session or UTC entry time was saved. Add one when logging a trade to include it here.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
