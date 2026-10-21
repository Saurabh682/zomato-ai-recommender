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
    try:
        data = json.loads(cleaned)
    except Exception as exc:
        logger.warning("Failed to parse JSON from LLM: %s", exc)
        return []

    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for val in data.values():
            if isinstance(val, list):
                return val
    return []


def _normalize_recommendations(
    recommendations: list[dict],
    candidates: pd.DataFrame
) -> list[dict]:
    """Validate against candidates and normalize fields into strict schema types."""
    candidate_lookup = {}
    for _, row in candidates.iterrows():
        c_name = str(row["name"]).strip()
        candidate_lookup[c_name.lower()] = {
            "name": c_name,
            "location": str(row.get("location", "")),
            "cuisines": str(row.get("cuisines", "")),
            "aggregate_rating": float(row.get("aggregate_rating", 0.0)),
            COST_COL: int(row.get(COST_COL, 0)),
            "online_order": str(row.get("online_order", "")).lower() == "yes",
            "book_table": str(row.get("book_table", "")).lower() == "yes",
        }

    valid = []
    for r in recommendations:
        if not isinstance(r, dict):
            continue
        raw_name = str(r.get("name", "")).strip()
        matched = candidate_lookup.get(raw_name.lower())
        if not matched:
            continue

        # Correct name to exact candidate name
        canonical_name = matched["name"]

        # Parse numeric fields safely
        try:
            rating = float(r.get("rating", matched["aggregate_rating"]))
        except (ValueError, TypeError):
            rating = matched["aggregate_rating"]

        try:
            cost = int(r.get("cost_for_two", matched[COST_COL]))
        except (ValueError, TypeError):
            cost = matched[COST_COL]

        # Parse boolean flags safely
        online = r.get("online_order")
        if online is None:
            online = matched["online_order"]
        elif isinstance(online, str):
            online = online.lower() in ("yes", "true", "1")
        else:
            online = bool(online)

        book = r.get("book_table")
        if book is None:
            book = matched["book_table"]
        elif isinstance(book, str):
            book = book.lower() in ("yes", "true", "1")
        else:
            book = bool(book)

        explanation = str(
            r.get("explanation")
            or f"Highly recommended match with a {rating}/5 rating serving {matched['cuisines']} in {matched['location']}."
        ).strip()

        valid.append({
            "name": canonical_name,
            "location": str(r.get("location") or matched["location"]).strip(),
            "cuisine": str(r.get("cuisine") or r.get("cuisines") or matched["cuisines"]).strip(),
            "rating": rating,
            "cost_for_two": cost,
            "online_order": online,
            "book_table": book,
            "explanation": explanation,
        })

    if len(valid) < len(recommendations):
        dropped = len(recommendations) - len(valid)
        logger.warning("Dropped %d unverified/hallucinated recommendations", dropped)

    return valid


def _call_groq(prompt: str) -> str:
    """Invoke Groq LLM API with explicit request timeout."""
    from groq import Groq

    client = Groq(api_key=GROQ_API_KEY, timeout=12.0)
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

    # If user provided specific preferences or vibes, boost candidates matching keywords
    # so relevant options are prioritized into the top 50 sent to LLM
    if preferences and preferences.strip():
        pref_words = [w.lower() for w in re.findall(r"\w{3,}", preferences)]
        if pref_words:
            def _keyword_boost(row):
                cuis = str(row.get("cuisines", "")).lower()
                name = str(row.get("name", "")).lower()
                return sum(1 for w in pref_words if w in cuis or w in name)

            boosts = unique_candidates.apply(_keyword_boost, axis=1)
            if boosts.max() > 0:
                unique_candidates = unique_candidates.assign(_boost=boosts).sort_values(
                    by=["_boost", "_score"], ascending=[False, False]
                ).drop(columns=["_boost"])

    prompt = build_prompt(unique_candidates.iloc[:50], location, budget, cuisine, min_rating, preferences)

    # Try configured LLM providers: Groq first if key present, else Gemini
    providers = []
    if GROQ_API_KEY and GROQ_API_KEY != "your_groq_api_key_here":
        providers.append(("Groq", _call_groq))
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        providers.append(("Gemini", _call_gemini))

    for provider_name, provider_fn in providers:
        for attempt in range(2):
            try:
                logger.info("Calling %s LLM (attempt %d)...", provider_name, attempt + 1)
                raw = provider_fn(prompt)
                parsed = _parse_llm_json(raw)
                recommendations = _normalize_recommendations(parsed, unique_candidates)

                if not recommendations:
                    raise ValueError(f"No valid recommendations after normalization check from {provider_name}")

                logger.info("%s returned %d valid recommendations", provider_name, len(recommendations))
                return recommendations[:5], False

            except Exception as exc:
                logger.warning("%s attempt %d failed: %s", provider_name, attempt + 1, exc)
                if attempt == 0:
                    time.sleep(1)

    # If no provider succeeded or no valid API key was configured
    logger.info("Using heuristic top-5 fallback")
    return _heuristic_top5(candidates), True
