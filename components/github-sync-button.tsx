'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Github, Loader2 } from 'lucide-react';
import { Trade } from '@/lib/types';
import { commitToGithub, uploadTradesToGithub } from '@/lib/github-service';
import { tradeToMarkdown, tradesToCSV, generateMonthlySummary } from '@/lib/trade-markdown-export';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface GitHubSyncButtonProps {
  trades: Trade[];
}

export default function GitHubSyncButton({ trades }: GitHubSyncButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [branch, setBranch] = useState('main');
  const { toast } = useToast();

  const handleSync = async () => {
    if (!owner || !repo || !token) {
      toast({
        title: 'Missing Information',
        description: 'Please provide repository owner, name, and GitHub token.',
        variant: 'destructive',
      });
      return;
    }

    if (trades.length === 0) {
      toast({
        title: 'No Trades',
        description: 'There are no trades to sync.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Generate JSON backup with all trades
      const jsonContent = JSON.stringify(trades, null, 2);
      const jsonResult = await commitToGithub(
        `trades/all_trades.json`,
        jsonContent,
        `Update all trades JSON - ${trades.length} trades total`,
        { owner, repo, token, branch }
      );

      if (!jsonResult.success) {
        throw new Error(`Failed to upload JSON: ${jsonResult.error}`);
      }

      // Generate CSV for all trades
      const csvContent = tradesToCSV(trades);
      const csvResult = await commitToGithub(
        'trades/all_trades.csv',
        csvContent,
        `Update all trades - ${trades.length} trades total`,
        { owner, repo, token, branch }
      );

      if (!csvResult.success) {
        throw new Error(`Failed to upload CSV: ${csvResult.error}`);
      }

      // Generate monthly summary
      const monthlySummary = generateMonthlySummary(trades, month, year);
      const summaryResult = await commitToGithub(
        `trades/${year}/${String(month).padStart(2, '0')}/summary.md`,
        monthlySummary,
        `Add monthly summary for ${month}/${year}`,
        { owner, repo, token, branch }
      );

      if (!summaryResult.success) {
        throw new Error(`Failed to upload summary: ${summaryResult.error}`);
      }

      // Upload individual trades
      let successCount = 0;
      for (const trade of trades) {
        const markdown = tradeToMarkdown(trade);
        const [year, month, day] = trade.date.split('-');
        const tradeFilePath = `trades/${year}/${month}/${day}/${trade.id}.md`;

        const result = await commitToGithub(
          tradeFilePath,
          markdown,
          `Add trade record: ${trade.symbol} ${trade.position} on ${trade.date}`,
          { owner, repo, token, branch }
        );

        if (result.success) {
          successCount++;
        }
      }

      toast({
        title: 'Sync Successful',
        description: `Successfully synced ${successCount} trades to GitHub!`,
      });

      setIsOpen(false);
      // Clear form
      setOwner('');
      setRepo('');
      setToken('');
      setBranch('main');
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'An error occurred during sync',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent"
        >
          <Github className="w-4 h-4" />
          Sync to GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Trades to GitHub</DialogTitle>
          <DialogDescription>
            Export all your trades as markdown files, CSV, and JSON to your GitHub repository.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Repository Owner
            </label>
            <input
              type="text"
              placeholder="your-github-username"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Repository Name
            </label>
            <input
              type="text"
              placeholder="trading-journal"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Create a token at{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub Settings
              </a>
              . Grant repo scope access.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Branch (optional)
            </label>
            <input
              type="text"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div className="bg-secondary/50 border border-border rounded-lg p-3">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-2">What will be synced:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Complete JSON backup (all_trades.json)</li>
                <li>Complete CSV with all trades (all_trades.csv)</li>
                <li>Individual trade files ({trades.length} markdown files)</li>
                <li>Monthly summary report</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleSync}
            disabled={isLoading || !owner || !repo || !token}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Sync {trades.length} Trades
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
