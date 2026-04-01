'use client';

import React, { useState } from "react"

import { useRef } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useIdeas } from '@/lib/ideas-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2, Github, Loader2 } from 'lucide-react';
import CurrencySettings from '@/components/currency-settings';
import CapitalAdjustmentsSettings from '@/components/capital-adjustments-settings';
import StartingBalanceSettings from '@/components/starting-balance-settings';
import { fetchTradesFromGithub, parseGithubRepoUrl } from '@/lib/github-service';

export default function DataUtilities() {
  const { trades, exportJSON, exportCSV, importJSON, clearTrades } = useTrades();
  const { ideas, exportJSON: exportIdeasJSON, exportCSV: exportIdeasCSV, importJSON: importIdeasJSON } = useIdeas();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ideaFileInputRef = useRef<HTMLInputElement>(null);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importJSON(file);
      alert('Data imported successfully!');
    } catch (error) {
      alert(`Failed to import data: ${error}`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportIdeas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importIdeasJSON(file);
      alert('Ideas imported successfully!');
    } catch (error) {
      alert(`Failed to import ideas: ${error}`);
    }

    if (ideaFileInputRef.current) {
      ideaFileInputRef.current.value = '';
    }
  };

  const handleExportJSON = () => {
    if (trades.length === 0) {
      alert('No trades to export');
      return;
    }
    exportJSON();
  };

  const handleExportCSV = () => {
    if (trades.length === 0) {
      alert('No trades to export');
      return;
    }
    exportCSV();
  };

  const handleExportIdeasJSON = () => {
    if (ideas.length === 0) {
      alert('No ideas to export');
      return;
    }
    exportIdeasJSON();
  };

  const handleExportIdeasCSV = () => {
    if (ideas.length === 0) {
      alert('No ideas to export');
      return;
    }
    exportIdeasCSV();
  };

  const handleExportAllJSON = () => {
    if (trades.length === 0 && ideas.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      const combinedData = {
        trades,
        ideas,
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
    } catch (error) {
      alert(`Failed to export all data: ${error}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all trades? This action cannot be undone!')) {
      return;
    }

    try {
      await clearTrades();
      alert('All trades deleted successfully.');
    } catch (error) {
      alert(`Failed to delete trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImportFromGithub = async () => {
    if (!githubRepoUrl.trim()) {
      alert('Please enter a GitHub repository URL');
      return;
    }

    setIsGithubLoading(true);
    try {
      const parsed = parseGithubRepoUrl(githubRepoUrl);
      if (!parsed) {
        alert('Invalid GitHub repository URL. Use format: github.com/owner/repo or owner/repo');
        return;
      }

      const result = await fetchTradesFromGithub(parsed.owner, parsed.repo);
      
      if (!result.success) {
        alert(`Failed to fetch trades: ${result.error}`);
        return;
      }

      if (result.trades.length === 0) {
        alert('No trades found in the repository');
        return;
      }

      // Import the trades
      const blob = new Blob([JSON.stringify(result.trades)], { type: 'application/json' });
      await importJSON(blob as any);
      
      alert(`Successfully imported ${result.trades.length} trades from GitHub!`);
      setGithubRepoUrl('');
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 w-full max-w-3xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Data & Settings</h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Manage your trading journal data</p>
      </div>

      {/* Currency Settings */}
      <CurrencySettings />

      {/* Starting Balance Settings */}
      <StartingBalanceSettings />

      {/* Deposits / Withdrawals */}
      <CapitalAdjustmentsSettings />

      {/* Export Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-400" />
            Export Your Data
          </CardTitle>
          <CardDescription>Download your trading journal data in various formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Export as JSON (Full Backup)</p>
            <p className="text-xs text-muted-foreground mb-4">Create a complete backup of all your trades including screenshots</p>
            <Button onClick={handleExportJSON} className="bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Export as JSON
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Export as CSV (Spreadsheet)</p>
            <p className="text-xs text-muted-foreground mb-4">Export data in CSV format for analysis in Excel or Google Sheets</p>
            <Button onClick={handleExportCSV} className="bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Export Trade Ideas as JSON</p>
            <p className="text-xs text-muted-foreground mb-4">Backup all your trade ideas and setups</p>
            <Button onClick={handleExportIdeasJSON} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export Ideas (JSON)
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Export Trade Ideas as CSV</p>
            <p className="text-xs text-muted-foreground mb-4">Export ideas in spreadsheet format</p>
            <Button onClick={handleExportIdeasCSV} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export Ideas (CSV)
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Export Everything (Complete Backup)</p>
            <p className="text-xs text-muted-foreground mb-4">Export all trades and ideas together in one JSON file</p>
            <Button onClick={handleExportAllJSON} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            Import Data
          </CardTitle>
          <CardDescription>Restore trades from a previous backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Import from File</p>
            <p className="text-xs text-muted-foreground mb-4">Select a previously exported JSON file to import trades. Imported trades will be added to your existing data.</p>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-primary hover:bg-primary/90">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Import from GitHub Repository</p>
            <p className="text-xs text-muted-foreground mb-3">Provide a GitHub repository link to fetch and import trades</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="https://github.com/username/repo or username/repo"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                disabled={isGithubLoading}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <Button 
                onClick={handleImportFromGithub} 
                disabled={isGithubLoading || !githubRepoUrl.trim()}
                className="bg-purple-600 hover:bg-purple-700 w-full"
              >
                {isGithubLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching from GitHub...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" />
                    Import from GitHub
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 Tip: Make sure the repository has been synced using the &quot;Sync to GitHub&quot; button and contains a trades JSON file.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Import Trade Ideas from File</p>
            <p className="text-xs text-muted-foreground mb-4">Select a previously exported ideas JSON file to import. Imported ideas will be added to your existing ideas.</p>
            <Button onClick={() => ideaFileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Import Ideas
            </Button>
            <input ref={ideaFileInputRef} type="file" accept=".json" onChange={handleImportIdeas} className="hidden" />
          </div>
        </CardContent>
      </Card>

      {/* Data Statistics */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Data Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold text-foreground">{trades.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Ideas</p>
              <p className="text-2xl font-bold text-foreground">{ideas.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data Size</p>
              <p className="text-2xl font-bold text-foreground">
                {(new Blob([JSON.stringify({ trades, ideas })]).size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>

          <div className="p-3 bg-secondary rounded-lg border border-border">
            <p className="text-sm text-foreground">Your trades and ideas are saved to your signed-in journal account and reload from the server when you come back.</p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-border border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete all trading data. This action cannot be undone.</p>
          <Button onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Trades
          </Button>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle>Storage Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Storage Method:</strong> LocalStorage (Browser)
          </p>
          <p>
            <strong>Persistence:</strong> Data persists across browser sessions until cleared
          </p>
          <p>
            <strong>Privacy:</strong> All data is stored locally on your device. No information is sent to external servers.
          </p>
          <p>
            <strong>Backup:</strong> Regularly export your data as JSON to create backups you can store safely.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
