// src/lib/data.ts

import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";
import { distFromHighPct } from "@/lib/indicators";
import { finnhubDaily } from "@/lib/finnhub";
import { getDailySeries } from "@/lib/alpha";

// ----------------------------
// Types
// ----------------------------

export type StockRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  newsSent: number;   // [-1..+1]
  redditSent: number; // [-1..+1]
};

export type StockDetail = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  newsSent: number;
  redditSent: number;
  indicators: Record<string, number>;
  history: Array<{ t: number; c: number }>;
  overview: Record<string, string | number | null>;
};

// ----------------------------
// Internal helpers
// ----------------------------

/** Build a row from latest two daily bars (Alpha Vantage series). */
function rowFromDaily(
  symbol: string,
  name: string,
  series: Array<{ close: number }> | null | undefined
): StockRow {
  const last = Array.isArray(series) && series.length > 0 ? series[0] : undefined;
  const prev = Array.isArray(series) && series.length > 1 ? series[1] : undefined;

  const price = last?.close ?? 0;
  const change = prev ? price - prev.close : 0;
  const changePct = prev && prev.close !== 0 ? (change / prev.close) * 100 : 0;

  return {
    symbol,
    name,
    price,
    change,
    changePct,
    newsSent: 0,
    redditSent: 0,
  };
}

/** Fill news/reddit sentiment (safe fallbacks to 0). */
async function fillSentiments(symbol: string, row: StockRow): Promise<StockRow> {
  try {
    const [news, reddit] = await Promise.all([
      getNewsSentiment(symbol),
      getRedditSentiment(symbol, row.name), // pass company name as hint for Reddit
    ]);
    row.newsSent = Number.isFinite(news) ? news : 0;
    row.redditSent = Number.isFinite(reddit) ? reddit : 0;
  } catch {
    // keep neutrals on error
  }
  return row;
}

/** Load one symbol (row) end-to-end. */
async function loadRow(symbol: string, name: string): Promise<StockRow> {
  const series = await getDailySeries(symbol).catch(() => null);
  let row = rowFromDaily(symbol, name, series);
  row = await fillSentiments(symbol, row);
  return row;
}

// ----------------------------
// Public APIs (used by pages)
// ----------------------------

/** Default dashboard data (used when no wl param is present). */
export async function getDashboardData(): Promise<StockRow[]> {
  const symbols = ["AAPL", "TSLA", "MSFT", "VOLV-B.ST"];
  const rows = await Promise.all(symbols.map((s) => loadRow(s, s)));
  return rows;
}

/** Dashboard data for a provided list of tickers (used with ?wl=...). */
export async function getDashboardDataFor(symbols: string[]): Promise<StockRow[]> {
  const cleaned = symbols
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .map((s) => s.toUpperCase());

  const dedup = Array.from(new Set(cleaned));
  const rows = await Promise.all(dedup.map((s) => loadRow(s, s)));
  return rows;
}

/** Single-stock detail for /stock/[symbol]. */
export async function getAnyStockDetail(symbol: string): Promise<StockDetail> {
  const series = await getDailySeries(symbol).catch(() => null);
  const base = rowFromDaily(symbol, symbol, series);
  const withSent = await fillSentiments(symbol, base);

  // Indicators (from your indicators.ts)
  const indicators = {
    distFromHighPct: await distFromHighPct(symbol).catch(() => 0),
  };

  // Price history (from your finnhub.ts)
  const history = await finnhubDaily(symbol).catch(
    () => [] as Array<{ t: number; c: number }>
  );

  return {
    ...withSent,
    indicators,
    history,
    overview: { source: "Alpha Vantage" }, // simple meta; extend if you add an overview API
  };
}
