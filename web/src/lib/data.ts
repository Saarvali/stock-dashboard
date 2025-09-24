// src/lib/data.ts
import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";

export type StockRow = {
  symbol: string;
  name: string;
  price: number;     // last price
  change: number;    // day change in price (absolute)
  newsSent: number;  // [-1, 1]
  redditSent: number;// [-1, 1]
};

export type StockDetail = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  description: string;
};

// For your page.tsx, keep Data = StockRow[]
export type Data = StockRow[];

// --- Helpers --------------------------------------------------

function randPrice(base = 100, spread = 20): number {
  // simple mock: base +/- spread
  const p = base + (Math.random() - 0.5) * spread * 2;
  return Math.max(1, Number(p.toFixed(2)));
}

function randChange(spread = 2): number {
  const c = (Math.random() - 0.5) * spread * 2;
  return Number(c.toFixed(2));
}

async function buildRow(symbol: string, name?: string): Promise<StockRow> {
  const sym = symbol.toUpperCase().trim();
  const displayName = name?.trim() || sym;

  // Price & change (mock for now; you can wire to Finnhub later)
  const price = randPrice();
  const change = randChange();

  // Sentiment (real calls with fallbacks handled inside)
  const [newsSent, redditSent] = await Promise.all([
    getNewsSentiment(sym).catch(() => 0),
    getRedditSentiment(sym, displayName).catch(() => 0),
  ]);

  return {
    symbol: sym,
    name: displayName,
    price,
    change,
    newsSent: Number.isFinite(newsSent) ? newsSent : 0,
    redditSent: Number.isFinite(redditSent) ? redditSent : 0,
  };
}

// --- Public API used by your pages ----------------------------

/**
 * Default dashboard rows (used when no watchlist is set).
 * Tweak the symbols/names to your liking.
 */
const DEFAULTS: Array<{ symbol: string; name: string }> = [
  { symbol: "VOLV-B.ST", name: "Volvo B" },
  { symbol: "ERIC-B.ST", name: "Ericsson B" },
  { symbol: "AAPL",      name: "Apple" },
  { symbol: "TSLA",      name: "Tesla" },
];

/**
 * Returns default dashboard data.
 */
export async function getDashboardData(): Promise<Data> {
  const rows = await Promise.all(DEFAULTS.map(s => buildRow(s.symbol, s.name)));
  return rows;
}

/**
 * Returns dashboard data for a custom list of symbols (watchlist).
 * Accepts raw symbols; names default to symbol unless you add mapping.
 */
export async function getDashboardDataFor(symbols: string[]): Promise<Data> {
  const rows = await Promise.all(
    symbols
      .filter(Boolean)
      .map(sym => buildRow(sym))
  );
  return rows;
}

/**
 * Returns detail for a single symbol (used on /stock/[symbol]).
 * Currently mocked for price/description; easy to wire to APIs later.
 */
export async function getAnyStockDetail(symbol: string): Promise<StockDetail> {
  const sym = symbol.toUpperCase().trim();
  const detail: StockDetail = {
    symbol: sym,
    name: sym,
    price: randPrice(),
    change: randChange(),
    description: `Overview for ${sym}. (Replace with real company overview when you wire Alpha Vantage or Finnhub.)`,
  };
  return detail;
}
