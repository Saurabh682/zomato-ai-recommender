/**
 * Helper to generate Zomato URLs.
 * 
 * 1. Exact direct venue URL:
 *    - Prefers the verified dataset URL `r.url` if present (strips tracking query params and trailing /info).
 *    - Otherwise constructs clean slug: `https://www.zomato.com/bangalore/${nameSlug}-${locationSlug}`
 *      (e.g. https://www.zomato.com/bangalore/gods-own-cafe-koramangala-7th-block).
 * 
 * 2. Search / Chain listing URL:
 *    - Used when there is no exact URL or to explore all chain outlets on Zomato
 *      (e.g. https://www.zomato.com/bangalore/restaurants/99-pancakes).
 */

export const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");

export function getZomatoUrls(r: { name: string; location: string; url?: string }) {
  let exactUrl = "";
  if (r.url && r.url.trim().startsWith("http")) {
    exactUrl = r.url.trim().split("?")[0].replace(/\/+$/, "").replace(/\/info$/, "");
  }

  const nameSlug = toSlug(r.name);
  const locationSlug = toSlug(r.location);
  const fallbackExactUrl = `https://www.zomato.com/bangalore/${nameSlug}-${locationSlug}`;

  // Chain / All-Outlets URL (e.g. https://www.zomato.com/bangalore/restaurants/99-pancakes)
  const chainUrl = `https://www.zomato.com/bangalore/restaurants/${nameSlug}`;

  // Targeted Search URL in Bangalore
  const searchUrl = `https://www.zomato.com/bangalore/restaurants?q=${encodeURIComponent(r.name + " " + r.location)}`;

  // Primary URL: authentic exact venue URL if known; otherwise fallback to chain/restaurants listing
  // to avoid 404 errors on Zomato
  const primaryUrl = exactUrl || chainUrl;

  return {
    primaryUrl,
    exactUrl: exactUrl || fallbackExactUrl,
    chainUrl,
    searchUrl,
    hasExactDatasetUrl: Boolean(exactUrl),
  };
}
