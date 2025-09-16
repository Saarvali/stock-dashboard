const API = "https://www.alphavantage.co/query";
const KEY = process.env.ALPHAVANTAGE_API_KEY!;

/* ---- Alpha Vantage response shapes ---- */
type AvErrorish = {
  Note?: string;
  Information?: string;
  "Error Message"?: string;
};

type AvGlobalQuote = AvErrorish & {
  "Global Quote"?: {
    "01. symbol"?: string;
    "05. price"?: string;
    "10. change percent"?: string;
  };
};

type AvTimeSeriesDaily = AvErrorish & {
  "Time Series (Daily)"?: Record<string, { "4. close": string }>;
};

type AvSymbolSearch = AvErrorish & {
  bestMatches?: Array<{
    "1. symbol": string;
    "2. name": string;
    "4. region"?: string;
    "8. currency"?: string;
  }>;
};

async function getJSON<T extends AvErrorish>(url: string, revalidate = 300): Promise<T> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as T;
  if (data.Note || data.Information || data["Error Message"]) {
    throw new Error(data.Note ?? data.Information ?? data["Error Message"] ?? "AlphaVantage error");
  }
  return data;
}

/* ---- Public types we return ---- */
export type Quote = { symbol: string; last: number; changePct: number };
export type SeriesPoint = { date: string; close: number };
export type SymbolSearchResult = { symbol: string; name: string; region?: string; currency?: string };

/* ---- API helpers ---- */
export async function getQuote(symbol: string): Promise<Quote> {
  const url = `${API}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${KEY}`;
  const j = await getJSON<AvGlobalQuote>(url);
  const q = j["Global Quote"] ?? {};
  const price = Number(q["05. price"] ?? "0");
  const changePctStr = (q["10. change percent"] ?? "0").toString().replace("%", "");
  return { symbol: symbol.toUpperCase(), last: price, changePct: Number(changePctStr) };
}

// TIME_SERIES_DAILY (free). size: "compact" (~100d) or "full" (years)
export async function getDailySeries(
  symbol: string,
  size: "compact" | "full" = "compact"
): Promise<SeriesPoint[]> {
  const url = `${API}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
    symbol
  )}&outputsize=${size}&apikey=${KEY}`;
  const j = await getJSON<AvTimeSeriesDaily>(url, size === "full" ? 86400 : 300);
  const series: Record<string, { "4. close": string }> = j["Time Series (Daily)"] ?? {};
  const out: SeriesPoint[] = Object.entries(series).map(([date, v]) => ({
    date,
    close: Number(v["4. close"]),
  }));
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export async function searchSymbols(keywords: string): Promise<SymbolSearchResult[]> {
  const url = `${API}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${KEY}`;
  const j = await getJSON<AvSymbolSearch>(url, 3600);
  const best = j.bestMatches ?? [];
  return best.map((m) => ({
    symbol: String(m["1. symbol"] ?? "").toUpperCase(),
    name: String(m["2. name"] ?? ""),
    region: m["4. region"],
    currency: m["8. currency"],
  }));
}
