import { NextResponse } from "next/server";
import { searchSymbols, type SymbolSearchResult } from "@/lib/alpha";

export const dynamic = "force-dynamic";

type Compact = { symbol: string; name: string; note?: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json<Compact[]>([]);
  }

  try {
    const results: SymbolSearchResult[] = await searchSymbols(q);

    // Prefer US, then no-dot symbols, then shorter
    const sorted = [...results].sort((a: SymbolSearchResult, b: SymbolSearchResult) => {
      const au = (a.region ?? "").includes("United States") ? 0 : 1;
      const bu = (b.region ?? "").includes("United States") ? 0 : 1;
      if (au !== bu) return au - bu;
      const ad = a.symbol.includes(".") ? 1 : 0;
      const bd = b.symbol.includes(".") ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return a.symbol.length - b.symbol.length;
    });

    const compact: Compact[] = sorted.slice(0, 8).map((r) => ({
      symbol: r.symbol,
      name: r.name,
      note: r.region && r.currency ? `${r.region} • ${r.currency}` : undefined,
    }));

    return NextResponse.json<Compact[]>(compact, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json<Compact[]>([]);
  }
}
