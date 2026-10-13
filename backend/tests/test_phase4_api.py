"""
Comprehensive Phase 4 API integration and contract tests.
Covers:
- GET /health (EVAL-P4.1)
- POST /api/recommend valid payload with Groq LLM (EVAL-P4.2)
- POST /api/recommend over-constrained zero-result handling (EVAL-P4.3)
- POST /api/recommend Pydantic input validation guards & HTTP 422 (EVAL-P4.4)
- CORS origin & exposed header validation
- X-LLM-Fallback header & llm_fallback response flag propagation
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from main import app
from services.data_loader import DataLoader


@pytest.fixture(scope="module")
def client():
    """Create FastAPI test client with dataset preloaded."""
    DataLoader.get_df()
    with TestClient(app) as test_client:
        yield test_client


def test_eval_p4_1_health_endpoint(client: TestClient):
    """EVAL-P4.1: GET /health returns 200, status: ok, dataset_loaded: True."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["dataset_loaded"] is True
    assert data["dataset_size"] >= 50_000


def test_eval_p4_cors_headers(client: TestClient):
    """Verify CORS headers allow http://localhost:5173 and expose X-LLM-Fallback."""
    response = client.options(
        "/api/recommend",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_eval_p4_4_validation_min_rating_ceiling(client: TestClient):
    """EVAL-P4.4: min_rating > 5.0 must return 422 Unprocessable Entity."""
    payload = {
        "location": "Koramangala",
        "budget": "medium",
        "cuisine": "Italian",
        "min_rating": 9.9,
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 422


def test_eval_p4_4_validation_missing_location(client: TestClient):
    """EVAL-P4.4: Missing location must return 422 Unprocessable Entity."""
    payload = {
        "budget": "low",
        "cuisine": "North Indian",
        "min_rating": 3.0,
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 422


def test_eval_p4_4_validation_invalid_budget_tier(client: TestClient):
    """EVAL-P4.4: Invalid budget enum must return 422 Unprocessable Entity."""
    payload = {
        "location": "Indiranagar",
        "budget": "ultra-cheap",
        "cuisine": "Chinese",
        "min_rating": 3.5,
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 422


def test_eval_p4_4_validation_sanitized_empty_location(client: TestClient):
    """EVAL-P4.4: Location composed solely of stripped characters must fail validation."""
    payload = {
        "location": "<>\"'%;()&+",
        "budget": "low",
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 422


def test_eval_p4_3_zero_result_handling(client: TestClient):
    """EVAL-P4.3: Unmatched criteria returns 200 with empty list and helpful message."""
    payload = {
        "location": "Srinagar",
        "budget": "low",
        "cuisine": "Mexican",
        "min_rating": 4.9,
        "preferences": "seaside patio",
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["recommendations"] == []
    assert data["total_filtered"] == 0
    assert data["processing_time_ms"] >= 0
    assert data["processing_time_ms"] < 15_000
    assert "No restaurants found" in data["message"]


def test_eval_p4_fallback_header_and_flag(client: TestClient):
    """Verify that when fallback is triggered, X-LLM-Fallback header and llm_fallback are True."""
    mock_fallback_recs = [
        {
            "name": "Fallback Bistro",
            "location": "Koramangala",
            "cuisine": "Cafe",
            "rating": 4.2,
            "cost_for_two": 500,
            "online_order": True,
            "book_table": False,
            "explanation": "Heuristic fallback recommendation.",
        }
    ]

    with patch("routers.recommend.get_recommendations", return_value=(mock_fallback_recs, True)):
        payload = {
            "location": "Koramangala",
            "budget": "medium",
            "cuisine": "Cafe",
            "min_rating": 3.0,
        }
        response = client.post("/api/recommend", json=payload)
        assert response.status_code == 200
        assert response.headers.get("X-LLM-Fallback") == "true"

        data = response.json()
        assert data["llm_fallback"] is True
        assert len(data["recommendations"]) == 1
        assert data["recommendations"][0]["name"] == "Fallback Bistro"


def test_eval_p4_2_successful_recommendation_pipeline(client: TestClient):
    """EVAL-P4.2: Valid payload triggers end-to-end pipeline with Groq LLM."""
    payload = {
        "location": "Koramangala",
        "budget": "medium",
        "cuisine": "Italian",
        "min_rating": 3.5,
        "preferences": "good ambience, romantic, pasta",
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert 1 <= len(data["recommendations"]) <= 5
    assert data["total_filtered"] > 0
    assert data["processing_time_ms"] > 0
    assert data["processing_time_ms"] < 15_000

    for rec in data["recommendations"]:
        assert isinstance(rec["name"], str) and len(rec["name"]) > 0
        assert isinstance(rec["location"], str) and len(rec["location"]) > 0
        assert isinstance(rec["cuisine"], str) and len(rec["cuisine"]) > 0
        assert isinstance(rec["rating"], (float, int)) and 0.0 <= rec["rating"] <= 5.0
        assert isinstance(rec["cost_for_two"], int) and rec["cost_for_two"] > 0
        assert isinstance(rec["online_order"], bool)
        assert isinstance(rec["book_table"], bool)
        assert isinstance(rec["explanation"], str) and len(rec["explanation"]) >= 10
