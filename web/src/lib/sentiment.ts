// src/lib/sentiment.ts

// Lightweight lexicon-based sentiment (news/reddit).
// Keep keys UNIQUE (TS error if duplicated).
const LEXICON: Record<string, number> = {
  // bullish / positive
  "upgrade": 2,
  "upgrades": 2,
  "raised": 2,
  "raise": 1.5,
  "beat": 2,
  "beats": 2,
  "record": 2,
  "surge": 2,
  "surges": 2,
  "rally": 2,
  "rallies": 2,
  "soar": 2.5,
  "soars": 2.5,
  "jump": 1.5,
  "jumps": 1.5,
  "gain": 1.5,
  "gains": 1.5,
  "buy": 2,
  "overweight": 1.5,
  "outperform": 2,
  "bullish": 2,

  // earnings-oriented (slightly directional)
  "beats-estimates": 2,
  "misses-estimates": -2,
  "eps": 0.5,
  "revenue": 0.3,
  "outlook": 0.3,
  "forecast": 0.3,
  "guidance": 0.3,

  // bearish / negative
  "downgrade": -2,
  "downgrades": -2,
  "cut": -1.5,
  "cuts": -1.5,
  "miss": -2,
  "misses": -2,
  "fall": -1.5,
  "falls": -1.5,
  "drop": -1.5,
  "drops": -1.5,
  "slump": -2,
  "slumps": -2,
  "plunge": -2.5,
  "plunges": -2.5,
  "bearish": -2,
  "fraud": -3,
  "bankrupt": -3,
  "bankruptcy": -3,
  "probe": -2,
  "investigation": -2,

  // Swedish (helps .ST names a bit)
  "höjer": 2,
  "höjt": 2,
  "rekord": 2,
  "stiger": 2,
  "upp": 1,
  "uppgång": 2,
  "köp": 1,
  "uppgradera": 1,
  "uppgraderar": 1,
  "sänker": -2,
  "rasar": -2.5,
  "faller": -1.5,
  "varning": -1.5,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // keep letters, digits, dashes (for matches like "beats-estimates")
    .replace(/[^\p{L}\p{N}\- ]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function clamp(x: number, min = -1, max = 1) {
  return Math.max(min, Math.min(max, x));
}

/**
 * Score a single text: returns a number in [-1, 1].
 * Simple bag-of-words over the lexicon with log damping.
 */
export function scoreText(text: string | undefined | null): number {
  if (!text) return 0;
  const toks = tokenize(text);
  if (!toks.length) return 0;

  let sum = 0;
  for (const t of toks) {
    const w = LEXICON[t];
    if (w) sum += w;
  }

  // Normalize by length with mild damping to avoid long articles dominating
  const norm = sum / Math.max(5, Math.log2(8 + toks.length));
  return clamp(norm / 5); // scale into roughly [-1, 1]
}

/**
 * Combine title + summary safely to a single score in [-1, 1].
 */
export function scoreTitleAndSummary(title?: string, summary?: string): number {
  const s1 = scoreText(title);
  const s2 = scoreText(summary);
  // Weighted: title matters a bit more
  return clamp(0.6 * s1 + 0.4 * s2);
}
