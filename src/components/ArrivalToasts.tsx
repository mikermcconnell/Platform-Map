import React, { useRef } from 'react';
import { VehiclePosition } from '../services/gtfs';
import { ROUTE_COLORS, DEFAULT_COLOR, TERMINAL_STOP_NAMES, GEOFENCE_OVERRIDES } from '../config/routes';
import { classifyTerminalState, hasNonTerminalStopUpdate } from '../utils/terminalState';

const STICKY_HOLD_MS = 90_000;

interface StickyEntry {
    expiry: number;
    platformName: string;
    status: 'arrived' | 'arriving';
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
            const terminalState = classifyTerminalState(
                v,
                TERMINAL_STOP_NAMES,
                GEOFENCE_OVERRIDES,
            );

            let platformName: string | undefined = terminalState.platformName;
            let status: 'arrived' | 'arriving' | undefined;
            const isActiveNow = (terminalState.atTerminal || terminalState.arriving) && platformName != null;

            if (isActiveNow) {
                status = terminalState.atTerminal ? 'arrived' : 'arriving';
                stickyMap.set(v.id, { expiry: now + STICKY_HOLD_MS, platformName: platformName!, status });
            } else if (stickyMap.has(v.id)) {
                // Vehicle has moved to a clearly non-terminal stop and is no longer near terminal geofence.
                if (hasNonTerminalStopUpdate(v, TERMINAL_STOP_NAMES) && !terminalState.geofenceInArea) {
                    stickyMap.delete(v.id);
                } else {
                    const stickyEntry = stickyMap.get(v.id)!;
                    platformName = stickyEntry.platformName;
                    status = stickyEntry.status;
                }
            }

            if (!platformName || !status) return null;

            let displayRouteId = v.routeId;
            if (v.routeId === '8A' || v.routeId === '8B') {
                if (v.directionId != null) {
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
