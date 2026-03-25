import { CompressedSearchData } from "./types";

export async function searchByImage(
  imageUrl: string
): Promise<CompressedSearchData> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    engine: "google_reverse_image",
    image_url: imageUrl,
    api_key: apiKey,
  });

  const response = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SerpAPI error (${response.status}): ${text}`);
  }

  const data = await response.json();

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
      (r: Record<string, string>) => ({
        title: r.title || "",
        snippet: r.snippet || "",
        link: r.link || "",
      })
    ),
    inlineImages: (data.inline_images || []).slice(0, 5).map(
      (img: Record<string, string>) => ({
        title: img.title,
        source: img.source,
      })
    ),
  };

  return compressed;
}
