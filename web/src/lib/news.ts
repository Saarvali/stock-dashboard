// src/lib/news.ts
import { averageSentiment } from "@/lib/sentiment";

const API = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY!;

type FinnhubNewsItem = {
  category?: string;
  datetime?: number; // unix seconds
  headline?: string;
  summary?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  url?: string;
};

async function getJSON<T>(url: string, revalidate = 3600): Promise<T> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Returns sentiment in [-1..+1]; 0 if nothing to score. */
export async function getNewsSentiment(symbol: string): Promise<number> {
  if (!KEY) return 0;

  // last 30 days window
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400 * 1000);
  const toStr = to.toISOString().slice(0, 10);
  const fromStr = from.toISOString().slice(0, 10);

  const url = `${API}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${KEY}`;
  try {
    const items = await getJSON<FinnhubNewsItem[]>(url, 1800);
    const texts = (items || [])
      .flatMap((x) => [x.headline, x.summary])
      .map((t) => String(t || "").trim())
      .filter((t) => t.length > 0);
    if (!texts.length) return 0;
    return averageSentiment(texts.slice(0, 80)); // cap for speed
  } catch {
    return 0; // neutral on failure
  }
}
