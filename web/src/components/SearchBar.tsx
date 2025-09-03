"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StockMeta = { symbol: string; name: string };

type Props = {
  items: StockMeta[]; // [{ symbol: "AAPL", name: "Apple Inc." }, ...]
  placeholder?: string;
  className?: string;
};

export default function SearchBar({ items, placeholder = "Search stocks…", className = "" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Basic filter: match by symbol prefix or name substring (case-insensitive)
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const max = 8;
    const ranked = items
      .map((it) => ({
        it,
        score: score(it, query),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map((x) => x.it);
    return ranked;
  }, [q, items]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  // Navigate helper
  function go(symbol: string) {
    const slug = encodeURIComponent(symbol);
    router.push(`/stock/${slug}`);
    setOpen(false);
  }

  // Keyboard controls for list
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
      // Enter with results → go to highlighted; else try exact symbol
      if (results.length) {
        go(results[Math.max(0, Math.min(highlight, results.length - 1))].symbol);
      } else {
        const exact = items.find((it) => it.symbol.toLowerCase() === q.trim().toLowerCase());
        if (exact) go(exact.symbol);
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
              key={r.symbol}
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
              <span className="ml-3 text-sm text-gray-600">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Super lightweight scoring:
 *  - exact symbol starts-with gets higher score
 *  - symbol contains gets medium
 *  - name contains gets low
 */
function score(it: { symbol: string; name: string }, q: string) {
  const sym = it.symbol.toLowerCase();
  const name = it.name.toLowerCase();
  if (sym.startsWith(q)) return 100 - (sym.length - q.length); // prefer short exact prefix
  if (sym.includes(q)) return 60 - (sym.indexOf(q) || 0);
  if (name.includes(q)) return 30 - (name.indexOf(q) || 0);
  return 0;
}
