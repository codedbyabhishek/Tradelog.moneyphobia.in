import type { CapitalAdjustment, Trade, TradeFilter, TradeIdea, TradingGoal } from '@/lib/types';
import type { TradeTemplate } from '@/lib/templates-context';

export interface AppBootstrapData {
  userId: number;
  trades: Trade[];
  ideas: TradeIdea[];
  goals: TradingGoal[];
  filters: TradeFilter[];
  templates: TradeTemplate[];
  settings: {
    baseCurrency?: string;
    startingBalance?: number;
    capitalAdjustments?: CapitalAdjustment[];
    billing?: import('@/lib/types').BillingState;
  };
}
