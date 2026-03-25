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
  const [recordId, setRecordId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLensData(null);
    setListingsData(null);
    setRecordId(null);
    setCopied(false);

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
        setRecordId(data.recordId || null);
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
            className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground"
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
            className="w-full rounded-xl border border-border bg-card px-5 py-3.5 text-card-foreground placeholder-stone-400 shadow-sm transition-all duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />
        </div>

        {imageUrl && !previewError && (
          <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Preview"
              className="mx-auto max-h-72 object-contain p-4"
              onError={() => setPreviewError(true)}
            />
          </div>
        )}

        {imageUrl && previewError && (
          <p className="text-sm text-muted-foreground">
            Preview unavailable — the image will still be searched.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !imageUrl.trim()}
          className="w-full cursor-pointer rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold tracking-wide text-white shadow-md transition-all duration-200 hover:bg-secondary hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2.5">
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
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <ResultCard data={result} />}

      {recordId && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <input
            readOnly
            value={`${window.location.origin}/product/${recordId}`}
            className="flex-1 truncate bg-transparent text-sm text-muted-foreground outline-none"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/product/${recordId}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 cursor-pointer rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-accent-light active:scale-95"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}

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
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="cursor-pointer text-xs text-stone-400 transition hover:text-muted-foreground"
          >
            {showDebug ? "Hide" : "Show"} Debug Info
          </button>
          {showDebug && lensData && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-primary p-4 text-xs text-stone-400">
              {JSON.stringify({ lensData, listingsData }, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
