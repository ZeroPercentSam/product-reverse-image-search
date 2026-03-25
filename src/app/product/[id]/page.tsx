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
    <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <a href="/" className="font-[family-name:var(--font-playfair)] text-5xl font-bold tracking-tight text-primary transition-colors duration-200 hover:text-accent sm:text-6xl">
          Luxury Lens
        </a>
        <p className="mt-3 text-sm text-muted-foreground">
          Product identification from {new Date(record.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {record.image_url && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.image_url}
            alt={`${record.brand} ${record.product_name}`}
            className="mx-auto max-h-96 object-contain p-6"
          />
        </div>
      )}

      <ProductPageClient analysis={analysis} listingsData={listingsData} />
    </main>
  );
}
