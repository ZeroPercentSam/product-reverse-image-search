"use client";

import { ProductAnalysis, ListingsData } from "@/lib/types";
import ResultCard from "@/components/ResultCard";
import PriceChart from "@/components/PriceChart";
import ListingsTable from "@/components/ListingsTable";

export default function ProductPageClient({
  analysis,
  listingsData,
}: {
  analysis: ProductAnalysis;
  listingsData: ListingsData;
}) {
  return (
    <>
      <ResultCard data={analysis} />

      {listingsData.priceStats && listingsData.listings.length > 0 && (
        <PriceChart
          listings={listingsData.listings}
          stats={listingsData.priceStats}
        />
      )}

      {listingsData.listings.length > 0 && (
        <ListingsTable listings={listingsData.listings} />
      )}
    </>
  );
}
