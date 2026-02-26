export interface ServiceAlert {
    id: string;
    header: string;
    description: string;
    routeIds: string[];
    source: 'gtfs-rt' | 'manual';
}

interface AlertAPIResponse {
    id: string;
    header: string;
    description: string;
    route_ids: string[];
}

interface AlertsAPIResponse {
    generated_at: number;
    alerts: AlertAPIResponse[];
    error?: string;
}

export const fetchServiceAlerts = async (): Promise<ServiceAlert[]> => {
    try {
        const response = await fetch('/api/alerts');
        if (!response.ok) return [];

        const data: AlertsAPIResponse = await response.json();
        if (!data.alerts || !Array.isArray(data.alerts)) return [];

        return data.alerts.map(a => ({
            id: a.id,
            header: a.header,
            description: a.description,
            routeIds: a.route_ids || [],
            source: 'gtfs-rt' as const,
        }));
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
};
