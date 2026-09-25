/**
 * Trading Reports Generator
 * Generates comprehensive monthly and weekly trading reports with analytics
 */

import { Trade, Currency } from './types';
import { getTradeBasePnL, BASE_CURRENCY, CURRENCY_SYMBOLS, convertToBaseCurrency, formatCurrency } from './trade-utils';
import { format } from 'date-fns';

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
  dailyStats: DailyStats[];
  totalTrades: number;
  activeDays: number;
  averageTradesPerDay: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPnL: number;
  averageDailyPnL: number;
  grossProfit: number;
  grossLoss: number;
  avgPnLPerTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
  totalFees: number;
  documentedTrades: number;
  screenshotCoverage: number;
  notesCoverage: number;
  ruleFollowedRate: number;
  avgConfidence: number;
  profitableDays: number;
  losingDays: number;
  flatDays: number;
  profitableDayRate: number;
  avgGreenDay: number;
  avgRedDay: number;
  maxDrawdown: number;
  averageR: number;
  bestR: number;
  worstR: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: string;
  bestDay: string;
  worstDay: string;
  bestWeek: string;
  executiveSummary: string;
  keyInsights: string[];
  topMistakes: { label: string; count: number; pnl: number }[];
  notableTrades: {
    label: string;
    symbol: string;
    setup: string;
    date: string;
    pnl: number;
    rFactor: number;
    confidence: number;
    hasScreenshot: boolean;
    hasNotes: boolean;
    noteSnippet: string;
  }[];
  topSetups: { setup: string; trades: number; winRate: number; pnl: number }[];
  topSymbols: { symbol: string; trades: number; winRate: number; pnl: number }[];
  emotionAnalysis: { emotion: string; count: number; winRate: number; avgPnL: number }[];
}

function formatReportDate(date: string): string {
  return format(new Date(`${date}T00:00:00`), 'MMM d, yyyy');
}

function buildExecutiveSummary(report: Omit<MonthlyReport, 'executiveSummary'>): string {
  const pnlDirection = report.totalPnL >= 0 ? 'net profit' : 'net loss';
  const disciplineDirection =
    report.ruleFollowedRate >= 80 ? 'strong rule adherence' :
    report.ruleFollowedRate >= 60 ? 'moderate rule adherence' :
    'discipline needs attention';
  const activityLevel =
    report.activeDays >= 15 ? 'consistent market participation' :
    report.activeDays >= 8 ? 'selective trading activity' :
    'light trading activity';

  return `${report.month} ${report.year} shows ${activityLevel} across ${report.totalTrades} recorded trades over ${report.activeDays} active trading days, finishing with a ${pnlDirection} of ${formatCurrency(report.totalPnL, BASE_CURRENCY)} and a ${report.winRate.toFixed(1)}% win rate. Average outcome per trade was ${formatCurrency(report.avgPnLPerTrade, BASE_CURRENCY)}, profit factor closed at ${report.profitFactor.toFixed(2)}, and documentation coverage reached ${report.documentedTrades} trades with ${disciplineDirection}.`;
}

function buildTradeSnippet(trade: Trade): string {
  const raw = trade.postNotes?.trim() || trade.notes?.trim() || trade.preNotes?.trim() || '';
  if (!raw) return 'No written note captured for this trade.';
  return raw.length > 140 ? `${raw.slice(0, 137)}...` : raw;
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
  const totalFees = monthTrades.reduce((sum, trade) => {
    return sum + convertToBaseCurrency(trade.fees || 0, trade.currency || BASE_CURRENCY, trade.exchangeRate);
  }, 0);
  const grossTradePnLs = monthTrades.map((trade) => {
    const feeAmount = convertToBaseCurrency(trade.fees || 0, trade.currency || BASE_CURRENCY, trade.exchangeRate);
    return getTradeBasePnL(trade) + feeAmount;
  });
  const grossProfit = grossTradePnLs.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(grossTradePnLs.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));

  const avgWin = totalWins > 0 ? monthTrades.filter(t => getTradeBasePnL(t) > 0).reduce((a, t) => a + getTradeBasePnL(t), 0) / totalWins : 0;
  const avgLoss = totalLosses > 0 ? Math.abs(monthTrades.filter(t => getTradeBasePnL(t) < 0).reduce((a, t) => a + getTradeBasePnL(t), 0) / totalLosses) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
  const expectancy = monthTrades.length > 0 ? totalPnL / monthTrades.length : 0;

  const dailyTradeMap = new Map<string, Trade[]>();
  monthTrades.forEach((trade) => {
    const existing = dailyTradeMap.get(trade.date) || [];
    existing.push(trade);
    dailyTradeMap.set(trade.date, existing);
  });

  const dailyStats = Array.from(dailyTradeMap.entries())
    .map(([date, dayTrades]) => generateDailyStats(date, dayTrades))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const activeDays = dailyStats.length;
  const averageTradesPerDay = activeDays > 0 ? monthTrades.length / activeDays : 0;
  const averageDailyPnL = activeDays > 0 ? totalPnL / activeDays : 0;
  const bestTrade = monthTrades.length > 0 ? Math.max(...monthTrades.map((trade) => getTradeBasePnL(trade))) : 0;
  const worstTrade = monthTrades.length > 0 ? Math.min(...monthTrades.map((trade) => getTradeBasePnL(trade))) : 0;
  const documentedTrades = monthTrades.filter((trade) => {
    const hasNotes = Boolean(trade.preNotes?.trim() || trade.postNotes?.trim() || trade.notes?.trim());
    const hasScreenshot = Boolean(trade.beforeTradeScreenshot || trade.afterExitScreenshot || trade.hftScreenshot);
    return hasNotes || hasScreenshot;
  }).length;
  const screenshotCoverage = monthTrades.length > 0
    ? (monthTrades.filter((trade) => trade.beforeTradeScreenshot || trade.afterExitScreenshot || trade.hftScreenshot).length / monthTrades.length) * 100
    : 0;
  const notesCoverage = monthTrades.length > 0
    ? (monthTrades.filter((trade) => trade.preNotes?.trim() || trade.postNotes?.trim() || trade.notes?.trim()).length / monthTrades.length) * 100
    : 0;
  const ruleFollowedRate = monthTrades.length > 0
    ? (monthTrades.filter((trade) => trade.ruleFollowed !== false).length / monthTrades.length) * 100
    : 0;
  const avgConfidence = monthTrades.length > 0
    ? monthTrades.reduce((sum, trade) => sum + (Number.isFinite(trade.confidence) ? trade.confidence : 0), 0) / monthTrades.length
    : 0;
  const profitableDays = dailyStats.filter((day) => day.totalPnL > 0).length;
  const losingDays = dailyStats.filter((day) => day.totalPnL < 0).length;
  const flatDays = dailyStats.filter((day) => day.totalPnL === 0).length;
  const profitableDayRate = activeDays > 0 ? (profitableDays / activeDays) * 100 : 0;
  const avgGreenDay = profitableDays > 0
    ? dailyStats.filter((day) => day.totalPnL > 0).reduce((sum, day) => sum + day.totalPnL, 0) / profitableDays
    : 0;
  const avgRedDay = losingDays > 0
    ? Math.abs(dailyStats.filter((day) => day.totalPnL < 0).reduce((sum, day) => sum + day.totalPnL, 0) / losingDays)
    : 0;
  const averageR = monthTrades.length > 0 ? monthTrades.reduce((sum, trade) => sum + (trade.rFactor || 0), 0) / monthTrades.length : 0;
  const bestR = monthTrades.length > 0 ? Math.max(...monthTrades.map((trade) => trade.rFactor || 0)) : 0;
  const worstR = monthTrades.length > 0 ? Math.min(...monthTrades.map((trade) => trade.rFactor || 0)) : 0;

  const sortedTrades = [...monthTrades].sort((a, b) => {
    const aDate = `${a.date}T${a.entryTime || '00:00'}`;
    const bDate = `${b.date}T${b.entryTime || '00:00'}`;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });

  let cumulativePnL = 0;
  let runningPeak = 0;
  let maxDrawdown = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  sortedTrades.forEach((trade) => {
    const pnl = getTradeBasePnL(trade);
    cumulativePnL += pnl;
    runningPeak = Math.max(runningPeak, cumulativePnL);
    maxDrawdown = Math.max(maxDrawdown, runningPeak - cumulativePnL);

    if (pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
    } else if (pnl < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
  });

  const trailingTrades = [...sortedTrades].reverse();
  let trailingWinStreak = 0;
  let trailingLossStreak = 0;
  for (const trade of trailingTrades) {
    const pnl = getTradeBasePnL(trade);
    if (pnl > 0 && trailingLossStreak === 0) {
      trailingWinStreak += 1;
      continue;
    }
    if (pnl < 0 && trailingWinStreak === 0) {
      trailingLossStreak += 1;
      continue;
    }
    break;
  }
  const currentStreak = trailingWinStreak > 0
    ? `${trailingWinStreak} winning trades`
    : trailingLossStreak > 0
      ? `${trailingLossStreak} losing trades`
      : 'No active streak';

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

  const dayOfWeekMap = new Map<string, { pnl: number; trades: number }>();
  dailyStats.forEach((day) => {
    const existing = dayOfWeekMap.get(day.dayOfWeek) || { pnl: 0, trades: 0 };
    existing.pnl += day.totalPnL;
    existing.trades += day.trades;
    dayOfWeekMap.set(day.dayOfWeek, existing);
  });
  const strongestWeekday = Array.from(dayOfWeekMap.entries()).sort((a, b) => b[1].pnl - a[1].pnl)[0];

  const mistakeMap = new Map<string, { count: number; pnl: number }>();
  monthTrades.forEach((trade) => {
    const tags = trade.mistakeTag ? [trade.mistakeTag] : [];
    tags.forEach((tag) => {
      const existing = mistakeMap.get(tag) || { count: 0, pnl: 0 };
      existing.count += 1;
      existing.pnl += getTradeBasePnL(trade);
      mistakeMap.set(tag, existing);
    });
  });
  const topMistakes = Array.from(mistakeMap.entries())
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => a.pnl - b.pnl)
    .slice(0, 4);

  const documentedSorted = sortedTrades.filter((trade) => {
    return Boolean(trade.beforeTradeScreenshot || trade.afterExitScreenshot || trade.hftScreenshot || trade.preNotes?.trim() || trade.postNotes?.trim() || trade.notes?.trim());
  });
  const bestDocumentedTrade = [...documentedSorted].sort((a, b) => getTradeBasePnL(b) - getTradeBasePnL(a))[0];
  const worstDocumentedTrade = [...documentedSorted].sort((a, b) => getTradeBasePnL(a) - getTradeBasePnL(b))[0];
  const highestConfidenceTrade = [...sortedTrades].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];

  const notableTrades = [bestDocumentedTrade, worstDocumentedTrade, highestConfidenceTrade]
    .filter((trade, index, arr): trade is Trade => Boolean(trade) && arr.findIndex((candidate) => candidate?.id === trade?.id) === index)
    .map((trade, index) => ({
      label: index === 0 ? 'Best Documented Trade' : index === 1 ? 'Most Costly Reviewed Trade' : 'Highest Confidence Trade',
      symbol: trade.symbol,
      setup: trade.setupName,
      date: trade.date,
      pnl: getTradeBasePnL(trade),
      rFactor: trade.rFactor || 0,
      confidence: trade.confidence || 0,
      hasScreenshot: Boolean(trade.beforeTradeScreenshot || trade.afterExitScreenshot || trade.hftScreenshot),
      hasNotes: Boolean(trade.preNotes?.trim() || trade.postNotes?.trim() || trade.notes?.trim()),
      noteSnippet: buildTradeSnippet(trade),
    }));

  const bestDay = dailyStats.length > 0 ? dailyStats.reduce((a, b) => b.totalPnL > a.totalPnL ? b : a).date : 'N/A';
  const worstDay = dailyStats.length > 0 ? dailyStats.reduce((a, b) => b.totalPnL < a.totalPnL ? b : a).date : 'N/A';

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const bestWeek = weeklyReports.length > 0 ? weeklyReports.reduce((a, b) => b.totalPnL > a.totalPnL ? b : a).week : 'N/A';
  const weakestSetup = Array.from(setupMap.entries())
    .map(([setup, data]) => ({ setup, ...data }))
    .sort((a, b) => a.pnl - b.pnl)[0];
  const strongestSetup = topSetups[0];
  const keyInsights = [
    `${profitableDayRate.toFixed(1)}% of active trading days finished green, with the average green day at ${formatCurrency(avgGreenDay, BASE_CURRENCY)} and the average red day at ${formatCurrency(-avgRedDay, BASE_CURRENCY)}.`,
    `Maximum drawdown for the month was ${formatCurrency(-maxDrawdown, BASE_CURRENCY)} while the longest winning streak reached ${maxWinStreak} trades and the longest losing streak reached ${maxLossStreak} trades.`,
    strongestSetup ? `The strongest setup was ${strongestSetup.setup}, producing ${formatCurrency(strongestSetup.pnl, BASE_CURRENCY)} across ${strongestSetup.trades} trades at a ${strongestSetup.winRate.toFixed(1)}% win rate.` : 'No setup concentration insight available for this month.',
    weakestSetup ? `The weakest setup was ${weakestSetup.setup}, which contributed ${formatCurrency(weakestSetup.pnl, BASE_CURRENCY)} and should be reviewed for rule quality, timing, or sizing.` : 'No weak setup insight available for this month.',
    strongestWeekday ? `${strongestWeekday[0]} delivered the strongest cumulative output this month with ${formatCurrency(strongestWeekday[1].pnl, BASE_CURRENCY)} across ${strongestWeekday[1].trades} trades.` : 'No day-of-week edge was measurable for this month.',
    topMistakes[0] ? `The most expensive recorded mistake pattern was "${topMistakes[0].label}", appearing ${topMistakes[0].count} times and contributing ${formatCurrency(topMistakes[0].pnl, BASE_CURRENCY)}.` : 'No mistake-tag pattern was captured this month.',
  ];

  const baseReport = {
    month: monthNames[month - 1],
    year,
    monthNumber: month,
    weeklyReports,
    dailyStats,
    totalTrades: monthTrades.length,
    activeDays,
    averageTradesPerDay,
    totalWins,
    totalLosses,
    winRate: monthTrades.length > 0 ? (totalWins / monthTrades.length) * 100 : 0,
    totalPnL,
    averageDailyPnL,
    grossProfit,
    grossLoss,
    avgPnLPerTrade: monthTrades.length > 0 ? totalPnL / monthTrades.length : 0,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    bestTrade,
    worstTrade,
    totalFees,
    documentedTrades,
    screenshotCoverage,
    notesCoverage,
    ruleFollowedRate,
    avgConfidence,
    profitableDays,
    losingDays,
    flatDays,
    profitableDayRate,
    avgGreenDay,
    avgRedDay,
    maxDrawdown,
    averageR,
    bestR,
    worstR,
    maxWinStreak,
    maxLossStreak,
    currentStreak,
    bestDay,
    worstDay,
    bestWeek,
    keyInsights,
    topMistakes,
    notableTrades,
    topSetups,
    topSymbols,
    emotionAnalysis,
  };

  return {
    ...baseReport,
    executiveSummary: buildExecutiveSummary(baseReport),
  };
}

/**
 * Export report as HTML for PDF generation
 */
export function generateMonthlyReportHTML(report: MonthlyReport, baseCurrency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[baseCurrency];
  const formattedGeneratedDate = format(new Date(), 'MMM d, yyyy, HH:mm');
  const summaryToneClass = report.totalPnL >= 0 ? 'tone-positive' : 'tone-negative';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trading Report - ${report.month} ${report.year}</title>
      <style>
        :root {
          --bg: #eef2f7;
          --paper: #ffffff;
          --ink: #162033;
          --muted: #5f6b82;
          --line: #d8dfeb;
          --brand: #1d4ed8;
          --brand-soft: #dbeafe;
          --positive: #15803d;
          --negative: #b91c1c;
          --warning: #92400e;
          --card: #f8fafc;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 28px;
          background: linear-gradient(180deg, #f7f9fc 0%, #edf2f8 100%);
          color: var(--ink);
          font-family: "Segoe UI", Arial, sans-serif;
        }
        .container {
          max-width: 1120px;
          margin: 0 auto;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
        }
        .hero {
          padding: 32px;
          background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
          color: white;
        }
        .hero-top {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }
        .eyebrow {
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.72;
          margin-bottom: 10px;
        }
        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
        }
        .hero-meta {
          min-width: 220px;
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.16);
        }
        .hero-meta strong,
        .hero-meta span {
          display: block;
        }
        .hero-meta strong {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 6px;
          opacity: 0.72;
        }
        .hero-meta span {
          font-size: 15px;
          margin-bottom: 14px;
        }
        .summary {
          margin-top: 22px;
          padding: 20px 22px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.16);
          line-height: 1.7;
        }
        .summary.${summaryToneClass} {
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .section {
          padding: 28px 32px 8px;
        }
        h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }
        .section-copy {
          margin: 0 0 18px;
          color: var(--muted);
          line-height: 1.6;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 0 0 24px;
        }
        .metric {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 18px;
        }
        .metric-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          margin-bottom: 10px;
        }
        .metric-value {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.1;
        }
        .metric-foot {
          margin-top: 8px;
          color: var(--muted);
          font-size: 13px;
        }
        .positive { color: var(--positive); }
        .negative { color: var(--negative); }
        .cards-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }
        .detail-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 20px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .insight-list {
          margin: 0 0 22px;
          padding-left: 20px;
          color: var(--ink);
          line-height: 1.7;
        }
        .insight-list li {
          margin-bottom: 10px;
        }
        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }
        .evidence-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px;
        }
        .evidence-card h3 {
          margin: 0 0 10px;
          font-size: 16px;
        }
        .evidence-meta {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 10px;
        }
        .evidence-note {
          margin-top: 10px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--ink);
        }
        .detail-label {
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .detail-value {
          font-size: 17px;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 0 22px;
          background: white;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
        }
        th, td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
        }
        th {
          background: #f8fbff;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }
        tbody tr:nth-child(even) {
          background: #fbfdff;
        }
        .tag {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--brand-soft);
          color: var(--brand);
          font-size: 12px;
          font-weight: 600;
        }
        .footer {
          padding: 18px 32px 28px;
          color: var(--muted);
          font-size: 12px;
        }
        @media print {
          body {
            padding: 0;
            background: white;
          }
          .container {
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
        }
        @media (max-width: 900px) {
          .hero-top,
          .metrics,
          .cards-2,
          .detail-grid,
          .evidence-grid {
            grid-template-columns: 1fr;
            display: grid;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          <div class="hero-top">
            <div>
              <div class="eyebrow">Client Performance Report</div>
              <h1>Trading Report - ${report.month} ${report.year}</h1>
            </div>
            <div class="hero-meta">
              <strong>Base Currency</strong>
              <span>${baseCurrency}</span>
              <strong>Reporting Period</strong>
              <span>${report.month} ${report.year}</span>
              <strong>Generated</strong>
              <span>${formattedGeneratedDate}</span>
            </div>
          </div>
          <div class="summary ${summaryToneClass}">
            ${report.executiveSummary}
          </div>
        </div>

        <div class="section">
          <h2>Executive Metrics</h2>
          <p class="section-copy">A concise view of performance, consistency, and trading activity for the selected period.</p>
          <div class="metrics">
            <div class="metric">
              <div class="metric-label">Net P&amp;L</div>
              <div class="metric-value ${report.totalPnL >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.totalPnL, baseCurrency)}</div>
              <div class="metric-foot">${report.totalWins} wins / ${report.totalLosses} losses</div>
            </div>
            <div class="metric">
              <div class="metric-label">Win Rate</div>
              <div class="metric-value">${report.winRate.toFixed(1)}%</div>
              <div class="metric-foot">${report.totalTrades} total trades</div>
            </div>
            <div class="metric">
              <div class="metric-label">Profit Factor</div>
              <div class="metric-value">${report.profitFactor.toFixed(2)}</div>
              <div class="metric-foot">Expectancy ${formatCurrency(report.expectancy, baseCurrency)} per trade</div>
            </div>
            <div class="metric">
              <div class="metric-label">Active Trading Days</div>
              <div class="metric-value">${report.activeDays}</div>
              <div class="metric-foot">${report.averageTradesPerDay.toFixed(1)} trades per active day</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Performance Quality</h2>
          <p class="section-copy">These metrics help explain not just the result, but the quality and repeatability of execution.</p>
          <div class="cards-2">
            <div class="detail-card">
              <div class="detail-grid">
                <div>
                  <div class="detail-label">Average Trade</div>
                  <div class="detail-value ${report.avgPnLPerTrade >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.avgPnLPerTrade, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Average Day</div>
                  <div class="detail-value ${report.averageDailyPnL >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.averageDailyPnL, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Average Win</div>
                  <div class="detail-value positive">${formatCurrency(report.avgWin, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Average Loss</div>
                  <div class="detail-value negative">${formatCurrency(report.avgLoss, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Best Trade</div>
                  <div class="detail-value positive">${formatCurrency(report.bestTrade, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Worst Trade</div>
                  <div class="detail-value negative">${formatCurrency(report.worstTrade, baseCurrency)}</div>
                </div>
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-grid">
                <div>
                  <div class="detail-label">Gross Profit</div>
                  <div class="detail-value positive">${formatCurrency(report.grossProfit, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Gross Loss</div>
                  <div class="detail-value negative">${formatCurrency(report.grossLoss, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Recorded Fees</div>
                  <div class="detail-value">${formatCurrency(report.totalFees, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Average Confidence</div>
                  <div class="detail-value">${report.avgConfidence.toFixed(1)} / 10</div>
                </div>
                <div>
                  <div class="detail-label">Best Day</div>
                  <div class="detail-value">${report.bestDay === 'N/A' ? 'N/A' : formatReportDate(report.bestDay)}</div>
                </div>
                <div>
                  <div class="detail-label">Best Week</div>
                  <div class="detail-value">${report.bestWeek}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Consistency & Risk</h2>
          <p class="section-copy">Clients usually care about steadiness as much as profit. These metrics explain the shape of performance and the amount of stress taken to earn it.</p>
          <div class="cards-2">
            <div class="detail-card">
              <div class="detail-grid">
                <div>
                  <div class="detail-label">Profitable Days</div>
                  <div class="detail-value">${report.profitableDays} / ${report.activeDays}</div>
                </div>
                <div>
                  <div class="detail-label">Green Day Rate</div>
                  <div class="detail-value">${report.profitableDayRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div class="detail-label">Average Green Day</div>
                  <div class="detail-value positive">${formatCurrency(report.avgGreenDay, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Average Red Day</div>
                  <div class="detail-value negative">${formatCurrency(-report.avgRedDay, baseCurrency)}</div>
                </div>
                <div>
                  <div class="detail-label">Current Streak</div>
                  <div class="detail-value">${report.currentStreak}</div>
                </div>
                <div>
                  <div class="detail-label">Max Drawdown</div>
                  <div class="detail-value negative">${formatCurrency(-report.maxDrawdown, baseCurrency)}</div>
                </div>
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-grid">
                <div>
                  <div class="detail-label">Average R</div>
                  <div class="detail-value ${report.averageR >= 0 ? 'positive' : 'negative'}">${report.averageR.toFixed(2)}R</div>
                </div>
                <div>
                  <div class="detail-label">Best R</div>
                  <div class="detail-value positive">${report.bestR.toFixed(2)}R</div>
                </div>
                <div>
                  <div class="detail-label">Worst R</div>
                  <div class="detail-value negative">${report.worstR.toFixed(2)}R</div>
                </div>
                <div>
                  <div class="detail-label">Max Win Streak</div>
                  <div class="detail-value">${report.maxWinStreak}</div>
                </div>
                <div>
                  <div class="detail-label">Max Loss Streak</div>
                  <div class="detail-value">${report.maxLossStreak}</div>
                </div>
                <div>
                  <div class="detail-label">Flat Days</div>
                  <div class="detail-value">${report.flatDays}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Documentation & Discipline</h2>
          <p class="section-copy">This section shows whether the trading process is being documented thoroughly enough to review with accountability.</p>
          <table>
            <thead>
              <tr>
                <th>Process Metric</th>
                <th>Result</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Documented Trades</td>
                <td>${report.documentedTrades} / ${report.totalTrades}</td>
                <td>${((report.documentedTrades / Math.max(report.totalTrades, 1)) * 100).toFixed(1)}% of trades include notes or screenshots.</td>
              </tr>
              <tr>
                <td>Screenshot Coverage</td>
                <td>${report.screenshotCoverage.toFixed(1)}%</td>
                <td>Shareable evidence of market context and execution.</td>
              </tr>
              <tr>
                <td>Notes Coverage</td>
                <td>${report.notesCoverage.toFixed(1)}%</td>
                <td>Supports review of preparation, execution, and learning.</td>
              </tr>
              <tr>
                <td>Rule Followed Rate</td>
                <td>${report.ruleFollowedRate.toFixed(1)}%</td>
                <td>Measures process discipline across the month.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Key Insights</h2>
          <p class="section-copy">A concise narrative of what is working, what is not, and where the strongest review focus should be.</p>
          <ul class="insight-list">
            ${report.keyInsights.map((insight) => `<li>${insight}</li>`).join('')}
          </ul>
        </div>

        ${report.topMistakes.length > 0 ? `
          <div class="section">
            <h2>Mistake Pattern Review</h2>
            <p class="section-copy">When mistake tags are captured, they give clients and coaches a direct view into avoidable leakage.</p>
            <table>
              <thead>
                <tr>
                  <th>Mistake Pattern</th>
                  <th>Count</th>
                  <th>Net Impact</th>
                </tr>
              </thead>
              <tbody>
                ${report.topMistakes.map((mistake) => `
                  <tr>
                    <td>${mistake.label}</td>
                    <td>${mistake.count}</td>
                    <td class="${mistake.pnl >= 0 ? 'positive' : 'negative'}">${formatCurrency(mistake.pnl, baseCurrency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${report.notableTrades.length > 0 ? `
          <div class="section">
            <h2>Trade Evidence Highlights</h2>
            <p class="section-copy">A few representative trades that help validate the month with actual reviewed examples, not just summary statistics.</p>
            <div class="evidence-grid">
              ${report.notableTrades.map((trade) => `
                <div class="evidence-card">
                  <h3>${trade.label}</h3>
                  <div class="evidence-meta">${trade.symbol} • ${trade.setup} • ${formatReportDate(trade.date)}</div>
                  <div class="detail-grid">
                    <div>
                      <div class="detail-label">Net P&amp;L</div>
                      <div class="detail-value ${trade.pnl >= 0 ? 'positive' : 'negative'}">${formatCurrency(trade.pnl, baseCurrency)}</div>
                    </div>
                    <div>
                      <div class="detail-label">R Multiple</div>
                      <div class="detail-value ${trade.rFactor >= 0 ? 'positive' : 'negative'}">${trade.rFactor.toFixed(2)}R</div>
                    </div>
                    <div>
                      <div class="detail-label">Confidence</div>
                      <div class="detail-value">${trade.confidence.toFixed(1)} / 10</div>
                    </div>
                    <div>
                      <div class="detail-label">Evidence</div>
                      <div class="detail-value">${trade.hasNotes ? 'Notes' : 'No notes'}${trade.hasScreenshot ? ' + Screenshot' : ''}</div>
                    </div>
                  </div>
                  <div class="evidence-note">${trade.noteSnippet}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="section">
          <h2>Top Setups</h2>
          <p class="section-copy">The strongest recurring setups by net output, helping identify where the trading edge is concentrated.</p>
          <table>
            <thead>
              <tr>
                <th>Setup</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Net P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              ${report.topSetups.map(s => `
                <tr>
                  <td><span class="tag">${s.setup}</span></td>
                  <td>${s.trades}</td>
                  <td>${s.winRate.toFixed(1)}%</td>
                  <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${formatCurrency(s.pnl, baseCurrency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Top Symbols</h2>
          <p class="section-copy">The instruments that contributed most to monthly performance.</p>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Net P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              ${report.topSymbols.map(s => `
                <tr>
                  <td><span class="tag">${s.symbol}</span></td>
                  <td>${s.trades}</td>
                  <td>${s.winRate.toFixed(1)}%</td>
                  <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${formatCurrency(s.pnl, baseCurrency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Weekly Breakdown</h2>
          <p class="section-copy">A week-by-week summary of activity and output to help clients see consistency through the month.</p>
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Period</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Avg / Trade</th>
                <th>Net P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              ${report.weeklyReports.map(week => `
                <tr>
                  <td>${week.week}</td>
                  <td>${formatReportDate(week.startDate)} - ${formatReportDate(week.endDate)}</td>
                  <td>${week.totalTrades}</td>
                  <td>${week.winRate.toFixed(1)}%</td>
                  <td class="${week.avgPnLPerTrade >= 0 ? 'positive' : 'negative'}">${formatCurrency(week.avgPnLPerTrade, baseCurrency)}</td>
                  <td class="${week.totalPnL >= 0 ? 'positive' : 'negative'}">${formatCurrency(week.totalPnL, baseCurrency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${report.emotionAnalysis.length > 0 ? `
          <div class="section">
            <h2>Emotional Pattern Review</h2>
            <p class="section-copy">Observed emotional states and their relationship to results, useful for coaching and self-review.</p>
            <table>
              <thead>
                <tr>
                  <th>Emotion</th>
                  <th>Observations</th>
                  <th>Win Rate</th>
                  <th>Avg P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                ${report.emotionAnalysis.map(e => `
                  <tr>
                    <td>${e.emotion}</td>
                    <td>${e.count}</td>
                    <td>${e.winRate.toFixed(1)}%</td>
                    <td class="${e.avgPnL >= 0 ? 'positive' : 'negative'}">${formatCurrency(e.avgPnL, baseCurrency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="footer">
          Generated by Trading Journal on ${formattedGeneratedDate}. This report summarizes recorded trading activity for the selected period and is intended for review, coaching, and client-facing performance discussions.
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}
