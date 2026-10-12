"""
Configuration — reads GEMINI_API_KEY and dataset settings from environment.
"""
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# HuggingFace dataset identifier
HF_DATASET_ID: str = "ManikaSaini/zomato-restaurant-recommendation"

# Maximum candidates sent to LLM (token budget control)
MAX_CANDIDATES: int = 400

# Budget tier ranges (INR for two people)
BUDGET_RANGES: dict[str, tuple[int, int]] = {
    "low":    (0, 300),
    "medium": (301, 700),
    "high":   (701, 99_999),
}
