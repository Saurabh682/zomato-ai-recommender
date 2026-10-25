"""GET /api/recommend/more — paginated heuristic results from the candidate pool (no LLM)."""
import logging

from fastapi import APIRouter, Query

from models.schemas import RestaurantRecommendation, RecommendationResponse
from services.data_loader import DataLoader
from services.filterer import filter_restaurants

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

COST_COL = "approx_cost(for two people)"


@router.get("/recommend/more", response_model=RecommendationResponse)
async def recommend_more(
    location: str = Query(..., min_length=1, max_length=100),
    budget: str = Query(..., pattern="^(low|medium|high)$"),
    cuisine: str = Query(default="", max_length=100),
    min_rating: float = Query(default=0.0, ge=0.0, le=5.0),
    offset: int = Query(default=5, ge=0, le=390),
    limit: int = Query(default=10, ge=1, le=20),
):
    """Return heuristic-ranked candidates at [offset : offset+limit], skipping the top-5 LLM picks."""
    df = DataLoader.get_df()
    candidates = filter_restaurants(df, location=location, budget=budget, cuisine=cuisine, min_rating=min_rating)

    if candidates.empty:
        return RecommendationResponse(recommendations=[], total_filtered=0, processing_time_ms=0)

    unique = candidates.drop_duplicates(subset=["name"]).reset_index(drop=True)
    page = unique.iloc[offset : offset + limit]

    recommendations = []
    for _, row in page.iterrows():
        recommendations.append(RestaurantRecommendation(
            name=str(row["name"]),
            location=str(row["location"]),
            cuisine=str(row["cuisines"]),
            rating=float(row["aggregate_rating"]),
            cost_for_two=int(row[COST_COL]),
            online_order=str(row.get("online_order", "")).lower() == "yes",
            book_table=str(row.get("book_table", "")).lower() == "yes",
            url=str(row.get("url", "")).strip(),
            explanation=(
                f"Rated {row['aggregate_rating']}/5 with {row['votes']} reviews, "
                f"serving {row['cuisines']} in {row['location']}."
            ),
        ))

    return RecommendationResponse(
        recommendations=recommendations,
        total_filtered=len(unique),
        processing_time_ms=0,
        llm_fallback=True,  # these are heuristic, not LLM-ranked
    )
