import mock from "@/data/mock-data";
import { finnhubDailyFromCandidates, finnhubDaily } from "@/lib/finnhub";

export const dynamic = "force-dynamic";

type HasWatchlist = { watchlist: string[] };
function hasWatchlist(obj: unknown): obj is HasWatchlist {
  if (typeof obj !== "object" || obj === null) return false;
  const rec = obj as Record<string, unknown>;
  return Array.isArray(rec.watchlist) && rec.watchlist.every((x) => typeof x === "string");
}

export async function GET() {
  // Warm overlays (best-effort)
  try { await finnhubDailyFromCandidates(["SPY", "^GSPC"], 420); } catch {}
  try { await finnhubDailyFromCandidates(["^OMXS30", "OMXS30", "OMXS30.ST", "XACT-OMXS30.ST"], 420); } catch {}

  const symbols: string[] = hasWatchlist(mock) ? mock.watchlist : [];
  let ok = 0;

  // Warm each symbol sequentially to avoid rate limits
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
