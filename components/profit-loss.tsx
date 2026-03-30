'use client';

import { useContext } from 'react';
import { TradeContext } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { getTradeBasePnL, getTradeCharges, getTradeGrossPnL, CURRENCY_SYMBOLS, formatCurrency, convertToBaseCurrency } from '@/lib/trade-utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function ProfitLoss() {
  const { baseCurrency } = useSettings(); // Move useSettings hook to the top level
  const context = useContext(TradeContext);
  if (!context) return null;

  const { trades } = context;

  // Base currency symbol for display
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];

  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate cumulative P&L using base currency
  const cumulativeData = sortedTrades.reduce((acc: any[], trade) => {
    const basePnL = getTradeBasePnL(trade);
    const lastCumulative = acc.length > 0 ? acc[acc.length - 1].cumulativePnL : 0;
    return [
      ...acc,
      {
        date: new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pnl: basePnL,
        cumulativePnL: lastCumulative + basePnL,
        symbol: trade.symbol,
      },
    ];
  }, []);

  // Daily P&L Summary - using base currency to avoid mixing currencies
  // Now includes gross P&L, charges, and net P&L breakdown
  const dailyPnL = sortedTrades.reduce((acc: any, trade) => {
    const dateKey = trade.date;
    const basePnL = getTradeBasePnL(trade);
    const charges = getTradeCharges(trade);
    const baseCharges = trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges;
    const grossPnL = getTradeGrossPnL(trade);
    const baseGrossPnL = trade.currency ? convertToBaseCurrency(grossPnL, trade.currency, trade.exchangeRate) : grossPnL;
    const existing = acc.find((d: any) => d.date === dateKey);
    if (existing) {
      existing.pnl += basePnL;
      existing.grossPnl += baseGrossPnL;
      existing.charges += baseCharges;
      existing.trades += 1;
    } else {
      acc.push({
        date: dateKey,
        displayDate: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
        pnl: basePnL,
        grossPnl: baseGrossPnL,
        charges: baseCharges,
        trades: 1,
      });
    }
    return acc;
  }, []);

  // Monthly P&L Summary - using base currency
  const monthlyPnL = sortedTrades.reduce((acc: any, trade) => {
    const date = new Date(trade.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthDisplay = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const basePnL = getTradeBasePnL(trade);
    
    const existing = acc.find((m: any) => m.key === monthKey);
    if (existing) {
      existing.pnl += basePnL;
      existing.trades += 1;
    } else {
      acc.push({
        key: monthKey,
        month: monthDisplay,
        pnl: basePnL,
        trades: 1,
      });
    }
    return acc;
  }, []);

  // P&L by Symbol - using base currency and deriving W/L from P&L
  const symbolPnL = sortedTrades.reduce((acc: any, trade) => {
    const basePnL = getTradeBasePnL(trade);
    const isWin = trade.pnl > 0; // Derive from P&L, not deprecated isWin field
    const existing = acc.find((s: any) => s.symbol === trade.symbol);
    if (existing) {
      existing.pnl += basePnL;
      existing.wins += isWin ? 1 : 0;
      existing.losses += trade.pnl < 0 ? 1 : 0;
      existing.count += 1;
    } else {
      acc.push({
        symbol: trade.symbol,
        pnl: basePnL,
        wins: isWin ? 1 : 0,
        losses: trade.pnl < 0 ? 1 : 0,
        count: 1,
      });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.pnl - a.pnl);

  // P&L by Setup - using base currency and deriving W/L from P&L
  const setupPnL = sortedTrades.reduce((acc: any, trade) => {
    const basePnL = getTradeBasePnL(trade);
    const isWin = trade.pnl > 0; // Derive from P&L, not deprecated isWin field
    const existing = acc.find((s: any) => s.setup === trade.setupName);
    if (existing) {
      existing.pnl += basePnL;
      existing.wins += isWin ? 1 : 0;
      existing.losses += trade.pnl < 0 ? 1 : 0;
      existing.count += 1;
    } else {
      acc.push({
        setup: trade.setupName,
        pnl: basePnL,
        wins: isWin ? 1 : 0,
        losses: trade.pnl < 0 ? 1 : 0,
        count: 1,
      });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.pnl - a.pnl);

  // Total P&L in base currency
  const totalPnL = trades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
  
  // Total charges and gross P&L
  const totalCharges = trades.reduce((sum, trade) => {
    const charges = getTradeCharges(trade);
    return sum + (trade.currency ? convertToBaseCurrency(charges, trade.currency, trade.exchangeRate) : charges);
  }, 0);
  const totalGrossPnL = totalPnL + totalCharges;
  
  // FIXED: Best Day = highest POSITIVE daily P&L only
  const positiveDays = dailyPnL.filter((day: any) => day.pnl > 0);
  const bestDay = positiveDays.length > 0 
    ? positiveDays.reduce((max: any, day: any) => (day.pnl > max.pnl ? day : max)) 
    : null;
  
  // FIXED: Worst Day = most NEGATIVE daily P&L only
  const negativeDays = dailyPnL.filter((day: any) => day.pnl < 0);
  const worstDay = negativeDays.length > 0 
    ? negativeDays.reduce((min: any, day: any) => (day.pnl < min.pnl ? day : min)) 
    : null;
  
  // Best Month = highest positive monthly P&L
  const positiveMonths = monthlyPnL.filter((month: any) => month.pnl > 0);
  const bestMonth = positiveMonths.length > 0 
    ? positiveMonths.reduce((max: any, month: any) => (month.pnl > max.pnl ? month : max)) 
    : null;

  return (
    <div className="flex-1 overflow-auto min-h-screen flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Profit & Loss Summary</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Track your earnings and identify profitable patterns</p>
        </div>

        {/* Overall Summary - All values in base currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Net P&L ({baseCurrency})</p>
            <p className={`text-2xl sm:text-3xl font-bold break-words ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {baseCurrencySymbol}{totalPnL.toFixed(0)}
            </p>
            {totalCharges > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Gross</span>
                  <span className={totalGrossPnL >= 0 ? 'text-green-400' : 'text-red-400'}>{baseCurrencySymbol}{totalGrossPnL.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                  <span>Charges</span>
                  <span className="text-orange-400">-{baseCurrencySymbol}{totalCharges.toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>
          {bestDay ? (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Best Day</p>
              <p className="text-xl sm:text-2xl font-bold text-green-400 break-words">{baseCurrencySymbol}{bestDay.pnl.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{bestDay.displayDate}</p>
            </div>
          ) : (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Best Day</p>
              <p className="text-xl sm:text-2xl font-bold text-muted-foreground break-words">N/A</p>
              <p className="text-xs text-muted-foreground mt-1">No profitable days yet</p>
            </div>
          )}
          {worstDay ? (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Worst Day</p>
              <p className="text-xl sm:text-2xl font-bold text-red-400 break-words">{baseCurrencySymbol}{worstDay.pnl.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{worstDay.displayDate}</p>
            </div>
          ) : (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Worst Day</p>
              <p className="text-xl sm:text-2xl font-bold text-muted-foreground break-words">N/A</p>
              <p className="text-xs text-muted-foreground mt-1">No losing days yet</p>
            </div>
          )}
          {bestMonth ? (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Best Month</p>
              <p className="text-xl sm:text-2xl font-bold text-green-400 break-words">{baseCurrencySymbol}{bestMonth.pnl.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{bestMonth.month}</p>
            </div>
          ) : (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Best Month</p>
              <p className="text-xl sm:text-2xl font-bold text-muted-foreground break-words">N/A</p>
              <p className="text-xs text-muted-foreground mt-1">No profitable months yet</p>
            </div>
          )}
        </div>

        {/* Cumulative P&L Chart */}
        {cumulativeData.length > 0 && (
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Cumulative P&L Over Time</h3>
            <ResponsiveContainer width="100%" height={250} minHeight={200}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  formatter={(value: any) => `${baseCurrencySymbol}${value.toFixed(0)}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulativePnL" 
                  stroke="#a78bfa" 
                  dot={false}
                  name="Cumulative P&L"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily P&L Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {dailyPnL.length > 0 && (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Daily P&L ({baseCurrency})</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {dailyPnL.map((day: any, idx: number) => (
                  <div key={idx} className="p-2 hover:bg-secondary rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">{day.displayDate}</p>
                        <p className="text-xs text-muted-foreground">{day.trades} trade(s)</p>
                      </div>
                      <p className={`text-lg font-bold ${day.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {baseCurrencySymbol}{day.pnl.toFixed(0)}
                      </p>
                    </div>
                    {day.charges > 0 && (
                      <div className="flex gap-4 mt-1 ml-0">
                        <span className="text-xs text-muted-foreground">
                          Gross: <span className={day.grossPnl >= 0 ? 'text-green-400' : 'text-red-400'}>{baseCurrencySymbol}{day.grossPnl.toFixed(0)}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Charges: <span className="text-orange-400">-{baseCurrencySymbol}{day.charges.toFixed(0)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {monthlyPnL.length > 0 && (
            <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Monthly P&L ({baseCurrency})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monthlyPnL.map((month: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2 hover:bg-secondary rounded">
                    <div>
                      <p className="text-sm font-medium text-foreground">{month.month}</p>
                      <p className="text-xs text-muted-foreground">{month.trades} trade(s)</p>
                    </div>
                    <p className={`text-lg font-bold ${month.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {baseCurrencySymbol}{month.pnl.toFixed(0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* P&L by Symbol - using base currency */}
        {symbolPnL.length > 0 && (
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">P&L by Symbol ({baseCurrency})</h3>
            <div className="overflow-x-auto -mx-4 sm:-mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 font-medium text-foreground">Symbol</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Trades</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Wins</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Win %</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {symbolPnL.map((symbol: any, idx: number) => (
                    <tr key={idx} className="border-b border-border hover:bg-secondary">
                      <td className="py-3 px-4 font-semibold text-foreground">{symbol.symbol}</td>
                      <td className="text-right py-3 px-4 text-foreground">{symbol.count}</td>
                      <td className="text-right py-3 px-4 text-green-400">{symbol.wins}</td>
                      <td className="text-right py-3 px-4 text-foreground">
                        {((symbol.wins / symbol.count) * 100).toFixed(1)}%
                      </td>
                      <td className={`text-right py-3 px-4 font-bold ${symbol.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {baseCurrencySymbol}{symbol.pnl.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* P&L by Setup - using base currency */}
        {setupPnL.length > 0 && (
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">P&L by Setup ({baseCurrency})</h3>
            <div className="overflow-x-auto -mx-4 sm:-mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 font-medium text-foreground">Setup</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Trades</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Wins</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">Win %</th>
                    <th className="text-right py-2 px-4 font-medium text-foreground">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {setupPnL.map((setup: any, idx: number) => (
                    <tr key={idx} className="border-b border-border hover:bg-secondary">
                      <td className="py-3 px-4 font-semibold text-foreground">{setup.setup}</td>
                      <td className="text-right py-3 px-4 text-foreground">{setup.count}</td>
                      <td className="text-right py-3 px-4 text-green-400">{setup.wins}</td>
                      <td className="text-right py-3 px-4 text-foreground">
                        {((setup.wins / setup.count) * 100).toFixed(1)}%
                      </td>
                      <td className={`text-right py-3 px-4 font-bold ${setup.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {baseCurrencySymbol}{setup.pnl.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {trades.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No trades yet. Start trading and track your P&L!</p>
          </div>
        )}
      </div>
    </div>
  );
}
