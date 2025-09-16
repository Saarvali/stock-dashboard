import mock from "@/data/mock-data";
import { getDailySeries, getQuote, searchSymbols } from "@/lib/alpha";
import { finnhubDaily, finnhubDailyFromCandidates } from "@/lib/finnhub";
import { sma, rsi, pct, distFromHighPct } from "@/lib/indicators";

const BENCH = "SPY"; // use SPY as benchmark & S&P500 overlay fallback

/* ============== Types ============== */
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
  stock: number;      // normalized to 100 at start
  spy?: number | null;
  omx?: number | null;
  volume?: number | null;
};

export type ChartPayload = {
  data: ChartPoint[];
  overlaysIncluded: string[]; // e.g., ["SPY", "^OMXS30"]
  note: string;               // "Indexed to 100 at start"
};

/* ============== Helpers ============== */

// Build row from a 1Y+ daily series (Finnhub preferred)
function buildRowFromCloses(symbol: string, name: string, closes: number[], benchCloses: number[]): StockRow {
  const last = closes.at(-1)!;
  const prev = closes.at(-2) ?? last;
  const changePctVal = pct(prev, last);
  const benchLast = benchCloses.at(-1)!;

  const rel = (days: number) => {
    const a = closes.at(-days - 1), b = benchCloses.at(-days - 1);
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

async function fullSeries1Y(symbol: string) {
  // 1) Try Finnhub 1Y+ candles (preferred, with volume)
  try {
    const s = await finnhubDaily(symbol, 420);
    return { series: s, source: "FINNHUB" as const };
  } catch {}

  // 2) Fallback: Alpha Vantage full daily (no volume)
  try {
    const s = await getDailySeries(symbol, "full");
    const withVol = s.map((r: any) => ({ ...r, volume: null as number | null }));
    return { series: withVol, source: "ALPHAVANTAGE" as const };
  } catch {}

  throw new Error("No series available");
}

function normalizeTo100(series: { date: string; close: number; volume?: number | null }[]) {
  if (!series.length) return [] as ChartPoint[];
  const base = series[0].close || 1;
  return series.map((r) => ({
    date: r.date,
    stock: (r.close / base) * 100,
    volume: r.volume ?? null,
  }));
}

function mergeOverlays(
  main: { date: string; close: number; volume?: number | null }[],
  spy?: { date: string; close: number }[] | null,
  omx?: { date: string; close: number }[] | null
): ChartPayload {
  const normMain = normalizeTo100(main);
  const overlaysIncluded: string[] = [];
  const spyMap = new Map(spy?.map((r) => [r.date, r.close]) ?? []);
  const omxMap = new Map(omx?.map((r) => [r.date, r.close]) ?? []);

  let spyBase = 0;
  let omxBase = 0;
  for (const r of main) {
    if (!spyBase && spyMap.has(r.date)) spyBase = spyMap.get(r.date)!;
    if (!omxBase && omxMap.has(r.date)) omxBase = omxMap.get(r.date)!;
    if (spyBase && omxBase) break;
  }

  if (spy && spy.length && spyBase) overlaysIncluded.push(spy[0]?.symbol ?? "SPY");
  if (omx && omx.length && omxBase) overlaysIncluded.push(omx[0]?.symbol ?? "^OMXS30");

  const data = normMain.map((p) => {
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

  return { data, overlaysIncluded, note: "Indexed to 100 at period start" };
}

/* ============== Dashboard (compact) ============== */
export async function getDashboardData(): Promise<Data> {
  const watchlist = mock.watchlist;
  const nameMap = new Map<string, string>();
  for (const s of Object.values(mock.stocks)) nameMap.set(s.symbol, s.name);

  // Benchmark via Alpha (compact is fine for dashboard)
  let benchSeries: number[] = [];
  let apiAsOf = "";
  try {
    const benchDaily = await getDailySeries(BENCH, "compact");
    benchSeries = benchDaily.map((r: any) => r.close);
    apiAsOf = benchDaily.at(-1)?.date ?? "";
  } catch {
    benchSeries = [1, 1];
  }
  const asOf = apiAsOf || new Date().toISOString().slice(0, 10);

  const entries = await Promise.all(
    watchlist.map(async (sym) => {
      const name = nameMap.get(sym) || sym;
      try {
        const s = await getDailySeries(sym, "compact");
        const closes = s.map((r: any) => r.close);
        return buildRowFromCloses(sym, name, closes, benchSeries);
      } catch {
        // fallback to quote-only or mock
        try {
          const q = await getQuote(sym);
          return {
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
          } as StockRow;
        } catch {
          const m = (mock.stocks as any)[sym];
          if (!m) return undefined;
          return { ...m, live: false } as StockRow;
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
    portfolios: (mock as any).portfolios,
    stocks,
    liveCount,
    totalCount: watchlist.length,
  };
}

/* ============== Single symbol (1Y, overlays) ============== */
export async function getAnyStockDetail(input: string): Promise<{ data: Data; row?: StockRow; chart?: ChartPayload }> {
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

  // Benchmark (1Y) for relative performance & overlay
  let benchCloses: number[] = [];
  let asOf = new Date().toISOString().slice(0, 10);
  let spySeries: { date: string; close: number }[] | null = null;
  try {
    const spy = await finnhubDailyFromCandidates(["SPY", "^GSPC"], 420);
    spySeries = spy.series.map((r: any) => ({ ...r, symbol: spy.symbol }));
    benchCloses = spy.series.map((r: any) => r.close);
    asOf = spy.series.at(-1)?.date ?? asOf;
  } catch {
    try {
      const avSpy = await getDailySeries(BENCH, "full");
      benchCloses = avSpy.map((r: any) => r.close).slice(-300);
      asOf = avSpy.at(-1)?.date ?? asOf;
      spySeries = avSpy.map((r: any) => ({ date: r.date, close: r.close, symbol: BENCH }));
    } catch {}
  }
  if (!benchCloses.length) benchCloses = [1, 1];

  // Main series: try input as symbol; then resolve by search if needed
  let chosen = raw.toUpperCase();
  let mainSeries: { date: string; close: number; volume?: number | null }[] | null = null;
  try {
    const r = await fullSeries1Y(chosen);
    mainSeries = r.series;
  } catch {
    try {
      const matches = await searchSymbols(raw);
      const best = matches?.[0]?.symbol?.toUpperCase();
      if (best) {
        chosen = best;
        const r2 = await fullSeries1Y(chosen);
        mainSeries = r2.series;
      }
    } catch {}
  }

  // OMXS30 overlay (best effort)
  let omxSeries: { date: string; close: number }[] | null = null;
  try {
    const omx = await finnhubDailyFromCandidates(
      ["^OMXS30", "OMXS30", "OMXS30.ST", "XACT-OMXS30.ST"],
      420
    );
    omxSeries = omx.series.map((r: any) => ({ ...r, symbol: omx.symbol }));
  } catch {
    omxSeries = null;
  }

  // If we still have no main series, try quote-only then mock
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
      const m = (mock.stocks as any)[chosen];
      if (m) row = { ...m, live: false } as StockRow;
    }
  }

  // Chart payload (normalized to 100)
  let chart: ChartPayload | undefined = undefined;
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
