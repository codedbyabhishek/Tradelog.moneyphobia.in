'use client';

import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { getAccountStats, getTradeCharges, convertToBaseCurrency, CURRENCY_SYMBOLS, getNetCapitalAdjustments } from '@/lib/trade-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, Zap, Clock3, CalendarDays } from 'lucide-react';
import CalendarView from './calendar-view';
import GitHubSyncButton from './github-sync-button';
import FavoritesBoard from './favorites-board';
import DhanSyncCard from './dhan-sync-card';
import { EmptyStateIllustration } from './brand-illustrations';
import UpgradeBanner from './upgrade-banner';
import { isProPlan } from '@/lib/subscription';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  isPositive?: boolean;
}

function StatCard({ icon: Icon, title, value, subtitle, isPositive }: StatCardProps) {
  return (
    <Card className="bg-card border-border h-full rounded-lg">
      <CardHeader className="p-2.5 pb-1 sm:p-3 sm:pb-1 lg:p-3.5 lg:pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">{title}</CardTitle>
          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isPositive !== undefined ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-primary'}`} />
        </div>
      </CardHeader>
      <CardContent className="p-2.5 pt-0 sm:p-3 sm:pt-0 lg:p-3.5 lg:pt-0">
        <div className="text-sm sm:text-base lg:text-lg font-bold text-foreground break-words leading-tight">{value}</div>
        {subtitle && <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground leading-snug">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { trades } = useTrades();
  const { baseCurrency, startingBalance, capitalAdjustments, billingState } = useSettings();
  const stats = getAccountStats(trades);
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];
  const netCapitalAdjustments = getNetCapitalAdjustments(capitalAdjustments);
  const investedCapital = startingBalance + netCapitalAdjustments;
  const currentBalance = investedCapital + stats.totalPnL;
  
  // Total brokerage paid across all trades
  const totalBrokerage = trades.reduce((sum, t) => {
    const charges = getTradeCharges(t);
    const baseCharges = t.currency ? convertToBaseCurrency(charges, t.currency, t.exchangeRate) : charges;
    return sum + baseCharges;
  }, 0);
  const proPlan = isProPlan(billingState);

  return (
    <div className="w-full min-w-0 flex flex-col bg-background">
      {/* Main content with responsive padding and proper spacing */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5 w-full p-2 sm:p-4 lg:p-5">
        {!proPlan && (
          <UpgradeBanner
            title="Unlock Dhan sync, advanced analytics, and exports with Pro"
            description="Start free, then upgrade when you want unlimited trades, deeper psychology review, and broker-connected journaling."
          />
        )}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 lg:p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <p className="text-xs sm:text-sm uppercase tracking-wider text-primary font-semibold">Control Center</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Trading Dashboard</h1>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground max-w-2xl">
                Track outcomes, monitor risk, and review execution quality from one place.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">Total Trades: {stats.totalTrades}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">Win Rate: {stats.winRate}%</span>
                <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">Avg R: {stats.averageR.toFixed(2)}</span>
              </div>
            </div>
            <div className="shrink-0">
              <GitHubSyncButton trades={trades} />
            </div>
          </div>
        </div>

        {/* Stats & setup cards grid - All P&L values in base currency */}
        <div className="grid w-full grid-cols-2 gap-2.5 lg:grid-cols-4 sm:gap-3">
          <StatCard icon={Zap} title="Total Trades" value={stats.totalTrades} subtitle={`${stats.winRate}% win rate`} />
          <StatCard
            icon={DollarSign}
            title={`Current Balance (${baseCurrency})`}
            value={`${baseCurrencySymbol}${currentBalance.toFixed(2)}`}
            subtitle={`Capital: ${baseCurrencySymbol}${investedCapital.toFixed(2)}`}
            isPositive={currentBalance >= investedCapital}
          />
          <StatCard
            icon={TrendingUp}
            title={`Net P&L (${baseCurrency})`}
            value={`${baseCurrencySymbol}${stats.totalPnL.toFixed(2)}`}
            subtitle={`Avg R: ${stats.averageR.toFixed(2)}`}
            isPositive={stats.totalPnL >= 0}
          />
          <StatCard icon={Target} title={`Max Drawdown (${baseCurrency})`} value={`${baseCurrencySymbol}${stats.maxDrawdown.toFixed(2)}`} subtitle="Peak to trough" />
          <DhanSyncCard />
          <StatCard icon={Clock3} title="Best Timeframe" value={stats.bestTimeFrame} subtitle="Highest total P&L timeframe" isPositive />
          <StatCard icon={Clock3} title="Worst Timeframe" value={stats.worstTimeFrame} subtitle="Lowest total P&L timeframe" isPositive={false} />
          <StatCard icon={CalendarDays} title="Good Day" value={stats.goodDay} subtitle="Best weekday by total P&L" isPositive />
          <StatCard icon={CalendarDays} title="Bad Day" value={stats.badDay} subtitle="Weakest weekday by total P&L" isPositive={false} />
          {totalBrokerage > 0 && (
            <StatCard
              icon={DollarSign}
              title={`Brokerage Paid (${baseCurrency})`}
              value={`${baseCurrencySymbol}${totalBrokerage.toFixed(2)}`}
              subtitle="Total charges deducted"
            />
          )}
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="p-2.5 pb-1 sm:p-3 sm:pb-1 lg:p-3.5 lg:pb-1.5">
              <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                <span>Best Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0 sm:p-3 sm:pt-0 lg:p-3.5 lg:pt-0">
              <div className="text-sm sm:text-base font-bold text-foreground break-words leading-tight">{stats.bestSetup}</div>
              <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">Most profitable setup</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="p-2.5 pb-1 sm:p-3 sm:pb-1 lg:p-3.5 lg:pb-1.5">
              <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                <TrendingDown className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                <span>Worst Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0 sm:p-3 sm:pt-0 lg:p-3.5 lg:pt-0">
              <div className="text-sm sm:text-base font-bold text-foreground break-words leading-tight">{stats.worstSetup}</div>
              <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">Least profitable setup</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="w-full border border-border rounded-lg bg-card overflow-hidden">
          <CalendarView trades={trades} />
        </div>

        <FavoritesBoard />

        {/* Quick Insights below calendar */}
        <Card className="bg-card border-border w-full">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
              <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
              <span>Quick Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
            {trades.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <EmptyStateIllustration className="max-w-[220px]" />
                <p className="max-w-md text-sm text-muted-foreground">
                  No trades recorded yet. Start logging trades or sync your broker history to unlock dashboard insights.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Win Rate: {stats.winRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You&apos;re winning {stats.winRate}% of your trades
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Average R-Factor: {stats.averageR.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You risk {stats.averageR.toFixed(2)} units to make 1 unit on average
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Current Balance: {baseCurrencySymbol}
                      {currentBalance.toFixed(2)} ({baseCurrency})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Starting balance + deposits/withdrawals = {baseCurrencySymbol}{investedCapital.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Net P&L: {baseCurrencySymbol}
                      {stats.totalPnL.toFixed(2)} ({baseCurrency})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cumulative profit/loss after brokerage deductions
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Max Drawdown: {baseCurrencySymbol}
                      {stats.maxDrawdown.toFixed(2)} ({baseCurrency})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your largest peak-to-trough decline
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Getting Started */}
        {trades.length === 0 && (
          <Card className="bg-primary/10 border-primary">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
              <p className="text-xs sm:text-sm text-foreground">Welcome to your trading journal! Here&apos;s how to get started:</p>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>Click &quot;Add Trade&quot; to record your first trade</li>
                <li>Fill in all trade details including entry, exit, and stop loss</li>
                <li>Add notes about your setup and what you learned</li>
                <li>View your progress in the Trade Log</li>
                <li>Analyze patterns in the Analytics section</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
