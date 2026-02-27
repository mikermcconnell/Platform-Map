import type { GeofenceOverride } from '../config/routes';
import type { VehiclePosition } from '../services/gtfs';
import { isWithinGeofence } from './geofence';

export const INCOMING_AT = 0;
export const STOPPED_AT = 1;
export const IN_TRANSIT_TO = 2;

// Treat very slow movement in a terminal geofence as effectively stopped.
export const GEOFENCE_STOP_SPEED_MPS = 1.5;

export interface TerminalState {
    atTerminal: boolean;
    arriving: boolean;
    platformName?: string;
    geofenceInArea: boolean;
}

function isArrivingStatus(status?: number): boolean {
    return status === INCOMING_AT || status === IN_TRANSIT_TO;
}

function isStoppedStatus(status?: number): boolean {
    return status === STOPPED_AT;
}

function findGeofenceMatch(
    vehicle: VehiclePosition,
    geofenceOverrides: GeofenceOverride[],
): GeofenceOverride | undefined {
    if (!vehicle.routeId || vehicle.directionId == null) return undefined;

    return geofenceOverrides.find((g) =>
        g.routeId === vehicle.routeId
        && g.directionId === vehicle.directionId
        && isWithinGeofence(vehicle.lat, vehicle.lon, g.lat, g.lon, g.radiusMeters),
    );
}

export function classifyTerminalState(
    vehicle: VehiclePosition,
    terminalStopNames: Record<string, string>,
    geofenceOverrides: GeofenceOverride[],
): TerminalState {
    const terminalStopPlatformName =
        vehicle.stopId != null ? terminalStopNames[vehicle.stopId] : undefined;
    const hasTerminalStop = terminalStopPlatformName != null;
    const geofenceMatch = findGeofenceMatch(vehicle, geofenceOverrides);
    const geofenceInArea = geofenceMatch != null;

    const arrivingStatus = isArrivingStatus(vehicle.currentStatus);
    const stoppedStatus = isStoppedStatus(vehicle.currentStatus);
    const lowSpeedInGeofence = geofenceInArea
        && arrivingStatus
        && vehicle.speed != null
        && vehicle.speed <= GEOFENCE_STOP_SPEED_MPS;

    const geofenceArrived = geofenceInArea && (stoppedStatus || lowSpeedInGeofence);
    const geofenceArriving = geofenceInArea && arrivingStatus && !geofenceArrived;

    const atTerminal = (hasTerminalStop && stoppedStatus) || geofenceArrived;
    const arriving = !atTerminal && (
        (hasTerminalStop && arrivingStatus) || geofenceArriving
    );

    return {
        atTerminal,
        arriving,
        platformName: terminalStopPlatformName ?? geofenceMatch?.stopName,
        geofenceInArea,
    };
}

export function hasNonTerminalStopUpdate(
    vehicle: VehiclePosition,
    terminalStopNames: Record<string, string>,
): boolean {
    return vehicle.stopId != null && terminalStopNames[vehicle.stopId] == null;
}
