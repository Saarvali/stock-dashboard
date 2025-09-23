// src/lib/sentiment.ts

// Expanded bilingual(ish) lexicon: English + a few Swedish finance words.
// Weights: roughly -3..+3; keep it simple & transparent.
const LEXICON: Record<string, number> = {
  // positive (EN)
  beat: 2, beats: 2, top: 2, tops: 2, exceed: 2, exceeds: 2,
  raise: 2, raises: 2, hike: 2, hikes: 2, boost: 2, boosts: 2,
  rally: 2, rallies: 2, surge: 2, surges: 2, jump: 2, jumps: 2, spike: 2, spikes: 2,
  soar: 3, soars: 3, record: 2, "record-high": 2, breakout: 2,
  strong: 2, bullish: 2, upgrade: 1, upgraded: 1, outperform: 2, buy: 1, "buy-rating": 1,
  profit: 1, profits: 1, profitable: 1, growth: 1, guidance: 1, "raises-guidance": 2,
  // negative (EN)
  miss: -2, misses: -2, below: -1, disappoint: -2, disappointed: -2,
  cut: -2, cuts: -2, slash: -2, slashes: -2, reduce: -1, reduces: -1,
  fall: -2, falls: -2, sink: -2, sinks: -2, drop: -2, drops: -2,
  slump: -2, slumps: -2, plunge: -3, plunges: -3, plummet: -3, plummets: -3,
  weak: -2, bearish: -2, downgrade: -2, downgraded: -2, underperform: -2, selloff: -2,
  loss: -1, losses: -1, warning: -2, "profit-warning": -3, lawsuit: -2, probe: -2, recall: -2, investigation: -2, fine: -2,
  bankrupt: -3, bankruptcy: -3, fraud: -3,
  // earnings-y words (neutral-ish but slightly directional)
  beats: 2, "beats-estimates": 2, "misses-estimates": -2, eps: 0.5, revenue: 0.3, outlook: 0.3, forecast: 0.3,

  // Swedish (very small, but helps .ST names)
  höjer: 2, "höjt": 2, "rekord": 2, "stiger": 2, "upp": 1, "uppgång": 2, "köp": 1, "uppgradera": 1, "uppgraderar": 1,
  sänker: -2, "sjunker": -2, "rasar": -3, "dyker": -3, "vinstvarning": -3, "förlust": -2, "nedgradera": -2, "nedgraderar": -2, "sälj": -1, "svag": -2
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9åäöÅÄÖ\s\-\.]/g, " ")  // keep simple diacritics
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
    // tiny phrase helpers
    if (w === "record" && words.includes("high")) { sum += 2; hits++; }
    if ((w === "miss" || w === "misses") && words.includes("estimates")) { sum += -2; hits++; }
    if ((w === "beat" || w === "beats") && words.includes("estimates")) { sum += 2; hits++; }
  }
  if (!hits) return 0;
  const normalized = Math.max(-1, Math.min(1, sum / (hits * 3)));
  return normalized;
}

/** Average a bunch of texts; returns 0 if empty */
export function averageSentiment(texts: string[]): number {
  if (!texts.length) return 0;
  const scores = texts.map(scoreText);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.max(-1, Math.min(1, Math.round(avg * 100) / 100));
}
