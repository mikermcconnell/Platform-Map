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
    { "lat": 44.373667, "lon": -79.687722, "x": 81.86, "y": 60.24 },   // Pick-up/Drop-off
    { "lat": 44.373833, "lon": -79.689139, "x": 57.13, "y": 59.06 },   // Platform 2
    { "lat": 44.374250, "lon": -79.689750, "x": 42.11, "y": 45.225 },  // Platform 6
    { "lat": 44.373528, "lon": -79.691139, "x": 17.34, "y": 74.53 }    // Platform 14
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
        // Calculate Affine Matrix from hardcoded data
        const matrix = solveAffine(CALIBRATION_DATA);
        if (matrix) {
            setAffineMatrix(matrix);
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
            // Bus off-screen
        }

        return { left: `${x}%`, top: `${y}%` };
    };

    return (
        <div className="map-container">
            <div
                ref={mapRef}
                className="map-container"
                onClick={(e) => {
                    // Handler removed for production
                }}
                style={{}}
            >
                <img
                    src="/assets/map.jpg"
                    alt="Platform Map"
                    className="map-image"
                    onError={(e) => console.error("Failed to load map image", e.currentTarget.src)}
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        const updateDimensions = () => {
                            if (!mapRef.current) return;
                            const screenW = window.innerWidth;
                            const screenH = window.innerHeight;
                            const screenRatio = screenW / screenH;
                            const imgRatio = img.naturalWidth / img.naturalHeight;

                            let width, height, top, left;

                            if (imgRatio > screenRatio) {
                                // Image is wider than screen (fit width)
                                width = screenW;
                                height = screenW / imgRatio;
                                left = 0;
                                top = (screenH - height) / 2;
                            } else {
                                // Image is taller than screen (fit height)
                                height = screenH;
                                width = screenH * imgRatio;
                                top = 0;
                                left = (screenW - width) / 2;
                            }

                            mapRef.current.style.width = `${width}px`;
                            mapRef.current.style.height = `${height}px`;
                            mapRef.current.style.position = 'absolute';
                            mapRef.current.style.left = `${left}px`;
                            mapRef.current.style.top = `${top}px`;
                        };

                        updateDimensions();
                        window.addEventListener('resize', updateDimensions);
                    }}
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
                            className="bus-marker"
                            style={{ left: pos.left, top: pos.top }}
                            title={`Bus ${v.id}`}
                        >
                            <div
                                className="bus-icon-wrapper"
                                style={{ borderColor: routeColor }}
                            >
                                <img
                                    src="/assets/bus_icon.jpg"
                                    alt="Bus"
                                    className="bus-icon-image"
                                />
                            </div>
                            {/* Large Floating Route Label for TV Visibility */}
                            {v.routeId && (
                                <div
                                    className="bus-label"
                                    style={{ backgroundColor: routeColor }}
                                >
                                    {displayRouteId}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Calibration Overlay - Removed */}
            </div>
        </div>
    );
};

export default MapDisplay;
