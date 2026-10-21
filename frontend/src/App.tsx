import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Flame,
  Search,
  AlertCircle,
  Database,
  RotateCcw,
  Share2,
  Check,
  X,
} from "lucide-react";
import { PreferenceForm } from "./components/PreferenceForm";
import { RecommendationList } from "./components/RecommendationList";
import { useRecommendations } from "./hooks/useRecommendations";
import type { UserPreferences } from "./types";

const queryClient = new QueryClient();

const KNOWN_LOCATIONS = [
  "Koramangala",
  "Indiranagar",
  "HSR Layout",
  "HSR",
  "Whitefield",
  "BTM",
  "JP Nagar",
  "MG Road",
  "Jayanagar",
  "Malleshwaram",
  "Bellandur",
  "Bannerghatta",
  "Church Street",
  "Brigade Road",
  "Marathahalli",
];

const KNOWN_CUISINES = [
  "Italian", "North Indian", "South Indian", "Chinese", "Continental",
  "Fast Food", "Biryani", "Cafe", "Mughlai", "Pizza", "Burger",
  "Japanese", "Thai", "Mexican", "Lebanese", "Street Food"
];

function parseNaturalLanguageQuery(query: string): UserPreferences {
  const lower = query.toLowerCase();

  // Extract location
  let detectedLocation = "";
  for (const loc of KNOWN_LOCATIONS) {
    if (lower.includes(loc.toLowerCase())) {
      detectedLocation = loc === "HSR" ? "HSR Layout" : loc;
      break;
    }
  }

  // Extract cuisine
  let detectedCuisine = "";
  for (const cuis of KNOWN_CUISINES) {
    if (lower.includes(cuis.toLowerCase())) {
      detectedCuisine = cuis;
      break;
    }
  }

  // Extract budget hints
  let detectedBudget: "low" | "medium" | "high" = "medium";
  if (lower.includes("cheap") || lower.includes("budget") || lower.includes("low") || lower.includes("pocket friendly")) {
    detectedBudget = "low";
  } else if (lower.includes("luxury") || lower.includes("expensive") || lower.includes("fine dine") || lower.includes("fine dining") || lower.includes("high")) {
    detectedBudget = "high";
  }

  // If no specific neighborhood detected, default to Bangalore (city-wide in backend)
  const location = detectedLocation || "Bangalore";

  return {
    location,
    budget: detectedBudget,
    cuisine: detectedCuisine,
    min_rating: 3.5,
    preferences: query.trim(),
  };
}

function getInitialPreferencesFromUrl(): UserPreferences | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const location = params.get("location");
  if (!location) return null;
  const budget = params.get("budget") as "low" | "medium" | "high" | null;
  return {
    location,
    budget: budget && ["low", "medium", "high"].includes(budget) ? budget : "medium",
    cuisine: params.get("cuisine") || "",
    min_rating: parseFloat(params.get("min_rating") || "3.5"),
    preferences: params.get("preferences") || "",
  };
}

function syncPreferencesToUrl(prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (prefs.location) params.set("location", prefs.location);
  if (prefs.budget) params.set("budget", prefs.budget);
  if (prefs.cuisine) params.set("cuisine", prefs.cuisine);
  if (prefs.min_rating) params.set("min_rating", String(prefs.min_rating));
  if (prefs.preferences) params.set("preferences", prefs.preferences);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

function AppContent() {
  const { mutate, data, isPending, isError, error, reset } = useRecommendations();
  const [quickQuery, setQuickQuery] = useState("");
  const [lastPrefs, setLastPrefs] = useState<UserPreferences | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Auto-load search from URL parameters on page load (shareable links)
  useEffect(() => {
    const urlPrefs = getInitialPreferencesFromUrl();
    if (urlPrefs) {
      setLastPrefs(urlPrefs);
      mutate(urlPrefs);
    }
  }, [mutate]);

  const handleSubmit = (prefs: UserPreferences) => {
    setLastPrefs(prefs);
    syncPreferencesToUrl(prefs);
    mutate(prefs);
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    const parsedPrefs = parseNaturalLanguageQuery(quickQuery);
    setLastPrefs(parsedPrefs);
    syncPreferencesToUrl(parsedPrefs);
    mutate(parsedPrefs);
    setMobileSearchOpen(false);
  };

  const handleShareLink = () => {
    if (!lastPrefs) return;
    syncPreferencesToUrl(lastPrefs);
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleResetSearch = () => {
    reset();
    setLastPrefs(null);
    setQuickQuery("");
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col selection:bg-[#FF334B]/30 selection:text-white">
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <header className="sticky top-0 z-50 w-full px-5 lg:px-8 py-3.5 flex items-center justify-between border-b border-[#232738]/80 bg-[#090A0F]/85 backdrop-blur-md shadow-2xl">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF334B] to-[#FF5E3A] flex items-center justify-center shadow-lg shadow-[#FF334B]/30 flex-shrink-0">
            <Flame size={22} className="text-white fill-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Zomato AI</span>
              <span className="w-2 h-2 rounded-full bg-[#FF334B] animate-pulse" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Intelligence Engine • Bengaluru
            </p>
          </div>
        </div>

        {/* Center: Quick Natural Language Search Bar (Desktop) */}
        <form
          onSubmit={handleQuickSearch}
          className="hidden md:flex flex-1 max-w-lg mx-6"
        >
          <div className="relative w-full group">
            <Search
              size={16}
              className="absolute left-3.5 top-3 text-slate-500 group-focus-within:text-[#FF334B] transition-colors"
            />
            <input
              type="text"
              placeholder="Ask Zomato AI (e.g. wood-fired pizza with craft beer in Indiranagar)..."
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              className="w-full bg-[#141620] border border-[#232738] rounded-full py-2 pl-10 pr-14 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF334B] focus:ring-1 focus:ring-[#FF334B]/30 transition-all"
            />
            <div className="absolute right-2.5 top-2 pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#1E2230] text-slate-400 border border-[#232738]">
                ⏎
              </kbd>
            </div>
          </div>
        </form>

        {/* Right: Engine Status Badges + Action Buttons */}
        <div className="flex items-center gap-2.5">
          {lastPrefs && (
            <button
              onClick={handleShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141620] border border-[#232738] hover:border-slate-500 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
              title="Copy shareable link"
            >
              {copiedShare ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={13} className="text-[#FF5E3A]" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
          )}

          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 rounded-xl bg-[#141620] border border-[#232738] text-slate-400 hover:text-white"
            aria-label="Toggle mobile search"
          >
            {mobileSearchOpen ? <X size={16} /> : <Search size={16} />}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141620] border border-emerald-500/30 text-emerald-400 text-xs shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-slate-100 font-medium">⚡ Groq LPU</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141620] border border-[#232738] text-slate-400 text-xs">
            <Database size={12} className="text-[#FF5E3A]" />
            <span>51,717 Venues</span>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar Dropdown */}
      {mobileSearchOpen && (
        <div className="md:hidden p-3 bg-[#0E1017] border-b border-[#232738]">
          <form onSubmit={handleQuickSearch} className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-3 text-slate-500"
            />
            <input
              type="text"
              autoFocus
              placeholder="e.g. craft beer in Indiranagar, cheap biryani..."
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              className="w-full bg-[#141620] border border-[#232738] rounded-full py-2 pl-10 pr-12 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF334B]"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-2.5 py-1 rounded-full bg-[#FF334B] text-white text-[11px] font-semibold"
            >
              Go
            </button>
          </form>
        </div>
      )}

      {/* ==================== MAIN WORKSPACE ==================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Preference Console (Sidebar) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <PreferenceForm
              onSubmit={handleSubmit}
              isLoading={isPending}
              initialValues={lastPrefs}
            />
          </div>

          {/* Right Column: Recommendations Stream */}
          <div className="lg:col-span-8 space-y-6">
            {/* Error Notification Banner */}
            {isError && (
              <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-6 flex gap-4 items-start shadow-xl">
                <AlertCircle size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base">Inference Engine Error</h3>
                  <p className="text-red-200 text-sm leading-relaxed">{error?.message}</p>
                  <button
                    onClick={handleResetSearch}
                    className="mt-3 text-xs text-red-400 hover:text-red-300 underline inline-flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw size={12} />
                    Reset &amp; Retry Query
                  </button>
                </div>
              </div>
            )}

            {/* In-Flight Skeleton / Loading State */}
            {isPending && (
              <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-[#141620] border border-[#232738] rounded-2xl" />
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-44 bg-[#141620] border border-[#232738] rounded-2xl p-6 flex flex-col justify-between"
                    >
                      <div className="flex justify-between">
                        <div className="h-6 w-40 bg-[#1E2230] rounded-full" />
                        <div className="h-6 w-20 bg-[#1E2230] rounded-full" />
                      </div>
                      <div className="h-4 w-3/4 bg-[#1E2230] rounded" />
                      <div className="h-12 w-full bg-[#090A0F] rounded-xl" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Recommendation Output */}
            {data && !isPending && lastPrefs && <RecommendationList data={data} prefs={lastPrefs} />}

            {/* Empty Initial Onboarding State */}
            {!data && !isPending && !isError && (
              <div className="border border-[#232738] rounded-2xl p-8 lg:p-12 text-center bg-[#141620]/60 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF334B]/20 to-[#FF5E3A]/20 border border-[#FF334B]/30 flex items-center justify-center mx-auto text-[#FF5E3A]">
                  <Flame size={32} />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h2 className="text-xl font-bold text-white">Ready for Bangalore Palate Discovery</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select your preferred neighborhood, set your dining budget, or type your desired vibes in the discovery console to trigger real-time AI ranking across 52k restaurants.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
                  <span className="px-3 py-1 rounded-full bg-[#090A0F] border border-[#232738]">
                    ⚡ Groq LPU Accelerated
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#090A0F] border border-[#232738]">
                    🎯 Anti-Hallucination Verified
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#090A0F] border border-[#232738]">
                    📍 100+ Bangalore Localities
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-[#232738]/60 py-6 text-center text-xs text-slate-500">
        <p>
          Dataset: <span className="text-slate-400">ManikaSaini/zomato-restaurant-recommendation</span> •
          Primary Model: <span className="text-[#FF5E3A] font-semibold">Groq (openai/gpt-oss-120b)</span> •
          Fallback: <span className="text-slate-400">Gemini (gemini-3.8-flash)</span>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
