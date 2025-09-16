"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";

type Point = { date: string; stock: number; spy?: number | null; omx?: number | null; volume?: number | null };

const RANGES = [
  { key: "1M", days: 21 },
  { key: "3M", days: 63 },
  { key: "6M", days: 126 },
  { key: "1Y", days: 252 },
  { key: "5Y", days: 1260 },
  { key: "MAX", days: Number.POSITIVE_INFINITY },
] as const;

export default function PriceChart({ data, note = "Indexed to 100 at period start" }: { data: Point[]; note?: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("6M");

  const sliced = useMemo(() => {
    if (!data?.length) return [];
    const days = RANGES.find((r) => r.key === range)?.days ?? Number.POSITIVE_INFINITY;
    const start = Math.max(0, data.length - (Number.isFinite(days) ? days : data.length));
    const base = data[start];

    const scale = (v?: number | null) =>
      v && base.stock ? (v * (100 / base.stock)) : null;

    const scaleFrom = (arr: Point[], key: "stock" | "spy" | "omx") => {
      const baseVal = arr[start]?.[key];
      return (v?: number | null) =>
        v && baseVal ? (v * (100 / baseVal)) : null;
    };

    const scaleStock = scaleFrom(data, "stock");
    const scaleSpy = scaleFrom(data, "spy");
    const scaleOmx = scaleFrom(data, "omx");

    return data.slice(start).map((p) => ({
      date: p.date,
      stock: scaleStock(p.stock) ?? 0,
      spy: scaleSpy(p.spy),
      omx: scaleOmx(p.omx),
      volume: p.volume ?? null,
    }));
  }, [data, range]);

  if (!data?.length) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{note}</div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`text-xs px-2 py-1 rounded ${range === r.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <ComposedChart data={sliced}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={28} />
            <YAxis yAxisId="y1" />
            <YAxis yAxisId="y2" orientation="right" hide />
            <Tooltip />
            <Legend />
            <Bar yAxisId="y2" dataKey="volume" name="Volume" opacity={0.3} />
            <Line yAxisId="y1" type="monotone" dataKey="stock" name="Stock (idx)" dot={false} />
            <Line yAxisId="y1" type="monotone" dataKey="spy" name="S&P 500 / SPY (idx)" dot={false} />
            <Line yAxisId="y1" type="monotone" dataKey="omx" name="OMXS30 (idx)" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
