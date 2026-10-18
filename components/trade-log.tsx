'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTrades } from '@/lib/trade-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { EmotionTag, MarketSession, Trade } from '@/lib/types';
import { Trash2, Eye, Filter, Star, Pencil, Upload, X, Share2, Download } from 'lucide-react';
import { calculateRFactor, convertToBaseCurrency, CURRENCY_SYMBOLS, getExchangeRateToBase, getTradeOutcome, getTradeResultLabel } from '@/lib/trade-utils';
import { ScreenshotViewer } from './screenshot-viewer';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { validateImageFile } from '@/lib/validation';
import { FIB_LEVEL_OPTIONS, PRESET_SETUPS, SESSION_OPTIONS } from './trade-form';
import { inferMarketSessionFromEntryTime } from '@/lib/session-performance';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { EmptyStateIllustration } from './brand-illustrations';
import ShareCardDialog from '@/components/share-card-dialog';
import { useTemplates, type TradeTemplate } from '@/lib/templates-context';
import { openTradeJournalReportPDF } from '@/lib/trade-report';

const PENDING_OUTCOME_TAG = 'Pending Outcome';
const EMOTION_OPTIONS: EmotionTag[] = [
  'Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'Frustrated', 'Revenge', 'FOMO', 'Neutral',
];
type EditResultDirection = 'Pending' | 'Win' | 'Loss' | 'Break-Even';
const EDIT_RESULT_OPTIONS: EditResultDirection[] = ['Pending', 'Win', 'Loss', 'Break-Even'];

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysAgoLocalDateString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getLocalDateString(date);
}

function isBrokerSyncedTrade(trade: Trade) {
  return trade.id.startsWith('dhan:');
}

function isJournalEnrichedTrade(trade: Trade) {
  return Boolean(
    trade.tags?.length ||
    trade.beforeTradeScreenshot ||
      trade.afterExitScreenshot ||
      trade.hftScreenshot ||
      trade.hasScreenshots ||
      trade.preNotes?.trim() ||
      trade.postNotes?.trim() ||
      trade.duringTradeNotes?.trim() ||
      trade.emotionEntry ||
      trade.emotionExit ||
      (trade.setupName && !trade.setupName.startsWith('Dhan Sync')) ||
      trade.limit ||
      trade.exit
  );
}

function isPendingOutcomeTrade(trade: Trade) {
  return trade.tags?.includes(PENDING_OUTCOME_TAG) ?? false;
}

function getResultDisplay(trade: Trade): { label: string; className: string } {
  if (isPendingOutcomeTrade(trade)) {
    return { label: 'Pending', className: 'text-amber-400' };
  }

  const outcome = getTradeOutcome(trade.pnl);
  if (outcome === 'W') {
    return { label: 'Win', className: 'text-green-400' };
  }
  if (outcome === 'L') {
    return { label: 'Loss', className: 'text-red-400' };
  }
  return { label: 'Break-Even', className: 'text-yellow-400' };
}

function getTradeSessionLabel(trade: Trade) {
  const session = trade.session || inferMarketSessionFromEntryTime(trade.entryTime);
  return SESSION_OPTIONS.find((option) => option.value === session)?.label || '—';
}

export default function TradeLog() {
  const { trades, deleteTrade, updateTrade, getTradeDetails } = useTrades();
  const { user } = useAuth();
  const { addTemplate } = useTemplates();
  const tableScrollRailRef = useRef<HTMLDivElement | null>(null);
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const tableElementRef = useRef<HTMLTableElement | null>(null);
  const [tableContentWidth, setTableContentWidth] = useState(1280);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [sharingTrade, setSharingTrade] = useState<Trade | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editSetupName, setEditSetupName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editTimeFrame, setEditTimeFrame] = useState('');
  const [editSession, setEditSession] = useState<MarketSession | ''>('');
  const [editEntryTime, setEditEntryTime] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editExit, setEditExit] = useState('');
  const [editIsCustomSetup, setEditIsCustomSetup] = useState(false);
  const [editPreNotes, setEditPreNotes] = useState('');
  const [editPostNotes, setEditPostNotes] = useState('');
  const [editDuringTradeNotes, setEditDuringTradeNotes] = useState('');
  const [editEmotionEntry, setEditEmotionEntry] = useState<EmotionTag | ''>('');
  const [editEmotionExit, setEditEmotionExit] = useState<EmotionTag | ''>('');
  const [editRuleFollowed, setEditRuleFollowed] = useState<boolean | null>(null);
  const [editBeforeScreenshot, setEditBeforeScreenshot] = useState<string | null>(null);
  const [editAfterScreenshot, setEditAfterScreenshot] = useState<string | null>(null);
  const [editHftScreenshot, setEditHftScreenshot] = useState<string | null>(null);
  const [editExitPrice, setEditExitPrice] = useState('');
  const [editProfitAmount, setEditProfitAmount] = useState('');
  const [editResultDirection, setEditResultDirection] = useState<EditResultDirection>('Pending');
  const [sortBy, setSortBy] = useState<'date' | 'pnl'>('date');
  const [filterSetup, setFilterSetup] = useState('All');
  const [filterTag, setFilterTag] = useState('All');
  const [filterDate, setFilterDate] = useState<'All' | 'Today' | 'Last 7 Days'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { toast } = useToast();

  const openTradeDetails = useCallback(async (trade: Trade) => {
    setSelectedTrade(trade);
    if (!trade.hasScreenshots) return;
    try {
      const fullTrade = await getTradeDetails(trade.id, trade.accountId);
      setSelectedTrade((current) => (
        current?.id === trade.id && current.accountId === trade.accountId ? fullTrade : current
      ));
    } catch (error) {
      console.error('[TradeLog] Failed to load trade screenshots:', error);
      toast({
        title: 'Could not load trade screenshots',
        description: 'Trade details are available, but screenshots could not be loaded. Please try again.',
        variant: 'destructive',
      });
    }
  }, [getTradeDetails, toast]);

  const handleDownloadTradeReport = async (trade: Trade) => {
    try {
      const reportTrade = trade.hasScreenshots &&
        !trade.beforeTradeScreenshot &&
        !trade.afterExitScreenshot &&
        !trade.hftScreenshot
        ? await getTradeDetails(trade.id, trade.accountId)
        : trade;
      if (!openTradeJournalReportPDF(reportTrade, user?.name, () => {
        toast({
          title: 'PDF print failed',
          description: 'The report opened, but the browser could not start printing. Please try again.',
          variant: 'destructive',
        });
      })) {
        toast({
          title: 'Could not open report',
          description: 'Allow pop-ups for Traderlogify, then try downloading the PDF again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Trade report is ready',
        description: 'Choose “Save as PDF” in the print dialog to download your report.',
      });
    } catch (error) {
      console.error('[TradeLog] PDF report generation failed', error);
      toast({
        title: 'Report generation failed',
        description: 'The trade report could not be prepared. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const createPlaybookFromTrade = (trade: Trade) => {
    const now = new Date().toISOString();
    const payload: TradeTemplate = {
      id: `playbook:${Date.now()}`,
      name: `${trade.setupName} Playbook`,
      description: `Created from ${trade.symbol} on ${trade.date}`,
      symbol: trade.symbol,
      setupName: trade.setupName,
      tradeType: trade.tradeType,
      position: trade.position,
      timeFrame: trade.timeFrame,
      plannedRTarget: trade.plannedRTarget,
      preNotes: trade.preNotes,
      session: trade.session,
      marketCondition: trade.marketCondition,
      marketTrend: trade.marketTrend,
      setupType: trade.setupType,
      volumeProfile: trade.volumeProfile,
      emaTouch: trade.emaTouch === undefined ? '' : trade.emaTouch ? 'Yes' : 'No',
      riskRewardRatio: trade.riskRewardRatio !== undefined ? String(trade.riskRewardRatio) : undefined,
      marketOpenType: trade.marketOpenType,
      firstFiveMinuteCandleType: trade.firstFiveMinuteCandleType,
      entryRules: trade.preNotes || undefined,
      targetRules: trade.exit ? `Preferred exit: ${trade.exit}` : undefined,
      idealConditions: [
        trade.marketCondition ? `Condition: ${trade.marketCondition}` : '',
        trade.marketTrend ? `Trend: ${trade.marketTrend}` : '',
        trade.timeFrame ? `Time frame: ${trade.timeFrame}` : '',
      ].filter(Boolean).join(' | ') || undefined,
      commonMistakes: trade.mistakeTag || undefined,
      tags: trade.tags,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    addTemplate(payload);
    toast({
      title: 'Playbook created',
      description: `${trade.setupName} has been saved to Playbooks.`,
    });
  };

  const openTradeShare = (trade: Trade) => {
    setSharingTrade(trade);
    setIsShareDialogOpen(true);
  };

  const handleShareDialogChange = (open: boolean) => {
    setIsShareDialogOpen(open);
    if (!open) {
      setSharingTrade(null);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pendingTradeId = window.sessionStorage.getItem('td-open-trade-id');
    if (!pendingTradeId) return;

    const matchingTrade = trades.find((trade) => trade.id === pendingTradeId);
    if (matchingTrade) {
      const timeoutId = window.setTimeout(() => {
        void openTradeDetails(matchingTrade);
        window.sessionStorage.removeItem('td-open-trade-id');
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [getTradeDetails, openTradeDetails, trades]);

  const setupNames = useMemo(() => {
    return ['All', ...new Set(trades.map(t => t.setupName))];
  }, [trades]);

  const tagNames = useMemo(() => {
    return ['All', ...new Set(trades.flatMap((trade) => trade.tags || []))];
  }, [trades]);

  const filteredAndSortedTrades = useMemo(() => {
    const today = getLocalDateString(new Date());
    const last7DaysStart = getDaysAgoLocalDateString(6);
    let filtered = filterSetup === 'All' ? trades : trades.filter(t => t.setupName === filterSetup);
    if (filterTag !== 'All') {
      filtered = filtered.filter((trade) => (trade.tags || []).includes(filterTag));
    }
    if (filterDate === 'Today') {
      filtered = filtered.filter((trade) => trade.date === today);
    } else if (filterDate === 'Last 7 Days') {
      filtered = filtered.filter((trade) => trade.date >= last7DaysStart && trade.date <= today);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.pnl - a.pnl;
      }
    });
  }, [trades, sortBy, filterSetup, filterTag, filterDate]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTrades.length / pageSize));
  const pageTrades = useMemo(
    () => {
      const page = Math.min(currentPage, totalPages);
      return filteredAndSortedTrades.slice((page - 1) * pageSize, page * pageSize);
    },
    [currentPage, filteredAndSortedTrades, totalPages],
  );

  const visiblePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    const table = tableElementRef.current;
    const viewport = tableViewportRef.current;
    if (!table || !viewport) return;

    const updateTableContentWidth = () => {
      setTableContentWidth(Math.max(1280, Math.ceil(table.scrollWidth)));
    };

    updateTableContentWidth();
    const observer = new ResizeObserver(updateTableContentWidth);
    observer.observe(table);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pageTrades.length]);

  const syncTableScroll = (source: HTMLDivElement | null, target: HTMLDivElement | null) => {
    if (!source || !target || target.scrollLeft === source.scrollLeft) return;
    target.scrollLeft = source.scrollLeft;
  };

  const openEditTrade = async (trade: Trade) => {
    if (trade.hasScreenshots) {
      try {
        trade = await getTradeDetails(trade.id, trade.accountId);
      } catch (error) {
        console.error('[TradeLog] Failed to load trade for editing:', error);
        toast({
          title: 'Could not load trade',
          description: 'Please try opening this trade again.',
          variant: 'destructive',
        });
        return;
      }
    }
    setEditingTrade(trade);
    setEditSetupName(trade.setupName || '');
    setEditTags(trade.tags?.join(', ') || '');
    setEditTimeFrame(trade.timeFrame || '');
    setEditSession(trade.session || '');
    setEditEntryTime(trade.entryTime || '');
    setEditLimit(trade.limit || '');
    setEditExit(trade.exit || '');
    setEditIsCustomSetup(!PRESET_SETUPS.includes((trade.setupName || '') as (typeof PRESET_SETUPS)[number]));
    setEditPreNotes(trade.preNotes || '');
    setEditPostNotes(trade.postNotes || '');
    setEditDuringTradeNotes(trade.duringTradeNotes || '');
    setEditEmotionEntry(trade.emotionEntry || '');
    setEditEmotionExit(trade.emotionExit || '');
    setEditRuleFollowed(typeof trade.ruleFollowed === 'boolean' ? trade.ruleFollowed : null);
    setEditBeforeScreenshot(trade.beforeTradeScreenshot || null);
    setEditAfterScreenshot(trade.afterExitScreenshot || null);
    setEditHftScreenshot(trade.hftScreenshot || null);
    setEditExitPrice(trade.exitPrice !== undefined ? String(trade.exitPrice) : '');
    setEditProfitAmount(trade.pnl !== 0 ? String(Math.abs(trade.pnl + (trade.fees || 0))) : '');
    setEditResultDirection(
      trade.tags?.includes(PENDING_OUTCOME_TAG)
        ? 'Pending'
        : trade.pnl > 0
        ? 'Win'
        : trade.pnl < 0
        ? 'Loss'
        : 'Break-Even'
    );
  };

  const closeEditTrade = () => {
    setEditingTrade(null);
    setEditSetupName('');
    setEditTags('');
    setEditTimeFrame('');
    setEditSession('');
    setEditEntryTime('');
    setEditLimit('');
    setEditExit('');
    setEditIsCustomSetup(false);
    setEditPreNotes('');
    setEditPostNotes('');
    setEditDuringTradeNotes('');
    setEditEmotionEntry('');
    setEditEmotionExit('');
    setEditRuleFollowed(null);
    setEditBeforeScreenshot(null);
    setEditAfterScreenshot(null);
    setEditHftScreenshot(null);
    setEditExitPrice('');
    setEditProfitAmount('');
    setEditResultDirection('Pending');
  };

  const handleEditScreenshot = (type: 'before' | 'after' | 'hft') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid image',
        description: validation.error ?? 'Please upload a valid screenshot (JPEG, PNG, WebP, max 5MB).',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === 'before') {
        setEditBeforeScreenshot(result);
      } else if (type === 'after') {
        setEditAfterScreenshot(result);
      } else {
        setEditHftScreenshot(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditSetupPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__custom__') {
      setEditIsCustomSetup(true);
      setEditSetupName('');
      return;
    }

    setEditIsCustomSetup(false);
    setEditSetupName(selected);
  };

  const handleSaveTradeEdits = () => {
    if (!editingTrade) return;

    const fees = editingTrade.fees || 0;
    const enteredProfitAmount = editProfitAmount.trim() ? parseFloat(editProfitAmount) : null;
    if (editResultDirection !== 'Pending' && editResultDirection !== 'Break-Even') {
      if (enteredProfitAmount === null || !Number.isFinite(enteredProfitAmount) || enteredProfitAmount <= 0) {
        toast({
          title: 'Amount required',
          description: 'Enter a positive amount before marking the trade as Win or Loss.',
          variant: 'destructive',
        });
        return;
      }
    }

    const signedGrossPnl =
      editResultDirection === 'Pending' || editResultDirection === 'Break-Even'
        ? 0
        : Math.abs(enteredProfitAmount || 0) * (editResultDirection === 'Loss' ? -1 : 1);
    const nextPnl = editResultDirection === 'Pending' || editResultDirection === 'Break-Even'
      ? 0
      : signedGrossPnl - fees;
    const nextExitPrice = editExitPrice.trim() ? parseFloat(editExitPrice) : undefined;
    const exchangeRate = getExchangeRateToBase(editingTrade.currency);
    const nextRFactor =
      editingTrade.entryPrice !== undefined && editingTrade.stopLoss !== undefined && editingTrade.quantity
        ? calculateRFactor(nextPnl, editingTrade.stopLoss, editingTrade.entryPrice, editingTrade.position, editingTrade.quantity)
        : editingTrade.rFactor;
    const tags = Array.from(
      new Set(
        editTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .filter((tag) => editResultDirection === 'Pending' || tag !== PENDING_OUTCOME_TAG)
      )
    );
    if (editResultDirection === 'Pending' && !tags.includes(PENDING_OUTCOME_TAG)) {
      tags.push(PENDING_OUTCOME_TAG);
    }

    const updatedTrade: Trade = {
      ...editingTrade,
      tags,
      setupName: editSetupName.trim() || editingTrade.setupName,
      timeFrame: editTimeFrame.trim() || undefined,
      session: editSession || undefined,
      entryTime: editEntryTime || undefined,
      limit: editLimit || undefined,
      exit: editExit || undefined,
      exitPrice: Number.isFinite(nextExitPrice) ? nextExitPrice : editingTrade.exitPrice,
      pnl: nextPnl,
      pnlBase: convertToBaseCurrency(nextPnl, editingTrade.currency, exchangeRate),
      exchangeRate,
      tradeResult: getTradeResultLabel(nextPnl),
      isWin: nextPnl > 0,
      rFactor: Number.isFinite(nextRFactor) ? nextRFactor : editingTrade.rFactor,
      exitRFactor: Number.isFinite(nextRFactor) ? nextRFactor : editingTrade.exitRFactor,
      preNotes: editPreNotes,
      postNotes: editPostNotes,
      duringTradeNotes: editDuringTradeNotes.trim() || undefined,
      emotionEntry: editEmotionEntry || undefined,
      emotionExit: editEmotionExit || undefined,
      ruleFollowed: editRuleFollowed === null ? editingTrade.ruleFollowed : editRuleFollowed,
      ruleViolations: editRuleFollowed === true ? [] : editingTrade.ruleViolations,
      beforeTradeScreenshot: editBeforeScreenshot || undefined,
      afterExitScreenshot: editAfterScreenshot || undefined,
      hftScreenshot: editHftScreenshot || undefined,
    };

    const clearScreenshots = [
      editingTrade.beforeTradeScreenshot && !editBeforeScreenshot ? 'beforeTradeScreenshot' : null,
      editingTrade.afterExitScreenshot && !editAfterScreenshot ? 'afterExitScreenshot' : null,
      editingTrade.hftScreenshot && !editHftScreenshot ? 'hftScreenshot' : null,
    ].filter((field): field is string => field !== null);
    updateTrade(editingTrade.id, updatedTrade, { clearScreenshots });
    setSelectedTrade((current) => (current?.id === updatedTrade.id ? updatedTrade : current));
    closeEditTrade();
    toast({
      title: 'Trade Updated',
      description: 'Your trade details, mindset review, notes, and screenshots were saved.',
    });
  };

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6 min-w-0">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Trade Log</h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">View and manage all your trades</p>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select
            value={filterSetup}
            onChange={e => {
              setCurrentPage(1);
              setFilterSetup(e.target.value);
            }}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {setupNames.map(setup => (
              <option key={setup} value={setup}>
                {setup}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground flex-shrink-0">Tag:</span>
          <select
            value={filterTag}
            onChange={e => {
              setCurrentPage(1);
              setFilterTag(e.target.value);
            }}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {tagNames.map(tag => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground flex-shrink-0">Date:</span>
          <select
            value={filterDate}
            onChange={e => {
              setCurrentPage(1);
              setFilterDate(e.target.value as 'All' | 'Today' | 'Last 7 Days');
            }}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="All">All</option>
            <option value="Today">Today</option>
            <option value="Last 7 Days">Last 7 Days</option>
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground flex-shrink-0">Sort:</span>
          <select
            value={sortBy}
            onChange={e => {
              setCurrentPage(1);
              setSortBy(e.target.value as 'date' | 'pnl');
            }}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="date">Date (Newest)</option>
            <option value="pnl">P&L (Highest)</option>
          </select>
        </div>

        <span className="text-sm text-muted-foreground">{filteredAndSortedTrades.length} trades</span>
      </div>

      {/* Table/Cards */}
      {filteredAndSortedTrades.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 sm:p-12 text-center">
            <Empty className="border-0 p-0">
              <EmptyStateIllustration />
              <EmptyHeader>
                <EmptyTitle>No trades found</EmptyTitle>
                <EmptyDescription>
                  Add your first trade, sync Dhan history, or change the current filter to start reviewing entries.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Structured review starts here</p>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block w-full min-w-0">
            <Card className="bg-card border-border overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-3 py-2 sm:px-4">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">Scroll columns</span>
                <div
                  ref={tableScrollRailRef}
                  onScroll={(event) => syncTableScroll(event.currentTarget, tableViewportRef.current)}
                  className="h-4 min-w-0 flex-1 overflow-x-scroll"
                  aria-label="Horizontal table scrollbar"
                  role="region"
                  tabIndex={0}
                >
                  <div style={{ width: `${tableContentWidth}px`, height: '1px' }} />
                </div>
                <span className="hidden shrink-0 text-xs text-muted-foreground xl:inline">Drag the bar to view every column</span>
              </div>
              <div
                ref={tableViewportRef}
                onScroll={(event) => syncTableScroll(event.currentTarget, tableScrollRailRef.current)}
                className="w-full overflow-x-auto"
              >
              <table ref={tableElementRef} className="w-full min-w-[1280px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary">
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Date</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Day</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Symbol</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Setup</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Tags</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Forex Session</th>
                    <th className="text-left px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Pos</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Entry</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Exit</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Net P&L</th>
                    <th className="text-right px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">R</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">W/L</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Conf</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Fav</th>
                    <th className="text-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">Act</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTrades.map(trade => (
                    <tr key={trade.id} className="border-b border-border hover:bg-secondary transition-colors">
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground">{trade.date}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">{trade.dayOfWeek.slice(0, 3)}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{trade.symbol}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground max-w-[260px]" title={trade.setupName}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate">{trade.setupName}</span>
                          {isBrokerSyncedTrade(trade) && (
                            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                              Dhan Synced
                            </span>
                          )}
                          {isJournalEnrichedTrade(trade) && (
                            <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                              Journal Enriched
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground max-w-[220px]">
                        {trade.tags && trade.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {trade.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-foreground">
                                {tag}
                              </span>
                            ))}
                            {trade.tags.length > 3 ? (
                              <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                                +{trade.tags.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        <span title={getTradeSessionLabel(trade)}>{getTradeSessionLabel(trade)}</span>
                        {trade.entryTime && <span className="ml-1 text-[10px]">({trade.entryTime} UTC)</span>}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${trade.position === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.position === 'Buy' ? 'B' : 'S'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right text-foreground">{trade.entryPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.entryPrice.toFixed(2)}` : 'N/A'}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right text-foreground">{trade.exitPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.exitPrice.toFixed(2)}` : 'N/A'}</td>
                      <td className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {CURRENCY_SYMBOLS[trade.currency] || '$'}{trade.pnl.toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right text-foreground">{trade.rFactor.toFixed(2)}R</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center">
                        <span className={`text-xs font-semibold ${getResultDisplay(trade).className}`}>
                          {getResultDisplay(trade).label}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm text-foreground">{trade.confidence}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center">
                        <button
                          type="button"
                          onClick={() => updateTrade(trade.id, { ...trade, isFavorite: !trade.isFavorite })}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            trade.isFavorite
                              ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                          aria-label={trade.isFavorite ? 'Remove trade from favorites' : 'Add trade to favorites'}
                          title={trade.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`h-4 w-4 ${trade.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button onClick={() => void openTradeDetails(trade)} className="text-primary hover:text-primary/80 transition-colors p-1" title="View">
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={() => openEditTrade(trade)} className="text-blue-400 hover:text-blue-300 transition-colors p-1" title="Edit">
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={() => openTradeShare(trade)} className="text-violet-400 hover:text-violet-300 transition-colors p-1" title="Share trade" aria-label={`Share ${trade.symbol} trade`}>
                            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={() => deleteTrade(trade.id)} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden space-y-2 sm:space-y-3">
            {pageTrades.map(trade => (
              <Card key={trade.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground text-lg">{trade.symbol}</p>
                        {trade.isFavorite && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                            <Star className="mr-1 h-3 w-3 fill-current" />
                            Favorite
                          </span>
                        )}
                        {isBrokerSyncedTrade(trade) && (
                          <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                            Dhan Synced
                          </span>
                        )}
                        {isJournalEnrichedTrade(trade) && (
                          <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-400">
                            Journal Enriched
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{trade.date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${trade.position === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.position}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Entry</p>
                      <p className="font-semibold text-foreground truncate">{trade.entryPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.entryPrice.toFixed(2)}` : 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Exit</p>
                      <p className="font-semibold text-foreground truncate">{trade.exitPrice ? `${CURRENCY_SYMBOLS[trade.currency] || '$'}${trade.exitPrice.toFixed(2)}` : 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Setup</p>
                      <p className="font-semibold text-foreground text-xs truncate" title={trade.setupName}>{trade.setupName}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="font-semibold text-foreground">{trade.confidence}/10</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Forex Session</p>
                      <p className="font-semibold text-foreground text-xs">{getTradeSessionLabel(trade)}</p>
                      {trade.entryTime && <p className="text-xs text-muted-foreground">{trade.entryTime} UTC</p>}
                    </div>
                  </div>

                  {trade.tags && trade.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {trade.tags.map((tag) => (
                        <span key={tag} className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Net P&L ({trade.currency || 'USD'})</p>
                      <p className={`font-bold text-sm truncate ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {CURRENCY_SYMBOLS[trade.currency] || '$'}{trade.pnl.toFixed(2)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">R-Factor</p>
                      <p className="font-bold text-sm text-primary">{trade.rFactor.toFixed(2)}R</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Result</p>
                      <p className={`font-bold text-sm ${getResultDisplay(trade).className}`}>
                        {getResultDisplay(trade).label}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => updateTrade(trade.id, { ...trade, isFavorite: !trade.isFavorite })}
                      className={`flex-1 flex items-center justify-center gap-1 transition-colors py-2 ${
                        trade.isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      type="button"
                    >
                      <Star className={`w-4 h-4 ${trade.isFavorite ? 'fill-current' : ''}`} />
                      <span className="text-xs font-medium">{trade.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                    </button>
                    <button onClick={() => void openTradeDetails(trade)} className="flex-1 flex items-center justify-center gap-1 text-primary hover:text-primary/80 transition-colors py-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-medium">Details</span>
                    </button>
                    <button onClick={() => openEditTrade(trade)} className="flex-1 flex items-center justify-center gap-1 text-blue-400 hover:text-blue-300 transition-colors py-2">
                      <Pencil className="w-4 h-4" />
                      <span className="text-xs font-medium">Edit</span>
                    </button>
                    <button onClick={() => openTradeShare(trade)} className="flex-1 flex items-center justify-center gap-1 text-violet-400 hover:text-violet-300 transition-colors py-2">
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Share</span>
                    </button>
                    <button onClick={() => deleteTrade(trade.id)} className="flex-1 flex items-center justify-center gap-1 text-red-400 hover:text-red-300 transition-colors py-2">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Delete</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(visiblePage - 1) * pageSize + 1}–{Math.min(visiblePage * pageSize, filteredAndSortedTrades.length)} of {filteredAndSortedTrades.length}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={visiblePage === 1} onClick={() => setCurrentPage(visiblePage - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">{visiblePage} / {totalPages}</span>
                <Button type="button" variant="outline" size="sm" disabled={visiblePage === totalPages} onClick={() => setCurrentPage(visiblePage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Detail Modal - Accessible overlay with proper focus management */}
      {selectedTrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/70 p-1 sm:p-3"
          onClick={() => setSelectedTrade(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-detail-title"
        >
          <Card
            className="my-auto flex h-[96dvh] max-h-[1100px] w-full max-w-screen-2xl flex-col overflow-hidden border-border bg-card"
            onClick={e => e.stopPropagation()}
          >
            <CardHeader className="sticky top-0 z-10 flex-shrink-0 border-b border-border bg-card p-3 sm:p-4 lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle id="trade-detail-title" className="break-words text-lg sm:text-xl lg:text-2xl">
                      {selectedTrade.symbol} - {selectedTrade.tradeType}
                    </CardTitle>
                    {isBrokerSyncedTrade(selectedTrade) && (
                      <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                        Dhan Synced
                      </span>
                    )}
                    {isJournalEnrichedTrade(selectedTrade) && (
                      <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-400">
                        Journal Enriched
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-1 text-xs sm:text-sm">
                    {selectedTrade.date} · {selectedTrade.dayOfWeek} · {getTradeSessionLabel(selectedTrade)}
                    {selectedTrade.entryTime ? ` · ${selectedTrade.entryTime} UTC` : ''}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleDownloadTradeReport(selectedTrade)}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <button
                    onClick={() => setSelectedTrade(null)}
                    className="flex-shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Close trade details"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto p-3 sm:space-y-6 sm:p-5 lg:p-7">
              {/* Trade Details Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className={`text-lg font-bold ${selectedTrade.position === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>{selectedTrade.position}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Setup Name</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.setupName}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Time Frame</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.timeFrame || 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Limit (Fibonacci)</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.limit || 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Exit (Fibonacci)</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.exit || 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.currency || 'USD'} ({CURRENCY_SYMBOLS[selectedTrade.currency] || '$'})</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Entry Price</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.entryPrice ? `${CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}${selectedTrade.entryPrice.toFixed(2)}` : 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Exit Price</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.exitPrice ? `${CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}${selectedTrade.exitPrice.toFixed(2)}` : 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Stop Loss</p>
                  <p className="text-lg font-bold text-foreground">{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.stopLoss.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.quantity}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Fees</p>
                  <p className="text-lg font-bold text-foreground">{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.fees.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="text-lg font-bold text-foreground">{selectedTrade.confidence}/10</p>
                </div>
                {selectedTrade.marketCondition && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground">Market Condition</p>
                    <p className="text-lg font-bold text-foreground">{selectedTrade.marketCondition}</p>
                  </div>
                )}
                {selectedTrade.marketTrend && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground">Market Trend</p>
                    <p className="text-lg font-bold text-foreground">{selectedTrade.marketTrend}</p>
                  </div>
                )}
                {selectedTrade.emotion && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground">Emotion</p>
                    <p className="text-lg font-bold text-foreground">{selectedTrade.emotion}</p>
                  </div>
                )}
                {selectedTrade.riskRewardRatio !== undefined && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground">Risk / Reward</p>
                    <p className="text-lg font-bold text-foreground">{selectedTrade.riskRewardRatio.toFixed(2)}R</p>
                  </div>
                )}
              </div>

              {/* Results - shows currency and auto-derived outcome */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-secondary p-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Net P&L ({selectedTrade.currency || 'USD'})</p>
                  <p className={`text-2xl font-bold ${selectedTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.pnl.toFixed(2)}
                  </p>
                  {selectedTrade.fees > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Gross: <span className={(selectedTrade.pnl + selectedTrade.fees) >= 0 ? 'text-green-400' : 'text-red-400'}>{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{(selectedTrade.pnl + selectedTrade.fees).toFixed(2)}</span>
                      {' '} | Charges: <span className="text-orange-400">-{CURRENCY_SYMBOLS[selectedTrade.currency] || '$'}{selectedTrade.fees.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">R-Factor</p>
                  <p className="text-2xl font-bold text-primary">{selectedTrade.rFactor.toFixed(2)}R</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outcome</p>
                  <p className={`text-2xl font-bold ${getResultDisplay(selectedTrade).className}`}>
                    {getResultDisplay(selectedTrade).label}
                  </p>
                </div>
                {selectedTrade.exitRFactor !== undefined && (
                  <div className="col-span-full">
                    <p className="text-xs text-muted-foreground">Exit R Multiple</p>
                    <p className={`text-2xl font-bold ${selectedTrade.exitRFactor > 0 ? 'text-green-400' : selectedTrade.exitRFactor < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {selectedTrade.exitRFactor > 0 ? '+' : ''}{selectedTrade.exitRFactor.toFixed(2)}R
                    </p>
                  </div>
                )}
              </div>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Mindset &amp; Execution</h3>
                  <p className="text-xs text-muted-foreground">Review the emotional journey from entry through exit.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">At entry</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{selectedTrade.emotionEntry || 'Emotion not recorded'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Confidence: {Number.isFinite(selectedTrade.confidence) ? `${selectedTrade.confidence}/10` : 'Not recorded'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">During the trade</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {selectedTrade.duringTradeNotes?.trim() || 'No in-trade context recorded'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Plan: {typeof selectedTrade.ruleFollowed === 'boolean'
                        ? selectedTrade.ruleFollowed ? 'Followed' : 'Not followed'
                        : 'Not recorded'}
                    </p>
                    {!!selectedTrade.ruleViolations?.length && (
                      <p className="mt-1 text-xs text-muted-foreground">Rule violations: {selectedTrade.ruleViolations.join(', ')}</p>
                    )}
                    {selectedTrade.mistakeTag && (
                      <p className="mt-1 text-xs text-muted-foreground">Mistake: {selectedTrade.mistakeTag}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">At exit</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{selectedTrade.emotionExit || 'Emotion not recorded'}</p>
                  </div>
                </div>
              </section>

              {/* Notes */}
              {selectedTrade.tags && selectedTrade.tags.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Trade Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrade.tags.map((tag) => (
                      <span key={tag} className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTrade.preNotes && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Pre-Trade Notes</p>
                  <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg">{selectedTrade.preNotes}</p>
                </div>
              )}

              {selectedTrade.postNotes && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Post-Trade Notes</p>
                  <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg">{selectedTrade.postNotes}</p>
                </div>
              )}

              {/* Screenshots */}
              {(selectedTrade.beforeTradeScreenshot || selectedTrade.afterExitScreenshot || selectedTrade.hftScreenshot) && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Trade Screenshots</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {selectedTrade.beforeTradeScreenshot && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Before Trade</p>
                        <ScreenshotViewer imageUrl={selectedTrade.beforeTradeScreenshot} title="Before Trade Screenshot" />
                      </div>
                    )}
                    {selectedTrade.afterExitScreenshot && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">After Exit</p>
                        <ScreenshotViewer imageUrl={selectedTrade.afterExitScreenshot} title="After Exit Screenshot" />
                      </div>
                    )}
                    {selectedTrade.hftScreenshot && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">HFT</p>
                        <ScreenshotViewer imageUrl={selectedTrade.hftScreenshot} title="HFT Screenshot" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button onClick={() => openTradeShare(selectedTrade)} variant="outline" className="w-full">
                <Share2 className="mr-2 h-4 w-4" />
                Share Trade
              </Button>
              <Button onClick={() => createPlaybookFromTrade(selectedTrade)} variant="outline" className="w-full">
                <Pencil className="mr-2 h-4 w-4" />
                Create Playbook from Trade
              </Button>
              <Button onClick={() => openEditTrade(selectedTrade)} variant="outline" className="w-full">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Trade
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {editingTrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/60 p-2 sm:p-4"
          onClick={closeEditTrade}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-trade-title"
        >
          <Card
            className="my-auto flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="sticky top-0 flex-shrink-0 border-b border-border bg-card p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle id="edit-trade-title" className="text-xl">Edit Trade</CardTitle>
                  <CardDescription className="mt-1">
                    Update journal details and review for {editingTrade.symbol} on {editingTrade.date}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={closeEditTrade}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Close edit trade modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trade</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{editingTrade.symbol}</p>
                  <p className="text-sm text-muted-foreground">{editingTrade.setupName}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Imported / Manual</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {isBrokerSyncedTrade(editingTrade) ? 'Dhan Synced Trade' : 'Manual Trade'}
                  </p>
                  <p className="text-sm text-muted-foreground">Editing here does not change broker sync credentials.</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Journal Status</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {isJournalEnrichedTrade(editingTrade) ? 'Journal Enriched' : 'Base Import'}
                  </p>
                  <p className="text-sm text-muted-foreground">Notes, setup labels, psychology review, and screenshots count as enrichment.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Setup Name</label>
                  <div className="space-y-2">
                    <select
                      value={
                        editIsCustomSetup
                          ? '__custom__'
                          : PRESET_SETUPS.includes(editSetupName as (typeof PRESET_SETUPS)[number])
                            ? editSetupName
                            : ''
                      }
                      onChange={handleEditSetupPresetChange}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a setup</option>
                      {PRESET_SETUPS.map((setup) => (
                        <option key={setup} value={setup}>
                          {setup}
                        </option>
                      ))}
                      <option value="__custom__">Custom setup...</option>
                    </select>
                    {editIsCustomSetup && (
                      <input
                        type="text"
                        value={editSetupName}
                        onChange={(e) => setEditSetupName(e.target.value)}
                        placeholder="Type your custom setup name"
                        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Time Frame</label>
                  <input
                    type="text"
                    value={editTimeFrame}
                    onChange={(e) => setEditTimeFrame(e.target.value)}
                    placeholder="e.g. 5m, 15m, 1h"
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Forex Market Session</label>
                  <select
                    value={editSession}
                    onChange={(e) => setEditSession(e.target.value as MarketSession | '')}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Infer from entry time</option>
                    {SESSION_OPTIONS.map((session) => (
                      <option key={session.value} value={session.value}>{session.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Entry Time (UTC)</label>
                  <input
                    type="time"
                    value={editEntryTime}
                    onChange={(e) => setEditEntryTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Session hours are approximate UTC and shift with daylight saving.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Trade Tags</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="e.g. A+, breakout, revenge, news"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Limit (Fibonacci Level)</label>
                  <select
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Fibonacci Level</option>
                    {FIB_LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Exit (Fibonacci Level)</label>
                  <select
                    value={editExit}
                    onChange={(e) => setEditExit(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Fibonacci Exit Level</option>
                    {FIB_LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-foreground">Close Trade Result</label>
                  <p className="text-xs text-muted-foreground">
                    Keep it pending until the trade finishes, then choose the outcome and enter the final amount.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {EDIT_RESULT_OPTIONS.map((result) => {
                    const isSelected = editResultDirection === result;
                    const selectedClass =
                      result === 'Win'
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                        : result === 'Loss'
                        ? 'border-red-500/60 bg-red-500/10 text-red-300'
                        : result === 'Break-Even'
                        ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300'
                        : 'border-amber-500/60 bg-amber-500/10 text-amber-300';

                    return (
                      <button
                        key={result}
                        type="button"
                        onClick={() => {
                          setEditResultDirection(result);
                          if (result === 'Pending' || result === 'Break-Even') {
                            setEditProfitAmount('');
                          }
                        }}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          isSelected
                            ? selectedClass
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {result}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Actual Exit Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {CURRENCY_SYMBOLS[editingTrade.currency] || '$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={editExitPrice}
                        onChange={(e) => setEditExitPrice(e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-lg border border-border bg-input py-2 pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Amount {editResultDirection === 'Win' || editResultDirection === 'Loss' ? '*' : '(Not needed)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {CURRENCY_SYMBOLS[editingTrade.currency] || '$'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editProfitAmount}
                        onChange={(e) => setEditProfitAmount(e.target.value)}
                        disabled={editResultDirection === 'Pending' || editResultDirection === 'Break-Even'}
                        placeholder={editResultDirection === 'Loss' ? 'Loss amount' : 'Profit amount'}
                        className="w-full rounded-lg border border-border bg-input py-2 pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter Win/Loss amount as positive. Loss is saved as negative P&amp;L automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Pre-Trade Notes</label>
                <textarea
                  value={editPreNotes}
                  onChange={(e) => setEditPreNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add notes about the setup, context, and plan..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Post-Trade Notes</label>
                <textarea
                  value={editPostNotes}
                  onChange={(e) => setEditPostNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add review notes, mistakes, or lessons learned..."
                />
              </div>

              <section className="space-y-4 rounded-xl border border-border p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Mindset &amp; Execution</h3>
                  <p className="text-xs text-muted-foreground">Capture how you felt and what changed while the trade was open.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Entry Emotion</label>
                    <select
                      value={editEmotionEntry}
                      onChange={(event) => setEditEmotionEntry(event.target.value as EmotionTag | '')}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Not recorded</option>
                      {EMOTION_OPTIONS.map((emotion) => <option key={emotion} value={emotion}>{emotion}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Exit Emotion</label>
                    <select
                      value={editEmotionExit}
                      onChange={(event) => setEditEmotionExit(event.target.value as EmotionTag | '')}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Not recorded</option>
                      {EMOTION_OPTIONS.map((emotion) => <option key={emotion} value={emotion}>{emotion}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Followed the plan?</label>
                    <select
                      value={editRuleFollowed === null ? '' : editRuleFollowed ? 'yes' : 'no'}
                      onChange={(event) => setEditRuleFollowed(event.target.value === '' ? null : event.target.value === 'yes')}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Not recorded</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">What happened during the trade?</label>
                  <textarea
                    value={editDuringTradeNotes}
                    onChange={(event) => setEditDuringTradeNotes(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Note a trigger, urge, hesitation, or change to your plan."
                  />
                </div>
              </section>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground">Before Trade Screenshot</label>
                    {editBeforeScreenshot && (
                      <button
                        type="button"
                        onClick={() => setEditBeforeScreenshot(null)}
                        className="text-xs text-red-400 transition-colors hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    <Upload className="h-4 w-4" />
                    Upload before-trade image
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditScreenshot('before')} />
                  </label>
                  {editBeforeScreenshot && (
                    <ScreenshotViewer imageUrl={editBeforeScreenshot} title="Before Trade Screenshot">
                      <button type="button" className="w-full overflow-hidden rounded-lg border border-border">
                        <Image
                          src={editBeforeScreenshot}
                          alt="Before trade"
                          width={1200}
                          height={800}
                          unoptimized
                          className="max-h-56 w-full object-cover"
                        />
                      </button>
                    </ScreenshotViewer>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground">After Exit Screenshot</label>
                    {editAfterScreenshot && (
                      <button
                        type="button"
                        onClick={() => setEditAfterScreenshot(null)}
                        className="text-xs text-red-400 transition-colors hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    <Upload className="h-4 w-4" />
                    Upload after-exit image
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditScreenshot('after')} />
                  </label>
                  {editAfterScreenshot && (
                    <ScreenshotViewer imageUrl={editAfterScreenshot} title="After Exit Screenshot">
                      <button type="button" className="w-full overflow-hidden rounded-lg border border-border">
                        <Image
                          src={editAfterScreenshot}
                          alt="After exit"
                          width={1200}
                          height={800}
                          unoptimized
                          className="max-h-56 w-full object-cover"
                        />
                      </button>
                    </ScreenshotViewer>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground">HFT Screenshot</label>
                    {editHftScreenshot && (
                      <button
                        type="button"
                        onClick={() => setEditHftScreenshot(null)}
                        className="text-xs text-red-400 transition-colors hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    <Upload className="h-4 w-4" />
                    Upload HFT image
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditScreenshot('hft')} />
                  </label>
                  {editHftScreenshot && (
                    <ScreenshotViewer imageUrl={editHftScreenshot} title="HFT Screenshot">
                      <button type="button" className="w-full overflow-hidden rounded-lg border border-border">
                        <Image
                          src={editHftScreenshot}
                          alt="HFT"
                          width={1200}
                          height={800}
                          unoptimized
                          className="max-h-56 w-full object-cover"
                        />
                      </button>
                    </ScreenshotViewer>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeEditTrade}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveTradeEdits}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ShareCardDialog
        open={isShareDialogOpen}
        onOpenChange={handleShareDialogChange}
        mode="trade"
        trades={trades}
        trade={sharingTrade}
      />
    </div>
  );
}
