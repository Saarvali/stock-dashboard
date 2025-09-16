import { NextResponse } from "next/server";
import { searchSymbols, type SymbolSearchResult } from "@/lib/alpha";

export const dynamic = "force-dynamic";

type Compact = { symbol: string; name: string; note?: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) return NextResponse.json<Compact[]>([]);

  try {
    const results: SymbolSearchResult[] = await searchSymbols(q);

    // Neutral ranking: symbol startsWith > contains > name contains; shorter symbols first
    const s = q.toLowerCase();
    const score = (r: SymbolSearchResult) => {
      const sym = r.symbol.toLowerCase();
      const name = (r.name || "").toLowerCase();
      if (sym.startsWith(s)) return 100 - Math.min(sym.length - s.length, 50);
      if (sym.includes(s)) return 60 - (sym.indexOf(s) || 0);
      if (name.includes(s)) return 30 - (name.indexOf(s) || 0);
      return 0;
    };

    const sorted = results
      .map((r) => ({ r, k: score(r) }))
      .filter((x) => x.k > 0)
      .sort((a, b) => (b.k - a.k) || (a.r.symbol.length - b.r.symbol.length))
      .map((x) => x.r);

    const compact: Compact[] = sorted.slice(0, 8).map((r) => ({
      symbol: r.symbol,
      name: r.name,
      note: r.region && r.currency ? `${r.region} • ${r.currency}` : undefined,
    }));

    return NextResponse.json(compact, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json<Compact[]>([]);
  }
}
