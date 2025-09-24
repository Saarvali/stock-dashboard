// src/app/api/symbols/route.ts
import { NextRequest } from "next/server";
import { finnhubSearchSymbol, type SymbolHit } from "@/lib/finnhub";
import { searchSymbols as alphaSearchSymbols } from "@/lib/alpha";

export const dynamic = "force-dynamic";

type AlphaHit = {
  symbol: string;
  name: string;
  exchange?: string;
  currency?: string;
};

function dedupeMerge(a: SymbolHit[], b: SymbolHit[], max = 12): SymbolHit[] {
  const map = new Map<string, SymbolHit>();
  const upsert = (x: SymbolHit) => {
    const k = x.symbol.toUpperCase();
    if (!map.has(k)) map.set(k, x);
  };
  a.forEach(upsert);
  b.forEach(upsert);
  return Array.from(map.values()).slice(0, max);
}

/**
 * GET /api/symbols?q=TES
 * Returns: { items: Array<{symbol,name,exchange?,currency?}> }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return Response.json({ items: [] }, { status: 200 });
  }

  try {
    const [fh, av] = await Promise.all([
      finnhubSearchSymbol(q, 10).catch(() => [] as SymbolHit[]),
      alphaSearchSymbols(q, 10).catch(() => [] as AlphaHit[]),
    ]);

    const merged = dedupeMerge(fh, av as SymbolHit[], 12);
    return Response.json({ items: merged }, { status: 200 });
  } catch {
    return Response.json({ items: [] }, { status: 200 });
  }
}
