import axios from 'axios';
import * as GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export interface VehiclePosition {
    id: string;
    lat: number;
    lon: number;
    routeId?: string;
    directionId?: number;
    bearing?: number;
}

export const fetchVehiclePositions = async (): Promise<VehiclePosition[]> => {
    try {
        const response = await axios.get('/api/gtfs', {
            responseType: 'arraybuffer',
        });

        // Access FeedMessage from the default export or the namespace
        // @ts-ignore - The types for this library can be tricky
        const FeedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage;

        // Use decode instead of read, and pass the Uint8Array directly
        const feed = FeedMessage.decode(new Uint8Array(response.data));

        const vehicles: VehiclePosition[] = [];

        // @ts-ignore
        feed.entity.forEach((entity: any) => {
            if (entity.vehicle && entity.vehicle.position) {
                vehicles.push({
                    id: entity.id,
                    lat: entity.vehicle.position.latitude as number,
                    lon: entity.vehicle.position.longitude as number,
                    routeId: entity.vehicle.trip?.routeId || undefined,
                    directionId: entity.vehicle.trip?.directionId,
                    bearing: entity.vehicle.position.bearing || 0,
                });
            }
        });

        return vehicles;
    } catch (error) {
        console.error('Error fetching GTFS data:', error);
        return [];
    }
};
