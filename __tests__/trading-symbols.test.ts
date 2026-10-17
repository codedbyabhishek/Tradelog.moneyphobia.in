import { describe, expect, it } from 'vitest';
import { getLocalSymbolSuggestions, mergeSymbolSuggestions } from '@/lib/trading-symbols';

describe('trading symbol suggestions', () => {
  it('finds a symbol from its ticker or company name', () => {
    expect(getLocalSymbolSuggestions('RELI').map((suggestion) => suggestion.symbol)).toContain('RELIANCE');
    expect(getLocalSymbolSuggestions('APPLE').map((suggestion) => suggestion.symbol)).toContain('AAPL');
  });

  it('prioritizes the trader’s own matching symbols', () => {
    const results = getLocalSymbolSuggestions('NIFTY26', ['NIFTY26SEPFUT', 'AAPL']);
    expect(results[0]).toMatchObject({ symbol: 'NIFTY26SEPFUT', source: 'recent' });
  });

  it('keeps one result when local and live catalogues contain the same symbol', () => {
    const merged = mergeSymbolSuggestions(
      [{ symbol: 'NIFTY', name: 'Saved symbol', market: 'Recent', source: 'recent' }],
      [{ symbol: 'NIFTY', name: 'Nifty 50 Index', market: 'NSE INDEX', source: 'dhan' }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('recent');
  });
});
