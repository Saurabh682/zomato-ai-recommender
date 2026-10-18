import {
  Database,
  Zap,
  Cpu,
  Sparkles,
  AlertCircle,
  MapPin,
} from "lucide-react";
import type { RecommendationResponse } from "../types";
import { RecommendationCard } from "./RecommendationCard";

interface Props {
  data: RecommendationResponse;
}

export function RecommendationList({ data }: Props) {
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

      {/* Section Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
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
            Top {data.recommendations.length} culinary recommendations tailored to your exact budget, gastronomy, and ambience vibes.
          </p>
        </div>
      </div>

      {/* Recommendations Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
