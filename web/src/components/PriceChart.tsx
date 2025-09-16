"use client";

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

export default function PriceChart({ data, note = "Indexed to 100 at period start" }: { data: Point[]; note?: string }) {
  if (!data?.length) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-600 mb-2">{note}</div>
      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <ComposedChart data={data}>
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
