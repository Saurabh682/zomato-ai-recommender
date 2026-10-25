"""
PromptBuilder — assembles the Gemini prompt from filtered candidates + user prefs.

Design:
- System instruction: role + output format requirement
- User section: preferences + TSV candidate table
- Keeps prompt lean: only fields the LLM needs (no internal _score column)
"""
import pandas as pd

COST_COL = "approx_cost(for two people)"

SYSTEM_INSTRUCTION = """You are an expert restaurant recommendation assistant for India.
Given a list of candidate restaurants and user preferences, select the TOP 5 best matches.

CRITICAL RULES:
1. Only recommend restaurants from the provided candidate list — never invent new ones.
2. Respond ONLY with a valid JSON array (no markdown fences, no extra text).
3. The array must contain exactly min(5, total_candidates) objects.
4. Each object must have these exact keys:
   - "name": restaurant name (string, must match candidate list exactly)
   - "location": location/area (string)
   - "cuisine": primary cuisine types (string)
   - "rating": aggregate rating (number)
   - "cost_for_two": approximate cost for two people in INR (number)
   - "online_order": whether online ordering is available (boolean)
   - "book_table": whether table booking is available (boolean)
   - "explanation": 2-3 sentences explaining why this restaurant fits the user's preferences (string)
5. Rank by best overall fit to user preferences, not just rating alone."""


def build_prompt(
    candidates: pd.DataFrame,
    location: str,
    budget: str,
    cuisine: str,
    min_rating: float,
    preferences: str,
) -> str:
    """Return the user-turn prompt (system instruction is passed separately)."""
    lines = ["## User Preferences"]
    lines.append(f"- **Location**: {location or 'Any'}")
    lines.append(f"- **Budget**: {budget.capitalize()} (₹{'≤300' if budget=='low' else '301–700' if budget=='medium' else '>700'} for two)")
    lines.append(f"- **Cuisine**: {cuisine or 'Any'}")
    lines.append(f"- **Minimum Rating**: {min_rating}")
    if (preferences or "").strip():
        lines.append(f"- **Special Preferences**: {preferences.strip()}")
    lines.append("")

    lines.append(f"## Candidate Restaurants ({len(candidates)} options)")
    lines.append("Format: name | location | cuisines | cost_for_two | rating | votes | online_order | book_table")
    lines.append("")

    for _, row in candidates.iterrows():
        online = "Yes" if str(row.get("online_order", "")).lower() == "yes" else "No"
        table = "Yes" if str(row.get("book_table", "")).lower() == "yes" else "No"
        lines.append(
            f"{row['name']} | {row['location']} | {row['cuisines']} | "
            f"INR {row[COST_COL]} | Rating:{row['aggregate_rating']} | "
            f"{row['votes']} votes | Online:{online} | Table:{table}"
        )

    lines.append("")
    lines.append("Return ONLY the JSON array. No explanation outside the JSON.")
    return "\n".join(lines)
