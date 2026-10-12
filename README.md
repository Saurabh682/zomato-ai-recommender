# 🍽️ Zomato AI Restaurant Recommender

An AI-powered restaurant recommendation system using the Zomato dataset + Google Gemini LLM.

![Architecture](docs/architecture.md)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gemini API key ([get one free](https://aistudio.google.com/app/apikey))

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate
# Activate (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure API key
copy .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here

# Start the server
uvicorn main:app --reload --port 8000
```

The first startup downloads the Zomato dataset (~52k restaurants) from HuggingFace and caches it locally. Subsequent startups are instant.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 3. Verify

- Health check: http://localhost:8000/health
- API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

## Project Structure

```
zomato-ai-recommender/
├── docs/                    # Context docs
│   ├── problemStatement.txt
│   ├── problemStatement.md
│   ├── architecture.md
│   ├── implementation-plan.md
│   ├── edge-case.md
│   └── eval.md
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Env config
│   ├── services/
│   │   ├── data_loader.py   # HuggingFace dataset loader
│   │   ├── filterer.py      # Filter logic
│   │   ├── prompt_builder.py
│   │   └── llm_client.py    # Gemini API wrapper
│   ├── models/
│   │   └── schemas.py       # Pydantic models
│   ├── routers/
│   │   └── recommend.py     # POST /api/recommend
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── PreferenceForm.tsx
        │   ├── RecommendationCard.tsx
        │   └── RecommendationList.tsx
        ├── hooks/useRecommendations.ts
        ├── lib/api.ts
        └── types/index.ts
```

## API

### POST `/api/recommend`
```json
{
  "location": "Koramangala",
  "budget": "medium",
  "cuisine": "Italian",
  "min_rating": 3.5,
  "preferences": "outdoor seating"
}
```

### GET `/health`
Returns dataset load status.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, Pandas |
| LLM | Google Gemini (gemini-3.8-flash) |
| Dataset | HuggingFace — ManikaSaini/zomato-restaurant-recommendation |
| Frontend | React, Vite, Tailwind CSS, TanStack Query |
