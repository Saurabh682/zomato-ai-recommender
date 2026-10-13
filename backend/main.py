"""
FastAPI application entry point.

Lifespan: pre-loads the Zomato dataset on startup so the first request
isn't slow. The DataFrame is cached in DataLoader._df.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.data_loader import DataLoader
from routers.recommend import router as recommend_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load & cache dataset
    logger.info("Loading Zomato dataset...")
    try:
        DataLoader.get_df()
        logger.info("Dataset loaded successfully.")
    except Exception as exc:
        logger.error("Failed to load dataset: %s", exc)
        # App still starts; /recommend will return 503-style responses
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="Zomato AI Recommender",
    description="AI-powered restaurant recommendations using Groq and Gemini LLMs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-LLM-Fallback"],
)

app.include_router(recommend_router)


@app.get("/health")
def health():
    loaded = DataLoader.is_loaded()
    return {
        "status": "ok",
        "dataset_loaded": loaded,
        "dataset_size": len(DataLoader.get_df()) if loaded else 0,
    }
