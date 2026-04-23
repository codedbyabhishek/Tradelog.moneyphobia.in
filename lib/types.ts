// Supported currencies
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD';
export type TradeResult = 'Win' | 'Loss' | 'Break-Even';
export type MarketTrend = 'Bullish' | 'Bearish' | 'Sideways';
export type SetupType = 'Breakout' | 'Pullback' | 'Reversal';
export type VolumeProfile = 'High' | 'Low';
export type ChecklistTimeframe = '5m' | '15m' | '1H' | 'Daily';
export type MarketOpenType = 'Gap Up' | 'Gap Down' | 'Sideways';
export type FirstFiveMinuteCandleType = 'Bullish' | 'Bearish' | 'Doji' | 'Pinbar';

// Trade outcome derived from P&L
export type TradeOutcome = 'W' | 'L' | 'BE'; // Win, Loss, Break-Even

// Market sessions based on global trading hours
export type MarketSession = 'Asia' | 'London' | 'NewYork' | 'Overlap_London_NY' | 'Overlap_Asia_London' | 'Off_Hours';

// Market condition classification for context-aware analysis
export type MarketCondition = 'Trending' | 'Ranging' | 'High_Volatility' | 'Low_Volatility' | 'News_Day' | 'Normal';
export const MARKET_CONDITION_OPTIONS = [
  'Trending',
  'Ranging',
  'High_Volatility',
  'Low_Volatility',
  'News_Day',
  'Normal',
] as const;

// Rule violations for discipline tracking
export type RuleViolation = 
  | 'None' 
  | 'Early_Entry' 
  | 'Late_Entry' 
  | 'SL_Moved' 
  | 'TP_Moved' 
  | 'Over_Risked' 
  | 'Under_Risked'
  | 'Revenge_Trade' 
  | 'FOMO_Entry' 
  | 'No_Setup'
  | 'Multiple';
export const RULE_VIOLATION_OPTIONS = [
  'Early_Entry',
  'Late_Entry',
  'SL_Moved',
  'TP_Moved',
  'Over_Risked',
  'Under_Risked',
  'Revenge_Trade',
  'FOMO_Entry',
  'No_Setup',
] as const;

// Emotional state during trade for psychology tracking
export type EmotionTag = 'Calm' | 'Confident' | 'Anxious' | 'Fearful' | 'Greedy' | 'Frustrated' | 'Revenge' | 'FOMO' | 'Neutral';

export const MISTAKE_TAG_OPTIONS = [
  'No mistake (good loss)',
  'No setup followed',
  'Time frame change',
  'Overtrading',
  'Early exit',
  'Late entry',
  'Late exit',
  'SL hunt fear',
  'Stop loss moved',
  'Target moved',
  'Greed',
  'FOMO entry',
  'Revenge trade',
  'Confirmation bias',
  'News trade',
  'Oversized position',
  'Poor risk-reward',
  'No trade plan',
  'Emotional trade',
] as const;

export type MistakeTag = (typeof MISTAKE_TAG_OPTIONS)[number];

export interface Trade {
  id: string;
  isFavorite?: boolean;
  tags?: string[];
  date: string;
  // Legacy compatibility aliases still referenced by older modules.
  entryDate?: string;
  exitDate?: string;
  dayOfWeek: string;
  symbol: string;
  tradeType: 'Intraday' | 'Swing' | 'Scalping' | 'Positional';
  setupName: string;
  position: 'Buy' | 'Sell';
  entryPrice?: number;
  exitPrice?: number;
  stopLoss: number;
  stopLossPrice?: number;
  quantity: number;
  fees: number;
  // Charge breakdown (optional, backward compatible)
  brokerage?: number;
  exchangeCharges?: number;
  taxes?: number;
  // P&L in original trade currency (gross - before charges)
  pnl: number;
  // Currency of the trade
  currency: Currency;
  // P&L converted to base currency (stored at time of trade close)
  pnlBase: number;
  // Exchange rate used for conversion (at exit time)
  exchangeRate: number;
  tradeResult: TradeResult;
  rFactor: number;
  exitRFactor?: number;
  // DEPRECATED: Use getTradeOutcome(pnl) instead - kept for backwards compatibility
  isWin: boolean;
  confidence: number;
  preNotes: string;
  postNotes: string;
  notes?: string;
  emotion?: EmotionTag;
  beforeTradeScreenshot?: string;
  afterExitScreenshot?: string;
  mistakeTag?: MistakeTag;
  timeFrame?: string;
  marketTrend?: MarketTrend;
  setupType?: SetupType;
  volumeProfile?: VolumeProfile;
  emaTouch?: boolean;
  riskRewardRatio?: number;
  marketOpenType?: MarketOpenType;
  firstFiveMinuteCandleType?: FirstFiveMinuteCandleType;
  limit?: string;
  exit?: string;
  
  // === NEW FIELDS FOR ADVANCED ANALYTICS ===
  
  // Trading session when trade was taken
  session?: MarketSession;
  
  // Time of day (24hr format, e.g., "09:30", "14:45")
  entryTime?: string;
  exitTime?: string;
  
  // Market condition at time of trade
  marketCondition?: MarketCondition;
  
  // Whether trade followed predefined rules
  ruleFollowed: boolean;
  
  // Specific rule violations if any
  ruleViolations?: RuleViolation[];
  
  // Emotional state during trade entry
  emotionEntry?: EmotionTag;
  
  // Emotional state during trade exit
  emotionExit?: EmotionTag;
  
  // Planned R target (for comparing actual vs planned)
  plannedRTarget?: number;
  
  // Was this trade part of a scaling in/out strategy
  isScaledEntry?: boolean;
  isScaledExit?: boolean;
}

export interface CapitalAdjustment {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note?: string;
}

export type SubscriptionPlan = 'free' | 'pro';
export type SubscriptionStatus = 'inactive' | 'active' | 'trialing' | 'past_due';

export interface BillingState {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle?: 'monthly' | 'yearly';
  startedAt?: string | null;
  renewsAt?: string | null;
  trialEndsAt?: string | null;
}

export interface TradeFormData {
  date: string;
  tags: string;
  symbol: string;
  tradeType: 'Intraday' | 'Swing' | 'Scalping' | 'Positional';
  setupName: string;
  position: 'Buy' | 'Sell';
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  quantity: string;
  fees: string;
  brokerage?: string;
  exchangeCharges?: string;
  taxes?: string;
  manualProfit?: string;
  // Currency for this trade
  currency: Currency;
  marketTrend: MarketTrend | '';
  setupType: SetupType | '';
  volumeProfile: VolumeProfile | '';
  emaTouch: '' | 'Yes' | 'No';
  riskRewardRatio: string;
  marketOpenType: MarketOpenType | '';
  firstFiveMinuteCandleType: FirstFiveMinuteCandleType | '';
  confidence: string;
  preNotes: string;
  postNotes: string;
  beforeTradeScreenshot?: string;
  afterExitScreenshot?: string;
  mistakeTag?: MistakeTag;
  exitRFactor?: string;
  timeFrame: string;
  // DEPRECATED: W/L is now auto-derived from P&L
  isWin?: boolean;
  limit: string;
  exit: string;
  
  // === NEW FIELDS FOR ADVANCED ANALYTICS ===
  session?: MarketSession;
  entryTime?: string;
  exitTime?: string;
  marketCondition?: MarketCondition;
  ruleFollowed: boolean;
  ruleViolations?: RuleViolation[];
  emotionEntry?: EmotionTag;
  emotionExit?: EmotionTag;
  plannedRTarget?: string;
}

// ============================================
// Trade Ideas & Backtesting Types
// ============================================

export type IdeaStatus = 'idea' | 'backtesting' | 'validated' | 'invalidated' | 'archived';

export interface TradeIdea {
  id: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  name: string;
  symbol?: string;
  setup: string;
  reasoning: string;
  entryLogic: string;
  exitLogic: string;
  stopLossLogic?: string;
  timeFrame?: string;
  status: IdeaStatus;
  outcome?: 'success' | 'failure' | 'partial' | 'pending';
  notes: string;
  screenshot?: string;
  // Backtesting fields
  backtestResults?: string;
  backtestWinRate?: number;
  backtestSampleSize?: number;
  tags?: string[];
}

export interface LearningVideo {
  id: string;
  title: string;
  url: string;
  videoId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Trading Goals & Tracking
// ============================================

export type GoalType = 'win_rate' | 'profit_target' | 'trade_count' | 'risk_management' | 'consistency';
export type GoalMode = 'goal' | 'challenge';
export type ChallengeTemplate = 'discipline_30' | 'a_plus_week' | 'no_overtrading_week';

export interface ChallengeConfig {
  maxTradesPerDay?: number;
  allowedSetups?: string[];
  requireRuleFollowed?: boolean;
  requireMistakeFree?: boolean;
  minConfidence?: number;
}

export interface TradingGoal {
  id: string;
  type: GoalType;
  mode?: GoalMode;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string; // '%', 'Rs', '₹', 'trades', etc.
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  progress: number; // 0-100
  challengeTemplate?: ChallengeTemplate;
  challengeConfig?: ChallengeConfig;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Search & Filtering
// ============================================

export interface TradeFilter {
  id: string;
  name: string;
  dateRange?: {
    start: string;
    end: string;
  };
  symbols?: string[];
  setupNames?: string[];
  tradeTypes?: ('Intraday' | 'Swing' | 'Scalping' | 'Positional')[];
  currencyFilter?: Currency[];
  minPnL?: number;
  maxPnL?: number;
  minRFactor?: number;
  maxRFactor?: number;
  outcomeFilter?: TradeOutcome[];
  ruleFollowedOnly?: boolean;
  emotionTags?: EmotionTag[];
  sessions?: MarketSession[];
  createdAt: string;
  updatedAt: string;
}
