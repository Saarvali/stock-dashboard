// src/lib/data.ts

import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";
import { distFromHighPct } from "@/lib/indicators";
import { finnhubDaily } from "@/lib/finnhub";
import { getDailySeries } from "@/lib/alpha";

// ----------------------------
// Types
// ----------------------------

export interface StockRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  distFromHigh: number;
  newsSent: number;
  redditSent: number;
}

export interface DashboardData {
  watchlist: StockRow[];
}

// ----------------------------
// Helpers
// ----------------------------

// Fills in news + reddit sentiment
async function fillSentiments(symbol: string, row: StockRow): Promise<StockRow> {
  try {
    const [news, reddit] = await Promise.all([
      getNewsSentiment(symbol),
      getRedditSentiment(symbol, row.name),
    ]);
    row.newsSent = Number.isFinite(news) ? news : 0;
    row.redditSent = Number.isFinite(reddit) ? reddit : 0;
  } catch {
    // keep neutral values
  }
  return row;
}

// Fills in pricing & indicators
async function fillPricing(symbol: string, row: StockRow): Promise<StockRow> {
  try {
    const series = await finnhubDaily(symbol);

    if (series && series.length > 0) {
      const last = series[series.length - 1];
      const prev = series.length > 1 ? series[series.length - 2] : null;

      const price = last?.close ?? 0;
      const change = prev ? price - prev.close : 0;
      const changePct = prev && prev.close ? (change / prev.close) * 100 : 0;

      row.price = price;
      row.change = change;
      row.changePct = changePct;
      row.high52w = Math.max(...series.map((d) => d.high));
      row.low52w = Math.min(...series.map((d) => d.low));
      row.distFromHigh = distFromHighPct(price, row.high52w);
    }
  } catch {
    // keep defaults
  }
  return row;
}

// ----------------------------
// Main entry points
// ----------------------------

// Fill dashboard with data for a list of symbols
export async function getDashboardData(symbols: { symbol: string; name: string }[]): Promise<DashboardData> {
  const rows: StockRow[] = [];

  for (const { symbol, name } of symbols) {
    let row: StockRow = {
      symbol,
      name,
      price: 0,
      change: 0,
      changePct: 0,
      high52w: 0,
      low52w: 0,
      distFromHigh: 0,
      newsSent: 0,
      redditSent: 0,
    };

    row = await fillPricing(symbol, row);
    row = await fillSentiments(symbol, row);

    rows.push(row);
  }

  return { watchlist: rows };
}

// Get details for one stock (overview + pricing + sentiment)
export async function getAnyStockDetail(symbol: string, name: string): Promise<StockRow> {
  let row: StockRow = {
    symbol,
    name,
    price: 0,
    change: 0,
    changePct: 0,
    high52w: 0,
    low52w: 0,
    distFromHigh: 0,
    newsSent: 0,
    redditSent: 0,
  };

  row = await fillPricing(symbol, row);
  row = await fillSentiments(symbol, row);

  return row;
}
