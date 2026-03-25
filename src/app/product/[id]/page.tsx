import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ProductAnalysis, ListingsData, LensSearchData } from "@/lib/types";
import ProductPageClient from "./ProductPageClient";

interface ProductRecord {
  id: string;
  created_at: string;
  image_url: string;
  brand: string;
  product_name: string;
  category: string;
  price_range: string;
  confidence: string;
  confidence_score: number;
  summary: string;
  features: string[];
  authentication_notes: string;
  verification_notes: string | null;
  sources: ProductAnalysis["sources"];
  listings: ListingsData["listings"];
  price_stats: ListingsData["priceStats"];
  lens_data: LensSearchData;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase
    .from("product_searches")
    .select("brand, product_name, category, price_range")
    .eq("id", id)
    .single();

  if (!data) return { title: "Product Not Found" };

  return {
    title: `${data.brand} ${data.product_name} — Luxury Lens`,
    description: `${data.category} by ${data.brand}. ${data.price_range}`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("product_searches")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const record = data as ProductRecord;

  const analysis: ProductAnalysis = {
    brand: record.brand,
    productName: record.product_name,
    category: record.category,
    priceRange: record.price_range,
    confidence: record.confidence as "High" | "Medium" | "Low",
    confidenceScore: record.confidence_score,
    summary: record.summary,
    features: record.features,
    authenticationNotes: record.authentication_notes,
    verificationNotes: record.verification_notes || undefined,
    sources: record.sources,
  };

  const listingsData: ListingsData = {
    listings: record.listings,
    priceStats: record.price_stats,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8 text-center">
        <a href="/" className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-neutral-900 hover:text-neutral-700 transition">
          Luxury Lens
        </a>
        <p className="mt-2 text-neutral-500">
          Product identification from {new Date(record.created_at).toLocaleDateString()}
        </p>
      </div>

      {record.image_url && (
        <div className="mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.image_url}
            alt={`${record.brand} ${record.product_name}`}
            className="mx-auto max-h-80 object-contain"
          />
        </div>
      )}

      <ProductPageClient analysis={analysis} listingsData={listingsData} />
    </main>
  );
}
