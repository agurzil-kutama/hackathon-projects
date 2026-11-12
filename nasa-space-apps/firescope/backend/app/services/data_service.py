import random
import csv
from collections import defaultdict
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODIS_FILE = (
    PROJECT_ROOT / "data/01_Raw_History/modis_history_2000_2026.csv"
)
VIIRS_FILE = (
    PROJECT_ROOT / "data/01_Raw_History/viirs_history_2012_2026.csv"
)

# Preliminary geographic extent, not an exact national boundary.
MIN_LAT = 18.9
MAX_LAT = 37.2
MIN_LON = -8.7
MAX_LON = 12.0


def process_csv(
    file_path: Path,
    sensor: str,
    monthly_counts: dict,
    aoi: tuple[float, float, float, float] | None = None,
) -> None:
    if not file_path.exists():
        raise FileNotFoundError(f"Data file not found: {file_path}")

    with file_path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as csv_file:
        reader = csv.DictReader(csv_file)

        required_columns = {
            "latitude",
            "longitude",
            "acq_date",
            "type",
        }

        available_columns = set(reader.fieldnames or [])
        missing_columns = required_columns - available_columns

        if missing_columns:
            raise ValueError(
                f"{file_path.name} is missing columns: "
                f"{sorted(missing_columns)}"
            )

        for row in reader:
            # Initially include presumed vegetation fire detections.
            if row.get("type", "").strip() != "0":
                continue

            try:
                lat = float(row["latitude"])
                lon = float(row["longitude"])
                acquisition_date = date.fromisoformat(row["acq_date"])
            except (ValueError, TypeError, KeyError):
                continue

            # Always apply the preliminary Algeria extent.
            if not (
                MIN_LAT <= lat <= MAX_LAT
                and MIN_LON <= lon <= MAX_LON
            ):
                continue

            # Apply the user's selected rectangle, if present.
            if aoi is not None:
                min_lat, max_lat, min_lon, max_lon = aoi

                if not (
                    min_lat <= lat <= max_lat
                    and min_lon <= lon <= max_lon
                ):
                    continue

            key = (acquisition_date.year, acquisition_date.month)

            if key not in monthly_counts:
                monthly_counts[key] = {
                    "count_raw_modis": 0,
                    "count_raw_viirs": 0,
                }

            field = (
                "count_raw_modis"
                if sensor == "MODIS"
                else "count_raw_viirs"
            )

            monthly_counts[key][field] += 1


@lru_cache(maxsize=32)
def load_raw_monthly_data(
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
) -> tuple[dict[str, Any], ...]:

    aoi = None

    if all(
        value is not None
        for value in (min_lat, max_lat, min_lon, max_lon)
    ):
        aoi = (min_lat, max_lat, min_lon, max_lon)

    monthly_counts = defaultdict(
        lambda: {
            "count_raw_modis": 0,
            "count_raw_viirs": 0,
        }
    )

    process_csv(MODIS_FILE, "MODIS", monthly_counts, aoi)
    process_csv(VIIRS_FILE, "VIIRS", monthly_counts, aoi)

    results = []

    for (year, month), counts in sorted(monthly_counts.items()):
        results.append({
            "year": year,
            "month": month,
            "count_raw_modis": counts["count_raw_modis"],
            "count_raw_viirs": counts["count_raw_viirs"],
        })

    return tuple(results)


def get_raw_calendar(
    start_year: int,
    end_year: int,
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
) -> dict[str, Any]:

    if start_year > end_year:
        raise ValueError(
            "start_year must be less than or equal to end_year"
        )

    if end_year - start_year > 20:
        raise ValueError("Maximum year range is 20 years")

    coordinates = (min_lat, max_lat, min_lon, max_lon)

    if any(value is not None for value in coordinates):
        if any(value is None for value in coordinates):
            raise ValueError(
                "All four AOI coordinates must be provided"
            )

        if min_lat >= max_lat or min_lon >= max_lon:
            raise ValueError("Invalid AOI rectangle")

        if (
            min_lat < MIN_LAT
            or max_lat > MAX_LAT
            or min_lon < MIN_LON
            or max_lon > MAX_LON
        ):
            raise ValueError(
                "AOI must be inside the preliminary Algeria extent"
            )

    all_months = load_raw_monthly_data(
        min_lat,
        max_lat,
        min_lon,
        max_lon,
    )

    filtered = [
        item
        for item in all_months
        if start_year <= item["year"] <= end_year
    ]

    result = {
        "source": "RAW_UNHARMONIZED",
        "geographic_filter": (
            "SELECTED_AOI_WITHIN_PRELIMINARY_ALGERIA_EXTENT"
            if min_lat is not None
            else "PRELIMINARY_ALGERIA_BOUNDING_BOX"
        ),
        "fire_filter": "type = 0",
        "data": filtered,
    }

    if min_lat is not None:
        result["aoi"] = {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lon": min_lon,
            "max_lon": max_lon,
        }

    return result



def get_hotspots(
    sensor: str,
    year: int,
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
    limit: int = 2000,
) -> dict[str, Any]:
    sensor = sensor.upper()

    if sensor not in {"MODIS", "VIIRS"}:
        raise ValueError("Sensor must be MODIS or VIIRS")

    if year < 2000 or year > 2026:
        raise ValueError("Year must be between 2000 and 2026")

    if limit < 1 or limit > 5000:
        raise ValueError("Limit must be between 1 and 5000")

    coordinates = (min_lat, max_lat, min_lon, max_lon)

    if any(value is not None for value in coordinates):
        if any(value is None for value in coordinates):
            raise ValueError("All four AOI coordinates must be provided")

        if min_lat >= max_lat or min_lon >= max_lon:
            raise ValueError("Invalid AOI rectangle")

        if (
            min_lat < MIN_LAT
            or max_lat > MAX_LAT
            or min_lon < MIN_LON
            or max_lon > MAX_LON
        ):
            raise ValueError(
                "AOI must be inside the preliminary Algeria extent"
            )

    file_path = MODIS_FILE if sensor == "MODIS" else VIIRS_FILE

    if not file_path.exists():
        raise FileNotFoundError(f"Data file not found: {file_path}")

    rng = random.Random(42)
    hotspots = []
    total_matching = 0

    with file_path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as csv_file:
        reader = csv.DictReader(csv_file)

        required_columns = {
            "latitude",
            "longitude",
            "acq_date",
            "type",
        }

        available_columns = set(reader.fieldnames or [])
        missing_columns = required_columns - available_columns

        if missing_columns:
            raise ValueError(
                f"{file_path.name} is missing columns: "
                f"{sorted(missing_columns)}"
            )

        for row in reader:
            # Keep the same preliminary type filter as the calendar.
            if row.get("type", "").strip() != "0":
                continue

            try:
                lat = float(row["latitude"])
                lon = float(row["longitude"])
                acquisition_date = date.fromisoformat(row["acq_date"])
            except (ValueError, TypeError, KeyError):
                continue

            if acquisition_date.year != year:
                continue

            if not (
                MIN_LAT <= lat <= MAX_LAT
                and MIN_LON <= lon <= MAX_LON
            ):
                continue

            if min_lat is not None and not (
                min_lat <= lat <= max_lat
                and min_lon <= lon <= max_lon
            ):
                continue

            total_matching += 1

            try:
                frp = float(row["frp"])
            except (ValueError, TypeError, KeyError):
                frp = None

            hotspot = {
                "latitude": lat,
                "longitude": lon,
                "date": acquisition_date.isoformat(),
                "acq_time": row.get("acq_time", ""),
                "sensor": sensor,
                "frp": frp,
                "confidence": row.get("confidence", ""),
            }

            # Deterministic reservoir sampling avoids favoring
            # detections that appear earlier in the CSV.
            if len(hotspots) < limit:
                hotspots.append(hotspot)
            else:
                replacement_index = rng.randrange(total_matching)
                if replacement_index < limit:
                    hotspots[replacement_index] = hotspot

    hotspots.sort(key=lambda item: (item["date"], item["latitude"]))

    result = {
        "source": "RAW_UNHARMONIZED",
        "sensor": sensor,
        "year": year,
        "fire_filter": "type = 0",
        "total_matching": total_matching,
        "returned": len(hotspots),
        "limit": limit,
        "sampled": total_matching > len(hotspots),
        "data": hotspots,
    }

    if min_lat is not None:
        result["aoi"] = {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lon": min_lon,
            "max_lon": max_lon,
        }

    return result