// src/app/api/symbols/route.ts
import { NextRequest } from "next/server";
import { finnhubSearchSymbol } from "@/lib/finnhub";
import { searchSymbols as alphaSearchSymbols } from "@/lib/alpha";

export const dynamic = "force-dynamic";

type Out = { symbol: string; name: string };

type FinnhubItem = { symbol?: unknown; description?: unknown };
type AlphaItem = { symbol?: unknown; name?: unknown };

function isString(v: unknown): v is string {
  return typeof v === "string";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) {
      return new Response(JSON.stringify([] satisfies Out[]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const [fh, av] = await Promise.allSettled([
      finnhubSearchSymbol(q),
      alphaSearchSymbols(q),
    ]);

    const items: Out[] = [];

    if (fh.status === "fulfilled" && Array.isArray(fh.value)) {
      for (const it of fh.value as FinnhubItem[]) {
        const rawSym = isString(it.symbol) ? it.symbol : "";
        if (!rawSym) continue;
        const s = rawSym.toUpperCase();
        const n = isString(it.description) && it.description ? it.description : s;
        items.push({ symbol: s, name: n });
      }
    }

    if (av.status === "fulfilled" && Array.isArray(av.value)) {
      for (const it of av.value as AlphaItem[]) {
        const rawSym = isString(it.symbol) ? it.symbol : "";
        if (!rawSym) continue;
        const s = rawSym.toUpperCase();
        const n = isString(it.name) && it.name ? it.name : s;
        items.push({ symbol: s, name: n });
      }
    }

    // Dedupe by symbol, keep first occurrence
    const seen = new Set<string>();
    const merged: Out[] = [];
    for (const x of items) {
      if (seen.has(x.symbol)) continue;
      seen.add(x.symbol);
      merged.push(x);
    }

    const out = merged.slice(0, 20);

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=600",
      },
    });
  } catch {
    return new Response(JSON.stringify([] satisfies Out[]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
