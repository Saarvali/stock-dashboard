import Link from "next/link";
import { getAnyStockDetail, type StockDetail } from "@/lib/data";

function fmtPct(x: number, d = 2) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const key = decodeURIComponent(symbol);

  // New return shape: { data, row?, chart? }
  const detail: StockDetail = await getAnyStockDetail(key);
  const stock = detail.row;

  if (!stock) {
    return (
      <main className="min-h-screen px-6 py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link href="/" className="text-sm underline">
            ← Back
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-gray-600">No data for {key}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="text-sm underline">
          ← Back
        </Link>

        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{stock.symbol}</h1>
            <p className="text-gray-500">{stock.name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{stock.last.toFixed(2)}</div>
            <div
              className={
                stock.changePct > 0
                  ? "text-green-600"
                  : stock.changePct < 0
                  ? "text-red-600"
                  : "text-gray-600"
              }
            >
              {fmtPct(stock.changePct)}
            </div>
          </div>
        </header>

        {/* Quick stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">News sentiment</div>
            <div className="text-lg font-medium">{stock.newsSent.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Reddit sentiment</div>
            <div className="text-lg font-medium">{stock.redditSent.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Dist. from 52w High</div>
            <div className="text-lg font-medium">
              {Number.isFinite(stock.dist52wHighPct) ? fmtPct(stock.dist52wHighPct) : "—"}
            </div>
          </div>
        </section>

        {/* Simple history summary (we return normalized chart, so show a small table) */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
            Indexed history (100 = start of period)
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Stock (idx)</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">SPY (idx)</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">OMXS30 (idx)</th>
                </tr>
              </thead>
              <tbody>
                {(detail.chart?.data ?? []).slice(-60).map((p) => (
                  <tr key={p.date}>
                    <td className="px-3 py-2">{p.date}</td>
                    <td className="px-3 py-2">{(p.stock ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{p.spy != null ? p.spy.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2">{p.omx != null ? p.omx.toFixed(2) : "—"}</td>
                  </tr>
                ))}
                {!(detail.chart?.data?.length ?? 0) && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-gray-500">
                      No chart data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
