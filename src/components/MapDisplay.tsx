import React, { useEffect, useState, useRef } from 'react';
import { fetchVehiclePositions, VehiclePosition } from '../services/gtfs';

// Calibration Data
// Calibration Data
interface CalibrationPoint {
    lat: number;
    lon: number;
    x: number;
    y: number;
}

// Final Calibration Data (Affine Transformation)
const CALIBRATION_DATA: CalibrationPoint[] = [
    { "lat": 44.373837, "lon": -79.689279, "x": 54.18848167539267, "y": 55.32381997804611 }, // Platform 3
    { "lat": 44.374232, "lon": -79.689392, "x": 47.748691099476446, "y": 37.43139407244786 }, // Platform 7
    { "lat": 44.374245, "lon": -79.689674, "x": 43.97905759162304, "y": 38.090010976948406 }, // Platform 6
    { "lat": 44.374171, "lon": -79.690445, "x": 33.089005235602095, "y": 43.02963776070253 }, // Platform 12
    { "lat": 44.373515, "lon": -79.691137, "x": 23.24607329842932, "y": 82.87596048298573 }  // Platform 14
];

// Route Colors
const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837', // Green
    '2B': '#006837',
    '7A': '#F58220', // Orange
    '7B': '#F58220',
    '8A': '#000000', // Black
    '8B': '#000000',
    '10': '#662D91', // Purple
    '11': '#8DC63F', // Lime
    '12A': '#F49AC1', // Pink
    '12B': '#F49AC1',
    '100': '#BE1E2D', // Red
    '101': '#2E3192', // Blue
    '400': '#00AEEF', // Cyan
};

const DEFAULT_COLOR = '#0055A4'; // Default Blue

// Affine Transformation Solver (Least Squares with Centering)
const solveAffine = (points: CalibrationPoint[]) => {
    if (points.length < 3) return null;

    const n = points.length;

    // 1. Calculate Centroids
    let sumLon = 0, sumLat = 0, sumX = 0, sumY = 0;
    for (const p of points) {
        sumLon += p.lon;
        sumLat += p.lat;
        sumX += p.x;
        sumY += p.y;
    }
    const meanLon = sumLon / n;
    const meanLat = sumLat / n;
    const meanX = sumX / n;
    const meanY = sumY / n;

    // 2. Accumulate sums using centered coordinates (u, v)
    let sumU2 = 0, sumV2 = 0, sumUV = 0;
    let sumUX = 0, sumVX = 0, sumUY = 0, sumVY = 0;

    for (const p of points) {
        const u = p.lon - meanLon;
        const v = p.lat - meanLat;
        const dx = p.x - meanX;
        const dy = p.y - meanY;

        sumU2 += u * u;
        sumV2 += v * v;
        sumUV += u * v;

        sumUX += u * dx;
        sumVX += v * dx;
        sumUY += u * dy;
        sumVY += v * dy;
    }

    // 3. Solve linear system for A, B (and D, E)
    // [ sumU2   sumUV ] [ A ] = [ sumUX ]
    // [ sumUV   sumV2 ] [ B ]   [ sumVX ]

    const det = sumU2 * sumV2 - sumUV * sumUV;
    if (Math.abs(det) < 1e-20) {
        console.error("Singular matrix in affine solver");
        return null;
    }

    const A = (sumV2 * sumUX - sumUV * sumVX) / det;
    const B = (sumU2 * sumVX - sumUV * sumUX) / det;

    const D = (sumV2 * sumUY - sumUV * sumVY) / det;
    const E = (sumU2 * sumVY - sumUV * sumUY) / det;

    // 4. Calculate C and F (Translation)
    // x = A*u + B*v + meanX
    // x = A*(lon - meanLon) + B*(lat - meanLat) + meanX
    // x = A*lon + B*lat + (meanX - A*meanLon - B*meanLat)
    const C = meanX - A * meanLon - B * meanLat;
    const F = meanY - D * meanLon - E * meanLat;

    return { A, B, C, D, E, F };
};

const MapDisplay: React.FC = () => {
    const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
    const [affineMatrix, setAffineMatrix] = useState<{ A: number, B: number, C: number, D: number, E: number, F: number } | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log(`MapDisplay Mounted. Viewport: ${window.innerWidth}x${window.innerHeight}`);
        // Calculate Affine Matrix from hardcoded data
        const matrix = solveAffine(CALIBRATION_DATA);
        if (matrix) {
            setAffineMatrix(matrix);
            console.log('Affine Matrix Applied:', matrix);
        }

        // Initial fetch
        fetchVehiclePositions().then(setVehicles);

        // Poll every 15 seconds
        const interval = setInterval(async () => {
            const data = await fetchVehiclePositions();
            setVehicles(data);
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    const getPixelPosition = (lat: number, lon: number) => {
        if (!affineMatrix) return { left: '-100px', top: '-100px' };
        const { A, B, C, D, E, F } = affineMatrix;
        const x = A * lon + B * lat + C;
        const y = D * lon + E * lat + F;

        // Debug Log (Sample occasionally or if off-screen)
        if (x < 0 || x > 100 || y < 0 || y > 100) {
            console.warn(`Bus off-screen: Lat ${lat}, Lon ${lon} -> X ${x}, Y ${y}`);
        }

        return { left: `${x}%`, top: `${y}%` };
    };

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden">
            <div
                ref={mapRef}
                className="relative w-full h-full"
            >
                <img
                    src="/assets/map.png"
                    alt="Platform Map"
                    className="w-full h-full object-contain"
                    onError={(e) => console.error("Failed to load map image", e.currentTarget.src)}
                    onLoad={() => console.log("Map image loaded successfully")}
                />

                {/* Render Vehicles */}
                {vehicles.map(v => {
                    const pos = getPixelPosition(v.lat, v.lon);
                    const routeColor = (v.routeId && ROUTE_COLORS[v.routeId]) ? ROUTE_COLORS[v.routeId] : DEFAULT_COLOR;

                    // Determine Direction for Route 8 (8A/8B)
                    let displayRouteId = v.routeId || '';
                    if ((v.routeId === '8A' || v.routeId === '8B')) {
                        // Priority: Use GTFS direction_id if available (Stable)
                        if (v.directionId !== undefined) {
                            // Usually 0 = Outbound (North?), 1 = Inbound (South?)
                            // We will try this mapping. If swapped, user can correct.
                            displayRouteId += (v.directionId === 0 ? ' NB' : ' SB');
                        }
                        // Fallback: Use Bearing (Instantaneous)
                        else if (v.bearing !== undefined) {
                            if (v.bearing > 270 || v.bearing <= 90) {
                                displayRouteId += ' NB';
                            } else {
                                displayRouteId += ' SB';
                            }
                        }
                    }

                    return (
                        <div
                            key={v.id}
                            className="absolute w-20 h-20 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear z-10"
                            style={{ left: pos.left, top: pos.top }}
                            title={`Bus ${v.id}`}
                        >
                            <div
                                className="relative w-full h-full group rounded-full overflow-hidden shadow-lg bg-white border-4"
                                style={{ borderColor: routeColor }}
                            >
                                <img
                                    src="/assets/bus_icon.jpg"
                                    alt="Bus"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Large Floating Route Label for TV Visibility */}
                            {v.routeId && (
                                <div
                                    className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-white text-xl font-bold px-3 py-1 rounded-lg shadow-md border-2 border-white z-20 whitespace-nowrap"
                                    style={{ backgroundColor: routeColor }}
                                >
                                    {displayRouteId}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MapDisplay;
