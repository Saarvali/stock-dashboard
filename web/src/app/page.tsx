import { getDashboardData, getDashboardDataFor, type StockRow, type Data } from "@/lib/data";
import DashboardClient from "@/components/DashboardClient";
import SearchBar from "@/components/SearchBar";
import WatchlistEditor from "@/components/WatchlistEditor";

export default async function Page() {
  // Default watchlist – you can later make this user-specific or read ?wl=
  const watchlist: string[] = ["AAPL", "MSFT", "GOOGL"];

  // Fetch dashboard Data (object with .stocks map)
  const data: Data = watchlist.length
    ? await getDashboardDataFor(watchlist)
    : await getDashboardData();

  // Convert map -> array of StockRow for the table and search
  const rows: StockRow[] = Object.values(data.stocks);

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-semibold">Stock Dashboard</h1>

        {/* Optional search & watchlist editor */}
        <div className="flex items-center gap-4">
          <SearchBar
            items={rows.map((s) => ({
              symbol: s.symbol,
              name: s.name,
            }))}
          />
          <WatchlistEditor />
        </div>

        {/* Dashboard table */}
        <DashboardClient rows={rows} initialWatchlist={watchlist} />
      </div>
    </main>
  );
}
