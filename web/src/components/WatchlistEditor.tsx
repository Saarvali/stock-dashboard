"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function WatchlistEditor() {
  const router = useRouter();
  const sp = useSearchParams();
  const [input, setInput] = useState("");
  const [list, setList] = useState<string[]>([]);

  useEffect(() => {
    const fromUrl = (sp.get("wl") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (fromUrl.length) {
      setList(fromUrl);
      localStorage.setItem("watchlist", JSON.stringify(fromUrl));
    } else {
      const saved = localStorage.getItem("watchlist");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as string[];
          if (Array.isArray(parsed) && parsed.length) setList(parsed);
        } catch {}
      }
    }
  }, [sp]);

  function apply(newList: string[]) {
    setList(newList);
    localStorage.setItem("watchlist", JSON.stringify(newList));
    const wl = newList.join(",");
    const url = wl ? `/?wl=${encodeURIComponent(wl)}` : "/";
    router.replace(url);
  }

  function add() {
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    if (list.includes(sym)) return setInput("");
    apply([...list, sym]);
    setInput("");
  }

  function remove(sym: string) {
    apply(list.filter((s) => s !== sym));
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add symbol (e.g. VOLV-B.ST)"
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
        <button
          onClick={add}
          className="rounded-lg bg-blue-600 text-white px-3 py-2"
          title="Add symbol to watchlist"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((s) => (
          <span key={s} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
            {s}
            <button onClick={() => remove(s)} className="text-gray-500 hover:text-red-600" title="Remove">
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
