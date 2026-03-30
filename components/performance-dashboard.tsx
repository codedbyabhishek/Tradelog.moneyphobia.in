'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade } from '@/lib/types';
import { generatePerformanceMetrics } from '@/lib/performance-analytics';
import { format } from 'date-fns';

interface PerformanceDashboardProps {
  trades: Trade[];
}

export function PerformanceDashboard({ trades }: PerformanceDashboardProps) {
  const metrics = useMemo(() => generatePerformanceMetrics(trades), [trades]);

  const renderCurrencyTooltip = (value: number) => `$${value.toFixed(2)}`;
  const renderPercentageTooltip = (value: number) => `${value.toFixed(1)}%`;

  // Prepare equity curve data
  const equityCurveData = useMemo(() => {
    // Limit to last 50 data points for performance
    return metrics.equityCurve.slice(-50);
  }, [metrics.equityCurve]);

  // Prepare best hours data
  const bestHoursData = useMemo(() => {
    return Object.entries(metrics.bestTradingHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hour, pnl]) => ({
        hour,
        pnl: parseFloat(pnl.toFixed(2))
      }));
  }, [metrics.bestTradingHours]);

  // Prepare best days data
  const bestDaysData = useMemo(() => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayOrder
      .map(day => ({
        day,
        pnl: parseFloat((metrics.bestTradingDays[day] || 0).toFixed(2))
      }))
      .filter(d => d.pnl !== 0);
  }, [metrics.bestTradingDays]);

  // Prepare monthly data
  const monthlyData = useMemo(() => {
    return Object.entries(metrics.monthlyPnL).map(([month, pnl]) => {
      const winRate = metrics.monthlyWinRate[month] || 0;
      const target = metrics.monthlyReturnTargets.find(m => m.month === month)?.target || 1000;
      return {
        month: format(new Date(month + '-01'), 'MMM yyyy'),
        pnl: parseFloat(pnl.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1)),
        target: parseFloat(target.toFixed(2))
      };
    });
  }, [metrics.monthlyPnL, metrics.monthlyWinRate, metrics.monthlyReturnTargets]);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-gray-500">No trades yet. Start trading to see performance metrics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Cumulative P&L over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={equityCurveData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={Math.floor(equityCurveData.length / 5)}
              />
              <YAxis tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => renderCurrencyTooltip(value)} />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#3b82f6"
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>P&L and Win Rate by month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis yAxisId="left" tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={renderPercentageTooltip}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'pnl' || name === 'target') {
                    return renderCurrencyTooltip(value);
                  }
                  return renderPercentageTooltip(value);
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="pnl" fill="#10b981" name="P&L" />
              <Bar yAxisId="left" dataKey="target" fill="#e5e7eb" name="Target" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="winRate"
                stroke="#f59e0b"
                name="Win Rate %"
                animationDuration={300}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Best Trading Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Best Trading Hours</CardTitle>
            <CardDescription>Average P&L by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bestHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => renderCurrencyTooltip(value)} />
                <Bar dataKey="pnl" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {bestHoursData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Best Trading Days */}
        <Card>
          <CardHeader>
            <CardTitle>Best Trading Days</CardTitle>
            <CardDescription>Total P&L by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bestDaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={renderCurrencyTooltip} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => renderCurrencyTooltip(value)} />
                <Bar dataKey="pnl" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                  {bestDaysData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Return Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Return Targets</CardTitle>
          <CardDescription>Progress toward monthly P&L goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.monthlyReturnTargets.slice(-6).map((target) => (
              <div key={target.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{target.month}</span>
                  <span className={target.actual >= target.target ? 'text-green-600' : 'text-red-600'}>
                    ${target.actual.toFixed(2)} / ${target.target.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      target.actual >= target.target ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min(target.percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
