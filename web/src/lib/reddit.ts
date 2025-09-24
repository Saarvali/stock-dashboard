// src/lib/reddit.ts
import { scoreText } from "@/lib/sentiment";

const FINNHUB = "https://finnhub.io/api/v1";
const FH_KEY = process.env.FINNHUB_API_KEY!;

interface FinnhubRedditItem {
  positiveScore?: number;
  negativeScore?: number;
  title?: string;
  text?: string;
  body?: string;
}

interface FinnhubRedditResponse {
  reddit?: FinnhubRedditItem[];
}

/**
 * Returns a sentiment in [-1, 1] based on recent Reddit chatter.
 * Uses Finnhub social-sentiment if available, otherwise 0.
 */
export async function getRedditSentiment(symbol: string, _companyName?: string): Promise<number> {
  // keep param for future use but avoid unused-var lint
  void _companyName;

  try {
    const sym = (symbol || "").toUpperCase();
    if (!sym || !FH_KEY) return 0;

    // last 14 days
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const fromStr = from.toISOString().slice(0, 10);

    const url = `${FINNHUB}/stock/social-sentiment?symbol=${encodeURIComponent(sym)}&from=${fromStr}&token=${encodeURIComponent(
      FH_KEY
    )}`;

    const res = await fetch(url, { next: { revalidate: 60 * 30 } }); // cache 30m
    if (!res.ok) return 0;

    const data: FinnhubRedditResponse = await res.json();
    const arr: FinnhubRedditItem[] = Array.isArray(data?.reddit) ? data.reddit! : [];
    if (!arr.length) return 0;

    const vals: number[] = [];

    for (const r of arr.slice(0, 80)) {
      const pos = typeof r.positiveScore === "number" ? r.positiveScore : undefined;
      const neg = typeof r.negativeScore === "number" ? r.negativeScore : undefined;

      if (typeof pos === "number" && typeof neg === "number" && pos + neg > 0) {
        vals.push((pos - neg) / (pos + neg)); // [-1, 1]
        continue;
      }

      const text = r.title || r.text || r.body || "";
      if (text) vals.push(scoreText(text));
    }

    if (!vals.length) return 0;

    vals.sort((a, b) => a - b);
    const trim = Math.max(0, Math.floor(vals.length * 0.1));
    const trimmed = vals.slice(trim, vals.length - trim);
    const avg = trimmed.reduce((s, x) => s + x, 0) / (trimmed.length || 1);

    return Math.max(-1, Math.min(1, avg));
  } catch {
    return 0;
  }
}
