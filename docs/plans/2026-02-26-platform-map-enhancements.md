# Platform Map Display Enhancements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve wayfinding, at-a-glance bus presence, and visual polish for the Barrie Transit terminal TV display.

**Architecture:** Layer new overlay components onto the existing full-screen map. Extend the API to pass through GTFS-RT fields already in the feed (`current_status`, `stop_id`). All new UI is CSS-only (no heavy JS animations) to respect the legacy TV hardware. New alert system adds a second API endpoint for ServiceAlerts.

**Tech Stack:** React 19, TypeScript, Vite, Vercel serverless functions, GTFS-RT protobuf, plain CSS (no flexbox).

**Testing note:** This project has no test runner configured. Verification uses `tsc --noEmit` (type-check) and `npm run build:react` (build). Visual verification in dev mode (`npm run dev:react`).

---

## Task 1: API — Add current_status and stop_id to vehicle response

**Files:**
- Modify: `api/vehicles.js:59-72`

**Step 1: Add new fields to the vehicle push object**

In `api/vehicles.js`, inside the `entities.forEach` callback, add `current_status` and `stop_id` to each vehicle object:

```js
vehicles.push({
    id: (v.vehicle && (v.vehicle.id || v.vehicle.label)) || ent.id || 'unknown',
    route_id: (v.trip && v.trip.routeId) || null,
    direction_id: v.trip && Number.isFinite(Number(v.trip.directionId))
        ? Number(v.trip.directionId)
        : null,
    lat: v.position.latitude,
    lon: v.position.longitude,
    bearing: typeof v.position.bearing === 'number' ? v.position.bearing : null,
    speed: typeof v.position.speed === 'number' ? v.position.speed : null,
    current_status: typeof v.currentStatus === 'number' ? v.currentStatus : null,
    stop_id: v.stopId || null,
    last_reported: v.timestamp
        ? Number(v.timestamp.toNumber ? v.timestamp.toNumber() : v.timestamp)
        : null,
});
```

**Step 2: Verify locally**

Run: `node -e "require('./api/vehicles.js')" 2>&1 | head -1`
Expected: No syntax errors (will fail on missing req/res, that's fine — just verifying parse).

**Step 3: Commit**

```bash
git add api/vehicles.js
git commit -m "feat(api): add current_status and stop_id to vehicle response"
```

---

## Task 2: Types & Service — Update TypeScript interfaces

**Files:**
- Modify: `src/services/gtfs.ts:1-49`

**Step 1: Add new fields to VehiclePosition interface**

In `src/services/gtfs.ts`, update the `VehiclePosition` interface:

```ts
export interface VehiclePosition {
    id: string;
    lat: number;
    lon: number;
    routeId?: string;
    directionId?: number;
    bearing?: number;
    currentStatus?: number;  // 0=INCOMING_AT, 1=STOPPED_AT, 2=IN_TRANSIT_TO
    stopId?: string;
}
```

**Step 2: Add new fields to VehicleAPIResponse**

```ts
interface VehicleAPIResponse {
    id: string;
    lat: number;
    lon: number;
    route_id?: string;
    direction_id?: number;
    bearing?: number;
    current_status?: number;
    stop_id?: string;
}
```

**Step 3: Map new fields in fetchVehiclePositions**

In the `forEach` callback, add the mappings:

```ts
vehicles.push({
    id: v.id,
    lat: v.lat,
    lon: v.lon,
    routeId: v.route_id,
    directionId: v.direction_id,
    bearing: v.bearing ?? 0,
    currentStatus: v.current_status ?? undefined,
    stopId: v.stop_id ?? undefined,
});
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/services/gtfs.ts
git commit -m "feat(types): add currentStatus and stopId to vehicle interfaces"
```

---

## Task 3: Bus Markers Redesign — Route number inside colored circle

**Files:**
- Modify: `src/components/MapDisplay.tsx:246-274` (marker JSX)
- Modify: `src/index.css:42-98` (marker styles)

**Step 1: Replace marker JSX**

In `MapDisplay.tsx`, replace the marker `return` block (inside `vehicles.map`) with:

```tsx
return (
    <div
        key={v.id}
        className="bus-marker"
        style={{ left: pos.left, top: pos.top }}
        title={`Bus ${v.id}`}
    >
        <div
            className="bus-icon-wrapper"
            style={{ backgroundColor: routeColor, borderColor: routeColor }}
        >
            <span className="bus-route-number">{displayRouteId}</span>
        </div>
    </div>
);
```

**Step 2: Replace marker CSS**

Replace `.bus-marker`, `.bus-icon-wrapper`, `.bus-icon-image`, and `.bus-label` styles:

```css
.bus-marker {
    position: absolute;
    width: 90px;
    height: 90px;
    transform: translate(-50%, -50%);
    transition: left 1s linear, top 1s linear;
    z-index: 10;
}

.bus-icon-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border-width: 4px;
    border-style: solid;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    text-align: center;
}

.bus-route-number {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 22px;
    font-weight: bold;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}
```

Remove `.bus-icon-image` and `.bus-label` CSS rules — they're no longer used.

**Step 3: Type-check and build**

Run: `npx tsc --noEmit && npm run build:react`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/MapDisplay.tsx src/index.css
git commit -m "feat(ui): redesign bus markers with route number inside colored circle"
```

---

## Task 4: Platform Labels — Fixed position badges on map

**Files:**
- Modify: `src/components/MapDisplay.tsx` (add platform label data + JSX)
- Modify: `src/index.css` (add platform label styles)

**Step 1: Add terminal platform config**

Add this constant near the top of `MapDisplay.tsx` (after `ROUTE_COLORS`):

```ts
// Terminal platform positions — stop_id to label mapping
// GPS coords from GTFS static feed, mapped to screen via affine transform
const TERMINAL_PLATFORMS: { stopId: string; label: string; lat: number; lon: number }[] = [
    { stopId: '9003', label: 'P3', lat: 44.3738731, lon: -79.6893516 },
    { stopId: '9004', label: 'P4', lat: 44.3738992, lon: -79.6895402 },
    { stopId: '9005', label: 'P5', lat: 44.3739253, lon: -79.6897531 },
    { stopId: '9006', label: 'Terminal', lat: 44.3742472, lon: -79.6896899 },
    { stopId: '9012', label: 'P12', lat: 44.3742136, lon: -79.6904055 },
    { stopId: '9013', label: 'P13', lat: 44.3741352, lon: -79.6904421 },
    { stopId: '9014', label: 'P14', lat: 44.373528, lon: -79.691139 },
];
```

**Step 2: Add platform labels JSX**

Inside the map container div (after the vehicles map, before the closing `</div>`), add:

```tsx
{/* Platform Labels */}
{affineMatrix && TERMINAL_PLATFORMS.map(p => {
    const pos = getPixelPosition(p.lat, p.lon);
    return (
        <div
            key={p.stopId}
            className="platform-label"
            style={{ left: pos.left, top: pos.top }}
        >
            {p.label}
        </div>
    );
})}
```

**Step 3: Add platform label CSS**

```css
/* Platform Labels */
.platform-label {
    position: absolute;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 16px;
    font-weight: bold;
    padding: 4px 10px;
    border-radius: 6px;
    white-space: nowrap;
    z-index: 5;
    pointer-events: none;
}
```

**Step 4: Type-check and build**

Run: `npx tsc --noEmit && npm run build:react`

**Step 5: Visual check**

Run: `npm run dev:react`
Verify: Platform labels appear at correct map positions.

**Step 6: Commit**

```bash
git add src/components/MapDisplay.tsx src/index.css
git commit -m "feat(ui): add fixed platform labels to map"
```

---

## Task 5: Arrival Toast Notifications

**Files:**
- Create: `src/components/ArrivalToasts.tsx`
- Modify: `src/components/MapDisplay.tsx` (integrate toasts + add at-platform glow)
- Modify: `src/index.css` (toast styles + glow animation)

**Step 1: Create the terminal stop whitelist and types**

Create `src/components/ArrivalToasts.tsx`:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { VehiclePosition } from '../services/gtfs';

// GTFS-RT current_status enum values
const STOPPED_AT = 1;
const INCOMING_AT = 0;

// Terminal platform stop IDs
const TERMINAL_STOPS: Record<string, string> = {
    '9003': 'Platform 3',
    '9004': 'Platform 4',
    '9005': 'Platform 5',
    '9006': 'Terminal',
    '9012': 'Platform 12',
    '9013': 'Platform 13',
    '9014': 'Platform 14',
};

// Route colors (duplicated from MapDisplay — could extract to shared config later)
const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837',
    '2B': '#006837',
    '7A': '#F58220',
    '7B': '#F58220',
    '8A': '#000000',
    '8B': '#000000',
    '10': '#662D91',
    '11': '#8DC63F',
    '12A': '#F49AC1',
    '12B': '#F49AC1',
    '100': '#BE1E2D',
    '101': '#2E3192',
    '400': '#00AEEF',
};

const DEFAULT_COLOR = '#0055A4';

interface Toast {
    id: string;           // vehicle id
    routeId: string;
    platformName: string;
    status: 'arriving' | 'arrived';
    color: string;
    createdAt: number;
}

const TOAST_DURATION_MS = 15000;
const MAX_TOASTS = 3;

interface ArrivalToastsProps {
    vehicles: VehiclePosition[];
}

const ArrivalToasts: React.FC<ArrivalToastsProps> = ({ vehicles }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const shownRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const now = Date.now();
        const newToasts: Toast[] = [];

        for (const v of vehicles) {
            if (!v.stopId || !v.routeId) continue;

            const platformName = TERMINAL_STOPS[v.stopId];
            if (!platformName) continue;

            const isArriving = v.currentStatus === INCOMING_AT;
            const isStopped = v.currentStatus === STOPPED_AT;
            if (!isArriving && !isStopped) continue;

            const status = isStopped ? 'arrived' : 'arriving';
            const toastKey = `${v.id}-${status}`;

            // Skip if already shown recently
            if (shownRef.current.has(toastKey)) continue;
            shownRef.current.add(toastKey);

            // Clear the opposite status key so upgrades (arriving -> arrived) show
            const oppositeKey = `${v.id}-${status === 'arrived' ? 'arriving' : 'arrived'}`;
            shownRef.current.delete(oppositeKey);

            newToasts.push({
                id: toastKey,
                routeId: v.routeId,
                platformName,
                status,
                color: ROUTE_COLORS[v.routeId] || DEFAULT_COLOR,
                createdAt: now,
            });
        }

        if (newToasts.length > 0) {
            setToasts(prev => [...prev, ...newToasts].slice(-MAX_TOASTS));
        }

        // Clean up expired toasts
        setToasts(prev => prev.filter(t => now - t.createdAt < TOAST_DURATION_MS));

        // Clean up stale keys from shownRef (vehicles no longer at terminal)
        const activeVehicleIds = new Set(vehicles.map(v => v.id));
        for (const key of shownRef.current) {
            const vehicleId = key.replace(/-arriving$|-arrived$/, '');
            if (!activeVehicleIds.has(vehicleId)) {
                shownRef.current.delete(key);
            }
        }
    }, [vehicles]);

    // Timer to auto-dismiss expired toasts
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            setToasts(prev => prev.filter(t => now - t.createdAt < TOAST_DURATION_MS));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="arrival-toasts">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="arrival-toast"
                    style={{ backgroundColor: toast.color }}
                >
                    <span className="toast-route">Route {toast.routeId}</span>
                    <span className="toast-separator"> — </span>
                    <span className="toast-status">
                        {toast.status === 'arrived' ? 'At' : 'Arriving at'} {toast.platformName}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default ArrivalToasts;
```

**Step 2: Add at-platform glow class to bus markers**

In `MapDisplay.tsx`, update the marker JSX to conditionally add a glow class. Before the `return` in the `vehicles.map`, add:

```tsx
// Determine if bus is at a terminal platform
const isAtTerminal = v.currentStatus === 1
    && v.stopId != null
    && ['9003','9004','9005','9006','9012','9013','9014'].includes(v.stopId);
```

Then update the wrapper div to include the class:

```tsx
<div
    className={`bus-icon-wrapper${isAtTerminal ? ' at-terminal' : ''}`}
    style={{ backgroundColor: routeColor, borderColor: routeColor }}
>
```

**Step 3: Import and render ArrivalToasts in MapDisplay**

At the top of `MapDisplay.tsx`:
```tsx
import ArrivalToasts from './ArrivalToasts';
```

Inside the JSX, after the loading indicator and before the vehicles map:
```tsx
<ArrivalToasts vehicles={vehicles} />
```

**Step 4: Add toast CSS and glow animation**

```css
/* Arrival Toast Notifications */
.arrival-toasts {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: 500px;
}

.arrival-toast {
    color: white;
    font-size: 22px;
    font-weight: bold;
    padding: 12px 24px;
    border-radius: 30px;
    margin-bottom: 8px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    animation: toast-slide-in 0.4s ease-out;
}

.toast-route {
    font-weight: bold;
}

.toast-separator {
    opacity: 0.8;
}

@keyframes toast-slide-in {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* At-terminal glow for bus markers */
.at-terminal {
    box-shadow: 0 0 15px 5px currentColor, 0 4px 8px rgba(0, 0, 0, 0.4);
    animation: terminal-pulse 2s ease-in-out infinite;
    transform: scale(1.1);
}

@keyframes terminal-pulse {
    0%, 100% { box-shadow: 0 0 10px 3px currentColor; }
    50% { box-shadow: 0 0 20px 8px currentColor; }
}
```

**Step 5: Type-check and build**

Run: `npx tsc --noEmit && npm run build:react`

**Step 6: Commit**

```bash
git add src/components/ArrivalToasts.tsx src/components/MapDisplay.tsx src/index.css
git commit -m "feat(ui): add arrival toast notifications and at-terminal glow"
```

---

## Task 6: Route Legend Bar

**Files:**
- Create: `src/components/RouteLegend.tsx`
- Modify: `src/components/MapDisplay.tsx` (import and render)
- Modify: `src/index.css` (legend styles)

**Step 1: Create RouteLegend component**

Create `src/components/RouteLegend.tsx`:

```tsx
import React from 'react';
import { VehiclePosition } from '../services/gtfs';

const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837',
    '2B': '#006837',
    '7A': '#F58220',
    '7B': '#F58220',
    '8A': '#000000',
    '8B': '#000000',
    '10': '#662D91',
    '11': '#8DC63F',
    '12A': '#F49AC1',
    '12B': '#F49AC1',
    '100': '#BE1E2D',
    '101': '#2E3192',
    '400': '#00AEEF',
};

// Display order for the legend
const ROUTE_ORDER = ['2A','2B','7A','7B','8A','8B','10','11','12A','12B','100','101','400'];

// Terminal stop IDs
const TERMINAL_STOP_IDS = ['9003','9004','9005','9006','9012','9013','9014'];

interface RouteLegendProps {
    vehicles: VehiclePosition[];
}

const RouteLegend: React.FC<RouteLegendProps> = ({ vehicles }) => {
    // Determine which routes currently have a bus at the terminal
    const atTerminalRoutes = new Set<string>();
    for (const v of vehicles) {
        if (v.currentStatus === 1 && v.stopId && TERMINAL_STOP_IDS.includes(v.stopId) && v.routeId) {
            atTerminalRoutes.add(v.routeId);
        }
    }

    return (
        <div className="route-legend">
            {ROUTE_ORDER.map(routeId => (
                <div
                    key={routeId}
                    className={`legend-pill${atTerminalRoutes.has(routeId) ? ' legend-active' : ''}`}
                    style={{ backgroundColor: ROUTE_COLORS[routeId] }}
                >
                    {routeId}
                </div>
            ))}
        </div>
    );
};

export default RouteLegend;
```

**Step 2: Import and render in MapDisplay**

At top:
```tsx
import RouteLegend from './RouteLegend';
```

Inside JSX, just before the closing `</div>` of the map container:
```tsx
<RouteLegend vehicles={vehicles} />
```

**Step 3: Add legend CSS**

```css
/* Route Legend Bar */
.route-legend {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background-color: rgba(0, 0, 0, 0.7);
    text-align: center;
    padding-top: 12px;
    z-index: 25;
}

.legend-pill {
    display: inline-block;
    color: white;
    font-size: 18px;
    font-weight: bold;
    padding: 6px 14px;
    border-radius: 20px;
    margin: 0 4px;
    opacity: 0.6;
}

.legend-active {
    opacity: 1;
    box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.5);
}
```

**Step 4: Type-check and build**

Run: `npx tsc --noEmit && npm run build:react`

**Step 5: Commit**

```bash
git add src/components/RouteLegend.tsx src/components/MapDisplay.tsx src/index.css
git commit -m "feat(ui): add route legend bar with active-at-terminal highlighting"
```

---

## Task 7: Clock & Date Overlay

**Files:**
- Create: `src/components/ClockDisplay.tsx`
- Modify: `src/components/MapDisplay.tsx` (import and render)
- Modify: `src/index.css` (clock styles)

**Step 1: Create ClockDisplay component**

Create `src/components/ClockDisplay.tsx`:

```tsx
import React, { useState, useEffect } from 'react';

const formatTime = (date: Date): string => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
};

const formatDate = (date: Date): string => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const ClockDisplay: React.FC = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="clock-display">
            <div className="clock-time">{formatTime(now)}</div>
            <div className="clock-date">{formatDate(now)}</div>
        </div>
    );
};

export default ClockDisplay;
```

**Step 2: Import and render in MapDisplay**

At top:
```tsx
import ClockDisplay from './ClockDisplay';
```

Inside JSX, right after the opening `<div ref={mapRef} ...>` and `<img>`:
```tsx
<ClockDisplay />
```

**Step 3: Add clock CSS**

```css
/* Clock & Date Display */
.clock-display {
    position: absolute;
    top: 12px;
    left: 16px;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 8px 16px;
    border-radius: 10px;
    z-index: 25;
    pointer-events: none;
}

.clock-time {
    color: white;
    font-size: 28px;
    font-weight: bold;
    line-height: 1.2;
}

.clock-date {
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
}
```

**Step 4: Type-check and build**

Run: `npx tsc --noEmit && npm run build:react`

**Step 5: Commit**

```bash
git add src/components/ClockDisplay.tsx src/components/MapDisplay.tsx src/index.css
git commit -m "feat(ui): add clock and date overlay"
```

---

## Task 8: Alerts API — GTFS-RT ServiceAlerts endpoint

**Files:**
- Create: `api/alerts.js`

**Step 1: Create the alerts serverless function**

Create `api/alerts.js`:

```js
/**
 * Vercel Serverless Function: /api/alerts
 * Fetches GTFS Realtime ServiceAlerts Protobuf, decodes server-side, returns JSON
 */

const fetch = require('node-fetch');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const GTFS_RT_ALERTS_URL = 'https://www.myridebarrie.ca/gtfs/GTFS_ServiceAlerts.pb';

const ALLOWED_ORIGINS = [
    'https://platform-map.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

module.exports = async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=30');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const response = await fetch(GTFS_RT_ALERTS_URL, { timeout: 10000 });

        if (!response.ok) {
            throw new Error('GTFS-RT alerts fetch failed: ' + response.status);
        }

        const buffer = await response.buffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

        const alerts = [];
        const entities = feed.entity || [];

        entities.forEach(function (ent) {
            if (!ent.alert) return;

            const a = ent.alert;
            const routeIds = [];

            if (a.informedEntity) {
                a.informedEntity.forEach(function (ie) {
                    if (ie.routeId) routeIds.push(ie.routeId);
                });
            }

            // Extract English text (or first available)
            let headerText = '';
            let descriptionText = '';

            if (a.headerText && a.headerText.translation) {
                const en = a.headerText.translation.find(function (t) { return t.language === 'en'; });
                headerText = (en && en.text) || (a.headerText.translation[0] && a.headerText.translation[0].text) || '';
            }

            if (a.descriptionText && a.descriptionText.translation) {
                const en = a.descriptionText.translation.find(function (t) { return t.language === 'en'; });
                descriptionText = (en && en.text) || (a.descriptionText.translation[0] && a.descriptionText.translation[0].text) || '';
            }

            alerts.push({
                id: ent.id,
                header: headerText,
                description: descriptionText,
                route_ids: routeIds,
                cause: a.cause || null,
                effect: a.effect || null,
            });
        });

        res.status(200).json({
            generated_at: Date.now(),
            alerts: alerts,
        });
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        console.error('[gtfs-rt-alerts] Fetch failed:', errorMessage);

        res.status(502).json({
            generated_at: Date.now(),
            alerts: [],
            error: 'Failed to fetch alert data',
        });
    }
};
```

**Step 2: Test the endpoint URL**

Before committing, verify the alerts protobuf URL exists:

Run: `node -e "require('node-fetch')('https://www.myridebarrie.ca/gtfs/GTFS_ServiceAlerts.pb').then(r => console.log('Status:', r.status, 'Size:', r.headers.get('content-length'))).catch(e => console.log('Error:', e.message))"`

If 404: try alternate URLs like `GTFS_Alerts.pb`, `ServiceAlerts.pb`. Update the URL accordingly. If no alerts feed exists, note this and skip to manual-only alerts (Task 9 becomes the sole alert source).

**Step 3: Commit**

```bash
git add api/alerts.js
git commit -m "feat(api): add GTFS-RT ServiceAlerts endpoint"
```

---

## Task 9: Alert Banner UI

**Files:**
- Create: `src/components/AlertBanner.tsx`
- Create: `src/services/alerts.ts`
- Modify: `src/components/MapDisplay.tsx` (import and render)
- Modify: `src/index.css` (alert banner styles)

**Step 1: Create alert service**

Create `src/services/alerts.ts`:

```ts
export interface ServiceAlert {
    id: string;
    header: string;
    description: string;
    routeIds: string[];
    source: 'gtfs-rt' | 'manual';
}

interface AlertAPIResponse {
    id: string;
    header: string;
    description: string;
    route_ids: string[];
}

interface AlertsAPIResponse {
    generated_at: number;
    alerts: AlertAPIResponse[];
    error?: string;
}

export const fetchServiceAlerts = async (): Promise<ServiceAlert[]> => {
    try {
        const response = await fetch('/api/alerts');
        if (!response.ok) return [];

        const data: AlertsAPIResponse = await response.json();
        if (!data.alerts || !Array.isArray(data.alerts)) return [];

        return data.alerts.map(a => ({
            id: a.id,
            header: a.header,
            description: a.description,
            routeIds: a.route_ids || [],
            source: 'gtfs-rt' as const,
        }));
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
};
```

**Step 2: Create AlertBanner component**

Create `src/components/AlertBanner.tsx`:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { ServiceAlert, fetchServiceAlerts } from '../services/alerts';

const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837', '2B': '#006837',
    '7A': '#F58220', '7B': '#F58220',
    '8A': '#000000', '8B': '#000000',
    '10': '#662D91', '11': '#8DC63F',
    '12A': '#F49AC1', '12B': '#F49AC1',
    '100': '#BE1E2D', '101': '#2E3192',
    '400': '#00AEEF',
};

const ALERT_POLL_MS = 60000;
const ROTATE_MS = 10000;

const AlertBanner: React.FC = () => {
    const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const rotateRef = useRef<number | null>(null);

    // Poll for alerts
    useEffect(() => {
        const poll = () => {
            fetchServiceAlerts().then(setAlerts);
        };
        poll();
        const interval = setInterval(poll, ALERT_POLL_MS);
        return () => clearInterval(interval);
    }, []);

    // Rotate through multiple alerts
    useEffect(() => {
        if (alerts.length <= 1) {
            setActiveIndex(0);
            return;
        }
        rotateRef.current = window.setInterval(() => {
            setActiveIndex(prev => (prev + 1) % alerts.length);
        }, ROTATE_MS);
        return () => {
            if (rotateRef.current) clearInterval(rotateRef.current);
        };
    }, [alerts.length]);

    if (alerts.length === 0) return null;

    const alert = alerts[activeIndex % alerts.length];
    if (!alert) return null;

    const accentColor = alert.routeIds.length > 0
        ? (ROUTE_COLORS[alert.routeIds[0]] || '#0055A4')
        : '#0055A4';

    return (
        <div className="alert-banner">
            <div className="alert-accent" style={{ backgroundColor: accentColor }} />
            <div className="alert-content">
                <span className="alert-header">{alert.header}</span>
                {alert.description && (
                    <span className="alert-description"> — {alert.description}</span>
                )}
            </div>
            {alerts.length > 1 && (
                <div className="alert-counter">
                    {(activeIndex % alerts.length) + 1}/{alerts.length}
                </div>
            )}
        </div>
    );
};

export default AlertBanner;
```

**Step 3: Import and render in MapDisplay**

At top:
```tsx
import AlertBanner from './AlertBanner';
```

Inside JSX, right after `<ClockDisplay />`:
```tsx
<AlertBanner />
```

**Step 4: Add alert banner CSS**

```css
/* Alert Banner */
.alert-banner {
    position: absolute;
    top: 12px;
    right: 16px;
    left: 200px;
    background-color: rgba(0, 0, 0, 0.8);
    border-radius: 10px;
    z-index: 25;
    overflow: hidden;
    pointer-events: none;
    padding: 0;
}

.alert-accent {
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    border-radius: 10px 0 0 10px;
}

.alert-content {
    padding: 10px 16px 10px 22px;
    color: white;
    font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.alert-header {
    font-weight: bold;
}

.alert-description {
    opacity: 0.85;
}

.alert-counter {
    position: absolute;
    top: 50%;
    right: 12px;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
}
```

**Step 5: Type-check and build**

Run: `npx tsc --noEmit && npm run build:react`

**Step 6: Commit**

```bash
git add src/services/alerts.ts src/components/AlertBanner.tsx src/components/MapDisplay.tsx src/index.css
git commit -m "feat(ui): add alert banner with GTFS-RT ServiceAlerts"
```

---

## Task 10: Extract shared route colors config

**Files:**
- Create: `src/config/routes.ts`
- Modify: `src/components/MapDisplay.tsx` (import from config)
- Modify: `src/components/ArrivalToasts.tsx` (import from config)
- Modify: `src/components/RouteLegend.tsx` (import from config)
- Modify: `src/components/AlertBanner.tsx` (import from config)

**Step 1: Create shared config**

Create `src/config/routes.ts`:

```ts
export const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837',
    '2B': '#006837',
    '7A': '#F58220',
    '7B': '#F58220',
    '8A': '#000000',
    '8B': '#000000',
    '10': '#662D91',
    '11': '#8DC63F',
    '12A': '#F49AC1',
    '12B': '#F49AC1',
    '100': '#BE1E2D',
    '101': '#2E3192',
    '400': '#00AEEF',
};

export const DEFAULT_COLOR = '#0055A4';

export const ROUTE_ORDER = ['2A','2B','7A','7B','8A','8B','10','11','12A','12B','100','101','400'];

export const TERMINAL_STOP_IDS = ['9003','9004','9005','9006','9012','9013','9014'];

export const TERMINAL_STOP_NAMES: Record<string, string> = {
    '9003': 'Platform 3',
    '9004': 'Platform 4',
    '9005': 'Platform 5',
    '9006': 'Terminal',
    '9012': 'Platform 12',
    '9013': 'Platform 13',
    '9014': 'Platform 14',
};
```

**Step 2: Replace inline ROUTE_COLORS in all 4 components**

In each file, remove the local `ROUTE_COLORS`, `DEFAULT_COLOR`, etc. and add:

```ts
import { ROUTE_COLORS, DEFAULT_COLOR } from '../config/routes';
```

(Plus `TERMINAL_STOP_IDS`, `TERMINAL_STOP_NAMES`, `ROUTE_ORDER` as needed per component.)

**Step 3: Type-check and build**

Run: `npx tsc --noEmit && npm run build:react`

**Step 4: Commit**

```bash
git add src/config/routes.ts src/components/MapDisplay.tsx src/components/ArrivalToasts.tsx src/components/RouteLegend.tsx src/components/AlertBanner.tsx
git commit -m "refactor: extract shared route colors and terminal config"
```

---

## Task 11: Final build verification and visual review

**Step 1: Full build**

Run: `npx tsc --noEmit && npm run build:react`
Expected: No errors.

**Step 2: Dev server visual check**

Run: `npm run dev:react`

Verify in browser:
- [ ] Clock/date shows top-left
- [ ] Platform labels (P3, P4, P5, P12, P13, P14) visible on map at correct positions
- [ ] Bus markers are colored circles with route number inside (no bus icon image)
- [ ] Route legend bar at bottom with all route pills
- [ ] When a bus has `current_status=1` at a terminal stop: marker glows, toast appears
- [ ] Toast auto-dismisses after ~15 seconds
- [ ] Alert banner appears if GTFS-RT ServiceAlerts feed has data
- [ ] No layout overflow or clipping issues

**Step 3: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat: platform map display enhancements - complete"
```

---

## Future Phase: Manual Alerts via Firebase

Not included in this plan. Would involve:
- Firebase project setup + Firestore collection for manual alerts
- Simple admin UI (separate page or Notion integration)
- Real-time listener in AlertBanner component
- Merging manual + GTFS-RT alerts with priority ordering

This should be a separate design + plan cycle.
