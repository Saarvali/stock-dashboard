// src/app/api/symbols/route.ts
import { NextRequest } from "next/server";
import { finnhubSearchSymbol } from "@/lib/finnhub";
import { searchSymbols as alphaSearchSymbols } from "@/lib/alpha";

export const dynamic = "force-dynamic";

type Out = { symbol: string; name: string };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Fetch both, tolerate failures individually
    const [fh, av] = await Promise.allSettled([
      finnhubSearchSymbol(q),
      alphaSearchSymbols(q),
    ]);

    const items: Out[] = [];

    if (fh.status === "fulfilled" && Array.isArray(fh.value)) {
      for (const it of fh.value) {
        const s = String((it as any).symbol || "").toUpperCase();
        const n = String((it as any).description || s);
        if (s) items.push({ symbol: s, name: n });
      }
    }

    if (av.status === "fulfilled" && Array.isArray(av.value)) {
      for (const it of av.value) {
        const s = String((it as any).symbol || "").toUpperCase();
        const n = String((it as any).name || s);
        if (s) items.push({ symbol: s, name: n });
      }
    }

    // Dedupe by symbol, keep first occurrence
    const seen = new Set<string>();
    const merged = items.filter((x) => {
      if (seen.has(x.symbol)) return false;
      seen.add(x.symbol);
      return true;
    });

    // Keep it tidy
    const out = merged.slice(0, 20);

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=600",
      },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
