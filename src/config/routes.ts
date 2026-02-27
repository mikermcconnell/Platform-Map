export const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837',
    '2B': '#006837',
    '7A': '#F58220',
    '7B': '#F58220',
    '8A': '#333333',
    '8B': '#333333',
    '10': '#662D91',
    '11': '#8DC63F',
    '12A': '#F49AC1',
    '12B': '#F49AC1',
    '100': '#BE1E2D',
    '101': '#2E3192',
    '400': '#00AEEF',
};

export const DEFAULT_COLOR = '#0055A4';

export const ROUTE_ORDER = ['2A','2B','7A','7B','8A','8B','10','11','12A','12B','100','101','400'];

export const TERMINAL_STOP_IDS = ['14','9003','9004','9005','9006','9012','9013','9014'];

export interface GeofenceOverride {
    routeId: string;
    directionId: number;
    stopName: string;
    lat: number;
    lon: number;
    radiusMeters: number;
}

export const GEOFENCE_OVERRIDES: GeofenceOverride[] = [
    {
        routeId: '8A',
        directionId: 0, // northbound only
        stopName: 'Platform 5',
        lat: 44.3739253,
        lon: -79.6897531,
        radiusMeters: 120,
    },
    {
        routeId: '8B',
        directionId: 0, // northbound only
        stopName: 'Platform 12',
        lat: 44.3742136,
        lon: -79.6904055,
        radiusMeters: 75,
    },
    {
        routeId: '7A',
        directionId: 0,
        stopName: 'Platform 6',
        lat: 44.3742472,
        lon: -79.6896899,
        radiusMeters: 75,
    },
];

export const TERMINAL_STOP_NAMES: Record<string, string> = {
    '14': 'Platform 14',
    '9003': 'Platform 3',
    '9004': 'Platform 4',
    '9005': 'Platform 5',
    '9006': 'Platform 6',
    '9012': 'Platform 12',
    '9013': 'Platform 13',
    '9014': 'Platform 14',
};
