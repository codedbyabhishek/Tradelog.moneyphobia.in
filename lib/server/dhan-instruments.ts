import type { SymbolSuggestion } from '@/lib/trading-symbols';

const DHAN_SCRIP_MASTER_URL = 'https://images.dhan.co/api-data/api-scrip-master.csv';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_RESULTS = 20;

type DhanInstrument = SymbolSuggestion & {
  instrument: string;
};

let cachedInstruments: DhanInstrument[] | null = null;
let cachedAt = 0;
let inFlightRequest: Promise<DhanInstrument[]> | null = null;

function parseCsvRow(row: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

function toRecordableSymbol(value: string) {
  const symbol = value.trim().toUpperCase();
  return /^[A-Z0-9/&._-]{1,64}$/.test(symbol) ? symbol : null;
}

function hasExpired(expiry: string) {
  const parsed = Date.parse(expiry);
  return Number.isFinite(parsed) && parsed < Date.now();
}

function parseDhanCatalogue(csv: string): DhanInstrument[] {
  const [header, ...rows] = csv.split(/\r?\n/);
  if (!header) return [];

  const columns = new Map(parseCsvRow(header).map((name, index) => [name, index]));
  const getColumn = (row: string[], name: string) => row[columns.get(name) ?? -1]?.trim() || '';
  const unique = new Map<string, DhanInstrument>();

  rows.forEach((rawRow) => {
    if (!rawRow) return;
    const row = parseCsvRow(rawRow);
    const exchange = getColumn(row, 'SEM_EXM_EXCH_ID');
    const instrument = getColumn(row, 'SEM_INSTRUMENT_NAME');
    const symbol = toRecordableSymbol(getColumn(row, 'SEM_TRADING_SYMBOL'));
    const expiry = getColumn(row, 'SEM_EXPIRY_DATE');

    if (!exchange || !instrument || !symbol || hasExpired(expiry)) return;

    const displayName = getColumn(row, 'SEM_CUSTOM_SYMBOL') || getColumn(row, 'SM_SYMBOL_NAME') || symbol;

    const key = `${exchange}:${symbol}`;
    if (!unique.has(key)) {
      unique.set(key, {
        symbol,
        name: displayName,
        market: `${exchange} ${instrument}`,
        instrument,
        source: 'dhan',
      });
    }
  });

  return [...unique.values()];
}

function normaliseSearch(value: string) {
  return value.toLocaleUpperCase().replace(/[^A-Z0-9]/g, '');
}

function rankInstrument(instrument: DhanInstrument, query: string) {
  const normalisedQuery = normaliseSearch(query);
  const symbol = normaliseSearch(instrument.symbol);
  const name = normaliseSearch(instrument.name);
  const instrumentPriority = instrument.instrument === 'INDEX' ? 0 : instrument.instrument === 'EQUITY' ? 1 : 2;

  if (symbol === normalisedQuery) return [0, instrumentPriority] as const;
  if (symbol.startsWith(normalisedQuery)) return [1, instrumentPriority] as const;
  if (name.startsWith(normalisedQuery)) return [2, instrumentPriority] as const;
  return [3, instrumentPriority] as const;
}

async function fetchDhanCatalogue() {
  const response = await fetch(DHAN_SCRIP_MASTER_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`Dhan catalogue request failed with ${response.status}`);
  return parseDhanCatalogue(await response.text());
}

async function getDhanCatalogue() {
  if (cachedInstruments && Date.now() - cachedAt < CACHE_TTL_MS) return cachedInstruments;

  if (!inFlightRequest) {
    inFlightRequest = fetchDhanCatalogue()
      .then((instruments) => {
        cachedInstruments = instruments;
        cachedAt = Date.now();
        return instruments;
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  try {
    return await inFlightRequest;
  } catch (error) {
    if (cachedInstruments) return cachedInstruments;
    throw error;
  }
}

/** Searches Dhan's current NSE, BSE, MCX, currency, and derivatives catalogue. */
export async function searchDhanInstruments(query: string) {
  const normalisedQuery = normaliseSearch(query);
  if (normalisedQuery.length < 2) return [];

  const catalogue = await getDhanCatalogue();
  return catalogue
    .filter((instrument) => {
      return [instrument.symbol, instrument.name, instrument.market]
        .some((value) => normaliseSearch(value).includes(normalisedQuery));
    })
    .sort((left, right) => {
      const [leftMatch, leftType] = rankInstrument(left, query);
      const [rightMatch, rightType] = rankInstrument(right, query);
      return leftMatch - rightMatch || leftType - rightType || left.symbol.localeCompare(right.symbol);
    })
    .slice(0, MAX_RESULTS)
    .map(({ instrument: _instrument, ...suggestion }) => suggestion);
}
