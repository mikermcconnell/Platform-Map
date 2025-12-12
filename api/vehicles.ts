import type { VercelRequest, VercelResponse } from '@vercel/node';

// Use dynamic import for CommonJS module compatibility
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const GTFS_RT_URL = 'https://www.myridebarrie.ca/gtfs/GTFS_VehiclePositions.pb';

interface Vehicle {
    id: string;
    route_id: string | null;
    direction_id: number | null;
    lat: number;
    lon: number;
    bearing: number | null;
    speed: number | null;
    last_reported: number | null;
}

interface VehiclesResponse {
    generated_at: number;
    vehicles: Vehicle[];
    error?: string;
}

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
): Promise<void> {
    // Set CORS headers for all responses
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Cache-Control', 'public, max-age=5');

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    const started = Date.now();

    try {
        // Fetch the raw Protobuf data from the transit agency
        // Add AbortController for timeout (10 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(GTFS_RT_URL, {
            headers: {
                'Accept': 'application/x-protobuf',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`GTFS-RT fetch failed: ${res.status}`);
        }

        const buffer = await res.arrayBuffer();

        // Decode Protobuf on the SERVER (not the TV!)
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );

        const vehicles: Vehicle[] = [];

        // Safely iterate over entities (handle potential undefined)
        const entities = feed.entity || [];
        entities.forEach((ent: any) => {
            if (!ent.vehicle || !ent.vehicle.position) return;

            const v = ent.vehicle;
            vehicles.push({
                id: (v.vehicle && (v.vehicle.id || v.vehicle.label)) || ent.id || 'unknown',
                route_id: (v.trip && v.trip.routeId) || null,
                direction_id:
                    v.trip && Number.isFinite(Number(v.trip.directionId))
                        ? Number(v.trip.directionId)
                        : null,
                lat: v.position.latitude,
                lon: v.position.longitude,
                // Fix: bearing of 0 is valid, don't treat as falsy
                bearing: typeof v.position.bearing === 'number' ? v.position.bearing : null,
                speed: typeof v.position.speed === 'number' ? v.position.speed : null,
                last_reported:
                    v.timestamp
                        ? Number(v.timestamp.toNumber ? v.timestamp.toNumber() : v.timestamp)
                        : null,
            });
        });

        const duration = Date.now() - started;
        console.log(`[gtfs-rt] Decoded ${vehicles.length} vehicles in ${duration}ms`);

        const result: VehiclesResponse = {
            generated_at: Date.now(),
            vehicles,
        };

        response.status(200).json(result);
    } catch (error) {
        const duration = Date.now() - started;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[gtfs-rt] Fetch failed after ${duration}ms:`, errorMessage);

        const result: VehiclesResponse = {
            generated_at: Date.now(),
            vehicles: [],
            error: errorMessage,
        };

        response.status(502).json(result);
    }
}
