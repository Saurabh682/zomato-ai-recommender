import { useState } from "react";
import {
  MapPin,
  UtensilsCrossed,
  Star,
  Sparkles,
  RotateCcw,
  Zap,
} from "lucide-react";
import type { UserPreferences } from "../types";

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isLoading: boolean;
}

const POPULAR_LOCATIONS = [
  "Koramangala",
  "Indiranagar",
  "HSR Layout",
  "Whitefield",
  "BTM",
  "JP Nagar",
  "MG Road",
];

const CUISINES = [
  "",
  "Italian",
  "North Indian",
  "South Indian",
  "Chinese",
  "Continental",
  "Fast Food",
  "Biryani",
  "Cafe",
  "Mughlai",
  "Pizza",
  "Burger",
  "Japanese",
  "Thai",
  "Mexican",
  "Lebanese",
  "Street Food",
];

const INITIAL_FORM: UserPreferences = {
  location: "",
  budget: "medium",
  cuisine: "",
  min_rating: 3.5,
  preferences: "",
};

export function PreferenceForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<UserPreferences>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof UserPreferences, string>>>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.location.trim()) newErrors.location = "Micro-location is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0E1017] border border-[#232738] rounded-2xl p-6 md:p-7 shadow-2xl space-y-6"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#232738]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF334B] to-[#FF5E3A] flex items-center justify-center shadow-md shadow-[#FF334B]/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Discovery Preferences</h2>
            <p className="text-xs text-slate-400">Algorithmic Palate &amp; Ambience Filtering</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-[#FF334B] transition-colors flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-[#141620]"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Location Input & Pills */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Micro-Location / Hub <span className="text-[#FF334B]">*</span>
        </label>
        <div className="relative mb-2.5">
          <MapPin size={16} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="e.g. Koramangala, Indiranagar, HSR, Whitefield"
            value={form.location}
            onChange={(e) => {
              setForm({ ...form, location: e.target.value });
              if (errors.location) setErrors({ ...errors, location: undefined });
            }}
            className={`w-full bg-[#141620] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all ${
              errors.location
                ? "border-red-500 bg-red-950/20"
                : "border-[#232738] focus:border-[#FF334B] focus:ring-1 focus:ring-[#FF334B]/30"
            }`}
          />
        </div>
        {errors.location && (
          <p className="text-red-400 text-xs mb-2">{errors.location}</p>
        )}

        {/* Quick Select Location Pills */}
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_LOCATIONS.map((loc) => {
            const isSelected = form.location.toLowerCase() === loc.toLowerCase();
            return (
              <button
                key={loc}
                type="button"
                onClick={() => {
                  setForm({ ...form, location: loc });
                  if (errors.location) setErrors({ ...errors, location: undefined });
                }}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  isSelected
                    ? "bg-[#FF334B]/20 text-white border border-[#FF334B] glow-border font-bold"
                    : "bg-[#141620] text-slate-400 border border-[#232738] hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                {loc}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget 3-Tier Segmented Control */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Spend Ceiling (Cost for Two)
        </label>
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#141620] rounded-xl border border-[#232738]">
          {[
            { id: "low", label: "₹ Low", sub: "≤ ₹300" },
            { id: "medium", label: "₹₹ Mid", sub: "₹300–700" },
            { id: "high", label: "₹₹₹ Fine", sub: "₹700+" },
          ].map((tier) => {
            const isSelected = form.budget === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setForm({ ...form, budget: tier.id as UserPreferences["budget"] })}
                className={`py-2 px-2 text-center rounded-lg transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-[#FF334B] to-[#FF5E3A] text-white font-bold shadow-lg shadow-[#FF334B]/25"
                    : "text-slate-400 hover:text-white hover:bg-[#1E2230]"
                }`}
              >
                <div className="text-xs font-semibold">{tier.label}</div>
                <div className="text-[10px] opacity-75">{tier.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cuisine Selector */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Target Gastronomy &amp; Cuisine
        </label>
        <div className="relative">
          <UtensilsCrossed size={15} className="absolute left-3.5 top-3 text-slate-500" />
          <select
            value={form.cuisine}
            onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
            className="w-full bg-[#141620] border border-[#232738] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#FF334B] focus:ring-1 focus:ring-[#FF334B]/30 appearance-none cursor-pointer"
          >
            {CUISINES.map((c) => (
              <option key={c} value={c} className="bg-[#141620] text-slate-100">
                {c || "Any Gastronomy (All Cuisines)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Minimum Rating Slider */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Minimum Rating Threshold
          </label>
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {form.min_rating.toFixed(1)} ★
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={form.min_rating}
          onChange={(e) => setForm({ ...form, min_rating: parseFloat(e.target.value) })}
          className="w-full h-2 bg-[#141620] rounded-lg appearance-none cursor-pointer accent-[#FF334B] border border-[#232738]"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>0.0 (Any)</span>
          <span>2.5</span>
          <span>3.5</span>
          <span className="text-amber-400 font-bold">4.0+</span>
          <span>5.0</span>
        </div>
      </div>

      {/* Contextual Query / Vibes Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Contextual Query / Vibes <span className="text-slate-600 font-normal">(Optional)</span>
          </label>
          <span className="text-[10px] text-slate-500 font-mono">
            {form.preferences.length}/300
          </span>
        </div>
        <textarea
          placeholder="e.g. romantic rooftop brewery, wood-fired pizza, craft beer on tap, pet-friendly outdoor seating..."
          value={form.preferences}
          onChange={(e) => setForm({ ...form, preferences: e.target.value })}
          rows={2}
          maxLength={300}
          className="w-full bg-[#141620] border border-[#232738] rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF334B] focus:ring-1 focus:ring-[#FF334B]/30 resize-none leading-relaxed"
        />
      </div>

      {/* Primary Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#FF334B] to-[#FF5E3A] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 glow-ember transition-all"
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Synthesizing Recommendations...
            </>
          ) : (
            <>
              <Zap size={16} className="fill-white" />
              Generate AI Recommendations
            </>
          )}
        </button>
        <div className="flex items-center justify-center gap-2 mt-2.5 text-slate-400 text-[11px]">
          <span>Engine: Groq LPU™ openai/gpt-oss-120b</span>
          <span>•</span>
          <span className="text-emerald-400 font-mono">~600ms latency</span>
        </div>
      </div>
    </form>
  );
}
