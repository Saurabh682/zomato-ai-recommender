import { Star, MapPin, IndianRupee, Wifi, Calendar, Bot, AlertCircle } from "lucide-react";
import type { RestaurantRecommendation } from "../types";

interface Props {
  recommendation: RestaurantRecommendation;
  rank: number;
  isFallback: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-sm font-semibold">
      <Star size={14} className="fill-yellow-400 text-yellow-400" />
      {rating.toFixed(1)}
    </span>
  );
}

export function RecommendationCard({ recommendation: r, rank, isFallback }: Props) {
  const rankColors = ["bg-yellow-400", "bg-gray-300", "bg-orange-400", "bg-gray-100", "bg-gray-100"];
  const rankColor = rankColors[rank - 1] || "bg-gray-100";

  // Truncate long explanations
  const MAX_CHARS = 280;
  const explanation = r.explanation.length > MAX_CHARS
    ? r.explanation.slice(0, MAX_CHARS) + "…"
    : r.explanation;

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden flex flex-col">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 flex items-center justify-between">
        <div className={`${rankColor} text-gray-900 font-black text-sm w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`}>
          #{rank}
        </div>
        <div className="flex gap-2">
          {r.online_order && (
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wifi size={10} /> Online Order
            </span>
          )}
          {r.book_table && (
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Calendar size={10} /> Book Table
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{r.name}</h3>
          <p className="text-orange-600 text-sm font-medium mt-0.5">{r.cuisine}</p>
        </div>

        <div className="flex items-center gap-4 text-gray-600 text-sm">
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-gray-400" />
            {r.location}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <StarRating rating={r.rating} />
          <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
            <IndianRupee size={13} />
            {r.cost_for_two.toLocaleString("en-IN")} for two
          </span>
        </div>

        {/* AI Explanation */}
        <div className="bg-orange-50 rounded-lg p-3 flex gap-2 mt-auto">
          <Bot size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-gray-700 text-sm leading-relaxed">{explanation}</p>
        </div>

        {isFallback && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle size={12} />
            Heuristic recommendation (AI unavailable)
          </div>
        )}
      </div>
    </div>
  );
}
