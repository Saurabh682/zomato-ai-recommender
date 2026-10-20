"""
DataLoader — loads the Zomato dataset from a pre-packed compressed CSV.

Handles:
- Column normalization (cost commas, rating "4.1/5" / "NEW" conversion)
- Schema validation on startup
- HuggingFace download fallback (local dev only, requires datasets package)
"""
import logging
import math
from pathlib import Path

import pandas as pd

from config import HF_DATASET_ID

logger = logging.getLogger(__name__)

# Required columns expected in the final cleaned DataFrame
REQUIRED_COLUMNS = {
    "name",
    "location",
    "cuisines",
    "approx_cost(for two people)",
    "aggregate_rating",
    "votes",
}

# Pre-cleaned embedded dataset (1.2MB compressed, ~18MB RAM) for instant startup on low-memory tiers (Render Free Tier 512MB)
_PREPACKED_CLEAN_GZ = Path(__file__).resolve().parent.parent / "data" / "restaurants_clean.csv.gz"

# Optional cache path to avoid re-downloading
_CACHE_CSV = Path(__file__).parent / ".data_cache.csv"


class DataLoader:
    _df: pd.DataFrame | None = None

    @classmethod
    def is_loaded(cls) -> bool:
        return cls._df is not None

    @classmethod
    def get_df(cls) -> pd.DataFrame:
        if cls._df is None:
            cls._df = cls._load()
        return cls._df

    @classmethod
    def _load(cls) -> pd.DataFrame:
        # 1. Try embedded pre-cleaned compressed dataset first (avoids Render Free Tier 512MB OOM)
        if _PREPACKED_CLEAN_GZ.exists():
            logger.info("Loading dataset from pre-packed clean archive: %s", _PREPACKED_CLEAN_GZ)
            df = pd.read_csv(_PREPACKED_CLEAN_GZ, compression="gzip", low_memory=False)
        # 2. Try local cache file
        elif _CACHE_CSV.exists():
            logger.info("Loading dataset from local cache: %s", _CACHE_CSV)
            df = pd.read_csv(_CACHE_CSV, low_memory=False)
        # 3. Fallback: download raw from HuggingFace (needs `datasets` package — dev only)
        else:
            try:
                from datasets import load_dataset  # lazy import — not installed on Render
            except ImportError:
                raise RuntimeError(
                    "Pre-packed dataset not found and 'datasets' package is not installed. "
                    "Ensure backend/data/restaurants_clean.csv.gz is committed to the repo."
                )
            logger.info("Downloading dataset from HuggingFace: %s", HF_DATASET_ID)
            hf_dataset = load_dataset(HF_DATASET_ID, split="train")
            df = hf_dataset.to_pandas()
            try:
                df.to_csv(_CACHE_CSV, index=False)
                logger.info("Dataset cached to %s", _CACHE_CSV)
            except Exception as e:
                logger.warning("Could not persist local cache file: %s", e)

        df = cls._clean(df)
        cls._validate_schema(df)
        logger.info("Dataset ready: %d restaurants", len(df))
        return df

    @classmethod
    def _clean(cls, df: pd.DataFrame) -> pd.DataFrame:
        # Normalize cost column: "1,200" → 1200, blanks → 0
        cost_col = "approx_cost(for two people)"
        if cost_col in df.columns:
            df[cost_col] = (
                df[cost_col]
                .astype(str)
                .str.replace(",", "", regex=False)
                .str.strip()
                .pipe(pd.to_numeric, errors="coerce")
                .fillna(0)
                .astype(int)
            )
        else:
            df[cost_col] = 0

        # Normalize rating:
        # In the Hugging Face dataset, rating is in 'rate' as '4.1/5', 'NEW', '-', or NaN
        if "rate" in df.columns:
            df["aggregate_rating"] = (
                df["rate"]
                .astype(str)
                .str.split("/")
                .str[0]
                .str.strip()
                .pipe(pd.to_numeric, errors="coerce")
                .fillna(0.0)
            )
        elif "aggregate_rating" in df.columns:
            df["aggregate_rating"] = pd.to_numeric(
                df["aggregate_rating"], errors="coerce"
            ).fillna(0.0)
        else:
            df["aggregate_rating"] = 0.0

        # Normalize votes: coerce to int, fill NaN → 0
        if "votes" in df.columns:
            df["votes"] = pd.to_numeric(df["votes"], errors="coerce").fillna(0).astype(int)
        else:
            df["votes"] = 0

        # Normalize string columns
        for col in ["name", "location", "cuisines"]:
            if col in df.columns:
                df[col] = df[col].fillna("").astype(str).str.strip()
            else:
                df[col] = ""

        # Add a convenience composite score for ranking candidates
        df["_score"] = df["aggregate_rating"] * (
            df["votes"].apply(lambda v: math.log10(v + 1))
        )

        return df

    @classmethod
    def _validate_schema(cls, df: pd.DataFrame) -> None:
        missing = REQUIRED_COLUMNS - set(df.columns)
        if missing:
            raise RuntimeError(
                f"Dataset schema mismatch — missing columns: {missing}. "
                "Update data_loader.py to match the current HuggingFace schema."
            )
