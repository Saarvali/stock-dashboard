import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnyStockDetail } from "@/lib/data";
import PriceChart from "@/components/PriceChart";

function fmtPct(x: number, d = 1) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}
function pill(ok: boolean) {
  return ok ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50";
}
function chip(p: number) {
  return p > 0.1 ? "text-green-600 bg-green-50"
       : p < -0.1 ? "text-red-600 bg-red-50"
       : "text-gray-600 bg-gray-50";
}

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const key = decodeURIComponent(symbol);
  const { data, row: stock, chart } = await getAnyStockDetail(key);
  if (!stock) {
    return (
      <main className="min-h-screen px-6 py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-2xl font-bold">Couldn’t load “{key}”</h1>
          <p className="text-gray-600">
            Try another symbol (e.g. <code className="px-1 rounded bg-gray-100">AMZN</code>), or wait a moment —
            free data provider limits can temporarily block requests.
          </p>
          <p className="text-sm text-gray-500">Tip: pick the top, plain ticker in the suggestions.</p>
          <p><a className="underline" href="/">← Back to dashboard</a></p>
        </div>
      </main>
    );
  }

  const above50 = Number.isFinite(stock.sma50) && stock.last > stock.sma50;
  const above200 = Number.isFinite(stock.sma200) && stock.last > stock.sma200;

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {stock.symbol} <span className="text-gray-500 text-xl">— {stock.name}</span>
            <span className="ml-3 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 align-middle">Live</span>
          </h1>
          <Link href="/" className="text-sm underline">← Back to dashboard</Link>
        </div>

        <div className="text-gray-600">
          As of <span className="font-medium">{data.asOf}</span> • Benchmark: <span className="font-medium">{data.benchmark}</span>
        </div>

        {chart?.data?.length ? <PriceChart data={chart.data} note={chart.note} /> : null}

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Last</div>
            <div className="text-2xl font-semibold">{stock.last.toFixed(2)}</div>
            <div className={`mt-1 inline-block px-2 py-1 rounded ${chip(stock.changePct)}`}>{fmtPct(stock.changePct)}</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Trend</div>
            <div className="space-x-2 mt-1">
              <span className={`px-2 py-1 rounded ${pill(!!above50)}`}>{above50 ? "Above 50D" : "Below 50D"}</span>
              <span className={`px-2 py-1 rounded ${pill(!!above200)}`}>{above200 ? "Above 200D" : "Below 200D"}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">SMA50: {Number.isFinite(stock.sma50) ? stock.sma50.toFixed(2) : "—"} • SMA200: {Number.isFinite(stock.sma200) ? stock.sma200.toFixed(2) : "—"}</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">RSI & 52-week</div>
            <div className="text-2xl font-semibold">{Number.isFinite(stock.rsi14) ? stock.rsi14.toFixed(1) : "—"}</div>
            <div className="text-xs text-gray-500 mt-2">From 52w High: {Number.isFinite(stock.dist52wHighPct) ? fmtPct(stock.dist52wHighPct) : "—"}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">6-month vs {data.benchmark}</div>
            <div className={`text-xl font-semibold ${chip(stock.m6VsBenchmarkPct)}`}>{fmtPct(stock.m6VsBenchmarkPct)}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">12-month vs {data.benchmark}</div>
            <div className={`text-xl font-semibold ${chip(stock.m12VsBenchmarkPct)}`}>{fmtPct(stock.m12VsBenchmarkPct)}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">News sentiment</div>
            <div className={`text-xl font-semibold ${chip(stock.newsSent * 100)}`}>{stock.newsSent.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">−1..+1 (calculated from last 30 days of headlines)</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Reddit sentiment</div>
            <div className={`text-xl font-semibold ${chip(stock.redditSent * 100)}`}>{stock.redditSent.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">−1..+1 (Finnhub social or Reddit search fallback)</div>
          </div>
        </div>

        <p className="text-xs text-gray-500">Prices & indicators are live.</p>
      </div>
    </main>
  );
}
