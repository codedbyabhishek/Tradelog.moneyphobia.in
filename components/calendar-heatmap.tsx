'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade } from '@/lib/types';
import { calculatePnL } from '@/lib/trade-utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameMonth,
} from 'date-fns';

interface CalendarHeatMapProps {
  trades: Trade[];
  month?: Date;
}

interface DayStats {
  date: string;
  dayOfMonth: number;
  pnl: number;
  trades: number;
  winRate: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}

export function CalendarHeatMap({ trades, month = new Date() }: CalendarHeatMapProps) {
  const stats = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return allDays.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTrades = trades.filter((t) => format(new Date(t.entryDate), 'yyyy-MM-dd') === dateStr);

      const pnl = dayTrades.reduce((sum, t) => sum + calculatePnL(t), 0);
      const winningTrades = dayTrades.filter((t) => calculatePnL(t) > 0);
      const winRate = dayTrades.length > 0 ? (winningTrades.length / dayTrades.length) * 100 : 0;

      return {
        date: dateStr,
        dayOfMonth: date.getDate(),
        pnl: parseFloat(pnl.toFixed(2)),
        trades: dayTrades.length,
        winRate: parseFloat(winRate.toFixed(1)),
        isToday: isToday(date),
        isCurrentMonth: isSameMonth(date, month),
      } as DayStats;
    });
  }, [trades, month]);

  // Get color based on P&L
  function getHeatColor(pnl: number, trades: number): string {
    if (trades === 0) return 'bg-gray-100 hover:bg-gray-200';

    // Green shades for profits
    if (pnl > 500) return 'bg-green-700 hover:bg-green-800 text-white';
    if (pnl > 200) return 'bg-green-600 hover:bg-green-700 text-white';
    if (pnl > 50) return 'bg-green-500 hover:bg-green-600 text-white';
    if (pnl > 0) return 'bg-green-300 hover:bg-green-400';

    // Red shades for losses
    if (pnl < -500) return 'bg-red-700 hover:bg-red-800 text-white';
    if (pnl < -200) return 'bg-red-600 hover:bg-red-700 text-white';
    if (pnl < -50) return 'bg-red-500 hover:bg-red-600 text-white';
    if (pnl < 0) return 'bg-red-300 hover:bg-red-400';

    // Neutral
    return 'bg-yellow-200 hover:bg-yellow-300';
  }

  // Group stats by week
  const weeks = [];
  for (let i = 0; i < stats.length; i += 7) {
    weeks.push(stats.slice(i, i + 7));
  }

  const monthStats = stats.filter((s) => s.isCurrentMonth);
  const monthTotalPnL = monthStats.reduce((sum, s) => sum + s.pnl, 0);
  const monthTotalTrades = monthStats.reduce((sum, s) => sum + s.trades, 0);
  const monthWinRate =
    monthTotalTrades > 0
      ? ((monthStats.filter((s) => s.pnl > 0).length / monthStats.filter((s) => s.trades > 0).length) * 100)
      : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Trading Activity Heat Map</CardTitle>
            <CardDescription>{format(month, 'MMMM yyyy')}</CardDescription>
          </div>
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold text-green-600">
              ${monthTotalPnL.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {monthTotalTrades} trades • {monthWinRate.toFixed(1)}% win rate
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Heat Map Grid */}
        <div className="space-y-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg
                    ${getHeatColor(day.pnl, day.trades)}
                    transition-colors cursor-pointer relative group text-sm font-medium
                    ${!day.isCurrentMonth ? 'opacity-30' : ''}
                    ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                  `}
                  title={`${day.date}: ${day.pnl >= 0 ? '+' : ''}$${day.pnl} (${day.trades} trades)`}
                >
                  <span className="text-xs">{day.dayOfMonth}</span>
                  {day.trades > 0 && (
                    <>
                      <span className="text-xs font-bold">
                        {day.pnl >= 0 ? '+' : ''}${day.pnl}
                      </span>
                      <span className="text-xs">
                        {day.trades}t
                      </span>
                    </>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block
                    bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                    <div className="font-semibold">{day.date}</div>
                    <div>P&L: ${day.pnl.toFixed(2)}</div>
                    <div>Trades: {day.trades}</div>
                    {day.trades > 0 && <div>Win Rate: {day.winRate.toFixed(1)}%</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-semibold text-gray-600">P&L Legend:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-700 rounded"></div>
              <span>&gt; +$500</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>+$50-$500</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 rounded"></div>
              <span>Break-even</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>-$50-$500</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-700 rounded"></div>
              <span>&lt; -$500</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>No trades</span>
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="border-t pt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total P&L</p>
            <p className={`text-lg font-bold ${monthTotalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${monthTotalPnL.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Total Trades</p>
            <p className="text-lg font-bold text-gray-900">{monthTotalTrades}</p>
          </div>
          <div>
            <p className="text-gray-600">Win Rate</p>
            <p className="text-lg font-bold text-gray-900">{monthWinRate.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
