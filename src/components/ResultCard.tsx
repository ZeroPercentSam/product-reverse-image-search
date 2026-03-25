"use client";

import { ProductAnalysis } from "@/lib/types";

const confidenceStyles = {
  High: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-red-50 text-red-700 border-red-200",
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-500";
};

export default function ResultCard({ data }: { data: ProductAnalysis }) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header band */}
      <div className="border-b border-border bg-muted/50 px-6 py-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">
              {data.category}
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight text-primary">
              {data.brand}
            </h2>
            <p className="mt-0.5 text-base text-secondary">{data.productName}</p>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${confidenceStyles[data.confidence]}`}
              >
                {data.confidence}
              </span>
              {data.confidenceScore != null && (
                <span className={`tabular-nums text-sm font-bold ${scoreColor(data.confidenceScore)}`}>
                  {data.confidenceScore}%
                </span>
              )}
            </div>
            <span className="tabular-nums rounded-full bg-primary px-4 py-1 text-sm font-semibold text-white">
              {data.priceRange}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 px-6 py-6 sm:px-8">
        <p className="leading-relaxed text-secondary">{data.summary}</p>

        {data.features.length > 0 && (
          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Key Features
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.features.map((feature, i) => (
                <span
                  key={i}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-secondary"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.verificationNotes && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-700">
              Verification Notes
            </h3>
            <p className="text-sm leading-relaxed text-sky-700">{data.verificationNotes}</p>
          </div>
        )}

        {data.authenticationNotes && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
              Authentication Notes
            </h3>
            <p className="text-sm leading-relaxed text-amber-700">{data.authenticationNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
