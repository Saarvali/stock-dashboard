import mock from "@/data/mock-data";
import { getDailySeries, getQuote, searchSymbols, type SeriesPoint } from "@/lib/alpha";
import { finnhubDaily, finnhubDailyFromCandidates, type FinnhubPoint } from "@/lib/finnhub";
import { sma, rsi, pct, distFromHighPct } from "@/lib/indicators";

const BENCH = "SPY";                // Benchmark + S&P500 overlay fallback
const DETAIL_DAYS = 2100;           // ~8 years for 5Y/MAX charts on the detail page
const DASHBOARD_SIZE: "compact" | "full" = "compact";

/* ==== Types ==== */
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
  newsSent: number;
  redditSent: number;
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

/* ==== Local mock typing ==== */
type MockStock = {
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
  newsSent: number;
  redditSent: number;
  live?: boolean;
};
type MockData = {
  watchlist: string[];
  portfolios?: Record<string, string[]>;
  stocks: Record<string, MockStock>;
};
const mockData = mock as unknown as MockData;

/* ==== Helpers ==== */
function buildRowFromCloses(symbol: string, name: string, closes: number[], benchCloses: number[]): StockRow {
  const last = closes.at(-1) ?? 0;
  const prev = closes.at(-2) ?? last;
  const changePctVal = pct(prev, last);
  const benchLast = benchCloses.at(-1) ?? 0;

  const rel = (days: number) => {
    const a = closes.at(-days - 1);
    const b = benchCloses.at(-days - 1);
    if (!a || !b || !last || !benchLast) return 0;
    return pct(a, last) - pct(b, benchLast);
  };

  return {
    symbol: symbol.toUpperCase(),
    name,
    last,
    changePct: changePctVal,
    rsi14: rsi(closes, 14),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    dist52wHighPct: distFromHighPct(closes, 252),
    m6VsBenchmarkPct: rel(126),
    m12VsBenchmarkPct: rel(252),
    newsSent: 0,
    redditSent: 0,
    live: true,
  };
}

async function fullSeriesWindow(
  symbol: string,
  days: number
): Promise<{ series: Array<FinnhubPoint | (SeriesPoint & { volume?: number | null })>; source: "FINNHUB" | "ALPHAVANTAGE" }> {
  try {
    const s = await finnhubDaily(symbol, days);
    return { series: s, source: "FINNHUB" };
  } catch {
    // fallback to Alpha Vantage (no volume)
  }
  const s = await getDailySeries(symbol, "full");
  const withVol: Array<SeriesPoint & { volume: number | null }> = s.map((r) => ({
    ...r,
    volume: null,
  }));
  return { series: withVol, source: "ALPHAVANTAGE" };
}

function normalizeTo100(
  series: Array<{ date: string; close: number; volume?: number | null }>
): ChartPoint[] {
  if (!series.length) return [];
  const base = series[0].close || 1;
  return series.map((r) => ({
    date: r.date,
    stock: (r.close / base) * 100,
    volume: r.volume ?? null,
  }));
}

function mergeOverlays(
  main: Array<{ date: string; close: number; volume?: number | null }>,
  spy?: Array<{ date: string; close: number }> | null,
  omx?: Array<{ date: string; close: number }> | null
): ChartPayload {
  const normMain = normalizeTo100(main);

  const spyMap = new Map<string, number>(spy?.map((r) => [r.date, r.close]) ?? []);
  const omxMap = new Map<string, number>(omx?.map((r) => [r.date, r.close]) ?? []);

  let spyBase = 0;
  let omxBase = 0;
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

/* ==== Dashboard (compact, fast) ==== */
export async function getDashboardData(): Promise<Data> {
  const watchlist = mockData.watchlist;
  const nameMap = new Map<string, string>();
  for (const s of Object.values(mockData.stocks)) nameMap.set(s.symbol, s.name);

  let benchSeries: number[] = [];
  let apiAsOf = "";
  try {
    const benchDaily = await getDailySeries(BENCH, DASHBOARD_SIZE);
    benchSeries = benchDaily.map((r) => r.close);
    apiAsOf = benchDaily.at(-1)?.date ?? "";
  } catch {
    benchSeries = [1, 1];
  }
  const asOf = apiAsOf || new Date().toISOString().slice(0, 10);

  const entries = await Promise.all(
    watchlist.map(async (sym) => {
      const name = nameMap.get(sym) || sym;
      try {
        const s = await getDailySeries(sym, DASHBOARD_SIZE);
        const closes = s.map((r) => r.close);
        return buildRowFromCloses(sym, name, closes, benchSeries);
      } catch {
        try {
          const q = await getQuote(sym);
          const fallback: StockRow = {
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
          };
          return fallback;
        } catch {
          const m = mockData.stocks[sym];
          if (!m) return undefined;
          const copy: StockRow = { ...m, live: false };
          return copy;
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
    asOf,
    benchmark: BENCH,
    watchlist,
    portfolios: mockData.portfolios,
    stocks,
    liveCount,
    totalCount: watchlist.length,
  };
}

/* ==== Dashboard for a custom watchlist (compact) ==== */
export async function getDashboardDataFor(watchlist: string[]): Promise<Data> {
  const wl = (watchlist || [])
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (!wl.length) return getDashboardData();

  // Benchmark (compact for speed on dashboard)
  let benchSeries: number[] = [];
  let apiAsOf = "";
  try {
    const benchDaily = await getDailySeries(BENCH, DASHBOARD_SIZE);
    benchSeries = benchDaily.map((r) => r.close);
    apiAsOf = benchDaily.at(-1)?.date ?? "";
  } catch {
    benchSeries = [1, 1];
  }
  const asOf = apiAsOf || new Date().toISOString().slice(0, 10);

  // Build rows for the provided watchlist
  const entries = await Promise.all(
    wl.map(async (sym) => {
      try {
        const s = await getDailySeries(sym, DASHBOARD_SIZE);
        const closes = s.map((r) => r.close);
        return buildRowFromCloses(sym, sym, closes, benchSeries);
      } catch {
        // Fallback to quote-only; if that fails, skip the symbol
        try {
          const q = await getQuote(sym);
          const fallback: StockRow = {
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
          };
          return fallback;
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
    asOf,
    benchmark: BENCH,
    watchlist: wl,
    portfolios: undefined,
    stocks,
    liveCount,
    totalCount: wl.length,
  };
}

/* ==== Single symbol (deep history, overlays) ==== */
export async function getAnyStockDetail(
  input: string
): Promise<{ data: Data; row?: StockRow; chart?: ChartPayload }> {
  const raw = (input || "").trim();
  if (!raw) {
    const empty: Data = {
      asOf: new Date().toISOString().slice(0, 10),
      benchmark: BENCH,
      watchlist: [],
      portfolios: undefined,
      stocks: {},
      liveCount: 0,
      totalCount: 0,
    };
    return { data: empty, row: undefined, chart: undefined };
  }

  // Benchmark (deep) & asOf
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

  // Main series (try raw, then resolve via search)
  let chosen = raw.toUpperCase();
  let mainSeries: Array<{ date: string; close: number; volume?: number | null }> | null = null;
  try {
    const r = await fullSeriesWindow(chosen, DETAIL_DAYS);
    mainSeries = r.series;
  } catch {
    try {
      const matches = await searchSymbols(raw);
      const best = matches?.[0]?.symbol?.toUpperCase();
      if (best) {
        chosen = best;
        const r2 = await fullSeriesWindow(chosen, DETAIL_DAYS);
        mainSeries = r2.series;
      }
    } catch {
      /* ignore */
    }
  }

  // OMXS30 overlay (deep)
  let omxSeries: Array<{ date: string; close: number }> | null = null;
  try {
    const omx = await finnhubDailyFromCandidates(["^OMXS30", "OMXS30", "OMXS30.ST", "XACT-OMXS30.ST"], DETAIL_DAYS);
    omxSeries = omx.series.map((r) => ({ date: r.date, close: r.close }));
  } catch {
    omxSeries = null;
  }

  // Build row
  let row: StockRow | undefined;
  if (mainSeries && mainSeries.length >= 200) {
    const closes = mainSeries.map((r) => r.close);
    row = buildRowFromCloses(chosen, chosen, closes, benchCloses);
  } else {
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
      const m = mockData.stocks[chosen];
      if (m) row = { ...m, live: false };
    }
  }

  // Chart
  let chart: ChartPayload | undefined;
  if (mainSeries && mainSeries.length) {
    chart = mergeOverlays(mainSeries, spySeries, omxSeries);
  }

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
