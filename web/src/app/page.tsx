// src/app/page.tsx
import { getDashboardData, getDashboardDataFor, type StockRow, type Data } from "@/lib/data";
import DashboardClient from "@/components/DashboardClient";
import SearchBar from "@/components/SearchBar";
import WatchlistEditor from "@/components/WatchlistEditor";

// If you later want server-side watchlist (from cookies, db, etc.),
// you can load it here. For now we default to [] and let the client
// manage add/remove within DashboardClient/WatchlistEditor.
async function loadWatchlist(): Promise<string[]> {
  return [];
}

export default async function Home() {
  const watchlist = await loadWatchlist();

  // Get data (object with { stocks })
  const data: Data = watchlist.length
    ? await getDashboardDataFor(watchlist)
    : await getDashboardData();

  // Build items for SearchBar/WatchlistEditor as {symbol,name}
  const items = data.stocks.map((s: StockRow) => ({ symbol: s.symbol, name: s.name }));

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Stock Dashboard</h1>
          {/* Optional search & watchlist controls */}
          <div className="flex items-center gap-4">
            <SearchBar items={items} />
            <WatchlistEditor items={items} />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <DashboardClient rows={data.stocks} />
        </section>
      </div>
    </main>
  );
}
