// src/lib/finnhub.ts
const FINNHUB = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY!;

export type DailyBar = { date: string; close: number };
export type RawCandle = { c: number[]; t: number[]; s: "ok" | string };

/**
 * Fetch daily OHLC (close only) for up to `daysBack` days (default 365).
 * Returns ascending by date.
 */
export async function getDailySeries(symbol: string, daysBack = 365): Promise<DailyBar[]> {
  const sym = (symbol || "").toUpperCase().trim();
  if (!sym || !KEY) return [];

  const to = Math.floor(Date.now() / 1000);
  const from = to - Math.max(30, daysBack) * 86400;

  const url = `${FINNHUB}/stock/candle?symbol=${encodeURIComponent(sym)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(
    KEY
  )}`;

  const res = await fetch(url, { next: { revalidate: 60 * 30 } }); // 30m cache
  if (!res.ok) return [];

  const json: RawCandle = await res.json();
  if (json?.s !== "ok" || !Array.isArray(json.c) || !Array.isArray(json.t)) return [];

  const bars: DailyBar[] = [];
  for (let i = 0; i < json.c.length; i++) {
    const close = json.c[i];
    const ts = json.t[i];
    if (typeof close === "number" && typeof ts === "number") {
      const d = new Date(ts * 1000);
      bars.push({ date: d.toISOString().slice(0, 10), close });
    }
  }
  // ensure ascending order by date
  bars.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return bars;
}
