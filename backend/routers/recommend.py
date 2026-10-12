"""POST /api/recommend router."""
import logging
import time

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from models.schemas import RecommendationResponse, RestaurantRecommendation, UserPreferences
from services.data_loader import DataLoader
from services.filterer import filter_restaurants
from services.llm_client import get_recommendations

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.post("/recommend", response_model=RecommendationResponse)
async def recommend(prefs: UserPreferences, response: Response):
    start = time.monotonic()

    df = DataLoader.get_df()
    candidates = filter_restaurants(
        df,
        location=prefs.location,
        budget=prefs.budget,
        cuisine=prefs.cuisine,
        min_rating=prefs.min_rating,
    )

    if candidates.empty:
        elapsed = int((time.monotonic() - start) * 1000)
        loc_str = f" in '{prefs.location}'" if prefs.location else ""
        return RecommendationResponse(
            recommendations=[],
            total_filtered=0,
            processing_time_ms=elapsed,
            message=(
                f"No restaurants found matching your criteria{loc_str}. "
                "This dataset covers ~52,000 restaurants across Bangalore "
                "(such as Koramangala, Indiranagar, HSR, BTM, Whitefield, JP Nagar, MG Road). "
                "Try selecting one of these popular areas or relaxing your filters!"
            ),
        )

    raw_recs, is_fallback = get_recommendations(
        candidates,
        location=prefs.location,
        budget=prefs.budget,
        cuisine=prefs.cuisine,
        min_rating=prefs.min_rating,
        preferences=prefs.preferences,
    )

    if is_fallback:
        response.headers["X-LLM-Fallback"] = "true"

    recommendations = [RestaurantRecommendation(**r) for r in raw_recs]
    elapsed = int((time.monotonic() - start) * 1000)

    return RecommendationResponse(
        recommendations=recommendations,
        total_filtered=len(candidates),
        processing_time_ms=elapsed,
        llm_fallback=is_fallback,
    )
