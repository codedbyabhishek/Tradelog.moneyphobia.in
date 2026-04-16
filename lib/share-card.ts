import { format } from 'date-fns';
import { CapitalAdjustment, Currency, Trade } from '@/lib/types';
import { formatCurrency, getNetCapitalAdjustments, getTradeBasePnL, getTradeOutcome } from '@/lib/trade-utils';

export type ShareVisualTheme = 'light' | 'dark' | 'prism' | 'cyberpunk';
export type ShareRangePreset = 'today' | 'last7' | 'custom';
export type ShareGraphType = 'equity' | 'pnl';

export interface PerformanceShareSnapshot {
  label: string;
  trades: Trade[];
  totalPnl: number;
  totalPnlPercent: number | null;
  winRate: number;
  tradeCount: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  balanceStart: number;
  balanceEnd: number;
  equityCurve: Array<{ label: string; equity: number; pnl: number }>;
}

export function getShareDateRange(
  preset: ShareRangePreset,
  customFrom?: string,
  customTo?: string,
) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (preset === 'today') {
    const iso = toIsoDate(end);
    return { from: iso, to: iso, label: 'Today' };
  }

  if (preset === 'last7') {
    const from = new Date(end);
    from.setDate(from.getDate() - 6);
    return {
      from: toIsoDate(from),
      to: toIsoDate(end),
      label: 'Last 7 Days',
    };
  }

  const safeFrom = customFrom || toIsoDate(end);
  const safeTo = customTo || safeFrom;
  const normalizedFrom = safeFrom <= safeTo ? safeFrom : safeTo;
  const normalizedTo = safeTo >= safeFrom ? safeTo : safeFrom;

  return {
    from: normalizedFrom,
    to: normalizedTo,
    label: `${formatDisplayDate(normalizedFrom)} - ${formatDisplayDate(normalizedTo)}`,
  };
}

export function filterTradesByRange(trades: Trade[], from: string, to: string) {
  return trades.filter((trade) => trade.date >= from && trade.date <= to);
}

export function buildPerformanceShareSnapshot(params: {
  trades: Trade[];
  startingBalance: number;
  capitalAdjustments: CapitalAdjustment[];
  label: string;
}) : PerformanceShareSnapshot {
  const sortedTrades = [...params.trades].sort((a, b) => a.date.localeCompare(b.date));
  const totalPnl = sortedTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
  const investedCapital = params.startingBalance + getNetCapitalAdjustments(params.capitalAdjustments);
  const tradeCount = sortedTrades.length;
  const wins = sortedTrades.filter((trade) => getTradeBasePnL(trade) > 0).length;
  const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;
  const bestTrade = sortedTrades.reduce<Trade | null>((best, trade) => {
    if (!best) return trade;
    return getTradeBasePnL(trade) > getTradeBasePnL(best) ? trade : best;
  }, null);
  const worstTrade = sortedTrades.reduce<Trade | null>((worst, trade) => {
    if (!worst) return trade;
    return getTradeBasePnL(trade) < getTradeBasePnL(worst) ? trade : worst;
  }, null);

  let runningEquity = 0;
  const equityCurve = sortedTrades.map((trade) => {
    const pnl = getTradeBasePnL(trade);
    runningEquity += pnl;
    return {
      label: formatDisplayShortDate(trade.date),
      equity: Number(runningEquity.toFixed(2)),
      pnl: Number(pnl.toFixed(2)),
    };
  });

  return {
    label: params.label,
    trades: sortedTrades,
    totalPnl,
    totalPnlPercent: investedCapital > 0 ? (totalPnl / investedCapital) * 100 : null,
    winRate,
    tradeCount,
    bestTrade,
    worstTrade,
    balanceStart: investedCapital,
    balanceEnd: investedCapital + totalPnl,
    equityCurve,
  };
}

export function buildPerformanceShareText(snapshot: PerformanceShareSnapshot, baseCurrency: Currency) {
  const lines = [
    `Traderlogify Performance Snapshot`,
    snapshot.label,
    `Net P&L: ${formatCurrency(snapshot.totalPnl, baseCurrency)}`,
    `Win Rate: ${snapshot.winRate.toFixed(1)}%`,
    `Trades: ${snapshot.tradeCount}`,
  ];

  if (snapshot.totalPnlPercent !== null) {
    lines.push(`P&L %: ${snapshot.totalPnlPercent >= 0 ? '+' : ''}${snapshot.totalPnlPercent.toFixed(2)}%`);
  }

  if (snapshot.bestTrade) {
    lines.push(`Best Trade: ${snapshot.bestTrade.symbol} ${formatCurrency(getTradeBasePnL(snapshot.bestTrade), baseCurrency)}`);
  }

  if (snapshot.worstTrade) {
    lines.push(`Worst Trade: ${snapshot.worstTrade.symbol} ${formatCurrency(getTradeBasePnL(snapshot.worstTrade), baseCurrency)}`);
  }

  return lines.join('\n');
}

export function buildSingleTradeShareText(trade: Trade) {
  const outcome = getTradeOutcome(trade.pnl);
  const outcomeLabel = outcome === 'W' ? 'Win' : outcome === 'L' ? 'Loss' : 'Break-Even';

  return [
    `Traderlogify Trade Snapshot`,
    `${trade.symbol} • ${trade.setupName}`,
    `${trade.date} • ${trade.tradeType}`,
    `Outcome: ${outcomeLabel}`,
    `Net P&L: ${formatCurrency(trade.pnl, trade.currency)}`,
    `R Multiple: ${trade.rFactor.toFixed(2)}R`,
  ].join('\n');
}

export function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export function formatDisplayDate(date: string) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDisplayShortDate(date: string) {
  return format(new Date(date), 'MMM d');
}
