'use client';

import { useState, useMemo, useRef } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';
import { generateMonthlyReport, generateMonthlyReportHTML } from '@/lib/reports-generator';
import { Download, FileText, Printer, Loader } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReportsGenerator() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);
  const reportElementRef = useRef<HTMLDivElement>(null);

  const symbol = CURRENCY_SYMBOLS[baseCurrency];

  const currentReport = useMemo(() => {
    return generateMonthlyReport(trades, selectedYear, selectedMonth);
  }, [trades, selectedYear, selectedMonth]);

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
        <h1 className="text-3xl font-bold">Trading Reports</h1>
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
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{currentReport.totalTrades}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold">{currentReport.winRate.toFixed(1)}%</div>
                <Progress value={currentReport.winRate} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${currentReport.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {symbol}{currentReport.totalPnL.toFixed(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{currentReport.profitFactor.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-2">Avg Win / Avg Loss</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Wins</p>
                  <p className="text-2xl font-bold text-green-600">{currentReport.totalWins}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Losses</p>
                  <p className="text-2xl font-bold text-red-600">{currentReport.totalLosses}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg P&L/Trade</p>
                  <p className={`text-2xl font-bold ${currentReport.avgPnLPerTrade >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {symbol}{currentReport.avgPnLPerTrade.toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Day</p>
                  <p className="text-2xl font-bold">{currentReport.bestDay}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Setups */}
          {currentReport.topSetups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Setups</CardTitle>
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

          {/* Weekly Summary */}
          {currentReport.weeklyReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Weekly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentReport.weeklyReports.map((week, idx) => (
                    <div key={idx} className="p-4 border rounded">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold">{week.week}</p>
                          <p className="text-sm text-muted-foreground">{week.startDate} to {week.endDate}</p>
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
                          <p className="font-bold">{week.bestDay}</p>
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
