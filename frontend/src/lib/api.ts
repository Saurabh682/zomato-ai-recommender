import type { UserPreferences, RecommendationResponse } from "../types";

const API_BASE = "/api";

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
