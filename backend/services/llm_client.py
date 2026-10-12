"""
LLM Client — handles restaurant recommendation generation.

Supports:
1. Groq API (openai/gpt-oss-120b, lightning-fast inference) when GROQ_API_KEY is configured
2. Google Gemini API (gemini-3.8-flash) when GEMINI_API_KEY is configured
3. Heuristic fallback when LLM APIs are unreachable or unconfigured
"""
import json
import logging
import math
import re
import time

import pandas as pd

from config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL
from services.prompt_builder import SYSTEM_INSTRUCTION, build_prompt

logger = logging.getLogger(__name__)

COST_COL = "approx_cost(for two people)"


def _heuristic_top5(candidates: pd.DataFrame) -> list[dict]:
    """Fallback: return top-5 unique restaurants by _score without LLM."""
    unique = candidates.drop_duplicates(subset=["name"])
    top = unique.nlargest(5, "_score") if len(unique) >= 5 else unique
    results = []
    for _, row in top.iterrows():
        results.append({
            "name": row["name"],
            "location": row["location"],
            "cuisine": row["cuisines"],
            "rating": float(row["aggregate_rating"]),
            "cost_for_two": int(row[COST_COL]),
            "online_order": str(row.get("online_order", "")).lower() == "yes",
            "book_table": str(row.get("book_table", "")).lower() == "yes",
            "explanation": (
                f"Highly rated restaurant ({row['aggregate_rating']}/5 rating) "
                f"with {row['votes']} reviews serving {row['cuisines']}. "
                "(AI explanation unavailable — showing top-rated fallback.)"
            ),
        })
    return results


def _parse_llm_json(raw: str) -> list[dict]:
    """Strip markdown fences and parse JSON (array or wrapped dict)."""
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    data = json.loads(cleaned)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for val in data.values():
            if isinstance(val, list):
                return val
    return []


def _validate_names(recommendations: list[dict], candidate_names: set[str]) -> list[dict]:
    """Drop any hallucinated restaurants not in candidate list."""
    valid = [r for r in recommendations if r.get("name") in candidate_names]
    if len(valid) < len(recommendations):
        dropped = len(recommendations) - len(valid)
        logger.warning("Dropped %d hallucinated recommendations", dropped)
    return valid


def _call_groq(prompt: str) -> str:
    """Invoke Groq LLM API."""
    from groq import Groq

    client = Groq(api_key=GROQ_API_KEY)
    chat = client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
        model=GROQ_MODEL,
        temperature=0.3,
    )
    return chat.choices[0].message.content or ""


def _call_gemini(prompt: str) -> str:
    """Invoke Gemini API."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            temperature=0.3,
            max_output_tokens=2048,
        ),
    )
    return response.text or ""


def get_recommendations(
    candidates: pd.DataFrame,
    location: str,
    budget: str,
    cuisine: str,
    min_rating: float,
    preferences: str,
) -> tuple[list[dict], bool]:
    """
    Returns (recommendations, is_llm_fallback).
    recommendations: list of up to 5 dicts
    is_llm_fallback: True if heuristic was used instead of LLM
    """
    if candidates.empty:
        return [], False

    unique_candidates = candidates.drop_duplicates(subset=["name"])
    prompt = build_prompt(unique_candidates[:50], location, budget, cuisine, min_rating, preferences)
    candidate_names = set(unique_candidates["name"].tolist())

    # Try configured LLM providers: Groq first if key present, else Gemini
    providers = []
    if GROQ_API_KEY and GROQ_API_KEY.startswith("gsk_"):
        providers.append(("Groq", _call_groq))
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        providers.append(("Gemini", _call_gemini))

    for provider_name, provider_fn in providers:
        for attempt in range(2):
            try:
                logger.info("Calling %s LLM (attempt %d)...", provider_name, attempt + 1)
                raw = provider_fn(prompt)
                recommendations = _parse_llm_json(raw)
                recommendations = _validate_names(recommendations, candidate_names)

                if not recommendations:
                    raise ValueError(f"No valid recommendations after hallucination check from {provider_name}")

                logger.info("%s returned %d valid recommendations", provider_name, len(recommendations))
                return recommendations[:5], False

            except Exception as exc:
                logger.warning("%s attempt %d failed: %s", provider_name, attempt + 1, exc)
                if attempt == 0:
                    time.sleep(1)

    # If no provider succeeded or no valid API key was configured
    logger.info("Using heuristic top-5 fallback")
    return _heuristic_top5(candidates), True
