import type { Trade } from '@/lib/types';
import { CURRENCY_SYMBOLS } from '@/lib/trade-utils';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTradeDate(date: string, time?: string): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return escapeHtml(date);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));

  return `${formattedDate}${time ? ` at ${escapeHtml(time)}` : ''}`;
}

function formatAmount(amount: number, symbol: string): string {
  return `${escapeHtml(symbol)}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function detail(label: string, value: string | number | undefined): string {
  if (value === undefined || value === '') return '';
  return `<div class="detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function noteBlock(title: string, note: string | undefined): string {
  if (!note?.trim()) return '';
  return `<div class="note-block"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(note.trim()).replace(/\r?\n/g, '<br>')}</p></div>`;
}

export function buildTradeJournalReportHtml(trade: Trade, traderName?: string | null): string {
  const currency = trade.currency || 'USD';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '$';
  const pnl = Number.isFinite(trade.pnl) ? trade.pnl : 0;
  const isPending = trade.tags?.includes('Pending Outcome') ?? false;
  const result = isPending ? 'PENDING' : pnl > 0 ? 'WINNER' : pnl < 0 ? 'LOSS' : 'BREAK-EVEN';
  const pnlColor = isPending ? '#4b5563' : pnl >= 0 ? '#15803d' : '#b91c1c';
  const resultColor = isPending ? '#4b5563' : pnl > 0 ? '#047857' : pnl < 0 ? '#b91c1c' : '#4b5563';
  const resultBorder = isPending ? '#e5e7eb' : pnl > 0 ? '#a7f3d0' : pnl < 0 ? '#fecaca' : '#e5e7eb';
  const resultBackground = isPending ? '#f9fafb' : pnl > 0 ? '#ecfdf5' : pnl < 0 ? '#fef2f2' : '#f9fafb';
  const ruleStatus = typeof trade.ruleFollowed === 'boolean'
    ? trade.ruleFollowed ? 'Followed' : 'Needs review'
    : 'Not recorded';
  const position = trade.position === 'Buy' ? 'LONG' : 'SHORT';
  const screenshotEntries = [
    ['Before Trade', trade.beforeTradeScreenshot],
    ['After Exit', trade.afterExitScreenshot],
    ['HFT', trade.hftScreenshot],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const generatedDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
  const confidence = Math.max(0, Math.min(10, Number(trade.confidence) || 0));
  const displayName = traderName?.trim() || 'Trader';
  const safeSymbol = escapeHtml(trade.symbol || 'Trade');
  const reportTitle = `Traderlogify ${trade.symbol || 'Trade'} Journal Report ${trade.date || ''}`.trim();
  const screenshots = screenshotEntries.map(([label, source]) => `
    <figure class="screenshot-card">
      <figcaption>${escapeHtml(label)}</figcaption>
      <img src="${escapeHtml(source)}" alt="${escapeHtml(`${label} trade chart`)}">
    </figure>
  `).join('');
  const additionalDetails = [
    detail('Trade type', trade.tradeType),
    detail('Setup', trade.setupName),
    detail('Timeframe', trade.timeFrame),
    detail('Session', trade.session),
    detail('Market condition', trade.marketCondition),
    detail('Market trend', trade.marketTrend),
    detail('Emotion', trade.emotion),
    detail('Risk / reward', trade.riskRewardRatio === undefined ? undefined : `${trade.riskRewardRatio.toFixed(2)}R`),
    detail('R-factor', Number.isFinite(trade.rFactor) ? `${trade.rFactor.toFixed(2)}R` : undefined),
    detail('Fees', formatAmount(trade.fees || 0, currencySymbol)),
    detail('Tags', trade.tags?.join(', ')),
    detail('Mistake tag', trade.mistakeTag),
  ].filter(Boolean).join('');
  const notes = [
    noteBlock('Pre-trade plan', trade.preNotes),
    noteBlock('Post-trade review', trade.postNotes || trade.notes),
  ].join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #f5f7fb; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: #f5f7fb; font-size: 12px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 100%; max-width: 1000px; margin: 0 auto; }
    .masthead { display: flex; align-items: center; gap: 14px; padding: 0 0 18px; border-bottom: 2px solid #e5e7eb; }
    .brand-mark { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 12px; background: #2563eb; color: white; font-size: 24px; font-weight: 900; }
    .brand-name { font-size: 15px; font-weight: 800; letter-spacing: .02em; }
    .report-name { margin-left: 14px; padding-left: 18px; border-left: 1px solid #d1d5db; color: #111827; font-size: 17px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .hero { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 20px; align-items: center; margin-top: 20px; padding: 24px; border: 1px solid #dfe3eb; border-radius: 14px; background: linear-gradient(135deg, #fff 0%, #f4f8ff 100%); }
    .eyebrow { margin: 0 0 6px; color: #4b5563; font-size: 10px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
    .trade-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    h1 { margin: 0; font-size: 36px; line-height: 1.1; letter-spacing: -.04em; }
    .badge { display: inline-flex; align-items: center; border: 1px solid #bfdbfe; border-radius: 999px; padding: 5px 11px; color: #1d4ed8; background: #eff6ff; font-size: 10px; font-weight: 800; letter-spacing: .07em; }
    .badge.result { border-color: ${resultBorder}; color: ${resultColor}; background: ${resultBackground}; }
    .subtitle { margin: 12px 0 0; color: #4b5563; font-size: 14px; }
    .pnl-card { padding: 17px 18px; border: 1px solid #e5e7eb; border-radius: 13px; background: white; }
    .pnl-card strong { display: block; margin: 5px 0; color: ${pnlColor}; font-size: 31px; line-height: 1.2; }
    .muted { color: #6b7280; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .metric { min-height: 94px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; }
    .metric-label { color: #4b5563; font-size: 10px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    .metric-value { margin: 7px 0 2px; overflow-wrap: anywhere; font-size: 20px; font-weight: 800; line-height: 1.2; }
    .metric-note { color: #6b7280; font-size: 11px; }
    .content-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .9fr); gap: 24px; margin-top: 24px; }
    .section-title { display: flex; align-items: center; gap: 9px; margin: 0 0 11px; padding-bottom: 9px; border-bottom: 1px solid #dfe3eb; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .section-title:before { content: ''; width: 4px; height: 17px; border-radius: 4px; background: #2563eb; }
    .note-block { margin-bottom: 12px; padding: 13px 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: white; break-inside: avoid; }
    .note-block h3 { margin: 0 0 6px; color: #374151; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
    .note-block p { margin: 0; color: #374151; white-space: normal; overflow-wrap: anywhere; }
    .empty-note { padding: 16px 0; color: #6b7280; }
    .review-panel { padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; break-inside: avoid; }
    .review-status { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 11px; border-bottom: 1px solid #dfe3eb; font-weight: 700; }
    .rule-status { color: ${trade.ruleFollowed ? '#047857' : '#b45309'}; }
    .details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; margin-top: 7px; }
    .detail { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail span { color: #6b7280; font-size: 10px; }
    .detail strong { overflow-wrap: anywhere; font-size: 11px; }
    .score { margin-top: 15px; }
    .score-label { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .score-track { height: 9px; margin: 7px 0 5px; overflow: hidden; border-radius: 999px; background: #dfe3eb; }
    .score-fill { width: ${confidence * 10}%; height: 100%; border-radius: inherit; background: #2563eb; }
    .screenshots { margin-top: 24px; }
    .screenshot-card { margin: 12px 0 0; padding: 12px; border: 1px solid #dfe3eb; border-radius: 12px; background: white; break-inside: avoid; page-break-inside: avoid; }
    .screenshot-card figcaption { margin-bottom: 8px; color: #374151; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .screenshot-card img { display: block; width: 100%; max-height: 235mm; border-radius: 7px; object-fit: contain; }
    .image-unavailable { padding: 28px 16px; border-radius: 7px; background: #f1f5f9; color: #64748b; text-align: center; }
    .no-screenshots { padding: 17px; border: 1px dashed #cbd5e1; border-radius: 10px; color: #64748b; text-align: center; }
    footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 22px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 9px; }
    @page { size: A4; margin: 10mm; }
    @media print {
      body { padding: 0; background: white; font-size: 10px; }
      .page { max-width: none; }
      .masthead { padding-bottom: 12px; }
      .brand-mark { width: 38px; height: 38px; }
      .hero { margin-top: 14px; padding: 17px; }
      h1 { font-size: 30px; }
      .metrics { gap: 8px; margin-top: 12px; }
      .metric { min-height: 78px; padding: 11px; }
      .metric-value { font-size: 17px; }
      .content-grid { gap: 16px; margin-top: 18px; }
      .screenshots { margin-top: 18px; }
      footer { margin-top: 16px; }
    }
    @media screen and (max-width: 650px) {
      body { padding: 12px; }
      .hero { grid-template-columns: 1fr; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .content-grid { grid-template-columns: 1fr; }
      .report-name { margin-left: auto; padding-left: 12px; font-size: 12px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="masthead">
      <div class="brand-mark">T</div>
      <div class="brand-name">Traderlogify</div>
      <div class="report-name">Trade Journal Report</div>
    </header>

    <section class="hero">
      <div>
        <p class="eyebrow">Reviewed trade</p>
        <div class="trade-heading">
          <h1>${safeSymbol}</h1>
          <span class="badge">${position}</span>
          <span class="badge result">${result}</span>
        </div>
        <p class="subtitle">${escapeHtml(displayName)}'s trade · ${formatTradeDate(trade.date)}</p>
      </div>
      <div class="pnl-card">
        <span class="metric-label">Net P&amp;L</span>
        <strong>${isPending ? '—' : `${pnl > 0 ? '+' : pnl < 0 ? '−' : ''}${formatAmount(Math.abs(pnl), currencySymbol)}`}</strong>
        <span class="metric-label">${isPending ? 'Outcome not recorded' : pnl > 0 ? 'Positive close' : pnl < 0 ? 'Negative close' : 'Breakeven close'}</span>
      </div>
    </section>

    <section class="metrics" aria-label="Trade summary">
      <div class="metric">
        <div class="metric-label">Entry</div>
        <div class="metric-value">${trade.entryPrice === undefined ? '—' : formatAmount(trade.entryPrice, currencySymbol)}</div>
        <div class="metric-note">${formatTradeDate(trade.entryDate || trade.date, trade.entryTime)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Exit</div>
        <div class="metric-value">${trade.exitPrice === undefined ? '—' : formatAmount(trade.exitPrice, currencySymbol)}</div>
        <div class="metric-note">${formatTradeDate(trade.exitDate || trade.date, trade.exitTime)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Position size</div>
        <div class="metric-value">${escapeHtml(String(trade.quantity))}</div>
        <div class="metric-note">${position === 'LONG' ? 'Long' : 'Short'} position</div>
      </div>
      <div class="metric">
        <div class="metric-label">Stop loss</div>
        <div class="metric-value">${formatAmount(trade.stopLossPrice ?? trade.stopLoss, currencySymbol)}</div>
        <div class="metric-note">Risk management</div>
      </div>
    </section>

    <section class="content-grid">
      <div>
        <h2 class="section-title">Journal breakdown</h2>
        ${notes || '<p class="empty-note">No journal notes were saved for this trade.</p>'}
      </div>
      <aside>
        <h2 class="section-title">Execution review</h2>
        <div class="review-panel">
          <div class="review-status">
            <span>Rule adherence</span>
            <span class="rule-status">${ruleStatus}</span>
          </div>
          <div class="details">
            ${detail('Confidence', `${confidence}/10`)}
            ${detail('Day', trade.dayOfWeek)}
            ${additionalDetails}
          </div>
          <div class="score">
            <div class="score-label"><span>Confidence score</span><span>${confidence} / 10</span></div>
            <div class="score-track"><div class="score-fill"></div></div>
          </div>
        </div>
      </aside>
    </section>

    <section class="screenshots">
      <h2 class="section-title">Trade screenshots</h2>
      ${screenshots || '<div class="no-screenshots">No screenshots were attached to this trade.</div>'}
    </section>

    <footer>
      <span>Generated ${generatedDate} · ${escapeHtml(displayName)}</span>
      <span>Traderlogify · Trade with intention</span>
    </footer>
  </main>
</body>
</html>`;
}

export function openTradeJournalReportPDF(
  trade: Trade,
  traderName?: string | null,
  onError?: (error: unknown) => void,
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildTradeJournalReportHtml(trade, traderName));
  printWindow.document.close();

  const imagesReady = Promise.all(
    Array.from(printWindow.document.images, (image) => image.decode().catch((error: unknown) => {
      console.error('[TradeReport] Screenshot could not be loaded for the PDF report', error);
      const unavailable = printWindow.document.createElement('div');
      unavailable.className = 'image-unavailable';
      unavailable.textContent = `${image.alt} could not be loaded. Reopen the trade in Traderlogify to view its screenshot.`;
      image.replaceWith(unavailable);
    })),
  );
  void Promise.race([
    imagesReady,
    new Promise<void>((resolve) => window.setTimeout(resolve, 8000)),
  ]).then(() => {
    if (printWindow.closed) return;
    printWindow.focus();
    printWindow.print();
  }).catch((error: unknown) => {
    console.error('[TradeReport] Could not open the PDF print dialog', error);
    printWindow.close();
    onError?.(error);
  });

  return true;
}
