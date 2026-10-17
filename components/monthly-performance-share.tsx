'use client';

import { Fragment, useRef, useState } from 'react';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { toBlob } from 'html-to-image';
import { ArrowDownToLine, Share2 } from 'lucide-react';
import type { Currency, Trade } from '@/lib/types';
import { CURRENCY_SYMBOLS, formatBaseCurrencyAmount, getTradeBasePnL } from '@/lib/trade-utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface MonthlyPerformanceShareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trades: Trade[];
  baseCurrency: Currency;
  displayName: string;
}

function parseTradeDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatReportAmount(value: number, currency: Currency) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatBaseCurrencyAmount(value, currency, 2)}`;
}

export default function MonthlyPerformanceShare({
  open,
  onOpenChange,
  trades,
  baseCurrency,
  displayName,
}: MonthlyPerformanceShareProps) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(monthStart);
  const monthKey = format(monthStart, 'yyyy-MM');
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  const report = (() => {
    const dailyPnL = new Map<string, number>();
    for (const trade of trades) {
      const date = parseTradeDate(trade.date);
      if (!date || format(date, 'yyyy-MM') !== monthKey) continue;
      const key = format(date, 'yyyy-MM-dd');
      dailyPnL.set(key, (dailyPnL.get(key) || 0) + getTradeBasePnL(trade));
    }

    const days = Array.from(dailyPnL, ([date, pnl]) => ({ date, pnl }));
    const totalPnL = days.reduce((sum, day) => sum + day.pnl, 0);
    const bestDay = days.reduce<(typeof days)[number] | null>(
      (best, day) => !best || day.pnl > best.pnl ? day : best,
      null,
    );
    const weeks = Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, index) => {
      const weekDays = calendarDays.slice(index * 7, index * 7 + 7);
      const weekPnL = weekDays.reduce(
        (sum, date) => sum + (dailyPnL.get(format(date, 'yyyy-MM-dd')) || 0),
        0,
      );
      return { number: index + 1, pnl: weekPnL };
    });

    return {
      dailyPnL,
      totalPnL,
      averageDailyPnL: days.length > 0 ? totalPnL / days.length : 0,
      bestDay,
      weeks,
    };
  })();

  const downloadImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#10091f',
      });
      if (!blob) throw new Error('Image export returned no data.');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `traderlogify-${monthKey}-trading-report.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Image saved', description: 'Your monthly trading report was downloaded as a PNG.' });
    } catch (error) {
      console.error('[MonthlyPerformanceShare] Image export failed', error);
      toast({
        title: 'Image export failed',
        description: 'The monthly report image could not be generated. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const shareImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#10091f',
      });
      if (!blob) throw new Error('Image export returned no data.');

      const file = new File([blob], `traderlogify-${monthKey}-trading-report.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${format(monthStart, 'MMMM yyyy')} Trading Report` });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Image saved',
        description: 'Image sharing is not supported here, so the report was downloaded instead.',
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('[MonthlyPerformanceShare] Image sharing failed', error);
      toast({
        title: 'Share failed',
        description: 'The monthly report image could not be shared. Please try saving it instead.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currencyCode = baseCurrency;
  const currencySymbol = CURRENCY_SYMBOLS[baseCurrency];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-xl overflow-y-auto border-white/10 bg-[#0c0914] p-4 text-white sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-white">Monthly trading report</DialogTitle>
          <DialogDescription className="text-slate-400">
            Preview and share your {format(monthStart, 'MMMM yyyy')} performance as an image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center overflow-auto rounded-xl bg-black/30 p-2 sm:p-4">
          <div
            ref={reportRef}
            className="w-full max-w-[530px] shrink-0 overflow-hidden border border-violet-300/15 px-5 py-6 sm:px-8 sm:py-8"
            style={{
              aspectRatio: '530 / 748',
              background: 'radial-gradient(ellipse at 50% 8%, #302052 0%, #160d29 43%, #10091f 100%)',
              color: '#f8fafc',
            }}
          >
            <div className="flex h-full flex-col">
              <header className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-lg font-black text-white">T</div>
                <div>
                  <p className="text-sm font-black tracking-[0.08em]">Traderlogify</p>
                  <p className="text-[8px] font-bold tracking-[0.34em] text-violet-300">YOUR TRADING REPORT</p>
                </div>
              </header>

              <div className="mt-5 grid grid-cols-[1fr_170px] gap-3">
                <div>
                  <h2 className="text-[32px] font-bold leading-none tracking-tight">
                    {format(monthStart, 'MMMM')} <span className="text-violet-400">{format(monthStart, 'yyyy')}</span>
                  </h2>
                  <p className="mt-2 text-xs italic text-violet-200/80">— by {displayName}</p>
                  <p className="mt-5 text-[9px] font-semibold tracking-[0.3em] text-slate-400">NET PROFIT / LOSS</p>
                  <p className={`mt-1 text-[42px] font-bold leading-none tracking-tight ${report.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatReportAmount(report.totalPnL, baseCurrency)}
                    <span className="ml-2 text-xs font-medium text-slate-400">{currencyCode}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-violet-300/15 bg-white/[0.035] px-3 py-3">
                    <p className="text-[8px] font-bold tracking-[0.25em] text-violet-300">AVG DAILY P/L</p>
                    <p className="mt-1 text-lg font-bold text-emerald-400">{formatReportAmount(report.averageDailyPnL, baseCurrency)}</p>
                  </div>
                  <div className="rounded-xl border border-violet-300/15 bg-white/[0.035] px-3 py-3">
                    <p className="text-[8px] font-bold tracking-[0.25em] text-violet-300">BEST DAY</p>
                    <p className={`mt-1 text-lg font-bold ${report.bestDay && report.bestDay.pnl > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {report.bestDay ? formatReportAmount(report.bestDay.pnl, baseCurrency) : '—'}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-500">{report.bestDay ? format(parseTradeDate(report.bestDay.date) || monthStart, 'MMM d') : 'No trades this month'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-8 gap-1 text-center">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'WEEK'].map((label) => (
                  <div key={label} className="py-1 text-[8px] font-bold tracking-[0.2em] text-violet-300">{label}</div>
                ))}
                {report.weeks.map((week, weekIndex) => (
                  <Fragment key={`week-${week.number}`}>
                    {calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((date) => {
                      const dailyPnL = report.dailyPnL.get(format(date, 'yyyy-MM-dd'));
                      const isCurrentMonth = isSameMonth(date, monthStart);
                      const cellBackground = dailyPnL === undefined
                        ? 'rgba(255,255,255,0.025)'
                        : dailyPnL > 0
                          ? 'rgba(16,185,129,0.14)'
                          : dailyPnL < 0
                            ? 'rgba(244,63,94,0.14)'
                            : 'rgba(255,255,255,0.06)';

                      return (
                        <div
                          key={format(date, 'yyyy-MM-dd')}
                          className="flex min-h-[48px] flex-col items-center justify-center rounded-lg border text-[10px]"
                          style={{
                            borderColor: 'rgba(196,181,253,0.11)',
                            background: cellBackground,
                            color: isCurrentMonth ? '#f8fafc' : '#6b6476',
                          }}
                        >
                          <span>{format(date, 'd')}</span>
                          {dailyPnL !== undefined && (
                            <span className={`mt-0.5 max-w-full truncate px-0.5 text-[6px] ${dailyPnL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {formatBaseCurrencyAmount(dailyPnL, baseCurrency, 0)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex min-h-[48px] flex-col items-center justify-center rounded-lg border border-violet-300/10 bg-white/[0.035]">
                      <span className="text-[7px] font-bold tracking-[0.15em] text-violet-300">WEEK {week.number}</span>
                      <span className="mt-1 max-w-full truncate px-0.5 text-[9px] font-semibold text-slate-300">
                        {formatBaseCurrencyAmount(week.pnl, baseCurrency, 0)}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>

              <footer className="mt-auto flex items-center justify-between gap-2 border-t border-violet-300/15 pt-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-black text-white">T</div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold">Traderlogify</p>
                    <p className="text-[8px] text-slate-400">Monthly performance</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold tracking-[0.25em] text-violet-300">TRADE WITH INTENTION</p>
                  <p className="mt-1 text-[8px] text-slate-500">{currencySymbol} • {currencyCode}</p>
                </div>
              </footer>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="gap-2" onClick={() => void downloadImage()} disabled={isExporting}>
            <ArrowDownToLine className="h-4 w-4" />
            Save Image
          </Button>
          <Button type="button" className="gap-2 bg-violet-600 text-white hover:bg-violet-500" onClick={() => void shareImage()} disabled={isExporting}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
