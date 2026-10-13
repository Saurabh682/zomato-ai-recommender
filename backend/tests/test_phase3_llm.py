"""
Unit and Integration Tests for Phase 3 — LLM Integration & Recommendations.

Covers:
- EVAL-P3.1: Structured JSON schema adherence & field completeness
- EVAL-P3.2: Anti-hallucination candidate validation & case-normalization
- EVAL-P3.3: Heuristic fallback resilience on malformed JSON or API failure
- EVAL-P3.4: Explanation quality and formatting
- PromptBuilder structure and candidate formatting
"""
import pytest
from unittest.mock import patch
import pandas as pd

from services.data_loader import DataLoader
from services.filterer import filter_restaurants
from services.prompt_builder import SYSTEM_INSTRUCTION, build_prompt
from services.llm_client import (
    get_recommendations,
    _parse_llm_json,
    _normalize_recommendations,
    _heuristic_top5,
)
from models.schemas import RestaurantRecommendation


@pytest.fixture(scope="module")
def candidates_sample():
    """Load sample filtered candidates."""
    df = DataLoader.get_df()
    filtered = filter_restaurants(df, "Koramangala", "medium", "Italian", 3.8)
    assert not filtered.empty
    return filtered


def test_eval_p3_prompt_builder_structure(candidates_sample):
    """Verifies that build_prompt produces structured markdown with all preferences and candidate rows."""
    prompt = build_prompt(
        candidates=candidates_sample[:5],
        location="Koramangala",
        budget="medium",
        cuisine="Italian",
        min_rating=3.8,
        preferences="romantic date night outdoor seating"
    )

    assert "## User Preferences" in prompt
    assert "- **Location**: Koramangala" in prompt
    assert "- **Budget**: Medium" in prompt
    assert "- **Cuisine**: Italian" in prompt
    assert "- **Minimum Rating**: 3.8" in prompt
    assert "- **Special Preferences**: romantic date night outdoor seating" in prompt
    assert "## Candidate Restaurants (5 options)" in prompt
    assert "Format: name | location | cuisines | cost_for_two | rating | votes | online_order | book_table" in prompt

    # Verify candidate row presence
    top_candidate = candidates_sample.iloc[0]["name"]
    assert top_candidate in prompt

    # When preferences is blank, special preferences line should be omitted
    clean_prompt = build_prompt(
        candidates=candidates_sample[:2],
        location="Indiranagar",
        budget="low",
        cuisine="South Indian",
        min_rating=4.0,
        preferences=""
    )
    assert "Special Preferences" not in clean_prompt


def test_eval_p3_1_parse_llm_json():
    """EVAL-P3.1: Parse standard JSON lists, markdown fences, and wrapped dictionaries."""
    # 1. Plain JSON array
    raw_array = '[{"name": "Onesta", "rating": 4.4, "cost_for_two": 600}]'
    parsed = _parse_llm_json(raw_array)
    assert isinstance(parsed, list)
    assert len(parsed) == 1
    assert parsed[0]["name"] == "Onesta"

    # 2. Markdown fenced JSON array
    fenced = '```json\n[{"name": "Onesta", "rating": 4.4, "cost_for_two": 600}]\n```'
    parsed_fenced = _parse_llm_json(fenced)
    assert isinstance(parsed_fenced, list)
    assert len(parsed_fenced) == 1
    assert parsed_fenced[0]["name"] == "Onesta"

    # 3. Wrapped dictionary under recommendations key
    wrapped = '{"recommendations": [{"name": "Onesta", "rating": 4.4}]}'
    parsed_wrapped = _parse_llm_json(wrapped)
    assert isinstance(parsed_wrapped, list)
    assert len(parsed_wrapped) == 1
    assert parsed_wrapped[0]["name"] == "Onesta"

    # 4. Malformed JSON returns empty list without raising exception
    malformed = '```json [invalid json{'
    assert _parse_llm_json(malformed) == []


def test_eval_p3_2_anti_hallucination_and_normalization(candidates_sample):
    """EVAL-P3.2: Drops hallucinated restaurants, normalizes casing and schema field types."""
    top_name = candidates_sample.iloc[0]["name"]

    mock_llm_output = [
        {
            "name": top_name.lower(),  # test case-normalization
            "rating": "4.5",           # string to float
            "cost_for_two": "550",     # string to int
            "online_order": "yes",     # string to bool
            "book_table": "no",        # string to bool
            "explanation": "Great Italian spot for date nights."
        },
        {
            "name": "Completely Imaginary Restaurant Hallucination",
            "rating": 5.0,
            "cost_for_two": 500,
            "explanation": "Fake venue that does not exist in dataset."
        }
    ]

    normalized = _normalize_recommendations(mock_llm_output, candidates_sample)

    # Hallucinated restaurant must be dropped
    assert len(normalized) == 1
    rec = normalized[0]
    assert rec["name"] == top_name  # exact canonical case
    assert isinstance(rec["rating"], float)
    assert rec["rating"] == 4.5
    assert isinstance(rec["cost_for_two"], int)
    assert rec["cost_for_two"] == 550
    assert rec["online_order"] is True
    assert rec["book_table"] is False
    assert len(rec["explanation"]) > 10

    # Ensure Pydantic model validates it seamlessly
    pydantic_obj = RestaurantRecommendation(**rec)
    assert pydantic_obj.name == top_name


def test_eval_p3_3_heuristic_fallback(candidates_sample):
    """EVAL-P3.3: Returns top-5 unique scored restaurants with all required keys."""
    fallback_recs = _heuristic_top5(candidates_sample)
    assert isinstance(fallback_recs, list)
    assert len(fallback_recs) == min(5, len(candidates_sample.drop_duplicates(subset=["name"])))

    # Verify no duplicates
    names = [r["name"] for r in fallback_recs]
    assert len(names) == len(set(names))

    # Verify all 8 required keys
    required_keys = {"name", "location", "cuisine", "rating", "cost_for_two", "online_order", "book_table", "explanation"}
    for r in fallback_recs:
        assert required_keys.issubset(r.keys())
        assert "(AI explanation unavailable" in r["explanation"]
        # Validate through Pydantic
        RestaurantRecommendation(**r)


def test_eval_p3_resilience_on_llm_failure(candidates_sample):
    """When LLM provider raises an exception on all attempts, falls back gracefully to heuristic."""
    with patch("services.llm_client._call_groq", side_effect=RuntimeError("Simulated LLM Timeout")):
        recs, is_fallback = get_recommendations(
            candidates_sample,
            location="Koramangala",
            budget="medium",
            cuisine="Italian",
            min_rating=3.8,
            preferences="outdoor seating"
        )
        assert is_fallback is True
        assert len(recs) == 5
        assert isinstance(recs[0], dict)
        assert "(AI explanation unavailable" in recs[0]["explanation"]


def test_eval_p3_live_or_mocked_recommendation_pipeline(candidates_sample):
    """Tests the full get_recommendations execution pipeline end-to-end."""
    recs, is_fallback = get_recommendations(
        candidates_sample,
        location="Koramangala",
        budget="medium",
        cuisine="Italian",
        min_rating=3.8,
        preferences="outdoor seating, romantic"
    )

    assert isinstance(recs, list)
    assert 1 <= len(recs) <= 5

    candidate_names = set(candidates_sample["name"].tolist())
    for r in recs:
        # Guarantee no hallucinations
        assert r["name"] in candidate_names
        # Validate Pydantic compatibility
        obj = RestaurantRecommendation(**r)
        assert obj.rating >= 0.0
        assert obj.cost_for_two >= 0
        assert len(obj.explanation) > 10
