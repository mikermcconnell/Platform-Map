import React from 'react';
import { VehiclePosition } from '../services/gtfs';
import { ROUTE_COLORS, DEFAULT_COLOR, TERMINAL_STOP_NAMES } from '../config/routes';

// GTFS-RT current_status enum values
const STOPPED_AT = 1;
const INCOMING_AT = 0;

interface ArrivalToastsProps {
    vehicles: VehiclePosition[];
    sidebarLeft: number;
}

const ArrivalToasts: React.FC<ArrivalToastsProps> = ({ vehicles, sidebarLeft }) => {
    // Derive board entries directly from current vehicle state — no timers.
    // Entry stays as long as the feed reports the bus at a terminal platform.
    const entries = vehicles
        .filter(v => {
            if (!v.stopId || !v.routeId) return false;
            if (!TERMINAL_STOP_NAMES[v.stopId]) return false;
            return v.currentStatus === STOPPED_AT || v.currentStatus === INCOMING_AT;
        })
        .map(v => {
            const status = v.currentStatus === STOPPED_AT ? 'arrived' : 'arriving';
            return {
                id: v.id,
                routeId: v.routeId!,
                platformName: TERMINAL_STOP_NAMES[v.stopId!],
                status,
                color: ROUTE_COLORS[v.routeId!] || DEFAULT_COLOR,
            };
        });

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
