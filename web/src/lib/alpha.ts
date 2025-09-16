const API = "https://www.alphavantage.co/query";
const KEY = process.env.ALPHAVANTAGE_API_KEY!;

async function getJSON(url: string, revalidate = 300) {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data?.Note || data?.Information || data?.["Error Message"]) {
    throw new Error(data.Note || data.Information || data["Error Message"] || "AlphaVantage error");
  }
  return data;
}

export async function getQuote(symbol: string) {
  const url = `${API}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${KEY}`;
  const j = await getJSON(url);
  const q = j["Global Quote"] || {};
  const price = Number(q["05. price"] ?? "0");
  const changePctStr = (q["10. change percent"] ?? "0").toString().replace("%", "");
  return { symbol: symbol.toUpperCase(), last: price, changePct: Number(changePctStr) };
}

// TIME_SERIES_DAILY (free). size: "compact" (~100 days) or "full" (years)
export async function getDailySeries(symbol: string, size: "compact" | "full" = "compact") {
  const url = `${API}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
    symbol
  )}&outputsize=${size}&apikey=${KEY}`;
  const j = await getJSON(url, size === "full" ? 86400 : 300);
  const series = j["Time Series (Daily)"] || {};
  return Object.entries(series)
    .map(([date, v]: any) => ({ date, close: Number(v["4. close"]) }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
}

// For autocomplete
export async function searchSymbols(keywords: string) {
  const url = `${API}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${KEY}`;
  const j = await getJSON(url, 3600);
  const best = j["bestMatches"] || [];
  return best.map((m: any) => ({
    symbol: String(m["1. symbol"] || "").toUpperCase(),
    name: String(m["2. name"] || ""),
    region: m["4. region"],
    currency: m["8. currency"],
  }));
}
