// src/lib/reddit.ts
import { averageSentiment } from "@/lib/sentiment";

const FINNHUB = "https://finnhub.io/api/v1";
const FH_KEY = process.env.FINNHUB_API_KEY!;
const UA = "Mozilla/5.0 (compatible; StockDashboardBot/1.0; +https://example.com)";

type FinnhubSocial = {
  symbol?: string;
  reddit?: Array<{
    atTime?: string;
    mention?: number;
    positiveScore?: number;
    negativeScore?: number;
    score?: number;
  }>;
};

/** Try Finnhub social sentiment; returns number in [-1..+1] or null if unavailable. */
async function tryFinnhub(symbol: string): Promise<number | null> {
  if (!FH_KEY) return null;

  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400 * 1000);
  const toStr = to.toISOString().slice(0, 10);
  const fromStr = from.toISOString().slice(0, 10);
  const url = `${FINNHUB}/stock/social-sentiment?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${FH_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = (await res.json()) as FinnhubSocial;
    const arr = json?.reddit || [];
    if (!arr.length) return null;

    const vals = arr
      .map((d) => (typeof d.score === "number" ? d.score : 0))
      .filter((x) => Number.isFinite(x));
    if (!vals.length) return null;

    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.max(-1, Math.min(1, Math.round(avg * 100) / 100));
  } catch {
    return null;
  }
}

// Build a broader Reddit query that includes ticker aliases/name.
function buildRedditQuery(symbol: string, hintName?: string): string {
  const s = symbol.toUpperCase();
  const noSuffix = s.replace(/\.[A-Z]+$/i, "").replace(/-[A-Z]+$/i, "");
  const terms = new Set<string>([s, `$${s}`, noSuffix]);

  if (hintName) {
    const n = hintName.trim();
    if (n && n.length > 1) {
      terms.add(n);
      terms.add(`${n} stock`);
    }
  }

  // OR-joined query
  return Array.from(terms)
    .map((t) => (/\s/.test(t) ? `"${t}"` : t))
    .join(" OR ");
}

/** Fallback: Reddit search JSON (titles only) scored with our lexicon. */
async function tryRedditSearch(symbol: string, hintName?: string): Promise<number> {
  const q = encodeURIComponent(buildRedditQuery(symbol, hintName));
  const url = `https://www.reddit.com/search.json?q=${q}&sort=new&t=month&limit=50`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as {
      data?: { children?: Array<{ data?: { title?: string } }> };
    };
    const posts = json?.data?.children || [];
    const titles = posts
      .map((p) => String(p?.data?.title || "").trim())
      .filter((t) => t.length > 0);
    if (!titles.length) return 0;
    return averageSentiment(titles);
  } catch {
    return 0;
  }
}

/** Returns sentiment in [-1..+1]; neutral (0) on failure. */
export async function getRedditSentiment(symbol: string, hintName?: string): Promise<number> {
  const fh = await tryFinnhub(symbol);
  if (typeof fh === "number") return fh;
  return tryRedditSearch(symbol, hintName);
}
