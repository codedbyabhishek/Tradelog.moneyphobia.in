'use client';

import { useState, useMemo } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCY_SYMBOLS, formatCurrency } from '@/lib/trade-utils';
import { generateMonthlyReport, generateMonthlyReportHTML } from '@/lib/reports-generator';
import { Download, FileText, Printer, Loader, CalendarRange, ShieldCheck, ChartColumnBig, Camera, Activity, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';

export default function ReportsGenerator() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const symbol = CURRENCY_SYMBOLS[baseCurrency];

  const currentReport = useMemo(() => {
    return generateMonthlyReport(trades, selectedYear, selectedMonth);
  }, [trades, selectedYear, selectedMonth]);

  const dailyPerformanceData = useMemo(() => {
    let cumulative = 0;
    return currentReport.dailyStats.map((day) => {
      cumulative += day.totalPnL;
      return {
        label: format(new Date(`${day.date}T00:00:00`), 'MMM d'),
        pnl: Number(day.totalPnL.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
      };
    });
  }, [currentReport.dailyStats]);

  const handleDownloadHTML = () => {
    const html = generateMonthlyReportHTML(currentReport, baseCurrency);
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trading_Report_${currentReport.month}_${currentReport.year}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      // Use browser's print-to-PDF feature via window.print()
      // This is the most reliable and lightweight solution across all browsers
      handlePrintPDF();
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPDF = () => {
    const html = generateMonthlyReportHTML(currentReport, baseCurrency);
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (!trades || trades.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-3xl font-bold">Trading Reports</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No trades yet. Start trading to generate reports!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trading Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Professional monthly performance summaries designed for review with clients.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadHTML} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download HTML
          </Button>
          <Button onClick={handleExportPDF} className="gap-2" disabled={exporting}>
            {exporting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Export PDF
              </>
            )}
          </Button>
          <Button onClick={handlePrintPDF} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Period</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="w-48">
            <label className="text-sm font-medium mb-2 block">Month</label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <label className="text-sm font-medium mb-2 block">Year</label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {currentReport.totalTrades === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No trades in {months[selectedMonth - 1]} {selectedYear}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Executive Summary</CardTitle>
              <CardDescription className="text-slate-200">
                A clean overview of real trading activity, result quality, and process discipline for the selected month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-7 text-slate-100/95">{currentReport.executiveSummary}</p>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <ChartColumnBig className="h-4 w-4" />
                    Net P&amp;L
                  </div>
                  <p className={`mt-3 text-3xl font-semibold ${currentReport.totalPnL >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {formatCurrency(currentReport.totalPnL, baseCurrency)}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{currentReport.totalTrades} recorded trades</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <ShieldCheck className="h-4 w-4" />
                    Win Rate
                  </div>
                  <p className="mt-3 text-3xl font-semibold">{currentReport.winRate.toFixed(1)}%</p>
                  <Progress value={currentReport.winRate} className="mt-3 h-2 bg-white/10" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <CalendarRange className="h-4 w-4" />
                    Active Days
                  </div>
                  <p className="mt-3 text-3xl font-semibold">{currentReport.activeDays}</p>
                  <p className="mt-2 text-sm text-slate-300">{currentReport.averageTradesPerDay.toFixed(1)} trades / day</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <Camera className="h-4 w-4" />
                    Documentation
                  </div>
                  <p className="mt-3 text-3xl font-semibold">{currentReport.documentedTrades}</p>
                  <p className="mt-2 text-sm text-slate-300">Trades with notes or screenshots</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Core client-facing numbers for results, consistency, and trading efficiency.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(currentReport.grossProfit, baseCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Loss</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(currentReport.grossLoss, baseCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg P&amp;L / Trade</p>
                    <p className={`text-2xl font-bold ${currentReport.avgPnLPerTrade >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(currentReport.avgPnLPerTrade, baseCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg P&amp;L / Day</p>
                    <p className={`text-2xl font-bold ${currentReport.averageDailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(currentReport.averageDailyPnL, baseCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Win</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(currentReport.avgWin, baseCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Loss</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(currentReport.avgLoss, baseCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Trade</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(currentReport.bestTrade, baseCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Worst Trade</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(currentReport.worstTrade, baseCurrency)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discipline Snapshot</CardTitle>
                <CardDescription>Evidence that the process is being tracked, not just the P&amp;L.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rule Followed Rate</span>
                    <span className="font-semibold">{currentReport.ruleFollowedRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentReport.ruleFollowedRate} className="mt-2 h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Notes Coverage</span>
                    <span className="font-semibold">{currentReport.notesCoverage.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentReport.notesCoverage} className="mt-2 h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Screenshot Coverage</span>
                    <span className="font-semibold">{currentReport.screenshotCoverage.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentReport.screenshotCoverage} className="mt-2 h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Recorded Fees</p>
                    <p className="mt-2 text-xl font-semibold">{formatCurrency(currentReport.totalFees, baseCurrency)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Average Confidence</p>
                    <p className="mt-2 text-xl font-semibold">{currentReport.avgConfidence.toFixed(1)} / 10</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle>Consistency & Risk</CardTitle>
                <CardDescription>How stable the month was, how much downside appeared, and how disciplined the risk profile looked.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Green Days</p>
                    <p className="mt-2 text-xl font-semibold">{currentReport.profitableDays} / {currentReport.activeDays}</p>
                    <p className="text-sm text-muted-foreground">{currentReport.profitableDayRate.toFixed(1)}% profitable</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Max Drawdown</p>
                    <p className="mt-2 text-xl font-semibold text-red-600">{formatCurrency(-currentReport.maxDrawdown, baseCurrency)}</p>
                    <p className="text-sm text-muted-foreground">{currentReport.currentStreak}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Average R</p>
                    <p className={`mt-2 text-xl font-semibold ${currentReport.averageR >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currentReport.averageR.toFixed(2)}R</p>
                    <p className="text-sm text-muted-foreground">Best {currentReport.bestR.toFixed(2)}R / Worst {currentReport.worstR.toFixed(2)}R</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Green Day</p>
                    <p className="mt-2 text-xl font-semibold text-green-600">{formatCurrency(currentReport.avgGreenDay, baseCurrency)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Red Day</p>
                    <p className="mt-2 text-xl font-semibold text-red-600">{formatCurrency(-currentReport.avgRedDay, baseCurrency)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Trade Streaks</p>
                    <p className="mt-2 text-xl font-semibold">{currentReport.maxWinStreak}W / {currentReport.maxLossStreak}L</p>
                    <p className="text-sm text-muted-foreground">{currentReport.flatDays} flat days</p>
                  </div>
                </div>
                {dailyPerformanceData.length > 0 && (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={3} dot={false} name="Cumulative P&L" />
                      <Line type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} dot={false} name="Daily P&L" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>Short talking points the user can use while reviewing the report with a client.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentReport.keyInsights.map((insight, idx) => (
                  <div key={idx} className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm leading-6">{insight}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Top Setups */}
          {currentReport.topSetups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Setups</CardTitle>
                <CardDescription>Best setups ranked by net output so it is easy to explain where the edge is working.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentReport.topSetups.map((setup, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <p className="font-medium">{setup.setup}</p>
                        <p className="text-sm text-muted-foreground">{setup.trades} trades</p>
                      </div>
                      <div className="text-right">
                        <Badge className="mb-1 mr-2">{setup.winRate.toFixed(1)}%</Badge>
                        <p className={`font-medium ${setup.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {symbol}{setup.pnl.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Symbols */}
          {currentReport.topSymbols.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Trading Symbols</CardTitle>
                <CardDescription>The instruments that contributed most to the selected month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentReport.topSymbols.map((symbol, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <p className="font-medium text-lg">{symbol.symbol}</p>
                        <p className="text-sm text-muted-foreground">{symbol.trades} trades</p>
                      </div>
                      <div className="text-right">
                        <Badge className="mb-1 mr-2">{symbol.winRate.toFixed(1)}%</Badge>
                        <p className={`font-medium ${symbol.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {CURRENCY_SYMBOLS[baseCurrency]}{symbol.pnl.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emotion Analysis */}
          {currentReport.emotionAnalysis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Emotional State Analysis</CardTitle>
                <CardDescription>Performance correlation with emotional states</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={currentReport.emotionAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="emotion" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="winRate" fill="#8b5cf6" name="Win Rate %" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 space-y-2">
                  {currentReport.emotionAnalysis.map((emotion, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{emotion.emotion}</p>
                        <p className="text-sm text-muted-foreground">{emotion.count} trades</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${emotion.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {emotion.winRate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">{symbol}{emotion.avgPnL.toFixed(2)}/trade</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {currentReport.topMistakes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mistake Pattern Review</CardTitle>
                <CardDescription>Recorded mistake tags that appear to be leaking performance and deserve focused review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentReport.topMistakes.map((mistake, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <TrendingDown className="mt-0.5 h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">{mistake.label}</p>
                        <p className="text-sm text-muted-foreground">{mistake.count} tagged trades</p>
                      </div>
                    </div>
                    <p className={`font-semibold ${mistake.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(mistake.pnl, baseCurrency)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {currentReport.notableTrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Trade Evidence Highlights</CardTitle>
                <CardDescription>Concrete reviewed trades that support the monthly story with real notes, screenshots, and execution context.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-3">
                  {currentReport.notableTrades.map((trade, idx) => (
                    <div key={idx} className="rounded-2xl border bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{trade.label}</p>
                          <h3 className="mt-2 text-lg font-semibold">{trade.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{trade.setup} • {format(new Date(`${trade.date}T00:00:00`), 'MMM d, yyyy')}</p>
                        </div>
                        <Activity className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-background p-3">
                          <p className="text-muted-foreground">Net P&amp;L</p>
                          <p className={`mt-1 font-semibold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(trade.pnl, baseCurrency)}</p>
                        </div>
                        <div className="rounded-xl bg-background p-3">
                          <p className="text-muted-foreground">R Multiple</p>
                          <p className={`mt-1 font-semibold ${trade.rFactor >= 0 ? 'text-green-600' : 'text-red-600'}`}>{trade.rFactor.toFixed(2)}R</p>
                        </div>
                        <div className="rounded-xl bg-background p-3">
                          <p className="text-muted-foreground">Confidence</p>
                          <p className="mt-1 font-semibold">{trade.confidence.toFixed(1)} / 10</p>
                        </div>
                        <div className="rounded-xl bg-background p-3">
                          <p className="text-muted-foreground">Evidence</p>
                          <p className="mt-1 font-semibold">{trade.hasNotes ? 'Notes' : 'No notes'}{trade.hasScreenshot ? ' + Screenshot' : ''}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">{trade.noteSnippet}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Summary */}
          {currentReport.weeklyReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Weekly Breakdown</CardTitle>
                <CardDescription>Week-by-week client summary of activity, efficiency, and outcome.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentReport.weeklyReports.map((week, idx) => (
                    <div key={idx} className="p-4 border rounded">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold">{week.week}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(`${week.startDate}T00:00:00`), 'MMM d')} to {format(new Date(`${week.endDate}T00:00:00`), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge>{week.totalTrades} trades</Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Win Rate</p>
                          <p className="font-bold">{week.winRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">P&L</p>
                          <p className={`font-bold ${week.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {symbol}{week.totalPnL.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Best Day</p>
                          <p className="font-bold">{week.bestDay === 'N/A' ? 'N/A' : format(new Date(`${week.bestDay}T00:00:00`), 'MMM d')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg/Trade</p>
                          <p className={`font-bold ${week.avgPnLPerTrade >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {symbol}{week.avgPnLPerTrade.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
