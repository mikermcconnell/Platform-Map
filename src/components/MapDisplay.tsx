import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchVehiclePositions, VehiclePosition } from '../services/gtfs';

// Constants
const POLL_INTERVAL_MS = 15000;

// Calibration Data
interface CalibrationPoint {
    lat: number;
    lon: number;
    x: number;
    y: number;
}

// Final Calibration Data (Affine Transformation)
const CALIBRATION_DATA: CalibrationPoint[] = [
    { "lat": 44.373667, "lon": -79.687722, "x": 93.6916, "y": 57.1899 },   // Pick-up/Drop-off
    { "lat": 44.373833, "lon": -79.689139, "x": 62.0475, "y": 54.1164 },   // Platform 2
    { "lat": 44.374250, "lon": -79.689750, "x": 42.0260, "y": 38.5291 },   // Platform 6
    { "lat": 44.373528, "lon": -79.691139, "x": 7.7520, "y": 80.5708 }     // Platform 14
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

// Terminal platform positions — GPS coords from GTFS static feed
const TERMINAL_PLATFORMS: { stopId: string; label: string; lat: number; lon: number }[] = [
    { stopId: '9003', label: 'P3', lat: 44.3738731, lon: -79.6893516 },
    { stopId: '9004', label: 'P4', lat: 44.3738992, lon: -79.6895402 },
    { stopId: '9005', label: 'P5', lat: 44.3739253, lon: -79.6897531 },
    { stopId: '9006', label: 'Terminal', lat: 44.3742472, lon: -79.6896899 },
    { stopId: '9012', label: 'P12', lat: 44.3742136, lon: -79.6904055 },
    { stopId: '9013', label: 'P13', lat: 44.3741352, lon: -79.6904421 },
    { stopId: '9014', label: 'P14', lat: 44.373528, lon: -79.691139 },
];

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
    const [isLoading, setIsLoading] = useState(true);
    const [affineMatrix, setAffineMatrix] = useState<{ A: number, B: number, C: number, D: number, E: number, F: number } | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Resize handler - extracted for cleanup
    const updateDimensions = useCallback(() => {
        if (!mapRef.current || !imgRef.current) return;
        const img = imgRef.current;
        if (!img.naturalWidth || !img.naturalHeight) return;

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const screenRatio = screenW / screenH;
        const imgRatio = img.naturalWidth / img.naturalHeight;

        let width, height, top, left;

        if (imgRatio > screenRatio) {
            width = screenW;
            height = screenW / imgRatio;
            left = 0;
            top = (screenH - height) / 2;
        } else {
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
    }, []);

    // Resize listener with proper cleanup
    useEffect(() => {
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [updateDimensions]);

    useEffect(() => {
        // Calculate Affine Matrix from hardcoded data
        const matrix = solveAffine(CALIBRATION_DATA);
        if (matrix) {
            setAffineMatrix(matrix);
        }

        // Initial fetch
        setIsLoading(true);
        fetchVehiclePositions().then((data) => {
            setVehicles(data);
            setIsLoading(false);
        });

        // Poll at configured interval
        const interval = setInterval(async () => {
            const data = await fetchVehiclePositions();
            setVehicles(data);
        }, POLL_INTERVAL_MS);

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
                style={{}}
            >
                <img
                    ref={imgRef}
                    src="/assets/map.jpg"
                    alt="Platform Map"
                    className="map-image"
                    onError={(e) => console.error("Failed to load map image", e.currentTarget.src)}
                    onLoad={updateDimensions}
                />

                {/* Loading Indicator */}
                {isLoading && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: '24px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        padding: '20px 40px',
                        borderRadius: '8px'
                    }}>
                        Loading buses...
                    </div>
                )}

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
                                style={{ backgroundColor: routeColor, borderColor: routeColor }}
                            >
                                <span className="bus-route-number">{displayRouteId}</span>
                            </div>
                        </div>
                    );
                })}

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
            </div>
        </div>
    );
};

export default MapDisplay;
