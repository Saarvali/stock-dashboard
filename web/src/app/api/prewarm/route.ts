import mock from "@/data/mock-data";
import { finnhubDailyFromCandidates, finnhubDaily } from "@/lib/finnhub";

export const dynamic = "force-dynamic";

export async function GET() {
  // Warm overlay series (best-effort)
  try { await finnhubDailyFromCandidates(["SPY", "^GSPC"], 420); } catch {}
  try { await finnhubDailyFromCandidates(["^OMXS30", "OMXS30", "OMXS30.ST", "XACT-OMXS30.ST"], 420); } catch {}

  const symbols: string[] = Array.isArray((mock as any).watchlist) ? (mock as any).watchlist : [];
  let ok = 0;

  // Warm each watchlist symbol (sequential to be gentle on rate limits)
  for (const s of symbols) {
    try {
      await finnhubDaily(s, 420);
      ok++;
    } catch {
      // ignore individual failures
    }
  }

  return Response.json(
    { warmed: ok, total: symbols.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
