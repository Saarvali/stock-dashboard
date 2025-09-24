// src/components/DashboardClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StockRow } from "@/lib/data";

function fmtPct(x: number, d = 2) {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(d)}%`;
}

function chip(p: number) {
  return p > 0.1 ? "text-green-600 bg-green-50"
       : p < -0.1 ? "text-red-600 bg-red-50"
       : "text-gray-600 bg-gray-50";
}

export default function DashboardClient({
  rows,
  initialWatchlist,
}: {
  rows: StockRow[];
  initialWatchlist: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [query, setQuery] = useState("");
  const [addTicker, setAddTicker] = useState("");

  // current wl from URL or fallback to initial (server-selected) rows
  const currentWlFromUrl = useMemo(() => {
    const wlParam = (sp.get("wl") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    return wlParam.length
      ? wlParam
      : (initialWatchlist.length ? initialWatchlist : rows.map((r) => r.symbol.toUpperCase()));
  }, [sp, initialWatchlist, rows]);

  // Persist last non-empty WL in localStorage as a convenience
  useEffect(() => {
    try {
      if (currentWlFromUrl.length) {
        localStorage.setItem("watchlist", JSON.stringify(currentWlFromUrl));
      }
    } catch {}
  }, [currentWlFromUrl]);

  // Filtered visible rows (client-side)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = rows.filter((r) =>
      currentWlFromUrl.includes(r.symbol.toUpperCase())
    );
    if (!q) return visible;
    return visible.filter(
      (r) =>
        r.symbol.toLowerCase().includes(q) ||
        (r.name?.toLowerCase?.().includes(q) ?? false)
    );
  }, [rows, currentWlFromUrl, query]);

  // Helpers to sync ?wl=... and trigger server refresh
  function commitWatchlist(next: string[]) {
    const dedup = Array.from(new Set(next.map((s) => s.toUpperCase())));

    try {
      localStorage.setItem("watchlist", JSON.stringify(dedup));
    } catch {}

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
    const next = currentWlFromUrl.filter(
      (x) => x.toUpperCase() !== sym.toUpperCase()
    );
    commitWatchlist(next);
  }

  return (
    <div className="space-y-4">
      {/* Top bar: filter + add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter table…"
          className="w-64 rounded-xl border border-gray-300 bg-white px-3 py-2"
        />
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
              <th className="px-3 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.symbol} className={i % 2 ? "bg-gray-50" : ""}>
                <td className="px-3 py-3 text-gray-500">{i + 1}</td>
                <td className="px-3 py-3 font-medium">
                  <Link
                    href={`/stock/${encodeURIComponent(r.symbol)}`}
                    className="underline hover:no-underline"
                  >
                    {r.symbol}
                  </Link>
                  <div className="text-xs text-gray-500">{r.name}</div>
                </td>
                <td className="px-3 py-3">{r.price.toFixed(2)}</td>
                <td className={`px-3 py-3 font-medium ${chip(r.changePct)}`}>
                  {fmtPct(r.changePct, 2)}
                </td>
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
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  No matches. Try a different search or add a ticker.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Small hint about how the URL sync works */}
      <p className="text-xs text-gray-500">
        Tip: your watchlist is synced to the URL parameter <code>?wl=</code> and saved to{" "}
        <code>localStorage</code> on this device.
      </p>
    </div>
  );
}
