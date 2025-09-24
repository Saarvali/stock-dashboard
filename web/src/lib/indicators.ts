// src/lib/indicators.ts

/**
 * RSI(14) by Wilder's smoothing.
 * Input: closes (ascending). Output: array aligned to closes (leading values are NaN until period).
 */
export function rsi(closes: number[], period = 14): number[] {
  const n = closes.length;
  const out = new Array<number>(n).fill(NaN);
  if (n < period + 1) return out;

  let gain = 0;
  let loss = 0;

  // seed averages over first `period`
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;

  // first RSI value
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  // Wilder smoothing
  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** % below 52-week high (or last N closes). Negative = below high, 0 = at high. */
export function distFromHighPct(closes: number[], lookback = 252): number {
  if (!closes.length) return 0;
  const start = Math.max(0, closes.length - lookback);
  const window = closes.slice(start);
  const high = Math.max(...window);
  const last = closes[closes.length - 1];
  if (high <= 0) return 0;
  return ((last - high) / high) * 100; // e.g. -12.3 means 12.3% below high
}
