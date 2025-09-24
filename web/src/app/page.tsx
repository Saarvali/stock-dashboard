// src/app/page.tsx
import DashboardClient from "@/components/DashboardClient";
import { getDashboardData, getDashboardDataFor, type StockRow } from "@/lib/data";

type SearchParams = { wl?: string };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const wlParam = (searchParams?.wl ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const rows: StockRow[] = wlParam.length
    ? await getDashboardDataFor(wlParam)
    : await getDashboardData();

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-semibold">Stock Dashboard</h1>

        {/* Dashboard table with Add/Delete that syncs ?wl=... */}
        <DashboardClient rows={rows} initialWatchlist={wlParam} />
      </div>
    </main>
  );
}
