// src/components/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
  const router = useRouter();
  const sp = useSearchParams();

  // portfolio state (persist last selection)
  const portfolioNames = Object.keys(data.portfolios ?? { Default: data.watchlist });
  const [portfolio, setPortfolio] = useState<string>(() => {
    if (typeof window === "undefined") return portfolioNames[0] ?? "Default";
    return localStorage.getItem("portfolio") || portfolioNames[0] || "Default";
  });
  useEffect(() => { localStorage.setItem("portfolio", portfolio); }, [portfolio]);

  // client-side search box for filtering visible rows
  const [query, setQuery] = useState("");

  // Add stock input
  const [addTicker, setAddTicker] = useState("");

  // Read current wl from URL or fallback to initial
  const currentWlFromUrl = useMemo(() => {
    const wlParam = (sp.get("wl") || "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    return wlParam.length ? wlParam : data.watchlist.map(s => s.toUpperCase());
  }, [sp, data.watchlist]);

  // Compute the active symbols (by selected portfolio or URL watchlist)
  const activeSymbols = useMemo(() => {
    const fromPortfolio = (data.portfolios?.[portfolio] ?? currentWlFromUrl) || [];
    return fromPortfolio.map((s) => s.toUpperCase());
  }, [portfolio, data.portfolios, currentWlFromUrl]);

  // Filter by query
  const filteredTickers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = activeSymbols.filter((sym) => Boolean(data.stocks[sym]));
    if (!q) return arr;
    return arr.filter((s) => {
      const r = data.stocks[s];
      return (
        s.toLowerCase().includes(q) ||
        (r?.name?.toLowerCase?.().includes(q) ?? false)
      );
    });
  }, [query, activeSymbols, data.stocks]);

  // Helpers to sync wl with URL + localStorage and trigger server re-render
  function commitWatchlist(next: string[]) {
    const dedup = Array.from(new Set(next.map((s) => s.toUpperCase())));

    // Persist locally (so the chip editor and page stay in sync)
    try { localStorage.setItem("watchlist", JSON.stringify(dedup)); } catch {}

    // Push to URL -> causes server components to refetch with new wl
    const params = new URLSearchParams(Array.from(sp.entries()));
    if (dedup.length) params.set("wl", dedup.join(","));
    else params.delete("wl");

    router.push(`/?${params.toString()}`);
  }

  function addSymbol() {
    const s = addTicker.trim().toUpperCase();
    if (!s) return;
    commitWatchlist([...currentWlFromUrl, s]);
    setAddTicker("");
  }

  function deleteSymbol(sym: string) {
    const next = currentWlFromUrl.filter((x) => x.toUpperCase() !== sym.toUpperCase());
    commitWatchlist(next);
  }

  return (
    <>
      {/* Top bar: filters + add */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <select
            className="rounded-xl border border-gray-300 bg-white px-3 py-2"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
          >
            {portfolioNames.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter table…"
            className="w-48 rounded-xl border border-gray-300 bg-white px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            value={addTicker}
            onChange={(e) => setAddTicker(e.target.value)}
            placeholder="Add ticker (e.g. TSLA)"
            className="w-48 rounded-xl border border-gray-300 bg-white px-3 py-2"
          />
          <button
            onClick={addSymbol}
            className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
            title="Add to watchlist"
          >
            Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
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
              <th className="px-3 py-3 font-semibold text-gray-700">Actions</th>
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
                  <td className="px-3 py-3">{Number.isFinite(r.rsi14) ? r.rsi14.toFixed(1) : "—"}</td>
                  <td className={`px-3 py-3 ${chip(r.dist52wHighPct)}`}>{Number.isFinite(r.dist52wHighPct) ? fmtPct(r.dist52wHighPct) : "—"}</td>
                  <td className={`px-3 py-3 ${chip(r.m6VsBenchmarkPct)}`}>{fmtPct(r.m6VsBenchmarkPct)}</td>
                  <td className={`px-3 py-3 ${chip(r.m12VsBenchmarkPct)}`}>{fmtPct(r.m12VsBenchmarkPct)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => deleteSymbol(r.symbol)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
                      title={`Remove ${r.symbol}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredTickers.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-gray-500">
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
