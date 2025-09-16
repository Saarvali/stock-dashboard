import { getDashboardData, getDashboardDataFor } from "@/lib/data";
import DashboardClient from "@/components/DashboardClient";
import SearchBar from "@/components/SearchBar";
import WatchlistEditor from "@/components/WatchlistEditor";

type Search = { wl?: string };

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const { wl } = await searchParams;
  const watchlist = (wl || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const data = watchlist.length ? await getDashboardDataFor(watchlist) : await getDashboardData();

  const items = Object.values(data.stocks).map((s) => ({ symbol: s.symbol, name: s.name }));

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Stock Dashboard</h1>
            <p className="text-gray-600">
              Benchmark: <span className="font-medium">{data.benchmark}</span> • As of {data.asOf}
            </p>
          </div>

          <div className="w-full sm:w-80">
            <SearchBar items={items} placeholder="Search AAPL, VOLV-B.ST, ERIC-B…" />
          </div>
        </div>

        <WatchlistEditor />

        <DashboardClient data={data} />
      </div>
    </main>
  );
}
