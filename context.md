# Platform Map TV App - Context

## Overview
This application is designed to run on an LG Smart TV (via web browser) to display a static platform map of the Barrie Allandale Transit Terminal. It overlays real-time bus positions using data from the MyRideBarrie GTFS feed.

## Architecture
- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Data Source**: GTFS-Realtime Protocol Buffers (`GTFS_VehiclePositions.pb`)
- **Proxy**: Vite dev server proxy is configured to bypass CORS during development/local usage.

## Key Components

### `src/components/MapDisplay.tsx`
- Renders the static map image (`/assets/map.png`).
- Fetches vehicle data every 15 seconds.
- Maps GPS coordinates (Lat/Long) to Screen Coordinates (%) using a linear projection based on two calibrated points.

### `src/services/gtfs.ts`
- Fetches the binary Protocol Buffer data.
- Decodes it using `gtfs-realtime-bindings`.
- Returns a list of vehicle objects with `id`, `lat`, `lon`.

## Calibration Data
The map is georeferenced using two known points (Platform 3 and Platform 4).

| Point | Stop ID | Latitude | Longitude | Screen X (%) | Screen Y (%) |
|-------|---------|----------|-----------|--------------|--------------|
| P1    | 9003    | 44.373873| -79.689351| 54.29        | 55.32        |
| P2    | 9004    | 44.373899| -79.689540| 50.26        | 55.65        |

## Real-Time Connection Confirmation
- **Source**: `https://www.myridebarrie.ca/gtfs/GTFS_VehiclePositions.pb`
- **Mechanism**: The app polls this URL (via local proxy `/api/gtfs/...`) every **15 seconds**.
- **Visual**: Bus icons (`/assets/bus_icon.jpg`) are updated with a 1-second CSS transition for smooth movement.
