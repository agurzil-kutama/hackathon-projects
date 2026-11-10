# FireScope

Harmonizing MODIS and VIIRS Hot Spots into a Burning Activity Calendar.

## What it does
FireScope merges NASA MODIS and VIIRS active-fire detections into one comparable monthly time series. Users select an area and date range, then see a burning activity calendar, historical anomalies, and a CSV export.

## Pilot Region
Algeria. The architecture is designed to support other regions.

## Data Sources
- NASA FIRMS MODIS C6.1 archive: 2000–2026
- NASA FIRMS VIIRS Suomi-NPP C2 archive: 2012–2026

*Raw data is hosted on Google Drive due to GitHub size limits: [PASTE YOUR GOOGLE DRIVE LINK HERE]*

## Tech Stack
- Frontend: React + TypeScript + Leaflet
- Backend: FastAPI + DuckDB
- Data Pipeline: Python, Pandas, PyArrow, Parquet

## Repository Structure
- `frontend/` — Web application
- `backend/` — API and CSV export
- `data-pipeline/` — Cleaning, harmonization, anomaly scripts
- `docs/` — Data contract, sources, limits, methodology

## Documentation
- [Data Dictionary](docs/data-dictionary.md)
- [Data Sources](docs/data-sources.md)
- [Data Limits](docs/data-limits.md)

## Team
CCS — NASA Space Apps 2026
- Project Lead & Data Collector: Adel Boutaghane
- Data Scientist: [Friend's Name]
- Web Developer: [Friend's Name]
