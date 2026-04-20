'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Trade } from '@/lib/types';
import { useSettings } from '@/lib/settings-context';
import { getTradeBasePnL, getTradeCharges, convertToBaseCurrency, CURRENCY_SYMBOLS, convertBaseAmountToDisplayCurrency } from '@/lib/trade-utils';

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

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          {/* Weekday Headers */}
          <div className="grid grid-cols-8 gap-2 mb-2">
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
          <div className="grid grid-cols-8 gap-2">
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

                    return (
                      <div
                        key={`${day.date}-${index}`}
                        className={`min-h-24 sm:min-h-28 lg:min-h-32 p-2 sm:p-3 lg:p-4 rounded-xl relative transition-colors ${getDaySurfaceClasses(
                          day.isToday,
                          isCurrentMonthDay,
                          day.tradeCount,
                          day.pnl
                        )}`}
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
                            className={`rounded-lg border px-2 py-1.5 sm:px-2.5 sm:py-2 text-[11px] sm:text-xs ${getTradeBoxClasses(day.pnl)}`}
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
                      </div>
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
