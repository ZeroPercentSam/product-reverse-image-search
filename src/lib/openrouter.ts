import { LensSearchData, ProductAnalysis, SYSTEM_PROMPT } from "./types";

export async function identifyProduct(
  lensData: LensSearchData,
  imageUrl: string
): Promise<ProductAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const lensContext = lensData.visualMatches.map((m) => ({
    title: m.title,
    source: m.source,
    price: m.price
      ? `${m.price.currency}${m.price.extracted_value}`
      : undefined,
    link: m.link,
  }));

  const userContent = [
    {
      type: "image_url",
      image_url: { url: imageUrl },
    },
    {
      type: "text",
      text: `Here are the Google Lens visual match results for this product image. Please examine the image directly AND cross-reference with these results to identify the exact luxury product:\n\n${JSON.stringify(lensContext, null, 2)}`,
    },
  ];

  console.log("[OpenRouter] Sending vision request with model: openai/gpt-4o-mini");
  console.log("[OpenRouter] Image URL:", imageUrl);
  console.log("[OpenRouter] Lens matches:", lensContext.length);

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
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("[OpenRouter] Error:", response.status, text);
    throw new Error(`OpenRouter error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  console.log("[OpenRouter] Model used:", data.model);
  console.log("[OpenRouter] Usage:", JSON.stringify(data.usage));
  console.log("[OpenRouter] Raw response:", content);

  if (!content) {
    console.error("[OpenRouter] No content. Full response:", JSON.stringify(data));
    throw new Error("No response content from AI model");
  }

  try {
    const parsed = JSON.parse(content) as ProductAnalysis;
    console.log("[OpenRouter] Identified:", parsed.brand, "-", parsed.productName, "Score:", parsed.confidenceScore);
    return parsed;
  } catch {
    console.error("[OpenRouter] JSON parse failed:", content);
    return {
      brand: "Unknown",
      productName: "Unknown",
      category: "Unknown",
      priceRange: "Unknown",
      features: [],
      confidence: "Low",
      confidenceScore: 0,
      authenticationNotes: "Could not parse structured response",
      summary: content,
      sources: [],
    };
  }
}
