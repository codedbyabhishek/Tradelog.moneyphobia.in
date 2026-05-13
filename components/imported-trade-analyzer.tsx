'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, BarChart3, FileSpreadsheet, LineChart, RefreshCcw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import type { Currency } from '@/lib/types';
import { formatCurrency } from '@/lib/trade-utils';
import {
  buildImportedTradeAnalytics,
  IMPORT_COLUMN_LABELS,
  IMPORT_PRESETS,
  parseImportedTradesFile,
  type ColumnKey,
  type ImportedTradeAnalytics,
  type ImportPresetId,
  type ImportedTradeParseResult,
} from '@/lib/imported-trade-analysis';
import { Bar, BarChart, CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis } from 'recharts';

const REPORT_CURRENCY_OPTIONS: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
const IMPORT_MAPPING_STORAGE_KEY = 'trade-import-mappings-v1';
const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ['.csv', '.json'] as const;
const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/csv',
  'application/json',
  'text/plain',
  '',
] as const;
const BLOCKED_FILE_SIGNATURES: Array<{ bytes: number[]; label: string }> = [
  { bytes: [0x4d, 0x5a], label: 'Windows executable' },
  { bytes: [0x50, 0x4b, 0x03, 0x04], label: 'ZIP-based document or archive' },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], label: 'Linux executable' },
  { bytes: [0x25, 0x50, 0x44, 0x46], label: 'PDF document' },
] as const;

function formatAmount(value: number, currency: Currency) {
  return formatCurrency(value, currency);
}

function getLowerCaseExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : '';
}

function isAllowedTextFile(file: File): void {
  const extension = getLowerCaseExtension(file.name);
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension as (typeof ALLOWED_FILE_EXTENSIONS)[number])) {
    throw new Error('Only .csv and .json trade export files are allowed.');
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
    throw new Error('This file type is not allowed. Please upload a plain CSV or JSON export.');
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error('The file is too large. Please keep trade import files under 2 MB.');
  }
}

async function validateFileSignature(file: File): Promise<void> {
  const headerBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  for (const signature of BLOCKED_FILE_SIGNATURES) {
    const matches = signature.bytes.every((byte, index) => headerBytes[index] === byte);
    if (matches) {
      throw new Error(`Blocked unsupported file content: detected ${signature.label}. Upload a plain CSV or JSON export instead.`);
    }
  }

  const suspiciousBinaryBytes = headerBytes.filter((byte) => byte === 0).length;
  if (suspiciousBinaryBytes > 0) {
    throw new Error('The file appears to contain binary data. Upload a plain text CSV or JSON export instead.');
  }
}

function validateImportText(text: string): void {
  if (!text.trim()) {
    throw new Error('The selected file does not contain readable trade data.');
  }

  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    throw new Error('The file contains unsupported control characters and was rejected for safety.');
  }
}

function sanitizeMapping(mapping: Partial<Record<ColumnKey, string>>): Partial<Record<ColumnKey, string>> {
  return Object.fromEntries(
    Object.entries(mapping).filter((entry): entry is [ColumnKey, string] => Boolean(entry[1])),
  ) as Partial<Record<ColumnKey, string>>;
}

function loadSavedMappings(): Partial<Record<ImportPresetId, Partial<Record<ColumnKey, string>>>> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(IMPORT_MAPPING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<ImportPresetId, Partial<Record<ColumnKey, string>>>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadSavedMappingForPreset(presetId: ImportPresetId): Partial<Record<ColumnKey, string>> {
  if (presetId === 'custom') return {};
  return sanitizeMapping(loadSavedMappings()[presetId] ?? {});
}

function saveMappingForPreset(presetId: ImportPresetId, mapping: Partial<Record<ColumnKey, string>>) {
  if (typeof window === 'undefined' || presetId === 'custom') return;

  const sanitized = sanitizeMapping(mapping);
  const nextMappings = {
    ...loadSavedMappings(),
    [presetId]: sanitized,
  };
  window.localStorage.setItem(IMPORT_MAPPING_STORAGE_KEY, JSON.stringify(nextMappings));
}

function clearSavedMappingForPreset(presetId: ImportPresetId) {
  if (typeof window === 'undefined' || presetId === 'custom') return;

  const nextMappings = loadSavedMappings();
  delete nextMappings[presetId];
  window.localStorage.setItem(IMPORT_MAPPING_STORAGE_KEY, JSON.stringify(nextMappings));
}

export default function ImportedTradeAnalyzer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string>('');
  const [fileText, setFileText] = useState<string>('');
  const [parseResult, setParseResult] = useState<ImportedTradeParseResult | null>(null);
  const [reportCurrency, setReportCurrency] = useState<Currency>('INR');
  const [columnMapping, setColumnMapping] = useState<Partial<Record<ColumnKey, string>>>({});
  const [selectedPreset, setSelectedPreset] = useState<ImportPresetId>('custom');

  const analytics: ImportedTradeAnalytics | null = useMemo(() => {
    if (!parseResult) return null;
    return buildImportedTradeAnalytics(parseResult.records);
  }, [parseResult]);

  const hasUsableAnalysis = Boolean(parseResult && analytics && analytics.summary.analyzedTrades > 0);
  const usableAnalytics = hasUsableAnalysis ? analytics : null;
  const hasSavedMapping = selectedPreset !== 'custom' && Object.keys(loadSavedMappingForPreset(selectedPreset)).length > 0;

  const applyMapping = (
    nextMapping: Partial<Record<ColumnKey, string>>,
    nextFileName: string,
    nextFileText: string,
    nextPreset: ImportPresetId,
  ) => {
    const parsed = parseImportedTradesFile(nextFileName, nextFileText, nextMapping, nextPreset);
    const effectivePreset = nextPreset === 'custom' ? parsed.detectedPresetId : nextPreset;
    setParseResult(parsed);
    setColumnMapping(nextMapping);
    setSelectedPreset(effectivePreset);
    setReportCurrency(parsed.inferredCurrency);
    if (effectivePreset !== 'custom') {
      saveMappingForPreset(effectivePreset, nextMapping);
    }
    return parsed;
  };

  const handleSelectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      isAllowedTextFile(file);
      await validateFileSignature(file);
      const text = await file.text();
      validateImportText(text);
      setFileText(text);
      setFileName(file.name);
      const initialParsed = parseImportedTradesFile(file.name, text, {}, 'custom');
      const rememberedMapping = loadSavedMappingForPreset(initialParsed.detectedPresetId);
      const parsed = applyMapping(rememberedMapping, file.name, text, initialParsed.detectedPresetId);
      if (parsed.records.length === 0) {
        toast({
          title: 'File loaded',
          description: 'No trades were detected automatically. Use column mapping below to match this broker format.',
        });
      } else {
        toast({
          title: 'Analysis ready',
          description:
            Object.keys(rememberedMapping).length > 0
              ? `Loaded ${parsed.records.length} trades from ${file.name} using your saved ${IMPORT_PRESETS.find((preset) => preset.id === parsed.detectedPresetId)?.label ?? 'broker'} mapping.`
              : `Loaded ${parsed.records.length} trades from ${file.name}.`,
        });
      }
    } catch (error) {
      setParseResult(null);
      setFileName('');
      setFileText('');
      setColumnMapping({});
      setSelectedPreset('custom');
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please upload a valid CSV or JSON trade export.',
        variant: 'destructive',
      });
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleColumnChange = (key: ColumnKey, value: string) => {
    if (!fileName || !fileText) return;
    const nextMapping = {
      ...columnMapping,
      [key]: value === '__none__' ? undefined : value,
    };
    applyMapping(nextMapping, fileName, fileText, selectedPreset);
  };

  const handlePresetChange = (value: string) => {
    if (!fileName || !fileText) return;
    const presetId = value as ImportPresetId;
    const rememberedMapping = loadSavedMappingForPreset(presetId);
    applyMapping(
      Object.keys(rememberedMapping).length > 0 ? rememberedMapping : columnMapping,
      fileName,
      fileText,
      presetId,
    );
  };

  const handleResetSavedMapping = () => {
    if (!fileName || !fileText || selectedPreset === 'custom') return;
    clearSavedMappingForPreset(selectedPreset);
    toast({
      title: 'Saved mapping cleared',
      description: `Future ${IMPORT_PRESETS.find((preset) => preset.id === selectedPreset)?.label ?? 'broker'} imports will use preset detection until you remap fields again.`,
    });
    applyMapping({}, fileName, fileText, selectedPreset);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imported Trade Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload broker-exported trades to generate reports without mixing them into your journal.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Safety checks: only plain `.csv` and `.json` files under 2 MB are accepted, and binary or archive-like files are rejected before parsing.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={reportCurrency} onValueChange={(value) => setReportCurrency(value as Currency)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_CURRENCY_OPTIONS.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={handleSelectFile}
            className="hidden"
          />
          <Button onClick={() => inputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Trade File
          </Button>
        </div>
      </div>

      {!parseResult ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <Empty className="border-0 py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileSpreadsheet className="size-6" />
                </EmptyMedia>
                <EmptyTitle>Analyze broker exports in one place</EmptyTitle>
                <EmptyDescription>
                  Upload a CSV or JSON file from your broker and this page will detect columns, calculate P&amp;L metrics,
                  and build key reports without linking to any other section.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => inputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Choose a trade file
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Column Mapping</CardTitle>
              <CardDescription>
                Every broker exports different headers. Match this file&apos;s columns to the fields below when auto-detection misses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Broker Preset</p>
                  <Select value={selectedPreset} onValueChange={handlePresetChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPORT_PRESETS.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  Auto-detected preset: <span className="font-medium text-foreground">{IMPORT_PRESETS.find((preset) => preset.id === parseResult.detectedPresetId)?.label ?? 'Custom'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-3 text-sm md:flex-row md:items-center md:justify-between">
                <p className="text-muted-foreground">
                  {hasSavedMapping
                    ? `This ${IMPORT_PRESETS.find((preset) => preset.id === selectedPreset)?.label ?? 'broker'} preset has a saved mapping and it will be reused automatically next time.`
                    : 'When you change mappings for a broker preset, this page now remembers them for future uploads on this device.'}
                </p>
                {selectedPreset !== 'custom' ? (
                  <Button type="button" variant="outline" onClick={handleResetSavedMapping}>
                    Clear Saved Mapping
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(Object.keys(IMPORT_COLUMN_LABELS) as ColumnKey[]).map((key) => (
                  <div key={key} className="space-y-2">
                    <p className="text-sm font-medium">{IMPORT_COLUMN_LABELS[key]}</p>
                    <Select
                      value={parseResult.detectedColumns[key] ?? '__none__'}
                      onValueChange={(value) => handleColumnChange(key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not available</SelectItem>
                        {parseResult.availableHeaders.map((header) => (
                          <SelectItem key={`${key}-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-3">
                <p className="font-medium">Sample rows from your file</p>
                <div className="mt-3 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {parseResult.availableHeaders.slice(0, 8).map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.sampleRows.map((row, index) => (
                        <TableRow key={`sample-${index}`}>
                          {parseResult.availableHeaders.slice(0, 8).map((header) => (
                            <TableCell key={`${index}-${header}`}>{row[header] || '—'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {!usableAnalytics ? (
            <Card className="border-dashed">
              <CardContent className="p-8">
                <div className="space-y-3 text-center">
                  <p className="text-lg font-semibold">Analysis is waiting for the right mapping</p>
                  <p className="text-sm text-muted-foreground">
                    Map at least `Symbol`, plus either `P&L` or `Entry Price`, `Exit Price`, `Quantity`, and `Buy / Sell`.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Net P&amp;L</CardDescription>
                <CardTitle className={usableAnalytics.summary.netPnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatAmount(usableAnalytics.summary.netPnl, reportCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {usableAnalytics.summary.analyzedTrades} analyzable trades from {usableAnalytics.summary.totalTrades} imported rows
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Win Rate</CardDescription>
                <CardTitle>{usableAnalytics.summary.winRate.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Avg trade {formatAmount(usableAnalytics.summary.averagePnl, reportCurrency)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Profit Factor</CardDescription>
                <CardTitle>{usableAnalytics.summary.profitFactor?.toFixed(2) ?? 'N/A'}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Avg win {formatAmount(usableAnalytics.summary.averageWin, reportCurrency)} / avg loss {formatAmount(usableAnalytics.summary.averageLoss, reportCurrency)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Best / Worst Trade</CardDescription>
                <CardTitle>{formatAmount(usableAnalytics.summary.bestTrade, reportCurrency)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Worst {formatAmount(usableAnalytics.summary.worstTrade, reportCurrency)}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Equity Curve
                </CardTitle>
                <CardDescription>Cumulative result across the imported trades in {fileName}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[280px] w-full"
                  config={{ cumulativePnl: { label: 'Cumulative P&L', color: '#0f766e' } }}
                >
                  <RechartsLineChart data={usableAnalytics.equityCurve}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="cumulativePnl"
                      stroke="var(--color-cumulativePnl)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </RechartsLineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Quality</CardTitle>
                <CardDescription>This section stays separate from your journal trades.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span>Total rows scanned</span>
                  <Badge variant="secondary">{parseResult.totalRows}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span>Rows skipped</span>
                  <Badge variant={parseResult.skippedRows > 0 ? 'secondary' : 'outline'}>{parseResult.skippedRows}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span>Trades missing P&amp;L inputs</span>
                  <Badge variant={usableAnalytics.summary.skippedTrades > 0 ? 'secondary' : 'outline'}>{usableAnalytics.summary.skippedTrades}</Badge>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Detected columns</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(parseResult.detectedColumns).map(([key, value]) => (
                      <Badge key={key} variant="outline">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
                {parseResult.warnings.length > 0 ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Review these notes
                    </div>
                    <div className="space-y-1">
                      {parseResult.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Button variant="outline" onClick={() => inputRef.current?.click()} className="w-full gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Upload another file
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Daily P&amp;L
                </CardTitle>
                <CardDescription>Latest 20 trading days from the import</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[280px] w-full" config={{ pnl: { label: 'P&L', color: '#1d4ed8' } }}>
                  <BarChart data={usableAnalytics.dailyPerformance}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pnl" fill="var(--color-pnl)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Long vs Short</CardTitle>
                <CardDescription>Side-level performance from the imported file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usableAnalytics.sidePerformance.map((row) => (
                    <div key={row.side} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{row.side}</p>
                        <p className={row.pnl >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                          {formatAmount(row.pnl, reportCurrency)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {row.trades} trades • {row.winRate}% win rate
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Symbols</CardTitle>
                <CardDescription>Best and worst names from the uploaded trade history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead className="text-right">P&amp;L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usableAnalytics.symbolPerformance.map((row) => (
                      <TableRow key={row.symbol}>
                        <TableCell className="font-medium">{row.symbol}</TableCell>
                        <TableCell>{row.trades}</TableCell>
                        <TableCell>{row.winRate}%</TableCell>
                        <TableCell className={`text-right ${row.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatAmount(row.pnl, reportCurrency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Imported Trades</CardTitle>
                <CardDescription>Quick review of the latest rows we were able to analyze</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">P&amp;L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usableAnalytics.recentTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>{trade.tradeDateLabel}</TableCell>
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>{trade.side}</TableCell>
                        <TableCell>{trade.quantity ?? '—'}</TableCell>
                        <TableCell className={`text-right ${(trade.pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.pnl === null ? 'N/A' : formatAmount(trade.pnl, reportCurrency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
