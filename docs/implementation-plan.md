# 📋 Phase-Wise Implementation Plan
# Zomato AI Restaurant Recommendation System

> **Derived from**: [`architecture.md`](./architecture.md) · [`problemStatement.md`](./problemStatement.md)

---

## Plan at a Glance

```
Phase 0 ──▶ Project Setup, Context & Environment Baseline
Phase 1 ──▶ Data Ingestion & Preprocessing       (DataLoader & Cache)
Phase 2 ──▶ User Input & Candidate Filtering     (Filterer Pipeline)
Phase 3 ──▶ LLM Integration & Recommendations   (PromptBuilder + LLM Client)
Phase 4 ──▶ Backend REST API Service Layer       (FastAPI + Pydantic + CORS)
Phase 5 ──▶ Frontend UI & Output Display         (React + Vite + Tailwind)
Phase 6 ──▶ Integration, Robustness & Evaluation (E2E Tests & Edge Cases)
```

| Phase | Name | Key Output | Estimated Time |
|---|---|---|---|
| 0 | Project Setup, Context & Environment | Docs, repo, venv, deps, `.env`, Vite scaffold | 30 min |
| 1 | Data Ingestion & Preprocessing | `DataLoader`, schema validation, clean DataFrame | 1 hr |
| 2 | User Input & Candidate Filtering | `Filterer`, 5-step mask, capping & ranking | 1 hr |
| 3 | LLM Integration & Recommendations | `PromptBuilder`, `LLM Client`, Groq/Gemini calls | 1 hr |
| 4 | Backend REST API Service Layer | FastAPI endpoints, Pydantic schemas, CORS | 1 hr |
| 5 | Frontend UI & Output Display | React form, cards, TanStack Query, Tailwind | 2 hr |
| 6 | Integration, Robustness & Evaluation | Full pipeline verified, edge cases, benchmarks | 1 hr |

**Total**: ~7.5 hours

---

## Phase 0 — Project Setup, Context & Environment Baseline

**Goal**: Establish the complete documentation context, repository structure, install all backend and frontend dependencies, configure environment secrets (`.env`), and verify a clean baseline before writing core business logic.

### 0.1 Context Setup & Specification Artifacts

Generate and maintain the core documentation artifacts in the `docs/` folder:
- `docs/problemStatement.txt`: Raw brief and requirements.
- `docs/problemStatement.md`: Rich project context, objectives, dataset, and technology stack.
- `docs/architecture.md`: 3-tier architecture, data flow diagrams, sequence flows, API contracts.
- `docs/implementation-plan.md`: Phase-wise roadmap with tasks, code snippets, and acceptance criteria.
- `docs/edge-case.md`: Corner scenarios across data, filters, LLM, API, UI, and system operations.
- `docs/eval.md`: Quantitative and qualitative evaluation framework for each phase.

---

### 0.2 Version Control & Repository Scaffolding

Initialize Git version control and enforce strict ignore rules to safeguard credentials (`.env`), virtual environments (`.venv`), and local dataset caches:

```bash
git init
```

`.gitignore` configuration:
```gitignore
backend/.venv/
backend/__pycache__/
backend/**/__pycache__/
backend/.data_cache.csv
backend/*.pyc
backend/.env
.env
*.env
frontend/node_modules/
frontend/dist/
.DS_Store
*.log
```

---

### 0.3 Folder Structure Scaffolding

```
zomato-ai-recommender/
├── docs/
├── backend/
│   ├── models/
│   ├── routers/
│   └── services/
└── frontend/       ← scaffolded via Vite
```

**Commands:**
```bash
mkdir zomato-ai-recommender
cd zomato-ai-recommender
mkdir -p backend/models backend/routers backend/services docs
```

---

### 0.4 Backend — Python Virtual Environment & Dependencies

```bash
cd backend
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Mac / Linux)
source .venv/bin/activate
```

**`requirements.txt`:**
```
datasets>=2.19.0
pandas>=2.2.0
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
google-genai>=2.25.0
groq>=0.9.0
python-dotenv>=1.0.0
pydantic>=2.7.0
httpx>=0.27.0
```

```bash
pip install -r requirements.txt
```

---

### 0.5 Backend — Environment Configuration

Create `backend/.env` (never commit this):
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
MAX_CANDIDATES=400
PORT=8000
```

Create `backend/config.py`:
```python
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
HF_DATASET_ID: str = "ManikaSaini/zomato-restaurant-recommendation"
MAX_CANDIDATES: int = 400
BUDGET_RANGES: dict = {
    "low":    (0, 300),
    "medium": (301, 700),
    "high":   (701, 99_999),
}
```

---

### 0.6 Frontend — Vite + React Scaffold

```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @tanstack/react-query lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

Update `frontend/src/index.css`:
```css
@import "tailwindcss";
```

Update `frontend/vite.config.ts` — add Tailwind plugin + `/api` proxy:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
  }
})
```

---

### 0.7 Create Package Init Files

```bash
# In backend/
touch models/__init__.py routers/__init__.py services/__init__.py
```

---

### Phase 0 — Acceptance Criteria

| Check | How to Verify |
|---|---|
| Context docs complete | All 6 files in `docs/` exist and match project specs |
| Git repo initialized | `git status` shows active repo with `.gitignore` |
| Python venv active | `which python` points to `.venv` |
| All packages installed | `pip show fastapi groq google-genai pandas datasets` shows versions |
| `config.py` loads API keys | `python -c "from config import GROQ_MODEL; print(GROQ_MODEL)"` exits 0 |
| Vite dev server builds | `npm run build` exits 0 without errors |
| No import errors | `python -c "import fastapi, pandas, google.genai, groq, datasets"` exits 0 |

---

## Phase 1 — Data Ingestion & Preprocessing

**Goal**: Implement `DataLoader` (HuggingFace → clean Pandas DataFrame) with local CSV caching, type coercion, and schema verification. This is the **data foundation layer**.

**Reference**: Architecture §3 Step 1, §4 `data_loader.py`

---

### 1.1 Implement `services/data_loader.py`

**Responsibilities:**
- Load dataset from HuggingFace on first run; save local CSV cache at `.data_cache.csv`
- Subsequent startups: load from local cache in < 5 seconds
- Clean all columns: cost comma stripping, rating conversion ("4.1/5", "NEW", "-" → float), votes coercion
- Compute composite ranking signal `_score = aggregate_rating * log10(votes + 1)`
- Validate required schema columns exist

**Required columns to validate:**
```python
REQUIRED_COLUMNS = {
    "name", "location", "cuisines",
    "approx_cost(for two people)",
    "aggregate_rating", "votes"
}
```

---

### Phase 1 — Acceptance Criteria

| Check | Expected Result |
|---|---|
| Dataset Volume | `len(DataLoader.get_df()) >= 50,000` |
| Cost column dtype | `int64` (no commas, no NaN, min >= 0) |
| Rating column dtype | `float64` (clean 0.0 - 5.0 range) |
| `_score` column exists | `True` (numeric composite score) |
| `.data_cache.csv` created | Cached locally for fast startup |
| Fast reload | Subsequent reloads execute in < 6 seconds |

---

## Phase 2 — User Input & Candidate Filtering

**Goal**: Validate user input constraints (`models/schemas.py`) and implement the multi-criteria `Filterer` pipeline (`services/filterer.py`) to narrow ~52k records down to ≤ 400 top-ranked candidate restaurants.

**Reference**: Architecture §3 Step 2, §4 `filterer.py` and `schemas.py`, `edge-case.md` (EC-FLT)

---

### 2.1 User Input Validation & Sanitization (`models/schemas.py`)

- `location`: Required string (1–100 chars), whitespace-stripped and sanitized against XSS/injections.
- `budget`: Strict enum (`"low"`, `"medium"`, `"high"`).
- `cuisine`: Optional string (up to 100 chars).
- `min_rating`: Float bounded strictly between `0.0` and `5.0`.
- `preferences`: Optional free-text up to 300 chars, sanitized.

---

### 2.2 Implement `services/filterer.py`

**Filter pipeline execution:**
```
Step 1 — Location  : Case-insensitive substring match (city-wide for 'Bangalore'/'Bengaluru')
Step 2 — Budget    : Strict interval matching based on BUDGET_RANGES
Step 3 — Cuisine   : Case-insensitive substring match in cuisines column
Step 4 — Min Rating: aggregate_rating >= min_rating
Step 5 — Ranking   : Sort by _score descending, cap at MAX_CANDIDATES (400)
```

**Signature:**
```python
def filter_restaurants(
    df: pd.DataFrame,
    location: str,
    budget: str,        # "low" | "medium" | "high"
    cuisine: str,
    min_rating: float,
) -> pd.DataFrame:
```

---

### 2.3 Unit & Integration Tests (`tests/test_phase2_filterer.py`)

Run pytest suite:
```bash
python -m pytest -v tests/test_phase2_filterer.py
```

---

### Phase 2 — Acceptance Criteria

| Check | Expected Result | Status |
|---|---|:---:|
| Budget boundaries | Low: `max(cost) <= 300`, Med: `301 <= cost <= 700`, High: `min(cost) >= 701` | ✅ Verified |
| Location substring | `location="Koramangala"` matches 100% case-insensitively | ✅ Verified |
| City-wide fallback | `location="Bangalore"` searches city-wide without error | ✅ Verified |
| Rating filter | `min_rating=4.0` returns only `aggregate_rating >= 4.0` | ✅ Verified |
| Candidate cap & sort | Broad queries return `len <= 400` sorted descending by `_score` | ✅ Verified |
| Zero-result safety | Over-constrained queries return empty DataFrame without crashing | ✅ Verified |
| Input validation | Out-of-bounds ratings (>5.0 or <0.0) rejected with ValidationError | ✅ Verified |
| Test suite | 10/10 pytest test cases passing | ✅ Verified |

---

## Phase 3 — LLM Integration

**Goal**: Implement `PromptBuilder` (formats the filtered data into a Gemini prompt) and `LLM Client` (calls Gemini API, parses JSON output, handles failures). This is the **AI reasoning layer**.

**Reference**: Architecture §3 Steps 3–5, §4 `prompt_builder.py` and `llm_client.py`, §7 Prompt Design

---

### 3.1 Implement `services/prompt_builder.py`

**Two components:**

**A) `SYSTEM_INSTRUCTION` (static string)**
```
Role: Expert restaurant recommendation assistant for India.
Rules:
  1. Only recommend from the provided candidate list
  2. Respond ONLY with valid JSON array — no markdown fences
  3. Return min(5, total_candidates) objects
  4. Required keys per object:
     name, location, cuisine, rating, cost_for_two,
     online_order, book_table, explanation (2-3 sentences)
  5. Rank by best overall fit, not just rating
```

**B) `build_prompt(candidates, location, budget, cuisine, min_rating, preferences)` → `str`**

Structure of the returned string:
```
## User Preferences
- Location: {location or "Any"}
- Budget: {tier} (₹{range} for two)
- Cuisine: {cuisine or "Any"}
- Minimum Rating: {min_rating}
- Special Preferences: {preferences}   ← omit line if empty

## Candidate Restaurants ({N} options)
Format: name | location | cuisines | cost_for_two | rating | votes | online_order | book_table

{row per restaurant, pipe-delimited}

Return ONLY the JSON array. No explanation outside the JSON.
```

---

### 3.2 Implement `services/llm_client.py`

**Key functions:**

**A) `get_recommendations(candidates, location, budget, cuisine, min_rating, preferences)`**

```
Returns: (list[dict], is_fallback: bool)
```

**Provider Waterfall & Retry Flow:**
```
Primary Provider (Groq - openai/gpt-oss-120b):
  build prompt → call Groq → parse JSON → normalize & anti-hallucination check
  ✓ return (recommendations, False)
  ✗ on error/rate limit → Attempt 2 (or switch provider)

Secondary Provider (Google Gemini - gemini-3.8-flash, if configured):
  ✓ return (recommendations, False)
  ✗ on error → Fallback to Heuristic

Tertiary Fallback (Deterministic Heuristic):
  return (_heuristic_top5(candidates), True)
```

**B) `_parse_llm_json(raw: str) -> list[dict]`**
```python
# Strip markdown fences and parse safely without throwing JSONDecodeError
cleaned = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
try:
    data = json.loads(cleaned)
    return data if isinstance(data, list) else data.get("recommendations", [])
except Exception:
    return []
```

**C) `_normalize_recommendations(recommendations, candidates) -> list[dict]`**
```python
# Discard hallucinated names (case-insensitive lookup against candidate DataFrame)
# Coerce fields into strict schema types (rating: float, cost_for_two: int, etc.)
```

**D) `_heuristic_top5(candidates) -> list[dict]`**
```python
# Sort by _score, take top 5, attach canned explanation noting fallback
top = candidates.nlargest(5, "_score")
```

**Groq API Call Config:**
```python
client = Groq(api_key=GROQ_API_KEY)
completion = client.chat.completions.create(
    model=GROQ_MODEL,  # "openai/gpt-oss-120b"
    messages=[
        {"role": "system", "content": SYSTEM_INSTRUCTION},
        {"role": "user", "content": prompt},
    ],
    temperature=0.3,
    max_tokens=2048,
    response_format={"type": "json_object"},
)
```

---

### 3.3 Smoke Test the LLM Layer

```python
# test_llm.py (scratch file)
from services.data_loader import DataLoader
from services.filterer import filter_restaurants
from services.llm_client import get_recommendations

df = DataLoader.get_df()
candidates = filter_restaurants(df, "Koramangala", "medium", "Italian", 3.5)
print(f"Candidates: {len(candidates)}")

recs, fallback = get_recommendations(
    candidates, "Koramangala", "medium", "Italian", 3.5, "outdoor seating"
)
print(f"Fallback used: {fallback}")
for i, r in enumerate(recs, 1):
    print(f"\n#{i} {r['name']} ({r['rating']}⭐ ₹{r['cost_for_two']})")
    print(f"   {r['explanation'][:100]}...")
```

---

### Phase 3 — Acceptance Criteria

| Check | Expected Result | Status |
|---|---|---|
| `build_prompt()` output | Contains "## User Preferences" + pipe-delimited restaurant rows | Passed |
| LLM returns valid JSON | `isinstance(result, list)` → `True` | Passed |
| All required keys present | `name, location, cuisine, rating, cost_for_two, online_order, book_table, explanation` | Passed |
| `len(recommendations)` | `1 ≤ N ≤ 5` | Passed |
| No hallucinated names | All returned names exist in `candidates["name"]` values | Passed |
| Malformed JSON fallback | Mock LLM to return `"invalid json"` → heuristic top-5 returned | Passed |
| Explanation length | Each explanation is 2–3 sentences (roughly 50–200 chars) | Passed |
| Fallback flag | `is_fallback=True` when LLM fails both attempts | Passed |

---

## Phase 4 — Backend API

**Goal**: Expose a fully-functional FastAPI REST API that orchestrates the complete end-to-end pipeline (DataLoader → Filterer → LLM Client powered by **Groq `openai/gpt-oss-120b`** as primary provider, with Gemini secondary fallback, and deterministic heuristic top-5 fallback) behind a single `POST /api/recommend` endpoint with proper validation, error handling, and CORS.

**Reference**: Architecture §4 `schemas.py`, `recommend.py`, `main.py`, §6 API Contract

---

### 4.1 Implement `models/schemas.py`

Define three Pydantic models:

**`UserPreferences`** (request body):
```python
class UserPreferences(BaseModel):
    location:    str    # required, 1–100 chars, sanitized
    budget:      Literal["low", "medium", "high"]
    cuisine:     str    # optional, max 100 chars
    min_rating:  float  # 0.0–5.0, default 0.0
    preferences: str    # optional, max 300 chars

    @field_validator("location", "cuisine", "preferences", mode="before")
    def sanitize_string(cls, v):
        # Strip: < > " ' % ; ( ) & +
        import re
        return re.sub(r"[<>\"'%;()&+]", "", str(v)).strip()
```

**`RestaurantRecommendation`** (nested in response):
```python
class RestaurantRecommendation(BaseModel):
    name:         str
    location:     str
    cuisine:      str
    rating:       float
    cost_for_two: int
    online_order: bool = False
    book_table:   bool = False
    explanation:  str
```

**`RecommendationResponse`** (response body):
```python
class RecommendationResponse(BaseModel):
    recommendations:    list[RestaurantRecommendation]
    total_filtered:     int
    processing_time_ms: int
    llm_fallback:       bool = False
    message:            str = ""
```

---

### 4.2 Implement `routers/recommend.py`

**`POST /api/recommend`** — pipeline:
```
1. Record start time
2. df = DataLoader.get_df()
3. candidates = filter_restaurants(df, ...)
4. if candidates.empty:
     return RecommendationResponse(recommendations=[], message="No restaurants found for the selected criteria.")
5. recs, is_fallback = get_recommendations(
       candidates,
       location=prefs.location,
       budget=prefs.budget,
       cuisine=prefs.cuisine,
       min_rating=prefs.min_rating,
       preferences=prefs.preferences
   )
   # get_recommendations uses Groq (openai/gpt-oss-120b) as primary LLM.
   # Falls back to Gemini or Heuristic top-5 on API errors / rate limits.
6. if is_fallback:
     response.headers["X-LLM-Fallback"] = "true"
7. Return RecommendationResponse(
       recommendations=recs,
       total_filtered=len(candidates),
       processing_time_ms=elapsed_ms,
       llm_fallback=is_fallback
   )
```

---

### 4.3 Implement `main.py`

```python
@asynccontextmanager
async def lifespan(app):
    DataLoader.get_df()   # pre-load dataset at startup
    yield

app = FastAPI(title="Zomato AI Recommender", lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

app.include_router(recommend_router)

@app.get("/health")
def health():
    return {"status": "ok", "dataset_loaded": DataLoader.is_loaded(), "dataset_size": len(DataLoader.get_df())}
```

---

### 4.4 Start and Test the Backend

```bash
# In backend/ with venv active
uvicorn main:app --reload --port 8000
```

**Manual test with curl (verifying Groq LLM inference):**
```bash
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"location":"Koramangala","budget":"medium","cuisine":"Italian","min_rating":3.5}'
```

**Verify in backend logs:**
```
INFO: Calling Groq LLM (attempt 1)...
INFO: Groq returned 5 valid recommendations
```

**Interactive Swagger UI:** http://localhost:8000/docs

---

### Phase 4 — Acceptance Criteria

| Check | Expected Result | Status |
|---|---|---|
| `GET /health` | HTTP 200 · `{"status":"ok","dataset_loaded":true}` | Passed |
| `POST /api/recommend` (valid) | HTTP 200 · 5 recommendations generated by Groq LLM with explanations | Passed |
| `POST /api/recommend` (no match) | HTTP 200 · `{"recommendations":[],"message":"No restaurants found..."}` | Passed |
| `min_rating: 6.0` | HTTP 422 Unprocessable Entity | Passed |
| Missing `location` field | HTTP 422 | Passed |
| `processing_time_ms` | Present in every response, value < 15000 | Passed |
| `llm_fallback` flag | `false` when Groq succeeds; `true` + `X-LLM-Fallback: true` header when fallback used | Passed |
| Swagger UI `/docs` | All fields documented with correct types | Passed |
| CORS header | `Access-Control-Allow-Origin: http://localhost:5173` on responses | Passed |

---

## Phase 5 — Frontend UI

**Goal**: Build a polished React SPA with a preference form and recommendation cards, connected to the backend via TanStack Query.

**Reference**: Architecture §5 Component Architecture, §5 State Management

---

### 5.1 Create TypeScript Types

**`src/types/index.ts`:**
```typescript
export interface UserPreferences {
  location: string;
  budget: "low" | "medium" | "high";
  cuisine: string;
  min_rating: number;
  preferences: string;
}

export interface RestaurantRecommendation {
  name: string;
  location: string;
  cuisine: string;
  rating: number;
  cost_for_two: number;
  online_order: boolean;
  book_table:   boolean;
  explanation:  string;
}

export interface RecommendationResponse {
  recommendations:    RestaurantRecommendation[];
  total_filtered:     number;
  processing_time_ms: number;
  llm_fallback:       boolean;
  message:            string;
}
```

---

### 5.2 Create API Client

**`src/lib/api.ts`:**
```typescript
export async function fetchRecommendations(
  prefs: UserPreferences
): Promise<RecommendationResponse> {
  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

---

### 5.3 Create TanStack Query Hook

**`src/hooks/useRecommendations.ts`:**
```typescript
import { useMutation } from "@tanstack/react-query";

export function useRecommendations() {
  return useMutation<RecommendationResponse, Error, UserPreferences>({
    mutationFn: fetchRecommendations,
  });
}
```

---

### 5.4 Build `PreferenceForm` Component

**`src/components/PreferenceForm.tsx`**

Fields to implement:
| Field | Input Type | Validation |
|---|---|---|
| Location | `<input type="text">` | Required, non-empty |
| Budget | 3-button toggle | Default: `medium` |
| Cuisine | `<select>` dropdown (17 options) | Optional |
| Min Rating | `<input type="range" min=0 max=5 step=0.5>` | Default: 3.5 |
| Preferences | `<textarea maxLength=300>` | Optional |
| Submit | `<button>` | Disabled + spinner while `isPending` |

Client-side validation:
```
- Location empty → show inline error, block submit
- No API call while form is invalid
```

---

### 5.5 Build `RecommendationCard` Component

**`src/components/RecommendationCard.tsx`**

Card layout:
```
┌─ Gradient header (orange→red) ───────────────────────┐
│  #N badge (gold/#1, silver/#2, bronze/#3)             │
│  Feature pills: [Online Order]  [Book Table]          │
├───────────────────────────────────────────────────────┤
│  Restaurant Name (bold, large)                        │
│  Cuisine (orange, medium)                             │
│  📍 Location                                          │
│  ⭐ Rating   ₹ Cost for two                           │
├─ AI Explanation box (orange-50 bg) ───────────────────┤
│  🤖 icon + explanation text (truncated 280 chars)     │
│  ⚠ "Heuristic fallback" note (if llm_fallback=true)  │
└───────────────────────────────────────────────────────┘
```

---

### 5.6 Build `RecommendationList` Component

**`src/components/RecommendationList.tsx`**

States to handle:
```
1. Zero results → warning box with message from API
2. Has results  → stats bar + responsive card grid
```

Stats bar content: `{total_filtered} restaurants matched · {processing_time_ms}ms · [AI Fallback badge if llm_fallback]`

Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

### 5.7 Wire `App.tsx`

```
App
├── Wrap with <QueryClientProvider client={queryClient}>
├── <header> — logo + tagline
├── <PreferenceForm onSubmit={mutate} isLoading={isPending} />
├── {isError} → <ErrorBanner message={error.message} onRetry={reset} />
└── {data} → <RecommendationList data={data} />
```

---

### Phase 5 — Acceptance Criteria

| Check | Expected Result |
|---|---|
| `npm run build` exits 0 | TypeScript compiles, Vite bundles successfully |
| Form renders | All 5 inputs + submit button visible at `localhost:5173` |
| Empty location submit | Inline error shown; no network request fired |
| Loading state | Spinner visible in submit button while request in flight |
| Success state | 5 recommendation cards rendered with all fields |
| Zero result state | Yellow warning box with API message |
| Error state | Red error box with retry link |
| Responsive layout | 1 col on mobile, 2 on tablet, 3 on desktop |
| No console errors | Browser devtools shows no JS errors or undefined fields |

---

## Phase 6 — Integration & End-to-End Testing

**Goal**: Verify the complete pipeline works end-to-end across diverse real-world scenarios. Handle edge cases from the `edge-case.md` and satisfy the evaluation criteria from `eval.md`.

**Reference**: Architecture §9 Sequence Diagram, `edge-case.md`, `eval.md`

---

### 6.1 End-to-End Scenario Tests

Run each scenario manually through the UI:

| # | Scenario | Input | Expected |
|---|---|---|---|
| E2E-1 | Budget meal Bangalore | `{location:"Koramangala", budget:"low", cuisine:"South Indian", min_rating:3.5}` | 5 South Indian restaurants, cost ≤₹300 |
| E2E-2 | High-end Delhi | `{location:"Connaught Place", budget:"high", cuisine:"Continental", min_rating:4.0}` | 5 upscale restaurants, cost >₹700 |
| E2E-3 | Typo tolerance | `{location:"bangalor", cuisine:"chinese"}` | Returns results (partial match works) |
| E2E-4 | No results | `{location:"Shimla", cuisine:"Japanese", min_rating:4.5, budget:"low"}` | Empty state with friendly message |
| E2E-5 | Free-text preferences | `{location:"Bandra", cuisine:"Italian", preferences:"rooftop, date night"}` | Explanations mention ambience/views |
| E2E-6 | Any cuisine | `{location:"Delhi", budget:"medium", cuisine:"", min_rating:4.0}` | Mixed cuisines returned, all ≥4.0 |

---

### 6.2 Edge Case Verification

| Edge Case | How to Trigger | Expected Behaviour |
|---|---|---|
| Non-numeric cost rows | Inspect filtered DataFrame for cost=0 rows | Included (treated as unknown cost) |
| LLM JSON in fences | Mock LLM → return ` ```json [...] ``` ` | Fences stripped, JSON parsed correctly |
| Fewer than 5 candidates | `{location:"Specific Area", cuisine:"Rare"}` | API returns 1–4 cards, no crash |
| Gemini timeout | Disconnect internet mid-test | Fallback used, `X-LLM-Fallback: true` header set |
| Input with special chars | `location: "<script>alert(1)</script>"` | Sanitized, no XSS, query runs safely |

---

### 6.3 Performance Check

```bash
# Measure end-to-end latency
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"location":"Delhi","budget":"medium","cuisine":"North Indian","min_rating":3.5}' \
  -w "\nTime: %{time_total}s\n"
```

**Target**: Total response time < 15 seconds (including Gemini LLM call).

---

### 6.4 Final Checklist

```
Setup
  [ ] .env configured with valid GEMINI_API_KEY
  [ ] Backend starts with no errors (dataset loads on startup)
  [ ] Frontend starts and connects to backend via /api proxy

Data Layer
  [ ] .data_cache.csv created after first run
  [ ] Subsequent backend restarts use cache (fast, < 3s)
  [ ] Filter returns correct subsets for all 4 filter types

LLM Layer
  [ ] Gemini returns structured JSON for typical inputs
  [ ] No hallucinated restaurant names in results
  [ ] Fallback triggers and returns gracefully

API Layer
  [ ] GET /health returns dataset_loaded: true
  [ ] POST /api/recommend returns 5 results for typical inputs
  [ ] Zero-result case returns 200 with empty array + message
  [ ] Invalid inputs return 422 with descriptive errors

Frontend
  [ ] Form validation blocks empty-location submit
  [ ] Loading spinner visible during API call
  [ ] All 5 cards render with name, cuisine, rating, cost, explanation
  [ ] Error state shows retry option
  [ ] Responsive layout works on mobile screen

End-to-End
  [ ] 5 diverse E2E scenarios pass (see 6.1)
  [ ] Processing time < 15s for all scenarios
  [ ] No unhandled errors in browser console or server logs
```

---

### Phase 6 — Acceptance Criteria

| Check | Expected Result |
|---|---|
| All 6 E2E scenarios | Relevant, plausible recommendations returned |
| Fallback scenario | Heuristic results returned, `llm_fallback: true` in response |
| Zero-result scenario | Empty recommendations + descriptive message |
| Processing time | `processing_time_ms < 15000` for every request |
| No console errors | Clean browser devtools, no undefined/null rendering errors |

---

## Dependency Map Between Phases

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (DataLoader + Filterer)
    │
    ├──▶ Phase 3 (PromptBuilder + LLM Client)
    │         │
    │         ▼
    └────────▶ Phase 4 (FastAPI Backend)
                    │
                    ▼
              Phase 5 (React Frontend)
                    │
                    ▼
              Phase 6 (Integration Testing)
```

> [!IMPORTANT]
> Each phase depends on the previous. Do not start Phase 3 until the `DataLoader` and `Filterer` are verified working (Phase 2 acceptance criteria met). Do not start Phase 5 until `GET /health` and `POST /api/recommend` return correct responses (Phase 4 acceptance criteria met).

---

## File Creation Order

| Order | File | Phase |
|---|---|---|
| 1 | `backend/config.py` | 1 |
| 2 | `backend/requirements.txt` | 1 |
| 3 | `backend/.env` | 1 |
| 4 | `backend/services/data_loader.py` | 2 |
| 5 | `backend/services/filterer.py` | 2 |
| 6 | `backend/services/prompt_builder.py` | 3 |
| 7 | `backend/services/llm_client.py` | 3 |
| 8 | `backend/models/schemas.py` | 4 |
| 9 | `backend/routers/recommend.py` | 4 |
| 10 | `backend/main.py` | 4 |
| 11 | `frontend/vite.config.ts` | 1 |
| 12 | `frontend/src/types/index.ts` | 5 |
| 13 | `frontend/src/lib/api.ts` | 5 |
| 14 | `frontend/src/hooks/useRecommendations.ts` | 5 |
| 15 | `frontend/src/components/PreferenceForm.tsx` | 5 |
| 16 | `frontend/src/components/RecommendationCard.tsx` | 5 |
| 17 | `frontend/src/components/RecommendationList.tsx` | 5 |
| 18 | `frontend/src/App.tsx` | 5 |
