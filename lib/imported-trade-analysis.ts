import { format, parse } from 'date-fns';
import type { Currency } from '@/lib/types';
import type { BrokerId } from '@/lib/brokers';

export type ImportedTradeSide = 'Buy' | 'Sell' | 'Unknown';

export interface ImportedTradeRecord {
  id: string;
  rawIndex: number;
  tradeDate: string | null;
  tradeDateLabel: string;
  symbol: string;
  side: ImportedTradeSide;
  quantity: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  fees: number;
  pnl: number | null;
  broker: string | null;
  raw: Record<string, string>;
}

export interface ImportedTradeParseResult {
  records: ImportedTradeRecord[];
  skippedRows: number;
  totalRows: number;
  detectedColumns: Partial<Record<ColumnKey, string>>;
  availableHeaders: string[];
  sampleRows: Array<Record<string, string>>;
  warnings: string[];
  inferredCurrency: Currency;
  detectedPresetId: ImportPresetId;
}

export type ColumnKey =
  | 'date'
  | 'symbol'
  | 'side'
  | 'quantity'
  | 'entryPrice'
  | 'exitPrice'
  | 'fees'
  | 'pnl'
  | 'broker';

export const IMPORT_COLUMN_LABELS: Record<ColumnKey, string> = {
  date: 'Trade Date',
  symbol: 'Symbol',
  side: 'Buy / Sell',
  quantity: 'Quantity',
  entryPrice: 'Entry Price',
  exitPrice: 'Exit Price',
  fees: 'Fees / Charges',
  pnl: 'P&L',
  broker: 'Broker',
};

export type ImportPresetId = BrokerId | 'binance' | 'custom';

export interface ImportPresetDefinition {
  id: ImportPresetId;
  label: string;
  fileNameHints?: string[];
  headerHints?: string[];
  mapping: Partial<Record<ColumnKey, string[]>>;
}

export const IMPORT_PRESETS: ImportPresetDefinition[] = [
  {
    id: 'custom',
    label: 'Auto Detect / Custom',
    mapping: {},
  },
  {
    id: 'dhan',
    label: 'Dhan',
    fileNameHints: ['dhan'],
    headerHints: ['securityid', 'exchangetime', 'transactiontype', 'tradingSymbol'],
    mapping: {
      date: ['exchangeTime', 'updateTime', 'createTime'],
      symbol: ['tradingSymbol', 'customSymbol', 'securityId'],
      side: ['transactionType'],
      quantity: ['tradedQuantity', 'quantity'],
      entryPrice: ['price'],
      fees: ['drvChargeAmount', 'charges'],
      broker: ['dhanClientId'],
    },
  },
  {
    id: 'zerodha',
    label: 'Zerodha',
    fileNameHints: ['zerodha', 'kite'],
    headerHints: ['tradingsymbol', 'exchange_order_id', 'average_price'],
    mapping: {
      date: ['order_timestamp', 'exchange_timestamp', 'date'],
      symbol: ['tradingsymbol', 'symbol'],
      side: ['transaction_type', 'side'],
      quantity: ['filled_quantity', 'quantity'],
      entryPrice: ['average_price', 'price'],
      pnl: ['pnl', 'net_amount'],
      fees: ['charges', 'brokerage'],
      broker: ['account_id'],
    },
  },
  {
    id: 'upstox',
    label: 'Upstox',
    fileNameHints: ['upstox'],
    headerHints: ['trading_symbol', 'trade_type', 'average_price'],
    mapping: {
      date: ['trade_date', 'order_timestamp', 'exchange_time'],
      symbol: ['trading_symbol', 'symbol'],
      side: ['trade_type', 'side'],
      quantity: ['quantity', 'filled_quantity'],
      entryPrice: ['average_price', 'price'],
      pnl: ['pnl', 'realized_pnl'],
      fees: ['charges', 'brokerage'],
      broker: ['client_id'],
    },
  },
  {
    id: 'angelone',
    label: 'Angel One',
    fileNameHints: ['angel', 'angelone', 'smartapi'],
    headerHints: ['tradingsymbol', 'transactiontype', 'averageprice'],
    mapping: {
      date: ['updatetime', 'exchtime', 'date'],
      symbol: ['tradingsymbol', 'symbolname', 'symbol'],
      side: ['transactiontype', 'side'],
      quantity: ['filledshares', 'quantity', 'qty'],
      entryPrice: ['averageprice', 'price'],
      pnl: ['pnl', 'netamount'],
      fees: ['charges', 'brokerage'],
      broker: ['clientcode'],
    },
  },
  {
    id: 'binance',
    label: 'Binance',
    fileNameHints: ['binance'],
    headerHints: ['realized pnl', 'executed price', 'side'],
    mapping: {
      date: ['time', 'date'],
      symbol: ['symbol', 'pair'],
      side: ['side', 'position side'],
      quantity: ['quantity', 'qty', 'executed qty'],
      entryPrice: ['executed price', 'price', 'avg price'],
      pnl: ['realized pnl', 'pnl'],
      fees: ['fee', 'commission'],
      broker: ['account'],
    },
  },
];

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  date: ['date', 'trade date', 'order date', 'execution date', 'timestamp', 'time', 'created at'],
  symbol: ['symbol', 'stock', 'instrument', 'ticker', 'tradingsymbol', 'scrip', 'security'],
  side: ['side', 'action', 'type', 'transaction type', 'buy/sell', 'product side'],
  quantity: ['quantity', 'qty', 'filled quantity', 'net quantity', 'shares', 'lots'],
  entryPrice: ['entry price', 'buy price', 'average buy price', 'avg buy price', 'avg price', 'entry', 'price'],
  exitPrice: ['exit price', 'sell price', 'average sell price', 'avg sell price', 'exit'],
  fees: ['fees', 'charges', 'brokerage', 'total charges', 'commission', 'tax', 'taxes'],
  pnl: ['p&l', 'pnl', 'net pnl', 'realized pnl', 'realised pnl', 'profit/loss', 'profit', 'net amount'],
  broker: ['broker', 'source', 'account', 'platform'],
};

const DATE_FORMATS = [
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy/MM/dd',
  'dd MMM yyyy',
  'MMM dd yyyy',
  'dd MMM yyyy HH:mm:ss',
  'yyyy-MM-dd HH:mm:ss',
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd'T'HH:mm:ss.SSSX",
] as const;

const MAX_IMPORT_ROWS = 10000;
const MAX_IMPORT_COLUMNS = 200;
const MAX_CELL_LENGTH = 5000;
const FORMULA_INJECTION_PATTERN = /^[=+\-@]/;
const SCRIPT_INJECTION_PATTERN = /<\s*(script|iframe|object|embed|svg|img|a)\b|javascript:|onerror\s*=|onload\s*=/i;

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slugify(value: string): string {
  return normalizeHeader(value).replace(/\s+/g, '_');
}

function parseDelimitedLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseDelimitedLine(lines[0]).map((header, index) => header || `column_${index + 1}`);

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

function parseJson(text: string): Array<Record<string, string>> {
  const parsed = JSON.parse(text);
  const rows: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).trades)
      ? ((parsed as Record<string, unknown>).trades as unknown[])
      : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, value == null ? '' : String(value)]),
      ),
    );
}

function trimRowsForSafety(rows: Array<Record<string, string>>, warnings: string[]): Array<Record<string, string>> {
  if (rows.length > MAX_IMPORT_ROWS) {
    warnings.push(`Only the first ${MAX_IMPORT_ROWS.toLocaleString()} rows were analyzed to protect performance.`);
    return rows.slice(0, MAX_IMPORT_ROWS);
  }

  return rows;
}

function scanRowsForThreatSignals(
  rows: Array<Record<string, string>>,
  availableHeaders: string[],
  warnings: string[],
): void {
  if (availableHeaders.length > MAX_IMPORT_COLUMNS) {
    warnings.push(`The file contains ${availableHeaders.length} columns. Very wide files may be malformed or abusive.`);
  }

  let oversizedCellFound = false;
  let formulaLikeCellFound = false;
  let scriptLikeCellFound = false;

  rows.slice(0, 200).forEach((row) => {
    Object.values(row).forEach((value) => {
      if (!oversizedCellFound && value.length > MAX_CELL_LENGTH) {
        oversizedCellFound = true;
      }

      const trimmed = value.trim();
      if (!formulaLikeCellFound && FORMULA_INJECTION_PATTERN.test(trimmed)) {
        formulaLikeCellFound = true;
      }

      if (!scriptLikeCellFound && SCRIPT_INJECTION_PATTERN.test(trimmed)) {
        scriptLikeCellFound = true;
      }
    });
  });

  if (oversizedCellFound) {
    warnings.push('Some cells are unusually large. Oversized text can be a sign of malformed or abusive input.');
  }

  if (formulaLikeCellFound) {
    warnings.push('Spreadsheet formula-like cells were detected. They are treated as plain text here and never executed.');
  }

  if (scriptLikeCellFound) {
    warnings.push('HTML or script-like content was detected in the import. It is displayed as plain text and not executed.');
  }
}

function detectColumns(rows: Array<Record<string, string>>): Partial<Record<ColumnKey, string>> {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  const detected: Partial<Record<ColumnKey, string>> = {};

  (Object.keys(COLUMN_ALIASES) as ColumnKey[]).forEach((key) => {
    const aliases = COLUMN_ALIASES[key];
    const exact = normalizedHeaders.find((header) => aliases.includes(header.normalized));
    if (exact) {
      detected[key] = exact.original;
      return;
    }

    const fuzzy = normalizedHeaders.find((header) => aliases.some((alias) => header.normalized.includes(alias)));
    if (fuzzy) {
      detected[key] = fuzzy.original;
    }
  });

  return detected;
}

function findMatchingHeader(headers: string[], candidates: string[]): string | undefined {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const exact = normalizedHeaders.find((header) => header.normalized === normalizedCandidate);
    if (exact) return exact.original;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const partial = normalizedHeaders.find(
      (header) =>
        header.normalized.includes(normalizedCandidate) || normalizedCandidate.includes(header.normalized),
    );
    if (partial) return partial.original;
  }

  return undefined;
}

function getPresetMapping(
  presetId: ImportPresetId | undefined,
  headers: string[],
): Partial<Record<ColumnKey, string>> {
  if (!presetId || presetId === 'custom') {
    return {};
  }

  const preset = IMPORT_PRESETS.find((item) => item.id === presetId);
  if (!preset) return {};

  const mapping: Partial<Record<ColumnKey, string>> = {};
  (Object.keys(preset.mapping) as ColumnKey[]).forEach((key) => {
    const match = findMatchingHeader(headers, preset.mapping[key] ?? []);
    if (match) {
      mapping[key] = match;
    }
  });
  return mapping;
}

function detectPreset(fileName: string, headers: string[]): ImportPresetId {
  const normalizedFileName = normalizeHeader(fileName);
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  let bestMatch: { id: ImportPresetId; score: number } = { id: 'custom', score: 0 };

  IMPORT_PRESETS.filter((preset) => preset.id !== 'custom').forEach((preset) => {
    let score = 0;
    score += (preset.fileNameHints ?? []).filter((hint) => normalizedFileName.includes(normalizeHeader(hint))).length * 3;
    score += (preset.headerHints ?? []).filter((hint) =>
      normalizedHeaders.some((header) => header.includes(normalizeHeader(hint))),
    ).length;

    if (score > bestMatch.score) {
      bestMatch = { id: preset.id, score };
    }
  });

  return bestMatch.score > 0 ? bestMatch.id : 'custom';
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value
    .replace(/,/g, '')
    .replace(/[₹$€£¥A-Za-z]/g, '')
    .replace(/\(([^)]+)\)/, '-$1')
    .trim();

  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTradeSide(value: string | undefined): ImportedTradeSide {
  if (!value) return 'Unknown';
  const normalized = normalizeHeader(value);
  if (normalized.includes('buy') || normalized === 'long') return 'Buy';
  if (normalized.includes('sell') || normalized === 'short') return 'Sell';
  return 'Unknown';
}

function parseTradeDate(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const nativeDate = new Date(raw);
  if (!Number.isNaN(nativeDate.getTime())) {
    return format(nativeDate, 'yyyy-MM-dd');
  }

  for (const dateFormat of DATE_FORMATS) {
    const parsed = parse(raw, dateFormat, new Date());
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  return null;
}

function inferCurrency(text: string): Currency {
  if (text.includes('$')) return 'USD';
  if (text.includes('€')) return 'EUR';
  if (text.includes('£')) return 'GBP';
  if (text.includes('¥')) return 'JPY';
  return 'INR';
}

function computePnl(params: {
  pnl: number | null;
  side: ImportedTradeSide;
  entryPrice: number | null;
  exitPrice: number | null;
  quantity: number | null;
  fees: number;
}): number | null {
  if (params.pnl !== null) return params.pnl;
  if (
    params.entryPrice === null ||
    params.exitPrice === null ||
    params.quantity === null ||
    params.side === 'Unknown'
  ) {
    return null;
  }

  const gross =
    params.side === 'Buy'
      ? (params.exitPrice - params.entryPrice) * params.quantity
      : (params.entryPrice - params.exitPrice) * params.quantity;

  return gross - params.fees;
}

export interface ImportedTradeAnalytics {
  summary: {
    totalTrades: number;
    analyzedTrades: number;
    skippedTrades: number;
    netPnl: number;
    winRate: number;
    grossProfit: number;
    grossLoss: number;
    averagePnl: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number | null;
    bestTrade: number;
    worstTrade: number;
  };
  equityCurve: Array<{ date: string; cumulativePnl: number }>;
  dailyPerformance: Array<{ date: string; pnl: number; trades: number }>;
  monthlyPerformance: Array<{ month: string; pnl: number; trades: number }>;
  symbolPerformance: Array<{ symbol: string; pnl: number; trades: number; winRate: number }>;
  sidePerformance: Array<{ side: string; pnl: number; trades: number; winRate: number }>;
  recentTrades: ImportedTradeRecord[];
}

export function parseImportedTradesFile(
  fileName: string,
  text: string,
  columnOverrides?: Partial<Record<ColumnKey, string>>,
  selectedPresetId?: ImportPresetId,
): ImportedTradeParseResult {
  const normalizedFileName = fileName.toLowerCase();
  const initialRows = normalizedFileName.endsWith('.json') ? parseJson(text) : parseCsv(text);
  const warnings: string[] = [];
  const rows = trimRowsForSafety(initialRows, warnings);
  const availableHeaders = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const detectedPresetId = selectedPresetId && selectedPresetId !== 'custom'
    ? selectedPresetId
    : detectPreset(fileName, availableHeaders);
  const presetMapping = getPresetMapping(detectedPresetId, availableHeaders);
  const autoDetectedColumns = detectColumns(rows);
  const detectedColumns = { ...autoDetectedColumns, ...presetMapping, ...columnOverrides };
  scanRowsForThreatSignals(rows, availableHeaders, warnings);

  if (!detectedColumns.symbol) {
    warnings.push('Map the symbol column to start analyzing rows from this broker file.');
  }

  if (!detectedColumns.pnl && !(detectedColumns.entryPrice && detectedColumns.exitPrice && detectedColumns.quantity)) {
    warnings.push('Map either a P&L column, or map entry price, exit price, quantity, and side so P&L can be calculated.');
  }

  const records: ImportedTradeRecord[] = [];
  let skippedRows = 0;

  rows.forEach((row, index) => {
    const symbol = (detectedColumns.symbol ? row[detectedColumns.symbol] : '').trim().toUpperCase();
    if (!symbol) {
      skippedRows += 1;
      return;
    }

    const side = parseTradeSide(detectedColumns.side ? row[detectedColumns.side] : undefined);
    const quantity = parseNumber(detectedColumns.quantity ? row[detectedColumns.quantity] : undefined);
    const entryPrice = parseNumber(detectedColumns.entryPrice ? row[detectedColumns.entryPrice] : undefined);
    const exitPrice = parseNumber(detectedColumns.exitPrice ? row[detectedColumns.exitPrice] : undefined);
    const fees = parseNumber(detectedColumns.fees ? row[detectedColumns.fees] : undefined) ?? 0;
    const pnlValue = parseNumber(detectedColumns.pnl ? row[detectedColumns.pnl] : undefined);
    const pnl = computePnl({ pnl: pnlValue, side, entryPrice, exitPrice, quantity, fees });
    const tradeDate = parseTradeDate(detectedColumns.date ? row[detectedColumns.date] : undefined);

    records.push({
      id: `${slugify(symbol)}-${index + 1}`,
      rawIndex: index + 1,
      tradeDate,
      tradeDateLabel: tradeDate ?? 'Unknown date',
      symbol,
      side,
      quantity,
      entryPrice,
      exitPrice,
      fees,
      pnl,
      broker: detectedColumns.broker ? row[detectedColumns.broker] || null : null,
      raw: row,
    });
  });

  const rawTextForCurrency = rows.slice(0, 10).map((row) => Object.values(row).join(' ')).join(' ');

  return {
    records,
    skippedRows,
    totalRows: rows.length,
    detectedColumns,
    availableHeaders,
    sampleRows: rows.slice(0, 5),
    warnings,
    inferredCurrency: inferCurrency(rawTextForCurrency),
    detectedPresetId,
  };
}

export function buildImportedTradeAnalytics(records: ImportedTradeRecord[]): ImportedTradeAnalytics {
  const analyzable = records.filter((record) => typeof record.pnl === 'number');
  const sortedByDate = [...analyzable].sort((left, right) => {
    const leftDate = left.tradeDate ?? '9999-99-99';
    const rightDate = right.tradeDate ?? '9999-99-99';
    return leftDate.localeCompare(rightDate);
  });

  const wins = analyzable.filter((record) => (record.pnl ?? 0) > 0);
  const losses = analyzable.filter((record) => (record.pnl ?? 0) < 0);
  const grossProfit = wins.reduce((sum, record) => sum + (record.pnl ?? 0), 0);
  const grossLoss = losses.reduce((sum, record) => sum + Math.abs(record.pnl ?? 0), 0);
  const netPnl = analyzable.reduce((sum, record) => sum + (record.pnl ?? 0), 0);

  const equityCurve: Array<{ date: string; cumulativePnl: number }> = [];
  let runningPnl = 0;
  sortedByDate.forEach((record) => {
    runningPnl += record.pnl ?? 0;
    equityCurve.push({
      date: record.tradeDateLabel,
      cumulativePnl: Number(runningPnl.toFixed(2)),
    });
  });

  const dailyMap = new Map<string, { pnl: number; trades: number }>();
  const monthlyMap = new Map<string, { pnl: number; trades: number }>();
  const symbolMap = new Map<string, { pnl: number; trades: number; wins: number }>();
  const sideMap = new Map<string, { pnl: number; trades: number; wins: number }>();

  analyzable.forEach((record) => {
    const dateKey = record.tradeDateLabel;
    const monthKey = record.tradeDate ? record.tradeDate.slice(0, 7) : 'Unknown';
    const pnl = record.pnl ?? 0;

    const daily = dailyMap.get(dateKey) ?? { pnl: 0, trades: 0 };
    daily.pnl += pnl;
    daily.trades += 1;
    dailyMap.set(dateKey, daily);

    const monthly = monthlyMap.get(monthKey) ?? { pnl: 0, trades: 0 };
    monthly.pnl += pnl;
    monthly.trades += 1;
    monthlyMap.set(monthKey, monthly);

    const symbol = symbolMap.get(record.symbol) ?? { pnl: 0, trades: 0, wins: 0 };
    symbol.pnl += pnl;
    symbol.trades += 1;
    symbol.wins += pnl > 0 ? 1 : 0;
    symbolMap.set(record.symbol, symbol);

    const side = sideMap.get(record.side) ?? { pnl: 0, trades: 0, wins: 0 };
    side.pnl += pnl;
    side.trades += 1;
    side.wins += pnl > 0 ? 1 : 0;
    sideMap.set(record.side, side);
  });

  return {
    summary: {
      totalTrades: records.length,
      analyzedTrades: analyzable.length,
      skippedTrades: records.length - analyzable.length,
      netPnl: Number(netPnl.toFixed(2)),
      winRate: analyzable.length ? Number(((wins.length / analyzable.length) * 100).toFixed(1)) : 0,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      averagePnl: analyzable.length ? Number((netPnl / analyzable.length).toFixed(2)) : 0,
      averageWin: wins.length ? Number((grossProfit / wins.length).toFixed(2)) : 0,
      averageLoss: losses.length ? Number((losses.reduce((sum, record) => sum + (record.pnl ?? 0), 0) / losses.length).toFixed(2)) : 0,
      profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : null,
      bestTrade: analyzable.length ? Math.max(...analyzable.map((record) => record.pnl ?? 0)) : 0,
      worstTrade: analyzable.length ? Math.min(...analyzable.map((record) => record.pnl ?? 0)) : 0,
    },
    equityCurve,
    dailyPerformance: [...dailyMap.entries()]
      .map(([date, value]) => ({ date, pnl: Number(value.pnl.toFixed(2)), trades: value.trades }))
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-20),
    monthlyPerformance: [...monthlyMap.entries()]
      .map(([month, value]) => ({ month, pnl: Number(value.pnl.toFixed(2)), trades: value.trades }))
      .sort((left, right) => left.month.localeCompare(right.month)),
    symbolPerformance: [...symbolMap.entries()]
      .map(([symbol, value]) => ({
        symbol,
        pnl: Number(value.pnl.toFixed(2)),
        trades: value.trades,
        winRate: Number(((value.wins / value.trades) * 100).toFixed(1)),
      }))
      .sort((left, right) => right.pnl - left.pnl)
      .slice(0, 12),
    sidePerformance: [...sideMap.entries()]
      .map(([side, value]) => ({
        side,
        pnl: Number(value.pnl.toFixed(2)),
        trades: value.trades,
        winRate: Number(((value.wins / value.trades) * 100).toFixed(1)),
      }))
      .sort((left, right) => right.pnl - left.pnl),
    recentTrades: [...sortedByDate].reverse().slice(0, 12),
  };
}
