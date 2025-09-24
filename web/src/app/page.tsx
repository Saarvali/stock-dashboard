// src/lib/data.ts
import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";
import { getDailySeries, type DailyBar } from "@/lib/finnhub";
import { rsi, distFromHighPct } from "@/lib/indicators";

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
  series: DailyBar[];               // price series for chart
  rsi14: Array<number>;             // RSI aligned to series (NaN for early points)
  distFromHighPct: number;          // % from 52w high
};

// Data is an object with a stocks property (array) to match page.tsx
export type Data = { stocks: StockRow[] };

// --- Helpers --------------------------------------------------

function fallbackName(symbol: string) {
  return symbol.toUpperCase().trim();
}

async function buildRow(symbol: string, name?: string): Promise<StockRow> {
  const sym = symbol.toUpperCase().trim();
  const displayName = name?.trim() || fallbackName(sym);

  // Use Finnhub series to compute price + change (real rather than random)
  const series = await getDailySeries(sym, 90);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];

  const price = last?.close ?? 0;
  const change = last && prev ? last.close - prev.close : 0;

  // Sentiment
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

// --- Public API ----------------------------------------------

const DEFAULTS: Array<{ symbol: string; name: string }> = [
  { symbol: "VOLV-B.ST", name: "Volvo B" },
  { symbol: "ERIC-B.ST", name: "Ericsson B" },
  { symbol: "AAPL",      name: "Apple" },
  { symbol: "TSLA",      name: "Tesla" },
];

export async function getDashboardData(): Promise<Data> {
  const rows = await Promise.all(DEFAULTS.map(s => buildRow(s.symbol, s.name)));
  return { stocks: rows };
}

export async function getDashboardDataFor(symbols: string[]): Promise<Data> {
  const rows = await Promise.all(
    symbols.filter(Boolean).map(sym => buildRow(sym))
  );
  return { stocks: rows };
}

/**
 * Detailed view for /stock/[symbol]: real series + RSI + distFromHighPct.
 */
export async function getAnyStockDetail(symbol: string): Promise<StockDetail> {
  const sym = symbol.toUpperCase().trim();
  const series = await getDailySeries(sym, 365);

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const price = last?.close ?? 0;
  const change = last && prev ? last.close - prev.close : 0;

  const closes = series.map(s => s.close);
  const rsi14 = rsi(closes, 14);
  const dfh = distFromHighPct(closes, 252);

  return {
    symbol: sym,
    name: fallbackName(sym),
    price,
    change,
    description: `Overview for ${sym}.`,
    series,
    rsi14,
    distFromHighPct: dfh,
  };
}
