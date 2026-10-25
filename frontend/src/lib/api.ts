import type { UserPreferences, RecommendationResponse } from "../types";

let rawBase = (import.meta.env.VITE_API_BASE_URL || "https://deamonizer-zomato-ai-backend.hf.space").trim().replace(/\/+$/, "");
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
          "Backend is waking up on Hugging Face Spaces. Please wait a few seconds and try again."
        );
      }
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.toLowerCase().includes("failed to fetch")) {
      throw new Error(
        "Unable to reach the backend server. The Hugging Face Space may be waking from sleep or starting up."
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
          "Backend is waking up on Hugging Face Spaces. Please wait a few seconds and try again."
        );
      }
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${res.status}`);
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.toLowerCase().includes("failed to fetch")) {
      throw new Error(
        "Unable to reach the backend server on Hugging Face Spaces. Please retry in a few moments."
      );
    }
    throw err;
  }
}

