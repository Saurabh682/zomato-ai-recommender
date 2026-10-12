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
    if location.strip():
        mask &= df["location"].str.contains(location.strip(), case=False, na=False)

    # 2. Budget filter
    budget_key = budget.lower().strip()
    if budget_key in BUDGET_RANGES:
        lo, hi = BUDGET_RANGES[budget_key]
        # Include 0-cost records only when min is 0 (unknown cost)
        cost_mask = (df[COST_COL] >= lo) & (df[COST_COL] <= hi)
        if lo > 0:
            cost_mask |= df[COST_COL] == 0  # unknown cost — keep for LLM to judge
        mask &= cost_mask

    # 3. Cuisine filter — partial match
    if cuisine.strip():
        mask &= df["cuisines"].str.contains(cuisine.strip(), case=False, na=False)

    # 4. Rating filter
    if min_rating > 0:
        mask &= df["aggregate_rating"] >= min_rating

    result = df[mask].copy()

    # 5. Cap at MAX_CANDIDATES, best-scored first
    if len(result) > MAX_CANDIDATES:
        result = result.nlargest(MAX_CANDIDATES, "_score")

    logger.info(
        "Filter [loc=%r budget=%r cuisine=%r rating>=%.1f] → %d rows",
        location, budget, cuisine, min_rating, len(result),
    )
    return result
