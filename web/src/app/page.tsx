// src/app/page.tsx
import { getDashboardData, getDashboardDataFor, type StockRow, type Data } from "@/lib/data";
import DashboardClient from "@/components/DashboardClient";
import SearchBar from "@/components/SearchBar";
import WatchlistEditor from "@/components/WatchlistEditor";

async function loadWatchlist(): Promise<string[]> {
  // If you later persist a watchlist in cookies/db, load it here.
  return [];
}

export default async function Home() {
  const watchlist = await loadWatchlist();

  // Fetch dashboard data shaped as { stocks: StockRow[] }
  const data: Data = watchlist.length
    ? await getDashboardDataFor(watchlist)
    : await getDashboardData();

  // Build items for SearchBar as { symbol, name }
  const items: { symbol: string; name: string }[] = data.stocks.map((s: StockRow) => ({
    symbol: s.symbol,
    name: s.name,
  }));

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Stock Dashboard</h1>
          <div className="flex items-center gap-4">
            {/* SearchBar REQUIRES items */}
            <SearchBar items={items} />
            {/* WatchlistEditor currently takes no props (leave empty) */}
            <WatchlistEditor />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <DashboardClient rows={data.stocks} />
        </section>
      </div>
    </main>
  );
}
