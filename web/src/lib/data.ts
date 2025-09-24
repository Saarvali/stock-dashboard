// src/lib/data.ts

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SeriesPoint = { x: number; y: number };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type FinnhubPoint = { t: number; c: number };

export type StockRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  newsSent: number;
  redditSent: number;
};

export type StockDetail = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  description: string;
};

export async function getAnyStockDetail(symbol: string): Promise<StockDetail> {
  // mock for now — replace with real API later
  return {
    symbol,
    name: "Company " + symbol,
    price: Math.random() * 100,
    change: (Math.random() - 0.5) * 5,
    description: "Mock description for " + symbol,
  };
}
