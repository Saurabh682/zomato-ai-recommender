import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertCircle, UtensilsCrossed } from "lucide-react";
import { PreferenceForm } from "./components/PreferenceForm";
import { RecommendationList } from "./components/RecommendationList";
import { useRecommendations } from "./hooks/useRecommendations";

const queryClient = new QueryClient();

function AppContent() {
  const { mutate, data, isPending, isError, error, reset } = useRecommendations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="bg-orange-500 text-white p-2 rounded-xl">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-none">Zomato AI</h1>
            <p className="text-xs text-gray-500">Powered by Gemini · 52k restaurants</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <PreferenceForm onSubmit={mutate} isLoading={isPending} />

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex gap-3 items-start">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-800">Something went wrong</p>
              <p className="text-red-700 text-sm mt-1">{error?.message}</p>
              <button
                onClick={reset}
                className="mt-2 text-sm text-red-600 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {data && <RecommendationList data={data} />}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400">
        Dataset: ManikaSaini/zomato-restaurant-recommendation (HuggingFace) · LLM: Gemini gemini-3.8-flash
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
