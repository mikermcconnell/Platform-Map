import React, { useState, useEffect, useRef } from 'react';
import { VehiclePosition } from '../services/gtfs';

// GTFS-RT current_status enum values
const STOPPED_AT = 1;
const INCOMING_AT = 0;

// Terminal platform stop IDs
const TERMINAL_STOPS: Record<string, string> = {
    '9003': 'Platform 3',
    '9004': 'Platform 4',
    '9005': 'Platform 5',
    '9006': 'Terminal',
    '9012': 'Platform 12',
    '9013': 'Platform 13',
    '9014': 'Platform 14',
};

const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837',
    '2B': '#006837',
    '7A': '#F58220',
    '7B': '#F58220',
    '8A': '#000000',
    '8B': '#000000',
    '10': '#662D91',
    '11': '#8DC63F',
    '12A': '#F49AC1',
    '12B': '#F49AC1',
    '100': '#BE1E2D',
    '101': '#2E3192',
    '400': '#00AEEF',
};

const DEFAULT_COLOR = '#0055A4';

interface Toast {
    id: string;
    routeId: string;
    platformName: string;
    status: 'arriving' | 'arrived';
    color: string;
    createdAt: number;
}

const TOAST_DURATION_MS = 15000;
const MAX_TOASTS = 3;

interface ArrivalToastsProps {
    vehicles: VehiclePosition[];
}

const ArrivalToasts: React.FC<ArrivalToastsProps> = ({ vehicles }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const shownRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const now = Date.now();
        const newToasts: Toast[] = [];

        for (const v of vehicles) {
            if (!v.stopId || !v.routeId) continue;

            const platformName = TERMINAL_STOPS[v.stopId];
            if (!platformName) continue;

            const isArriving = v.currentStatus === INCOMING_AT;
            const isStopped = v.currentStatus === STOPPED_AT;
            if (!isArriving && !isStopped) continue;

            const status = isStopped ? 'arrived' : 'arriving';
            const toastKey = `${v.id}-${status}`;

            if (shownRef.current.has(toastKey)) continue;
            shownRef.current.add(toastKey);

            // Clear the opposite status key so upgrades (arriving -> arrived) show
            const oppositeKey = `${v.id}-${status === 'arrived' ? 'arriving' : 'arrived'}`;
            shownRef.current.delete(oppositeKey);

            newToasts.push({
                id: toastKey,
                routeId: v.routeId,
                platformName,
                status,
                color: ROUTE_COLORS[v.routeId] || DEFAULT_COLOR,
                createdAt: now,
            });
        }

        if (newToasts.length > 0) {
            setToasts(prev => [...prev, ...newToasts].slice(-MAX_TOASTS));
        }

        // Clean up expired toasts
        setToasts(prev => prev.filter(t => now - t.createdAt < TOAST_DURATION_MS));

        // Clean up stale keys from shownRef (vehicles no longer in feed)
        const activeVehicleIds = new Set(vehicles.map(v => v.id));
        for (const key of shownRef.current) {
            const vehicleId = key.replace(/-arriving$|-arrived$/, '');
            if (!activeVehicleIds.has(vehicleId)) {
                shownRef.current.delete(key);
            }
        }
    }, [vehicles]);

    // Timer to auto-dismiss expired toasts
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            setToasts(prev => prev.filter(t => now - t.createdAt < TOAST_DURATION_MS));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="arrival-toasts">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="arrival-toast"
                    style={{ backgroundColor: toast.color }}
                >
                    <span className="toast-route">Route {toast.routeId}</span>
                    <span className="toast-separator"> — </span>
                    <span className="toast-status">
                        {toast.status === 'arrived' ? 'At' : 'Arriving at'} {toast.platformName}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default ArrivalToasts;
