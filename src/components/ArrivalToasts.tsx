import React, { useRef } from 'react';
import { VehiclePosition } from '../services/gtfs';
import { ROUTE_COLORS, DEFAULT_COLOR, TERMINAL_STOP_NAMES, GEOFENCE_OVERRIDES } from '../config/routes';
import { isWithinGeofence } from '../utils/geofence';

// GTFS-RT current_status enum values
const STOPPED_AT = 1;
const INCOMING_AT = 0;

const STICKY_HOLD_MS = 90_000;

interface StickyEntry {
    expiry: number;
    platformName: string;
}

interface ArrivalToastsProps {
    vehicles: VehiclePosition[];
    sidebarLeft: number;
}

const ArrivalToasts: React.FC<ArrivalToastsProps> = ({ vehicles, sidebarLeft }) => {
    const stickyMapRef = useRef<Map<string, StickyEntry>>(new Map());
    const stickyMap = stickyMapRef.current;
    const now = Date.now();

    // Clean expired entries
    for (const [id, entry] of stickyMap) {
        if (entry.expiry < now) stickyMap.delete(id);
    }

    const entries = vehicles
        .map(v => {
            if (!v.routeId) return null;

            // Standard terminal detection
            const isTerminalStatus =
                v.stopId != null
                && TERMINAL_STOP_NAMES[v.stopId] != null
                && (v.currentStatus === STOPPED_AT || v.currentStatus === INCOMING_AT);

            // Geofence override detection
            const geofenceMatch = GEOFENCE_OVERRIDES.find(g =>
                g.routeId === v.routeId
                && g.directionId === v.directionId
                && isWithinGeofence(v.lat, v.lon, g.lat, g.lon, g.radiusMeters),
            );

            let platformName: string | undefined;
            let isActive = false;

            if (isTerminalStatus) {
                platformName = TERMINAL_STOP_NAMES[v.stopId!];
                isActive = true;
            } else if (geofenceMatch) {
                platformName = geofenceMatch.stopName;
                isActive = true;
            }

            if (isActive && platformName) {
                // Refresh sticky timer
                stickyMap.set(v.id, { expiry: now + STICKY_HOLD_MS, platformName });
            } else if (stickyMap.has(v.id)) {
                // Vehicle not currently detected but within sticky hold window
                platformName = stickyMap.get(v.id)!.platformName;
                isActive = true;
            }

            if (!isActive || !platformName) return null;

            // Determine display status
            let status: 'arrived' | 'arriving';
            if (v.currentStatus === INCOMING_AT && isTerminalStatus) {
                status = 'arriving';
            } else {
                // STOPPED_AT, geofence match, or sticky holdover — all show as arrived
                status = 'arrived';
            }

            let displayRouteId = v.routeId;
            if (v.routeId === '8A' || v.routeId === '8B') {
                if (v.directionId !== undefined) {
                    displayRouteId += (v.directionId === 0 ? ' NB' : ' SB');
                } else if (v.bearing !== undefined) {
                    displayRouteId += (v.bearing > 270 || v.bearing <= 90) ? ' NB' : ' SB';
                }
            }

            return {
                id: v.id,
                routeId: displayRouteId,
                platformName,
                status,
                color: ROUTE_COLORS[v.routeId] || DEFAULT_COLOR,
            };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

    if (entries.length === 0) return null;

    return (
        <div className="arrival-board" style={{
            position: 'fixed',
            left: `${sidebarLeft + 8}px`,
            top: '8px',
            right: '8px',
            width: 'auto',
        }}>
            <div className="arrival-board-header">Terminal Arrivals</div>
            {entries.map(entry => (
                <div key={entry.id} className="arrival-board-row">
                    <span
                        className="arrival-board-route"
                        style={{ backgroundColor: entry.color }}
                    >
                        {entry.routeId}
                    </span>
                    <span className="arrival-board-platform">{entry.platformName}</span>
                    <span className={`arrival-board-status ${entry.status === 'arrived' ? 'status-arrived' : 'status-arriving'}`}>
                        {entry.status === 'arrived' ? 'AT PLATFORM' : 'ARRIVING'}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default ArrivalToasts;
