// src/components/PriceChart.tsx
"use client";

import * as React from "react";

type Point = { date: string; close: number };

type Props = {
  data: Point[];
  height?: number;
};

export default function PriceChart({ data, height = 180 }: Props) {
  if (!data?.length) {
    return <div className="text-sm text-gray-500">No data</div>;
  }

  const width = 640; // fixed for simplicity
  const padding = 24;

  const xs = data.map((_, i) => i);
  const ys = data.map(d => d.close);

  const xMin = 0;
  const xMax = xs.length - 1;
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const scaleX = (i: number) =>
    padding + ((i - xMin) / Math.max(1, xMax - xMin)) * (width - padding * 2);
  const scaleY = (y: number) =>
    height - padding - ((y - yMin) / Math.max(1e-9, yMax - yMin)) * (height - padding * 2);

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleY(d.close).toFixed(1)}`)
    .join(" ");

  const last = data[data.length - 1]?.close ?? 0;
  const first = data[0]?.close ?? 0;
  const pct = first ? ((last - first) / first) * 100 : 0;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Axes (very light) */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />

        {/* Price path */}
        <path d={path} fill="none" stroke={pct >= 0 ? "#16a34a" : "#dc2626"} strokeWidth={2} />
      </svg>
    </div>
  );
}
