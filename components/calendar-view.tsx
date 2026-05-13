'use client';

import React, { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trade } from '@/lib/types';
import { useSettings } from '@/lib/settings-context';
import { getTradeBasePnL, getTradeCharges, convertToBaseCurrency, CURRENCY_SYMBOLS, convertBaseAmountToDisplayCurrency } from '@/lib/trade-utils';
import { ScreenshotViewer } from '@/components/screenshot-viewer';

/** Format a local Date as YYYY-MM-DD without any UTC conversion */
function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse a YYYY-MM-DD string into local year/month/day numbers */
function parseLocalDate(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

interface DayStats {
  date: string;
  dayOfMonth: number;
  pnl: number;
  grossPnl: number;
  charges: number;
  tradeCount: number;
  isToday: boolean;
}

interface CalendarViewProps {
  trades: Trade[];
}

function detailValue(value: React.ReactNode): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return 'N/A';
  }

  return value;
}

function DetailTile({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className={`mt-1 text-sm font-semibold text-foreground ${className}`}>{detailValue(value)}</div>
    </div>
  );
}

function formatDisplayDate(dateStr: string): string {
  const { year, month, day } = parseLocalDate(dateStr);
  return new Date(year, month, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaySurfaceClasses(isToday: boolean, isCurrentMonthDay: boolean, tradeCount: number, pnl: number): string {
  if (isToday) {
    return 'bg-primary/12 ring-1 ring-primary/50 border border-primary/30 shadow-sm';
  }

  if (!isCurrentMonthDay) {
    return 'bg-muted/30 border border-border/50 opacity-80';
  }

  if (tradeCount === 0) {
    return 'bg-card border border-border/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-muted/20';
  }

  return pnl >= 0
    ? 'bg-emerald-50 border border-emerald-200 shadow-[0_1px_2px_rgba(5,150,105,0.08)] hover:bg-emerald-100/70 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:shadow-none dark:hover:bg-emerald-500/15'
    : 'bg-red-50 border border-red-200 shadow-[0_1px_2px_rgba(220,38,38,0.08)] hover:bg-red-100/70 dark:bg-red-500/10 dark:border-red-500/30 dark:shadow-none dark:hover:bg-red-500/15';
}

function getTradeBoxClasses(pnl: number): string {
  return pnl >= 0
    ? 'bg-emerald-100/80 border-emerald-300/90 dark:bg-emerald-500/10 dark:border-emerald-500/30'
    : 'bg-red-100/80 border-red-300/90 dark:bg-red-500/10 dark:border-red-500/30';
}

function getPnlTextClasses(value: number, emphasis: 'strong' | 'soft' = 'strong'): string {
  if (value >= 0) {
    return emphasis === 'strong'
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-emerald-600 dark:text-emerald-300';
  }

  return emphasis === 'strong'
    ? 'text-red-700 dark:text-red-400'
    : 'text-red-600 dark:text-red-300';
}

function getTradeBoxLineClasses(value: number, emphasis: 'primary' | 'secondary' | 'meta' = 'primary'): string {
  if (value >= 0) {
    if (emphasis === 'primary') {
      return 'text-emerald-800 dark:text-emerald-300';
    }

    if (emphasis === 'secondary') {
      return 'text-emerald-700 dark:text-emerald-200';
    }

    return 'text-emerald-900/80 dark:text-emerald-100/85';
  }

  if (emphasis === 'primary') {
    return 'text-red-800 dark:text-red-300';
  }

  if (emphasis === 'secondary') {
    return 'text-red-700 dark:text-red-200';
  }

  return 'text-red-900/80 dark:text-red-100/85';
}

function getDaysInMonth(date: Date, trades: Trade[], todayStr: string): DayStats[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const startDow = (firstDay.getDay() + 6) % 7;
  const days: DayStats[] = [];

  const getDayCharges = (dayTrades: Trade[]) =>
    dayTrades.reduce((sum, t) => {
      const ch = getTradeCharges(t);
      return sum + (t.currency ? convertToBaseCurrency(ch, t.currency, t.exchangeRate) : ch);
    }, 0);

  const tradesByDate = new Map<string, Trade[]>();
  trades.forEach((trade) => {
    const existing = tradesByDate.get(trade.date) || [];
    existing.push(trade);
    tradesByDate.set(trade.date, existing);
  });

  const createDayStats = (targetDate: Date, isToday: boolean) => {
    const dateStr = toLocalDateStr(targetDate);
    const dayTrades = tradesByDate.get(dateStr) || [];
    const pnl = dayTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const charges = getDayCharges(dayTrades);

    return {
      date: dateStr,
      dayOfMonth: targetDate.getDate(),
      pnl,
      grossPnl: pnl + charges,
      charges,
      tradeCount: dayTrades.length,
      isToday,
    };
  };

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push(createDayStats(d, false));
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = toLocalDateStr(d);
    days.push(createDayStats(d, dateStr === todayStr));
  }

  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    days.push(createDayStats(d, false));
  }

  return days;
}

export default function CalendarView({ trades }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTradeForDetails, setSelectedTradeForDetails] = useState<Trade | null>(null);
  const { baseCurrency } = useSettings();
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];

  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const daysInMonth = useMemo(() => getDaysInMonth(currentDate, trades, todayStr), [currentDate, todayStr, trades]);

  const weeks = useMemo(() => {
    const chunked: DayStats[][] = [];
    for (let i = 0; i < daysInMonth.length; i += 7) {
      chunked.push(daysInMonth.slice(i, i + 7));
    }
    return chunked;
  }, [daysInMonth]);

  // Calculate monthly stats - using base currency
  const monthlyStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = toLocalDateStr(new Date(year, month, 1));
    const monthEnd = toLocalDateStr(new Date(year, month + 1, 0));

    const monthTrades = trades.filter(t => t.date >= monthStart && t.date <= monthEnd);
    const monthPnL = monthTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const monthCharges = monthTrades.reduce((sum, t) => {
      const ch = getTradeCharges(t);
      return sum + (t.currency ? convertToBaseCurrency(ch, t.currency, t.exchangeRate) : ch);
    }, 0);
    const monthGrossPnL = monthPnL + monthCharges;
    const tradingDays = new Set(monthTrades.map(t => t.date)).size;

    return { monthPnL, monthGrossPnL, monthCharges, tradingDays, totalTrades: monthTrades.length };
  }, [currentDate, trades]);

  const tradesByDate = useMemo(() => {
    const grouped = new Map<string, Trade[]>();

    trades.forEach((trade) => {
      const existing = grouped.get(trade.date) || [];
      existing.push(trade);
      grouped.set(trade.date, existing);
    });

    grouped.forEach((dayTrades, dateKey) => {
      grouped.set(
        dateKey,
        [...dayTrades].sort((a, b) => {
          const timeA = a.entryTime || '99:99';
          const timeB = b.entryTime || '99:99';
          return timeA.localeCompare(timeB);
        }),
      );
    });

    return grouped;
  }, [trades]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    return tradesByDate.get(selectedDate) || [];
  }, [selectedDate, tradesByDate]);

  const selectedDayNetPnL = useMemo(() => {
    return selectedDayTrades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
  }, [selectedDayTrades]);

  const selectedDayCharges = useMemo(() => {
    return selectedDayTrades.reduce((sum, trade) => {
      const charges = getTradeCharges(trade);
      return sum + (trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges);
    }, 0);
  }, [selectedDayTrades]);

  const isCurrentMonth =
    currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayStr);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="w-full bg-card/90 text-foreground">
      {/* Calendar Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-gradient-to-r from-background/80 via-background/60 to-background/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Title + Month Controls */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight">
                Monthly P&amp;L
              </h2>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
                Calendar view
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleToday}
                variant="outline"
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-background/40 border-border/60"
              >
                Today
              </Button>
              <div className="flex items-center gap-1 rounded-full bg-background/60 px-1 py-1 border border-border/60">
                <Button
                  onClick={handlePrevMonth}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <p className="text-sm sm:text-base font-medium px-1 min-w-max">
                  {monthName}
                </p>
                <Button
                  onClick={handleNextMonth}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Monthly Summary - All values in base currency */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm justify-start sm:justify-end">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-foreground/70 dark:text-muted-foreground">Monthly:</span>
              <span
                className={`text-sm sm:text-base font-semibold ${getPnlTextClasses(monthlyStats.monthPnL)}`}
              >
                {baseCurrencySymbol}
                {convertBaseAmountToDisplayCurrency(monthlyStats.monthPnL, baseCurrency).toFixed(2)}
              </span>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-foreground/70 dark:text-muted-foreground">Gross P&amp;L:</span>
              <span
                className={`text-xs sm:text-sm font-medium ${getPnlTextClasses(monthlyStats.monthGrossPnL, 'soft')}`}
              >
                {baseCurrencySymbol}
                {convertBaseAmountToDisplayCurrency(monthlyStats.monthGrossPnL, baseCurrency).toFixed(2)}
              </span>
            </div>
            {monthlyStats.monthCharges > 0 && (
              <div className="flex flex-col items-end">
                <span className="text-foreground/70 dark:text-muted-foreground">Brokerage:</span>
                <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-orange-400">
                  -{baseCurrencySymbol}
                  {convertBaseAmountToDisplayCurrency(monthlyStats.monthCharges, baseCurrency).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-foreground/70 dark:text-muted-foreground">Trading days:</span>
              <span className="font-semibold">{monthlyStats.tradingDays}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[860px] space-y-3">
            {/* Weekday Headers */}
            <div className="grid grid-cols-[repeat(7,minmax(6.5rem,1fr))_minmax(7rem,1fr)] gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="rounded-xl bg-background/60 px-2 sm:px-3 lg:px-4 py-2 flex items-center"
                >
                  <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-foreground/80">
                    {day}
                  </p>
                </div>
              ))}
              <div className="rounded-xl bg-background/80 px-2 sm:px-3 lg:px-4 py-2 flex items-center justify-end">
                  <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-foreground/80">
                    Weekly
                  </p>
              </div>
            </div>

            {/* Calendar Weeks with Weekly Summary */}
            <div className="grid grid-cols-[repeat(7,minmax(6.5rem,1fr))_minmax(7rem,1fr)] gap-2">
              {weeks.map((week, weekIndex) => {
                const weekPnL = week.reduce((sum, day) => {
                  const parsed = parseLocalDate(day.date);
                  const isCurrentMonthDay =
                    parsed.month === currentDate.getMonth() &&
                    parsed.year === currentDate.getFullYear();
                  return isCurrentMonthDay ? sum + day.pnl : sum;
                }, 0);

                const weekTradingDays = week.reduce((sum, day) => {
                  const parsed = parseLocalDate(day.date);
                  const isCurrentMonthDay =
                    parsed.month === currentDate.getMonth() &&
                    parsed.year === currentDate.getFullYear();
                  return isCurrentMonthDay && day.tradeCount > 0 ? sum + 1 : sum;
                }, 0);

                return (
                  <React.Fragment key={weekIndex}>
                    {week.map((day, index) => {
                      const dayNum = day.dayOfMonth;
                      const parsed = parseLocalDate(day.date);
                      const isCurrentMonthDay =
                        parsed.month === currentDate.getMonth() &&
                        parsed.year === currentDate.getFullYear();
                      const isSelected = selectedDate === day.date;

                      return (
                        <button
                          key={`${day.date}-${index}`}
                          type="button"
                          onClick={() => setSelectedDate(day.date)}
                          className={`min-h-24 w-full rounded-xl p-2 text-left relative transition-colors sm:min-h-28 sm:p-3 lg:min-h-32 lg:p-4 ${
                            getDaySurfaceClasses(day.isToday, isCurrentMonthDay, day.tradeCount, day.pnl)
                          } cursor-pointer ${
                            isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                          }`}
                          aria-pressed={isSelected}
                          aria-label={`View trades for ${formatDisplayDate(day.date)}`}
                        >
                          {/* Day Number */}
                          <div className="relative mb-1.5 sm:mb-2">
                            {day.isToday ? (
                              <div className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5">
                                <span className="text-[11px] sm:text-xs font-semibold text-primary-foreground">
                                  {dayNum}
                                </span>
                              </div>
                            ) : (
                              <p
                                className={`text-[11px] sm:text-xs font-semibold ${
                                  isCurrentMonthDay
                                    ? 'text-foreground'
                                    : 'text-foreground/55 dark:text-muted-foreground'
                                }`}
                              >
                                {dayNum}
                              </p>
                            )}
                          </div>

                          {/* Trade Data - shown in base currency */}
                          {day.tradeCount > 0 && (
                            <div
                              className={`rounded-lg border px-2 py-1.5 text-[11px] sm:px-2.5 sm:py-2 sm:text-xs ${getTradeBoxClasses(day.pnl)}`}
                            >
                              {day.charges > 0 && (
                                <p
                                  className={`mb-0.5 font-medium ${getTradeBoxLineClasses(day.grossPnl, 'secondary')}`}
                                >
                                  G: {day.grossPnl >= 0 ? '+' : ''}
                                  {baseCurrencySymbol}
                                  {convertBaseAmountToDisplayCurrency(day.grossPnl, baseCurrency).toFixed(2)}
                                </p>
                              )}
                              <p
                                className={`font-semibold ${getTradeBoxLineClasses(day.pnl, 'primary')}`}
                              >
                                {day.charges > 0 ? 'N: ' : ''}
                                {day.pnl >= 0 ? '+' : ''}
                                {baseCurrencySymbol}
                                {convertBaseAmountToDisplayCurrency(day.pnl, baseCurrency).toFixed(2)}
                              </p>
                              <p
                                className={`mt-0.5 text-[10px] sm:text-[11px] ${getTradeBoxLineClasses(day.pnl, 'meta')}`}
                              >
                                Trades: {day.tradeCount}
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Weekly summary column */}
                    <div className="min-h-24 sm:min-h-28 lg:min-h-32 p-2 sm:p-3 lg:p-4 rounded-xl bg-card border border-border/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:shadow-none flex flex-col justify-between">
                      <div className="text-[10px] sm:text-xs font-semibold tracking-wide text-foreground/80 uppercase">
                        Week {weekIndex + 1}
                      </div>
                      <div
                        className={`text-sm sm:text-base font-semibold ${getPnlTextClasses(weekPnL)}`}
                      >
                        {baseCurrencySymbol}
                        {convertBaseAmountToDisplayCurrency(weekPnL, baseCurrency).toFixed(2)}
                      </div>
                      <div className="text-[10px] sm:text-xs text-foreground/75">
                        {weekTradingDays} traded day{weekTradingDays === 1 ? '' : 's'}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Day Trades</h3>
              <p className="text-xs text-muted-foreground">
                {selectedDate ? formatDisplayDate(selectedDate) : 'Select a day to inspect trades'}
              </p>
            </div>
          </div>

          {!selectedDate ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-dashed border-border bg-background/60 text-muted-foreground">
                <CalendarDays className="h-10 w-10 opacity-60" />
              </div>
              <p className="mt-6 max-w-[240px] text-xl font-medium leading-snug text-muted-foreground">
                Click on a day with trades to view details
              </p>
            </div>
          ) : selectedDayTrades.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-dashed border-border bg-background/60 text-muted-foreground">
                <CalendarDays className="h-10 w-10 opacity-60" />
              </div>
              <p className="mt-6 text-lg font-medium text-foreground">No trades recorded</p>
              <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                {formatDisplayDate(selectedDate)} doesn&apos;t have any journal entries yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Trades</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{selectedDayTrades.length}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Net</p>
                  <p className={`mt-1 text-lg font-semibold ${getPnlTextClasses(selectedDayNetPnL)}`}>
                    {baseCurrencySymbol}
                    {convertBaseAmountToDisplayCurrency(selectedDayNetPnL, baseCurrency).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Charges</p>
                  <p className="mt-1 text-lg font-semibold text-amber-700 dark:text-orange-400">
                    {baseCurrencySymbol}
                    {convertBaseAmountToDisplayCurrency(selectedDayCharges, baseCurrency).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {selectedDayTrades.map((trade) => {
                  const tradePnL = getTradeBasePnL(trade);
                  const tradeCharges = trade.currency
                    ? convertToBaseCurrency(getTradeCharges(trade), trade.currency, trade.exchangeRate)
                    : getTradeCharges(trade);

                  return (
                    <div
                      key={trade.id}
                      className="rounded-[24px] border border-border/70 bg-background/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{trade.symbol}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {trade.setupName || 'Manual setup'}
                            {trade.entryTime ? ` • ${trade.entryTime}` : ''}
                            {trade.tradeType ? ` • ${trade.tradeType}` : ''}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            tradePnL >= 0
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'bg-red-500/10 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {trade.position}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Net P&amp;L</p>
                          <p className={`mt-1 font-semibold ${getPnlTextClasses(tradePnL)}`}>
                            {tradePnL >= 0 ? '+' : ''}
                            {baseCurrencySymbol}
                            {convertBaseAmountToDisplayCurrency(tradePnL, baseCurrency).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Charges</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {baseCurrencySymbol}
                            {convertBaseAmountToDisplayCurrency(tradeCharges, baseCurrency).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Quantity</p>
                          <p className="mt-1 font-semibold text-foreground">{trade.quantity}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">R-Multiple</p>
                          <p className="mt-1 font-semibold text-foreground">{trade.rFactor.toFixed(2)}R</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTradeForDetails(trade)}
                        className="mt-4 w-full justify-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>

                      {(trade.preNotes || trade.postNotes) && (
                        <div className="mt-4 space-y-2">
                          {trade.preNotes && (
                            <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Pre-notes</p>
                              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{trade.preNotes}</p>
                            </div>
                          )}
                          {trade.postNotes && (
                            <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Post-notes</p>
                              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{trade.postNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      <Dialog
        open={Boolean(selectedTradeForDetails)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTradeForDetails(null);
          }
        }}
      >
        {selectedTradeForDetails && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
                {selectedTradeForDetails.symbol}
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    getTradeBasePnL(selectedTradeForDetails) >= 0
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-500/10 text-red-700 dark:text-red-300'
                  }`}
                >
                  {selectedTradeForDetails.position}
                </span>
              </DialogTitle>
              <DialogDescription>
                {formatDisplayDate(selectedTradeForDetails.date)} • {selectedTradeForDetails.tradeType}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-3">
                <DetailTile
                  label="Net P&L"
                  value={`${getTradeBasePnL(selectedTradeForDetails) >= 0 ? '+' : ''}${baseCurrencySymbol}${convertBaseAmountToDisplayCurrency(
                    getTradeBasePnL(selectedTradeForDetails),
                    baseCurrency,
                  ).toFixed(2)}`}
                  className={getPnlTextClasses(getTradeBasePnL(selectedTradeForDetails))}
                />
                <DetailTile
                  label="Gross P&L"
                  value={`${baseCurrencySymbol}${convertBaseAmountToDisplayCurrency(
                    getTradeBasePnL(selectedTradeForDetails) +
                      (selectedTradeForDetails.currency
                        ? convertToBaseCurrency(
                            getTradeCharges(selectedTradeForDetails),
                            selectedTradeForDetails.currency,
                            selectedTradeForDetails.exchangeRate,
                          )
                        : getTradeCharges(selectedTradeForDetails)),
                    baseCurrency,
                  ).toFixed(2)}`}
                  className={getPnlTextClasses(
                    getTradeBasePnL(selectedTradeForDetails) +
                      (selectedTradeForDetails.currency
                        ? convertToBaseCurrency(
                            getTradeCharges(selectedTradeForDetails),
                            selectedTradeForDetails.currency,
                            selectedTradeForDetails.exchangeRate,
                          )
                        : getTradeCharges(selectedTradeForDetails)),
                  )}
                />
                <DetailTile
                  label="R-Multiple"
                  value={`${selectedTradeForDetails.rFactor.toFixed(2)}R`}
                  className="text-primary"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <DetailTile label="Setup" value={selectedTradeForDetails.setupName} />
                <DetailTile label="Time Frame" value={selectedTradeForDetails.timeFrame} />
                <DetailTile label="Result" value={selectedTradeForDetails.tradeResult} />
                <DetailTile label="Entry Time" value={selectedTradeForDetails.entryTime} />
                <DetailTile label="Exit Time" value={selectedTradeForDetails.exitTime} />
                <DetailTile label="Confidence" value={`${selectedTradeForDetails.confidence}/10`} />
                <DetailTile
                  label="Entry Price"
                  value={
                    selectedTradeForDetails.entryPrice
                      ? `${CURRENCY_SYMBOLS[selectedTradeForDetails.currency] || '$'}${selectedTradeForDetails.entryPrice.toFixed(2)}`
                      : undefined
                  }
                />
                <DetailTile
                  label="Exit Price"
                  value={
                    selectedTradeForDetails.exitPrice
                      ? `${CURRENCY_SYMBOLS[selectedTradeForDetails.currency] || '$'}${selectedTradeForDetails.exitPrice.toFixed(2)}`
                      : undefined
                  }
                />
                <DetailTile
                  label="Stop Loss"
                  value={`${CURRENCY_SYMBOLS[selectedTradeForDetails.currency] || '$'}${selectedTradeForDetails.stopLoss.toFixed(2)}`}
                />
                <DetailTile label="Quantity" value={selectedTradeForDetails.quantity} />
                <DetailTile
                  label="Charges"
                  value={`${CURRENCY_SYMBOLS[selectedTradeForDetails.currency] || '$'}${selectedTradeForDetails.fees.toFixed(2)}`}
                />
                <DetailTile label="Currency" value={selectedTradeForDetails.currency} />
                <DetailTile label="Limit" value={selectedTradeForDetails.limit} />
                <DetailTile label="Exit Plan" value={selectedTradeForDetails.exit} />
                <DetailTile
                  label="Exit R"
                  value={
                    selectedTradeForDetails.exitRFactor !== undefined
                      ? `${selectedTradeForDetails.exitRFactor > 0 ? '+' : ''}${selectedTradeForDetails.exitRFactor.toFixed(2)}R`
                      : undefined
                  }
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <DetailTile label="Market Trend" value={selectedTradeForDetails.marketTrend} />
                <DetailTile label="Setup Type" value={selectedTradeForDetails.setupType} />
                <DetailTile label="Volume Profile" value={selectedTradeForDetails.volumeProfile} />
                <DetailTile label="Session" value={selectedTradeForDetails.session} />
                <DetailTile label="Market Condition" value={selectedTradeForDetails.marketCondition} />
                <DetailTile label="Mistake" value={selectedTradeForDetails.mistakeTag} />
                <DetailTile label="Rule Followed" value={selectedTradeForDetails.ruleFollowed ? 'Yes' : 'No'} />
                <DetailTile label="Entry Emotion" value={selectedTradeForDetails.emotionEntry || selectedTradeForDetails.emotion} />
                <DetailTile label="Exit Emotion" value={selectedTradeForDetails.emotionExit} />
              </div>

              {selectedTradeForDetails.ruleViolations && selectedTradeForDetails.ruleViolations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rule Violations</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTradeForDetails.ruleViolations.map((violation) => (
                      <span key={violation} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground">
                        {violation}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTradeForDetails.tags && selectedTradeForDetails.tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTradeForDetails.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(selectedTradeForDetails.preNotes || selectedTradeForDetails.postNotes || selectedTradeForDetails.notes) && (
                <div className="grid gap-3">
                  {selectedTradeForDetails.preNotes && (
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pre-notes</p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{selectedTradeForDetails.preNotes}</p>
                    </div>
                  )}
                  {selectedTradeForDetails.postNotes && (
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Post-notes</p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{selectedTradeForDetails.postNotes}</p>
                    </div>
                  )}
                  {selectedTradeForDetails.notes && (
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{selectedTradeForDetails.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {(selectedTradeForDetails.beforeTradeScreenshot || selectedTradeForDetails.afterExitScreenshot) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedTradeForDetails.beforeTradeScreenshot && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Before Trade</p>
                      <ScreenshotViewer imageUrl={selectedTradeForDetails.beforeTradeScreenshot} title="Before Trade Screenshot" />
                    </div>
                  )}
                  {selectedTradeForDetails.afterExitScreenshot && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">After Exit</p>
                      <ScreenshotViewer imageUrl={selectedTradeForDetails.afterExitScreenshot} title="After Exit Screenshot" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Legend */}
      <div className="border-t border-border px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-center gap-6 bg-background/60">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80">
          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          <span>Profit</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80">
          <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
          <span>Loss</span>
        </div>
      </div>
    </div>
  );
}
