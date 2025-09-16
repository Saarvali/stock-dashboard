"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StockMeta = { symbol: string; name: string };

type Props = {
  items: StockMeta[]; // local list from your dashboard data
  placeholder?: string;
  className?: string;
};

export default function SearchBar({ items, placeholder = "Search stocks…", className = "" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [remote, setRemote] = useState<StockMeta[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Merge local (watchlist) and remote (Alpha Vantage) results, dedup by symbol
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const localRanked = rankLocal(items, query).slice(0, 6);
    const merged: Record<string, StockMeta> = {};
    for (const it of localRanked) merged[it.symbol] = it;
    for (const it of remote) {
      const sym = it.symbol.toUpperCase();
      if (!merged[sym]) merged[sym] = { symbol: sym, name: it.name || sym };
    }
    return Object.values(merged).slice(0, 8);
  }, [q, items, remote]);

  // Fetch remote suggestions with debounce
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setRemote([]);
      return;
    }

    // Debounce 250ms
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      // cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(query)}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { symbol: string; name: string }[];
        setRemote(data || []);
      } catch {
        setRemote([]);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [q]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  function go(symbol: string) {
    const slug = encodeURIComponent(symbol.toUpperCase());
    router.push(`/stock/${slug}`);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length) {
        go(results[Math.max(0, Math.min(highlight, results.length - 1))].symbol);
      } else {
        const text = q.trim();
        if (!text) return;
        // Try immediate ticker navigation
        go(text.toUpperCase());
        // Also resolve by name in background; navigate again if we find a better match
        fetch(`/api/symbols?q=${encodeURIComponent(text)}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : [])
          .then((arr: { symbol: string; name: string }[]) => {
            const best = arr?.[0]?.symbol;
            if (best) go(best);
          })
          .catch(() => {});
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="stock-search-listbox"
      />

      {open && results.length > 0 && (
        <ul
          id="stock-search-listbox"
          role="listbox"
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {results.map((r, idx) => (
            <li
              key={`${r.symbol}-${idx}`}
              role="option"
              aria-selected={idx === highlight}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
              onClick={() => go(r.symbol)}
              className={`cursor-pointer px-4 py-2 ${
                idx === highlight ? "bg-gray-100" : "bg-white"
              } flex items-center justify-between`}
            >
              <span className="font-medium">{r.symbol}</span>
              <span className="ml-3 text-sm text-gray-600 truncate">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -------- Local ranking helpers --------
function rankLocal(items: StockMeta[], q: string) {
  const s = q.toLowerCase();
  return items
    .map((it) => ({ it, score: localScore(it, s) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}

function localScore(it: StockMeta, q: string) {
  const sym = it.symbol.toLowerCase();
  const name = it.name.toLowerCase();
  if (sym.startsWith(q)) return 100 - Math.min(sym.length - q.length, 50);
  if (sym.includes(q)) return 60 - (sym.indexOf(q) || 0);
  if (name.includes(q)) return 30 - (name.indexOf(q) || 0);
  return 0;
}
