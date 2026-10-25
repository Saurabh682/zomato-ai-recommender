import { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Database,
  Zap,
  Cpu,
  Sparkles,
  AlertCircle,
  MapPin,
  ChevronDown,
  Loader2,
  RefreshCw,
  LayoutGrid,
  Map,
} from "lucide-react";
import type { RecommendationResponse, RestaurantRecommendation, UserPreferences } from "../types";
import { RecommendationCard } from "./RecommendationCard";
import { BangaloreMapView } from "./BangaloreMapView";
import { fetchMoreRecommendations } from "../lib/api";

interface Props {
  data: RecommendationResponse;
  prefs: UserPreferences;
}

const PAGE_SIZE = 10;

export function RecommendationList({ data, prefs }: Props) {
  const [extra, setExtra] = useState<RestaurantRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const gridRef = useRef<HTMLDivElement>(null);

  const allRecs = [...data.recommendations, ...extra];
  // total unique candidates from the backend (LLM picks + heuristic pool)
  const totalAvailable = data.total_filtered;
  const canLoadMore = !exhausted && allRecs.length < totalAvailable;

  // Stagger entrance animation on new recommendations
  useGSAP(
    () => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll(".recommendation-card");
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 22 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.06,
            ease: "power2.out",
          }
        );
      }
    },
    { dependencies: [data.recommendations], scope: gridRef }
  );

  async function loadMore() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchMoreRecommendations(prefs, allRecs.length, PAGE_SIZE);
      if (res.recommendations.length === 0) {
        setExhausted(true);
      } else {
        setExtra((prev) => [...prev, ...res.recommendations]);
        if (res.recommendations.length < PAGE_SIZE) setExhausted(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load additional venues";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (data.recommendations.length === 0) {
    return (
      <div className="bg-[#141620] border border-amber-500/30 rounded-2xl p-7 flex gap-4 items-start shadow-xl">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
          <AlertCircle size={22} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white">No Exact Matches in this Quadrant</h3>
          <p className="text-slate-300 text-sm leading-relaxed">{data.message}</p>
          <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>💡 Pro tip: Try selecting Koramangala or Indiranagar, or lowering the rating threshold to 3.0★.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Metric Ticker Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#141620] border border-[#232738] text-xs shadow-xl">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#1E2230] flex items-center justify-center text-[#FF5E3A]">
            <Database size={15} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Matched Candidates</p>
            <p className="text-sm font-bold text-white font-mono">
              {data.total_filtered.toLocaleString()} Venues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#1E2230] flex items-center justify-center text-emerald-400">
            <Zap size={15} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Inference Latency</p>
            <p className="text-sm font-bold text-emerald-400 font-mono">
              {data.processing_time_ms}ms (Groq LPU)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#1E2230] flex items-center justify-center text-purple-400">
            <Cpu size={15} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">LLM Orchestrator</p>
            <p className="text-sm font-bold text-white truncate max-w-[140px]">
              {data.llm_fallback ? "Heuristic Top-5" : "Groq / GPT-OSS"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#1E2230] flex items-center justify-center text-amber-400">
            <MapPin size={15} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Knowledge Graph</p>
            <p className="text-sm font-bold text-white font-mono">51.7k Bangalore</p>
          </div>
        </div>
      </div>

      {/* Section Title Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              AI Gastronomy Picks for Bangalore
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF334B]/15 text-[#FF5E3A] border border-[#FF334B]/30 flex items-center gap-1">
              <Sparkles size={10} /> Live Synthesized
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Showing {allRecs.length} of {totalAvailable.toLocaleString()} matched venues — top {data.recommendations.length} AI-ranked, rest sorted by score.
          </p>
        </div>

        {/* View Mode Switcher (Grid vs Interactive Map) */}
        <div className="flex items-center gap-1 p-1 bg-[#141620] border border-[#232738] rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-gradient-to-r from-[#FF334B] to-[#FF5E3A] text-white shadow-md shadow-[#FF334B]/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid size={13} />
            <span>Grid ({allRecs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "map"
                ? "bg-gradient-to-r from-[#FF334B] to-[#FF5E3A] text-white shadow-md shadow-[#FF334B]/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Map size={13} />
            <span>Map View</span>
          </button>
        </div>
      </div>

      {/* Main Content: Map or Responsive Card Grid */}
      {viewMode === "map" ? (
        <BangaloreMapView recommendations={allRecs} />
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allRecs.map((rec, i) => (
            <RecommendationCard
              key={`${rec.name}-${i}`}
              recommendation={rec}
              rank={i + 1}
              isFallback={i >= data.recommendations.length || data.llm_fallback}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {canLoadMore && (
        <div className="flex flex-col items-center gap-2.5 pt-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#232738] bg-[#141620] hover:border-slate-500 hover:bg-[#1E2230] text-slate-300 hover:text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin text-[#FF5E3A]" /> Loading venues…</>
            ) : (
              <><ChevronDown size={15} /> Load {Math.min(PAGE_SIZE, totalAvailable - allRecs.length)} more venues</>
            )}
          </button>
          {loadError && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/30 border border-red-500/30 px-3 py-1.5 rounded-lg">
              <AlertCircle size={14} />
              <span>{loadError}</span>
              <button
                type="button"
                onClick={loadMore}
                className="underline font-semibold hover:text-red-300 flex items-center gap-1 ml-1"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">
            {totalAvailable - allRecs.length} venues remaining
          </p>
        </div>
      )}

      {exhausted && extra.length > 0 && (
        <p className="text-center text-xs text-slate-500 pt-2">
          All {allRecs.length} matched venues shown.
        </p>
      )}
    </div>
  );
}
