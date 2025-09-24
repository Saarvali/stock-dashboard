// src/lib/reddit.ts
import { scoreTitleAndSummary } from "@/lib/sentiment";

const FINNHUB = "https://finnhub.io/api/v1";
const FH_KEY = process.env.FINNHUB_API_KEY!;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getRedditSentiment(symbol: string, _companyName?: string): Promise<number> {
  // Keep parameter for future use, silence ESLint
  void _companyName;

  try {
    const url = `${FINNHUB}/stock/social-sentiment?symbol=${symbol}&token=${FH_KEY}`;
    const resp = await fetch(url, { cache: "no-store" });
    const data = await resp.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any[] = Array.isArray(data?.reddit) ? data.reddit : [];
    if (!arr.length) return 0;

    const scores = arr.map((x) => scoreTitleAndSummary(x.title ?? "", x.summary ?? ""));
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  } catch (e) {
    console.error("Reddit sentiment error", e);
    return 0;
  }
}
