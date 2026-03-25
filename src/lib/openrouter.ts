import { CompressedSearchData, ProductAnalysis, SYSTEM_PROMPT } from "./types";

export async function identifyProduct(
  searchData: CompressedSearchData
): Promise<ProductAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://luxury-lens.vercel.app",
        "X-Title": "Luxury Lens",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here are the Google Reverse Image Search results for a product image. Please identify the luxury product:\n\n${JSON.stringify(searchData, null, 2)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response content from AI model");
  }

  try {
    return JSON.parse(content) as ProductAnalysis;
  } catch {
    // If JSON parsing fails, return a best-effort result
    return {
      brand: "Unknown",
      productName: "Unknown",
      category: "Unknown",
      priceRange: "Unknown",
      features: [],
      confidence: "Low",
      authenticationNotes: "Could not parse structured response",
      summary: content,
    };
  }
}
