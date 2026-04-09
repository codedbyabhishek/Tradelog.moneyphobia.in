'use client';

import type { TradeFormData } from '@/lib/types';

const PRE_TRADE_DRAFT_KEY = 'td-pre-trade-draft';

export type PreTradeDraft = Pick<
  TradeFormData,
  'marketTrend' | 'setupType' | 'volumeProfile' | 'emaTouch' | 'timeFrame' | 'riskRewardRatio'
>;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function storePreTradeDraft(draft: PreTradeDraft) {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(PRE_TRADE_DRAFT_KEY, JSON.stringify(draft));
}

export function readPreTradeDraft(): PreTradeDraft | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(PRE_TRADE_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PreTradeDraft;
  } catch {
    return null;
  }
}

export function clearPreTradeDraft() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(PRE_TRADE_DRAFT_KEY);
}
