"""
Filterer — filters the Zomato DataFrame based on user preferences.

Strategy:
1. Location: case-insensitive substring match
2. Budget: maps tier → INR range → cost_for_two column
3. Cuisine: case-insensitive substring match in cuisines column
4. Min Rating: aggregate_rating >= min_rating
5. Cap at MAX_CANDIDATES rows, sorted by _score desc
"""
import logging
import re

import pandas as pd

from config import BUDGET_RANGES, MAX_CANDIDATES

logger = logging.getLogger(__name__)

COST_COL = "approx_cost(for two people)"


def filter_restaurants(
    df: pd.DataFrame,
    location: str,
    budget: str,
    cuisine: str,
    min_rating: float,
) -> pd.DataFrame:
    """Return ≤MAX_CANDIDATES rows matching user preferences."""
    mask = pd.Series([True] * len(df), index=df.index)

    # 1. Location filter — partial match, case-insensitive
    loc_clean = location.strip()
    if loc_clean:
        if loc_clean.lower() in ("bangalore", "bengaluru"):
            # All records are in Bangalore; city-wide search
            pass
        else:
            mask &= df["location"].str.contains(loc_clean, case=False, na=False)

    # 2. Budget filter
    budget_key = budget.lower().strip()
    if budget_key in BUDGET_RANGES:
        lo, hi = BUDGET_RANGES[budget_key]
        mask &= (df[COST_COL] >= lo) & (df[COST_COL] <= hi)

    # 3. Cuisine filter — partial match (supports single or multi-cuisine comma-separated: "Pizza, Cafe")
    cuis_clean = cuisine.strip()
    if cuis_clean and cuis_clean.lower() not in ("any", "all"):
        cuis_parts = [p.strip() for p in cuis_clean.split(",") if p.strip()]
        if len(cuis_parts) == 1:
            mask &= df["cuisines"].str.contains(cuis_parts[0], case=False, na=False)
        elif len(cuis_parts) > 1:
            pattern = "|".join(re.escape(p) for p in cuis_parts)
            mask &= df["cuisines"].str.contains(pattern, case=False, na=False)

    # 4. Rating filter
    if min_rating > 0:
        mask &= df["aggregate_rating"] >= min_rating

    result = df[mask].copy()

    # 5. Cap at MAX_CANDIDATES, best-scored first
    if len(result) > MAX_CANDIDATES:
        result = result.nlargest(MAX_CANDIDATES, "_score")
    else:
        result = result.sort_values("_score", ascending=False)

    logger.info(
        "Filter [loc=%r budget=%r cuisine=%r rating>=%.1f] → %d rows",
        location, budget, cuisine, min_rating, len(result),
    )
    return result
