import { useMutation } from "@tanstack/react-query";
import { fetchRecommendations } from "../lib/api";
import type { UserPreferences, RecommendationResponse } from "../types";

export function useRecommendations() {
  return useMutation<RecommendationResponse, Error, UserPreferences>({
    mutationFn: fetchRecommendations,
  });
}
