/**
 * Trading Reports Generator
 * Generates comprehensive monthly and weekly trading reports with analytics
 */

import { Trade, Currency } from './types';
import { getTradeBasePnL, BASE_CURRENCY, CURRENCY_SYMBOLS, formatCurrency } from './trade-utils';

export interface DailyStats {
  date: string;
  dayOfWeek: string;
  trades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
}

export interface WeeklyReport {
  week: string;
  startDate: string;
  endDate: string;
  dailyStats: DailyStats[];
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPnL: number;
  avgPnLPerTrade: number;
  bestDay: string;
  worstDay: string;
  topSetups: { setup: string; trades: number; winRate: number; pnl: number }[];
  topSymbols: { symbol: string; trades: number; winRate: number; pnl: number }[];
}

export interface MonthlyReport {
  month: string;
  year: number;
  monthNumber: number;
  weeklyReports: WeeklyReport[];
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPnL: number;
  avgPnLPerTrade: number;
  profitFactor: number;
  bestDay: string;
  worstDay: string;
  bestWeek: string;
  topSetups: { setup: string; trades: number; winRate: number; pnl: number }[];
  topSymbols: { symbol: string; trades: number; winRate: number; pnl: number }[];
  emotionAnalysis: { emotion: string; count: number; winRate: number; avgPnL: number }[];
}

/**
 * Get week number from date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get week start and end dates
 */
function getWeekDates(year: number, week: number): { start: Date; end: Date } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

  const endDate = new Date(ISOweekStart);
  endDate.setDate(ISOweekStart.getDate() + 6);
  return { start: ISOweekStart, end: endDate };
}

/**
 * Generate daily statistics
 */
function generateDailyStats(date: string, dayTrades: Trade[]): DailyStats {
  const wins = dayTrades.filter(t => getTradeBasePnL(t) > 0);
  const losses = dayTrades.filter(t => getTradeBasePnL(t) < 0);
  const breakEven = dayTrades.filter(t => getTradeBasePnL(t) === 0);

  const pnlValues = dayTrades.map(t => getTradeBasePnL(t));
  const totalPnL = pnlValues.reduce((a, b) => a + b, 0);

  return {
    date,
    dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
    trades: dayTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: breakEven.length,
    winRate: dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0,
    totalPnL,
    avgWin: wins.length > 0 ? wins.reduce((a, t) => a + getTradeBasePnL(t), 0) / wins.length : 0,
    avgLoss: losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + getTradeBasePnL(t), 0) / losses.length) : 0,
    bestTrade: pnlValues.length > 0 ? Math.max(...pnlValues) : 0,
    worstTrade: pnlValues.length > 0 ? Math.min(...pnlValues) : 0,
  };
}

/**
 * Generate weekly report
 */
export function generateWeeklyReport(trades: Trade[], year: number, week: number): WeeklyReport {
  const { start, end } = getWeekDates(year, week);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const weekTrades = trades.filter(t => {
    const tradeDate = new Date(t.date).getTime();
    return tradeDate >= start.getTime() && tradeDate <= end.getTime();
  });

  // Group by day
  const dailyMap = new Map<string, Trade[]>();
  weekTrades.forEach(trade => {
    const date = trade.date;
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(trade);
  });

  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, dayTrades]) => generateDailyStats(date, dayTrades))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalWins = weekTrades.filter(t => getTradeBasePnL(t) > 0).length;
  const totalLosses = weekTrades.filter(t => getTradeBasePnL(t) < 0).length;
  const totalPnL = weekTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);

  // Top setups
  const setupMap = new Map<string, { trades: number; wins: number; pnl: number }>();
  weekTrades.forEach(trade => {
    const existing = setupMap.get(trade.setupName) || { trades: 0, wins: 0, pnl: 0 };
    existing.trades++;
    if (getTradeBasePnL(trade) > 0) existing.wins++;
    existing.pnl += getTradeBasePnL(trade);
    setupMap.set(trade.setupName, existing);
  });

  const topSetups = Array.from(setupMap.entries())
    .map(([setup, data]) => ({
      setup,
      ...data,
      winRate: (data.wins / data.trades) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  // Top symbols
  const symbolMap = new Map<string, { trades: number; wins: number; pnl: number }>();
  weekTrades.forEach(trade => {
    const existing = symbolMap.get(trade.symbol) || { trades: 0, wins: 0, pnl: 0 };
    existing.trades++;
    if (getTradeBasePnL(trade) > 0) existing.wins++;
    existing.pnl += getTradeBasePnL(trade);
    symbolMap.set(trade.symbol, existing);
  });

  const topSymbols = Array.from(symbolMap.entries())
    .map(([symbol, data]) => ({
      symbol,
      ...data,
      winRate: (data.wins / data.trades) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  const bestDay = dailyStats.length > 0 ? dailyStats.reduce((a, b) => b.totalPnL > a.totalPnL ? b : a).date : 'N/A';
  const worstDay = dailyStats.length > 0 ? dailyStats.reduce((a, b) => b.totalPnL < a.totalPnL ? b : a).date : 'N/A';

  return {
    week: `W${week}`,
    startDate: startStr,
    endDate: endStr,
    dailyStats,
    totalTrades: weekTrades.length,
    totalWins,
    totalLosses,
    winRate: weekTrades.length > 0 ? (totalWins / weekTrades.length) * 100 : 0,
    totalPnL,
    avgPnLPerTrade: weekTrades.length > 0 ? totalPnL / weekTrades.length : 0,
    bestDay,
    worstDay,
    topSetups,
    topSymbols,
  };
}

/**
 * Generate monthly report
 */
export function generateMonthlyReport(trades: Trade[], year: number, month: number): MonthlyReport {
  const monthTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month - 1;
  });

  // Generate weekly reports
  const weeklyReports: WeeklyReport[] = [];
  for (let week = 1; week <= 53; week++) {
    const { start } = getWeekDates(year, week);
    if (start.getFullYear() !== year || start.getMonth() !== month - 1 && week > 1) {
      const prevWeek = getWeekDates(year, week - 1);
      if (prevWeek.end.getMonth() !== month - 1) break;
    }

    const weeksInMonth = getWeekDates(year, week);
    if (weeksInMonth.start.getMonth() === month - 1 || weeksInMonth.end.getMonth() === month - 1) {
      const report = generateWeeklyReport(monthTrades, year, week);
      if (report.totalTrades > 0) {
        weeklyReports.push(report);
      }
    }
  }

  const totalWins = monthTrades.filter(t => getTradeBasePnL(t) > 0).length;
  const totalLosses = monthTrades.filter(t => getTradeBasePnL(t) < 0).length;
  const totalPnL = monthTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);

  const avgWin = totalWins > 0 ? monthTrades.filter(t => getTradeBasePnL(t) > 0).reduce((a, t) => a + getTradeBasePnL(t), 0) / totalWins : 0;
  const avgLoss = totalLosses > 0 ? Math.abs(monthTrades.filter(t => getTradeBasePnL(t) < 0).reduce((a, t) => a + getTradeBasePnL(t), 0) / totalLosses) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Emotion analysis
  const emotionMap = new Map<string, { count: number; wins: number; pnl: number }>();
  monthTrades.forEach(trade => {
    const emotions = [];
    if (trade.emotionEntry) emotions.push(trade.emotionEntry);
    if (trade.emotionExit) emotions.push(trade.emotionExit);

    emotions.forEach(emotion => {
      const existing = emotionMap.get(emotion) || { count: 0, wins: 0, pnl: 0 };
      existing.count++;
      if (getTradeBasePnL(trade) > 0) existing.wins++;
      existing.pnl += getTradeBasePnL(trade);
      emotionMap.set(emotion, existing);
    });
  });

  const emotionAnalysis = Array.from(emotionMap.entries())
    .map(([emotion, data]) => ({
      emotion,
      ...data,
      winRate: (data.wins / data.count) * 100,
      avgPnL: data.pnl / data.count,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  // Top setups
  const setupMap = new Map<string, { trades: number; wins: number; pnl: number }>();
  monthTrades.forEach(trade => {
    const existing = setupMap.get(trade.setupName) || { trades: 0, wins: 0, pnl: 0 };
    existing.trades++;
    if (getTradeBasePnL(trade) > 0) existing.wins++;
    existing.pnl += getTradeBasePnL(trade);
    setupMap.set(trade.setupName, existing);
  });

  const topSetups = Array.from(setupMap.entries())
    .map(([setup, data]) => ({
      setup,
      ...data,
      winRate: (data.wins / data.trades) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  // Top symbols
  const symbolMap = new Map<string, { trades: number; wins: number; pnl: number }>();
  monthTrades.forEach(trade => {
    const existing = symbolMap.get(trade.symbol) || { trades: 0, wins: 0, pnl: 0 };
    existing.trades++;
    if (getTradeBasePnL(trade) > 0) existing.wins++;
    existing.pnl += getTradeBasePnL(trade);
    symbolMap.set(trade.symbol, existing);
  });

  const topSymbols = Array.from(symbolMap.entries())
    .map(([symbol, data]) => ({
      symbol,
      ...data,
      winRate: (data.wins / data.trades) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  const monthTeeds = monthTrades.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month - 1;
  });
  const bestDay = monthTeeds.length > 0 ? monthTeeds.reduce((a, b) => getTradeBasePnL(b) > getTradeBasePnL(a) ? b : a).date : 'N/A';
  const worstDay = monthTeeds.length > 0 ? monthTeeds.reduce((a, b) => getTradeBasePnL(b) < getTradeBasePnL(a) ? b : a).date : 'N/A';

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const bestWeek = weeklyReports.length > 0 ? weeklyReports.reduce((a, b) => b.totalPnL > a.totalPnL ? b : a).week : 'N/A';

  return {
    month: monthNames[month - 1],
    year,
    monthNumber: month,
    weeklyReports,
    totalTrades: monthTrades.length,
    totalWins,
    totalLosses,
    winRate: monthTrades.length > 0 ? (totalWins / monthTrades.length) * 100 : 0,
    totalPnL,
    avgPnLPerTrade: monthTrades.length > 0 ? totalPnL / monthTrades.length : 0,
    profitFactor,
    bestDay,
    worstDay,
    bestWeek,
    topSetups,
    topSymbols,
    emotionAnalysis,
  };
}

/**
 * Export report as HTML for PDF generation
 */
export function generateMonthlyReportHTML(report: MonthlyReport, baseCurrency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[baseCurrency];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Trading Report - ${report.month} ${report.year}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { background: white; padding: 20px; border-radius: 8px; max-width: 1000px; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .metric { background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:hover { background: #f9f9f9; }
        .week-section { margin: 30px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
        .emotion-good { background: #d4edda; }
        .emotion-bad { background: #f8d7da; }
        footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Trading Report - ${report.month} ${report.year}</h1>
        
        <div class="metrics">
          <div class="metric">
            <div class="metric-value">${report.totalTrades}</div>
            <div class="metric-label">Total Trades</div>
          </div>
          <div class="metric">
            <div class="metric-value">${report.winRate.toFixed(1)}%</div>
            <div class="metric-label">Win Rate</div>
          </div>
          <div class="metric">
            <div class="metric-value ${report.totalPnL >= 0 ? 'positive' : 'negative'}">${symbol}${report.totalPnL.toFixed(2)}</div>
            <div class="metric-label">Total P&L</div>
          </div>
          <div class="metric">
            <div class="metric-value">${report.profitFactor.toFixed(2)}</div>
            <div class="metric-label">Profit Factor</div>
          </div>
        </div>

        <h2>Performance Summary</h2>
        <table>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Wins / Losses</td>
            <td>${report.totalWins} / ${report.totalLosses}</td>
          </tr>
          <tr>
            <td>Avg P&L per Trade</td>
            <td class="${report.avgPnLPerTrade >= 0 ? 'positive' : 'negative'}">${symbol}${report.avgPnLPerTrade.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Best Day</td>
            <td>${report.bestDay}</td>
          </tr>
          <tr>
            <td>Worst Day</td>
            <td>${report.worstDay}</td>
          </tr>
          <tr>
            <td>Best Week</td>
            <td>${report.bestWeek}</td>
          </tr>
        </table>

        <h2>Top Setups</h2>
        <table>
          <tr>
            <th>Setup</th>
            <th>Trades</th>
            <th>Win Rate</th>
            <th>P&L</th>
          </tr>
          ${report.topSetups.map(s => `
            <tr>
              <td>${s.setup}</td>
              <td>${s.trades}</td>
              <td>${s.winRate.toFixed(1)}%</td>
              <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${symbol}${s.pnl.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>

        <h2>Top Symbols</h2>
        <table>
          <tr>
            <th>Symbol</th>
            <th>Trades</th>
            <th>Win Rate</th>
            <th>P&L</th>
          </tr>
          ${report.topSymbols.map(s => `
            <tr>
              <td>${s.symbol}</td>
              <td>${s.trades}</td>
              <td>${s.winRate.toFixed(1)}%</td>
              <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${symbol}${s.pnl.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>

        ${report.emotionAnalysis.length > 0 ? `
          <h2>Emotion Analysis</h2>
          <table>
            <tr>
              <th>Emotion</th>
              <th>Trades</th>
              <th>Win Rate</th>
              <th>Avg P&L</th>
            </tr>
            ${report.emotionAnalysis.map(e => `
              <tr class="${e.winRate > 50 ? 'emotion-good' : 'emotion-bad'}">
                <td>${e.emotion}</td>
                <td>${e.count}</td>
                <td>${e.winRate.toFixed(1)}%</td>
                <td class="${e.avgPnL >= 0 ? 'positive' : 'negative'}">${symbol}${e.avgPnL.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}

        <footer>
          <p>Generated on ${new Date().toLocaleDateString()} | Trading Journal</p>
        </footer>
      </div>
    </body>
    </html>
  `;

  return html;
}
