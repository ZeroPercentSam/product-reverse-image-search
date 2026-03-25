"use client";

import { useState, useMemo } from "react";
import { UnifiedListing } from "@/lib/types";

type SortKey = "price-asc" | "price-desc" | "source";
type ConditionFilter = "all" | "new" | "pre-owned";

const conditionBadge: Record<string, string> = {
  new: "bg-green-100 text-green-800",
  "pre-owned": "bg-amber-100 text-amber-800",
  unknown: "bg-neutral-100 text-neutral-600",
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
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-xl font-bold text-neutral-900">
          Available Listings ({filtered.length})
        </h3>

        <div className="flex flex-wrap gap-2">
          {/* Condition filter */}
          <div className="flex rounded-lg border border-neutral-200 text-xs">
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
                className={`px-3 py-1.5 transition ${
                  filter === key
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-50"
                } ${key === "all" ? "rounded-l-lg" : ""} ${key === "pre-owned" ? "rounded-r-lg" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700"
          >
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="source">Source A-Z</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {visible.map((listing) => (
          <a
            key={listing.id}
            href={listing.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition hover:bg-neutral-50"
          >
            {listing.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.thumbnail}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-800">
                {listing.title}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-neutral-500">
                  {listing.source}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${conditionBadge[listing.condition]}`}
                >
                  {listing.condition}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              {listing.priceFormatted ? (
                <span className="text-sm font-semibold text-neutral-900">
                  {listing.priceFormatted}
                </span>
              ) : (
                <span className="text-xs text-neutral-400">No price</span>
              )}
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        ))}
      </div>

      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          Show all {filtered.length} listings
        </button>
      )}
      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 w-full rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          Show less
        </button>
      )}
    </div>
  );
}
