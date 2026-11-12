
import { useState } from "react";

import {
  MapContainer,
  TileLayer,
  Rectangle,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";

import type { LatLngTuple } from "leaflet";

import type {
  AOIBounds,
  MapCell,
} from "../services/api";

export type { AOIBounds } from "../services/api";

type MapClickHandlerProps = {
  onMapClick: (point: LatLngTuple) => void;
};

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      onMapClick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

type MapViewProps = {
  onAreaSelected: (bounds: AOIBounds | null) => void;
  cells: MapCell[];
  loading: boolean;
  error: string;
  year: number;
  month: number;
};

function getCellColor(value: number, max: number) {
  if (max === 0 || value <= 0) return "#c7dff0";

  const ratio = value / max;

  if (ratio < 0.2) return "#c7dff0";
  if (ratio < 0.4) return "#91c4e3";
  if (ratio < 0.6) return "#579dca";
  if (ratio < 0.8) return "#2673aa";

  return "#12466f";
}

export default function MapView({
  onAreaSelected,
  cells,
  loading,
  error,
  year,
  month,
}: MapViewProps) {
  const [firstCorner, setFirstCorner] =
    useState<LatLngTuple | null>(null);

  const [selectedArea, setSelectedArea] =
    useState<[LatLngTuple, LatLngTuple] | null>(null);

  function handleMapClick(point: LatLngTuple) {
    if (firstCorner === null) {
      setFirstCorner(point);
      setSelectedArea(null);
      onAreaSelected(null);
      return;
    }

    const bounds: AOIBounds = {
      min_lat: Math.min(firstCorner[0], point[0]),
      max_lat: Math.max(firstCorner[0], point[0]),
      min_lon: Math.min(firstCorner[1], point[1]),
      max_lon: Math.max(firstCorner[1], point[1]),
    };

    const rectangle: [LatLngTuple, LatLngTuple] = [
      [bounds.min_lat, bounds.min_lon],
      [bounds.max_lat, bounds.max_lon],
    ];

    setSelectedArea(rectangle);
    setFirstCorner(null);
    onAreaSelected(bounds);
  }

  function clearSelection() {
    setFirstCorner(null);
    setSelectedArea(null);
    onAreaSelected(null);
  }

  const maxCount = Math.max(
    0,
    ...cells.map((cell) => cell.count_harmonized)
  );

  return (
    <section className="map-section">
      <div className="map-toolbar">
        <p>
          {firstCorner
            ? "First corner selected. Click a second point to complete your area."
            : "Select two points on the map to define your Area of Interest."}
        </p>

        <button type="button" onClick={clearSelection}>
          Clear selection
        </button>
      </div>

      <div className="map-legend">
        <span className="map-legend-item">
          <span
            className="map-legend-dot"
            style={{ backgroundColor: "#c7dff0" }}
          />
          Lower activity
        </span>

        <span className="map-legend-item">
          <span
            className="map-legend-dot"
            style={{ backgroundColor: "#579dca" }}
          />
          Moderate activity
        </span>

        <span className="map-legend-item">
          <span
            className="map-legend-dot"
            style={{ backgroundColor: "#12466f" }}
          />
          Higher activity
        </span>

        <span className="map-legend-count">
          {loading
            ? "Loading grid cells..."
            : `${cells.length.toLocaleString()} active grid cells`}
        </span>
      </div>

      <p className="map-description">
        Harmonized 1 km grid-cell activity for{" "}
        {year}-{String(month).padStart(2, "0")}.
        Marker size and colour represent activity.
        Select two map points to filter the dashboard by location.
      </p>

      {error && (
        <p className="error-message" role="alert">
          Map error: {error}
        </p>
      )}

      <MapContainer
        center={[28, 2.5]}
        zoom={5}
        minZoom={3}
        scrollWheelZoom={true}
        className="firescope-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={handleMapClick} />

        {cells.map((cell) => {
          const ratio =
            maxCount > 0
              ? cell.count_harmonized / maxCount
              : 0;

          const color = getCellColor(
            cell.count_harmonized,
            maxCount
          );

          return (
            <CircleMarker
              key={cell.cell_id}
              center={[cell.lat, cell.lon]}
              radius={4 + ratio * 5}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.82,
                weight: 1,
              }}
              bubblingMouseEvents={true}
            >
              <Popup>
                <strong>Harmonized grid cell</strong>
                <br />
                Cell: {cell.cell_id}
                <br />
                Fires (MODIS-equivalent):{" "}
                {cell.count_harmonized.toLocaleString(
                  undefined,
                  { maximumFractionDigits: 1 }
                )}
                <br />
                Month: {year}-{String(month).padStart(2, "0")}
                <br />
                Latitude: {cell.lat}
                <br />
                Longitude: {cell.lon}
              </Popup>
            </CircleMarker>
          );
        })}

        {selectedArea && (
          <Rectangle
            bounds={selectedArea}
            pathOptions={{
              color: "#e34b55",
              fillColor: "#e34b55",
              fillOpacity: 0.16,
              weight: 2,
            }}
          />
        )}
      </MapContainer>

      {firstCorner && (
        <div className="selection-info">
          First point selected. Click another point to finish
          drawing your Area of Interest.
        </div>
      )}
    </section>
  );
}
