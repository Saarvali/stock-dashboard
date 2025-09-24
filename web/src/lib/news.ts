// src/lib/news.ts
import { scoreTitleAndSummary } from "@/lib/sentiment";

const API = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY!;

interface FinnhubNewsItem {
  headline?: string;
  summary?: string;
  datetime?: number;
  source?: string;
  url?: string;
}

/**
 * Returns a sentiment in [-1, 1] for recent company news.
 */
export async function getNewsSentiment(symbol: string): Promise<number> {
  try {
    const sym = (symbol || "").toUpperCase();
    if (!sym || !KEY) return 0;

    // last 14 days
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 14);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = `${API}/company-news?symbol=${encodeURIComponent(sym)}&from=${fmt(from)}&to=${fmt(
      to
    )}&token=${encodeURIComponent(KEY)}`;

    const res = await fetch(url, { next: { revalidate: 60 * 30 } }); // cache 30m
    if (!res.ok) return 0;

    const items: FinnhubNewsItem[] = await res.json();
    if (!Array.isArray(items) || items.length === 0) return 0;

    const scores = items
      .slice(0, 50)
      .map((n) => scoreTitleAndSummary(n.headline ?? "", n.summary ?? ""));

    if (!scores.length) return 0;

    // trimmed mean to reduce outliers
    scores.sort((a, b) => a - b);
    const trim = Math.max(0, Math.floor(scores.length * 0.1));
    const trimmed = scores.slice(trim, scores.length - trim);
    const avg = trimmed.reduce((s, x) => s + x, 0) / (trimmed.length || 1);

    return Math.max(-1, Math.min(1, avg));
  } catch {
    return 0;
  }
}
