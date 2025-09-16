const API = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY!;

type FinnhubCandleResponse =
  | { s: "ok"; t: number[]; c: number[]; v?: number[] }
  | { s: "no_data" | "error" };

export type FinnhubPoint = { date: string; close: number; volume: number };

async function getJSON<T>(url: string, revalidate = 86400): Promise<T> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// ~1Y+ (buffer) daily candles
export async function finnhubDaily(symbol: string, days = 420): Promise<FinnhubPoint[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const url = `${API}/stock/candle?symbol=${encodeURIComponent(
    symbol
  )}&resolution=D&from=${from}&to=${to}&token=${KEY}`;
  const j = await getJSON<FinnhubCandleResponse>(url, 86400);
  if (j.s !== "ok") throw new Error("Finnhub candle error");
  const out: FinnhubPoint[] = j.t.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    close: Number(j.c[i]),
    volume: Number(j.v?.[i] ?? 0),
  }));
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

// Try multiple candidate symbols until one works
export async function finnhubDailyFromCandidates(
  candidates: string[],
  days = 420
): Promise<{ symbol: string; series: FinnhubPoint[] }> {
  for (const sym of candidates) {
    try {
      const series = await finnhubDaily(sym, days);
      if (series.length) return { symbol: sym, series };
    } catch {
      /* continue */
    }
  }
  throw new Error("No Finnhub candidate worked");
}
