// src/components/PriceChart.tsx
// Minimal, dependency-free SVG line chart for { t, c } series.

"use client";

import * as React from "react";

export type Series = { t: number[]; c: number[] };
type Props = { series: Series; height?: number };

export default function PriceChart({ series, height = 260 }: Props) {
  const { t, c } = series || { t: [], c: [] };

  if (!Array.isArray(t) || !Array.isArray(c) || c.length < 2) {
    return (
      <div className="text-sm text-gray-500">
        Not enough data to render chart.
      </div>
    );
  }

  // Dimensions & padding
  const W = 800; // container width (SVG viewBox; scales to parent)
  const H = height;
  const PAD_L = 40;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;

  const n = Math.min(t.length, c.length);
  const xs = t.slice(-n);
  const ys = c.slice(-n);

  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yRange = maxY - minY || 1;

  // X goes 0..(n-1)
  const xToPx = (i: number) =>
    PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
  const yToPx = (y: number) =>
    PAD_T + (1 - (y - minY) / yRange) * (H - PAD_T - PAD_B);

  // Build path
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = xToPx(i);
    const y = yToPx(ys[i]);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }

  // Last price marker
  const lastX = xToPx(n - 1);
  const lastY = yToPx(ys[n - 1]);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Background */}
        <rect x="0" y="0" width={W} height={H} fill="white" />

        {/* Horizontal grid (4 lines) */}
        {Array.from({ length: 4 }).map((_, i) => {
          const yVal = minY + (i / 3) * yRange;
          const y = yToPx(yVal);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={8}
                y={y + 4}
                fontSize="10"
                fill="#6b7280"
              >
                {yVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Price path */}
        <path
          d={d}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Last value dot */}
        <circle cx={lastX} cy={lastY} r={3} fill="#2563eb" />

        {/* Axes (simple baseline) */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={H - PAD_B}
          y2={H - PAD_B}
          stroke="#9ca3af"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
