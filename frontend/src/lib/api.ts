import type { UserPreferences, RecommendationResponse } from "../types";

let rawBase = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
if (rawBase && !rawBase.endsWith("/api")) {
  rawBase += "/api";
}
const API_BASE = rawBase || "/api";

export async function fetchRecommendations(
  prefs: UserPreferences
): Promise<RecommendationResponse> {
  try {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });

    if (!res.ok) {
      if (res.status === 503) {
        throw new Error(
          "Backend is waking up or suspended on Render. Please wait 30s or check your Render dashboard."
        );
      }
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.toLowerCase().includes("failed to fetch")) {
      throw new Error(
        "Unable to reach the backend server. Render free instances sleep after inactivity or require un-suspending in the Render Dashboard."
      );
    }
    throw err;
  }
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

  try {
    const res = await fetch(`${API_BASE}/recommend/more?${params}`);
    if (!res.ok) {
      if (res.status === 503) {
        throw new Error(
          "Backend is waking up or suspended on Render. Please wait 30s or check your Render dashboard."
        );
      }
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${res.status}`);
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.toLowerCase().includes("failed to fetch")) {
      throw new Error(
        "Unable to reach the backend server. The instance may be sleeping on Render."
      );
    }
    throw err;
  }
}

