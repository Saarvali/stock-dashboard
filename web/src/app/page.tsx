import { getDashboardData } from "@/lib/data";
import DashboardClient from "@/components/DashboardClient";
import SearchBar from "@/components/SearchBar";

export default async function Home() {
  const data = await getDashboardData();

  const items = Object.values(data.stocks).map((s) => ({
    symbol: s.symbol,
    name: s.name,
  }));

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Stock Dashboard</h1>
            <p className="text-gray-600">
              Benchmark: <span className="font-medium">{data.benchmark}</span> • As of {data.asOf}{" "}
              <span
                className={`ml-2 text-xs px-2 py-1 rounded ${
                  data.liveCount === data.totalCount
                    ? "bg-green-50 text-green-700"
                    : data.liveCount > 0
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {data.liveCount === data.totalCount
                  ? "Live data (Alpha Vantage)"
                  : data.liveCount > 0
                  ? `Partial live: ${data.liveCount}/${data.totalCount}`
                  : "Mock fallback"}
              </span>
            </p>
          </div>

          <div className="w-full sm:w-80">
            <SearchBar items={items} placeholder="Search AAPL, MSFT, ERIC-B…" />
          </div>
        </div>

        <DashboardClient data={data} />
      </div>
    </main>
  );
}
