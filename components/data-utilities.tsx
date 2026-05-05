'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, Github, Loader2, RefreshCcw, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { useTrades } from '@/lib/trade-context';
import { useIdeas } from '@/lib/ideas-context';
import { useSettings } from '@/lib/settings-context';
import { isProPlan } from '@/lib/subscription';
import { parseGithubRepoUrl, fetchTradesFromGithub } from '@/lib/github-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CurrencySettings from '@/components/currency-settings';
import StartingBalanceSettings from '@/components/starting-balance-settings';
import CapitalAdjustmentsSettings from '@/components/capital-adjustments-settings';
import BillingSettings from '@/components/billing-settings';
import { useToast } from '@/hooks/use-toast';
import type { CapitalAdjustment, Currency, TradeIdea } from '@/lib/types';

type BackupSettings = {
  baseCurrency?: Currency;
  startingBalance?: number;
  capitalAdjustments?: CapitalAdjustment[];
};

type ImportPreview = {
  file: File;
  tradeCount: number;
  duplicateTradeCount: number;
  newTradeCount: number;
  ideaCount: number;
  duplicateIdeaCount: number;
  newIdeaCount: number;
  settings: BackupSettings | null;
};

function isTradeArray(input: unknown): input is Array<{ id: string; date: string; symbol: string; pnl: number }> {
  return Array.isArray(input) && input.every((item) => item && typeof item === 'object' && 'id' in item && 'date' in item && 'symbol' in item && typeof (item as any).pnl === 'number');
}

function isIdeaArray(input: unknown): input is TradeIdea[] {
  return Array.isArray(input) && input.every((item) => item && typeof item === 'object' && 'id' in item && 'name' in item && 'createdAt' in item && 'updatedAt' in item);
}

function normalizeBackupSettings(input: unknown): BackupSettings | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const next: BackupSettings = {};

  if (typeof raw.baseCurrency === 'string') {
    next.baseCurrency = raw.baseCurrency as Currency;
  }

  if (typeof raw.startingBalance === 'number' && Number.isFinite(raw.startingBalance)) {
    next.startingBalance = raw.startingBalance;
  }

  if (Array.isArray(raw.capitalAdjustments)) {
    next.capitalAdjustments = raw.capitalAdjustments.filter(
      (item): item is CapitalAdjustment =>
        Boolean(item) &&
        typeof item === 'object' &&
        'id' in item &&
        'date' in item &&
        'amount' in item &&
        Number.isFinite(Number((item as CapitalAdjustment).amount))
    );
  }

  return Object.keys(next).length > 0 ? next : null;
}

export default function DataUtilities() {
  const { trades, exportJSON, exportCSV, importJSON, clearTrades } = useTrades();
  const { ideas, exportJSON: exportIdeasJSON, exportCSV: exportIdeasCSV, importJSON: importIdeasJSON } = useIdeas();
  const {
    billingState,
    baseCurrency,
    startingBalance,
    capitalAdjustments,
    setBaseCurrency,
    setStartingBalance,
    saveCapitalAdjustments,
  } = useSettings();
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReplacingImport, setIsReplacingImport] = useState(false);
  const proPlan = isProPlan(billingState);

  const storageSizeKb = useMemo(() => {
    return (new Blob([JSON.stringify({ trades, ideas, settings: { baseCurrency, startingBalance, capitalAdjustments } })]).size / 1024).toFixed(2);
  }, [trades, ideas, baseCurrency, startingBalance, capitalAdjustments]);

  const handleExportAllJSON = () => {
    if (trades.length === 0 && ideas.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'Add trades or ideas before creating a full backup.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const combinedData = {
        trades,
        ideas,
        settings: {
          baseCurrency,
          startingBalance,
          capitalAdjustments,
        },
        exportedAt: new Date().toISOString(),
      };

      const data = JSON.stringify(combinedData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-journal-complete-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'Backup created',
        description: 'Your trades, ideas, and settings were exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unable to create the backup file.',
        variant: 'destructive',
      });
    }
  };

  const handleClearAllTrades = async () => {
    try {
      await clearTrades();
      setIsDeleteDialogOpen(false);
      toast({
        title: 'Trades deleted',
        description: 'All journal trades were removed. Ideas and settings were kept.',
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete your trades.',
        variant: 'destructive',
      });
    }
  };

  const handleImportFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const tradeData = isTradeArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && isTradeArray((parsed as Record<string, unknown>).trades)
          ? ((parsed as Record<string, unknown>).trades as Array<{ id: string; date: string; symbol: string; pnl: number }>)
          : [];
      const ideaData = isIdeaArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && isIdeaArray((parsed as Record<string, unknown>).ideas)
          ? ((parsed as Record<string, unknown>).ideas as TradeIdea[])
          : [];
      const settings = parsed && typeof parsed === 'object' ? normalizeBackupSettings((parsed as Record<string, unknown>).settings ?? parsed) : null;

      if (tradeData.length === 0 && ideaData.length === 0 && !settings) {
        throw new Error('This file does not contain a supported trade, idea, or settings backup.');
      }

      const existingTradeIds = new Set(trades.map((trade) => trade.id));
      const existingIdeaIds = new Set(ideas.map((idea) => idea.id));

      setImportPreview({
        file,
        tradeCount: tradeData.length,
        duplicateTradeCount: tradeData.filter((trade) => existingTradeIds.has(trade.id)).length,
        newTradeCount: tradeData.filter((trade) => !existingTradeIds.has(trade.id)).length,
        ideaCount: ideaData.length,
        duplicateIdeaCount: ideaData.filter((idea) => existingIdeaIds.has(idea.id)).length,
        newIdeaCount: ideaData.filter((idea) => !existingIdeaIds.has(idea.id)).length,
        settings,
      });
    } catch (error) {
      setImportPreview(null);
      toast({
        title: 'Import preview failed',
        description: error instanceof Error ? error.message : 'Please choose a valid backup file.',
        variant: 'destructive',
      });
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const handleExecuteImport = async (mode: 'merge' | 'replace') => {
    if (!importPreview) return;

    setIsImporting(true);
    try {
      const text = await importPreview.file.text();
      const parsed = JSON.parse(text);
      const tradePayload = isTradeArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).trades)
          ? (parsed as Record<string, unknown>).trades
          : null;
      const ideaPayload = isIdeaArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).ideas)
          ? (parsed as Record<string, unknown>).ideas
          : null;

      const tradeSummary = tradePayload
        ? await importJSON(new Blob([JSON.stringify(tradePayload)], { type: 'application/json' }), { mode })
        : { importedCount: 0, duplicateCount: 0, totalCount: 0 };
      const ideaSummary = ideaPayload
        ? await importIdeasJSON(new Blob([JSON.stringify(ideaPayload)], { type: 'application/json' }), { mode })
        : { importedCount: 0, duplicateCount: 0, totalCount: 0 };

      if (importPreview.settings) {
        if (importPreview.settings.baseCurrency) {
          await setBaseCurrency(importPreview.settings.baseCurrency);
        }
        if (typeof importPreview.settings.startingBalance === 'number') {
          await setStartingBalance(importPreview.settings.startingBalance);
        }
        if (importPreview.settings.capitalAdjustments) {
          await saveCapitalAdjustments(importPreview.settings.capitalAdjustments);
        }
      }

      setImportPreview(null);
      setIsReplacingImport(false);
      toast({
        title: mode === 'replace' ? 'Backup restored' : 'Import completed',
        description: [
          tradeSummary.importedCount ? `${tradeSummary.importedCount} trades imported` : null,
          ideaSummary.importedCount ? `${ideaSummary.importedCount} ideas imported` : null,
          tradeSummary.duplicateCount ? `${tradeSummary.duplicateCount} duplicate trades skipped` : null,
          ideaSummary.duplicateCount ? `${ideaSummary.duplicateCount} duplicate ideas skipped` : null,
          importPreview.settings ? 'settings updated' : null,
        ].filter(Boolean).join(', ') || 'No new records were added.',
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unable to restore this backup.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFromGithub = async () => {
    if (!githubRepoUrl.trim()) {
      toast({
        title: 'Repository required',
        description: 'Enter a GitHub repository URL before importing.',
        variant: 'destructive',
      });
      return;
    }

    setIsGithubLoading(true);
    try {
      const parsed = parseGithubRepoUrl(githubRepoUrl);
      if (!parsed) {
        throw new Error('Use a repository in the format github.com/owner/repo or owner/repo.');
      }

      const result = await fetchTradesFromGithub(parsed.owner, parsed.repo);
      if (!result.success) {
        throw new Error(result.error || 'No backup file could be read from that repository.');
      }

      if (result.trades.length === 0) {
        throw new Error('No trades were found in that repository backup.');
      }

      const summary = await importJSON(new Blob([JSON.stringify(result.trades)], { type: 'application/json' }), { mode: 'merge' });
      setGithubRepoUrl('');
      toast({
        title: 'GitHub import completed',
        description: summary.duplicateCount
          ? `${summary.importedCount} trades imported and ${summary.duplicateCount} duplicates skipped.`
          : `${summary.importedCount} trades imported successfully.`,
      });
    } catch (error) {
      toast({
        title: 'GitHub import failed',
        description: error instanceof Error ? error.message : 'Unable to import from GitHub.',
        variant: 'destructive',
      });
    } finally {
      setIsGithubLoading(false);
    }
  };

  const handleProFeatureBlocked = (feature: string) => {
    toast({
      title: 'Pro feature',
      description: `${feature} is available on Pro. You can still manage settings and restore backups here.`,
    });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-3 sm:p-6 lg:p-8">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Data & Settings</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Control your journal workspace, create backups, and restore data with safer review steps.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70 bg-card/80">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trades</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{trades.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/80">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ideas</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{ideas.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/80">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Backup size</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{storageSizeKb} KB</p>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/80">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Storage</p>
                <p className="mt-2 text-sm font-medium text-foreground">Server-backed account data</p>
                <p className="mt-1 text-xs text-muted-foreground">Trades, ideas, and settings reload after sign in.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Keep display settings and account math aligned with how you review your journal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CurrencySettings />
                <StartingBalanceSettings />
                <CapitalAdjustmentsSettings />
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Backup & Restore</CardTitle>
                <CardDescription>Create portable backups and restore them with a preview before anything changes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-sm font-medium text-foreground">Backup account</p>
                    <p className="mt-1 text-sm text-muted-foreground">Best for restoring your whole workspace later.</p>
                    <Button
                      onClick={proPlan ? handleExportAllJSON : () => handleProFeatureBlocked('Full account backup')}
                      className="mt-4 w-full bg-green-600 hover:bg-green-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export full backup
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-sm font-medium text-foreground">Export for spreadsheet review</p>
                    <p className="mt-1 text-sm text-muted-foreground">Download focused files for analysis outside the app.</p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        onClick={proPlan ? exportCSV : () => handleProFeatureBlocked('Trade CSV export')}
                        variant="outline"
                      >
                        Trades CSV
                      </Button>
                      <Button
                        onClick={proPlan ? exportIdeasCSV : () => handleProFeatureBlocked('Ideas CSV export')}
                        variant="outline"
                      >
                        Ideas CSV
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Restore from JSON backup</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Supports trade backups, idea backups, or full account backups exported from this app.
                      </p>
                    </div>
                    <Button onClick={() => importInputRef.current?.click()} disabled={isImporting}>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose backup file
                    </Button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportFileSelection}
                      className="hidden"
                    />
                  </div>

                  {importPreview ? (
                    <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{importPreview.file.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Review what will be merged or replaced before restoring this backup.
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setImportPreview(null)} disabled={isImporting}>
                          Clear
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg border border-border/70 bg-card p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Trades</p>
                          <p className="mt-2 text-lg font-semibold text-foreground">{importPreview.tradeCount}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {importPreview.newTradeCount} new, {importPreview.duplicateTradeCount} duplicates
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-card p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ideas</p>
                          <p className="mt-2 text-lg font-semibold text-foreground">{importPreview.ideaCount}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {importPreview.newIdeaCount} new, {importPreview.duplicateIdeaCount} duplicates
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-card p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Settings</p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {importPreview.settings ? 'Included' : 'Not included'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {importPreview.settings
                              ? 'Currency, starting balance, and capital adjustments can be restored.'
                              : 'This file only contains journal records.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button onClick={() => void handleExecuteImport('merge')} disabled={isImporting}>
                          {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                          Merge backup
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => setIsReplacingImport(true)}
                          disabled={isImporting || (importPreview.tradeCount === 0 && importPreview.ideaCount === 0)}
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Replace current records
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-sm font-medium text-foreground">Import from GitHub repository</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pull trades from a repository that already contains a journal backup file.
                  </p>
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      placeholder="https://github.com/username/repo or username/repo"
                      value={githubRepoUrl}
                      onChange={(e) => setGithubRepoUrl(e.target.value)}
                      disabled={isGithubLoading}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                    <Button
                      onClick={handleImportFromGithub}
                      disabled={isGithubLoading || !githubRepoUrl.trim()}
                      className="w-full"
                    >
                      {isGithubLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing from GitHub...
                        </>
                      ) : (
                        <>
                          <Github className="mr-2 h-4 w-4" />
                          Import trades from GitHub
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={proPlan ? exportJSON : () => handleProFeatureBlocked('Trade JSON export')}
                    variant="outline"
                  >
                    Export trades JSON
                  </Button>
                  <Button
                    onClick={proPlan ? exportIdeasJSON : () => handleProFeatureBlocked('Ideas JSON export')}
                    variant="outline"
                  >
                    Export ideas JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <BillingSettings />

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Storage & Safety</CardTitle>
                <CardDescription>What stays on your account and what deserves a backup outside the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Primary storage:</strong> MySQL data tied to your signed-in account.</p>
                <p><strong>Synced records:</strong> Trades, trade ideas, starting balance, currency, and capital adjustments.</p>
                <p><strong>Browser storage:</strong> Small convenience settings like theme and fast bootstrap data.</p>
                <p><strong>Best practice:</strong> Export a full backup before bulk imports or large cleanup work.</p>
              </CardContent>
            </Card>

            <Card className="border-red-500/30 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>High-impact actions that are intentionally separated from normal settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-sm font-medium text-foreground">Delete all trades</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This removes journal trades only. Your ideas and account settings stay intact.
                  </p>
                  <Button onClick={() => setIsDeleteDialogOpen(true)} className="mt-4 bg-red-600 hover:bg-red-700">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete all trades
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all trades?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every trade from your journal. Ideas, billing, and settings will not be touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleClearAllTrades()}>
              Delete trades
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReplacingImport} onOpenChange={setIsReplacingImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current journal records?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your current trades and ideas before restoring the selected backup. Settings included in the backup will also overwrite the current settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleExecuteImport('replace')}
              disabled={isImporting}
            >
              {isImporting ? 'Restoring...' : 'Replace and restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
