// src/app/api/symbols/route.ts
import { NextRequest } from "next/server";
import { finnhubSearchSymbol } from "@/lib/finnhub";
import { searchSymbols as alphaSearchSymbols } from "@/lib/alpha";

export const dynamic = "force-dynamic";

// Simple hit type for merging results
type SymbolHit = { symbol: string; name: string };
type AlphaHit = { symbol: string; name: string };

// Deduplicate and merge results
function dedupeMerge(
  a: SymbolHit[],
  b: SymbolHit[],
  max: number
): SymbolHit[] {
  const seen = new Set<string>();
  const merged: SymbolHit[] = [];
  for (const list of [a, b]) {
    for (const hit of list) {
      if (!seen.has(hit.symbol)) {
        seen.add(hit.symbol);
        merged.push(hit);
        if (merged.length >= max) return merged;
      }
    }
  }
  return merged;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "missing q" }, { status: 400 });
  }

  try {
    const [fh, av] = await Promise.all([
      finnhubSearchSymbol(q).catch(() => [] as SymbolHit[]),
      alphaSearchSymbols(q).catch(() => [] as AlphaHit[]),
    ]);

    const merged = dedupeMerge(fh, av as SymbolHit[], 12);
    return Response.json({ symbols: merged });
  } catch (err) {
    console.error("symbol search error", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
