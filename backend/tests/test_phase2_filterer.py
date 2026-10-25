"""
Unit and Integration Tests for Phase 2 — User Input & Candidate Filtering.

Covers:
- EVAL-P2.1: Dataset schema integrity and volume (>= 50k rows)
- EVAL-P2.2: Price normalization and type integrity
- EVAL-P2.3: Budget tier boundary math (low, medium, high)
- EVAL-P2.4: Location substring and case-insensitive matching
- EVAL-P2.5: Candidate truncation cap (MAX_CANDIDATES = 400) and _score ordering
- Rating filtering (aggregate_rating >= min_rating)
- Cuisine substring filtering
- Zero-results graceful handling
- Pydantic UserPreferences validation and sanitization
"""
import pytest
import pandas as pd
from pydantic import ValidationError

from config import MAX_CANDIDATES, BUDGET_RANGES
from models.schemas import UserPreferences
from services.data_loader import DataLoader
from services.filterer import filter_restaurants, COST_COL


@pytest.fixture(scope="module")
def dataset():
    """Load the cleaned dataset once for all Phase 2 tests."""
    df = DataLoader.get_df()
    assert df is not None and not df.empty
    return df


def test_eval_p2_1_schema_integrity_and_volume(dataset):
    """EVAL-P2.1: Dataset must contain >= 50,000 records and all required columns."""
    assert len(dataset) >= 50000, f"Expected >= 50,000 records, got {len(dataset)}"
    
    required_columns = {
        "name",
        "location",
        "cuisines",
        "approx_cost(for two people)",
        "aggregate_rating",
        "votes",
        "_score",
        "online_order",
        "book_table",
    }
    missing = required_columns - set(dataset.columns)
    assert not missing, f"Missing required columns: {missing}"


def test_eval_p2_2_price_normalization_and_types(dataset):
    """EVAL-P2.2: Price column must be integer, with 0 missing values, >= 0."""
    cost_series = dataset[COST_COL]
    assert cost_series.dtype == "int64", f"Expected int64, got {cost_series.dtype}"
    assert cost_series.isna().sum() == 0, "Found NaN values in cost column"
    assert (cost_series >= 0).all(), "Found negative cost values"


def test_eval_p2_3_budget_tier_boundaries(dataset):
    """EVAL-P2.3: 100% of rows in each budget slice must strictly satisfy their respective price band."""
    # Low: <= 300
    low_filtered = filter_restaurants(dataset, location="Koramangala", budget="low", cuisine="", min_rating=0.0)
    assert not low_filtered.empty, "Low budget query returned empty"
    assert low_filtered[COST_COL].max() <= 300, f"Low budget exceeded: {low_filtered[COST_COL].max()}"

    # Medium: 301 to 700
    med_filtered = filter_restaurants(dataset, location="Koramangala", budget="medium", cuisine="", min_rating=0.0)
    assert not med_filtered.empty, "Medium budget query returned empty"
    assert med_filtered[COST_COL].min() >= 301, f"Medium budget min too low: {med_filtered[COST_COL].min()}"
    assert med_filtered[COST_COL].max() <= 700, f"Medium budget max exceeded: {med_filtered[COST_COL].max()}"

    # High: > 700 (>= 701)
    high_filtered = filter_restaurants(dataset, location="Koramangala", budget="high", cuisine="", min_rating=0.0)
    assert not high_filtered.empty, "High budget query returned empty"
    assert high_filtered[COST_COL].min() >= 701, f"High budget min too low: {high_filtered[COST_COL].min()}"


def test_eval_p2_4_location_substring_and_case_insensitivity(dataset):
    """EVAL-P2.4: Location filter must match case-insensitively and handle substrings."""
    res_lower = filter_restaurants(dataset, location="koramangala", budget="medium", cuisine="", min_rating=0.0)
    res_title = filter_restaurants(dataset, location="Koramangala", budget="medium", cuisine="", min_rating=0.0)
    res_upper = filter_restaurants(dataset, location="KORAMANGALA", budget="medium", cuisine="", min_rating=0.0)

    assert len(res_lower) == len(res_title) == len(res_upper), "Case mismatch in location results count"
    assert not res_lower.empty, "Location query returned empty"
    
    # 100% of returned locations must contain 'koramangala'
    matches = res_lower["location"].str.contains("koramangala", case=False, na=False)
    assert matches.all(), "Some returned records did not match Koramangala in location"


def test_location_bangalore_city_wide(dataset):
    """Searching for 'Bangalore' or 'Bengaluru' searches city-wide without error."""
    res_blr = filter_restaurants(dataset, location="Bangalore", budget="medium", cuisine="Italian", min_rating=3.5)
    res_bglr = filter_restaurants(dataset, location="Bengaluru", budget="medium", cuisine="Italian", min_rating=3.5)
    
    assert len(res_blr) > 0, "Bangalore city-wide query returned 0 results"
    assert len(res_bglr) > 0, "Bengaluru city-wide query returned 0 results"
    assert len(res_blr) == len(res_bglr), "Discrepancy between Bangalore and Bengaluru counts"


def test_cuisine_filtering(dataset):
    """Cuisine filter matches cuisines case-insensitively."""
    filtered = filter_restaurants(dataset, location="Indiranagar", budget="medium", cuisine="Chinese", min_rating=0.0)
    assert not filtered.empty, "Cuisine query returned empty"
    matches = filtered["cuisines"].str.contains("chinese", case=False, na=False)
    assert matches.all(), "Some records do not contain the requested cuisine"


def test_multi_cuisine_filtering(dataset):
    """Multi-cuisine filter matches records having ANY of the specified comma-separated cuisines."""
    filtered = filter_restaurants(dataset, location="Indiranagar", budget="medium", cuisine="Pizza, Cafe", min_rating=0.0)
    assert not filtered.empty, "Multi-cuisine query returned empty"
    matches = filtered["cuisines"].str.contains(r"pizza|cafe", case=False, na=False)
    assert matches.all(), "Some records matched neither Pizza nor Cafe"


def test_min_rating_filtering(dataset):
    """Rating filter strictly filters rows >= min_rating."""
    min_r = 4.0
    filtered = filter_restaurants(dataset, location="Indiranagar", budget="medium", cuisine="", min_rating=min_r)
    assert not filtered.empty, "Rating query returned empty"
    assert (filtered["aggregate_rating"] >= min_r).all(), f"Found records with rating < {min_r}"


def test_eval_p2_5_candidate_truncation_cap_and_score_order(dataset):
    """EVAL-P2.5: Result must be capped at MAX_CANDIDATES and ordered descending by _score."""
    broad_results = filter_restaurants(dataset, location="Bangalore", budget="medium", cuisine="", min_rating=0.0)
    assert len(broad_results) <= MAX_CANDIDATES, f"Exceeded MAX_CANDIDATES: {len(broad_results)}"
    
    # Verify monotonic descending order of _score
    scores = broad_results["_score"].tolist()
    assert scores == sorted(scores, reverse=True), "_score is not strictly sorted descending"


def test_zero_results_graceful_handling(dataset):
    """Over-constrained queries must return an empty DataFrame without raising an error."""
    empty = filter_restaurants(
        dataset,
        location="NonExistentCity12345",
        budget="low",
        cuisine="MartianAlienCuisine",
        min_rating=4.9
    )
    assert isinstance(empty, pd.DataFrame)
    assert empty.empty, "Expected 0 results for non-existent criteria"


def test_user_preferences_schema_validation():
    """Validates Pydantic UserPreferences validation and sanitization."""
    # Valid model
    valid_prefs = UserPreferences(
        location="Koramangala",
        budget="medium",
        cuisine="Italian",
        min_rating=4.0,
        preferences="outdoor seating"
    )
    assert valid_prefs.location == "Koramangala"
    assert valid_prefs.budget == "medium"
    assert valid_prefs.min_rating == 4.0

    # Sanitization of malicious characters
    malicious_prefs = UserPreferences(
        location="<script>alert('xss')</script>Koramangala",
        budget="low",
        cuisine="Chinese; DROP TABLE;",
        preferences="good food & outdoor%"
    )
    assert "<script>" not in malicious_prefs.location
    assert ";" not in malicious_prefs.cuisine
    assert "%" not in malicious_prefs.preferences

    # Rejection of out-of-range rating (> 5.0)
    with pytest.raises(ValidationError):
        UserPreferences(location="Delhi", budget="medium", min_rating=5.5)

    # Rejection of negative rating (< 0.0)
    with pytest.raises(ValidationError):
        UserPreferences(location="Delhi", budget="medium", min_rating=-0.5)

    # Rejection of empty location
    with pytest.raises(ValidationError):
        UserPreferences(location="", budget="medium")
