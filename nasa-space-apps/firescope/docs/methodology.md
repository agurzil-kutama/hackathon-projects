# FireScope Methodology

## Data Sources
NASA FIRMS MODIS C6.1 (2000–2026) and VIIRS Suomi-NPP C2 (2012–2026).

## Filters
- Confidence threshold: [To be filled by Data Scientist]
- Day/night handling: [To be filled by Data Scientist]
- Static source / gas flare removal: [To be filled by Data Scientist]

## Harmonization
1. Snap VIIRS detections to a 1 km grid.
2. Use the 2012–present overlap period to calibrate VIIRS to MODIS-equivalent counts.
3. Compute historical median and anomaly percentage per cell and calendar month.

## Limitations
- FIRMS does not provide clean overpass-coverage data.
- VIIRS detects smaller fires than MODIS.
- Calibration reduces but does not eliminate sensor bias.
