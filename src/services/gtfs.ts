export interface VehiclePosition {
    id: string;
    lat: number;
    lon: number;
    routeId?: string;
    directionId?: number;
    bearing?: number;
}

// API response type for type safety
interface VehicleAPIResponse {
    id: string;
    lat: number;
    lon: number;
    route_id?: string;
    direction_id?: number;
    bearing?: number;
}

interface VehiclesAPIResponse {
    generated_at: number;
    vehicles: VehicleAPIResponse[];
    error?: string;
}

export interface FetchResult {
    vehicles: VehiclePosition[];
    error: string | null;
}

export const fetchVehiclePositions = async (): Promise<VehiclePosition[]> => {
    try {
        const response = await fetch('/api/vehicles');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: VehiclesAPIResponse = await response.json();
        const vehicles: VehiclePosition[] = [];

        if (data.vehicles && Array.isArray(data.vehicles)) {
            data.vehicles.forEach((v: VehicleAPIResponse) => {
                vehicles.push({
                    id: v.id,
                    lat: v.lat,
                    lon: v.lon,
                    routeId: v.route_id,
                    directionId: v.direction_id,
                    bearing: v.bearing ?? 0
                });
            });
        }

        return vehicles;
    } catch (error) {
        console.error('Error fetching GTFS data:', error);
        return [];
    }
};
