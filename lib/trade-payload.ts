import type { Trade } from '@/lib/types';

export function removeTradeScreenshots<T extends Trade>(
  trade: T,
): Omit<T, 'beforeTradeScreenshot' | 'afterExitScreenshot' | 'hftScreenshot'> {
  const {
    beforeTradeScreenshot: _beforeTradeScreenshot,
    afterExitScreenshot: _afterExitScreenshot,
    hftScreenshot: _hftScreenshot,
    ...tradeWithoutScreenshots
  } = trade;
  return tradeWithoutScreenshots;
}

export function toTradeListPayload<T extends Trade>(
  trade: T,
): Omit<T, 'beforeTradeScreenshot' | 'afterExitScreenshot' | 'hftScreenshot'> & { hasScreenshots: boolean } {
  return {
    ...removeTradeScreenshots(trade),
    hasScreenshots: Boolean(
      trade.beforeTradeScreenshot || trade.afterExitScreenshot || trade.hftScreenshot,
    ),
  };
}

export function mergeTradeScreenshots(
  existingTrade: Record<string, unknown>,
  submittedTrade: Record<string, unknown>,
  clearScreenshots: string[] = [],
): Record<string, unknown> {
  const mergedTrade = { ...submittedTrade };
  for (const field of ['beforeTradeScreenshot', 'afterExitScreenshot', 'hftScreenshot']) {
    if (clearScreenshots.includes(field)) {
      delete mergedTrade[field];
    } else if (!Object.prototype.hasOwnProperty.call(submittedTrade, field) && existingTrade[field]) {
      mergedTrade[field] = existingTrade[field];
    }
  }
  return mergedTrade;
}
