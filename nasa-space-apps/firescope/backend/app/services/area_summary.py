
"""
Area-level summary for the web app.

Calculates monthly fire activity for a selected area:
- Fires (MODIS-equivalent)
- Historical monthly median (2001–2025)
- Anomaly percentage
- Historical percentile
- Unusual activity flag

Missing cell-months are treated as zero.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


BASELINE_YEARS = (2001, 2025)


def summarize(
    df: pd.DataFrame,
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    start: str,
    end: str,
) -> dict:

    # 1. Filter data to the selected area
    box = df[
        (df.lat >= lat_min)
        & (df.lat <= lat_max)
        & (df.lon >= lon_min)
        & (df.lon <= lon_max)
    ]

    # 2. Sum harmonized activity across all cells by month
    monthly = box.groupby(
        ["year", "month"]
    ).count_harmonized.sum()

    # 3. Build a complete monthly timeline.
    # Months without detections are assigned zero.
    first_year = int(df.year.min())
    first_month = int(
        df[df.year == first_year].month.min()
    )

    last_year = int(df.year.max())
    last_month = int(
        df[df.year == last_year].month.max()
    )

    idx = pd.period_range(
        f"{first_year}-{first_month:02d}",
        f"{last_year}-{last_month:02d}",
        freq="M",
    )

    full = pd.DataFrame({
        "year": idx.year,
        "month": idx.month,
    })

    full["count"] = [
        float(monthly.get((y, m), 0.0))
        for y, m in zip(full.year, full.month)
    ]

    # 4. Calculate historical monthly median
    y0, y1 = BASELINE_YEARS

    historical = full[
        (full.year >= y0)
        & (full.year <= y1)
    ]

    med = historical.groupby("month")["count"].median()

    full["median_month"] = full.month.map(med)

    # 5. Calculate anomaly percentage
    full["anomaly_pct"] = np.where(
        full["median_month"] > 0,
        (
            (full["count"] - full["median_month"])
            / full["median_month"]
        ) * 100,
        np.nan,
    )

    # 6. Calculate percentile against historical values
    # for the same calendar month (2001–2025).
    percentile_by_month = {}

    for month in range(1, 13):
        values = historical.loc[
            historical.month == month,
            "count",
        ].to_numpy()

        percentile_by_month[month] = (
            np.sort(values)
            if len(values)
            else np.array([])
        )

    def calculate_percentile(row):
        values = percentile_by_month[row["month"]]

        if len(values) == 0:
            return np.nan

        return float(
            np.searchsorted(
                values,
                row["count"],
                side="right",
            )
            / len(values)
            * 100
        )

    full["percentile"] = full.apply(
        calculate_percentile,
        axis=1,
    )

    # 7. Flag unusual activity
    full["unusual"] = (
        (full["percentile"] >= 90)
        & (full["count"] > full["median_month"])
    )

    # 8. Select the requested date range
    s = pd.Period(start, "M")
    e = pd.Period(end, "M")

    periods = pd.PeriodIndex.from_fields(
        year=full.year,
        month=full.month,
        freq="M",
    )

    cal = full[
        (periods >= s)
        & (periods <= e)
    ].reset_index(drop=True)

    # 9. Round display values
    cal = cal.round({
        "count": 1,
        "median_month": 1,
        "anomaly_pct": 0,
        "percentile": 1,
    })

    # 10. Calculate area summary
    by_year = cal.groupby("year")["count"].sum()

    top = (
        cal.loc[cal["count"].idxmax()]
        if len(cal) and cal["count"].max() > 0
        else None
    )

    summary = {
        "total_fires": round(
            float(cal["count"].sum()), 1
        ),
        "busiest_month": (
            f"{int(top.year)}-{int(top.month):02d}"
            if top is not None
            else None
        ),
        "busiest_month_count": (
            float(top["count"])
            if top is not None
            else 0.0
        ),
        "busiest_year": (
            int(by_year.idxmax())
            if len(by_year) and by_year.max() > 0
            else None
        ),
        "n_cells_with_fire": int(
            box.cell_id.nunique()
        ),
    }

    return {
        "calendar": cal,
        "summary": summary,
    }


DUCKDB_SQL = """
-- Parameters:
-- $lat_min, $lat_max, $lon_min, $lon_max
-- Historical baseline: 2001–2025

WITH months AS (
    SELECT
        year(d) AS year,
        month(d) AS month
    FROM range(
        DATE '2000-11-01',
        DATE '2026-09-01',
        INTERVAL 1 MONTH
    ) t(d)
),

area AS (
    SELECT
        year,
        month,
        SUM(count_harmonized) AS cnt
    FROM 'data/processed/harmonized_monthly.parquet'
    WHERE
        lat BETWEEN $lat_min AND $lat_max
        AND lon BETWEEN $lon_min AND $lon_max
    GROUP BY 1, 2
),

series AS (
    SELECT
        m.year,
        m.month,
        COALESCE(a.cnt, 0) AS cnt
    FROM months m
    LEFT JOIN area a USING (year, month)
),

med AS (
    SELECT
        month,
        MEDIAN(cnt) AS median_month
    FROM series
    WHERE year BETWEEN 2001 AND 2025
    GROUP BY month
)

SELECT
    s.year,
    s.month,
    s.cnt AS count,
    med.median_month,
    CASE
        WHEN med.median_month > 0
        THEN (
            (s.cnt - med.median_month)
            / med.median_month
        ) * 100
    END AS anomaly_pct
FROM series s
JOIN med USING (month)
ORDER BY s.year, s.month;
"""


if __name__ == "__main__":

    # Project root: firescope/
    project_root = Path(__file__).resolve().parents[3]

    data_path = (
        project_root
        / "data"
        / "processed"
        / "harmonized_monthly.parquet"
    )

    df = pd.read_parquet(data_path)

    # Kabylie validation: August 2021
    result = summarize(
        df,
        lat_min=36.4,
        lat_max=36.95,
        lon_min=3.7,
        lon_max=5.2,
        start="2021-08",
        end="2021-08",
    )

    print("\nCalendar:")
    print(result["calendar"].to_string(index=False))

    print("\nSummary:")
    print(result["summary"])
