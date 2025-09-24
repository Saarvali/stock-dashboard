// src/lib/data.ts
import { sma, rsi, pct, distFromHighPct } from "@/lib/indicators";
import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";

// Your alpha/finnhub helpers (use the names you actually have)
import { getDailySeries, getQuote, searchSymbols, type SeriesPoint } from "@/lib/alpha";
import {
  finnhubDaily,
  finnhubDailyFromCandidates,
  finnhubSearchSymbol,
  finnhubQuote,
  type FinnhubPoint,
} from "@/lib/finnhub";

/* ================= Types ================= */

export type StockRow = {
  symbol: string;
  name: string;
  last: number;
  changePct: number;
  rsi14: number;
  sma50: number;
  sma200: number;
  dist52wHighPct: number;
  m6VsBenchmarkPct: number;
  m12VsBenchmarkPct: number;
  newsSent: number;    // -1..+1
  redditSent: number;  // -1..+1
  live: boolean;
};

export type Data = {
  asOf: string;
  benchmark: string;
  watchlist: string[];
  portfolios?: Record<string, string[]>;
  stocks: Record<string, StockRow>;
  liveCount: number;
  totalCount: number;
};

export type ChartPoint = {
  date: string;
  stock: number;
  spy?: number | null;
  omx?: number | null;
  volume?: number | null;
};

export type ChartPayload = {
  data: ChartPoint[];
  overlaysIncluded: string[];
  note: string;
};

export type StockDetail = {
  data: Data;
  row?: StockRow;
  chart?: ChartPayload;
};

/* ============== Constants & tiny mock ============== */

const BENCH = "SPY";
const DETAIL_DAYS = 2100;                          // deep for MAX views
const DASHBOARD_SIZE: "compact" | "full" = "full";  // keep "full" for stable indicators

const mockWatchlist = ["AAPL", "TSLA", "VOLV-B.ST"];

/* ================= Helpers ================= */

function relativeVsBench(closes: number[], bench: number[], days: number): number {
  const last = closes.at(-1);
  const benchLast = bench.at(-1);
  if (!last || !benchLast) return 0;

  const n = Math.min(days, closes.length - 1, bench.length - 1);
  if (n <= 0) return 0;

  const a = closes[closes.length - 1 - n];
  const b = bench[bench.length - 1 - n];
  return pct(a, last) - pct(b, benchLast);
}

function buildRowFromCloses(symbol: string, name: string, closes: number[], benchCloses: number[]): StockRow {
  const last = closes.at(-1) ?? 0;
  const prev = closes.at(-2) ?? last;

  return {
    symbol: symbol.toUpperCase(),
    name,
    last,
    changePct: pct(prev, last),
    rsi14: rsi(closes, 14),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    dist52wHighPct: distFromHighPct(closes, 252),
    m6VsBenchmarkPct: relativeVsBench(closes, benchCloses, 126),
    m12VsBenchmarkPct: relativeVsBench(closes, benchCloses, 252),
    newsSent: 0,
    redditSent: 0,
    live: true,
  };
}

async function fillSentiments(symbol: string, row: StockRow): Promise<StockRow> {
  try {
    const [news, reddit] = await Promise.all([
      getNewsSentiment(symbol),
      getRedditSentiment(symbol, row.name),
    ]);
    row.newsSent = Number.isFinite(news) ? news : 0;
    row.redditSent = Number.isFinite(reddit) ? reddit : 0;
  } catch {}
  return row;
}

async function resolveCloses(
  symbol: string,
  size: "compact" | "full"
): Promise<{ symbol: string; closes: number[] } | null> {
  const symU = symbol.toUpperCase();

  // Alpha
  try {
    const s = await getDailySeries(symU, size);
    return { symbol: symU, closes: s.map((r) => r.close) };
  } catch {}

  // Finnhub
  try {
    const s = await finnhubDaily(symU, 420);
    return { symbol: symU, closes: s.map((r) => r.close) };
  } catch {}

  // Try searching
  try {
    const matches = await finnhubSearchSymbol(symU);
    const best = matches.find((m) => m.symbol.toUpperCase().endsWith(".ST"))?.symbol || matches[0]?.symbol;
    if (best) {
      const bU = best.toUpperCase();
      try {
        const s = await finnhubDaily(bU, 420);
        return { symbol: bU, closes: s.map((r) => r.close) };
      } catch {
        const s2 = await getDailySeries(bU, size);
        return { symbol: bU, closes: s2.map((r) => r.close) };
      }
    }
  } catch {}

  return null;
}

function normalizeTo100(series: Array<{ date: string; close: number; volume?: number | null }>): ChartPoint[] {
  if (!series.length) return [];
  const base = series[0].close || 1;
  return series.map((r) => ({ date: r.date, stock: (r.close / base) * 100, volume: r.volume ?? null }));
}

function mergeOverlays(
  main: Array<{ date: string; close: number; volume?: number | null }>,
  spy?: Array<{ date: string; close: number }> | null,
  omx?: Array<{ date: string; close: number }> | null
): ChartPayload {
  const normMain = normalizeTo100(main);
  const spyMap = new Map<string, number>(spy?.map((r) => [r.date, r.close]) ?? []);
  const omxMap = new Map<string, number>(omx?.map((r) => [r.date, r.close]) ?? []);

  let spyBase = 0, omxBase = 0;
  for (const r of main) {
    if (!spyBase && spyMap.has(r.date)) spyBase = spyMap.get(r.date)!;
    if (!omxBase && omxMap.has(r.date)) omxBase = omxMap.get(r.date)!;
    if (spyBase && omxBase) break;
  }

  const data: ChartPoint[] = normMain.map((p) => {
    const s = spyMap.get(p.date);
    const o = omxMap.get(p.date);
    return {
      date: p.date,
      stock: p.stock,
      spy: s && spyBase ? (s / spyBase) * 100 : null,
      omx: o && omxBase ? (o / omxBase) * 100 : null,
      volume: p.volume ?? null,
    };
  });

  const overlaysIncluded: string[] = [];
  if (spyBase) overlaysIncluded.push("SPY");
  if (omxBase) overlaysIncluded.push("OMXS30");
  return { data, overlaysIncluded, note: "Indexed to 100 at period start" };
}

/* ================= Public APIs used by pages ================= */

/** Default dashboard data (object with .stocks). */
export async function getDashboardData(): Promise<Data> {
  // Benchmark series
  let benchSeries: number[] = [];
  try {
    const bench = await getDailySeries(BENCH, DASHBOARD_SIZE);
    benchSeries = bench.map((r) => r.close);
  } catch {
    benchSeries = [1, 1];
  }

  const entries = await Promise.all(
    mockWatchlist.map(async (sym) => {
      const name = sym.toUpperCase();

      const resolved = await resolveCloses(sym, DASHBOARD_SIZE);
      if (resolved) {
        const row = buildRowFromCloses(resolved.symbol, name, resolved.closes, benchSeries);
        return fillSentiments(resolved.symbol, row);
      }

      // quote-only fallback
      try {
        const fq = await finnhubQuote(sym);
        return fillSentiments(sym, {
          symbol: sym.toUpperCase(),
          name,
          last: fq.last,
          changePct: fq.changePct,
          rsi14: NaN,
          sma50: NaN,
          sma200: NaN,
          dist52wHighPct: NaN,
          m6VsBenchmarkPct: 0,
          m12VsBenchmarkPct: 0,
          newsSent: 0,
          redditSent: 0,
          live: false,
        });
      } catch {
        try {
          const q = await getQuote(sym);
          return fillSentiments(sym, {
            symbol: sym.toUpperCase(),
            name,
            last: q.last,
            changePct: q.changePct,
            rsi14: NaN,
            sma50: NaN,
            sma200: NaN,
            dist52wHighPct: NaN,
            m6VsBenchmarkPct: 0,
            m12VsBenchmarkPct: 0,
            newsSent: 0,
            redditSent: 0,
            live: false,
          });
        } catch {
          return undefined;
        }
      }
    })
  );

  const stocks: Record<string, StockRow> = {};
  let liveCount = 0;
  for (const r of entries) {
    if (!r) continue;
    stocks[r.symbol] = r;
    if (r.live) liveCount++;
  }

  return {
    asOf: new Date().toISOString().slice(0, 10),
    benchmark: BENCH,
    watchlist: mockWatchlist,
    portfolios: undefined,
    stocks,
    liveCount,
    totalCount: mockWatchlist.length,
  };
}

/** Dashboard for a provided list of tickers (?wl=...). */
export async function getDashboardDataFor(watchlist: string[]): Promise<Data> {
  const wl = (watchlist || []).map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (!wl.length) return getDashboardData();

  let benchSeries: number[] = [];
  try {
    const bench = await getDailySeries(BENCH, DASHBOARD_SIZE);
    benchSeries = bench.map((r) => r.close);
  } catch {
    benchSeries = [1, 1];
  }

  const entries = await Promise.all(
    wl.map(async (sym) => {
      const resolved = await resolveCloses(sym, DASHBOARD_SIZE);
      if (resolved) {
        const row = buildRowFromCloses(resolved.symbol, resolved.symbol, resolved.closes, benchSeries);
        return fillSentiments(resolved.symbol, row);
      }

      try {
        const fq = await finnhubQuote(sym);
        return fillSentiments(sym, {
          symbol: sym.toUpperCase(),
          name: sym.toUpperCase(),
          last: fq.last,
          changePct: fq.changePct,
          rsi14: NaN,
          sma50: NaN,
          sma200: NaN,
          dist52wHighPct: NaN,
          m6VsBenchmarkPct: 0,
          m12VsBenchmarkPct: 0,
          newsSent: 0,
          redditSent: 0,
          live: false,
        });
      } catch {
        try {
          const q = await getQuote(sym);
          return fillSentiments(sym, {
            symbol: sym.toUpperCase(),
            name: sym.toUpperCase(),
            last: q.last,
            changePct: q.changePct,
            rsi14: NaN,
            sma50: NaN,
            sma200: NaN,
            dist52wHighPct: NaN,
            m6VsBenchmarkPct: 0,
            m12VsBenchmarkPct: 0,
            newsSent: 0,
            redditSent: 0,
            live: false,
          });
        } catch {
          return undefined;
        }
      }
    })
  );

  const stocks: Record<string, StockRow> = {};
  let liveCount = 0;
  for (const r of entries) {
    if (!r) continue;
    stocks[r.symbol] = r;
    if (r.live) liveCount++;
  }

  return {
    asOf: new Date().toISOString().slice(0, 10),
    benchmark: BENCH,
    watchlist: wl,
    portfolios: undefined,
    stocks,
    liveCount,
    totalCount: wl.length,
  };
}

/** Single-stock detail used by /stock/[symbol]. */
export async function getAnyStockDetail(
  input: string
): Promise<StockDetail> {
  const raw = (input || "").trim();
  const empty: StockDetail = {
    data: {
      asOf: new Date().toISOString().slice(0, 10),
      benchmark: BENCH,
      watchlist: [],
      portfolios: undefined,
      stocks: {},
      liveCount: 0,
      totalCount: 0,
    },
    row: undefined,
    chart: undefined,
  };
  if (!raw) return empty;

  // Benchmark deep (SPY) for overlay
  let benchCloses: number[] = [];
  let asOf = new Date().toISOString().slice(0, 10);
  let spySeries: Array<{ date: string; close: number }> | null = null;
  try {
    const spy = await finnhubDailyFromCandidates(["SPY", "^GSPC"], DETAIL_DAYS);
    spySeries = spy.series.map((r) => ({ date: r.date, close: r.close }));
    benchCloses = spy.series.map((r) => r.close);
    asOf = spy.series.at(-1)?.date ?? asOf;
  } catch {
    try {
      const avSpy = await getDailySeries(BENCH, "full");
      benchCloses = avSpy.map((r) => r.close);
      asOf = avSpy.at(-1)?.date ?? asOf;
      spySeries = avSpy.map((r) => ({ date: r.date, close: r.close }));
    } catch {
      benchCloses = [1, 1];
    }
  }

  // Main series (Alpha → Finnhub → search)
  let chosen = raw.toUpperCase();
  let mainSeries: Array<{ date: string; close: number; volume?: number | null }> | null = null;
  try {
    const s = await getDailySeries(chosen, "full");
    mainSeries = s.map((r) => ({ date: r.date, close: r.close, volume: null }));
  } catch {
    try {
      const fh = await finnhubDaily(chosen, DETAIL_DAYS);
      mainSeries = fh.map((r) => ({ date: r.date, close: r.close, volume: r.volume ?? null }));
    } catch {
      try {
        const matches = await finnhubSearchSymbol(raw);
        const best = matches.find((m) => m.symbol.toUpperCase().endsWith(".ST"))?.symbol || matches[0]?.symbol;
        if (best) {
          chosen = best.toUpperCase();
          const fh2 = await finnhubDaily(chosen, DETAIL_DAYS);
          mainSeries = fh2.map((r) => ({ date: r.date, close: r.close, volume: r.volume ?? null }));
        }
      } catch {}
      if (!mainSeries) {
        try {
          const matches = await searchSymbols(raw);
          const best = matches?.[0]?.symbol?.toUpperCase();
          if (best) {
            chosen = best;
            const s = await getDailySeries(chosen, "full");
            mainSeries = s.map((r) => ({ date: r.date, close: r.close, volume: null }));
          }
        } catch {}
      }
    }
  }

  // OMXS30 overlay (best-effort)
  let omxSeries: Array<{ date: string; close: number }> | null = null;
  try {
    const omx = await finnhubDailyFromCandidates(["^OMXS30", "OMXS30", "OMXS30.ST", "XACT-OMXS30.ST"], DETAIL_DAYS);
    omxSeries = omx.series.map((r) => ({ date: r.date, close: r.close }));
  } catch {
    omxSeries = null;
  }

  // Build row from series or quotes
  let row: StockRow | undefined;
  if (mainSeries && mainSeries.length >= 20) {
    const closes = mainSeries.map((r) => r.close);
    row = buildRowFromCloses(chosen, chosen, closes, benchCloses);
  } else {
    try {
      const fq = await finnhubQuote(chosen);
      row = {
        symbol: chosen,
        name: chosen,
        last: fq.last,
        changePct: fq.changePct,
        rsi14: NaN,
        sma50: NaN,
        sma200: NaN,
        dist52wHighPct: NaN,
        m6VsBenchmarkPct: 0,
        m12VsBenchmarkPct: 0,
        newsSent: 0,
        redditSent: 0,
        live: false,
      };
    } catch {
      try {
        const q = await getQuote(chosen);
        row = {
          symbol: chosen,
          name: chosen,
          last: q.last,
          changePct: q.changePct,
          rsi14: NaN,
          sma50: NaN,
          sma200: NaN,
          dist52wHighPct: NaN,
          m6VsBenchmarkPct: 0,
          m12VsBenchmarkPct: 0,
          newsSent: 0,
          redditSent: 0,
          live: false,
        };
      } catch {
        row = undefined;
      }
    }
  }

  // Chart payload
  let chart: ChartPayload | undefined;
  if (mainSeries && mainSeries.length) {
    chart = mergeOverlays(
      mainSeries,
      spySeries,
      omxSeries
    );
  }

  // Sentiment (when we have a row)
  if (row) row = await fillSentiments(chosen, row);

  // Wrap in Data shape for consistency with dashboard
  const data: Data = {
    asOf,
    benchmark: BENCH,
    watchlist: [],
    portfolios: undefined,
    stocks: row ? { [chosen]: row } : {},
    liveCount: row && row.live ? 1 : 0,
    totalCount: row ? 1 : 0,
  };

  return { data, row, chart };
}
