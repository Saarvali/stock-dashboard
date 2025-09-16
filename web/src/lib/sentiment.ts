// Tiny lexicon (expand anytime)
const LEXICON: Record<string, number> = {
  // positive
  beat: 2, beats: 2, "record": 1, surge: 2, surges: 2, jump: 2, jumps: 2,
  soar: 2, soars: 2, strong: 2, bullish: 2, upgrade: 1, upgraded: 1, gain: 1, gains: 1,
  profit: 1, profits: 1, growth: 1, "all-time": 1, "better-than-expected": 2,
  // negative
  miss: -2, misses: -2, fall: -2, falls: -2, plunge: -3, plunges: -3,
  drop: -2, drops: -2, weak: -2, bearish: -2, downgrade: -1, downgraded: -1,
  loss: -1, losses: -1, slowdown: -1, warning: -2, lawsuit: -2, probe: -2, recall: -2
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Score one text in [-1..+1]; 0 if no lexicon hits */
export function scoreText(text: string): number {
  const words = tokenize(text);
  let sum = 0;
  let hits = 0;
  for (const w of words) {
    if (w in LEXICON) {
      sum += LEXICON[w];
      hits++;
    }
  }
  if (!hits) return 0;
  // Normalize by 3 (roughly the strongest magnitude we use) and clamp
  const normalized = Math.max(-1, Math.min(1, sum / (hits * 3)));
  return normalized;
}

/** Average a bunch of texts; returns 0 if empty */
export function averageSentiment(texts: string[]): number {
  if (!texts.length) return 0;
  const scores = texts.map(scoreText);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Round to 2 decimals so your UI shows tidy values
  return Math.max(-1, Math.min(1, Math.round(avg * 100) / 100));
}
