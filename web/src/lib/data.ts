// src/lib/data.ts
import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";
import { getDailySeries } from "@/lib/alpha"; // must return { t: number[]; c: number[] }
import { distFromHighPct } from "@/lib/indicators";

// ----------------------------
// Types
// ----------------------------
export type StockRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  newsSent: number;    // -3..+3
  redditSent: number;  // -3..+3
  distFromHighPct: number; // 0..100
  rsi14: number[];     // RSI series (last element = latest)
};

export type Data = {
  stocks: StockRow[];
};

export type StockDetail = {
  data: Data;
  row?: StockRow;
  chart?: { t: number[]; c: number[] };
};

// ----------------------------
// Helpers
// ----------------------------

// Compute RSI(14) from a close-price array (most-recent last).
function computeRSI14(closes: number[]): number[] {
  const n = 14;
  if (!closes || closes.length < n + 1) return [];
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  // Seed initial averages
  for (let i = 1; i <= n; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / n;
  let avgLoss = losses / n;

  // First RSI value corresponds to index n
  const rs1 = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs1));

  // Wilder smoothing
  for (let i = n + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (n - 1) + gain) / n;
    avgLoss = (avgLoss * (n - 1) + loss) / n;

    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

// A tiny name map for common tickers; extend as you wish
function guessName(symbol: string): string {
  const map: Record<string, string> = {
    TSLA: "Tesla, Inc.",
    AAPL: "Apple Inc.",
    MSFT: "Microsoft Corporation",
    NVDA: "NVIDIA Corporation",
    VOLV_B: "Volvo AB (B)",
    "VOLV-B.ST": "Volvo AB (B)",
  };
  return map[symbol] || symbol;
}

async function buildRow(symbol: string): Promise<StockRow> {
  // 1) Get daily series for RSI + latest price/change
  const series = await getDailySeries(symbol).catch(() => ({ t: [], c: [] as number[] }));
  const closes = Array.isArray(series.c) ? series.c : [];
  const rsi14 = computeRSI14(closes);

  const last = closes.at(-1) ?? 0;
  const prev = closes.at(-2) ?? last;
  const price = Number.isFinite(last) ? last : 0;
  const change = Number.isFinite(prev) ? price - prev : 0;

  // 2) Sentiment
  let newsSent = 0;
  let redditSent = 0;
  try {
    const [n, r] = await Promise.all([
      getNewsSentiment(symbol),
      getRedditSentiment(symbol, guessName(symbol)),
    ]);
    newsSent = Number.isFinite(n) ? n : 0;
    redditSent = Number.isFinite(r) ? r : 0;
  } catch {
    /* keep zeros */
  }

  // 3) Indicator(s)
  const dfh = await distFromHighPct(symbol).catch(() => 0);

  return {
    symbol,
    name: guessName(symbol),
    price,
    change,
    newsSent,
    redditSent,
    distFromHighPct: dfh,
    rsi14,
  };
}

// Default dashboard symbols when no watchlist is provided
const DEFAULTS = ["AAPL", "MSFT", "NVDA", "TSLA"];

// ----------------------------
// Public API
// ----------------------------

export async function getDashboardData(): Promise<Data> {
  const rows = await Promise.all(DEFAULTS.map((s) => buildRow(s)));
  return { stocks: rows };
}

export async function getDashboardDataFor(symbols: string[]): Promise<Data> {
  const uniq = Array.from(new Set(symbols)).slice(0, 25);
  const rows = await Promise.all(uniq.map((s) => buildRow(s)));
  return { stocks: rows };
}

export async function getAnyStockDetail(symbolOrName: string): Promise<StockDetail> {
  // Try by symbol first; if needed, you could expand to a search step.
  const row = await buildRow(symbolOrName).catch<StockRow | undefined>(() => undefined);

  // chart payload for the detail page
  let chart: { t: number[]; c: number[] } | undefined = undefined;
  try {
    const s = await getDailySeries(symbolOrName);
    chart = s;
  } catch {
    /* ignore */
  }

  const data: Data = { stocks: row ? [row] : [] };
  return { data, row, chart };
}
