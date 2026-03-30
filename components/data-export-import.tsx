'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trade } from '@/lib/types';
import {
  exportTradesCSV,
  exportTradesJSON,
  generatePDFReport,
  importTradesFromCSV,
  importTradesFromJSON,
  validateImportedTrades,
} from '@/lib/data-export-import';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface DataExportImportProps {
  trades: Trade[];
  onImport?: (trades: any[]) => void;
  stats?: any;
}

export function DataExportImport({ trades, onImport, stats }: DataExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage('');
    setImportError('');

    try {
      let importedTrades;

      if (file.name.endsWith('.csv')) {
        importedTrades = await importTradesFromCSV(file);
      } else if (file.name.endsWith('.json')) {
        importedTrades = await importTradesFromJSON(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      const validation = validateImportedTrades(importedTrades);
      if (!validation.valid) {
        setImportError(`Validation errors:\n${validation.errors.join('\n')}`);
        setImporting(false);
        return;
      }

      setImportMessage(`Successfully loaded ${importedTrades.length} trades. Review and confirm import.`);
      onImport?.(importedTrades);
    } catch (error) {
      setImportError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Export Section */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Trades</DialogTitle>
            <DialogDescription>
              Choose format to export {trades.length} trades
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={() => exportTradesCSV(trades)}
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              Export as CSV
            </Button>
            <Button
              onClick={() => exportTradesJSON(trades)}
              variant="outline"
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              Export as JSON
            </Button>
            <Button
              onClick={() => generatePDFReport(trades, stats)}
              variant="outline"
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              Generate PDF Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Section */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Trades</DialogTitle>
            <DialogDescription>
              Import trades from CSV or JSON file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-wrap">
                  {importError}
                </AlertDescription>
              </Alert>
            )}

            {importMessage && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {importMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                variant="outline"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {importing ? 'Importing...' : 'Choose File'}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Supports CSV and JSON formats
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">Expected CSV columns:</p>
              <p>Date, Symbol, Setup, Entry Price, Exit Price, Stop Loss, Quantity</p>
              <p className="font-medium mt-2">JSON should be array of trade objects with:</p>
              <p>symbol, entryPrice, exitPrice, quantity, setupName, etc.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
