import { LensSearchData } from "./types";

export async function searchByImage(
  imageUrl: string
): Promise<LensSearchData> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  // Strip query params from image URLs — cache-busting params (e.g. ?20260305121953)
  // cause Google Lens to return less accurate results
  let cleanImageUrl = imageUrl;
  try {
    const parsed = new URL(imageUrl);
    const ext = parsed.pathname.toLowerCase();
    if (ext.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/)) {
      parsed.search = "";
      cleanImageUrl = parsed.toString();
      if (cleanImageUrl !== imageUrl) {
        console.log("[SerpAPI] Stripped query params:", imageUrl, "→", cleanImageUrl);
      }
    }
  } catch {
    // If URL parsing fails, use as-is
  }

  const params = new URLSearchParams({
    engine: "google_lens",
    url: cleanImageUrl,
    api_key: apiKey,
  });

  const requestUrl = `https://serpapi.com/search?${params}`;
  console.log("[SerpAPI] Google Lens request for:", cleanImageUrl);

  const response = await fetch(requestUrl, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[SerpAPI] Error:", response.status, text);
    throw new Error(`SerpAPI error (${response.status}): ${text}`);
  }

  const data = await response.json();

  console.log("[SerpAPI] visual_matches count:", data.visual_matches?.length ?? 0);
  console.log("[SerpAPI] Has knowledge_graph:", !!data.knowledge_graph);

  if (data.visual_matches?.length > 0) {
    console.log("[SerpAPI] Top match:", data.visual_matches[0].title);
    if (data.visual_matches[0].price) {
      console.log("[SerpAPI] Top match price:", JSON.stringify(data.visual_matches[0].price));
    }
  } else {
    console.warn("[SerpAPI] No visual_matches returned. Keys:", Object.keys(data));
  }

  const lensData: LensSearchData = {
    visualMatches: (data.visual_matches || []).map(
      (m: Record<string, unknown>) => ({
        title: (m.title as string) || "",
        link: (m.link as string) || "",
        source: (m.source as string) || "",
        price: m.price
          ? {
              value: (m.price as Record<string, unknown>).value as string,
              currency: (m.price as Record<string, unknown>).currency as string,
              extracted_value: (m.price as Record<string, unknown>).extracted_value as number,
            }
          : undefined,
      })
    ),
    knowledgeGraph: data.knowledge_graph
      ? {
          title: data.knowledge_graph[0]?.title,
          subtitle: data.knowledge_graph[0]?.subtitle,
        }
      : null,
    imageUrl: cleanImageUrl,
  };

  console.log("[SerpAPI] Compressed lens data:", JSON.stringify(lensData, null, 2));

  return lensData;
}
