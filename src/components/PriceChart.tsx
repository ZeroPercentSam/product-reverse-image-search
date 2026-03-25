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
  new: "#059669",
  "pre-owned": "#A16207",
  unknown: "#A8A29E",
};

interface ChartDataPoint {
  source: string;
  price: number;
  title: string;
  condition: string;
  link: string;
  fill: string;
  x: number;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-xl border px-4 py-3.5 ${accent ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <span className={`mt-0.5 tabular-nums text-lg font-bold ${accent ? "text-accent" : "text-primary"}`}>
        {value}
      </span>
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
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-xl">
      <p className="max-w-[260px] truncate text-sm font-semibold text-primary">
        {d.title}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{d.source}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="tabular-nums text-base font-bold text-primary">
          ${d.price.toLocaleString()}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
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

  const sourceCounts = new Map<string, number>();
  pricedListings.forEach((l) => {
    sourceCounts.set(l.source, (sourceCounts.get(l.source) || 0) + 1);
  });
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
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/50 px-6 py-5 sm:px-8">
        <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-primary">
          Price Index
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Market pricing across {topSources.length} sources
        </p>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Lowest" value={fmt(stats.min)} />
          <StatCard label="Highest" value={fmt(stats.max)} />
          <StatCard label="Median" value={fmt(stats.median)} accent />
          <StatCard label="Average" value={fmt(stats.average)} />
          <StatCard label="Listings" value={String(stats.count)} />
        </div>

        {/* Condition legend */}
        {(stats.byCondition.new || stats.byCondition.preOwned) && (
          <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
            {stats.byCondition.new && (
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: conditionColor.new }} />
                New: {fmt(stats.byCondition.new.median)} median ({stats.byCondition.new.count})
              </span>
            )}
            {stats.byCondition.preOwned && (
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: conditionColor["pre-owned"] }} />
                Pre-owned: {fmt(stats.byCondition.preOwned.median)} median ({stats.byCondition.preOwned.count})
              </span>
            )}
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 40, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, topSources.length - 0.5]}
              ticks={topSources.map((_, i) => i)}
              tickFormatter={(i: number) => {
                const name = topSources[i];
                return name?.length > 12 ? name.slice(0, 12) + "\u2026" : name || "";
              }}
              tick={{ fontSize: 10, fill: "#78716C" }}
              angle={-35}
              textAnchor="end"
              interval={0}
              axisLine={{ stroke: "#D6D3D1" }}
              tickLine={{ stroke: "#D6D3D1" }}
            />
            <YAxis
              type="number"
              dataKey="price"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
              tick={{ fontSize: 11, fill: "#78716C" }}
              axisLine={{ stroke: "#D6D3D1" }}
              tickLine={{ stroke: "#D6D3D1" }}
              label={{
                value: "Price (USD)",
                angle: -90,
                position: "insideLeft",
                offset: -45,
                style: { fontSize: 11, fill: "#A8A29E" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={stats.median}
              stroke="#A16207"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Median ${fmt(stats.median)}`,
                position: "right",
                fill: "#A16207",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Scatter data={chartData} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
