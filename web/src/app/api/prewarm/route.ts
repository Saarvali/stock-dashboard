import mock from "@/data/mock-data";
import { finnhubDailyFromCandidates, finnhubDaily } from "@/lib/finnhub";

export const dynamic = "force-dynamic";

export async function GET() {
  const symbols = mock.watchlist || [];
  let ok = 0;
  // Warm overlays
  try { await finnhubDailyFromCandidates(["SPY", "^GSPC"], 420); } catch {}
  try { await finnhubDailyFromCandidates(["^OMXS30", "OMXS30", "OMXS30.ST", "XACT-OMXS30.ST"], 420); } catch {}

  // Warm each watchlist symbol (sequential to be gentle)
  for (const s of symbols) {
    try {
      await finnhubDaily(s, 420);
      ok++;
    } catch {}
  }
  return Response.json({ warmed: ok, total: symbols.length });
}
