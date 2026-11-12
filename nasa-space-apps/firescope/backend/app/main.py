
from pathlib import Path
from functools import lru_cache

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.services.area_summary import summarize


# --------------------------------------------------
# PATHS AND DATA
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MONTHLY_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "harmonized_monthly.parquet"
)

HOTSPOTS_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "clean_hotspots.parquet"
)

DATA_THROUGH = "2026-08"


@lru_cache(maxsize=1)
def load_monthly_data():
    if not MONTHLY_FILE.exists():
        raise FileNotFoundError(
            f"Monthly dataset not found: {MONTHLY_FILE}"
        )

    return pd.read_parquet(MONTHLY_FILE)


@lru_cache(maxsize=1)
def load_hotspot_data():
    if not HOTSPOTS_FILE.exists():
        raise FileNotFoundError(
            f"Hotspot dataset not found: {HOTSPOTS_FILE}"
        )

    return pd.read_parquet(HOTSPOTS_FILE)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def get_bounds(
    df,
    min_lat=None,
    max_lat=None,
    min_lon=None,
    max_lon=None,
):
    supplied = [
        min_lat, max_lat, min_lon, max_lon
    ]

    if all(value is None for value in supplied):
        return (
            float(df["lat"].min()),
            float(df["lat"].max()),
            float(df["lon"].min()),
            float(df["lon"].max()),
        )

    if any(value is None for value in supplied):
        raise HTTPException(
            status_code=400,
            detail="Provide all four AOI coordinates.",
        )

    if min_lat > max_lat or min_lon > max_lon:
        raise HTTPException(
            status_code=400,
            detail="Invalid AOI coordinates.",
        )

    return min_lat, max_lat, min_lon, max_lon


def check_date_range(start, end):
    try:
        start_period = pd.Period(start, freq="M")
        end_period = pd.Period(end, freq="M")
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail="Dates must use YYYY-MM format.",
        ) from error

    if start_period > end_period:
        raise HTTPException(
            status_code=400,
            detail="Start date must not be after end date.",
        )

    if end_period > pd.Period(DATA_THROUGH, freq="M"):
        raise HTTPException(
            status_code=400,
            detail=f"Data is currently available through {DATA_THROUGH}.",
        )


def dataframe_records(df):
    clean_df = df.astype(object).where(
        pd.notna(df),
        None,
    )
    return clean_df.to_dict(orient="records")


def get_area_parameters(
    df,
    min_lat,
    max_lat,
    min_lon,
    max_lon,
):
    return get_bounds(
        df,
        min_lat,
        max_lat,
        min_lon,
        max_lon,
    )


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="FireScope API",
    description="Wildfire activity monitoring for Algeria",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# HOME AND HEALTH
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to FireScope API",
        "status": "running",
    }


@app.get("/api/health")
def health():
    try:
        monthly = load_monthly_data()

        return {
            "status": "healthy",
            "monthly_dataset": "loaded",
            "monthly_rows": len(monthly),
            "data_through": DATA_THROUGH,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error


# --------------------------------------------------
# AREA SUMMARY
# --------------------------------------------------

@app.get("/api/summary")
def summary(
    start: str = "2012-01",
    end: str = "2026-08",
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
):
    try:
        check_date_range(start, end)

        df = load_monthly_data()

        lat_min, lat_max, lon_min, lon_max = (
            get_area_parameters(
                df,
                min_lat,
                max_lat,
                min_lon,
                max_lon,
            )
        )

        result = summarize(
            df,
            lat_min=lat_min,
            lat_max=lat_max,
            lon_min=lon_min,
            lon_max=lon_max,
            start=start,
            end=end,
        )

        return {
            "source": "harmonized_monthly.parquet",
            "metric": "count_harmonized",
            "metric_label": "Fires (MODIS-equivalent)",
            "data_through": DATA_THROUGH,
            "incomplete_year": 2026,
            "calendar": dataframe_records(
                result["calendar"]
            ),
            "summary": result["summary"],
        }

    except HTTPException:
        raise

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error


# --------------------------------------------------
# MONTHLY CALENDAR
# --------------------------------------------------

@app.get("/api/calendar")
def calendar(
    start: str = "2012-01",
    end: str = "2026-08",
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
):
    result = summary(
        start=start,
        end=end,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
    )

    return {
        "source": result["source"],
        "metric": result["metric"],
        "metric_label": result["metric_label"],
        "data_through": result["data_through"],
        "incomplete_year": result["incomplete_year"],
        "data": result["calendar"],
    }


# --------------------------------------------------
# MAP CELLS
# --------------------------------------------------

@app.get("/api/map-cells")
def map_cells(
    year: int,
    month: int,
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
):
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12.",
        )

    if year < 2000 or year > 2026:
        raise HTTPException(
            status_code=400,
            detail="Year must be between 2000 and 2026.",
        )

    if f"{year:04d}-{month:02d}" > DATA_THROUGH:
        raise HTTPException(
            status_code=400,
            detail=f"Data is currently available through {DATA_THROUGH}.",
        )

    try:
        df = load_monthly_data()

        lat_min, lat_max, lon_min, lon_max = (
            get_area_parameters(
                df,
                min_lat,
                max_lat,
                min_lon,
                max_lon,
            )
        )

        selected = df[
            (df["year"] == year)
            & (df["month"] == month)
            & (df["lat"] >= lat_min)
            & (df["lat"] <= lat_max)
            & (df["lon"] >= lon_min)
            & (df["lon"] <= lon_max)
        ][
            [
                "cell_id",
                "lat",
                "lon",
                "count_harmonized",
            ]
        ]

        return {
            "year": year,
            "month": month,
            "metric": "count_harmonized",
            "metric_label": "Fires (MODIS-equivalent)",
            "data": dataframe_records(selected),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error


# --------------------------------------------------
# CLEAN HOTSPOT CSV EXPORT
# --------------------------------------------------

@app.get("/api/export.csv")
def export_csv(
    start: str = "2026-01",
    end: str = "2026-08",
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
):
    try:
        check_date_range(start, end)

        df = load_hotspot_data()

        lat_min, lat_max, lon_min, lon_max = (
            get_area_parameters(
                df.rename(
                    columns={
                        "latitude": "lat",
                        "longitude": "lon",
                    }
                ),
                min_lat,
                max_lat,
                min_lon,
                max_lon,
            )
        )

        dates = pd.to_datetime(
            df["acq_date"],
            errors="coerce",
        )

        start_date = pd.Period(start, freq="M").start_time
        end_date = pd.Period(end, freq="M").end_time

        mask = (
            (dates >= start_date)
            & (dates <= end_date)
            & (df["latitude"] >= lat_min)
            & (df["latitude"] <= lat_max)
            & (df["longitude"] >= lon_min)
            & (df["longitude"] <= lon_max)
        )

        selected = df.loc[mask].copy()

        csv_content = selected.to_csv(index=False)

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition":
                    'attachment; filename="firescope_hotspots.csv"'
            },
        )

    except HTTPException:
        raise

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error
