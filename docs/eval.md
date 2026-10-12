# 🧪 Evaluation Framework & Test Scenarios
# AI-Powered Restaurant Recommendation System (Zomato Use Case)

> **References**: [`implementation-plan.md`](./implementation-plan.md) · [`architecture.md`](./architecture.md) · [`edge-case.md`](./edge-case.md)

---

## 1. Evaluation Architecture & Scoring Model

The evaluation strategy mirrors the 6-phase implementation lifecycle. Every phase must satisfy strict criteria before downstream phases are deemed production-ready.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE-BY-PHASE EVALUATION PIPELINE                   │
└────────────────────────────────────────────────────────────────────────┘
 Phase 1: Environment & Setup         ──▶ Baseline dependency & tooling check
 Phase 2: Data Ingestion & Hygiene    ──▶ Schema, imputation, filter math, caps
 Phase 3: Prompt & LLM Reasoning      ──▶ Structured JSON, anti-hallucination
 Phase 4: REST API & Serialization    ──▶ Contract validation, HTTP status codes
 Phase 5: Client Interface (UI)       ──▶ Component rendering, state transitions
 Phase 6: End-to-End & Stress         ──▶ Latency, edge case matrix, user stories
```

### Cumulative Scoring Weight Distribution

| Phase | Evaluation Domain | Identifier Prefix | Target Pass Rate | Weight |
|---|---|---|:---:|:---:|
| **Phase 1** | Project Setup & Environment | `EVAL-P1` | 100% | 10% |
| **Phase 2** | Data Ingestion & Filtering | `EVAL-P2` | 100% | 20% |
| **Phase 3** | LLM Integration & Prompting | `EVAL-P3` | 95% | 25% |
| **Phase 4** | Backend API & Contract | `EVAL-P4` | 100% | 15% |
| **Phase 5** | Frontend UI & State Handling | `EVAL-P5` | 100% | 15% |
| **Phase 6** | End-to-End Integration & Robustness | `EVAL-P6` | 90% | 15% |

**Overall Certification Threshold**: ≥ 95% total score with 0 catastrophic failures (no unhandled 500 errors, crashes, or unvetted hallucinations).

---

## 2. Phase 1 Evaluation: Project Setup & Environment (`EVAL-P1`)

### `EVAL-P1.1`: Python Dependency Resolution & Imports
- **Objective**: Ensure all essential backend packages are resolved and importable without binary incompatibilities.
- **Test Command**:
  ```bash
  cd backend
  .venv\Scripts\python -c "import fastapi, uvicorn, pandas, datasets, google.genai, pydantic, dotenv; print('Imports Verified')"
  ```
- **Pass Criteria**: Command terminates with exit code `0` and outputs `Imports Verified`.

### `EVAL-P1.2`: Frontend Build & Bundle Generation
- **Objective**: Verify that React, TypeScript, Vite, and Tailwind v4 compile without type errors or bundler warnings.
- **Test Command**:
  ```bash
  cd frontend
  npm run build
  ```
- **Pass Criteria**: Exit code `0`; `dist/index.html` and assets generated cleanly.

### `EVAL-P1.3`: Configuration & Environment Secrets
- **Objective**: Ensure environment loading handles both active and unset states gracefully.
- **Test Command**:
  ```bash
  cd backend
  .venv\Scripts\python -c "from config import GEMINI_MODEL, MAX_CANDIDATES, BUDGET_RANGES; assert GEMINI_MODEL == 'gemini-3.8-flash'; assert MAX_CANDIDATES == 400; print('Config Verified')"
  ```
- **Pass Criteria**: Assertions pass without `AssertionError`.

---

## 3. Phase 2 Evaluation: Data Ingestion & Cleaning (`EVAL-P2`)

### `EVAL-P2.1`: Dataset Schema Integrity & Volume
- **Objective**: Verify Hugging Face ingestion or local cache loads at least 50,000 restaurant records with expected fields.
- **Test Procedure**:
  ```python
  from services.data_loader import DataLoader
  df = DataLoader.get_df()
  assert len(df) >= 50000
  required = {"name", "location", "cuisines", "approx_cost(for two people)", "aggregate_rating", "votes", "_score"}
  assert required.issubset(df.columns)
  ```
- **Pass Criteria**: `len(df) >= 50000` and all required columns present.

### `EVAL-P2.2`: Price Normalization & Type Integrity
- **Objective**: Ensure all comma-formatted price strings (`"1,200"`) are converted to clean integers.
- **Test Procedure**:
  ```python
  from services.data_loader import DataLoader
  df = DataLoader.get_df()
  assert df["approx_cost(for two people)"].dtype == "int64"
  assert df["approx_cost(for two people)"].isna().sum() == 0
  assert df["approx_cost(for two people)"].min() >= 0
  ```
- **Pass Criteria**: Column is strictly `int64` with 0 missing values.

### `EVAL-P2.3`: Budget Tier Filter Boundaries
- **Objective**: Verify mathematical boundaries for low, medium, and high budget bands.
- **Test Inputs & Assertions**:
  1. Low Tier (`budget="low"`): `max(cost) <= 300`
  2. Medium Tier (`budget="medium"`): `min(cost) >= 301` and `max(cost) <= 700`
  3. High Tier (`budget="high"`): `min(cost) >= 701`
- **Pass Criteria**: 100% of rows in each slice strictly satisfy their respective price band.

### `EVAL-P2.4`: Location Substring & Case-Insensitive Matching
- **Objective**: Test flexible matching across location names.
- **Test Input**: `location="koramangala"`
- **Pass Criteria**: All returned entries contain `"koramangala"` in their `location` field (case-insensitive).

### `EVAL-P2.5`: Candidate Truncation Cap (`MAX_CANDIDATES = 400`)
- **Objective**: Prevent token budget overflow when filtering broad criteria (e.g., all restaurants in Bangalore).
- **Test Input**: `filter_restaurants(df, location="Bangalore", budget="medium", cuisine="", min_rating=0.0)`
- **Pass Criteria**: Returned row count is `<= 400`, ordered strictly by `_score` descending.

---

## 4. Phase 3 Evaluation: LLM Integration & Prompting (`EVAL-P3`)

### `EVAL-P3.1`: Structured JSON Schema Adherence
- **Objective**: Confirm the LLM response parses into a structured JSON array matching the target schema.
- **Target Schema Fields**:
  - `name`: string
  - `location`: string
  - `cuisine`: string
  - `rating`: number
  - `cost_for_two`: integer
  - `online_order`: boolean
  - `book_table`: boolean
  - `explanation`: string
- **Pass Criteria**: `json.loads(response)` succeeds and all 8 keys exist in every item.

### `EVAL-P3.2`: Anti-Hallucination Name Verification
- **Objective**: Guarantee the LLM only selects restaurants physically present in the filtered candidate pool.
- **Test Procedure**:
  ```python
  candidates = filter_restaurants(df, "Indiranagar", "medium", "Continental", 4.0)
  recs, fallback = get_recommendations(candidates, "Indiranagar", "medium", "Continental", 4.0, "")
  candidate_names = set(candidates["name"].tolist())
  for r in recs:
      assert r["name"] in candidate_names, f"Hallucinated restaurant detected: {r['name']}"
  ```
- **Pass Criteria**: 0% hallucination rate across 20 sample test queries.

### `EVAL-P3.3`: Heuristic Fallback Resilience
- **Objective**: Verify that when the LLM times out or returns malformed data, the system automatically falls back to top-scored candidates without raising unhandled exceptions.
- **Test Procedure**: Mock `interactions.create` to raise `TimeoutError` or return invalid string `"{bad_json"`.
- **Pass Criteria**: `get_recommendations()` returns a valid top-5 list with `is_fallback == True`.

### `EVAL-P3.4`: Qualitative Explanation Relevance
- **Objective**: Evaluate the natural-language justification generated for each restaurant.
- **Rubric (1 to 5 Points)**:
  - **5 (Excellent)**: Mentions specific user preference (e.g., outdoor seating), price alignment, and cuisine authenticity.
  - **3 (Adequate)**: Generic praise of rating and food without tailoring to user inputs.
  - **1 (Unacceptable)**: Factually incorrect details, contradictory statements, or 1-word responses.
- **Pass Criteria**: Average score across 10 random runs ≥ 4.0 / 5.0.

---

## 5. Phase 4 Evaluation: Backend API & Contract (`EVAL-P4`)

### `EVAL-P4.1`: System Health Endpoint (`GET /health`)
- **Objective**: Check that the health probe reports active dataset state.
- **HTTP Request**: `GET http://localhost:8000/health`
- **Expected Response**:
  ```json
  {
    "status": "ok",
    "dataset_loaded": true,
    "dataset_size": 51717
  }
  ```
- **Pass Criteria**: HTTP Status `200` with `dataset_loaded == true`.

### `EVAL-P4.2`: Successful Recommendation (`POST /api/recommend`)
- **Objective**: Verify valid payloads yield structured recommendations.
- **Payload**:
  ```json
  {
    "location": "Koramangala",
    "budget": "medium",
    "cuisine": "Italian",
    "min_rating": 3.5,
    "preferences": "outdoor seating, romantic"
  }
  ```
- **Pass Criteria**: HTTP Status `200`, `recommendations` length between 1 and 5, `total_filtered > 0`, `processing_time_ms > 0`.

### `EVAL-P4.3`: Over-Constrained Zero-Result Handling
- **Objective**: Test endpoint behavior when no restaurants match criteria.
- **Payload**:
  ```json
  {
    "location": "Srinagar",
    "budget": "low",
    "cuisine": "Mexican",
    "min_rating": 4.9,
    "preferences": ""
  }
  ```
- **Pass Criteria**: HTTP Status `200`, `recommendations == []`, `total_filtered == 0`, and a helpful diagnostic `message` string returned.

### `EVAL-P4.4`: Input Validation & Pydantic Schema Guards
- **Objective**: Ensure invalid payloads are rejected with HTTP 422 before reaching the model.
- **Test Scenarios**:
  - `min_rating = 9.9` (exceeds 5.0 ceiling) -> HTTP 422
  - Missing required field `"location"` -> HTTP 422
  - Invalid budget token `"ultra-cheap"` (not in `["low","medium","high"]`) -> HTTP 422
- **Pass Criteria**: 100% of invalid payloads rejected with HTTP 422.

---

## 6. Phase 5 Evaluation: Frontend UI & State Handling (`EVAL-P5`)

### `EVAL-P5.1`: Form Rendering & Input Controls
- **Objective**: Verify UI component completeness on initial render.
- **Checklist**:
  - [x] Location text input with placeholder
  - [x] 3-tier Budget toggle buttons (Low, Medium, High) with active state highlights
  - [x] Cuisine select dropdown with 17 popular options
  - [x] Rating range slider from 0.0 to 5.0 with live value display
  - [x] Free-text special preferences textarea
  - [x] Primary submission button with search icon
- **Pass Criteria**: All 6 UI controls present in the DOM without React hydration warnings.

### `EVAL-P5.2`: Client-Side Validation Guards
- **Objective**: Prevent submission when required inputs are blank.
- **Test Action**: Leave `location` input blank and click "Get AI Recommendations".
- **Pass Criteria**: Submission is blocked, red validation message `"Location is required"` appears, and 0 network requests are dispatched.

### `EVAL-P5.3`: Pending & Loading State Feedback
- **Objective**: Provide user feedback while waiting for LLM completion.
- **Test Action**: Submit valid form and observe button during in-flight request.
- **Pass Criteria**: Button is disabled, label switches to `"Finding restaurants..."`, and spinning indicator is active.

### `EVAL-P5.4`: Recommendation Grid Layout & Cards
- **Objective**: Verify card elements and responsiveness.
- **Pass Criteria**:
  - Up to 5 cards rendered in a responsive grid (`1 col` on mobile, `2-3 col` on desktop).
  - Each card shows: Rank pill (`#1`, `#2`, etc.), Venue Name, Cuisine, Location pin, Rating stars, Cost for two with Rupee icon (`₹`), and AI Explanation callout box.

---

## 7. Phase 6 Evaluation: End-to-End Integration & Stress Tests (`EVAL-P6`)

### Real-World User Story Test Battery

| Case ID | User Persona & Prompt | Expected Outcome | Pass/Fail Criteria |
|---|---|---|---|
| **E2E-01** | Student Budget: `Koramangala`, `low` (<=₹300), `South Indian`, `min_rating=3.5` | Affordable local eateries (e.g., darshinis/cafes) under ₹300 | 5 venues; all `cost <= 300`; all ratings `>= 3.5` |
| **E2E-02** | Date Night: `Indiranagar`, `high` (>₹700), `Italian`, `min_rating=4.0`, `"romantic, outdoor"` | Upscale Italian dining venues with romantic ambience | 5 venues; all `cost >= 700`; descriptions mention ambience |
| **E2E-03** | Casual Family Lunch: `Connaught Place`, `medium` (₹300-₹700), `North Indian`, `min_rating=3.8` | Family-friendly North Indian restaurants | All venues located in CP; cuisines match |
| **E2E-04** | Typo Tolerance: `location="bangalor"`, `cuisine="chineese"` | Substring filter matches `"Bangalore"` | Results returned without crashing |
| **E2E-05** | Extreme Outlier: `Shimla`, `low`, `Japanese`, `min_rating=4.8` | Empty dataset match | Clean empty-state message; no 500 error |

### System Performance & Latency Benchmarks

| Metric | Target Threshold | Maximum Acceptable | Measurement Method |
|---|:---:|:---:|---|
| **Filter Pipeline Latency** | < 20 ms | 50 ms | Python `time.monotonic()` around `filter_restaurants()` |
| **LLM Inference Latency** | < 3,500 ms | 8,000 ms | Gemini API round-trip duration |
| **Total API Response Latency** | < 4,000 ms | 10,000 ms | End-to-end `POST /api/recommend` duration |
| **Client First Contentful Paint** | < 800 ms | 1,500 ms | Chrome DevTools Lighthouse audit |

---

## 8. Automated Evaluation Script

To run the full programmatic evaluation suite automatically, execute the following script:

```bash
# In backend/ directory with active venv:
.venv\Scripts\python -c "
import time
from services.data_loader import DataLoader
from services.filterer import filter_restaurants
from services.llm_client import get_recommendations

print('== Running Automated Evaluation Battery ==')

# 1. Test Ingestion
t0 = time.time()
df = DataLoader.get_df()
print(f'✓ EVAL-P2.1 Data loaded: {len(df)} rows in {time.time()-t0:.2f}s')

# 2. Test Filters
filtered = filter_restaurants(df, 'Koramangala', 'medium', 'Italian', 3.5)
assert 1 <= len(filtered) <= 400
print(f'✓ EVAL-P2.3 & P2.5 Filter returned {len(filtered)} candidates')

# 3. Test Zero-Result Safety
empty = filter_restaurants(df, 'NonExistentCity', 'low', 'Martian', 4.9)
assert len(empty) == 0
print('✓ EVAL-P2.4 Zero-match query handled safely')

print('== All Pre-LLM Core Assertions Passed ==')
"
```
