'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Database, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useTrades } from '@/lib/trade-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export default function DhanSyncCard() {
  const { refreshTrades } = useTrades();
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [configured, setConfigured] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(daysAgoString(7));
  const [toDate, setToDate] = useState(todayString());
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [status, setStatus] = useState<DhanStatusResponse['status'] | null>(null);
  const [lastSync, setLastSync] = useState<DhanSyncResponse | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/brokers/dhan/config', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as DhanConfigResponse;
        setConfigured(data.configured);
        setClientId(data.clientId || '');
        setHasAccessToken(Boolean(data.hasAccessToken));
        setUpdatedAt(data.updatedAt || null);
      } catch (error) {
        console.error('[DhanSyncCard] Failed to load config', error);
      }
    };

    void loadConfig();
  }, []);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/brokers/dhan/status', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json()) as DhanStatusResponse;
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to fetch Dhan status');
      }
      setStatus(data.status || null);
    } catch (error) {
      toast({
        title: 'Status Check Failed',
        description: error instanceof Error ? error.message : 'Unable to fetch Dhan status.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSave = async () => {
    if (!clientId.trim() || !accessToken.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Enter your Dhan client ID and access token first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/brokers/dhan/config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          accessToken: accessToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save Dhan settings');
      }

      setConfigured(true);
      setHasAccessToken(true);
      setUpdatedAt(new Date().toISOString());
      setAccessToken('');
      toast({
        title: 'Dhan Connected',
        description: 'Your Dhan credentials were saved. You can sync from the dashboard anytime.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save Dhan credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/brokers/dhan/config', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to remove Dhan configuration');
      }

      setConfigured(false);
      setHasAccessToken(false);
      setUpdatedAt(null);
      setStatus(null);
      setLastSync(null);
      setAccessToken('');
      toast({
        title: 'Dhan Disconnected',
        description: 'Saved Dhan credentials were removed from this journal account.',
      });
    } catch (error) {
      toast({
        title: 'Remove Failed',
        description: error instanceof Error ? error.message : 'Failed to remove Dhan credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/brokers/dhan/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate }),
      });
      const data = (await res.json()) as DhanSyncResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync trades from Dhan');
      }

      setLastSync(data);
      await refreshTrades();
      toast({
        title: 'Dhan Sync Complete',
        description: `Imported ${data.imported} new trades and updated ${data.updated} existing synced trades.`,
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync from Dhan.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="h-full cursor-pointer rounded-xl border-border bg-card transition-colors hover:border-primary/40">
          <CardHeader className="p-3 pb-1.5 sm:p-3.5 sm:pb-1.5 lg:p-4 lg:pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-[11px] sm:text-xs font-medium text-muted-foreground">Dhan Sync</CardTitle>
              <Database className={`h-4 w-4 ${configured ? 'text-emerald-400' : 'text-primary'}`} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-0 sm:p-3.5 sm:pt-0 lg:p-4 lg:pt-0">
            <div className="text-base sm:text-lg lg:text-xl font-bold leading-tight text-foreground">
              {configured ? 'Connected' : 'Setup'}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
              {configured
                ? `${status?.holdingsCount ?? '-'} holdings • ${status?.openPositionCount ?? '-'} open`
                : 'Connect Dhan and sync broker trades'}
            </p>
            <div className="flex flex-wrap gap-2">
              {configured && (
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-400">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Active
                </span>
              )}
              {lastSync && (
                <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-1 text-[11px] text-sky-400">
                  +{lastSync.imported} imported
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Dhan Broker Sync</DialogTitle>
          <DialogDescription>
            Compact on the dashboard, full controls here. Existing manual journal entries stay untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Dhan Client ID</label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="1000000001"
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
            <Button onClick={handleSave} disabled={isSaving || isSyncing || !clientId.trim() || (!hasAccessToken && !accessToken.trim())}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Dhan Connection
            </Button>
            <Button variant="outline" onClick={loadStatus} disabled={isLoadingStatus || !configured}>
              {isLoadingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Check Status
            </Button>
            <Button variant="outline" onClick={handleRemove} disabled={isSaving || !configured} className="text-red-400 hover:text-red-300">
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
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Holdings</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{status?.holdingsCount ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Positions</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{status?.positionsCount ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Positions</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{status?.openPositionCount ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Balance</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {status ? `₹${status.availableBalance.toFixed(2)}` : '-'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-foreground">Sync Historical Trades</p>
              <p className="text-xs text-muted-foreground">
                Imports matched closed trades from Dhan history. Open legs remain untouched until they are closed.
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
              <Button onClick={handleSync} disabled={isSyncing || !configured}>
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync from Dhan
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
