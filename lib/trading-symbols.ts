export interface SymbolSuggestion {
  symbol: string;
  name: string;
  market: string;
  source?: 'recent' | 'catalogue' | 'dhan';
}

type CatalogueGroup = {
  market: string;
  entries: Array<readonly [symbol: string, name: string]>;
};

/**
 * Frequently traded instruments that are immediately available offline. The
 * complete Dhan catalogue is searched server-side once the user enters two
 * characters, so this list keeps the form useful while that request loads.
 */
const CATALOGUE_GROUPS: CatalogueGroup[] = [
  {
    market: 'Indian indices',
    entries: [
      ['NIFTY', 'Nifty 50 Index'],
      ['BANKNIFTY', 'Nifty Bank Index'],
      ['FINNIFTY', 'Nifty Financial Services Index'],
      ['MIDCPNIFTY', 'Nifty Midcap Select Index'],
      ['SENSEX', 'BSE Sensex Index'],
      ['NIFTYNXT50', 'Nifty Next 50 Index'],
      ['NIFTYIT', 'Nifty IT Index'],
      ['NIFTYPHARMA', 'Nifty Pharma Index'],
      ['NIFTYAUTO', 'Nifty Auto Index'],
      ['NIFTYMETAL', 'Nifty Metal Index'],
      ['NIFTYENERGY', 'Nifty Energy Index'],
      ['NIFTYFMCG', 'Nifty FMCG Index'],
      ['NIFTYREALTY', 'Nifty Realty Index'],
      ['NIFTYPSUBANK', 'Nifty PSU Bank Index'],
    ],
  },
  {
    market: 'NSE equities',
    entries: [
      ['RELIANCE', 'Reliance Industries'],
      ['TCS', 'Tata Consultancy Services'],
      ['HDFCBANK', 'HDFC Bank'],
      ['ICICIBANK', 'ICICI Bank'],
      ['INFY', 'Infosys'],
      ['BHARTIARTL', 'Bharti Airtel'],
      ['SBIN', 'State Bank of India'],
      ['ITC', 'ITC Limited'],
      ['LT', 'Larsen & Toubro'],
      ['HINDUNILVR', 'Hindustan Unilever'],
      ['KOTAKBANK', 'Kotak Mahindra Bank'],
      ['BAJFINANCE', 'Bajaj Finance'],
      ['MARUTI', 'Maruti Suzuki India'],
      ['SUNPHARMA', 'Sun Pharmaceutical Industries'],
      ['TITAN', 'Titan Company'],
      ['TATAMOTORS', 'Tata Motors'],
      ['TATASTEEL', 'Tata Steel'],
      ['AXISBANK', 'Axis Bank'],
      ['ASIANPAINT', 'Asian Paints'],
      ['ULTRACEMCO', 'UltraTech Cement'],
      ['NTPC', 'NTPC'],
      ['POWERGRID', 'Power Grid Corporation of India'],
      ['ONGC', 'Oil and Natural Gas Corporation'],
      ['M&M', 'Mahindra & Mahindra'],
      ['ADANIENT', 'Adani Enterprises'],
      ['ADANIPORTS', 'Adani Ports and SEZ'],
      ['WIPRO', 'Wipro'],
      ['HCLTECH', 'HCL Technologies'],
      ['TECHM', 'Tech Mahindra'],
      ['INDUSINDBK', 'IndusInd Bank'],
      ['COALINDIA', 'Coal India'],
      ['JSWSTEEL', 'JSW Steel'],
      ['GRASIM', 'Grasim Industries'],
      ['CIPLA', 'Cipla'],
      ['DIVISLAB', "Divi's Laboratories"],
      ['DRREDDY', "Dr. Reddy's Laboratories"],
      ['EICHERMOT', 'Eicher Motors'],
      ['HEROMOTOCO', 'Hero MotoCorp'],
      ['HINDALCO', 'Hindalco Industries'],
      ['BAJAJFINSV', 'Bajaj Finserv'],
      ['BAJAJ-AUTO', 'Bajaj Auto'],
      ['APOLLOHOSP', 'Apollo Hospitals'],
      ['BRITANNIA', 'Britannia Industries'],
      ['NESTLEIND', 'Nestle India'],
      ['SHRIRAMFIN', 'Shriram Finance'],
    ],
  },
  {
    market: 'US equities & ETFs',
    entries: [
      ['AAPL', 'Apple'],
      ['MSFT', 'Microsoft'],
      ['NVDA', 'NVIDIA'],
      ['AMZN', 'Amazon'],
      ['GOOGL', 'Alphabet Class A'],
      ['META', 'Meta Platforms'],
      ['TSLA', 'Tesla'],
      ['AVGO', 'Broadcom'],
      ['NFLX', 'Netflix'],
      ['AMD', 'Advanced Micro Devices'],
      ['INTC', 'Intel'],
      ['PLTR', 'Palantir Technologies'],
      ['COIN', 'Coinbase'],
      ['JPM', 'JPMorgan Chase'],
      ['V', 'Visa'],
      ['MA', 'Mastercard'],
      ['WMT', 'Walmart'],
      ['COST', 'Costco Wholesale'],
      ['DIS', 'Walt Disney'],
      ['BA', 'Boeing'],
      ['SPY', 'SPDR S&P 500 ETF'],
      ['QQQ', 'Invesco QQQ ETF'],
      ['IWM', 'iShares Russell 2000 ETF'],
      ['DIA', 'SPDR Dow Jones ETF'],
      ['SMH', 'VanEck Semiconductor ETF'],
      ['XLE', 'Energy Select Sector ETF'],
    ],
  },
  {
    market: 'Global indices',
    entries: [
      ['SPX', 'S&P 500 Index'],
      ['NAS100', 'Nasdaq 100 Index'],
      ['DJI', 'Dow Jones Industrial Average'],
      ['DAX40', 'Germany 40 Index'],
      ['FTSE100', 'UK 100 Index'],
      ['NIKKEI225', 'Nikkei 225 Index'],
      ['HSI', 'Hang Seng Index'],
    ],
  },
  {
    market: 'Forex',
    entries: [
      ['EURUSD', 'Euro / US Dollar'],
      ['GBPUSD', 'British Pound / US Dollar'],
      ['USDJPY', 'US Dollar / Japanese Yen'],
      ['USDCHF', 'US Dollar / Swiss Franc'],
      ['AUDUSD', 'Australian Dollar / US Dollar'],
      ['USDCAD', 'US Dollar / Canadian Dollar'],
      ['NZDUSD', 'New Zealand Dollar / US Dollar'],
      ['EURGBP', 'Euro / British Pound'],
      ['EURJPY', 'Euro / Japanese Yen'],
      ['GBPJPY', 'British Pound / Japanese Yen'],
      ['USDINR', 'US Dollar / Indian Rupee'],
      ['EURINR', 'Euro / Indian Rupee'],
      ['GBPINR', 'British Pound / Indian Rupee'],
      ['JPYINR', 'Japanese Yen / Indian Rupee'],
    ],
  },
  {
    market: 'Crypto',
    entries: [
      ['BTCUSD', 'Bitcoin / US Dollar'],
      ['BTCUSDT', 'Bitcoin / Tether'],
      ['ETHUSD', 'Ethereum / US Dollar'],
      ['ETHUSDT', 'Ethereum / Tether'],
      ['SOLUSD', 'Solana / US Dollar'],
      ['SOLUSDT', 'Solana / Tether'],
      ['XRPUSD', 'XRP / US Dollar'],
      ['BNBUSD', 'BNB / US Dollar'],
      ['DOGEUSD', 'Dogecoin / US Dollar'],
      ['ADAUSD', 'Cardano / US Dollar'],
      ['AVAXUSD', 'Avalanche / US Dollar'],
      ['LINKUSD', 'Chainlink / US Dollar'],
    ],
  },
  {
    market: 'Commodities',
    entries: [
      ['XAUUSD', 'Gold / US Dollar'],
      ['XAGUSD', 'Silver / US Dollar'],
      ['GOLD', 'Gold Futures'],
      ['SILVER', 'Silver Futures'],
      ['CRUDEOIL', 'Crude Oil Futures'],
      ['NATURALGAS', 'Natural Gas Futures'],
      ['COPPER', 'Copper Futures'],
      ['BRENT', 'Brent Crude Oil'],
      ['WTI', 'West Texas Intermediate Crude Oil'],
    ],
  },
];

export const COMMON_TRADING_SYMBOLS: SymbolSuggestion[] = CATALOGUE_GROUPS.flatMap(({ market, entries }) =>
  entries.map(([symbol, name]) => ({ symbol, name, market, source: 'catalogue' as const })),
);

function normaliseSearch(value: string) {
  return value.toLocaleUpperCase().replace(/[^A-Z0-9]/g, '');
}

function matchesSuggestion(suggestion: SymbolSuggestion, query: string) {
  const normalisedQuery = normaliseSearch(query);
  if (!normalisedQuery) return true;

  return [suggestion.symbol, suggestion.name, suggestion.market]
    .some((value) => normaliseSearch(value).includes(normalisedQuery));
}

function rankSuggestion(suggestion: SymbolSuggestion, query: string) {
  const normalisedQuery = normaliseSearch(query);
  const normalisedSymbol = normaliseSearch(suggestion.symbol);
  const normalisedName = normaliseSearch(suggestion.name);

  if (!normalisedQuery) return 4;
  if (normalisedSymbol === normalisedQuery) return 0;
  if (normalisedSymbol.startsWith(normalisedQuery)) return 1;
  if (normalisedName.startsWith(normalisedQuery)) return 2;
  return 3;
}

/** Returns immediate suggestions, including the trader's own previously used symbols. */
export function getLocalSymbolSuggestions(query: string, recentSymbols: string[] = [], limit = 10) {
  const recent = recentSymbols
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .map((symbol) => ({ symbol, name: 'From your trade history', market: 'Recent', source: 'recent' as const }));

  const deduplicated = new Map<string, SymbolSuggestion>();
  [...recent, ...COMMON_TRADING_SYMBOLS].forEach((suggestion) => {
    const key = suggestion.symbol.toUpperCase();
    if (!deduplicated.has(key)) deduplicated.set(key, suggestion);
  });

  return [...deduplicated.values()]
    .filter((suggestion) => matchesSuggestion(suggestion, query))
    .sort((left, right) => {
      const rankDifference = rankSuggestion(left, query) - rankSuggestion(right, query);
      if (rankDifference !== 0) return rankDifference;
      if (left.source === 'recent' && right.source !== 'recent') return -1;
      if (right.source === 'recent' && left.source !== 'recent') return 1;
      return left.symbol.localeCompare(right.symbol);
    })
    .slice(0, limit);
}

export function mergeSymbolSuggestions(...groups: SymbolSuggestion[][]) {
  const unique = new Map<string, SymbolSuggestion>();
  groups.flat().forEach((suggestion) => {
    const key = suggestion.symbol.trim().toUpperCase();
    if (key && !unique.has(key)) unique.set(key, suggestion);
  });
  return [...unique.values()];
}
