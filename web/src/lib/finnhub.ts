const API = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY!;

async function getJSON(url: string, revalidate = 86400) {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data) throw new Error("Empty Finnhub response");
  return data;
}

// Daily candles for ~1Y+ (420 trading days buffer)
export async function finnhubDaily(symbol: string, days = 420) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const url = `${API}/stock/candle?symbol=${encodeURIComponent(
    symbol
  )}&resolution=D&from=${from}&to=${to}&token=${KEY}`;
  const j = await getJSON(url, 86400);
  if (j.s !== "ok" || !Array.isArray(j.t)) throw new Error(j.s || "Finnhub candle error");
  return j.t
    .map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: Number(j.c[i]),
      volume: Number(j.v?.[i] ?? 0),
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
}

// Try multiple candidate symbols until one works
export async function finnhubDailyFromCandidates(candidates: string[], days = 420) {
  for (const sym of candidates) {
    try {
      const series = await finnhubDaily(sym, days);
      if (series.length) return { symbol: sym, series };
    } catch {}
  }
  throw new Error("No Finnhub candidate worked");
}
