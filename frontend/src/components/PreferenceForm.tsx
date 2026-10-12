import { useState } from "react";
import { MapPin, Wallet, UtensilsCrossed, Star, MessageSquare, Search } from "lucide-react";
import type { UserPreferences } from "../types";

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isLoading: boolean;
}

const CUISINES = [
  "", "North Indian", "South Indian", "Chinese", "Italian", "Continental",
  "Fast Food", "Street Food", "Biryani", "Mughlai", "Pizza", "Burger",
  "Japanese", "Thai", "Mexican", "Lebanese", "Cafe",
];

export function PreferenceForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<UserPreferences>({
    location: "",
    budget: "medium",
    cuisine: "",
    min_rating: 3.5,
    preferences: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserPreferences, string>>>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.location.trim()) newErrors.location = "Location is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Find Your Perfect Restaurant</h2>
        <p className="text-gray-500 text-sm">Powered by Gemini AI · Zomato Dataset</p>
      </div>

      {/* Location */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
          <MapPin size={16} className="text-red-500" />
          Location <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., Koramangala, Indiranagar, HSR, Whitefield, BTM"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
            errors.location ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
        />
        {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-xs text-gray-400 self-center mr-1">Popular:</span>
          {["Koramangala", "Indiranagar", "HSR", "Whitefield", "BTM", "JP Nagar", "MG Road"].map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setForm({ ...form, location: loc })}
              className="text-xs bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-600 px-2.5 py-1 rounded-full transition-colors"
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Wallet size={16} className="text-green-500" />
          Budget (for two)
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(["low", "medium", "high"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setForm({ ...form, budget: tier })}
              className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                form.budget === tier
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-200 text-gray-600 hover:border-orange-300"
              }`}
            >
              {tier === "low" ? "₹ Low (≤300)" : tier === "medium" ? "₹₹ Medium (300–700)" : "₹₹₹ High (700+)"}
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
          <UtensilsCrossed size={16} className="text-orange-500" />
          Cuisine
        </label>
        <select
          value={form.cuisine}
          onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          {CUISINES.map((c) => (
            <option key={c} value={c}>{c || "Any Cuisine"}</option>
          ))}
        </select>
      </div>

      {/* Min Rating */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Star size={16} className="text-yellow-500" />
          Minimum Rating: <span className="text-orange-600 font-bold">{form.min_rating}⭐</span>
        </label>
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={form.min_rating}
          onChange={(e) => setForm({ ...form, min_rating: parseFloat(e.target.value) })}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 (Any)</span><span>2.5</span><span>5.0 (Top)</span>
        </div>
      </div>

      {/* Preferences */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
          <MessageSquare size={16} className="text-blue-500" />
          Special Preferences <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          placeholder="e.g., outdoor seating, family-friendly, quick service, rooftop, date night..."
          value={form.preferences}
          onChange={(e) => setForm({ ...form, preferences: e.target.value })}
          rows={2}
          maxLength={300}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-base"
      >
        {isLoading ? (
          <>
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            Finding restaurants...
          </>
        ) : (
          <>
            <Search size={18} />
            Get AI Recommendations
          </>
        )}
      </button>
    </form>
  );
}
