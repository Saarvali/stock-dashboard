// src/app/stock/[symbol]/page.tsx
import Link from "next/link";
import { getAnyStockDetail, type StockDetail } from "@/lib/data";
import PriceChart from "@/components/PriceChart";

function fmtPct(x: number, d = 2) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}

export default async function StockDetailPage(props: { params: Promise<{ symbol: string }> }) {
  const params = await props.params;
  const key = decodeURIComponent(params.symbol);

  const detail: StockDetail = await getAnyStockDetail(key);
  const stock = detail.row;

  if (!stock) {
    return (
      <main className="min-h-screen px-6 py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl space-y-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back</Link>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold">Not found</h1>
            <p className="text-gray-600 mt-2">Couldn’t load “{key}”.</p>
          </div>
        </div>
      </main>
    );
  }

  const pct = stock.price !== 0 ? (stock.change / stock.price) * 100 : 0;
  const rsiLatest = Number.isFinite(stock.rsi14?.at(-1) ?? NaN) ? (stock.rsi14!.at(-1)! as number) : NaN;

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back</Link>

        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h1 className="text-2xl font-semibold">
            {stock.name} <span className="text-gray-500">({stock.symbol})</span>
          </h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-semibold">{stock.price.toFixed(2)}</div>
              <div className={pct >= 0 ? "text-green-600" : "text-red-600"}>
                {fmtPct(pct)}
              </div>
            </div>

            <div className="space-y-1">
              <div>RSI(14): <strong>{Number.isFinite(rsiLatest) ? rsiLatest.toFixed(1) : "—"}</strong></div>
              <div>Dist from High: <strong>{stock.distFromHighPct.toFixed(1)}%</strong></div>
              <div>News Sentiment: <strong>{stock.newsSent.toFixed(1)}</strong></div>
              <div>Reddit Sentiment: <strong>{stock.redditSent.toFixed(1)}</strong></div>
            </div>
          </div>
        </div>

        {detail.chart?.t?.length ? (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <PriceChart series={detail.chart} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
