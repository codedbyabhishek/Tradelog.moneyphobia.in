/**
 * Data Export & Import Service
 * Handles CSV export, JSON export, PDF reports, and trade imports
 */

'use client';

import { Trade } from '@/lib/types';
import { calculatePnL, calculateRFactor } from '@/lib/trade-utils';
import { format } from 'date-fns';

/**
 * Export trades to CSV
 */
export function exportTradesCSV(trades: Trade[], filename?: string): void {
  const headers = [
    'Date',
    'Symbol',
    'Setup',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Quantity',
    'P&L',
    'R-Factor',
    'Duration (hours)',
    'Emotion',
    'Notes'
  ];

  const rows = trades.map((trade) => {
    const pnl = calculatePnL(trade);
    const rFactor = calculateRFactor(trade);
    const duration = (new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) / (1000 * 60 * 60);

    return [
      format(new Date(trade.entryDate), 'yyyy-MM-dd HH:mm'),
      trade.symbol,
      trade.setupName,
      trade.entryPrice.toFixed(2),
      trade.exitPrice.toFixed(2),
      trade.stopLossPrice.toFixed(2),
      trade.quantity,
      pnl.toFixed(2),
      rFactor.toFixed(2),
      duration.toFixed(1),
      trade.emotion || '',
      trade.notes || ''
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const stringCell = String(cell);
      return stringCell.includes(',') ? `"${stringCell}"` : stringCell;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `trades-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export trades to JSON
 */
export function exportTradesJSON(trades: Trade[], filename?: string): void {
  const enrichedTrades = trades.map((trade) => ({
    ...trade,
    pnl: calculatePnL(trade),
    rFactor: calculateRFactor(trade),
    exportedAt: new Date().toISOString(),
  }));

  const json = JSON.stringify(enrichedTrades, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `trades-${format(new Date(), 'yyyy-MM-dd')}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate PDF report
 * Note: Requires html2pdf library to be installed
 */
export function generatePDFReport(
  trades: Trade[],
  stats: any,
  filename?: string
): void {
  const totalPnL = trades.reduce((sum, trade) => sum + calculatePnL(trade), 0);
  const winningTrades = trades.filter(t => calculatePnL(t) > 0);
  const losingTrades = trades.filter(t => calculatePnL(t) < 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f3f4f6; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat-box { padding: 15px; background-color: #f3f4f6; border-radius: 8px; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <h1>Trading Journal Report</h1>
      <p>Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>

      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-label">Total Trades</div>
          <div class="stat-value">${trades.length}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total P&L</div>
          <div class="stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}">$${totalPnL.toFixed(2)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Win Rate</div>
          <div class="stat-value">${((winningTrades.length / trades.length) * 100).toFixed(1)}%</div>
        </div>
      </div>

      <h2>Performance Summary</h2>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Winning Trades</td>
          <td class="positive">${winningTrades.length}</td>
        </tr>
        <tr>
          <td>Losing Trades</td>
          <td class="negative">${losingTrades.length}</td>
        </tr>
        <tr>
          <td>Average Win</td>
          <td class="positive">$${(
            winningTrades.reduce((sum, t) => sum + calculatePnL(t), 0) / Math.max(winningTrades.length, 1)
          ).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Average Loss</td>
          <td class="negative">-$${Math.abs(
            losingTrades.reduce((sum, t) => sum + calculatePnL(t), 0) / Math.max(losingTrades.length, 1)
          ).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Profit Factor</td>
          <td>${(
            winningTrades.reduce((sum, t) => sum + calculatePnL(t), 0) /
            Math.max(Math.abs(losingTrades.reduce((sum, t) => sum + calculatePnL(t), 0)), 1)
          ).toFixed(2)}</td>
        </tr>
      </table>

      <h2>Recent Trades</h2>
      <table>
        <tr>
          <th>Date</th>
          <th>Symbol</th>
          <th>Setup</th>
          <th>Entry</th>
          <th>Exit</th>
          <th>P&L</th>
        </tr>
        ${trades.slice(-20).map(trade => `
          <tr>
            <td>${format(new Date(trade.entryDate), 'yyyy-MM-dd')}</td>
            <td>${trade.symbol}</td>
            <td>${trade.setupName}</td>
            <td>$${trade.entryPrice.toFixed(2)}</td>
            <td>$${trade.exitPrice.toFixed(2)}</td>
            <td class="${calculatePnL(trade) >= 0 ? 'positive' : 'negative'}">${calculatePnL(trade) >= 0 ? '+' : ''}$${calculatePnL(trade).toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>

      <div class="footer">
        <p>This report contains confidential trading information.</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `trading-report-${format(new Date(), 'yyyy-MM-dd')}.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Import trades from CSV
 */
export async function importTradesFromCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const trades = lines
          .slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim());
            return {
              date: values[0],
              symbol: values[1],
              setup: values[2],
              entryPrice: parseFloat(values[3]),
              exitPrice: parseFloat(values[4]),
              stopLoss: parseFloat(values[5]),
              quantity: parseFloat(values[6]),
              notes: values[11] || ''
            };
          });

        resolve(trades);
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import trades from JSON
 */
export async function importTradesFromJSON(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const trades = JSON.parse(json);

        if (!Array.isArray(trades)) {
          reject(new Error('JSON must contain an array of trades'));
          return;
        }

        resolve(trades);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate imported trades
 */
export function validateImportedTrades(trades: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  trades.forEach((trade, index) => {
    const requiredFields = ['symbol', 'entryPrice', 'exitPrice', 'quantity'];
    requiredFields.forEach(field => {
      if (!trade[field]) {
        errors.push(`Trade ${index + 1}: Missing ${field}`);
      }
    });

    if (trade.entryPrice && isNaN(parseFloat(trade.entryPrice))) {
      errors.push(`Trade ${index + 1}: Invalid entry price`);
    }

    if (trade.exitPrice && isNaN(parseFloat(trade.exitPrice))) {
      errors.push(`Trade ${index + 1}: Invalid exit price`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
