
import { useEffect, useState } from "react";

import MapView from "./Components/Mapview";
import type { AOIBounds } from "./Components/Mapview";

import {
  getSummary,
  getMapCells,
  getExportUrl,
} from "./services/api";

import type {
  CalendarItem,
  AreaSummary,
  MapCell,
} from "./services/api";

const years = Array.from({ length: 26 }, (_, index) => 2001 + index);

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getHeatColor(value: number, max: number) {
  if (value <= 0 || max === 0) return "#192b40";

  const ratio = value / max;

  if (ratio < 0.2) return "#c7dff0";
  if (ratio < 0.4) return "#91c4e3";
  if (ratio < 0.6) return "#579dca";
  if (ratio < 0.8) return "#2673aa";

  return "#12466f";
}

function formatCount(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

function formatMonthLabel(value: string | null) {
  if (!value) return "—";

  const [year, month] = value.split("-").map(Number);

  if (!year || !month) return value;

  return `${months[month - 1]} ${year}`;
}

function App() {
  const [selectedBounds, setSelectedBounds] =
    useState<AOIBounds | null>(null);

  const [calendarData, setCalendarData] =
    useState<CalendarItem[]>([]);

  const [areaSummary, setAreaSummary] =
    useState<AreaSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mapYear, setMapYear] = useState(2026);
  const [mapMonth, setMapMonth] = useState(8);

  const [cells, setCells] = useState<MapCell[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");

        const result = await getSummary(selectedBounds);

        if (!cancelled) {
          setCalendarData(result.calendar);
          setAreaSummary(result.summary);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load FireScope data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [selectedBounds]);

  useEffect(() => {
    let cancelled = false;

    async function loadCells() {
      try {
        setMapLoading(true);
        setMapError("");

        const result = await getMapCells(
          mapYear,
          mapMonth,
          selectedBounds
        );

        if (!cancelled) setCells(result.data);
      } catch (err) {
        if (!cancelled) {
          setCells([]);
          setMapError(
            err instanceof Error
              ? err.message
              : "Unable to load map activity."
          );
        }
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    }

    loadCells();

    return () => {
      cancelled = true;
    };
  }, [mapYear, mapMonth, selectedBounds]);

  function getCalendarItem(year: number, month: number) {
    return calendarData.find(
      (item) => item.year === year && item.month === month
    );
  }

  function getCount(year: number, month: number) {
    return getCalendarItem(year, month)?.count ?? 0;
  }

  function isBeyondAvailableData(year: number, month: number) {
    return year > 2026 || (year === 2026 && month > 8);
  }

  const selectedMonthItem = getCalendarItem(mapYear, mapMonth);

  const maxCount = Math.max(
    0,
    ...calendarData.map((item) => item.count)
  );

  const exportUrl = getExportUrl(
    mapYear,
    mapMonth,
    selectedBounds
  );

  const unusual = selectedMonthItem?.unusual ?? false;

  return (
    <main className="app">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>

          <div>
            <h1>FireScope</h1>
            <p>ALGERIA WILDFIRE INTELLIGENCE</p>
          </div>
        </div>

        <div className="header-status">
          <span className="status-dot" />
          <span>HARMONIZED FIRE DATA</span>
        </div>
      </header>

      {/* INTRODUCTION */}
      <section className="dashboard-intro">
        <div>
          <span className="eyebrow">EARTH OBSERVATION / ALGERIA</span>
          <h2>Wildfire Activity Monitoring</h2>
          <p>
            Explore historical fire activity, monitor monthly anomalies,
            and investigate areas of interest across Algeria.
          </p>
        </div>

        <div className="coverage-chip">
          <span>DATA COVERAGE</span>
          <strong>2001 — AUG 2026</strong>
        </div>
      </section>

      {/* NATIONAL SUMMARY */}
      <section className="overview-section">
        <div className="section-label">
          <span className="section-index">01</span>
          <div>
            <h2>National Overview</h2>
            <p>Historical summary · January 2001 – August 2026</p>
          </div>
        </div>

        <div className="summary-grid">
          <article className="summary-card summary-card-primary">
            <span className="card-kicker">TOTAL ACTIVITY</span>
            <span className="card-label">
              Fires (MODIS-equivalent)
            </span>
            <strong>
              {loading || !areaSummary
                ? "..."
                : formatCount(areaSummary.total_fires)}
            </strong>
            <span className="card-footnote">
              Full available historical period
            </span>
          </article>

          <article className="summary-card">
            <span className="card-kicker">PEAK YEAR</span>
            <span className="card-label">Most active year</span>
            <strong>
              {loading || !areaSummary
                ? "..."
                : areaSummary.busiest_year ?? "—"}
            </strong>
            <span className="card-footnote">Highest annual activity</span>
          </article>

          <article className="summary-card">
            <span className="card-kicker">PEAK MONTH</span>
            <span className="card-label">Most active month</span>
            <strong>
              {loading || !areaSummary
                ? "..."
                : formatMonthLabel(areaSummary.busiest_month)}
            </strong>
            <span className="card-footnote">Highest monthly activity</span>
          </article>

          <article className="summary-card">
            <span className="card-kicker">SPATIAL COVERAGE</span>
            <span className="card-label">Active 1 km grid cells</span>
            <strong>
              {loading || !areaSummary
                ? "..."
                : areaSummary.n_cells_with_fire.toLocaleString()}
            </strong>
            <span className="card-footnote">
              Grid cells with recorded activity
            </span>
          </article>
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>

      {/* MAP EXPLORER */}
      <section className="dashboard-section map-explorer">
        <div className="section-label">
          <span className="section-index">02</span>
          <div>
            <h2>Fire Activity Explorer</h2>
            <p>
              Explore harmonized 1 km grid-cell activity and select
              an Area of Interest.
            </p>
          </div>
        </div>

        <div className="map-controls">
          <div className="control-group">
            <label htmlFor="map-year">DETECTION YEAR</label>
            <select
              id="map-year"
              value={mapYear}
              onChange={(event) => {
                const year = Number(event.target.value);
                setMapYear(year);

                if (year === 2026 && mapMonth > 8) {
                  setMapMonth(8);
                }
              }}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="map-month">MONTH</label>
            <select
              id="map-month"
              value={mapMonth}
              onChange={(event) =>
                setMapMonth(Number(event.target.value))
              }
            >
              {months.map((month, index) => {
                const monthNumber = index + 1;

                if (mapYear === 2026 && monthNumber > 8) {
                  return null;
                }

                return (
                  <option key={monthNumber} value={monthNumber}>
                    {month}
                  </option>
                );
              })}
            </select>
          </div>

          <a className="export-button" href={exportUrl}>
            <span aria-hidden="true">↓</span>
            Export detections CSV
          </a>

          <div className="control-date">
            <span>DISPLAYING</span>
            <strong>
              {months[mapMonth - 1]} {mapYear}
            </strong>
          </div>
        </div>

        <MapView
          onAreaSelected={setSelectedBounds}
          cells={cells}
          loading={mapLoading}
          error={mapError}
          year={mapYear}
          month={mapMonth}
        />

        {selectedBounds && (
          <div className="aoi-panel">
            <div className="aoi-panel-heading">
              <div>
                <span className="eyebrow">GEOGRAPHIC FILTER</span>
                <h3>Area of Interest selected</h3>
              </div>
              <span className="aoi-active-label">
                <span className="status-dot" />
                ACTIVE AOI
              </span>
            </div>

            <div className="aoi-coordinates">
              <div>
                <span>LATITUDE RANGE</span>
                <strong>
                  {selectedBounds.min_lat.toFixed(4)}° —{" "}
                  {selectedBounds.max_lat.toFixed(4)}°
                </strong>
              </div>
              <div>
                <span>LONGITUDE RANGE</span>
                <strong>
                  {selectedBounds.min_lon.toFixed(4)}° —{" "}
                  {selectedBounds.max_lon.toFixed(4)}°
                </strong>
              </div>
            </div>
            <p>
              Dashboard statistics and map activity are filtered
              to this selected rectangle.
            </p>
          </div>
        )}

        {!selectedBounds && (
          <p className="aoi-hint">
            <span>+</span>
            Select two points on the map to define an Area of Interest.
            Statistics will update to reflect your selection.
          </p>
        )}
      </section>

      {/* MONTHLY ANALYSIS */}
      <section className="dashboard-section">
        <div className="section-label">
          <span className="section-index">03</span>
          <div>
            <h2>Monthly Analysis</h2>
            <p>
              {months[mapMonth - 1]} {mapYear} ·
              {" "}Fires (MODIS-equivalent)
            </p>
          </div>
          <div className="section-label-spacer" />
          <span className="analysis-period">
            {selectedBounds ? "SELECTED AREA" : "ALGERIA-WIDE"}
          </span>
        </div>

        <div className="summary-grid monthly-grid">
          <article className="summary-card">
            <span className="card-kicker">OBSERVED ACTIVITY</span>
            <span className="card-label">Monthly activity</span>
            <strong>
              {mapLoading || !selectedMonthItem
                ? "..."
                : formatCount(selectedMonthItem.count)}
            </strong>
            <span className="card-footnote">
              Harmonized detection count
            </span>
          </article>

          <article className="summary-card">
            <span className="card-kicker">HISTORICAL BASELINE</span>
            <span className="card-label">Historical monthly normal</span>
            <strong>
              {mapLoading || !selectedMonthItem
                ? "..."
                : formatCount(selectedMonthItem.median_month)}
            </strong>
            <span className="card-footnote">
              Median for this month · 2001–2025
            </span>
          </article>

          
<article className="summary-card">
  <span className="card-kicker">DEVIATION FROM NORMAL</span>
  <span className="card-label">Activity anomaly</span>

  <strong
    className={
      (selectedMonthItem?.anomaly_pct ?? 0) > 0
        ? "anomaly-positive"
        : ""
    }
  >
    {mapLoading || !selectedMonthItem
      ? "..."
      : `${(selectedMonthItem.anomaly_pct ?? 0) > 0 ? "+" : ""}${selectedMonthItem.anomaly_pct ?? 0}%`}
  </strong>

  <span className="card-footnote">
    Relative to historical normal
  </span>
</article>


          <article className="summary-card">
            <span className="card-kicker">HISTORICAL RANK</span>
            <span className="card-label">Historical percentile</span>
            <strong>
              {mapLoading || !selectedMonthItem
                ? "..."
                : `${selectedMonthItem.percentile}%`}
            </strong>
            <span className="card-footnote">
              Compared with the same calendar month
            </span>
          </article>
        </div>

        {selectedMonthItem && !mapLoading && (
          <div className={`unusual-status ${unusual ? "is-unusual" : "is-normal"}`}>
            <span className="status-indicator" />
            <div>
              <strong>
                {unusual ? "Unusual activity detected" : "No unusual activity detected"}
              </strong>
              <p>
                {unusual
                  ? "Activity meets the project's unusual-activity criteria."
                  : "Activity does not meet the project's unusual-activity criteria."}
              </p>
            </div>
          </div>
        )}

        {mapError && (
          <p className="error-message" role="alert">
            {mapError}
          </p>
        )}
      </section>

      {/* HISTORICAL CALENDAR */}
      <section className="dashboard-section calendar-section">
        <div className="section-label">
          <span className="section-index">04</span>
          <div>
            <h2>Historical Activity Calendar</h2>
            <p>
              Monthly harmonized fire activity ·
              {selectedBounds ? " Selected area" : " Algeria-wide"} ·
              {" "}2001–2026
            </p>
          </div>
        </div>

        <div className="calendar-info">
          <span className="calendar-info-mark">i</span>
          <p>
            2026 is an incomplete reporting year. Observations are
            currently available only through August. Later months
            are intentionally left blank.
          </p>
        </div>

        {loading && (
          <p className="loading-message">
            Loading historical activity...
          </p>
        )}

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="calendar-container">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th scope="col">MONTH</th>
                    {years.map((year) => (
                      <th scope="col" key={year}>
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {months.map((month, monthIndex) => (
                    <tr key={month}>
                      <th scope="row">{month.toUpperCase()}</th>

                      {years.map((year) => {
                        const monthNumber = monthIndex + 1;
                        const unavailable = isBeyondAvailableData(
                          year,
                          monthNumber
                        );
                        const value = getCount(year, monthNumber);
                        const selected =
                          year === mapYear && monthNumber === mapMonth;

                        return (
                          <td key={year}>
                            <span
                              className={`heat-cell${selected ? " heat-cell-selected" : ""}${unavailable ? " heat-cell-unavailable" : ""}`}
                              style={{
                                backgroundColor: unavailable
                                  ? "transparent"
                                  : getHeatColor(value, maxCount),
                                color: unavailable ? "#718096" : "#ffffff",
                              }}
                              title={
                                unavailable
                                  ? `${month} ${year}: No data available yet`
                                  : `${month} ${year}: ${formatCount(value)} Fires (MODIS-equivalent)`
                              }
                            >
                              {unavailable ? "—" : formatCount(value)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="calendar-legend">
              <span>LOWER ACTIVITY</span>
              <div className="legend-colors">
                {[
                  "#c7dff0",
                  "#91c4e3",
                  "#579dca",
                  "#2673aa",
                  "#12466f",
                ].map((color) => (
                  <span key={color} style={{ backgroundColor: color }} />
                ))}
              </div>
              <span>HIGHER ACTIVITY</span>
              <span className="legend-unavailable">— No data</span>
            </div>
          </>
        )}

        <p className="demo-note">
          Source: harmonized_monthly.parquet. Activity values use
          count_harmonized and are expressed as Fires (MODIS-equivalent).
          Historical normal is the median for the same calendar month
          across 2001–2025. Missing observations after August 2026
          are not displayed as zero.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <div className="footer-brand">
          <strong>FireScope</strong>
          <span>ALGERIA WILDFIRE INTELLIGENCE</span>
        </div>
        <p>
          Independent project · NASA Space Apps Challenge 2026
        </p>
        <span className="footer-data">DATA THROUGH AUG 2026</span>
      </footer>
    </main>
  );
}

export default App;
