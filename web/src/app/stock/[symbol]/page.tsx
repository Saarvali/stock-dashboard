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

  // Fetch detail using the new return shape (single object)
  const detail: StockDetail = await getAnyStockDetail(key);

  if (!detail) {
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
            <h1 className="text-2xl font-semibold">{detail.symbol}</h1>
            <p className="text-gray-500">{detail.name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{detail.price.toFixed(2)}</div>
            <div
              className={
                detail.changePct > 0
                  ? "text-green-600"
                  : detail.changePct < 0
                  ? "text-red-600"
                  : "text-gray-600"
              }
            >
              {fmtPct(detail.changePct)}
            </div>
          </div>
        </header>

        {/* Quick stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">News sentiment</div>
            <div className="text-lg font-medium">
              {detail.newsSent.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Reddit sentiment</div>
            <div className="text-lg font-medium">
              {detail.redditSent.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Dist. from 52w High</div>
            <div className="text-lg font-medium">
              {typeof detail.indicators?.distFromHighPct === "number"
                ? fmtPct(detail.indicators.distFromHighPct)
                : "—"}
            </div>
          </div>
        </section>

        {/* Simple history table (kept minimal to avoid prop mismatches) */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
            Recent closes
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Close</th>
                </tr>
              </thead>
              <tbody>
                {detail.history.slice(0, 30).map((p) => (
                  <tr key={p.t}>
                    <td className="px-3 py-2">
                      {new Date(p.t).toISOString().slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">{p.c.toFixed(2)}</td>
                  </tr>
                ))}
                {detail.history.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-gray-500">
                      No price history.
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
