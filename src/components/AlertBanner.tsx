import React, { useState, useEffect, useRef } from 'react';
import { ServiceAlert, fetchServiceAlerts } from '../services/alerts';

const ROUTE_COLORS: Record<string, string> = {
    '2A': '#006837', '2B': '#006837',
    '7A': '#F58220', '7B': '#F58220',
    '8A': '#000000', '8B': '#000000',
    '10': '#662D91', '11': '#8DC63F',
    '12A': '#F49AC1', '12B': '#F49AC1',
    '100': '#BE1E2D', '101': '#2E3192',
    '400': '#00AEEF',
};

const ALERT_POLL_MS = 60000;
const ROTATE_MS = 10000;

const AlertBanner: React.FC = () => {
    const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const rotateRef = useRef<number | null>(null);

    useEffect(() => {
        const poll = () => {
            fetchServiceAlerts().then(setAlerts);
        };
        poll();
        const interval = setInterval(poll, ALERT_POLL_MS);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (alerts.length <= 1) {
            setActiveIndex(0);
            return;
        }
        rotateRef.current = window.setInterval(() => {
            setActiveIndex(prev => (prev + 1) % alerts.length);
        }, ROTATE_MS);
        return () => {
            if (rotateRef.current) clearInterval(rotateRef.current);
        };
    }, [alerts.length]);

    if (alerts.length === 0) return null;

    const alert = alerts[activeIndex % alerts.length];
    if (!alert) return null;

    const accentColor = alert.routeIds.length > 0
        ? (ROUTE_COLORS[alert.routeIds[0]] || '#0055A4')
        : '#0055A4';

    return (
        <div className="alert-banner">
            <div className="alert-accent" style={{ backgroundColor: accentColor }} />
            <div className="alert-content">
                <span className="alert-header">{alert.header}</span>
                {alert.description && (
                    <span className="alert-description"> — {alert.description}</span>
                )}
            </div>
            {alerts.length > 1 && (
                <div className="alert-counter">
                    {(activeIndex % alerts.length) + 1}/{alerts.length}
                </div>
            )}
        </div>
    );
};

export default AlertBanner;
