// src/lib/data.ts

import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";
import { distFromHighPct } from "@/lib/indicators";
import { finnhubDaily } from "@/lib/finnhub";
import { getDailySeries } from "@/lib/alpha";

// fallback mock data
import mock from "../mock-data.json";

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
      getRedditSentiment(symbol, row.name),
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
    const symbols = ["AAPL", "TSLA", "MSFT", "VOLV-B.ST"];

    const rows: StockRow[] = await Promise.all(
      symbols.map(async (s) => {
        // Alpha Vantage daily
        const series = await getDailySeries(s);
        const last = series?.[0];
        const prev = series?.[1];

        const price = last?.close ?? 0;
        const change = prev ? price - prev.close : 0;
        const changePct = prev ? (change / prev.close) * 100 : 0;

        let row: StockRow = {
          symbol: s,
          name: s,
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

export async function getDashboardDataFor(symbols: string[]): Promise<StockRow[]> {
  try {
    const rows: StockRow[] = await Promise.all(
      symbols.map(async (s) => {
        const series = await getDailySeries(s);
        const last = series?.[0];
        const prev = series?.[1];

        const price = last?.close ?? 0;
        const change = prev ? price - prev.close : 0;
        const changePct = prev ? (change / prev.close) * 100 : 0;

        let row: StockRow = {
          symbol: s,
          name: s,
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
  const series = await getDailySeries(symbol);
  const last = series?.[0];
  const prev = series?.[1];

  const price = last?.close ?? 0;
  const change = prev ? price - pr
