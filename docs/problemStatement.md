# 🍽️ AI-Powered Restaurant Recommendation System — Project Context

> **Source**: Derived from [`problemStatement.txt`](./problemStatement.txt)

---

## 1. Problem Statement

We are building an **AI-powered restaurant recommendation service** inspired by Zomato. The core challenge is to move beyond simple filter-and-sort results and deliver *personalized, human-like suggestions* — the kind a knowledgeable local friend would make — by combining a real-world restaurant dataset with the reasoning power of a Large Language Model (LLM).

---

## 2. Objective

Given a user's preferences, the system must:

1. **Ingest** a real-world dataset of ~52,000 Indian restaurants from HuggingFace
2. **Filter** relevant candidates based on location, budget, cuisine, and rating
3. **Reason** over those candidates using Gemini LLM to rank and explain choices
4. **Return** the top 5 restaurants with a personalized, human-readable explanation for each pick

---

## 3. User Inputs

| Input | Type | Example |
|---|---|---|
| **Location** | City or neighborhood | `Delhi`, `Koramangala`, `Bandra` |
| **Budget** | Tier (low / medium / high) | `low` = ≤ ₹300 · `medium` = ₹300–700 · `high` = > ₹700 (for two) |
| **Cuisine** | Cuisine type | `Italian`, `Chinese`, `North Indian` |
| **Minimum Rating** | Float (0–5) | `3.5`, `4.0` |
| **Additional Preferences** | Free-text | `family-friendly`, `quick service`, `rooftop` |

---

## 4. System Outputs

For each of the **top 5 recommended restaurants**, the system returns:

| Output Field | Description |
|---|---|
| **Restaurant Name** | Exact name from the dataset |
| **Cuisine** | Cuisine type(s) served |
| **Rating** | Aggregate rating out of 5 |
| **Cost for Two** | Approximate INR cost for two people |
| **AI Explanation** | 2–3 sentence personalised reason why this restaurant fits the user's preferences |

---

## 5. Dataset

| Property | Detail |
|---|---|
| **Source** | [ManikaSaini/zomato-restaurant-recommendation](https://huggingface.co/datasets/ManikaSaini/zomato-restaurant-recommendation) (HuggingFace) |
| **Size** | ~52,000 restaurant records across major Indian cities |
| **Key Fields** | `name`, `location`, `cuisines`, `approx_cost(for two people)`, `aggregate_rating`, `votes`, `online_order`, `book_table`, `listed_in(type)` |

---

## 6. System Workflow

```
┌──────────────────────────────────────────────────────────────┐
│  USER INPUT                                                  │
│  Location · Budget · Cuisine · Min Rating · Preferences      │
└───────────────────────────┬──────────────────────────────────┘
                            │  POST /api/recommend
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  BACKEND                                                     │
│                                                              │
│  1. Data Ingestion                                           │
│     Load ~52k restaurants from HuggingFace → DataFrame       │
│     Clean: normalize cost, fill NaN ratings                  │
│                                                              │
│  2. Filter                                                   │
│     Apply location / budget / cuisine / rating filters       │
│     Cap at 300–400 candidates (token budget control)         │
│                                                              │
│  3. LLM Integration                                          │
│     Build structured prompt with candidate data              │
│     Call Gemini (gemini-3.8-flash) → JSON response           │
│                                                              │
│  4. Recommendation Engine                                    │
│     Parse + validate LLM output                              │
│     Fallback to heuristic top-5 if LLM fails                │
└───────────────────────────┬──────────────────────────────────┘
                            │  Top 5 JSON
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND                                                    │
│  Render recommendation cards:                                │
│  Name · Cuisine · ⭐ Rating · ₹ Cost · 🤖 AI Explanation    │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Why LLM + Structured Data?

Traditional restaurant apps return a flat sorted list — highest rating first. This misses nuance:

- A user asking for *"budget Italian near Koramangala for a date night"* needs contextual reasoning, not just a sort-by-rating.
- The LLM layer understands **intent** (date night → ambience matters), **trade-offs** (slightly lower rating but better price fit), and can **explain** its choices in natural language.

The key design insight: **filter first, reason second** — never send all 52k rows to the LLM. Pre-filter to ≤400 candidates, then let the LLM rank and explain within that curated shortlist.

---

## 8. Budget Tiers

| Tier | INR Range (for two people) |
|---|---|
| **Low** | ≤ ₹300 |
| **Medium** | ₹301 – ₹700 |
| **High** | > ₹700 |

---

## 9. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Filter before LLM** | Keeps prompt under token limits; reduces API cost |
| **Structured JSON output** | Frontend renders typed cards reliably; avoids brittle text parsing |
| **Prompt engineering** | System instruction + TSV candidate table instructs LLM to rank, not just list |
| **Hallucination guard** | Post-process: drop any LLM-returned name not found in the candidate DataFrame |
| **Heuristic fallback** | If Gemini fails (timeout, bad JSON), return top-5 by `rating × log(votes+1)` |
| **Local dataset cache** | HuggingFace download saved as CSV after first run; no re-download on restart |

---

## 10. Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Python · FastAPI · Uvicorn |
| **Data Processing** | Pandas |
| **LLM** | Google Gemini `gemini-3.8-flash` via `google-genai >= 2.25.0` |
| **Dataset Loading** | HuggingFace `datasets` library |
| **Frontend** | React · Vite · Tailwind CSS · TanStack Query v5 |
| **Config** | `.env` → `GEMINI_API_KEY` |
