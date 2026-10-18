'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Landmark,
  Link2,
  Loader2,
  Plus,
  RadioTower,
  RefreshCw,
  ShieldEllipsis,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BrokerSyncHub from '@/components/broker-sync-hub';
import { useSettings } from '@/lib/settings-context';
import { useTrades } from '@/lib/trade-context';
import { useAccounts } from '@/lib/accounts-context';
import { getBrokerDefinition, getBrokerIdFromTrade, BROKER_DEFINITIONS, type BrokerId } from '@/lib/brokers';
import { isProPlan } from '@/lib/subscription';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type LiveBrokerId = 'dhan' | 'upstox';

type DhanBrokerStatus = {
  holdingsCount: number;
  positionsCount: number;
  openPositionCount: number;
  availableBalance: number;
  withdrawableBalance: number | null;
};

type UpstoxBrokerStatus = {
  todayTrades: number;
  tokenValidated: boolean;
  funds: Record<string, { available_margin?: number }>;
};

type ConnectionStatus = DhanBrokerStatus | UpstoxBrokerStatus | null;

type BrokerConnection = {
  id: LiveBrokerId;
  configured: boolean;
  clientId: string;
  updatedAt: string | null;
  status: ConnectionStatus;
  loadFailed: boolean;
};

const LIVE_BROKERS: Array<{ id: LiveBrokerId; label: string; description: string }> = [
  {
    id: 'dhan',
    label: 'Dhan',
    description: 'Read-only historical trade import with available funds, holdings, and position status.',
  },
  {
    id: 'upstox',
    label: 'Upstox',
    description: 'Historical trade import with equity and commodity funds/margin status.',
  },
];

const DEFAULT_CONNECTIONS: BrokerConnection[] = LIVE_BROKERS.map((broker) => ({
  id: broker.id,
  configured: false,
  clientId: '',
  updatedAt: null,
  status: null,
  loadFailed: false,
}));

function BrokerGlyph({ brokerId, className }: { brokerId: BrokerId; className?: string }) {
  const iconClassName = cn('size-5', className);
  if (brokerId === 'dhan') return <Database className={iconClassName} />;
  if (brokerId === 'upstox') return <RadioTower className={iconClassName} />;
  if (brokerId === 'zerodha') return <Landmark className={iconClassName} />;
  return <ShieldEllipsis className={iconClassName} />;
}

function formatInr(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSavedAt(value: string | null) {
  if (!value) return 'Not connected yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Connection saved';
  return `Saved ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)}`;
}

function getDhanStatus(connection?: BrokerConnection) {
  return connection?.id === 'dhan' ? (connection.status as DhanBrokerStatus | null) : null;
}

function getUpstoxStatus(connection?: BrokerConnection) {
  return connection?.id === 'upstox' ? (connection.status as UpstoxBrokerStatus | null) : null;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone = 'default',
}: {
  icon: typeof WalletCards;
  label: string;
  value: string | number;
  description: string;
  tone?: 'default' | 'green' | 'blue' | 'violet';
}) {
  const toneClass = {
    default: 'border-border bg-background/70',
    green: 'border-emerald-500/25 bg-emerald-500/[0.07]',
    blue: 'border-sky-500/25 bg-sky-500/[0.07]',
    violet: 'border-violet-500/25 bg-violet-500/[0.07]',
  }[tone];
  const iconClass = {
    default: 'text-muted-foreground',
    green: 'text-emerald-400',
    blue: 'text-sky-400',
    violet: 'text-violet-400',
  }[tone];

  return (
    <div className={cn('min-h-[118px] rounded-2xl border p-4', toneClass)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={cn('size-4', iconClass)} />
        {label}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tracking-tight', tone === 'green' ? 'text-emerald-400' : 'text-foreground')}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function BrokerHub() {
  const { trades } = useTrades();
  const { accounts, activeAccount, activeAccountId, createAccount, isLoading: isAccountsLoading, setActiveAccountId } = useAccounts();
  const { billingState } = useSettings();
  const { toast } = useToast();
  const [connections, setConnections] = useState<BrokerConnection[]>(DEFAULT_CONNECTIONS);
  const [selectedBroker, setSelectedBroker] = useState<BrokerId>('dhan');
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountBrokerId, setAccountBrokerId] = useState<BrokerId>('manual');
  const [accountReference, setAccountReference] = useState('');
  const [accountCurrency, setAccountCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD'>('INR');
  const proPlan = isProPlan(billingState);

  const loadConnections = useCallback(async () => {
    setIsLoading(true);

    const results = await Promise.all(
      LIVE_BROKERS.map(async (broker): Promise<BrokerConnection> => {
        try {
          const configResponse = await fetch(`/api/brokers/${broker.id}/config`, {
            credentials: 'include',
            cache: 'no-store',
          });
          if (!configResponse.ok) throw new Error('Unable to load broker configuration');

          const config = (await configResponse.json()) as {
            configured?: boolean;
            clientId?: string;
            updatedAt?: string | null;
          };

          let status: ConnectionStatus = null;
          if (config.configured) {
            const statusResponse = await fetch(`/api/brokers/${broker.id}/status`, {
              credentials: 'include',
              cache: 'no-store',
            });
            if (statusResponse.ok) {
              const payload = (await statusResponse.json()) as { status?: ConnectionStatus };
              status = payload.status || null;
            }
          }

          return {
            id: broker.id,
            configured: Boolean(config.configured),
            clientId: config.clientId || '',
            updatedAt: config.updatedAt || null,
            status,
            loadFailed: false,
          };
        } catch (error) {
          console.warn(`[broker-hub] Could not load ${broker.id}`, error);
          return {
            id: broker.id,
            configured: false,
            clientId: '',
            updatedAt: null,
            status: null,
            loadFailed: true,
          };
        }
      }),
    );

    setConnections(results);
    setLoadFailed(results.some((connection) => connection.loadFailed));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadConnections();
    });
    return () => {
      cancelled = true;
    };
  }, [loadConnections]);

  const connectionById = useMemo(
    () => new Map(connections.map((connection) => [connection.id, connection])),
    [connections],
  );
  const connectedCount = connections.filter((connection) => connection.configured).length;
  const dhanConnection = connectionById.get('dhan');
  const upstoxConnection = connectionById.get('upstox');
  const dhanStatus = getDhanStatus(dhanConnection);
  const upstoxStatus = getUpstoxStatus(upstoxConnection);
  const brokerTradeCounts = useMemo(() => {
    return trades.reduce<Record<LiveBrokerId, number>>(
      (counts, trade) => {
        const broker = getBrokerIdFromTrade(trade);
        if (broker === 'dhan' || broker === 'upstox') counts[broker] += 1;
        return counts;
      },
      { dhan: 0, upstox: 0 },
    );
  }, [trades]);

  const selectBroker = (brokerId: BrokerId) => {
    setSelectedBroker(brokerId);
    document.getElementById('broker-connection-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetAccountForm = () => {
    setAccountName('');
    setAccountBrokerId('manual');
    setAccountReference('');
    setAccountCurrency('INR');
  };

  const handleCreateAccount = async () => {
    setIsSavingAccount(true);
    try {
      const account = await createAccount({
        brokerId: accountBrokerId,
        name: accountName,
        accountReference: accountReference || undefined,
        currency: accountCurrency,
      });
      setAccountDialogOpen(false);
      resetAccountForm();
      toast({
        title: 'Broker account added',
        description: `${account.name} is now your active journal account. Your full account number is encrypted and never shown again.`,
      });
    } catch (error) {
      toast({
        title: 'Could not add account',
        description: error instanceof Error ? error.message : 'Please check the account details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const upcomingBrokers = BROKER_DEFINITIONS.filter((broker) => broker.status !== 'live' && broker.id !== 'manual');

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-3 sm:gap-6 sm:p-5 lg:p-7">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Landmark className="size-5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Connections</p>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Broker Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create separate journal accounts, switch between them, and connect brokers in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={proPlan ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}
          >
            <span className={cn('mr-1.5 size-1.5 rounded-full', proPlan ? 'bg-emerald-400' : 'bg-amber-400')} />
            {proPlan ? 'Pro broker sync active' : 'Broker sync requires Pro'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void loadConnections()} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <RefreshCw className="mr-2 size-3.5" />}
            Refresh
          </Button>
        </div>
      </header>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Journal accounts</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Keep every broker separate</h2>
            <p className="mt-1 text-sm text-muted-foreground">Trades, imports, and performance automatically follow the account selected in the sidebar.</p>
          </div>
          <Button onClick={() => setAccountDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add broker account
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const isActive = activeAccountId === account.id;
            const broker = getBrokerDefinition(account.brokerId);
            return (
              <Card key={account.id} className={cn('rounded-2xl border bg-card sm:rounded-3xl', isActive ? 'border-primary/45 shadow-sm' : 'border-border')}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn('flex size-11 items-center justify-center rounded-2xl border', isActive ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-muted-foreground')}>
                      <BrokerGlyph brokerId={account.brokerId} />
                    </span>
                    <Badge variant="outline" className={isActive ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}>
                      {isActive ? 'Active' : broker.shortLabel}
                    </Badge>
                  </div>
                  <h3 className="mt-4 truncate text-lg font-semibold text-foreground">{account.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{broker.label} · {account.currency}{account.accountNumberLast4 ? ` · ••••${account.accountNumberLast4}` : ''}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <p className="text-xs text-muted-foreground">{account.isDefault ? 'Default legacy journal' : 'Account reference is encrypted'}</p>
                    <Button size="sm" variant={isActive ? 'secondary' : 'outline'} disabled={isActive} onClick={() => setActiveAccountId(account.id)}>
                      {isActive ? 'Selected' : 'Switch'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {isAccountsLoading ? <Card className="rounded-2xl border-dashed sm:rounded-3xl"><CardContent className="p-5 text-sm text-muted-foreground">Loading your accounts…</CardContent></Card> : null}
        </div>
      </section>

      <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm sm:rounded-3xl">
        <CardHeader className="border-b border-border/70 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <WalletCards className="size-5 text-primary" />
                Account overview
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Live details are read-only. Syncs save to the account selected above; manual entries are never changed.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Active account</p>
              <p className="max-w-28 truncate text-sm font-semibold text-foreground">{activeAccount?.name || 'All accounts'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <MetricCard
            icon={WalletCards}
            label="Dhan available balance"
            value={formatInr(dhanStatus?.availableBalance)}
            description={dhanConnection?.configured
              ? `${formatInr(dhanStatus?.withdrawableBalance)} withdrawable · cash figure, not total equity`
              : 'Connect Dhan to view available funds'}
            tone="green"
          />
          <MetricCard
            icon={Database}
            label="Open positions"
            value={dhanStatus?.openPositionCount ?? '—'}
            description={dhanConnection?.configured ? `${dhanStatus?.holdingsCount ?? '—'} holdings tracked` : 'Dhan account status'}
            tone="blue"
          />
          <MetricCard
            icon={RadioTower}
            label="Upstox available margin"
            value={formatInr(upstoxStatus?.funds.equity?.available_margin)}
            description={upstoxConnection?.configured
              ? `${upstoxStatus?.todayTrades ?? 0} trades today · ${upstoxStatus?.funds.commodity ? 'commodity segment also reported' : 'equity segment'}`
              : 'Connect Upstox to view funds'}
            tone="violet"
          />
          <MetricCard
            icon={Link2}
            label="Journal accounts"
            value={accounts.length}
            description={`${brokerTradeCounts.dhan + brokerTradeCounts.upstox} synced trades in the current view`}
          />
        </CardContent>
      </Card>

      {loadFailed ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-200">
          Some live broker details could not be refreshed. Your saved connection settings remain unchanged; try Refresh again.
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your brokers</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Accounts</h2>
          </div>
          <p className="text-xs text-muted-foreground">Select a card to manage the connection below.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {LIVE_BROKERS.map((broker) => {
            const connection = connectionById.get(broker.id);
            const connected = connection?.configured ?? false;
            const brokerStatus = broker.id === 'dhan' ? getDhanStatus(connection) : getUpstoxStatus(connection);
            const accountHint = connection?.clientId ? `Account ••••${connection.clientId.slice(-4)}` : 'No account connected';
            const liveDetail = broker.id === 'dhan'
              ? brokerStatus
                ? `${formatInr((brokerStatus as DhanBrokerStatus).availableBalance)} available • ${(brokerStatus as DhanBrokerStatus).positionsCount} positions`
                : 'Status loads securely when connected'
              : brokerStatus
                ? `${formatInr((brokerStatus as UpstoxBrokerStatus).funds.equity?.available_margin)} equity margin available`
                : 'Status loads securely when connected';

            return (
              <Card key={broker.id} className={cn('rounded-2xl border bg-card transition-colors sm:rounded-3xl', connected ? 'border-emerald-500/30' : 'border-border hover:border-primary/35')}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className={cn('flex size-11 items-center justify-center rounded-2xl border', connected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-primary/30 bg-primary/10 text-primary')}>
                      <BrokerGlyph brokerId={broker.id} />
                    </span>
                    <Badge variant="outline" className={connected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-border bg-secondary/50 text-muted-foreground'}>
                      {connected ? <CheckCircle2 className="mr-1 size-3" /> : <Link2 className="mr-1 size-3" />}
                      {connected ? 'Connected' : 'Not connected'}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{broker.label}</h3>
                  <p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">{broker.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Account</p>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">{accountHint}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Connection</p>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">{formatSavedAt(connection?.updatedAt || null)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{liveDetail}</p>
                  <Button className="mt-4 w-full" variant={connected ? 'outline' : 'default'} onClick={() => selectBroker(broker.id)}>
                    {connected ? 'Manage connection' : `Connect ${broker.label}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Connect new broker</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">More integrations</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {upcomingBrokers.map((broker) => (
            <Card key={broker.id} className="rounded-2xl border-border bg-card/65 opacity-85 sm:rounded-3xl">
              <CardContent className="flex min-h-[175px] flex-col p-4 sm:p-5">
                <span className="flex size-10 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-muted-foreground">
                  <BrokerGlyph brokerId={broker.id} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{broker.label}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">This connector is planned for the same secure setup and sync workflow.</p>
                <Badge variant="outline" className="mt-4 w-fit border-border bg-secondary/50 text-muted-foreground">Coming soon</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="broker-connection-manager" className="scroll-mt-5">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Connection manager</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Set up and sync</h2>
        </div>
        <BrokerSyncHub
          selectedBroker={selectedBroker}
          onBrokerChange={setSelectedBroker}
          onConnectionChange={() => void loadConnections()}
        />
      </section>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add broker account</DialogTitle>
            <DialogDescription>
              Use a label you recognize. We encrypt the full account number and only display its final four characters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="broker-account-name">Account label</Label>
              <Input id="broker-account-name" value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="e.g. Dhan main account" maxLength={80} autoFocus />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Broker</Label>
                <Select value={accountBrokerId} onValueChange={(value) => setAccountBrokerId(value as BrokerId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BROKER_DEFINITIONS.map((broker) => <SelectItem key={broker.id} value={broker.id}>{broker.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Account currency</Label>
                <Select value={accountCurrency} onValueChange={(value) => setAccountCurrency(value as typeof accountCurrency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="broker-account-reference">Broker account number / client ID {accountBrokerId === 'manual' ? '(optional)' : ''}</Label>
              <Input id="broker-account-reference" value={accountReference} onChange={(event) => setAccountReference(event.target.value)} placeholder={accountBrokerId === 'manual' ? 'Optional reference' : 'Required — stored encrypted'} maxLength={128} autoComplete="off" />
              <p className="text-xs text-muted-foreground">The full value is encrypted at rest and cannot be retrieved from this screen.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)} disabled={isSavingAccount}>Cancel</Button>
            <Button type="button" onClick={() => void handleCreateAccount()} disabled={isSavingAccount || !accountName.trim() || (accountBrokerId !== 'manual' && !accountReference.trim())}>
              {isSavingAccount ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Add account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
