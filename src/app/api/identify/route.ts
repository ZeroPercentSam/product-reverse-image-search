import { NextResponse } from "next/server";
import { searchByImage } from "@/lib/serpapi";
import { identifyProduct } from "@/lib/openrouter";
import {
  searchGoogleShopping,
  searchLensProducts,
  mergeAndDeduplicate,
  computePriceStats,
} from "@/lib/listings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Image URL is required" },
        { status: 400 }
      );
    }

    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    console.log("[API] Received identify request for URL:", imageUrl);

    // Step 1: Google Lens visual search via SerpAPI
    const lensData = await searchByImage(imageUrl);
    console.log("[API] Google Lens returned", lensData.visualMatches.length, "visual matches");

    // Step 2: Vision AI identification with image + Lens data
    const analysis = await identifyProduct(lensData, lensData.imageUrl);
    console.log("[API] AI identified:", analysis.brand, "-", analysis.productName);

    // Step 3: Parallel listing searches using the identified product name
    const searchQuery = `${analysis.brand} ${analysis.productName}`;
    console.log("[API] Searching listings for:", searchQuery);

    const [shoppingResult, lensProductsResult] = await Promise.allSettled([
      searchGoogleShopping(searchQuery),
      searchLensProducts(lensData.imageUrl),
    ]);

    const shoppingResults =
      shoppingResult.status === "fulfilled" ? shoppingResult.value : [];
    const lensProductResults =
      lensProductsResult.status === "fulfilled" ? lensProductsResult.value : [];

    if (shoppingResult.status === "rejected") {
      console.warn("[API] Shopping search failed:", shoppingResult.reason);
    }
    if (lensProductsResult.status === "rejected") {
      console.warn("[API] Lens products search failed:", lensProductsResult.reason);
    }

    // Step 4: Merge, deduplicate, and compute stats
    const listings = mergeAndDeduplicate(
      lensData.visualMatches,
      shoppingResults,
      lensProductResults
    );
    const priceStats = computePriceStats(listings);

    console.log("[API] Total unique listings:", listings.length, "| Priced:", priceStats?.count ?? 0);

    return NextResponse.json({
      success: true,
      data: analysis,
      lensData,
      listingsData: { listings, priceStats },
    });
  } catch (error) {
    console.error("Identify API error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
