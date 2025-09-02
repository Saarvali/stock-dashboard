import data from "@/data/mock-data";
import DashboardClient from "@/components/DashboardClient";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-3xl font-bold">Stock Dashboard (Mock)</h1>
        <p className="text-gray-600">
          Benchmark: <span className="font-medium">{data.benchmark}</span> • As of{" "}
          {data.asOf}
        </p>
        <DashboardClient data={data} />
      </div>
    </main>
  );
}
