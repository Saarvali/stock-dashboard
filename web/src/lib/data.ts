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
// Helpers
// ----------------------------

/** Fill news/reddit sentiment (safe fallbacks to 0). */
async function fillSentiments(symbol: string, row: StockRow): Promise<StockRow> {
  try {
    const [news, reddit] = await Promise.all([
      getNewsSentiment(symbol),
      getRedditSentiment(symbol, row.name), // pass company name as hint for Reddit search
    ]);
    row.newsSent = Number.isFinite(news) ? news : 0;
    row.redditSent = Number.isFinite(reddit) ? reddit : 0;
  } catch {
    // keep neutrals
  }
  return row;
}

/** Build a StockRow from the latest two daily bars. */
function rowFromDaily(symbol: string, name: string, series: Array<{ close: number }> | null | undefined): StockRow {
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

// ----------------------------
// Dashboard data
// ----------------------------

/**
 * Default dashboard (use your own watchlist source if you want).
 * Returns an array of StockRow used by the table.
 */
export async function getDashboardData(): Promise<StockRow[]> {
  // You can change this default list; the UI also supports ?wl=... in the URL.
  const symbols = ["AAPL", "TSLA", "MSFT", "VOLV-B.ST"];

  const rows = await Promise.all(
    symbols.map(async (s) => {
      const series = await getDailySeries(s).catch(() => null);
      let row = rowFromDaily(s, s, series);
      row = await fillSentiments(s, row);
      return row;
    })
  );

  return rows;
}

/**
 * Dashboard for a provided list of symbols.
 */
export async function getDashboardDataFor(symbols: string[]): Promise<StockRow[]> {
  const rows = await Promise.all(
    symbols.map(async (s) => {
      const series = await getDailySeries(s).catch(() => null);
      let row = rowFromDaily(s, s, series);
      row = await fillSentiments(s, row);
      return row;
    })
  );

  return rows;
}

// ----------------------------
// Stock detail data
// ----------------------------

/**
 * Single-stock detail used by /stock/[symbol]
 */
export async function getAnyStockDetail(symbol: string): Promise<StockDetail> {
  const series = await getDailySeries(symbol).catch(() => null);
  const base = rowFromDaily(symbol, symbol, series);
  const withSent = await fillSentiments(symbol, base);

  // Indicators (match your indicators.ts actual exports)
  const indicators = {
    distFromHighPct: await distFromHighPct(symbol).catch(() => 0),
  };

  // Price history from finnhub (match your finnhub.ts export)
  const history = await finnhubDaily(symbol).catch(() => [] as Array<{ t: number; c: number }>);

  return {
    ...withSent,
    indicators,
    history,
    overview: { source: "Alpha Vantage" }, // placeholder meta
  };
}
