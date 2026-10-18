import { describe, expect, it } from 'vitest';
import type { Trade } from '@/lib/types';
import { buildTradeJournalReportHtml } from '@/lib/trade-report';
import { tradeToMarkdown } from '@/lib/trade-markdown-export';

function trade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    date: '2026-10-17',
    dayOfWeek: 'Saturday',
    symbol: 'XAUUSD',
    tradeType: 'Intraday',
    setupName: 'Breakout',
    position: 'Buy',
    entryPrice: 4274.11,
    exitPrice: 4288.96,
    stopLoss: 4260.82,
    quantity: 0.01,
    fees: 0,
    pnl: 14.85,
    currency: 'USD',
    pnlBase: 14.85,
    exchangeRate: 1,
    tradeResult: 'Win',
    rFactor: 1.12,
    isWin: true,
    confidence: 8,
    preNotes: 'Wait for confirmation',
    postNotes: 'Followed the plan',
    ruleFollowed: true,
    ...overrides,
  };
}

describe('trade journal PDF report', () => {
  it('builds a branded report with trade details, notes, and screenshots', () => {
    const html = buildTradeJournalReportHtml(trade({
      beforeTradeScreenshot: 'data:image/png;base64,chart-data',
    }), 'Abhishek Kumar');

    expect(html).toContain('Traderlogify');
    expect(html).toContain('Trade Journal Report');
    expect(html).toContain("Abhishek Kumar's trade");
    expect(html).toContain('XAUUSD');
    expect(html).toContain('+$14.85');
    expect(html).toContain('Wait for confirmation');
    expect(html).toContain('Followed the plan');
    expect(html).toContain('data:image/png;base64,chart-data');
    expect(html).toContain('@page { size: A4;');
  });

  it('escapes trade content before placing it in the printable document', () => {
    const html = buildTradeJournalReportHtml(trade({
      symbol: '<script>alert(1)</script>',
      preNotes: '<img src=x onerror=alert(1)>',
      beforeTradeScreenshot: 'data:image/png;base64,chart-data"><script>alert(1)</script>',
    }), 'Trader <Admin>');

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('keeps a pending trade distinct from a breakeven close', () => {
    const html = buildTradeJournalReportHtml(trade({
      pnl: 0,
      tags: ['Pending Outcome'],
    }));

    expect(html).toContain('PENDING');
    expect(html).toContain('Outcome not recorded');
    expect(html).not.toContain('BREAKEVEN CLOSE');
  });

  it('includes the emotional journey in printable and Markdown trade reports', () => {
    const source = trade({
      emotionEntry: 'Confident',
      duringTradeNotes: 'Felt an urge to exit early.',
      emotionExit: 'Anxious',
      ruleFollowed: false,
      ruleViolations: ['Moved stop loss'],
    });
    const html = buildTradeJournalReportHtml(source);
    const markdown = tradeToMarkdown(source);

    expect(html).toContain('Emotion at entry');
    expect(html).toContain('Confident');
    expect(html).toContain('During-trade context');
    expect(html).toContain('Felt an urge to exit early.');
    expect(html).toContain('Emotion at exit');
    expect(html).toContain('Anxious');
    expect(html).toContain('Moved stop loss');
    expect(markdown).toContain('### Emotional Journey');
    expect(markdown).toContain('Felt an urge to exit early.');
    expect(markdown).toContain('**Followed plan:** No');
  });

  it('escapes in-trade context in the printable report', () => {
    const html = buildTradeJournalReportHtml(trade({
      duringTradeNotes: '<script>alert(1)</script>',
    }));

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
