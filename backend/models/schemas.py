"""Pydantic models for API request and response."""
from pydantic import BaseModel, Field, field_validator
from typing import Literal


class UserPreferences(BaseModel):
    location: str = Field(..., min_length=1, max_length=100, description="City or neighborhood")
    budget: Literal["low", "medium", "high"] = Field(..., description="Budget tier")
    cuisine: str = Field(default="", max_length=100, description="Preferred cuisine type")
    min_rating: float = Field(default=0.0, ge=0.0, le=5.0, description="Minimum aggregate rating")
    preferences: str = Field(default="", max_length=300, description="Additional free-text preferences")

    @field_validator("location", "cuisine", "preferences", mode="before")
    @classmethod
    def sanitize_string(cls, v: str) -> str:
        # Strip leading/trailing whitespace; basic XSS guard
        import re
        return re.sub(r"[<>\"'%;()&+]", "", str(v)).strip()


class RestaurantRecommendation(BaseModel):
    name: str
    location: str
    cuisine: str
    rating: float
    cost_for_two: int
    online_order: bool = False
    book_table: bool = False
    explanation: str


class RecommendationResponse(BaseModel):
    recommendations: list[RestaurantRecommendation]
    total_filtered: int
    processing_time_ms: int
    llm_fallback: bool = False
    message: str = ""
