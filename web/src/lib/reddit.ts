// src/lib/reddit.ts
import { scoreText } from "@/lib/sentiment";

const FINNHUB = "https://finnhub.io/api/v1";
const FH_KEY = process.env.FINNHUB_API_KEY!;

/**
 * Returns a sentiment in [-1, 1] based on recent Reddit chatter.
 * Tries Finnhub social-sentiment (if available), falls back to simple 0.
 */
export async function getRedditSentiment(symbol: string, _companyName?: string): Promise<number> {
  try {
    const sym = (symbol || "").toUpperCase();
    if (!sym || !FH_KEY) return 0;

    // last 14 days
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const fromStr = from.toISOString().slice(0, 10);

    // Finnhub social sentiment for Reddit (best-effort)
    // Docs vary by plan; we defensively handle several shapes.
    const url = `${FINNHUB}/stock/social-sentiment?symbol=${encodeURIComponent(sym)}&from=${fromStr}&token=${encodeURIComponent(
      FH_KEY
    )}`;

    const res = await fetch(url, { next: { revalidate: 60 * 30 } }); // cache 30m
    if (res.ok) {
      const data = await res.json();

      // Possible shapes seen:
      // { reddit: [{ positiveScore, negativeScore, ... }...] }
      // or { reddit: [{ text/title/body }, ...] }
      const arr: any[] = Array.isArray(data?.reddit) ? data.reddit : [];

      if (arr.length) {
        const vals: number[] = [];

        for (const r of arr.slice(0, 80)) {
          // prefer numeric pos/neg if present
          const pos = typeof r.positiveScore === "number" ? r.positiveScore : undefined;
          const neg = typeof r.negativeScore === "number" ? r.negativeScore : undefined;

          if (typeof pos === "number" && typeof neg === "number" && pos + neg > 0) {
            const score = (pos - neg) / (pos + neg); // [-1, 1]
            vals.push(score);
            continue;
          }

          // otherwise try free text
          const text = (r.title as string) || (r.text as string) || (r.body as string) || "";
          if (text) {
            vals.push(scoreText(text));
          }
        }

        if (vals.length) {
          vals.sort((a, b) => a - b);
          const trim = Math.max(0, Math.floor(vals.length * 0.1));
          const trimmed = vals.slice(trim, vals.length - trim);
          const avg = trimmed.reduce((s, x) => s + x, 0) / (trimmed.length || 1);
          return Math.max(-1, Math.min(1, avg));
        }
      }
    }

    // Fallback if endpoint/plan not available or empty payload
    return 0;
  } catch {
    return 0;
  }
}
