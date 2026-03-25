"use client";

import { UnifiedListing, PriceStats } from "@/lib/types";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const conditionColor: Record<string, string> = {
  new: "#16a34a",
  "pre-owned": "#d97706",
  unknown: "#9ca3af",
};

interface ChartDataPoint {
  source: string;
  price: number;
  title: string;
  condition: string;
  link: string;
  fill: string;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className="text-lg font-bold text-neutral-900">{value}</span>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
      <p className="max-w-[250px] truncate text-sm font-semibold text-neutral-800">
        {d.title}
      </p>
      <p className="text-xs text-neutral-500">{d.source}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-sm font-bold text-neutral-900">
          ${d.price.toLocaleString()}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: d.fill }}
        >
          {d.condition}
        </span>
      </div>
    </div>
  );
}

export default function PriceChart({
  listings,
  stats,
}: {
  listings: UnifiedListing[];
  stats: PriceStats;
}) {
  const pricedListings = listings.filter((l) => l.price !== null);

  if (pricedListings.length < 2) return null;

  // Build chart data grouped by source
  const sourceCounts = new Map<string, number>();
  pricedListings.forEach((l) => {
    sourceCounts.set(l.source, (sourceCounts.get(l.source) || 0) + 1);
  });
  // Sort sources by count descending, take top 15
  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([s]) => s);
  const sourceIndex = new Map(topSources.map((s, i) => [s, i]));

  const chartData: ChartDataPoint[] = pricedListings
    .filter((l) => sourceIndex.has(l.source))
    .map((l) => ({
      source: l.source,
      x: sourceIndex.get(l.source) || 0,
      price: l.price as number,
      title: l.title,
      condition: l.condition,
      link: l.link,
      fill: conditionColor[l.condition] || conditionColor.unknown,
    }));

  const fmt = (v: number) =>
    `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-serif text-xl font-bold text-neutral-900">
        Price Index
      </h3>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Lowest" value={fmt(stats.min)} />
        <StatCard label="Highest" value={fmt(stats.max)} />
        <StatCard label="Median" value={fmt(stats.median)} />
        <StatCard label="Average" value={fmt(stats.average)} />
        <StatCard label="Listings" value={String(stats.count)} />
      </div>

      {/* Condition breakdown */}
      {(stats.byCondition.new || stats.byCondition.preOwned) && (
        <div className="mb-4 flex flex-wrap gap-4 text-xs">
          {stats.byCondition.new && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" />
              New: {fmt(stats.byCondition.new.median)} median ({stats.byCondition.new.count})
            </span>
          )}
          {stats.byCondition.preOwned && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />
              Pre-owned: {fmt(stats.byCondition.preOwned.median)} median ({stats.byCondition.preOwned.count})
            </span>
          )}
        </div>
      )}

      {/* Scatter chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-0.5, topSources.length - 0.5]}
            ticks={topSources.map((_, i) => i)}
            tickFormatter={(i: number) => {
              const name = topSources[i];
              return name?.length > 12 ? name.slice(0, 12) + "…" : name || "";
            }}
            tick={{ fontSize: 10, fill: "#737373" }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            type="number"
            dataKey="price"
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
            tick={{ fontSize: 11, fill: "#737373" }}
            label={{
              value: "Price (USD)",
              angle: -90,
              position: "insideLeft",
              offset: -45,
              style: { fontSize: 11, fill: "#a3a3a3" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={stats.median}
            stroke="#6366f1"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Median ${fmt(stats.median)}`,
              position: "right",
              fill: "#6366f1",
              fontSize: 11,
            }}
          />
          <Scatter data={chartData} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
