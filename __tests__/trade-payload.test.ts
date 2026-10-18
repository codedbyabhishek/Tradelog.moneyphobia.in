import { describe, expect, it } from 'vitest';
import { mergeTradeScreenshots, removeTradeScreenshots, toTradeListPayload } from '@/lib/trade-payload';
import type { Trade } from '@/lib/types';

const trade = {
  id: 'trade-1',
  date: '2026-10-18',
  symbol: 'NIFTY',
  pnl: 12,
  beforeTradeScreenshot: 'data:image/png;base64,large-image',
  afterExitScreenshot: 'data:image/png;base64,another-image',
  hftScreenshot: 'data:image/png;base64,third-image',
} as Trade;

describe('removeTradeScreenshots', () => {
  it('omits inline screenshots while keeping the rest of the trade unchanged', () => {
    expect(removeTradeScreenshots(trade)).toEqual({
      id: 'trade-1',
      date: '2026-10-18',
      symbol: 'NIFTY',
      pnl: 12,
    });
  });

  describe('toTradeListPayload', () => {
    it('omits image data and keeps lightweight screenshot-presence metadata', () => {
      expect(toTradeListPayload(trade)).toEqual({
        id: 'trade-1',
        date: '2026-10-18',
        symbol: 'NIFTY',
        pnl: 12,
        hasScreenshots: true,
      });
    });
  });

  describe('mergeTradeScreenshots', () => {
    it('preserves existing screenshots when an update omits them', () => {
      expect(mergeTradeScreenshots(
        {
          id: 'trade-1',
          beforeTradeScreenshot: 'before-image',
          afterExitScreenshot: 'after-image',
          hftScreenshot: 'hft-image',
        },
        { id: 'trade-1', setupName: 'Updated setup' },
      )).toEqual({
        id: 'trade-1',
        setupName: 'Updated setup',
        beforeTradeScreenshot: 'before-image',
        afterExitScreenshot: 'after-image',
        hftScreenshot: 'hft-image',
      });
    });

    it('clears only screenshots explicitly requested for removal', () => {
      expect(mergeTradeScreenshots(
        {
          id: 'trade-1',
          beforeTradeScreenshot: 'before-image',
          afterExitScreenshot: 'after-image',
        },
        { id: 'trade-1', setupName: 'Updated setup' },
        ['beforeTradeScreenshot'],
      )).toEqual({
        id: 'trade-1',
        setupName: 'Updated setup',
        afterExitScreenshot: 'after-image',
      });
    });
  });
});
