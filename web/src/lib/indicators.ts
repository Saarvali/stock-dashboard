// src/lib/indicators.ts
export function sma(values: number[], window: number) {
  if (values.length < window) return NaN;
  let sum = 0;
  for (let i = values.length - window; i < values.length; i++) sum += values[i];
  return sum / window;
}

// Simple RSI(14)
export function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return NaN;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function pct(from: number, to: number) {
  if (!from) return 0;
  return ((to - from) / from) * 100;
}

/** % distance from the highest close in the given window (negative when below the high). */
export function distFromHighPct(values: number[], window = 252 /* ~52w trading days */) {
  const slice = values.slice(-window);
  if (slice.length === 0) return NaN;
  const high = Math.max(...slice);      // ← fixed spread operator
  const last = slice[slice.length - 1];
  return pct(high, last);               // negative if below high
}
