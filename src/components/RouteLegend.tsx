import React from 'react';
import { VehiclePosition } from '../services/gtfs';
import { ROUTE_COLORS, ROUTE_ORDER, TERMINAL_STOP_IDS } from '../config/routes';

interface RouteLegendProps {
    vehicles: VehiclePosition[];
}

const RouteLegend: React.FC<RouteLegendProps> = ({ vehicles }) => {
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
