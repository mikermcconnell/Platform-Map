

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
        // Use the Serverless Function which decodes Protobuf server-side and returns JSON
        const response = await fetch('/api/vehicles');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const vehicles: VehiclePosition[] = [];

        if (data.vehicles && Array.isArray(data.vehicles)) {
            data.vehicles.forEach((v: any) => {
                // Determine Direction for Route 8 (8A/8B)
                // The API returns direction_id, bearing, lat, lon
                vehicles.push({
                    id: v.id,
                    lat: v.lat,
                    lon: v.lon,
                    routeId: v.route_id,
                    directionId: v.direction_id,
                    bearing: v.bearing || 0
                });
            });
        }

        return vehicles;
    } catch (error) {
        console.error('Error fetching GTFS data:', error);
        return [];
    }
};
