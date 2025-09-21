const API = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY!;

export type FinnhubPoint = {
  date: string;
  close: number;
  volume: number | null;
};

async function fhJSON<T>(url: string, revalidate = 900): Promise<T> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Daily candles with volume for up to `maxDays` back */
export async function finnhubDaily(symbol: string, maxDays: number): Promise<FinnhubPoint[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - maxDays * 86400;
  const url = `${API}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${KEY}`;
  const d = await fhJSON<{ s: string; t: number[]; c: number[]; v: number[] }>(url, 900);
  if (d.s !== "ok") throw new Error("candle not ok");
  return d.t.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    close: d.c[i],
    volume: d.v?.[i] ?? null,
  }));
}

/** Try multiple candidate tickers; return first that works */
export async function finnhubDailyFromCandidates(cands: string[], maxDays: number) {
  for (const s of cands) {
    try {
      const series = await finnhubDaily(s, maxDays);
      return { symbol: s, series };
    } catch {}
  }
  throw new Error("all candidates failed");
}

/** --- Global symbol search (works great for .ST, .LON, etc.) --- */
export type FinnhubSearchItem = {
  symbol: string;          // e.g. "ERIC-B.ST"
  displaySymbol: string;
  description: string;
  type?: string;
};

export async function finnhubSearchSymbol(q: string): Promise<FinnhubSearchItem[]> {
  const url = `${API}/search?q=${encodeURIComponent(q)}&token=${KEY}`;
  const j = await fhJSON<{ count: number; result: FinnhubSearchItem[] }>(url, 600);
  return j.result ?? [];
}

/** --- Quote fallback (last price + day % change) --- */
export async function finnhubQuote(symbol: string): Promise<{ last: number; changePct: number }> {
  const url = `${API}/quote?symbol=${encodeURIComponent(symbol)}&token=${KEY}`;
  const d = await fhJSON<{ c: number; pc: number }>(url, 300);
  const last = Number(d.c) || 0;
  const prev = Number(d.pc) || last;
  const changePct = prev ? ((last - prev) / prev) * 100 : 0;
  return { last, changePct };
}
