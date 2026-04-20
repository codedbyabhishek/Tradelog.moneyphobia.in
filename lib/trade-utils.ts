import { CapitalAdjustment, Trade, TradeFormData, Currency, TradeOutcome, TradeResult } from './types';

// Currency symbols for display
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

// Default exchange rates to INR (base currency)
// In production, these should be fetched from an API at trade close time
export const DEFAULT_EXCHANGE_RATES_TO_INR: Record<Currency, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.8,
  JPY: 0.56,
  AUD: 54.3,
  CAD: 61.2,
};

// Default base currency for summaries
export const BASE_CURRENCY: Currency = 'INR';

/**
 * Derive trade outcome from P&L
 * @param pnl - Profit/Loss value
 * @returns 'W' for win (P&L > 0), 'L' for loss (P&L < 0), 'BE' for break-even (P&L = 0)
 */
export function getTradeOutcome(pnl: number): TradeOutcome {
  if (pnl > 0) return 'W';
  if (pnl < 0) return 'L';
  return 'BE';
}

export function getTradeResultLabel(pnl: number): TradeResult {
  if (pnl > 0) return 'Win';
  if (pnl < 0) return 'Loss';
  return 'Break-Even';
}

/**
 * Check if a trade is a win based on P&L (not the deprecated isWin field)
 * @param trade - Trade object
 * @returns true if P&L > 0
 */
export function isTradeWin(trade: Trade): boolean {
  return trade.pnl > 0;
}

/**
 * Check if a trade is a loss based on P&L
 * @param trade - Trade object
 * @returns true if P&L < 0
 */
export function isTradeLoss(trade: Trade): boolean {
  return trade.pnl < 0;
}

/**
 * Get exchange rate for converting currency to base currency (INR)
 * In production, this should fetch live rates from an API
 * @param currency - Source currency
 * @returns Exchange rate to INR
 */
export function getExchangeRateToBase(currency: Currency): number {
  return DEFAULT_EXCHANGE_RATES_TO_INR[currency] || 1;
}

/**
 * Convert P&L to base currency
 * @param pnl - P&L in original currency
 * @param currency - Original currency
 * @param exchangeRate - Optional custom exchange rate (uses default if not provided)
 * @returns P&L in base currency (INR)
 */
export function convertToBaseCurrency(pnl: number, currency: Currency, exchangeRate?: number): number {
  const rate = exchangeRate ?? getExchangeRateToBase(currency);
  return pnl * rate;
}

/**
 * Convert a canonical INR-normalized amount into the user's selected display currency.
 * Stored `pnlBase` values are currently normalized to INR across the app.
 */
export function convertBaseAmountToDisplayCurrency(amount: number, displayCurrency: Currency): number {
  if (displayCurrency === 'INR') {
    return amount;
  }

  const rate = getExchangeRateToBase(displayCurrency);
  if (!rate) {
    return amount;
  }

  return amount / rate;
}

/**
 * Calculate Profit/Loss for a trade.
 *
 * Overloads:
 * - From a `Trade` object: returns the stored net P&L (`trade.pnl`)
 * - From raw parameters: computes gross P&L from prices/quantity and subtracts fees
 */
export function calculatePnL(trade: Trade): number;
export function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  position: 'Buy' | 'Sell',
  fees: number
): number;
export function calculatePnL(
  arg1: Trade | number,
  arg2?: number,
  arg3?: number,
  arg4?: 'Buy' | 'Sell',
  arg5?: number
): number {
  // Trade overload – use stored net P&L for consistency across the app
  if (typeof arg1 === 'object') {
    return arg1.pnl;
  }

  const entryPrice = arg1;
  const exitPrice = arg2 ?? 0;
  const quantity = arg3 ?? 0;
  const position = arg4 ?? 'Buy';
  const fees = arg5 ?? 0;

  let grossPnL = 0;
  if (position === 'Buy') {
    grossPnL = (exitPrice - entryPrice) * quantity;
  } else {
    // Sell position: profit if exit < entry
    grossPnL = (entryPrice - exitPrice) * quantity;
  }
  return grossPnL - fees;
}
 
/**
 * Calculate Risk-Reward Factor (R-Factor).
 *
 * Overloads:
 * - From a `Trade` object: returns the stored `rFactor`
 * - From raw parameters: derives R from P&L and price/quantity risk
 */
export function calculateRFactor(trade: Trade): number;
export function calculateRFactor(
  pnl: number,
  stopLoss: number,
  entryPrice: number,
  position: 'Buy' | 'Sell',
  quantity: number
): number;
export function calculateRFactor(
  arg1: Trade | number,
  arg2?: number,
  arg3?: number,
  arg4?: 'Buy' | 'Sell',
  arg5?: number
): number {
  // Trade overload – use stored R-multiple for consistency
  if (typeof arg1 === 'object') {
    return arg1.rFactor;
  }

  const pnl = arg1;
  const stopLoss = arg2 ?? 0;
  const entryPrice = arg3 ?? 0;
  const position = arg4 ?? 'Buy';
  const quantity = arg5 ?? 0;

  let risk = 0;
  if (position === 'Buy') {
    risk = Math.abs(entryPrice - stopLoss) * quantity;
  } else {
    risk = Math.abs(stopLoss - entryPrice) * quantity;
  }
  if (risk === 0) return 0;
  return pnl / risk;
}

/**
 * Get day of week from date string
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Day name (e.g., 'Monday')
 */
export function getDayOfWeek(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Use local day-of-week so it matches the user's trading day
  return days[date.getDay()];
}

/**
 * Convert form data to Trade object
 * Validates and calculates all trade metrics
 * W/L is auto-derived from P&L (positive = Win, negative = Loss, zero = Break-even)
 * R-multiple carries the correct sign (loss = negative R)
 * @param formData - Raw form submission data
 * @returns Complete Trade object with all metrics calculated
 */
export function convertFormToTrade(formData: TradeFormData): Trade {
  const stopLoss = parseFloat(formData.stopLoss);
  const quantity = parseFloat(formData.quantity);
  const brokerage = parseFloat(formData.brokerage || '0') || 0;
  const exchangeCharges = parseFloat(formData.exchangeCharges || '0') || 0;
  const taxes = parseFloat(formData.taxes || '0') || 0;
  const fees = brokerage + exchangeCharges + taxes;
  // User enters gross P&L; net P&L = gross - brokerage/charges
  const grossPnl = parseFloat(formData.manualProfit || '0');
  const pnl = grossPnl - fees;
  const currency = formData.currency || 'INR';
  
  // Parse R-Factor and ensure it has correct sign based on P&L
  let rFactor = parseFloat(formData.exitRFactor || '0');
  // Ensure R-multiple sign matches P&L sign (loss should be negative R)
  if (pnl < 0 && rFactor > 0) {
    rFactor = -Math.abs(rFactor);
  } else if (pnl > 0 && rFactor < 0) {
    rFactor = Math.abs(rFactor);
  }

  // Only parse prices if they are provided
  const entryPrice = formData.entryPrice ? parseFloat(formData.entryPrice) : undefined;
  const exitPrice = formData.exitPrice ? parseFloat(formData.exitPrice) : undefined;

  // Get exchange rate at trade close time and convert to base currency
  const exchangeRate = getExchangeRateToBase(currency);
  const pnlBase = convertToBaseCurrency(pnl, currency, exchangeRate);

  // Auto-derive isWin from P&L (for backwards compatibility with existing code)
  const isWin = pnl > 0;
  const tradeResult = getTradeResultLabel(pnl);

  const parsedTags = formData.tags
    ? Array.from(
        new Set(
          formData.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        )
      )
    : undefined;

  return {
    id: Date.now().toString(),
    tags: parsedTags,
    date: formData.date,
    dayOfWeek: getDayOfWeek(formData.date),
    symbol: formData.symbol.toUpperCase(),
    tradeType: formData.tradeType,
    setupName: formData.setupName,
    position: formData.position,
    entryPrice,
    exitPrice,
    stopLoss,
    quantity,
    fees,
    brokerage: brokerage || undefined,
    exchangeCharges: exchangeCharges || undefined,
    taxes: taxes || undefined,
    pnl,
    currency,
    pnlBase,
    exchangeRate,
    tradeResult,
    rFactor,
    exitRFactor: formData.exitRFactor ? parseFloat(formData.exitRFactor) : undefined,
    isWin, // Auto-derived from P&L
    confidence: parseInt(formData.confidence),
    preNotes: formData.preNotes,
    postNotes: formData.postNotes,
    beforeTradeScreenshot: formData.beforeTradeScreenshot,
    afterExitScreenshot: formData.afterExitScreenshot,
    mistakeTag: formData.mistakeTag,
    timeFrame: formData.timeFrame,
    marketTrend: formData.marketTrend || undefined,
    setupType: formData.setupType || undefined,
    volumeProfile: formData.volumeProfile || undefined,
    emaTouch: formData.emaTouch === '' ? undefined : formData.emaTouch === 'Yes',
    riskRewardRatio: formData.riskRewardRatio ? parseFloat(formData.riskRewardRatio) : undefined,
    marketOpenType: formData.marketOpenType || undefined,
    firstFiveMinuteCandleType: formData.firstFiveMinuteCandleType || undefined,
    limit: formData.limit,
    exit: formData.exit,
    ruleFollowed: formData.ruleFollowed ?? true,
    ruleViolations: formData.ruleViolations,
    session: formData.session,
    entryTime: formData.entryTime,
    exitTime: formData.exitTime,
    marketCondition: formData.marketCondition,
    emotionEntry: formData.emotionEntry,
    emotionExit: formData.emotionExit,
    plannedRTarget: formData.plannedRTarget ? parseFloat(formData.plannedRTarget) : undefined,
    isScaledEntry: false,
    isScaledExit: false,
  };
}

/**
 * Get total charges for a trade
 * Returns the sum of brokerage, exchange charges, and taxes
 * Falls back to `fees` field for backward compatibility
 */
export function getTradeCharges(trade: Trade): number {
  const brokerage = trade.brokerage || 0;
  const exchangeCharges = trade.exchangeCharges || 0;
  const taxes = trade.taxes || 0;
  const totalBreakdown = brokerage + exchangeCharges + taxes;
  // If breakdown is available, use it; otherwise use legacy fees field
  return totalBreakdown > 0 ? totalBreakdown : (trade.fees || 0);
}

/**
 * Get gross P&L (before charges) for a trade
 * Gross = Net P&L + total charges
 */
export function getTradeGrossPnL(trade: Trade): number {
  return trade.pnl + getTradeCharges(trade);
}

/**
 * Get P&L in base currency for a trade
 * Uses pnlBase if available, otherwise converts using current rate
 * @param trade - Trade object
 * @returns P&L in base currency
 */
export function getTradeBasePnL(trade: Trade): number {
  // If pnlBase is already stored, use it (prevents recalculation with different rates)
  if (trade.pnlBase !== undefined && trade.pnlBase !== null) {
    return trade.pnlBase;
  }
  // Fallback for old trades without pnlBase
  const currency = trade.currency || 'INR';
  return convertToBaseCurrency(trade.pnl, currency);
}

/**
 * Calculate comprehensive account statistics
 * Uses base currency (INR) for all P&L calculations to avoid mixing currencies
 * W/L is derived from P&L (not the deprecated isWin field)
 * @param trades - Array of all trades
 * @returns Account statistics including win rate, P&L, drawdown, and best/worst setups
 */
export function getAccountStats(trades: Trade[]) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      averageR: 0,
      maxDrawdown: 0,
      bestSetup: 'N/A',
      worstSetup: 'N/A',
      bestTimeFrame: 'N/A',
      worstTimeFrame: 'N/A',
      goodDay: 'N/A',
      badDay: 'N/A',
    };
  }

  const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));

  // Use P&L > 0 to determine wins (not deprecated isWin field)
  const wins = trades.filter(t => t.pnl > 0).length;
  const winRate = (wins / trades.length) * 100;
  
  // Use base currency P&L for totals to avoid mixing currencies
  const totalPnL = trades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
  const averageR = trades.reduce((sum, t) => sum + t.rFactor, 0) / trades.length;

  // Calculate maximum drawdown using base currency P&L
  let maxDrawdown = 0;
  let runningMax = 0;
  let cumulativePnL = 0;
  for (const trade of sortedTrades) {
    cumulativePnL += getTradeBasePnL(trade);
    if (cumulativePnL > runningMax) {
      runningMax = cumulativePnL;
    }
    const drawdown = runningMax - cumulativePnL;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  // Identify best and worst performing trading setups using base currency
  const setupStats = new Map<string, { wins: number; losses: number; pnl: number }>();
  for (const trade of trades) {
    const stats = setupStats.get(trade.setupName) || { wins: 0, losses: 0, pnl: 0 };
    // Derive win/loss from P&L, not deprecated isWin
    if (trade.pnl > 0) stats.wins++;
    else if (trade.pnl < 0) stats.losses++;
    stats.pnl += getTradeBasePnL(trade);
    setupStats.set(trade.setupName, stats);
  }

  let bestSetup = 'N/A';
  let worstSetup = 'N/A';
  let bestPnL = -Infinity;
  let worstPnL = Infinity;

  for (const [setup, stats] of setupStats) {
    if (stats.pnl > bestPnL) {
      bestPnL = stats.pnl;
      bestSetup = setup;
    }
    if (stats.pnl < worstPnL) {
      worstPnL = stats.pnl;
      worstSetup = setup;
    }
  }

  const timeframeStats = new Map<string, number>();
  const dayStats = new Map<string, number>();

  for (const trade of trades) {
    const tradePnL = getTradeBasePnL(trade);
    const timeframe = trade.timeFrame?.trim() || 'Unspecified';
    const day = trade.dayOfWeek?.trim() || 'Unspecified';

    timeframeStats.set(timeframe, (timeframeStats.get(timeframe) || 0) + tradePnL);
    dayStats.set(day, (dayStats.get(day) || 0) + tradePnL);
  }

  const getBestAndWorstLabel = (entries: Map<string, number>) => {
    if (entries.size === 0) {
      return { best: 'N/A', worst: 'N/A' };
    }

    let best = 'N/A';
    let worst = 'N/A';
    let bestValue = -Infinity;
    let worstValue = Infinity;

    for (const [label, value] of entries) {
      if (value > bestValue) {
        bestValue = value;
        best = label;
      }
      if (value < worstValue) {
        worstValue = value;
        worst = label;
      }
    }

    return { best, worst };
  };

  const timeframeLeaders = getBestAndWorstLabel(timeframeStats);
  const dayLeaders = getBestAndWorstLabel(dayStats);

  return {
    totalTrades: trades.length,
    winRate: parseFloat(winRate.toFixed(2)),
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    averageR: parseFloat(averageR.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    bestSetup,
    worstSetup,
    bestTimeFrame: timeframeLeaders.best,
    worstTimeFrame: timeframeLeaders.worst,
    goodDay: dayLeaders.best,
    badDay: dayLeaders.worst,
  };
}

/**
 * Calculate Profit Factor
 * Ratio of total profits to total losses
 * Target: 1.5+ for consistently profitable trading
 * @param trades - Array of all trades
 * @returns Profit factor (higher is better, 1.0 = break even)
 */
export function getProfitFactor(trades: Trade[]): number {
  const winTrades = trades.filter(t => t.pnl > 0);
  const lossTrades = trades.filter(t => t.pnl < 0);

  const totalProfit = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));

  if (totalLoss === 0) return totalProfit > 0 ? Infinity : 0;
  return parseFloat((totalProfit / totalLoss).toFixed(2));
}

/**
 * Calculate Risk-Reward Ratio
 * Average profit per win vs average loss per losing trade
 * Target: 2:1 or better for positive expectancy
 * @param trades - Array of all trades
 * @returns Ratio of average profit to average loss
 */
export function getRiskRewardRatio(trades: Trade[]): number {
  const winTrades = trades.filter(t => t.pnl > 0);
  const lossTrades = trades.filter(t => t.pnl <= 0);

  if (winTrades.length === 0 || lossTrades.length === 0) return 0;

  const avgProfit = winTrades.reduce((sum, t) => sum + t.pnl, 0) / winTrades.length;
  const avgLoss = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0) / lossTrades.length);

  if (avgLoss === 0) return 0;
  return parseFloat((avgProfit / avgLoss).toFixed(2));
}

/**
 * Calculate Recovery Factor
 * Total P&L divided by maximum drawdown
 * Measures how efficiently profit recovers from losses
 * @param trades - Array of all trades
 * @param initialCapital - Initial account capital (optional, for reference)
 * @returns Recovery factor (higher is better)
 */
export function getRecoveryFactor(trades: Trade[], initialCapital: number = 1000): number {
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

  // Calculate maximum drawdown
  let maxDD = 0;
  let runningMax = 0;
  let cumulativePnL = 0;
  for (const trade of trades) {
    cumulativePnL += trade.pnl;
    runningMax = Math.max(runningMax, cumulativePnL);
    maxDD = Math.max(maxDD, runningMax - cumulativePnL);
  }

  if (maxDD === 0) return 0;
  return parseFloat((totalPnL / maxDD).toFixed(2));
}

/**
 * Format a value with the appropriate currency symbol
 * @param value - Numeric value to format
 * @param currency - Target currency
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with currency symbol
 */
export function formatCurrency(value: number, currency: Currency, decimals: number = 2): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = value.toFixed(decimals);
  
  // For currencies with symbols after the number (JPY, AUD, CAD)
  if (['JPY', 'AUD', 'CAD'].includes(currency)) {
    return `${formatted} ${symbol}`;
  }
  
  // For currencies with symbols before the number
  return `${symbol}${formatted}`;
}

/**
 * Format an INR-normalized analytics value in the user's selected display currency.
 */
export function formatBaseCurrencyAmount(value: number, displayCurrency: Currency, decimals: number = 2): string {
  return formatCurrency(convertBaseAmountToDisplayCurrency(value, displayCurrency), displayCurrency, decimals);
}

/**
 * Get cumulative P&L in base currency for equity curve display
 * Accounts for different currencies by using pnlBase
 * @param trades - Array of trades sorted by date
 * @param baseCurrency - The user's selected base currency for display
 * @returns Array of cumulative balance points for equity curve
 */
export function getEquityCurveInBaseCurrency(
  trades: Trade[],
  baseCurrency: Currency = BASE_CURRENCY,
  startingBalance: number = 0,
  capitalAdjustments: CapitalAdjustment[] = []
): Array<{ date: string; balance: number }> {
  let cumulativeBalance = startingBalance;
  const events = [
    ...trades.map((trade) => ({
      date: trade.date,
      amount: getTradeBasePnL(trade),
      order: 1,
    })),
    ...capitalAdjustments.map((adjustment) => ({
      date: adjustment.date,
      amount: adjustment.type === 'withdrawal' ? -Math.abs(adjustment.amount) : Math.abs(adjustment.amount),
      order: 0,
    })),
  ].sort((a, b) => {
    const byDate = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (byDate !== 0) return byDate;
    return a.order - b.order;
  });

  return events.map((event) => {
    cumulativeBalance += event.amount;
    return {
      date: event.date,
      balance: parseFloat(cumulativeBalance.toFixed(2)),
    };
  });
}

export function getCapitalAdjustmentAmount(adjustment: CapitalAdjustment): number {
  return adjustment.type === 'withdrawal' ? -Math.abs(adjustment.amount) : Math.abs(adjustment.amount);
}

export function getNetCapitalAdjustments(capitalAdjustments: CapitalAdjustment[]): number {
  return capitalAdjustments.reduce((sum, adjustment) => {
    return sum + getCapitalAdjustmentAmount(adjustment);
  }, 0);
}

/**
 * Get total P&L across all trades in base currency
 * Properly handles multi-currency trades by using pnlBase
 * @param trades - Array of all trades
 * @returns Total P&L in base currency
 */
export function getTotalPnLInBaseCurrency(trades: Trade[]): number {
  return trades.reduce((sum, trade) => sum + getTradeBasePnL(trade), 0);
}

/**
 * Get average daily P&L in base currency
 * @param trades - Array of all trades
 * @returns Average daily P&L in base currency
 */
export function getAverageDailyPnLInBaseCurrency(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  
  const uniqueDates = new Set(trades.map(t => t.date));
  const totalPnL = getTotalPnLInBaseCurrency(trades);
  
  return totalPnL / uniqueDates.size;
}
