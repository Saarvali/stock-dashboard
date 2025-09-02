import fs from "fs/promises";
import path from "path";
import Link from "next/link";

type StockRow = {
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
};

type Data = {
  asOf: string;
  benchmark: string;
  watchlist: string[];
  stocks: Record<string, StockRow>;
};

function fmtPct(x: number, d = 1) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}
function pill(ok: boolean) {
  return ok ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50";
}
function chip(p: number) {
  return p > 0.1
    ? "text-green-600 bg-green-50"
    : p < -0.1
    ? "text-red-600 bg-red-50"
    : "text-gray-600 bg-gray-50";
}

async function loadData(): Promise<Data> {
  const filePath = path.join(process.cwd(), "public", "mock-data.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export default async function Home() {
  const data = await loadData();

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-3xl font-bold">Stock Dashboard (Mock)</h1>
        <p className="text-gray-600">
          Benchmark: <span className="font-medium">{data.benchmark}</span> • As
          of {data.asOf}
        </p>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 font-semibold text-left text-gray-700">
                  #
                </th>
                <th className="px-3 py-3 font-semibold text-left text-gray-700">
                  Ticker
                </th>
                <th className="px-3 py-3 font-semibold text-gray-700">Price</th>
                <th className="px-3 py-3 font-semibold text-gray-700">Δ Day</th>
                <th className="px-3 py-3 font-semibold text-gray-700">
                  {">"} 50D
                </th>
                <th className="px-3 py-3 font-semibold text-gray-700">
                  {">"} 200D
                </th>
                <th className="px-3 py-3 font-semibold text-gray-700">RSI(14)</th>
                <th className="px-3 py-3 font-semibold text-gray-700">
                  52w from High
                </th>
                <th className="px-3 py-3 font-semibold text-gray-700">
                  6m vs {data.benchmark}
                </th>
                <th className="px-3 py-3 font-semibold text-gray-700">
                  12m vs {data.benchmark}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.watchlist.map((sym, i) => {
                const r = data.stocks[sym];
                const above50 = r.last > r.sma50;
                const above200 = r.last > r.sma200;

                return (
                  <tr
                    key={sym}
                    className={i % 2 ? "bg-gray-50" : ""}
                  >
                    <td className="px-3 py-3 text-gray-500">{i + 1}</td>

                    {/* ✅ Ticker cell with link */}
                    <td className="px-3 py-3 font-medium">
                      <Link
                        href={`/stock/${encodeURIComponent(r.symbol)}`}
                        className="underline hover:no-underline"
                      >
                        {r.symbol}
                      </Link>
                    </td>

                    <td className="px-3 py-3">{r.last.toFixed(2)}</td>
                    <td
                      className={`px-3 py-3 font-medium ${chip(r.changePct)}`}
                    >
                      {fmtPct(r.changePct)}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded ${pill(above50)}`}
                      >
                        {above50 ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded ${pill(above200)}`}
                      >
                        {above200 ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-3">{r.rsi14.toFixed(1)}</td>
                    <td className="px-3 py-3">{fmtPct(r.dist52wHighPct)}</td>
                    <td className={`px-3 py-3 ${chip(r.m6VsBenchmarkPct)}`}>
                      {fmtPct(r.m6VsBenchmarkPct)}
                    </td>
                    <td className={`px-3 py-3 ${chip(r.m12VsBenchmarkPct)}`}>
                      {fmtPct(r.m12VsBenchmarkPct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500">
          Edit <code>/public/mock-data.json</code> to change your list.
        </p>
      </div>
    </main>
  );
}
