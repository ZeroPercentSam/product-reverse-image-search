import { CompressedSearchData } from "./types";

interface SerpApiResult {
  title?: string;
  snippet?: string;
  link?: string;
  source?: string;
  rich_snippet?: {
    bottom?: {
      detected_extensions?: {
        price?: number;
        currency?: string;
      };
      extensions?: string[];
    };
  };
}

export async function searchByImage(
  imageUrl: string
): Promise<CompressedSearchData> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  // Strip query params from image URLs — cache-busting params (e.g. ?20260305121953)
  // cause Google reverse image search to return irrelevant results
  let cleanImageUrl = imageUrl;
  try {
    const parsed = new URL(imageUrl);
    const ext = parsed.pathname.toLowerCase();
    if (ext.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/)) {
      parsed.search = "";
      cleanImageUrl = parsed.toString();
      if (cleanImageUrl !== imageUrl) {
        console.log("[SerpAPI] Stripped query params from image URL:", imageUrl, "→", cleanImageUrl);
      }
    }
  } catch {
    // If URL parsing fails, use as-is
  }

  const params = new URLSearchParams({
    engine: "google_reverse_image",
    image_url: cleanImageUrl,
    api_key: apiKey,
  });

  const requestUrl = `https://serpapi.com/search?${params}`;
  console.log("[SerpAPI] Request URL:", requestUrl.replace(apiKey, "***"));
  console.log("[SerpAPI] Image URL being searched:", cleanImageUrl);

  const response = await fetch(requestUrl, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[SerpAPI] Error response:", response.status, text);
    throw new Error(`SerpAPI error (${response.status}): ${text}`);
  }

  const data = await response.json();

  console.log("[SerpAPI] Response status:", data.search_information?.organic_results_state);
  console.log("[SerpAPI] Total results:", data.search_information?.total_results);
  console.log("[SerpAPI] image_results count:", data.image_results?.length ?? 0);
  console.log("[SerpAPI] inline_images count:", data.inline_images?.length ?? 0);
  console.log("[SerpAPI] Has knowledge_graph:", !!data.knowledge_graph);

  if (data.error) {
    console.warn("[SerpAPI] API returned error field:", data.error);
  }

  // Log first few raw results for debugging
  if (data.image_results?.length > 0) {
    console.log("[SerpAPI] First result title:", data.image_results[0].title);
    console.log("[SerpAPI] First result snippet:", data.image_results[0].snippet);
    if (data.image_results[0].rich_snippet) {
      console.log("[SerpAPI] First result rich_snippet:", JSON.stringify(data.image_results[0].rich_snippet));
    }
  } else {
    console.warn("[SerpAPI] No image_results returned. Raw keys:", Object.keys(data));
  }

  // Compress the response to only the fields useful for product identification
  const compressed: CompressedSearchData = {
    knowledgeGraph: data.knowledge_graph
      ? {
          title: data.knowledge_graph.title,
          type: data.knowledge_graph.type,
          description: data.knowledge_graph.description,
          source: data.knowledge_graph.source,
        }
      : null,
    topResults: (data.image_results || []).slice(0, 8).map(
      (r: SerpApiResult) => ({
        title: r.title || "",
        snippet: r.snippet || "",
        link: r.link || "",
        source: r.source || "",
        price: r.rich_snippet?.bottom?.detected_extensions?.price
          ? `${r.rich_snippet.bottom.detected_extensions.currency || "$"}${r.rich_snippet.bottom.detected_extensions.price}`
          : undefined,
      })
    ),
    inlineImages: (data.inline_images || []).slice(0, 5).map(
      (img: Record<string, string>) => ({
        title: img.title,
        source: img.source,
      })
    ),
  };

  console.log("[SerpAPI] Compressed data:", JSON.stringify(compressed, null, 2));

  return compressed;
}
