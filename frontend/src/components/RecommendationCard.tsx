import {
  Star,
  MapPin,
  IndianRupee,
  Wifi,
  Calendar,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { RestaurantRecommendation } from "../types";

interface Props {
  recommendation: RestaurantRecommendation;
  rank: number;
  isFallback: boolean;
}

export function RecommendationCard({ recommendation: r, rank, isFallback }: Props) {
  // Rank badge styling
  const rankBadges = [
    { label: "#1 Top Match • 98%", badgeClass: "bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20 font-black" },
    { label: "#2 High Affinity • 95%", badgeClass: "bg-gradient-to-r from-slate-200 to-slate-400 text-black shadow-md font-black" },
    { label: "#3 Popular Pick • 92%", badgeClass: "bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-black" },
    { label: `#${rank} Curated • 89%`, badgeClass: "bg-[#1E2230] text-slate-300 border border-[#232738] font-bold" },
    { label: `#${rank} Curated • 86%`, badgeClass: "bg-[#1E2230] text-slate-300 border border-[#232738] font-bold" },
  ];

  const currentBadge = rankBadges[rank - 1] || {
    label: `#${rank} Pick`,
    badgeClass: "bg-[#1E2230] text-slate-300 border border-[#232738] font-bold",
  };

  const isGold = rank === 1;

  // Build Zomato deep-link: zomato.com/bangalore/{name-slug}-{location-slug}/info
  // e.g. "XO Belgian Waffle" + "Koramangala 5th Block" → xo-belgian-waffle-koramangala-5th-block
  const toSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
  const zomatoUrl = `https://www.zomato.com/bangalore/${toSlug(r.name)}-${toSlug(r.location)}/info`;

  return (
    <article
      className={`relative rounded-2xl bg-[#141620] border p-6 shadow-2xl transition-all duration-300 group overflow-hidden flex flex-col justify-between ${
        isGold
          ? "border-[#FF334B]/50 hover:border-[#FF334B] hover:shadow-[#FF334B]/10"
          : "border-[#232738] hover:border-slate-600"
      }`}
    >
      {/* Ambient background glow for #1 */}
      {isGold && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FF334B]/10 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="space-y-4">
        {/* Top Header: Rank + Feature Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[11px] tracking-wide flex items-center gap-1 ${currentBadge.badgeClass}`}
          >
            <Sparkles size={11} className={rank <= 2 ? "fill-black" : "fill-white"} />
            {currentBadge.label}
          </span>

          <div className="flex items-center gap-1.5">
            {r.online_order && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Wifi size={10} /> Online Order
              </span>
            )}
            {r.book_table && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Calendar size={10} /> Book Table
              </span>
            )}
          </div>
        </div>

        {/* Name and Rating */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-xl font-bold text-white group-hover:text-[#FF334B] transition-colors leading-snug">
              {r.name}
            </h3>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1B1E2C] border border-[#232738] flex-shrink-0">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span className="font-bold text-white text-sm">{r.rating.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-sm font-medium text-amber-400/90 mt-1">{r.cuisine}</p>
        </div>

        {/* Location & Cost Info */}
        <div className="flex items-center justify-between text-xs text-slate-400 py-1 border-y border-[#232738]/50">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-[#FF334B]" />
            {r.location}
          </span>
          <span className="flex items-center gap-1 font-semibold text-slate-200">
            <IndianRupee size={12} className="text-emerald-400" />
            ₹{r.cost_for_two.toLocaleString("en-IN")} for two
          </span>
        </div>

        {/* AI Affinity Reasoning Box */}
        <div className="p-3.5 rounded-xl bg-[#090A0F]/80 border border-white/10 backdrop-blur-md relative">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#FF334B] to-[#FF5E3A] flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
              <Sparkles size={13} className="fill-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5E3A] block mb-1">
                AI Affinity Reasoning
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {r.explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Fallback Notice if active */}
        {isFallback && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-800/30">
            <AlertCircle size={13} />
            <span>Deterministic ranking active (LLM fallback used)</span>
          </div>
        )}
      </div>

      {/* Action CTA Buttons */}
      <div className="flex items-center gap-2.5 pt-5 mt-2">
        <a
          href={zomatoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 px-3 rounded-full bg-gradient-to-r from-[#FF334B] to-[#FF5E3A] hover:brightness-110 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 glow-ember transition-all text-center"
        >
          <span>Explore on Zomato</span>
          <ExternalLink size={12} />
        </a>

        {r.book_table && (
          <a
            href={zomatoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 rounded-full bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-semibold text-xs transition-all flex items-center gap-1"
          >
            <Calendar size={12} />
            <span>Reserve</span>
          </a>
        )}
      </div>
    </article>
  );
}
