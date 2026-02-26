/**
 * Vercel Serverless Function: /api/vehicles
 * Fetches GTFS Realtime Protobuf, decodes server-side, returns JSON
 */

const fetch = require('node-fetch');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const GTFS_RT_URL = 'https://www.myridebarrie.ca/gtfs/GTFS_VehiclePositions.pb';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://platform-map.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

module.exports = async function handler(req, res) {
    // Set CORS headers with origin validation
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=5');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const started = Date.now();

    try {
        // Fetch the raw Protobuf data from the transit agency
        // No custom headers - transit agency rejects Accept: application/x-protobuf (406)
        const response = await fetch(GTFS_RT_URL, { timeout: 10000 });

        if (!response.ok) {
            throw new Error('GTFS-RT fetch failed: ' + response.status);
        }

        const buffer = await response.buffer();

        // Decode Protobuf on the SERVER (not the TV!)
        // Pass buffer directly like working reference
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

        const vehicles = [];
        const entities = feed.entity || [];

        entities.forEach(function (ent) {
            if (!ent.vehicle || !ent.vehicle.position) return;

            const v = ent.vehicle;
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
        });

        const duration = Date.now() - started;
        console.log('[gtfs-rt] Decoded ' + vehicles.length + ' vehicles in ' + duration + 'ms');

        res.status(200).json({
            generated_at: Date.now(),
            vehicles: vehicles,
        });
    } catch (error) {
        const duration = Date.now() - started;
        const errorMessage = error.message || 'Unknown error';
        console.error('[gtfs-rt] Fetch failed after ' + duration + 'ms:', errorMessage);

        res.status(502).json({
            generated_at: Date.now(),
            vehicles: [],
            error: 'Failed to fetch vehicle data',
        });
    }
};
