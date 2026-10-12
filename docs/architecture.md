# 🏗️ Architecture — Zomato AI Restaurant Recommendation System

> **Derived from**: [`problemStatement.md`](./problemStatement.md)

---

## 1. Architecture Overview

The system follows a **3-tier architecture** with an AI integration layer sitting between the data tier and the presentation tier. The central design principle is: **filter first (structured data), reason second (LLM)** — keeping the LLM focused on a curated shortlist rather than brute-forcing 52,000 rows.

```
╔══════════════════════════════════════════════════════════════════════╗
║                        PRESENTATION TIER                            ║
║                                                                      ║
║   ┌─────────────────────────────────────────────────────────────┐   ║
║   │                  React SPA  (Vite + Tailwind)               │   ║
║   │                                                             │   ║
║   │  ┌──────────────────┐       ┌──────────────────────────┐   │   ║
║   │  │  PreferenceForm  │──────▶│    RecommendationList    │   │   ║
║   │  │  · Location      │       │  ┌────────────────────┐  │   │   ║
║   │  │  · Budget        │       │  │ RecommendationCard │  │   │   ║
║   │  │  · Cuisine       │       │  │  #1 · #2 · #3 ...  │  │   │   ║
║   │  │  · Min Rating    │       │  └────────────────────┘  │   │   ║
║   │  │  · Preferences   │       └──────────────────────────┘   │   ║
║   │  └──────────────────┘                                       │   ║
║   │            │  TanStack Query useMutation                    │   ║
║   └────────────┼────────────────────────────────────────────────┘   ║
╚════════════════╪═════════════════════════════════════════════════════╝
                 │  HTTP POST /api/recommend
                 │  HTTP GET  /health
                 ▼
╔══════════════════════════════════════════════════════════════════════╗
║                         APPLICATION TIER                            ║
║                                                                      ║
║   ┌──────────────────────────────────────────────────────────────┐  ║
║   │                    FastAPI Backend                           │  ║
║   │                                                              │  ║
║   │  ┌────────────┐   ┌────────────┐   ┌──────────────────────┐ │  ║
║   │  │ DataLoader │──▶│  Filterer  │──▶│   PromptBuilder      │ │  ║
║   │  │            │   │            │   │                      │ │  ║
║   │  │ 52k rows   │   │ ≤400 rows  │   │ System instruction + │ │  ║
║   │  │ cached     │   │ scored &   │   │ TSV candidate table  │ │  ║
║   │  │ DataFrame  │   │ capped     │   └──────────┬───────────┘ │  ║
║   │  └────────────┘   └────────────┘              │             │  ║
║   │                                               ▼             │  ║
║   │                                   ┌───────────────────────┐ │  ║
║   │                                   │     LLM Client        │ │  ║
║   │                                   │  gemini-3.8-flash     │ │  ║
║   │                                   │  JSON structured out  │ │  ║
║   │                                   │  retry + fallback     │ │  ║
║   │                                   └──────────┬────────────┘ │  ║
║   │                                              │              │  ║
║   │                                   ┌──────────▼────────────┐ │  ║
║   │                                   │  ResponseParser       │ │  ║
║   │                                   │  JSON → Pydantic      │ │  ║
║   │                                   │  hallucination check  │ │  ║
║   │                                   └───────────────────────┘ │  ║
║   └──────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
                 │
                 ▼  google-genai SDK (HTTPS)
╔══════════════════════════════════════════════════════════════════════╗
║                          EXTERNAL SERVICES                          ║
║                                                                      ║
║   ┌─────────────────────┐       ┌──────────────────────────────┐   ║
║   │   Google Gemini API │       │   HuggingFace Hub            │   ║
║   │   gemini-3.8-flash  │       │   ManikaSaini/zomato-...     │   ║
║   │   (LLM inference)   │       │   (dataset, first run only)  │   ║
║   └─────────────────────┘       └──────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 2. Folder Structure

### Backend
```
backend/
├── main.py                   # FastAPI app, CORS, lifespan (dataset preload)
├── config.py                 # Reads GEMINI_API_KEY, budget ranges, model name
├── requirements.txt          # Python dependencies
├── .env                      # GEMINI_API_KEY (not committed)
├── .env.example              # Template for .env
├── .data_cache.csv           # Local CSV cache (auto-generated, not committed)
│
├── models/
│   └── schemas.py            # Pydantic: UserPreferences, RecommendationResponse
│
├── routers/
│   └── recommend.py          # POST /api/recommend + GET /health
│
└── services/
    ├── data_loader.py        # HuggingFace → Pandas DataFrame + caching
    ├── filterer.py           # 5-step filter pipeline, caps at MAX_CANDIDATES
    ├── prompt_builder.py     # Assembles system instruction + TSV prompt
    └── llm_client.py        # Gemini API wrapper, retry, fallback, anti-hallucination
```

### Frontend
```
frontend/
├── index.html
├── vite.config.ts            # Vite + Tailwind plugin + /api proxy → :8000
├── package.json
├── tsconfig.json
│
└── src/
    ├── main.tsx              # React root, QueryClientProvider
    ├── App.tsx               # Layout: header + form + results + error
    ├── index.css             # @import "tailwindcss"
    │
    ├── types/
    │   └── index.ts          # UserPreferences, RestaurantRecommendation, RecommendationResponse
    │
    ├── lib/
    │   └── api.ts            # fetch wrapper → POST /api/recommend
    │
    ├── hooks/
    │   └── useRecommendations.ts  # TanStack Query useMutation hook
    │
    └── components/
        ├── PreferenceForm.tsx      # Controlled form, client-side validation
        ├── RecommendationCard.tsx  # Single restaurant card (rank, name, cuisine, rating, cost, explanation)
        └── RecommendationList.tsx  # Stats bar + responsive card grid
```

---

## 3. Detailed Data Flow

### Step 1 — Dataset Ingestion (Startup, Once)

```
HuggingFace Hub
  ManikaSaini/zomato-restaurant-recommendation
        │
        │  datasets.load_dataset()  [first run ~2 min]
        ▼
  Raw Dataset (52,000 rows)
        │
        │  DataLoader._clean()
        │   · cost col: "1,200" → 1200  (strip commas, coerce int)
        │   · rating:   "NEW" → 0.0     (coerce float, fillna 0.0)
        │   · votes:    NaN  → 0        (coerce int)
        │   · strings:  strip whitespace, fillna ""
        │   · _score:   rating × log10(votes + 1)   [ranking signal]
        ▼
  Clean DataFrame (in-memory, cached as DataLoader._df)
        │
        └──▶  .data_cache.csv  [written once; loaded on subsequent restarts]
```

### Step 2 — Filter Pipeline (Per Request, ~5–15ms)

```
UserPreferences {location, budget, cuisine, min_rating}
        │
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  FILTER STEP 1 — Location                               │
  │  df["location"].str.contains(location, case=False)      │
  │  Partial match → "bangalor" matches "Bangalore"         │
  └────────────────────────┬────────────────────────────────┘
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  FILTER STEP 2 — Budget                                 │
  │  low:    cost_for_two ≤ 300                             │
  │  medium: 301 ≤ cost_for_two ≤ 700                      │
  │  high:   cost_for_two > 700                             │
  │  cost=0 (unknown): included when lo > 0                 │
  └────────────────────────┬────────────────────────────────┘
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  FILTER STEP 3 — Cuisine                                │
  │  df["cuisines"].str.contains(cuisine, case=False)       │
  │  "italian" matches "Italian, Continental"               │
  └────────────────────────┬────────────────────────────────┘
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  FILTER STEP 4 — Minimum Rating                         │
  │  df["aggregate_rating"] >= min_rating                   │
  └────────────────────────┬────────────────────────────────┘
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  FILTER STEP 5 — Cap at MAX_CANDIDATES (400)            │
  │  if len(result) > 400:                                  │
  │    sort by _score desc → take top 400                   │
  │  Ensures token budget stays within ~12k tokens          │
  └────────────────────────┬────────────────────────────────┘
                           ▼
              Filtered DataFrame  (≤ 400 rows)
```

### Step 3 — Prompt Construction

```
UserPreferences + Filtered DataFrame
        │
        ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  SYSTEM INSTRUCTION (static, sent each call)                  │
  │                                                               │
  │  "You are an expert restaurant recommendation assistant       │
  │   for India. Select TOP 5 from the candidate list only.       │
  │   Respond ONLY with valid JSON array. Each object must        │
  │   have: name, location, cuisine, rating, cost_for_two,        │
  │   online_order, book_table, explanation (2-3 sentences)."     │
  └───────────────────────────────────────────────────────────────┘
        │
        ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  USER TURN (dynamic, per request)                             │
  │                                                               │
  │  ## User Preferences                                          │
  │  - Location: Koramangala                                      │
  │  - Budget: Medium (₹301-700 for two)                          │
  │  - Cuisine: Italian                                           │
  │  - Minimum Rating: 3.5                                        │
  │  - Special Preferences: outdoor seating, date night           │
  │                                                               │
  │  ## Candidate Restaurants (N options)                         │
  │  name | location | cuisines | cost | rating | votes | ...     │
  │  ─────────────────────────────────────────────────────        │
  │  Cafe Azzure | Koramangala 5th Block | Italian, ... | ₹650 …  │
  │  Pizza Roma  | Koramangala 1st Block | Italian      | ₹500 …  │
  │  ... (up to 400 rows)                                         │
  └───────────────────────────────────────────────────────────────┘

  Approximate token budget:
    System instruction : ~350  tokens
    User pref section  : ~100  tokens
    400 restaurant rows: ~8,000–11,000 tokens
    Total input        : ~12,000 tokens  (well within 1M limit)
```

### Step 4 — LLM Call (Gemini gemini-3.8-flash)

```
  Prompt
    │
    │  client.interactions.create(
    │    model="gemini-3.8-flash",
    │    system_instruction=SYSTEM_INSTRUCTION,
    │    input=user_prompt,
    │    config=GenerateContentConfig(
    │      response_mime_type="application/json",
    │      temperature=0.3,
    │      max_output_tokens=2048
    │    ),
    │    store=False
    │  )
    │
    ▼
  Raw LLM Response (JSON string)

  Attempt 1 ──▶ parse JSON
                  ├── success ──▶ validate names ──▶ return top 5
                  └── fail    ──▶ wait 2s ──▶ Attempt 2
                                                ├── success ──▶ return top 5
                                                └── fail    ──▶ heuristic fallback
                                                              (top 5 by _score)
                                                              + X-LLM-Fallback: true header
```

### Step 5 — Response Parsing & Validation

```
  Raw JSON string from LLM
        │
        │  Strip markdown fences (```json ... ```)
        │  json.loads()
        ▼
  Python list of dicts
        │
        │  Hallucination check:
        │  Drop any rec where rec["name"] ∉ candidate_names
        ▼
  Validated list (≤ 5 dicts)
        │
        │  [RestaurantRecommendation(**r) for r in recs]
        │  Pydantic validates field types
        ▼
  RecommendationResponse {
    recommendations: List[RestaurantRecommendation],
    total_filtered:  int,
    processing_time_ms: int,
    llm_fallback:    bool,
    message:         str
  }
```

### Step 6 — HTTP Response → Frontend Render

```
  JSON Response (HTTP 200)
        │
        │  TanStack Query useMutation
        │  onSuccess → setState(data)
        ▼
  RecommendationList
    │
    ├── Stats bar: "{N} restaurants matched · {ms}ms"
    │
    └── 3-column responsive grid:
         ┌───────────────────────┐
         │  #1  Restaurant Name  │
         │  Cuisine              │
         │  ⭐ 4.3  ₹650 for 2  │
         │  📶 Online  📅 Table  │
         │  🤖 "Perfect romantic │
         │     spot because..."  │
         └───────────────────────┘
         (× 5 cards)
```

---

## 4. Component Architecture — Backend

### `config.py`
- Reads `GEMINI_API_KEY` from `.env` via `python-dotenv`
- Defines `BUDGET_RANGES`, `MAX_CANDIDATES = 400`, `GEMINI_MODEL`

### `services/data_loader.py` — `DataLoader`
| Method | Purpose |
|---|---|
| `get_df()` | Returns cached DataFrame; loads on first call |
| `_load()` | Tries local CSV cache → HuggingFace download |
| `_clean(df)` | Normalizes cost, rating, votes; computes `_score` |
| `_validate_schema(df)` | Asserts required columns exist; raises `RuntimeError` on mismatch |

### `services/filterer.py` — `filter_restaurants()`
| Parameter | Type | Filter Applied |
|---|---|---|
| `location` | `str` | `df["location"].str.contains(location, case=False)` |
| `budget` | `"low"\|"medium"\|"high"` | `cost_for_two` range from `BUDGET_RANGES` |
| `cuisine` | `str` | `df["cuisines"].str.contains(cuisine, case=False)` |
| `min_rating` | `float` | `df["aggregate_rating"] >= min_rating` |

Returns `DataFrame` with at most `MAX_CANDIDATES` rows, sorted by `_score` descending.

### `services/prompt_builder.py`
| Component | Content |
|---|---|
| `SYSTEM_INSTRUCTION` | Role definition, JSON-only output rule, required field list, anti-hallucination rule |
| `build_prompt()` | User preferences section + pipe-delimited candidate table |

### `services/llm_client.py` — `get_recommendations()`
| Stage | Logic |
|---|---|
| Client creation | `genai.Client(api_key=GEMINI_API_KEY)` |
| LLM call | `client.interactions.create()` with `response_mime_type="application/json"` |
| JSON cleaning | Strip ` ```json ` fences via regex |
| Hallucination check | `_validate_names()` — drops any name not in `candidate_names` set |
| Retry | 1 retry with 2s backoff |
| Fallback | `_heuristic_top5()` — sorts by `_score`, returns top 5 with canned explanation |

### `models/schemas.py`
```
UserPreferences
  location:    str       (required, 1–100 chars, sanitized)
  budget:      Literal["low", "medium", "high"]
  cuisine:     str       (optional, max 100 chars)
  min_rating:  float     (0.0–5.0)
  preferences: str       (optional, max 300 chars)

RestaurantRecommendation
  name, location, cuisine: str
  rating:       float
  cost_for_two: int
  online_order: bool
  book_table:   bool
  explanation:  str

RecommendationResponse
  recommendations:    List[RestaurantRecommendation]
  total_filtered:     int
  processing_time_ms: int
  llm_fallback:       bool
  message:            str
```

### `routers/recommend.py`
| Endpoint | Method | Description |
|---|---|---|
| `/api/recommend` | `POST` | Full pipeline: filter → LLM → response |
| `/health` | `GET` | Returns `{status, dataset_loaded, dataset_size}` |

### `main.py`
- **Lifespan**: Pre-loads `DataLoader.get_df()` on startup → warm first request
- **CORS**: Allows `localhost:5173` (Vite dev server)
- **Logging**: Structured `logging` with timestamps

---

## 5. Component Architecture — Frontend

### State Management
```
useMutation (TanStack Query)
  ├── isPending  → show LoadingSpinner in form button
  ├── isError    → show ErrorBanner with retry
  ├── data       → pass to RecommendationList
  └── reset      → clear error and results
```

### Component Tree
```
App
├── <header>  (logo + tagline)
├── PreferenceForm
│     ├── location input     (text, required)
│     ├── budget selector    (3-button toggle: low / medium / high)
│     ├── cuisine select     (dropdown, 17 options)
│     ├── min_rating slider  (0–5, step 0.5)
│     ├── preferences textarea (optional, max 300 chars)
│     └── submit button      (disabled + spinner while isPending)
├── ErrorBanner              (shown when isError)
└── RecommendationList       (shown when data exists)
      ├── StatsBar           (N matched · Xms · fallback badge)
      └── RecommendationCard × N
            ├── rank badge   (#1 gold, #2 silver, #3 bronze)
            ├── feature pills (Online Order / Book Table)
            ├── name + cuisine
            ├── rating ⭐ + cost ₹
            └── AI explanation (truncated at 280 chars)
```

### Vite Proxy
```
Dev: localhost:5173/api/recommend
        │  Vite proxy (vite.config.ts)
        ▼
     localhost:8000/api/recommend  (FastAPI)
```
No CORS issues in dev. In production, deploy both on the same origin or configure CORS explicitly.

---

## 6. API Contract

### `POST /api/recommend`

**Request**
```json
{
  "location": "Koramangala",
  "budget": "medium",
  "cuisine": "Italian",
  "min_rating": 3.5,
  "preferences": "outdoor seating, date night"
}
```

**Response — Success (HTTP 200)**
```json
{
  "recommendations": [
    {
      "name": "Cafe Azzure",
      "location": "Koramangala 5th Block",
      "cuisine": "Italian, Continental",
      "rating": 4.3,
      "cost_for_two": 650,
      "online_order": true,
      "book_table": true,
      "explanation": "Cafe Azzure offers a charming outdoor terrace perfect for date nights. Its Italian menu is well-regarded with a 4.3 rating, and at ₹650 for two it sits comfortably within your medium budget."
    }
  ],
  "total_filtered": 312,
  "processing_time_ms": 1850,
  "llm_fallback": false,
  "message": ""
}
```

**Response — Zero Results (HTTP 200)**
```json
{
  "recommendations": [],
  "total_filtered": 0,
  "processing_time_ms": 12,
  "llm_fallback": false,
  "message": "No restaurants found matching your preferences. Try a different location, cuisine, or relax your budget/rating filters."
}
```

**Response — Validation Error (HTTP 422)**
```json
{
  "detail": [{ "loc": ["body", "min_rating"], "msg": "Input should be less than or equal to 5" }]
}
```

### `GET /health`
```json
{ "status": "ok", "dataset_loaded": true, "dataset_size": 51717 }
```

---

## 7. Gemini Prompt Design

### System Instruction
```
You are an expert restaurant recommendation assistant for India.
Given a list of candidate restaurants and user preferences, select the TOP 5 best matches.

CRITICAL RULES:
1. Only recommend restaurants from the provided candidate list — never invent new ones.
2. Respond ONLY with a valid JSON array (no markdown fences, no extra text).
3. The array must contain exactly min(5, total_candidates) objects.
4. Each object must have these exact keys:
   - "name": restaurant name (string, must match candidate list exactly)
   - "location": location/area (string)
   - "cuisine": primary cuisine types (string)
   - "rating": aggregate rating (number)
   - "cost_for_two": approximate cost for two people in INR (number)
   - "online_order": whether online ordering is available (boolean)
   - "book_table": whether table booking is available (boolean)
   - "explanation": 2-3 sentences explaining why this fits the user (string)
5. Rank by best overall fit to user preferences, not just rating alone.
```

### Why `temperature=0.3`?
Low temperature makes the model deterministic and consistent — we want ranking and factual field extraction, not creativity. High temperature would risk hallucinated names or invented ratings.

### Why `response_mime_type="application/json"`?
Forces the model into JSON output mode at the API level, reducing the chance of fenced code blocks or prose wrapping the JSON.

---

## 8. Non-Functional Requirements

| Concern | Requirement | Design Decision |
|---|---|---|
| **Performance** | First API response < 15s (incl. LLM) | Dataset cached in memory; LLM call ~2–5s |
| **Token Cost** | Minimise Gemini API cost | Pre-filter to ≤400 rows → ~12k tokens/request |
| **Reliability** | System responds even if Gemini is down | Heuristic fallback + `X-LLM-Fallback` header |
| **Data Quality** | No hallucinated restaurants shown | Post-LLM name validation against candidate set |
| **Security** | API key never exposed to client | Key stays server-side in `.env`; never in frontend |
| **Input Safety** | No prompt injection via user input | Pydantic sanitization strips `< > " ' % ; ( ) & +` |
| **CORS** | Frontend can call backend in dev | CORS allows `localhost:5173` only |
| **Scalability** | Handle concurrent requests | DataFrame is read-only; FastAPI is async-native |
| **Observability** | Debug slow/failed requests | Structured Python `logging`; `processing_time_ms` in response |

---

## 9. Sequence Diagram — Happy Path

```
Browser          FastAPI          DataLoader       Filterer        Gemini API
  │                │                  │                │                │
  │─POST /recommend▶│                  │                │                │
  │                │──get_df()─────────▶                │                │
  │                │◀──DataFrame───────│                │                │
  │                │──filter()──────────────────────────▶               │
  │                │◀──≤400 rows────────────────────────│               │
  │                │──build_prompt()   │                │                │
  │                │──interactions.create()─────────────────────────────▶│
  │                │                  │                │     LLM ranks   │
  │                │◀───────────────────────────────────── JSON array ───│
  │                │──parse + validate │                │                │
  │                │──Pydantic model   │                │                │
  │◀─JSON 200──────│                  │                │                │
  │                │                  │                │                │
```

---

## 10. Deployment Topology (Local Dev)

```
┌──────────────────┐        ┌──────────────────┐
│   Terminal 1     │        │   Terminal 2     │
│                  │        │                  │
│  cd backend      │        │  cd frontend     │
│  .venv\activate  │        │  npm run dev     │
│  uvicorn main:app│        │                  │
│  --reload        │        │  localhost:5173  │
│  port: 8000      │        │  (Vite + proxy)  │
└──────────────────┘        └──────────────────┘
         │                           │
         │◀──── /api proxy ──────────│
         │                           │
         ▼                           ▼
  localhost:8000              localhost:5173
  (FastAPI)                   (React SPA)
         │
         ▼  HTTPS
  api.gemini.google.com
  (gemini-3.8-flash)
```
