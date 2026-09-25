'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toBlob, toPng } from 'html-to-image';
import { ArrowDownToLine, Copy, ImageIcon, Link2, Linkedin, MessageCircle, Share2, Twitter } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { CapitalAdjustment, Trade } from '@/lib/types';
import { CURRENCY_SYMBOLS, formatBaseCurrencyAmount, formatCurrency, getTradeBasePnL, getTradeOutcome } from '@/lib/trade-utils';
import {
  buildPerformanceShareSnapshot,
  buildPerformanceShareText,
  buildSingleTradeShareText,
  filterTradesByRange,
  formatDisplayDate,
  getShareDateRange,
  getTradeShareLayout,
  TRADE_SHARE_LAYOUTS,
  type ShareGraphType,
  type ShareRangePreset,
  type ShareVisualTheme,
  type TradeShareLayout,
} from '@/lib/share-card';
import { Button } from '@/components/ui/button';
import TradeShareCardPreview from '@/components/trade-share-card-preview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface ShareCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'performance' | 'trade';
  trades: Trade[];
  trade?: Trade | null;
}

type IncludeOptions = {
  pnlPercent: boolean;
  pnlAmount: boolean;
  winRate: boolean;
  tradeCount: boolean;
  bestWorst: boolean;
  graph: boolean;
  hideBalance: boolean;
  entryExitPrices: boolean;
  instrumentName: boolean;
  username: boolean;
};

interface HostedShareLinks {
  shareId: string;
  pageUrl: string;
  imageUrl: string;
  expiresAt?: string | null;
}

function getDefaultVisualTheme(currentTheme: ShareCardDialogProps['mode'], resolvedTheme: 'light' | 'dark', theme: string): ShareVisualTheme {
  if (theme === 'cyberpunk') return 'cyberpunk';
  if (theme === 'prism') return 'prism';
  return resolvedTheme === 'dark' || currentTheme === 'trade' ? 'dark' : 'light';
}

function getThemeTokens(theme: ShareVisualTheme) {
  switch (theme) {
    case 'light':
      return {
        shell: 'bg-white text-slate-950 border-slate-200',
        card: 'bg-slate-100/90 border-slate-200',
        muted: 'text-slate-500',
        accent: 'from-emerald-500 via-sky-500 to-violet-500',
        positive: 'text-emerald-600',
        negative: 'text-rose-600',
        line: '#0f172a',
        area: '#22c55e',
        grid: '#cbd5e1',
      };
    case 'cyberpunk':
      return {
        shell: 'bg-[#0b1024] text-cyan-50 border-cyan-500/30',
        card: 'bg-[#0f1734]/90 border-cyan-500/20',
        muted: 'text-cyan-200/70',
        accent: 'from-fuchsia-500 via-cyan-400 to-amber-300',
        positive: 'text-emerald-300',
        negative: 'text-rose-300',
        line: '#22d3ee',
        area: '#d946ef',
        grid: '#1f2a4d',
      };
    case 'prism':
      return {
        shell: 'bg-[#060914] text-slate-50 border-red-500/20',
        card: 'bg-[#11182d]/90 border-red-500/15',
        muted: 'text-slate-300/70',
        accent: 'from-sky-500 via-violet-500 to-red-500',
        positive: 'text-emerald-300',
        negative: 'text-rose-300',
        line: '#f43f5e',
        area: '#6366f1',
        grid: '#1e293b',
      };
    case 'dark':
    default:
      return {
        shell: 'bg-slate-950 text-slate-50 border-slate-800',
        card: 'bg-slate-900/90 border-slate-800',
        muted: 'text-slate-400',
        accent: 'from-emerald-500 via-sky-500 to-violet-500',
        positive: 'text-emerald-300',
        negative: 'text-rose-300',
        line: '#f8fafc',
        area: '#22c55e',
        grid: '#1e293b',
      };
  }
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function ShareCardDialog({
  open,
  onOpenChange,
  mode,
  trades,
  trade,
}: ShareCardDialogProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { baseCurrency, startingBalance, capitalAdjustments } = useSettings();
  const { theme, resolvedTheme } = useTheme();
  const [rangePreset, setRangePreset] = useState<ShareRangePreset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [graphType, setGraphType] = useState<ShareGraphType>('equity');
  const [shareLayout, setShareLayout] = useState<TradeShareLayout>('post');
  const [visualTheme, setVisualTheme] = useState<ShareVisualTheme>(getDefaultVisualTheme(mode, resolvedTheme, theme));
  const [caption, setCaption] = useState('Discipline > Luck');
  const [username, setUsername] = useState('');
  const [hostedShare, setHostedShare] = useState<HostedShareLinks | null>(null);
  const [isCreatingHostedShare, setIsCreatingHostedShare] = useState(false);
  const [include, setInclude] = useState<IncludeOptions>({
    pnlPercent: true,
    pnlAmount: true,
    winRate: true,
    tradeCount: true,
    bestWorst: true,
    graph: true,
    hideBalance: false,
    entryExitPrices: false,
    instrumentName: true,
    username: true,
  });

  useEffect(() => {
    setVisualTheme(getDefaultVisualTheme(mode, resolvedTheme, theme));
  }, [mode, resolvedTheme, theme]);

  useEffect(() => {
    const fallbackName = user?.name?.trim() || user?.email?.split('@')[0] || 'Trader';
    setUsername(fallbackName);
  }, [user]);

  useEffect(() => {
    setHostedShare(null);
  }, [mode, trade, rangePreset, customFrom, customTo, graphType, shareLayout, visualTheme, caption, username, include]);

  const range = useMemo(
    () => getShareDateRange(rangePreset, customFrom, customTo),
    [rangePreset, customFrom, customTo],
  );

  const filteredTrades = useMemo(() => {
    if (mode === 'trade') {
      return trade ? [trade] : [];
    }
    return filterTradesByRange(trades, range.from, range.to);
  }, [mode, range.from, range.to, trade, trades]);

  const performanceSnapshot = useMemo(() => {
    if (mode !== 'performance') return null;
    return buildPerformanceShareSnapshot({
      trades: filteredTrades,
      startingBalance,
      capitalAdjustments: capitalAdjustments as CapitalAdjustment[],
      label: range.label,
    });
  }, [mode, filteredTrades, startingBalance, capitalAdjustments, range.label]);

  const shareText = useMemo(() => {
    if (mode === 'trade' && trade) {
      return buildSingleTradeShareText(trade);
    }
    if (performanceSnapshot && performanceSnapshot.tradeCount > 0) {
      return buildPerformanceShareText(performanceSnapshot, baseCurrency);
    }
    return '';
  }, [mode, trade, performanceSnapshot, baseCurrency]);

  const themeTokens = getThemeTokens(visualTheme);
  const canShare = mode === 'trade' ? Boolean(trade) : Boolean(performanceSnapshot && performanceSnapshot.tradeCount > 0);
  const tradeShareLayout = getTradeShareLayout(shareLayout);

  const exportPreview = async () => {
    if (!previewRef.current) return null;
    return toPng(previewRef.current, {
      cacheBust: true,
      pixelRatio: mode === 'trade' ? 1 : 2,
      backgroundColor: visualTheme === 'light' ? '#ffffff' : '#020617',
      ...(mode === 'trade'
        ? {
            width: tradeShareLayout.width,
            height: tradeShareLayout.height,
            canvasWidth: tradeShareLayout.width,
            canvasHeight: tradeShareLayout.height,
          }
        : {}),
    });
  };

  const handleDownloadImage = async () => {
    if (!canShare) return;

    try {
      const dataUrl = await exportPreview();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = mode === 'trade' ? `${trade?.symbol || 'trade'}-${shareLayout}-share-card.png` : 'pnl-share-card.png';
      link.click();
      toast({
        title: 'Image downloaded',
        description: 'Your share card is ready as a PNG.',
      });
    } catch {
      toast({
        title: 'Export failed',
        description: 'The share card could not be exported right now.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyImage = async () => {
    if (!canShare || !previewRef.current) return;

    try {
      const blob = await toBlob(previewRef.current, {
        cacheBust: true,
        pixelRatio: mode === 'trade' ? 1 : 2,
        backgroundColor: visualTheme === 'light' ? '#ffffff' : '#020617',
        ...(mode === 'trade'
          ? {
              width: tradeShareLayout.width,
              height: tradeShareLayout.height,
              canvasWidth: tradeShareLayout.width,
              canvasHeight: tradeShareLayout.height,
            }
          : {}),
      });

      if (!blob || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard image export unavailable');
      }

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast({
        title: 'Image copied',
        description: 'The share card image is now in your clipboard.',
      });
    } catch {
      toast({
        title: 'Copy image failed',
        description: 'Your browser did not allow image copying. Download PNG instead.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyText = async () => {
    if (!shareText) return;

    try {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: 'Share text copied',
        description: 'You can paste the performance summary anywhere.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Clipboard access was not available.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      const hosted = await ensureHostedShare();
      if (!hosted) return;
      await navigator.clipboard.writeText(hosted.imageUrl);
      toast({
        title: 'Link copied',
        description: 'A hosted image link for this share card has been copied.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not create or copy the hosted share link right now.',
        variant: 'destructive',
      });
    }
  };

  const handleNativeShare = async () => {
    if (!shareText) return;

    const hosted = await ensureHostedShare();
    const shareUrl = hosted?.pageUrl || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: mode === 'trade' ? 'Traderlogify Trade Snapshot' : 'Traderlogify Performance Snapshot',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // fall through
      }
    }

    await handleCopyText();
  };

  const handleExternalShare = (network: 'whatsapp' | 'twitter' | 'linkedin') => {
    if (!shareText) return;

    const text = encodeURIComponent(shareText);
    void ensureHostedShare().then((hosted) => {
      const url = encodeURIComponent(hosted?.pageUrl || window.location.href);

      const shareUrl =
        network === 'whatsapp'
          ? `https://wa.me/?text=${text}%20${url}`
          : network === 'twitter'
            ? `https://twitter.com/intent/tweet?text=${text}&url=${url}`
            : `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;

      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }).catch(() => {
      toast({
        title: 'Share failed',
        description: 'Could not create the hosted share link right now.',
        variant: 'destructive',
      });
    });
  };

  const ensureHostedShare = async () => {
    if (hostedShare) return hostedShare;
    if (!canShare || !previewRef.current) return null;

    setIsCreatingHostedShare(true);
    try {
      const imageDataUrl = await exportPreview();
      if (!imageDataUrl) {
        throw new Error('Share image export failed');
      }

      const payload =
        mode === 'trade' && trade
          ? {
              tradeId: trade.id,
              symbol: trade.symbol,
              date: trade.date,
              setupName: trade.setupName,
            }
          : performanceSnapshot
            ? {
                label: performanceSnapshot.label,
                tradeCount: performanceSnapshot.tradeCount,
                totalPnl: performanceSnapshot.totalPnl,
                totalPnlPercent: performanceSnapshot.totalPnlPercent,
              }
            : null;

      const response = await fetch('/api/shared-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shareType: mode,
          title: mode === 'trade'
            ? `${trade?.symbol || 'Trade'} Trade Snapshot`
            : `${performanceSnapshot?.label || 'Performance'} Performance Snapshot`,
          caption: caption.trim() || null,
          summaryText: shareText || null,
          imageDataUrl,
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create hosted share');
      }

      const data = await response.json() as HostedShareLinks;
      setHostedShare(data);
      return data;
    } finally {
      setIsCreatingHostedShare(false);
    }
  };

  const title = mode === 'trade' ? 'Share Trade' : 'Share P&L';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0 sm:max-w-6xl">
        <div className="grid max-h-[92vh] grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="overflow-y-auto border-b border-border p-5 xl:border-r xl:border-b-0">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Create a polished share card with privacy controls, theme styling, and image export.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-5">
              {mode === 'performance' ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Date Selection</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['today', 'Today'],
                      ['last7', 'Last 7 Days'],
                      ['custom', 'Custom'],
                    ] as const).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={rangePreset === value ? 'default' : 'outline'}
                        onClick={() => setRangePreset(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  {rangePreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">From</span>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">To</span>
                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                        />
                      </label>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Data Options</p>
                <div className="space-y-2">
                  <ToggleRow label="Total P&L %" description="Show performance percentage." checked={include.pnlPercent} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, pnlPercent: checked }))} />
                  <ToggleRow label="Profit / Loss amount" description="Show the main net amount." checked={include.pnlAmount} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, pnlAmount: checked }))} />
                  {mode === 'performance' ? (
                    <>
                      <ToggleRow label="Win rate" description="Include percentage of profitable trades." checked={include.winRate} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, winRate: checked }))} />
                      <ToggleRow label="Number of trades" description="Show trade count for the selected range." checked={include.tradeCount} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, tradeCount: checked }))} />
                      <ToggleRow label="Best / Worst trade" description="Highlight strongest and weakest trades." checked={include.bestWorst} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, bestWorst: checked }))} />
                      <ToggleRow label="Equity curve / PnL trend" description="Add a professional mini chart." checked={include.graph} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, graph: checked }))} />
                      <ToggleRow label="Hide balance" description="Keep account balance private in the preview." checked={include.hideBalance} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, hideBalance: checked }))} />
                    </>
                  ) : null}
                  {mode === 'trade' ? (
                    <>
                      <ToggleRow label="Instrument name" description="Show the symbol and setup title." checked={include.instrumentName} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, instrumentName: checked }))} />
                      <ToggleRow label="Entry / Exit prices" description="Show trade price details on the card." checked={include.entryExitPrices} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, entryExitPrices: checked }))} />
                    </>
                  ) : null}
                  <ToggleRow label="Username" description="Add a trader handle or display name." checked={include.username} onCheckedChange={(checked) => setInclude((prev) => ({ ...prev, username: checked }))} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Card Customization</p>
                {mode === 'trade' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {TRADE_SHARE_LAYOUTS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant={shareLayout === option.value ? 'default' : 'outline'}
                        onClick={() => setShareLayout(option.value)}
                        className="h-auto min-h-14 flex-col gap-0.5 py-2"
                      >
                        <span>{option.label}</span>
                        <span className="text-[10px] opacity-70">{option.dimensions}</span>
                      </Button>
                    ))}
                  </div>
                ) : null}
                {mode === 'trade' ? (
                  <p className="rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                    The trade card uses the Traderlogify P&amp;L visual style from the preview above.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(['light', 'dark', 'prism', 'cyberpunk'] as ShareVisualTheme[]).map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={visualTheme === value ? 'default' : 'outline'}
                        onClick={() => setVisualTheme(value)}
                        className="capitalize"
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                )}
                {mode === 'performance' && include.graph ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(['equity', 'pnl'] as ShareGraphType[]).map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={graphType === value ? 'default' : 'outline'}
                        onClick={() => setGraphType(value)}
                      >
                        {value === 'equity' ? 'Equity Curve' : 'PnL Trend'}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Username</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your name or handle"
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Caption</span>
                  <input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Discipline > Luck"
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Share Options</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" onClick={handleDownloadImage} disabled={!canShare}>
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCopyImage} disabled={!canShare}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Copy Image
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCopyText} disabled={!shareText}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Text
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCopyLink}>
                    <Link2 className="mr-2 h-4 w-4" />
                    {isCreatingHostedShare ? 'Creating Link...' : 'Copy Link'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleExternalShare('whatsapp')} disabled={!shareText}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleExternalShare('twitter')} disabled={!shareText}>
                    <Twitter className="mr-2 h-4 w-4" />
                    Twitter
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleExternalShare('linkedin')} disabled={!shareText}>
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>
                  <Button type="button" variant="outline" onClick={handleNativeShare} disabled={!shareText}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hosted share links expire automatically after 24 hours and are then deleted.
                </p>
                {hostedShare?.expiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Current hosted link expires at {new Date(hostedShare.expiresAt).toLocaleString()}.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-y-auto bg-secondary/10 p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Live Preview</p>
              <p className="text-xs text-muted-foreground">
                {mode === 'trade' ? 'Single-trade share card' : 'Range-based performance card'} with export-ready styling.
              </p>
            </div>

            {mode === 'trade' && trade ? (
              <TradeShareCardPreview
                trade={trade}
                layout={shareLayout}
                username={username}
                include={include}
                previewRef={previewRef}
              />
            ) : (
            <div className="flex justify-center">
              <div
                ref={previewRef}
                className={cn(
                  'w-full max-w-[760px] rounded-[28px] border p-6 shadow-2xl',
                  themeTokens.shell,
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={cn('text-[11px] uppercase tracking-[0.28em]', themeTokens.muted)}>Traderlogify Share</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                      {mode === 'trade' ? 'Trade Snapshot' : 'Performance Snapshot'}
                    </h3>
                    <p className={cn('mt-1 text-sm', themeTokens.muted)}>
                      {mode === 'trade'
                        ? trade
                          ? `${formatDisplayDate(trade.date)} • ${trade.tradeType}`
                          : 'No trade selected'
                        : performanceSnapshot?.label || 'No trades in this selection'}
                    </p>
                  </div>
                  <div className={cn('rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white', themeTokens.accent)}>
                    Share Ready
                  </div>
                </div>

                {include.username && username.trim() ? (
                  <div className={cn('mt-5 rounded-2xl border px-4 py-3', themeTokens.card)}>
                    <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Trader</p>
                    <p className="mt-1 text-lg font-semibold">{username.trim()}</p>
                  </div>
                ) : null}

                {mode === 'trade' && trade ? (
                  <>
                    {include.instrumentName ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Instrument</p>
                          <p className="mt-2 text-xl font-semibold">{trade.symbol}</p>
                          <p className={cn('text-sm', themeTokens.muted)}>{trade.setupName}</p>
                        </div>
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Outcome</p>
                          <p className={cn(
                            'mt-2 text-xl font-semibold',
                            trade.pnl >= 0 ? themeTokens.positive : themeTokens.negative,
                          )}>
                            {getTradeOutcome(trade.pnl) === 'W' ? 'Win' : getTradeOutcome(trade.pnl) === 'L' ? 'Loss' : 'Break-Even'}
                          </p>
                          <p className={cn('text-sm', themeTokens.muted)}>{trade.position} • {trade.tradeType}</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {include.pnlAmount ? (
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Net P&L</p>
                          <p className={cn('mt-2 text-3xl font-semibold', trade.pnl >= 0 ? themeTokens.positive : themeTokens.negative)}>
                            {formatCurrency(trade.pnl, trade.currency)}
                          </p>
                        </div>
                      ) : null}
                      <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                        <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>R Multiple</p>
                        <p className="mt-2 text-3xl font-semibold">{trade.rFactor.toFixed(2)}R</p>
                      </div>
                    </div>

                    {include.entryExitPrices ? (
                      <div className={cn('mt-5 grid gap-3 sm:grid-cols-3', themeTokens.muted)}>
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className="text-xs uppercase tracking-[0.18em]">Entry</p>
                          <p className="mt-2 text-lg font-semibold text-current">
                            {trade.entryPrice ? `${CURRENCY_SYMBOLS[trade.currency]}${trade.entryPrice.toFixed(2)}` : 'N/A'}
                          </p>
                        </div>
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className="text-xs uppercase tracking-[0.18em]">Exit</p>
                          <p className="mt-2 text-lg font-semibold text-current">
                            {trade.exitPrice ? `${CURRENCY_SYMBOLS[trade.currency]}${trade.exitPrice.toFixed(2)}` : 'N/A'}
                          </p>
                        </div>
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className="text-xs uppercase tracking-[0.18em]">Stop Loss</p>
                          <p className="mt-2 text-lg font-semibold text-current">
                            {CURRENCY_SYMBOLS[trade.currency]}{trade.stopLoss.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : performanceSnapshot ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {include.pnlAmount ? (
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Net P&L</p>
                          <p className={cn(
                            'mt-2 text-2xl font-semibold',
                            performanceSnapshot.totalPnl >= 0 ? themeTokens.positive : themeTokens.negative,
                          )}>
                            {formatBaseCurrencyAmount(performanceSnapshot.totalPnl, baseCurrency)}
                          </p>
                        </div>
                      ) : null}
                      {include.pnlPercent ? (
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>P&L %</p>
                          <p className={cn(
                            'mt-2 text-2xl font-semibold',
                            (performanceSnapshot.totalPnlPercent || 0) >= 0 ? themeTokens.positive : themeTokens.negative,
                          )}>
                            {performanceSnapshot.totalPnlPercent === null ? 'N/A' : `${performanceSnapshot.totalPnlPercent >= 0 ? '+' : ''}${performanceSnapshot.totalPnlPercent.toFixed(2)}%`}
                          </p>
                        </div>
                      ) : null}
                      {include.winRate ? (
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Win Rate</p>
                          <p className="mt-2 text-2xl font-semibold">{performanceSnapshot.winRate.toFixed(1)}%</p>
                        </div>
                      ) : null}
                      {include.tradeCount ? (
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Trades</p>
                          <p className="mt-2 text-2xl font-semibold">{performanceSnapshot.tradeCount}</p>
                        </div>
                      ) : null}
                    </div>

                    {!include.hideBalance ? (
                      <div className={cn('mt-5 rounded-2xl border px-4 py-4', themeTokens.card)}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Starting Balance</p>
                            <p className="mt-2 text-xl font-semibold">{formatBaseCurrencyAmount(performanceSnapshot.balanceStart, baseCurrency)}</p>
                          </div>
                          <div>
                            <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Ending Balance</p>
                            <p className="mt-2 text-xl font-semibold">{formatBaseCurrencyAmount(performanceSnapshot.balanceEnd, baseCurrency)}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {include.graph && performanceSnapshot.equityCurve.length > 0 ? (
                      <div className={cn('mt-5 rounded-2xl border px-4 py-4', themeTokens.card)}>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>
                              {graphType === 'equity' ? 'Equity Curve' : 'PnL Trend'}
                            </p>
                            <p className={cn('text-sm', themeTokens.muted)}>
                              {graphType === 'equity' ? 'Cumulative performance progression' : 'Trade-by-trade result pattern'}
                            </p>
                          </div>
                        </div>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceSnapshot.equityCurve}>
                              <defs>
                                <linearGradient id="shareArea" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={themeTokens.area} stopOpacity={0.72} />
                                  <stop offset="100%" stopColor={themeTokens.area} stopOpacity={0.05} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke={themeTokens.grid} strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="label" tick={{ fill: themeTokens.line, fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis hide />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: visualTheme === 'light' ? '#ffffff' : '#020617',
                                  border: `1px solid ${themeTokens.grid}`,
                                  color: themeTokens.line,
                                }}
                                formatter={(value) => formatBaseCurrencyAmount(Number(value ?? 0), baseCurrency)}
                              />
                              <Area
                                type="monotone"
                                dataKey={graphType === 'equity' ? 'equity' : 'pnl'}
                                stroke={themeTokens.line}
                                fill="url(#shareArea)"
                                strokeWidth={2.5}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : null}

                    {include.bestWorst ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Best Trade</p>
                          {performanceSnapshot.bestTrade ? (
                            <>
                              <p className="mt-2 text-lg font-semibold">{performanceSnapshot.bestTrade.symbol}</p>
                              <p className={cn('text-sm', themeTokens.positive)}>
                                {formatBaseCurrencyAmount(getTradeBasePnL(performanceSnapshot.bestTrade), baseCurrency)}
                              </p>
                            </>
                          ) : (
                            <p className={cn('mt-2 text-sm', themeTokens.muted)}>No data</p>
                          )}
                        </div>
                        <div className={cn('rounded-2xl border px-4 py-4', themeTokens.card)}>
                          <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Worst Trade</p>
                          {performanceSnapshot.worstTrade ? (
                            <>
                              <p className="mt-2 text-lg font-semibold">{performanceSnapshot.worstTrade.symbol}</p>
                              <p className={cn('text-sm', themeTokens.negative)}>
                                {formatBaseCurrencyAmount(getTradeBasePnL(performanceSnapshot.worstTrade), baseCurrency)}
                              </p>
                            </>
                          ) : (
                            <p className={cn('mt-2 text-sm', themeTokens.muted)}>No data</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className={cn('mt-6 rounded-2xl border border-dashed p-6 text-sm', themeTokens.muted)}>
                    No trades are available for this share selection yet.
                  </div>
                )}

                {caption.trim() ? (
                  <div className={cn('mt-6 rounded-2xl border px-4 py-4', themeTokens.card)}>
                    <p className={cn('text-xs uppercase tracking-[0.18em]', themeTokens.muted)}>Caption</p>
                    <p className="mt-2 text-lg font-medium">{caption.trim()}</p>
                  </div>
                ) : null}
              </div>
            </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
