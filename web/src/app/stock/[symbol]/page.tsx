// src/app/stock/[symbol]/page.tsx
import Link from "next/link";
import { getAnyStockDetail, type StockDetail } from "@/lib/data";
import PriceChart from "@/components/PriceChart";

function fmtPct(x: number, d = 2) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}
function fmtMoney(x: number, d = 2) {
  return x.toFixed(d);
}

export default async function StockPage({ params }: { params: { symbol: string } }) {
  const key = decodeURIComponent(params.symbol);
  const stock: StockDetail = await getAnyStockDetail(key);

  if (!stock) {
    return (
      <main className="min-h-screen px-6 py-10 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-block text-sm text-blue-600 hover:underline">
            ← Back to dashboard
          </Link>
          <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold">Not found</h1>
            <p className="mt-2 text-gray-600">
              We couldn’t load details for <span className="font-mono">{key}</span>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const pct = stock.price !== 0 ? (stock.change / stock.price) * 100 : 0;
  const rsiLatest = Number.isFinite(stock.rsi14.at(-1)!) ? (stock.rsi14.at(-1) as number) : NaN;

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="inline-block text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-semibold">
              {stock.name} <span className="text-gray-500 font-mono">({stock.symbol})</span>
            </h1>
            <div className="text-right">
              <div className="text-2xl font-semibold">{fmtMoney(stock.price)}</div>
              <div className={"text-sm " + (pct >= 0 ? "text-green-600" : "text-red-600")}>
                {stock.change >= 0 ? "+" : ""}
                {fmtMoney(stock.change)} ({fmtPct(pct)})
              </div>
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-600">{stock.description}</div>

          <div className="mt-6">
            <PriceChart data={stock.series} />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs uppercase text-gray-500">RSI(14)</div>
              <div className="mt-1 text-xl font-semibold">
                {Number.isFinite(rsiLatest) ? rsiLatest.toFixed(1) : "—"}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs uppercase text-gray-500">% from 52w High</div>
              <div className={"mt-1 text-xl font-semibold " + (stock.distFromHighPct < 0 ? "text-red-600" : "text-gray-900")}>
                {fmtPct(stock.distFromHighPct, 1)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs uppercase text-gray-500">Series length</div>
              <div className="mt-1 text-xl font-semibold">{stock.series.length} days</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
