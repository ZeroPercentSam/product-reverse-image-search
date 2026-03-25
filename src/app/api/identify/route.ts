import { NextResponse } from "next/server";
import { searchByImage } from "@/lib/serpapi";
import { identifyProduct } from "@/lib/openrouter";

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
    console.log("[API] AI identified:", analysis.brand, "-", analysis.productName, "(score:", analysis.confidenceScore, ")");

    return NextResponse.json({ success: true, data: analysis, lensData });
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
