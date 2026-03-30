/**
 * Trade Journal Markdown Export
 * Generates markdown files for individual trades with proper formatting
 */

import { Trade } from './types';

/**
 * Convert a trade to markdown format
 */
export function tradeToMarkdown(trade: Trade): string {
  const date = new Date(trade.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# Trade Journal Entry

**Date:** ${formattedDate}  
**Trade ID:** \`${trade.id}\`

---

## Trade Information

| Field | Value |
|-------|-------|
| **Symbol** | ${trade.symbol} |
| **Trade Type** | ${trade.tradeType} |
| **Position** | ${trade.position} |
| **Setup Name** | ${trade.setupName} |
| **Time Frame** | ${trade.timeFrame || 'N/A'} |
| **Confidence** | ${trade.confidence}/10 |

---

## Entry & Exit Details

| Field | Value |
|-------|-------|
| **Entry Price** | ${trade.entryPrice ? `$${trade.entryPrice.toFixed(2)}` : 'N/A'} |
| **Exit Price** | ${trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : 'N/A'} |
| **Stop Loss** | $${trade.stopLoss.toFixed(2)} |
| **Limit (Fibonacci)** | ${trade.limit || 'N/A'} |
| **Exit (Fibonacci)** | ${trade.exit || 'N/A'} |
| **Quantity** | ${trade.quantity} |

---

## Risk & Reward

| Metric | Value |
|--------|-------|
| **P&L** | $${trade.pnl.toFixed(2)} |
| **R Factor** | ${trade.rFactor.toFixed(2)} |
| **Total Fees** | $${trade.fees.toFixed(2)} |
| **Outcome** | ${trade.isWin ? '✓ **WIN**' : '✗ **LOSS**'} |

---

## Trade Analysis

### Pre-Trade Notes
${trade.preNotes || '*No pre-trade notes recorded*'}

### Post-Trade Notes
${trade.postNotes || '*No post-trade notes recorded*'}

---

## Trade Mistakes & Learning

| Category | Value |
|----------|-------|
| **Mistake Tag** | ${trade.mistakeTag || 'No mistake (good execution)'} |

---

## Screenshots

${trade.beforeTradeScreenshot ? `- **Before Trade:** \`${trade.beforeTradeScreenshot}\`` : ''}
${trade.afterExitScreenshot ? `- **After Exit:** \`${trade.afterExitScreenshot}\`` : ''}

---

## Metadata

- **Day of Week:** ${trade.dayOfWeek}
- **Exit R Factor:** ${trade.exitRFactor ? `${trade.exitRFactor.toFixed(2)}` : 'Not recorded'}
- **Last Updated:** ${new Date().toISOString()}

`;

  return markdown;
}

/**
 * Generate CSV content from trades
 */
export function tradesToCSV(trades: Trade[]): string {
  const headers = [
    'Date',
    'Day',
    'Symbol',
    'Type',
    'Setup',
    'Position',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Quantity',
    'Fees',
    'P&L',
    'R-Factor',
    'Win/Loss',
    'Confidence',
    'Time Frame',
    'Limit',
    'Exit Level',
    'Mistake Tag',
  ];

  const rows = trades.map((t) => [
    t.date,
    t.dayOfWeek,
    t.symbol,
    t.tradeType,
    t.setupName,
    t.position,
    t.entryPrice ? `$${t.entryPrice.toFixed(2)}` : 'N/A',
    t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : 'N/A',
    `$${t.stopLoss.toFixed(2)}`,
    t.quantity,
    `$${t.fees.toFixed(2)}`,
    `$${t.pnl.toFixed(2)}`,
    t.rFactor.toFixed(2),
    t.isWin ? 'Win' : 'Loss',
    t.confidence,
    t.timeFrame || '',
    t.limit || '',
    t.exit || '',
    t.mistakeTag || '',
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Generate a monthly summary markdown
 */
export function generateMonthlySummary(
  trades: Trade[],
  month: number,
  year: number
): string {
  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
  });

  const monthTrades = trades.filter((t) => {
    const [tradeYear, tradeMonth] = t.date.split('-');
    return parseInt(tradeMonth) === month && parseInt(tradeYear) === year;
  });

  const wins = monthTrades.filter((t) => t.isWin).length;
  const losses = monthTrades.length - wins;
  const totalPnL = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
  const avgConfidence =
    monthTrades.length > 0
      ? (monthTrades.reduce((sum, t) => sum + t.confidence, 0) /
          monthTrades.length).toFixed(1)
      : 0;

  let markdown = `# ${monthName} ${year} - Trading Summary

## Monthly Statistics

| Metric | Value |
|--------|-------|
| **Total Trades** | ${monthTrades.length} |
| **Wins** | ${wins} |
| **Losses** | ${losses} |
| **Win Rate** | ${monthTrades.length > 0 ? ((wins / monthTrades.length) * 100).toFixed(1) : 0}% |
| **Total P&L** | $${totalPnL.toFixed(2)} |
| **Average Confidence** | ${avgConfidence}/10 |

---

## Trade Types Distribution

`;

  const tradeTypes = Array.from(
    new Set(monthTrades.map((t) => t.tradeType))
  ).sort();
  for (const type of tradeTypes) {
    const typeCount = monthTrades.filter((t) => t.tradeType === type).length;
    markdown += `- **${type}:** ${typeCount} trades\n`;
  }

  markdown += `\n---\n\n## Trades\n\n`;

  for (const trade of monthTrades.sort((a, b) =>
    b.date.localeCompare(a.date)
  )) {
    markdown += `### ${trade.date} - ${trade.symbol} ${trade.position}
- **P&L:** $${trade.pnl.toFixed(2)} ${trade.isWin ? '✓ WIN' : '✗ LOSS'}
- **Setup:** ${trade.setupName}
- **R Factor:** ${trade.rFactor.toFixed(2)}

`;
  }

  return markdown;
}
