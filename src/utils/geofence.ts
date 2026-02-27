// Approximate meters-per-degree at latitude ~44.37°N
const LAT_METERS = 111_000;
const LON_METERS = 79_432; // cos(44.37°) × 111,000

export function isWithinGeofence(
    vehicleLat: number,
    vehicleLon: number,
    targetLat: number,
    targetLon: number,
    radiusMeters: number,
): boolean {
    const dLat = (vehicleLat - targetLat) * LAT_METERS;
    const dLon = (vehicleLon - targetLon) * LON_METERS;
    return (dLat * dLat + dLon * dLon) <= radiusMeters * radiusMeters;
}
