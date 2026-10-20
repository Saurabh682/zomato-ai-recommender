import type { UserPreferences, RecommendationResponse } from "../types";

let rawBase = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
if (rawBase && !rawBase.endsWith("/api")) {
  rawBase += "/api";
}
const API_BASE = rawBase || "/api";

export async function fetchRecommendations(
  prefs: UserPreferences
): Promise<RecommendationResponse> {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export async function fetchMoreRecommendations(
  prefs: UserPreferences,
  offset: number,
  limit = 10
): Promise<RecommendationResponse> {
  const params = new URLSearchParams({
    location: prefs.location,
    budget: prefs.budget,
    cuisine: prefs.cuisine || "",
    min_rating: String(prefs.min_rating ?? 0),
    offset: String(offset),
    limit: String(limit),
  });

  const res = await fetch(`${API_BASE}/recommend/more?${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${res.status}`);
  }
  return res.json();
}

