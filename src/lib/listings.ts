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

// Approximate exchange rates to USD
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  $: 1,
  EUR: 1.09,
  "€": 1.09,
  GBP: 1.27,
  "£": 1.27,
  JPY: 0.0067,
  "¥": 0.0067,
  CNY: 0.14,
  "CN¥": 0.14,
  KRW: 0.00074,
  "₩": 0.00074,
  AUD: 0.65,
  "A$": 0.65,
  CAD: 0.73,
  "CA$": 0.73,
  CHF: 1.13,
  HKD: 0.13,
  "HK$": 0.13,
  SGD: 0.75,
  "S$": 0.75,
};

// Domains that use specific currencies
const DOMAIN_CURRENCIES: Record<string, string> = {
  ".jp": "JPY",
  ".co.jp": "JPY",
  "mercari.com": "JPY", // Japanese Mercari
  "rakuten.co.jp": "JPY",
  ".fr": "EUR",
  ".de": "EUR",
  ".it": "EUR",
  ".es": "EUR",
  ".co.uk": "GBP",
  ".kr": "KRW",
  ".cn": "CNY",
  ".com.au": "AUD",
  ".ca": "CAD",
  ".ch": "CHF",
  ".hk": "HKD",
  ".sg": "SGD",
};

function detectCurrency(
  priceValue: string | undefined,
  currencyField: string | undefined,
  link: string | undefined
): string {
  // 1. Check price string for currency symbols
  if (priceValue) {
    if (priceValue.includes("¥") || priceValue.includes("￥")) return "JPY";
    if (priceValue.includes("€")) return "EUR";
    if (priceValue.includes("£")) return "GBP";
    if (priceValue.includes("₩")) return "KRW";
    if (priceValue.includes("A$")) return "AUD";
    if (priceValue.includes("CA$")) return "CAD";
    if (priceValue.includes("HK$")) return "HKD";
    if (priceValue.includes("S$")) return "SGD";
    if (priceValue.includes("CHF")) return "CHF";
  }

  // 2. Check explicit currency field
  if (currencyField && currencyField !== "$" && currencyField !== "?") {
    return currencyField;
  }

  // 3. Infer from domain
  if (link) {
    try {
      const hostname = new URL(link).hostname.toLowerCase();
      for (const [domain, currency] of Object.entries(DOMAIN_CURRENCIES)) {
        if (hostname.endsWith(domain) || hostname.includes(domain)) {
          return currency;
        }
      }
    } catch { /* ignore */ }
  }

  // 4. If price is very high (>50000) and source looks Japanese, likely JPY
  return "USD";
}

function convertToUSD(price: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return Math.round(price * rate);
}

function isLikelyJPY(price: number, link?: string, source?: string): boolean {
  // Heuristic: if price > 50000 and source/link looks Japanese, it's JPY
  if (price < 50000) return false;
  const text = `${link || ""} ${source || ""}`.toLowerCase();
  return (
    text.includes(".jp") ||
    text.includes("japan") ||
    text.includes("メルカリ") ||
    text.includes("楽天") ||
    text.includes("セカンド") ||
    text.includes("エルメス")
  );
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
  if (
    t.includes("pre-owned") || t.includes("pre owned") || t.includes("used") ||
    t.includes("vintage") || t.includes("previously owned") || t.includes("second hand") ||
    t.includes("中古") || t.includes("occasion")
  ) return "pre-owned";
  if (t.includes("brand new") || t.includes("sealed") || t.includes("new with tags") || t.includes("nwt")) return "new";
  return "unknown";
}

function isRelevantListing(title: string, brand: string, productName: string): boolean {
  const t = title.toLowerCase();
  const b = brand.toLowerCase();

  // Must contain the brand name (or common abbreviation)
  const brandAliases: Record<string, string[]> = {
    "hermès": ["hermes", "hermès", "herms", "エルメス"],
    "louis vuitton": ["louis vuitton", "lv", "ルイヴィトン", "ルイ・ヴィトン"],
    "chanel": ["chanel", "シャネル"],
    "gucci": ["gucci", "グッチ"],
    "rolex": ["rolex", "ロレックス"],
    "omega": ["omega", "オメガ"],
    "prada": ["prada", "プラダ"],
    "dior": ["dior", "ディオール"],
    "cartier": ["cartier", "カルティエ"],
    "bulgari": ["bulgari", "bvlgari", "ブルガリ"],
  };

  const aliases = brandAliases[b] || [b];
  const hasBrand = aliases.some((alias) => t.includes(alias));
  if (!hasBrand) return false;

  // Filter out PDF patterns, templates, craft supplies
  const excludePatterns = [
    "pdf pattern", "template", "sewing pattern", "craft",
    "cutting dies", "mold cutter", "sunglasses bag", "glasses case",
    "phone case", "wallet case", "iphone", "airpod",
  ];
  if (excludePatterns.some((p) => t.includes(p))) return false;

  // Check for product name keywords — at least one significant word should match
  const nameWords = productName.toLowerCase()
    .split(/[\s\-\/]+/)
    .filter((w) => w.length > 2 && !["the", "bag", "leather", "canvas"].includes(w));

  // If we have product name keywords, at least one should be in the title
  // (relaxed check — we don't require all words since titles vary)
  if (nameWords.length > 0) {
    const hasProductKeyword = nameWords.some((w) => t.includes(w));
    // For the brand-only match, also accept if the category matches broadly
    if (!hasProductKeyword) {
      // Allow if it's clearly a bag from the same brand (for visual matches)
      const categoryWords = ["bag", "handbag", "shoulder", "crossbody", "clutch", "sac", "tote"];
      const hasCategoryMatch = categoryWords.some((w) => t.includes(w));
      if (!hasCategoryMatch) return false;
    }
  }

  return true;
}

function formatPriceUSD(price: number): string {
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

function processPrice(
  rawPrice: number | null | undefined,
  priceValue: string | undefined,
  currencyField: string | undefined,
  link: string | undefined,
  source: string | undefined
): { priceUSD: number | null; priceFormatted: string | null; currency: string } {
  if (rawPrice == null) {
    return { priceUSD: null, priceFormatted: null, currency: "USD" };
  }

  let currency = detectCurrency(priceValue, currencyField, link);

  // Heuristic: very high prices with Japanese sources are likely JPY not USD
  if (currency === "USD" && isLikelyJPY(rawPrice, link, source)) {
    currency = "JPY";
  }

  const priceUSD = convertToUSD(rawPrice, currency);
  const priceFormatted = formatPriceUSD(priceUSD);

  return { priceUSD, priceFormatted, currency };
}

export function mergeAndDeduplicate(
  lensVisual: VisualMatch[],
  shopping: ShoppingResult[],
  lensProducts: LensProductResult[],
  brand: string,
  productName: string
): UnifiedListing[] {
  const seen = new Map<string, UnifiedListing>();

  // Process Lens visual matches
  for (const m of lensVisual) {
    if (!isRelevantListing(m.title, brand, productName)) continue;
    const key = stripTrackingParams(m.link);
    const { priceUSD, priceFormatted, currency } = processPrice(
      m.price?.extracted_value, m.price?.value, m.price?.currency, m.link, m.source
    );
    seen.set(key, {
      id: key,
      title: m.title,
      link: m.link,
      source: m.source,
      price: priceUSD,
      priceFormatted,
      currency,
      condition: inferCondition(m.title),
      thumbnail: null,
      origin: "lens_visual",
    });
  }

  // Process Google Shopping results (already USD from Google Shopping US)
  for (const s of shopping) {
    if (!s.link || !s.title) continue;
    if (!isRelevantListing(s.title, brand, productName)) continue;
    const key = stripTrackingParams(s.link);
    const { priceUSD, priceFormatted, currency } = processPrice(
      s.extracted_price, s.price, s.currency, s.link, s.source
    );
    const existing = seen.get(key);
    if (!existing || (priceUSD && !existing.price)) {
      seen.set(key, {
        id: key,
        title: s.title,
        link: s.link,
        source: s.source || "",
        price: priceUSD,
        priceFormatted,
        currency,
        condition: inferCondition(s.title, s.condition),
        thumbnail: s.thumbnail || existing?.thumbnail || null,
        origin: "google_shopping",
      });
    }
  }

  // Process Lens Products
  for (const p of lensProducts) {
    if (!p.link || !p.title) continue;
    if (!isRelevantListing(p.title, brand, productName)) continue;
    const key = stripTrackingParams(p.link);
    if (seen.has(key)) continue;
    const { priceUSD, priceFormatted, currency } = processPrice(
      p.price?.extracted_value, p.price?.value, p.price?.currency, p.link, p.source
    );
    seen.set(key, {
      id: key,
      title: p.title,
      link: p.link,
      source: p.source || "",
      price: priceUSD,
      priceFormatted,
      currency,
      condition: inferCondition(p.title),
      thumbnail: p.thumbnail || null,
      origin: "lens_products",
    });
  }

  const listings = Array.from(seen.values());
  listings.sort((a, b) => {
    if (a.price === null && b.price === null) return 0;
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return a.price - b.price;
  });

  console.log(`[Listings] Merged: ${listings.length} relevant (filtered from ${lensVisual.length + shopping.length + lensProducts.length} total)`);

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
