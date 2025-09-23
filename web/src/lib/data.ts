// src/lib/data.ts

import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";
import { getIndicators } from "@/lib/indicators";
import { getPriceHistory } from "@/lib/finnhub";
import { getOverview } from "@/lib/alpha";

// Optional: keep local mock data as fallback for dev/testing
import mock from "@/mock-data.json";

// ----------------------------
// Types
// ----------------------------
export type StockRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  newsSent: number;
  redditSent: number;
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

async function fillSentiments(symbol: string, row: StockRow): Promise<StockRow> {
  try {
    const [news, reddit] = await Promise.all([
      getNewsSentiment(symbol),
      getRedditSentiment(symbol, row.name), // pass company/name as hint
    ]);
    row.newsSent = Number.isFinite(news) ? news : 0;
    row.redditSent = Number.isFinite(reddit) ? reddit : 0;
  } catch {
    // keep neutrals
  }
  return row;
}

// ----------------------------
// Dashboard data
// ----------------------------

export async function getDashboardData(): Promise<StockRow[]> {
  try {
    // TODO: replace with your own watchlist storage (DB, file, etc.)
    const symbols = ["AAPL", "TSLA", "MSFT", "VOLV-B.ST"];

    const rows: StockRow[] = await Promise.all(
      symbols.map(async (s) => {
        const overview = await getOverview(s);
        const price = typeof overview.price === "number" ? overview.price : 0;
        const change = typeof overview.change === "number" ? overview.change : 0;
        const changePct =
          typeof overview.changePct === "number" ? overview.changePct : 0;

        let row: StockRow = {
          symbol: s,
          name: overview.name || s,
          price,
          change,
          changePct,
          newsSent: 0,
          redditSent: 0,
        };

        row = await fillSentiments(s, row);
        return row;
      })
    );

    return rows;
  } catch {
    // fallback: mock data if APIs fail
    return (mock as StockRow[]) || [];
  }
}

export async function getDashboardDataFor(symbols: string[]): Promise<StockRow[]> {
  try {
    const rows: StockRow[] = await Promise.all(
      symbols.map(async (s) => {
        const overview = await getOverview(s);
        const price = typeof overview.price === "number" ? overview.price : 0;
        const change = typeof overview.change === "number" ? overview.change : 0;
        const changePct =
          typeof overview.changePct === "number" ? overview.changePct : 0;

        let row: StockRow = {
          symbol: s,
          name: overview.name || s,
          price,
          change,
          changePct,
          newsSent: 0,
          redditSent: 0,
        };

        row = await fillSentiments(s, row);
        return row;
      })
    );
    return rows;
  } catch {
    return (mock as StockRow[]) || [];
  }
}

// ----------------------------
// Stock detail data
// ----------------------------

export async function getAnyStockDetail(symbol: string): Promise<StockDetail> {
  const overview = await getOverview(symbol);
  const price = typeof overview.price === "number" ? overview.price : 0;
  const change = typeof overview.change === "number" ? overview.change : 0;
  const changePct =
    typeof overview.changePct === "number" ? overview.changePct : 0;

  let row: StockRow = {
    symbol,
    name: overview.name || symbol,
    price,
    change,
    changePct,
    newsSent: 0,
    redditSent: 0,
  };

  row = await fillSentiments(symbol, row);

  const [indicators, history] = await Promise.all([
    getIndicators(symbol),
    getPriceHistory(symbol),
  ]);

  return {
    ...row,
    indicators,
    history,
    overview,
  };
}
