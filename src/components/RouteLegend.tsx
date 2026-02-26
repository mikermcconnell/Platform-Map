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

const ROUTE_ORDER = ['2A','2B','7A','7B','8A','8B','10','11','12A','12B','100','101','400'];

const TERMINAL_STOP_IDS = ['9003','9004','9005','9006','9012','9013','9014'];

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
