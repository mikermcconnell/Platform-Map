# Platform Map Display Enhancements — Design

**Date:** 2026-02-26
**Status:** Approved
**Goal:** Improve wayfinding, at-a-glance bus presence, and visual polish for the public-facing TV display at Barrie Allandale Transit Terminal.

## Context

- LG Smart TV display, no touch/interaction — pure visual
- Medium viewing distance (6-15 feet)
- Minimal/neutral branding, focus on readability
- Arrival times already shown on a separate TV — this complements it
- Existing: static map background with colored bus dot markers, 15s GPS polling
- Constraints: Chrome 38-era TV hardware, CSS transitions only

## Approach

**Enhanced Map (Approach A)** — keep the full-screen map as the hero, layer on smart overlays. Plus arrival/arrived notifications inspired by Approach C.

## Components

### 1. Platform Labels

Fixed-position badges pinned to the map at each platform location (e.g., "P3", "P5", "P12"). Always visible regardless of bus presence. Semi-transparent background for contrast against the map. Helps riders orient physically.

### 2. Improved Bus Markers

Replace current design (bus icon image + separate floating route label) with:

- Route-colored filled circle (~90-100px) with bold white route number inside
- No separate floating label — the marker IS the label
- Direction suffix for Route 8 (NB/SB) as smaller subtitle inside marker
- **At-platform state:** pulsing glow ring in route color + slight scale-up (~110%) when `STOPPED_AT` a terminal stop
- **In-transit state:** standard marker, no glow

### 3. Bus Arrival Notifications

Temporary toast notifications using GTFS-RT `current_status` and `stop_id` fields.

**Detection logic (Tier 1 — agency-authoritative, no GPS heuristics):**

```
IF vehicle.stop_id IN terminal_whitelist
  AND current_status == STOPPED_AT (1)
  → "Route X — At Platform Y"

IF vehicle.stop_id IN terminal_whitelist
  AND current_status == INCOMING_AT (0)
  → "Route X — Arriving at Platform Y"

OTHERWISE → show nothing
```

**Terminal stop whitelist:**

| stop_id | Platform |
|---------|----------|
| 9003 | Platform 3 |
| 9004 | Platform 4 |
| 9005 | Platform 5 |
| 9006 | Terminal (general) |
| 9012 | Platform 12 |
| 9013 | Platform 13 |
| 9014 | Platform 14 |

**Toast behavior:**
- Pill-shaped banner, route color background, white bold text
- Slide-in animation from top
- Auto-dismiss after 10-15 seconds
- Max 3 stacked, oldest dismisses first
- No fallback heuristics — if Tier 1 fields are missing, show nothing (fail-safe)

### 4. Route Legend Bar

Slim bottom strip (~60-70px), semi-transparent dark background. All routes displayed as colored pills: `2A` `2B` `7A` `7B` `8A` `8B` `10` `11` `12A` `12B` `100` `101` `400`. Routes with a bus currently at the terminal get a subtle highlight.

### 5. Clock & Date

Top-left corner. Large digital clock (HH:MM), date underneath (e.g., "Wednesday, February 26"). White text on semi-transparent dark pill. Updates every minute.

### 6. Alert Banner

Hidden by default. Slides in from top when alerts exist.

**Sources:**
- GTFS-RT ServiceAlerts feed (auto-pull, ~60s polling)
- Manual entry (Firebase or similar admin interface)
- Manual alerts display first (staff intent takes priority)
- Multiple alerts rotate on ~10s timer

**Style:** Route color accent, white text on dark background. Marquee scroll if text is long.

## Layout

```
┌─────────────────────────────────────────────────┐
│ [Clock/Date]          [Alert Banner (if active)] │
│                                                   │
│          Full-screen platform map                 │
│      with platform labels (P3, P5, P12...)        │
│                                                   │
│        Route-colored circles with                 │
│        route number inside                        │
│        Pulse glow when stopped at terminal        │
│                                                   │
│    ┌──────────────────────────────────┐           │
│    │ Route 2A — At Platform 5        │           │
│    └──────────────────────────────────┘           │
│                                                   │
│ [2A][2B][7A][7B][8A][8B][10][11][12A][12B][100]  │
└─────────────────────────────────────────────────┘
```

## Data Requirements

| Data | Source | Polling | New? |
|------|--------|---------|------|
| Vehicle positions + GPS | GTFS-RT VehiclePositions | 15s | Existing |
| current_status + stop_id | Same VehiclePositions feed | 15s | New fields to extract |
| Service alerts | GTFS-RT ServiceAlerts | 60s | New feed |
| Manual alerts | Firebase / admin entry | Real-time listener | New |
| Static GTFS (stop mapping) | Hardcoded whitelist | N/A | Config only |

## API Changes

`api/vehicles.js` must return two new fields per vehicle:
- `current_status` (number: 0=INCOMING_AT, 1=STOPPED_AT, 2=IN_TRANSIT_TO)
- `stop_id` (string)

New endpoint needed: `api/alerts.js` for GTFS-RT ServiceAlerts.

## What's NOT Changing

- Map image (same January 2026 version)
- 15-second polling interval
- Affine transformation / GPS calibration system
- Vanilla JS fallback availability
- Vercel deployment infrastructure
