// src/app/stock/[symbol]/page.tsx
import Link from "next/link";
import PriceChart from "@/components/PriceChart";
import { getAnyStockDetail, type StockDetail } from "@/lib/data";

// If you already have a function that returns price history points,
// import it here. If not, this stub returns an empty array so the page still builds.
type Point = { date: string; stock: number; spy?: number | null; omx?: number | null; volume?: number | null };

// ⬇️ Try to import your real history fetcher from lib/data.
// If you don't have one yet, keep the fallback implementation below.
// import { getPriceHistory } from "@/lib/data";

async function getPriceHistory(_symbol: string): Promise<Point[]> {
  // Fallback so the page compiles; replace with your real implementation.
  return [];
}

function fmtPct(x: number, d = 2) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}

function fmtMoney(x: number, d = 2) {
  return x.toFixed(d);
}

export default async function StockPage({ params }: { params: { symbol: string } }) {
  const key = decodeURIComponent(params.symbol);
  const stock: StockDetail | null = await getAnyStockDetail(key);

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

  // 🔹 Load price history to render the chart (empty = chart hidden)
  const history = await getPriceHistory(stock.symbol);

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="max-w-4xl mx-auto">
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

          <p className="mt-4 text-gray-700 leading-relaxed">{stock.description}</p>
        </section>

        {/* 🔹 Price history chart (shows only if you return data) */}
        {history.length > 0 && (
          <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">Price history</h2>
            <PriceChart data={history} />
          </section>
        )}
      </div>
    </main>
  );
}
