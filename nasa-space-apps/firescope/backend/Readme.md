# FireScope — Backend

**FastAPI wildfire data and analytics service**

The FireScope backend provides data access, spatial filtering, historical fire-activity analysis, and CSV export functionality for the Algeria wildfire monitoring dashboard.

## Technology Stack

- Python
- FastAPI
- DuckDB
- Pandas
- NumPy
- PyArrow
- Uvicorn

## Requirements

- Python 3.10+
- pip

## Installation

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the API

From the backend directory, run:

```bash
uvicorn app.main:app --reload
```

API base URL:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `/api/health` | Backend and dataset health |
| `/api/summary` | Area-level historical summary |
| `/api/calendar` | Monthly historical activity |
| `/api/map-cells` | Monthly spatial grid-cell activity |
| `/api/export.csv` | Export cleaned detection points |

## Data Sources

The backend uses two prepared Parquet datasets:

- `harmonized_monthly.parquet` — monthly harmonized grid-cell activity.
- `clean_hotspots.parquet` — cleaned individual satellite detection points for CSV exports.

The datasets must be available at the locations expected by the backend configuration.

## Analytical Methodology

The primary activity metric is `count_harmonized`, expressed as Fires (MODIS-equivalent).

Historical normal is calculated using the median for the same calendar month across 2001–2025.

Anomaly percentage:

```text
(current activity - historical normal)
 / historical normal * 100
```

Unusual activity is identified using the project's same-month historical percentile and median criteria.

Dataset coverage currently extends through August 2026.

## Project Context

FireScope is an independent project developed for the NASA Space Apps Challenge 2026.

**Pilot region:** Algeria
