const API_URL = "http://127.0.0.1:8000";

// Geographic bounds for the selected Area of Interest
export interface AOIBounds {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

// One month in the harmonized activity calendar
export interface CalendarItem {
  year: number;
  month: number;
  count: number;
  median_month: number;
  anomaly_pct: number;
  percentile: number;
  unusual: boolean;
}

// Summary statistics calculated across the selected area
export interface AreaSummary {
  total_fires: number;
  busiest_month: string | null;
  busiest_month_count: number;
  busiest_year: number | null;
  n_cells_with_fire: number;
}

// Complete summary response
export interface SummaryResponse {
  source: string;
  metric: string;
  metric_label: string;
  data_through: string;
  incomplete_year: number;
  calendar: CalendarItem[];
  summary: AreaSummary;
}

// One active harmonized grid cell
export interface MapCell {
  cell_id: string;
  lat: number;
  lon: number;
  count_harmonized: number;
}

// Map response
export interface MapCellsResponse {
  year: number;
  month: number;
  metric: string;
  metric_label: string;
  data: MapCell[];
}

// Build query parameters for an optional AOI
function addBounds(
  params: URLSearchParams,
  bounds?: AOIBounds | null
) {
  if (!bounds) return;

  params.set("min_lat", String(bounds.min_lat));
  params.set("max_lat", String(bounds.max_lat));
  params.set("min_lon", String(bounds.min_lon));
  params.set("max_lon", String(bounds.max_lon));
}

// Load the harmonized calendar and area summary
export async function getSummary(
  bounds?: AOIBounds | null
): Promise<SummaryResponse> {
  const params = new URLSearchParams({
    start: "2001-01",
    end: "2026-08",
  });

  addBounds(params, bounds);

  const response = await fetch(
    `${API_URL}/api/summary?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.detail || "Failed to load FireScope summary."
    );
  }

  return response.json();
}

// Load harmonized grid cells for the selected month
export async function getMapCells(
  year: number,
  month: number,
  bounds?: AOIBounds | null
): Promise<MapCellsResponse> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });

  addBounds(params, bounds);

  const response = await fetch(
    `${API_URL}/api/map-cells?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.detail || "Failed to load map activity."
    );
  }

  return response.json();
}

// Build the individual-detection CSV download URL
export function getExportUrl(
  year: number,
  month: number,
  bounds?: AOIBounds | null
): string {
  const date = `${year}-${String(month).padStart(2, "0")}`;

  const params = new URLSearchParams({
    start: date,
    end: date,
  });

  addBounds(params, bounds);

  return `${API_URL}/api/export.csv?${params.toString()}`;
}
