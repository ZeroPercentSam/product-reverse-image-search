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

    // Step 1: Reverse image search via SerpAPI
    const searchData = await searchByImage(imageUrl);
    console.log("[API] SerpAPI returned", searchData.topResults.length, "results, knowledge_graph:", !!searchData.knowledgeGraph);

    // Step 2: AI product identification via OpenRouter
    const analysis = await identifyProduct(searchData);
    console.log("[API] AI identified:", analysis.brand, "-", analysis.productName, "(", analysis.confidence, ")");

    return NextResponse.json({ success: true, data: analysis, searchData });
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
