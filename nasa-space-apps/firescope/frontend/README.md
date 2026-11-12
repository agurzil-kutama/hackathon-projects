# FireScope — Frontend

**Algeria Wildfire Intelligence Dashboard**

FireScope is an interactive wildfire-monitoring dashboard developed for the **NASA Space Apps Challenge 2026**. It allows users to explore historical satellite-derived fire activity across Algeria, investigate geographic Areas of Interest (AOIs), and analyse monthly activity against historical baselines.

## Features

- Interactive map powered by Leaflet.
- Monthly and yearly fire activity exploration.
- Two-click rectangular Area of Interest selection.
- National and AOI-specific activity summaries.
- Monthly anomaly and historical percentile analysis.
- Historical activity calendar (2001–2026).
- CSV export of cleaned satellite detection points.
- Responsive, mission-control-inspired dashboard interface.

## Technology Stack

- React
- TypeScript
- Vite
- React Leaflet
- Leaflet
- CSS

## Requirements

Before running the frontend, install:

- Node.js
- npm
- Git

The FireScope FastAPI backend must also be running.

## Installation

Clone the project repository and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

## Running the Application

Start the development server:

```bash
npm run dev
```

Vite will provide a local development URL, normally:

```text
http://localhost:5173
```

## Backend Connection

The frontend communicates with the FireScope FastAPI backend.

Default backend address:

```text
http://127.0.0.1:8000
```

Make sure the backend is running before using the dashboard.

## Production Build

To compile the frontend:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Data and Metrics

FireScope uses harmonized satellite-derived monthly activity data.

The main activity metric is **Fires (MODIS-equivalent)**, based on the `count_harmonized` field.

Historical comparisons use the median activity for the same calendar month across 2001–2025.

The 2026 dataset currently covers January through August. Later months are not represented as zero activity.

## Project Structure

```text
frontend/
├── public/
├── src/
│   ├── Components/
│   │   └── Mapview.tsx
│   ├── services/
│   │   └── api.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package
