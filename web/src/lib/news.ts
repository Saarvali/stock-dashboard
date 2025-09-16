import { averageSentiment } from "@/lib/sentiment";

const API = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY!;

type FinnhubNewsItem = {
  category?: string;
  datetime?: number; // unix seconds
  headline?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
};

async function getJSON<T>(url: string, revalidate = 3600): Promise<T> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Returns sentiment in [-1..+1]; 0 if nothing to score. */
export async function getNewsSentiment(symbol: string): Promise<number> {
  // last 30 days window
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400 * 1000);
  const toStr = to.toISOString().slice(0, 10);
  const fromStr = from.toISOString().slice(0, 10);

  const url = `${API}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${KEY}`;
  try {
    const items = await getJSON<FinnhubNewsItem[]>(url, 1800);
    const headlines = (items || [])
      .map((x) => String(x.headline || "").trim())
      .filter((h) => h.length > 0)
      .slice(0, 50); // cap for speed
    if (!headlines.length) return 0;
    return averageSentiment(headlines);
  } catch {
    // Fail safe: neutral
    return 0;
  }
}
