"use client";

import { useState, useMemo } from "react";
import { UnifiedListing } from "@/lib/types";

type SortKey = "price-asc" | "price-desc" | "source";
type ConditionFilter = "all" | "new" | "pre-owned";

const conditionBadge: Record<string, string> = {
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "pre-owned": "bg-amber-50 text-amber-700 border-amber-200",
  unknown: "bg-stone-100 text-stone-500 border-stone-200",
};

export default function ListingsTable({
  listings,
}: {
  listings: UnifiedListing[];
}) {
  const [sort, setSort] = useState<SortKey>("price-asc");
  const [filter, setFilter] = useState<ConditionFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    let result = listings;
    if (filter !== "all") {
      result = result.filter((l) => l.condition === filter);
    }
    result = [...result].sort((a, b) => {
      if (sort === "source") return a.source.localeCompare(b.source);
      const aPrice = a.price ?? Infinity;
      const bPrice = b.price ?? Infinity;
      return sort === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
    });
    return result;
  }, [listings, sort, filter]);

  const visible = expanded ? filtered : filtered.slice(0, 10);
  const hasMore = filtered.length > 10;

  const newCount = listings.filter((l) => l.condition === "new").length;
  const preOwnedCount = listings.filter((l) => l.condition === "pre-owned").length;

  if (listings.length === 0) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/50 px-6 py-5 sm:px-8">
        <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-primary">
          Available Listings
          <span className="ml-2 tabular-nums text-base font-normal text-muted-foreground">
            {filtered.length}
          </span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {/* Condition filter */}
          <div className="flex overflow-hidden rounded-lg border border-border text-xs">
            {(
              [
                ["all", `All (${listings.length})`],
                ["new", `New (${newCount})`],
                ["pre-owned", `Pre-owned (${preOwnedCount})`],
              ] as [ConditionFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`cursor-pointer px-3.5 py-2 font-medium transition-all duration-150 ${
                  filter === key
                    ? "bg-primary text-white"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-secondary"
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="source">Source A-Z</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-border">
        {visible.map((listing) => (
          <a
            key={listing.id}
            href={listing.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-muted/50 sm:px-8"
          >
            {listing.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.thumbnail}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">
                {listing.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {listing.source}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${conditionBadge[listing.condition]}`}
                >
                  {listing.condition}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              {listing.priceFormatted ? (
                <span className="tabular-nums text-sm font-bold text-primary">
                  {listing.priceFormatted}
                </span>
              ) : (
                <span className="text-xs text-stone-400">No price</span>
              )}
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
              />
            </svg>
          </a>
        ))}
      </div>

      {hasMore && (
        <div className="border-t border-border px-6 py-4 sm:px-8">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full cursor-pointer rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:border-accent hover:text-accent"
          >
            {expanded ? "Show less" : `Show all ${filtered.length} listings`}
          </button>
        </div>
      )}
    </div>
  );
}
