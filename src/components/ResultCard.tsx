"use client";

import { ProductAnalysis } from "@/lib/types";

const confidenceColors = {
  High: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-red-100 text-red-800",
};

export default function ResultCard({ data }: { data: ProductAnalysis }) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-neutral-500">
            {data.category}
          </p>
          <h2 className="font-serif text-2xl font-bold text-neutral-900">
            {data.brand}
          </h2>
          <p className="text-lg text-neutral-700">{data.productName}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${confidenceColors[data.confidence]}`}
          >
            {data.confidence} Confidence
          </span>
          <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-800">
            {data.priceRange}
          </span>
        </div>
      </div>

      <p className="mb-4 text-neutral-600">{data.summary}</p>

      {data.features.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Key Features
          </h3>
          <ul className="list-inside list-disc space-y-1 text-neutral-700">
            {data.features.map((feature, i) => (
              <li key={i}>{feature}</li>
            ))}
          </ul>
        </div>
      )}

      {data.authenticationNotes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold text-amber-800">
            Authentication Notes
          </h3>
          <p className="text-sm text-amber-700">{data.authenticationNotes}</p>
        </div>
      )}
    </div>
  );
}
