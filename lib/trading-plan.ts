export const TRADING_PLAN_SETTING_KEY = 'tradingPlan';

export type TradingPlanChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type TradingPlan = {
  name: string;
  isActive: boolean;
  preMarketRoutine: TradingPlanChecklistItem[];
  entryCriteria: TradingPlanChecklistItem[];
  tradeManagementRules: string;
  maxTradesPerDay: number;
  riskPerTradePercent: number;
  maxDailyLoss: number;
  dailyProfitTarget: number;
  tradingWindow: string;
  newsBufferMinutes: number;
  updatedAt: string;
};

const DEFAULT_PRE_MARKET_ROUTINE = [
  'Review the economic calendar and scheduled news',
  'Mark higher-timeframe levels and session range',
  'Define the watchlist and preferred setups',
  'Set the maximum risk for this session',
];

const DEFAULT_ENTRY_CRITERIA = [
  'Higher-timeframe bias is clear',
  'Price reaches a planned level or liquidity zone',
  'Market structure confirms the trade direction',
  'Entry candle closes with momentum and defined risk',
];

function createChecklistItems(labels: string[], prefix: string): TradingPlanChecklistItem[] {
  return labels.map((label, index) => ({
    id: `${prefix}-${index + 1}`,
    label,
    completed: false,
  }));
}

function normalizeChecklistItems(input: unknown, fallback: TradingPlanChecklistItem[], prefix: string) {
  if (!Array.isArray(input)) return fallback;

  const normalized = input
    .map((item, index): TradingPlanChecklistItem | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Partial<TradingPlanChecklistItem>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      if (!label) return null;

      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : `${prefix}-${index + 1}`,
        label: label.slice(0, 240),
        completed: Boolean(record.completed),
      };
    })
    .filter((item): item is TradingPlanChecklistItem => item !== null)
    .slice(0, 20);

  return normalized.length > 0 ? normalized : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function createDefaultTradingPlan(): TradingPlan {
  return {
    name: 'My Session Plan',
    isActive: true,
    preMarketRoutine: createChecklistItems(DEFAULT_PRE_MARKET_ROUTINE, 'routine'),
    entryCriteria: createChecklistItems(DEFAULT_ENTRY_CRITERIA, 'entry'),
    tradeManagementRules:
      'Enter only at planned locations. Set the stop before entry. Move risk only when the market structure supports it. Stop for the day after the daily loss limit is reached.',
    maxTradesPerDay: 3,
    riskPerTradePercent: 1,
    maxDailyLoss: 100,
    dailyProfitTarget: 200,
    tradingWindow: 'London / New York overlap',
    newsBufferMinutes: 15,
    updatedAt: new Date().toISOString(),
  };
}

/** Safely restores a saved plan while keeping the workspace usable after schema changes. */
export function normalizeTradingPlan(input: unknown): TradingPlan {
  const fallback = createDefaultTradingPlan();
  if (!input || typeof input !== 'object') return fallback;

  const value = input as Partial<TradingPlan>;
  const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 80) : fallback.name;
  const tradingWindow = typeof value.tradingWindow === 'string'
    ? value.tradingWindow.trim().slice(0, 100)
    : fallback.tradingWindow;
  const tradeManagementRules = typeof value.tradeManagementRules === 'string'
    ? value.tradeManagementRules.slice(0, 4000)
    : fallback.tradeManagementRules;

  return {
    name,
    isActive: value.isActive === undefined ? fallback.isActive : Boolean(value.isActive),
    preMarketRoutine: normalizeChecklistItems(value.preMarketRoutine, fallback.preMarketRoutine, 'routine'),
    entryCriteria: normalizeChecklistItems(value.entryCriteria, fallback.entryCriteria, 'entry'),
    tradeManagementRules,
    maxTradesPerDay: boundedNumber(value.maxTradesPerDay, fallback.maxTradesPerDay, 1, 50),
    riskPerTradePercent: boundedNumber(value.riskPerTradePercent, fallback.riskPerTradePercent, 0.01, 100),
    maxDailyLoss: boundedNumber(value.maxDailyLoss, fallback.maxDailyLoss, 0, 10_000_000),
    dailyProfitTarget: boundedNumber(value.dailyProfitTarget, fallback.dailyProfitTarget, 0, 10_000_000),
    tradingWindow,
    newsBufferMinutes: boundedNumber(value.newsBufferMinutes, fallback.newsBufferMinutes, 0, 240),
    updatedAt: typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : fallback.updatedAt,
  };
}

export function getTradingPlanProgress(plan: TradingPlan) {
  const checklistItems = [...plan.preMarketRoutine, ...plan.entryCriteria];
  const completed = checklistItems.filter((item) => item.completed).length;
  const total = checklistItems.length;

  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}
