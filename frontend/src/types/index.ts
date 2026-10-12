// Shared TypeScript types matching backend RecommendationResponse

export interface RestaurantRecommendation {
  name: string;
  location: string;
  cuisine: string;
  rating: number;
  cost_for_two: number;
  online_order: boolean;
  book_table: boolean;
  explanation: string;
}

export interface RecommendationResponse {
  recommendations: RestaurantRecommendation[];
  total_filtered: number;
  processing_time_ms: number;
  llm_fallback: boolean;
  message: string;
}

export interface UserPreferences {
  location: string;
  budget: "low" | "medium" | "high";
  cuisine: string;
  min_rating: number;
  preferences: string;
}
