import { searchSymbols } from "@/lib/alpha";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return Response.json([]);

  try {
    const results = await searchSymbols(q);

    // Prefer US, then no-suffix symbols (no '.'), then shorter symbols
    const sorted = results.sort((a: any, b: any) => {
      const au = (a.region || "").includes("United States") ? 0 : 1;
      const bu = (b.region || "").includes("United States") ? 0 : 1;
      if (au !== bu) return au - bu;
      const ad = a.symbol.includes(".") ? 1 : 0;
      const bd = b.symbol.includes(".") ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return a.symbol.length - b.symbol.length;
    });

    const compact = sorted.slice(0, 8).map((r: any) => ({
      symbol: r.symbol,
      name: r.name,
      note: r.region && r.currency ? `${r.region} • ${r.currency}` : undefined,
    }));
    return Response.json(compact, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json([]);
  }
}
