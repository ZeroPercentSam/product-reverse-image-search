"use client";

import { useState } from "react";
import { ProductAnalysis, LensSearchData, ListingsData } from "@/lib/types";
import ResultCard from "./ResultCard";
import PriceChart from "./PriceChart";
import ListingsTable from "./ListingsTable";

export default function SearchForm() {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductAnalysis | null>(null);
  const [lensData, setLensData] = useState<LensSearchData | null>(null);
  const [listingsData, setListingsData] = useState<ListingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLensData(null);
    setListingsData(null);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageUrl.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data.data);
        setLensData(data.lensData || null);
        setListingsData(data.listingsData || null);
      }
    } catch {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="imageUrl"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Image URL
          </label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setPreviewError(false);
            }}
            placeholder="https://example.com/product-image.jpg"
            required
            disabled={loading}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
          />
        </div>

        {imageUrl && !previewError && (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Preview"
              className="mx-auto max-h-64 object-contain"
              onError={() => setPreviewError(true)}
            />
          </div>
        )}

        {imageUrl && previewError && (
          <p className="text-sm text-neutral-500">
            Preview unavailable — the image will still be searched.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !imageUrl.trim()}
          className="w-full rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Identifying Product...
            </span>
          ) : (
            "Identify Product"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <ResultCard data={result} />}

      {listingsData?.priceStats && listingsData.listings.length > 0 && (
        <PriceChart
          listings={listingsData.listings}
          stats={listingsData.priceStats}
        />
      )}

      {listingsData && listingsData.listings.length > 0 && (
        <ListingsTable listings={listingsData.listings} />
      )}

      {(result || error) && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-neutral-400 transition hover:text-neutral-600"
          >
            {showDebug ? "Hide" : "Show"} Debug Info
          </button>
          {showDebug && lensData && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-neutral-900 p-4 text-xs text-green-400">
              {JSON.stringify({ lensData, listingsData }, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
