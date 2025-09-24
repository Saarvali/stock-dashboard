// src/lib/data.ts

import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";
import { getDailySeries } from "@/lib/alpha";

/** Packed series used across the app (what PriceChart expects). */
export type PackedSeries = { t: number[]; c: number[] };

/** If some sources return an array of points, describe that shape too. */
type SeriesPoint = { t: number; c: number };

/** One row in the dashboard table */
export type StockRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  newsSent: number;   // -1..+1
  redditSent: number; // -1..+1
  rsi14: number[];    // last value optional
};

/** Data for dashboard list */
export type Data = {
  stocks: StockRow[];
};

/** Detail page return */
export type StockDetail = {
  data: {
    symbol: string;
    name: string;
    price: number;
    change: number;
  };
  row?: StockRow;
  chart?: PackedSeries;
};

/* --------------------------------------------------------- */
/* Utilities                                                 */
/* --------------------------------------------------------- */

/** Compute RSI-14 from close prices (simple implementation) */
function computeRSI14(closes: number[]): number[] {
  const period = 14;
  if (!closes || closes.length < period + 1) return [];

  const rsis: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += -diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsis.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsis.push(Number.isFinite(rsi) ? rsi : 100);
  }

  return rsis;
}

/** Normalize series to packed { t, c } no matter what the source returns */
function packSeries(input: PackedSeries | SeriesPoint[] | null | undefined): PackedSeries {
  if (!input) return { t: [], c: [] };

  // Already packed
  if ("t" in (input as PackedSeries) && "c" in (input as PackedSeries)) {
    const p = input as PackedSeries;
    return {
      t: Array.isArray(p.t) ? p.t : [],
      c: Array.isArray(p.c) ? p.c : [],
    };
  }

  // Array of points -> pack
  const arr = input as SeriesPoint[];
  if (Array.isArray(arr)) {
    const t: number[] = [];
    const c: number[] = [];
    for (const pt of arr) {
      if (pt && typeof pt.t === "number" && typeof pt.c === "number") {
        t.push(pt.t);
        c.push(pt.c);
      }
    }
    return { t, c };
  }

  return { t: [], c: [] };
}

/* --------------------------------------------------------- */
/* Public API used by pages                                  */
/* --------------------------------------------------------- */

/** Internal: build one StockRow with indicators + sentiments */
async function buildRow(symbol: string, name: string): Promise<StockRow> {
  // 1) Series (works with either array-of-points or packed)
  const raw = await getDailySeries(symbol).catch(() => null);
  const packed = packSeries(raw);
  const closes = packed.c;

  // 2) RSI
  const rsi14 = computeRSI14(closes);

  // 3) Price + change from last two closes
  const last = closes.at(-1) ?? 0;
  const prev = closes.at(-2) ?? last;
  const price = last;
  const change = price - prev;

  // 4) Sentiment (best effort)
  const [news, reddit] = await Promise.all([
    getNewsSentiment(symbol).catch(() => 0),
    getRedditSentiment(symbol, name).catch(() => 0),
  ]);

  return {
    symbol,
    name,
    price,
    change,
    newsSent: Number.isFinite(news) ? news : 0,
    redditSent: Number.isFinite(reddit) ? reddit : 0,
    rsi14,
  };
}

/** Dashboard: default set (edit this list if you want different defaults) */
export async function getDashboardData(): Promise<Data> {
  const defaults: Array<{ symbol: string; name: string }> = [
    { symbol: "AAPL", name: "Apple" },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "TSLA", name: "Tesla" },
  ];

  const rows = await Promise.all(
    defaults.map(({ symbol, name }) => buildRow(symbol, name))
  );

  return { stocks: rows };
}

/** Dashboard: for a user’s custom watchlist of symbols */
export async function getDashboardDataFor(symbols: string[]): Promise<Data> {
  const rows = await Promise.all(
    symbols.map((s) => buildRow(s, s)) // name fallback = symbol
  );
  return { stocks: rows };
}

/** Detail page for any symbol string (can be "AAPL" or "AAPL|Apple") */
export async function getAnyStockDetail(symbolKey: string): Promise<StockDetail> {
  // Accept both "SYM" and "SYM|Name"
  const [symbol, maybeName] = symbolKey.split("|");
  const name = maybeName || symbol;

  const raw = await getDailySeries(symbol).catch(() => null);
  const chart = packSeries(raw);
  const closes = chart.c;

  const last = closes.at(-1) ?? 0;
  const prev = closes.at(-2) ?? last;
  const row = await buildRow(symbol, name);

  return {
    data: {
      symbol,
      name,
      price: last,
      change: last - prev,
    },
    row,
    chart,
  };
}
