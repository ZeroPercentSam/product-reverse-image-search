import { VisualMatch, UnifiedListing, PriceStats, ConditionStats } from "./types";

interface ShoppingResult {
  title?: string;
  link?: string;
  source?: string;
  extracted_price?: number;
  price?: string;
  currency?: string;
  condition?: string;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  delivery?: string;
}

interface LensProductResult {
  title?: string;
  link?: string;
  source?: string;
  price?: { value?: string; currency?: string; extracted_value?: number };
  thumbnail?: string;
}

function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    const paramsToRemove = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "tag", "srsltid", "clickid", "gclid", "fbclid",
    ];
    paramsToRemove.forEach((p) => parsed.searchParams.delete(p));
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function inferCondition(title: string, rawCondition?: string): "new" | "pre-owned" | "unknown" {
  if (rawCondition) {
    const c = rawCondition.toLowerCase();
    if (c.includes("new")) return "new";
    if (c.includes("pre-owned") || c.includes("used") || c.includes("refurbished")) return "pre-owned";
  }
  const t = title.toLowerCase();
  if (t.includes("pre-owned") || t.includes("pre owned") || t.includes("used") || t.includes("vintage") || t.includes("previously owned")) return "pre-owned";
  if (t.includes("brand new") || t.includes("sealed") || t.includes("new with tags") || t.includes("nwt")) return "new";
  return "unknown";
}

function formatPrice(price: number, currency: string = "$"): string {
  const sym = currency === "USD" || currency === "$" ? "$" : currency;
  return `${sym}${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function searchGoogleShopping(query: string): Promise<ShoppingResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("SERPAPI_API_KEY is not configured");

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: apiKey,
    gl: "us",
    hl: "en",
  });

  console.log("[Shopping] Searching for:", query);

  const response = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Shopping] Error:", response.status, text);
    throw new Error(`Google Shopping error: ${text}`);
  }

  const data = await response.json();
  const results = data.shopping_results || [];
  console.log("[Shopping] Found", results.length, "results");
  return results;
}

export async function searchLensProducts(imageUrl: string): Promise<LensProductResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("SERPAPI_API_KEY is not configured");

  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    type: "products",
    api_key: apiKey,
  });

  console.log("[LensProducts] Searching with type=products for:", imageUrl);

  const response = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[LensProducts] Error:", response.status, text);
    throw new Error(`Google Lens Products error: ${text}`);
  }

  const data = await response.json();
  const results = data.visual_matches || [];
  console.log("[LensProducts] Found", results.length, "product results");
  return results;
}

export function mergeAndDeduplicate(
  lensVisual: VisualMatch[],
  shopping: ShoppingResult[],
  lensProducts: LensProductResult[]
): UnifiedListing[] {
  const seen = new Map<string, UnifiedListing>();

  // Process Lens visual matches
  for (const m of lensVisual) {
    const key = stripTrackingParams(m.link);
    const price = m.price?.extracted_value ?? null;
    seen.set(key, {
      id: key,
      title: m.title,
      link: m.link,
      source: m.source,
      price,
      priceFormatted: price ? formatPrice(price, m.price?.currency) : null,
      currency: m.price?.currency || "USD",
      condition: inferCondition(m.title),
      thumbnail: null,
      origin: "lens_visual",
    });
  }

  // Process Google Shopping results
  for (const s of shopping) {
    if (!s.link) continue;
    const key = stripTrackingParams(s.link);
    const price = s.extracted_price ?? null;
    const existing = seen.get(key);
    // Prefer shopping data (has more fields) or add new
    if (!existing || (price && !existing.price)) {
      seen.set(key, {
        id: key,
        title: s.title || "",
        link: s.link,
        source: s.source || "",
        price,
        priceFormatted: price ? formatPrice(price) : (s.price || null),
        currency: s.currency || "USD",
        condition: inferCondition(s.title || "", s.condition),
        thumbnail: s.thumbnail || existing?.thumbnail || null,
        origin: "google_shopping",
      });
    }
  }

  // Process Lens Products
  for (const p of lensProducts) {
    if (!p.link) continue;
    const key = stripTrackingParams(p.link);
    if (seen.has(key)) continue; // Don't overwrite
    const price = p.price?.extracted_value ?? null;
    seen.set(key, {
      id: key,
      title: p.title || "",
      link: p.link,
      source: p.source || "",
      price,
      priceFormatted: price ? formatPrice(price, p.price?.currency) : null,
      currency: p.price?.currency || "USD",
      condition: inferCondition(p.title || ""),
      thumbnail: p.thumbnail || null,
      origin: "lens_products",
    });
  }

  // Sort by price (priced items first, then by price ascending)
  const listings = Array.from(seen.values());
  listings.sort((a, b) => {
    if (a.price === null && b.price === null) return 0;
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return a.price - b.price;
  });

  return listings;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function conditionStats(prices: number[]): ConditionStats | null {
  if (prices.length === 0) return null;
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    median: median(prices),
    count: prices.length,
  };
}

export function computePriceStats(listings: UnifiedListing[]): PriceStats | null {
  const priced = listings.filter((l) => l.price !== null).map((l) => l.price as number);
  if (priced.length === 0) return null;

  const newPrices = listings.filter((l) => l.price !== null && l.condition === "new").map((l) => l.price as number);
  const preOwnedPrices = listings.filter((l) => l.price !== null && l.condition === "pre-owned").map((l) => l.price as number);

  return {
    min: Math.min(...priced),
    max: Math.max(...priced),
    median: median(priced),
    average: Math.round(priced.reduce((a, b) => a + b, 0) / priced.length),
    count: priced.length,
    byCondition: {
      new: conditionStats(newPrices),
      preOwned: conditionStats(preOwnedPrices),
    },
  };
}
