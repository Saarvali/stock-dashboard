// src/app/page.tsx
import { Suspense } from "react";
import DashboardClient from "@/components/DashboardClient";
import { getDashboardData, type StockRow } from "@/lib/data";

export default async function HomePage() {
  // Fetch your dashboard rows on the server
  const data = await getDashboardData();
  const rows: StockRow[] = data.stocks;

  // Seed the watchlist from the fetched rows (symbols)
  const initialWatchlist = rows.map((r) => r.symbol);

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>

        {/* IMPORTANT: Wrap the client component (uses useSearchParams) in Suspense */}
        <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
          <DashboardClient rows={rows} initialWatchlist={initialWatchlist} />
        </Suspense>
      </div>
    </main>
  );
}
