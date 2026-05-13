'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, Landmark, Loader2, RadioTower, RefreshCw, ShieldEllipsis, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { isProPlan } from '@/lib/subscription';
import { BROKER_DEFINITIONS, getBrokerDefinition, type BrokerId } from '@/lib/brokers';

interface DhanConfigResponse {
  configured: boolean;
  clientId: string;
  hasAccessToken: boolean;
  updatedAt: string | null;
}

interface DhanStatusResponse {
  configured: boolean;
  status?: {
    holdingsCount: number;
    positionsCount: number;
    openPositionCount: number;
    availableBalance: number;
    withdrawableBalance: number;
    sampleHoldings: string[];
  };
}

interface DhanSyncResponse {
  imported: number;
  updated: number;
  sourceTrades: number;
  matchedTrades: number;
}

interface UpstoxConfigResponse {
  configured: boolean;
  clientId: string;
  hasAccessToken: boolean;
  updatedAt: string | null;
}

interface UpstoxStatusResponse {
  configured: boolean;
  status?: {
    todayTrades: number;
    tokenValidated: boolean;
  };
}

interface UpstoxSyncResponse {
  imported: number;
  updated: number;
  sourceTrades: number;
  matchedTrades: number;
}

interface ZerodhaConfigResponse {
  configured: boolean;
  apiKey: string;
  hasApiSecret: boolean;
  redirectUri: string;
  updatedAt: string | null;
}

type BrokerStatus = DhanStatusResponse['status'] | UpstoxStatusResponse['status'] | null;
type BrokerSyncResult = DhanSyncResponse | UpstoxSyncResponse | null;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function BrokerIcon({ brokerId }: { brokerId: BrokerId }) {
  if (brokerId === 'dhan') return <Database className="h-4 w-4 text-primary" />;
  if (brokerId === 'zerodha') return <Landmark className="h-4 w-4 text-primary" />;
  if (brokerId === 'upstox') return <RadioTower className="h-4 w-4 text-primary" />;
  return <ShieldEllipsis className="h-4 w-4 text-primary" />;
}

export default function BrokerSyncHub() {
  const { refreshTrades } = useTrades();
  const { billingState } = useSettings();
  const { toast } = useToast();
  const proPlan = isProPlan(billingState);

  const [selectedBroker, setSelectedBroker] = useState<BrokerId>('dhan');
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [zerodhaApiKey, setZerodhaApiKey] = useState('');
  const [zerodhaApiSecret, setZerodhaApiSecret] = useState('');
  const [zerodhaHasApiSecret, setZerodhaHasApiSecret] = useState(false);
  const [zerodhaRedirectUri, setZerodhaRedirectUri] = useState('');
  const [configured, setConfigured] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(daysAgoString(7));
  const [toDate, setToDate] = useState(todayString());
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [status, setStatus] = useState<BrokerStatus>(null);
  const [lastSync, setLastSync] = useState<BrokerSyncResult>(null);

  const broker = useMemo(() => getBrokerDefinition(selectedBroker), [selectedBroker]);
  const isDhan = selectedBroker === 'dhan';
  const isUpstox = selectedBroker === 'upstox';
  const supportsZerodhaGroundwork = false;
  const isZerodha = selectedBroker === 'zerodha' && supportsZerodhaGroundwork;
  const isLiveBroker = isDhan || isUpstox;

  useEffect(() => {
    if (!(isLiveBroker || isZerodha)) return;

    const loadConfig = async (brokerId: BrokerId) => {
      try {
        const res = await fetch(`/api/brokers/${brokerId}/config`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as DhanConfigResponse | UpstoxConfigResponse | ZerodhaConfigResponse;
        setConfigured(data.configured);
        setUpdatedAt(data.updatedAt || null);

        if (brokerId === 'zerodha') {
          const zerodha = data as ZerodhaConfigResponse;
          setZerodhaApiKey(zerodha.apiKey || '');
          setZerodhaHasApiSecret(Boolean(zerodha.hasApiSecret));
          setZerodhaRedirectUri(zerodha.redirectUri || '');
          return;
        }

        const standard = data as DhanConfigResponse | UpstoxConfigResponse;
        setClientId(standard.clientId || '');
        setHasAccessToken(Boolean(standard.hasAccessToken));
      } catch (error) {
        console.error('[BrokerSyncHub] Failed to load broker config', error);
      }
    };

    void loadConfig(selectedBroker);
  }, [isLiveBroker, isZerodha, selectedBroker]);

  const resetLiveState = () => {
    setStatus(null);
    setLastSync(null);
    setIsLoadingStatus(false);
    setIsSaving(false);
    setIsSyncing(false);
  };

  const handleBrokerChange = (value: string) => {
    setSelectedBroker(value as BrokerId);
    resetLiveState();
    setConfigured(false);
    setHasAccessToken(false);
    setUpdatedAt(null);
    setClientId('');
    setAccessToken('');
    setZerodhaApiKey('');
    setZerodhaApiSecret('');
    setZerodhaHasApiSecret(false);
    setZerodhaRedirectUri('');
  };

  const loadBrokerStatus = async () => {
    if (!proPlan) return;
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`/api/brokers/${selectedBroker}/status`, { credentials: 'include', cache: 'no-store' });
      const data = (await res.json()) as DhanStatusResponse | UpstoxStatusResponse;
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to fetch broker status');
      }
      setStatus(data.status || null);
    } catch (error) {
      toast({
        title: 'Status Check Failed',
        description: error instanceof Error ? error.message : 'Unable to fetch broker status.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSaveBroker = async () => {
    if (!proPlan) {
      toast({
        title: 'Pro Feature',
        description: 'Broker sync is available on the Pro plan.',
        variant: 'destructive',
      });
      return;
    }

    if (!clientId.trim() || (!hasAccessToken && !accessToken.trim())) {
      toast({
        title: 'Missing Information',
        description: 'Enter the broker client ID and access token first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/brokers/${selectedBroker}/config`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          accessToken: accessToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save Dhan settings');

      setConfigured(true);
      setHasAccessToken(true);
      setUpdatedAt(new Date().toISOString());
      setAccessToken('');
      toast({
        title: `${broker.label} Connected`,
        description: `Your ${broker.label} credentials were saved. You can sync from this broker hub anytime.`,
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : `Failed to save ${broker.label} credentials.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBroker = async () => {
    if (!proPlan) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/brokers/${selectedBroker}/config`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to remove Dhan configuration');

      setConfigured(false);
      setHasAccessToken(false);
      setUpdatedAt(null);
      setStatus(null);
      setLastSync(null);
      setAccessToken('');
      toast({
        title: `${broker.label} Disconnected`,
        description: `Saved ${broker.label} credentials were removed from this account.`,
      });
    } catch (error) {
      toast({
        title: 'Remove Failed',
        description: error instanceof Error ? error.message : `Failed to remove ${broker.label} credentials.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncBroker = async () => {
    if (!proPlan) {
      toast({
        title: 'Pro Feature',
        description: `Upgrade to Pro to sync trades from ${broker.label}.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch(`/api/brokers/${selectedBroker}/sync`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate }),
      });
      const data = (await res.json()) as (DhanSyncResponse | UpstoxSyncResponse) & { error?: string };
      if (!res.ok) throw new Error(data.error || `Failed to sync trades from ${broker.label}`);

      setLastSync(data);
      await refreshTrades();
      toast({
        title: `${broker.label} Sync Complete`,
        description: `Imported ${data.imported} new trades and updated ${data.updated} existing synced trades.`,
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : `Failed to sync from ${broker.label}.`,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveZerodha = async () => {
    if (!proPlan) {
      toast({
        title: 'Pro Feature',
        description: 'Broker sync is available on the Pro plan.',
        variant: 'destructive',
      });
      return;
    }

    if (!zerodhaApiKey.trim() || (!zerodhaHasApiSecret && !zerodhaApiSecret.trim()) || !zerodhaRedirectUri.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Enter Zerodha API key, API secret, and redirect URI first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/brokers/zerodha/config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: zerodhaApiKey.trim(),
          apiSecret: zerodhaApiSecret.trim(),
          redirectUri: zerodhaRedirectUri.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save Zerodha configuration');

      setConfigured(true);
      setUpdatedAt(new Date().toISOString());
      setZerodhaHasApiSecret(true);
      setZerodhaApiSecret('');
      toast({
        title: 'Zerodha Groundwork Saved',
        description: 'Your Zerodha app setup details are stored. The request-token exchange flow is the next step.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save Zerodha configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveZerodha = async () => {
    if (!proPlan) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/brokers/zerodha/config', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to remove Zerodha configuration');

      setConfigured(false);
      setUpdatedAt(null);
      setZerodhaApiKey('');
      setZerodhaApiSecret('');
      setZerodhaHasApiSecret(false);
      setZerodhaRedirectUri('');
      toast({
        title: 'Zerodha Setup Removed',
        description: 'Saved Zerodha groundwork was removed from this account.',
      });
    } catch (error) {
      toast({
        title: 'Remove Failed',
        description: error instanceof Error ? error.message : 'Failed to remove Zerodha setup.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="col-span-2 rounded-xl border-border bg-card/95">
      <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-3 lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg text-foreground">Broker Sync Hub</CardTitle>
              {!proPlan ? (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                  Pro only
                </Badge>
              ) : null}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
              Choose a broker, save credentials, and sync from one place. Manual journal entries stay untouched.
            </p>
          </div>

          <div className="w-full lg:w-64">
            <Select value={selectedBroker} onValueChange={handleBrokerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select broker" />
              </SelectTrigger>
              <SelectContent>
                {BROKER_DEFINITIONS.filter((item) => item.id !== 'manual').map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.status === 'live' ? item.label : `${item.label} (Coming Soon)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-3 pt-0 sm:p-4 sm:pt-0 lg:p-5 lg:pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2.5 py-1.5 text-xs text-foreground">
            <BrokerIcon brokerId={selectedBroker} />
            {broker.label}
          </span>
          <Badge
            variant="outline"
            className={broker.status === 'live'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : broker.status === 'groundwork'
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                : 'border-primary/30 bg-primary/10 text-primary'}
          >
            {broker.status === 'live' ? 'Live' : broker.status === 'groundwork' ? 'Groundwork Ready' : 'Coming Soon'}
          </Badge>
          {isLiveBroker && configured ? (
            <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-400">
              Connected
            </Badge>
          ) : null}
          {isLiveBroker && lastSync ? (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              +{lastSync.imported} imported
            </Badge>
          ) : null}
        </div>

        {!isLiveBroker && !isZerodha ? (
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <p className="text-sm font-medium text-foreground">{broker.label} integration is planned next.</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              The app is now ready for multiple brokers. Once this connector is added, it will use this same broker hub card for credentials, status, and sync.
            </p>
          </div>
        ) : isZerodha ? (
          <>
            {!proPlan && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                <p className="font-medium">Broker sync is part of Traderlogify Pro.</p>
                <p className="mt-1 text-muted-foreground">
                  Upgrade to unlock broker import groundwork, refresh flows, and connected review workflows.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm">
              <p className="font-medium text-foreground">Zerodha groundwork notes</p>
              <p className="mt-1 text-muted-foreground">
                Zerodha uses a request-token redirect flow and normal access tokens expire daily. This setup saves the app credentials and callback path so the exchange flow can be wired next.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Kite API Key</label>
                <Input
                  value={zerodhaApiKey}
                  onChange={(e) => setZerodhaApiKey(e.target.value)}
                  placeholder="kite-api-key"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Kite API Secret {zerodhaHasApiSecret ? '(saved)' : ''}
                </label>
                <Input
                  type="password"
                  value={zerodhaApiSecret}
                  onChange={(e) => setZerodhaApiSecret(e.target.value)}
                  placeholder={zerodhaHasApiSecret ? 'Enter a new secret only to replace the saved one' : 'kite-api-secret'}
                  disabled={isSaving}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-foreground">Redirect URI</label>
                <Input
                  value={zerodhaRedirectUri}
                  onChange={(e) => setZerodhaRedirectUri(e.target.value)}
                  placeholder="http://localhost:3000/api/brokers/zerodha/callback"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveZerodha} disabled={isSaving || !zerodhaApiKey.trim() || (!zerodhaHasApiSecret && !zerodhaApiSecret.trim()) || !zerodhaRedirectUri.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Zerodha Groundwork
              </Button>
              <Button variant="outline" onClick={handleRemoveZerodha} disabled={isSaving || !configured} className="text-red-400 hover:text-red-300">
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>

            {updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Last saved: {new Date(updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            ) : null}

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-sm font-medium text-foreground">Callback endpoint</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use this path in your Kite Connect app setup after you configure your domain:
              </p>
              <code className="mt-3 block rounded-lg bg-secondary/50 px-3 py-2 text-xs text-foreground">
                /api/brokers/zerodha/callback
              </code>
            </div>
          </>
        ) : (
          <>
            {!proPlan && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                <p className="font-medium">Broker sync is part of Traderlogify Pro.</p>
                <p className="mt-1 text-muted-foreground">
                  Upgrade to unlock broker import, sync refreshes, and connected review workflows.
                </p>
              </div>
            )}

            {isUpstox && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
                <p className="font-medium text-foreground">Upstox token note</p>
                <p className="mt-1 text-muted-foreground">
                  Upstox access tokens are not permanent. Their official API token expires at 3:30 AM the next day, so this broker may need a fresh token when it expires.
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">{broker.label} Client ID</label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder={isDhan ? '1000000001' : 'your-upstox-client-id'}
                  disabled={isSaving || isSyncing}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Access Token {hasAccessToken ? '(saved)' : ''}
                </label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={hasAccessToken ? 'Enter a new token only to replace the saved one' : 'Paste your Dhan access token'}
                  disabled={isSaving || isSyncing}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveBroker} disabled={isSaving || isSyncing || !clientId.trim() || (!hasAccessToken && !accessToken.trim())}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save {broker.label} Connection
              </Button>
              <Button variant="outline" onClick={loadBrokerStatus} disabled={isLoadingStatus || !configured}>
                {isLoadingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Check Status
              </Button>
              <Button variant="outline" onClick={handleRemoveBroker} disabled={isSaving || !configured} className="text-red-400 hover:text-red-300">
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>

            {updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Last saved: {new Date(updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            ) : null}

            <div className="grid gap-4 rounded-xl border border-border bg-secondary/30 p-4 md:grid-cols-4">
              {isDhan ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Holdings</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{(status as DhanStatusResponse['status'])?.holdingsCount ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Positions</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{(status as DhanStatusResponse['status'])?.positionsCount ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Positions</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{(status as DhanStatusResponse['status'])?.openPositionCount ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Balance</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {status ? `₹${(status as DhanStatusResponse['status'])?.availableBalance.toFixed(2)}` : '-'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Token</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {(status as UpstoxStatusResponse['status'])?.tokenValidated ? 'Valid' : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Today Trades</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{(status as UpstoxStatusResponse['status'])?.todayTrades ?? '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="mt-1 text-sm text-foreground">Historical trade sync is available from the same broker hub controls below.</p>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-foreground">Sync Historical Trades</p>
                <p className="text-xs text-muted-foreground">
                  {isDhan
                    ? 'Imports matched closed trades from Dhan history. Open legs remain untouched until they are closed.'
                    : 'Imports matched closed trades from Upstox historical trade history into the journal.'}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">From Date</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isSyncing} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">To Date</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isSyncing} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={handleSyncBroker} disabled={isSyncing || !configured}>
                  {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Sync from {broker.label}
                </Button>
              </div>

              {lastSync ? (
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Imported</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{lastSync.imported}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{lastSync.updated}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Source Rows</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{lastSync.sourceTrades}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Matched Trades</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{lastSync.matchedTrades}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
