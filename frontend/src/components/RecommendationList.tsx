import { Clock, Database, AlertCircle } from "lucide-react";
import type { RecommendationResponse } from "../types";
import { RecommendationCard } from "./RecommendationCard";

interface Props {
  data: RecommendationResponse;
}

export function RecommendationList({ data }: Props) {
  if (data.recommendations.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex gap-3 items-start">
        <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-semibold text-amber-800">No restaurants found</p>
          <p className="text-amber-700 text-sm mt-1">{data.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2.5">
        <span className="flex items-center gap-1.5">
          <Database size={14} />
          {data.total_filtered.toLocaleString()} restaurants matched your filters
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          {data.processing_time_ms}ms
        </span>
        {data.llm_fallback && (
          <span className="flex items-center gap-1.5 text-amber-600">
            <AlertCircle size={14} />
            AI fallback mode
          </span>
        )}
      </div>

      <h2 className="text-xl font-bold text-gray-800">
        🍽️ Top {data.recommendations.length} Recommendations
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.recommendations.map((rec, i) => (
          <RecommendationCard
            key={`${rec.name}-${i}`}
            recommendation={rec}
            rank={i + 1}
            isFallback={data.llm_fallback}
          />
        ))}
      </div>
    </div>
  );
}
