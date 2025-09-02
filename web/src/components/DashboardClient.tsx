"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type StockRow = {
  symbol: string; name: string; last: number; changePct: number; rsi14: number;
  sma50: number; sma200: number; dist52wHighPct: number;
  m6VsBenchmarkPct: number; m12VsBenchmarkPct: number;
  newsSent: number; redditSent: number;
};
type Data = {
  asOf: string;
  benchmark: string;
  watchlist: string[];
  portfolios?: Record<string, string[]>;
  stocks: Record<string, StockRow>;
};

function fmtPct(x: number, d = 1) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}
function chip(p: number) {
  return p > 0.1 ? "text-green-600 bg-green-50"
       : p < -0.1 ? "text-red-600 bg-red-50"
       : "text-gray-600 bg-gray-50";
}
function pill(ok: boolean) { return ok ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"; }

export default function DashboardClient({ data }: { data: Data }) {
  // portfolio state (persist last selection)
  const portfolioNames = Object.keys(data.portfolios ?? { Default: data.watchlist });
  const [portfolio, setPortfolio] = useState<string>(() => {
    if (typeof window === "undefined") return portfolioNames[0] ?? "Default";
    return localStorage.getItem("portfolio:selected") ?? (portfolioNames[0] ?? "Default");
  });

  useEffect(() => {
    localStorage.setItem("portfolio:selected", portfolio);
  }, [portfolio]);

  // build current list of tickers
  const currentTickers = useMemo(() => {
    const lists = data.portfolios ?? { Default: data.watchlist };
    const picked = lists[portfolio] ?? data.watchlist;
    return picked.filter((t) => !!data.stocks[t]);
  }, [portfolio, data]);

  // search filter (ticker or name)
  const [q, setQ] = useState("");
  const filteredTickers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return currentTickers;
    return currentTickers.filter((t) => {
      const row = data.stocks[t];
      return t.toLowerCase().includes(s) || row?.name?.toLowerCase().includes(s);
    });
  }, [q, currentTickers, data.stocks]);

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Portfolio</label>
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
          >
            {portfolioNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <input
          placeholder="Search ticker or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-80 bg-white"
          aria-label="Search stocks"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow mt-4">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">#</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Ticker</th>
              <th className="px-3 py-3 font-semibold text-gray-700">Price</th>
              <th className="px-3 py-3 font-semibold text-gray-700">Δ Day</th>
              <th className="px-3 py-3 font-semibold text-gray-700">{">"} 50D</th>
              <th className="px-3 py-3 font-semibold text-gray-700">{">"} 200D</th>
              <th className="px-3 py-3 font-semibold text-gray-700">RSI(14)</th>
              <th className="px-3 py-3 font-semibold text-gray-700">52w from High</th>
              <th className="px-3 py-3 font-semibold text-gray-700">6m vs {data.benchmark}</th>
              <th className="px-3 py-3 font-semibold text-gray-700">12m vs {data.benchmark}</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickers.map((sym, i) => {
              const r = data.stocks[sym];
              const above50 = r.last > r.sma50;
              const above200 = r.last > r.sma200;
              return (
                <tr key={sym} className={i % 2 ? "bg-gray-50" : ""}>
                  <td className="px-3 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">
                    <Link href={`/stock/${encodeURIComponent(r.symbol)}`} className="underline hover:no-underline">
                      {r.symbol}
                    </Link>
                    <div className="text-xs text-gray-500">{r.name}</div>
                  </td>
                  <td className="px-3 py-3">{r.last.toFixed(2)}</td>
                  <td className={`px-3 py-3 font-medium ${chip(r.changePct)}`}>{fmtPct(r.changePct, 2)}</td>
                  <td><span className={`px-2 py-1 rounded ${pill(above50)}`}>{above50 ? "Yes" : "No"}</span></td>
                  <td><span className={`px-2 py-1 rounded ${pill(above200)}`}>{above200 ? "Yes" : "No"}</span></td>
                  <td className="px-3 py-3">{r.rsi14.toFixed(1)}</td>
                  <td className="px-3 py-3">{fmtPct(r.dist52wHighPct, 1)}</td>
                  <td className={`px-3 py-3 ${chip(r.m6VsBenchmarkPct)}`}>{fmtPct(r.m6VsBenchmarkPct, 1)}</td>
                  <td className={`px-3 py-3 ${chip(r.m12VsBenchmarkPct)}`}>{fmtPct(r.m12VsBenchmarkPct, 1)}</td>
                </tr>
              );
            })}
            {filteredTickers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-500">
                  No matches. Try a different search or portfolio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
