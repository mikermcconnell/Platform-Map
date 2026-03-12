import React from 'react';

interface BusIconProps {
    routeId?: string;
    routeLabel: string;
}

const DEFAULT_ROUTE_ICON = '/assets/route-bus-icons/bus-icon-default.svg';

const ROUTE_ICON_MAP: Record<string, string> = {
    '2A': '/assets/route-bus-icons/bus-icon-2A.svg',
    '2B': '/assets/route-bus-icons/bus-icon-2B.svg',
    '7A': '/assets/route-bus-icons/bus-icon-7A.svg',
    '7B': '/assets/route-bus-icons/bus-icon-7B.svg',
    '8A': '/assets/route-bus-icons/bus-icon-8A.svg',
    '8B': '/assets/route-bus-icons/bus-icon-8B.svg',
    '10': '/assets/route-bus-icons/bus-icon-10.svg',
    '11': '/assets/route-bus-icons/bus-icon-11.svg',
    '12A': '/assets/route-bus-icons/bus-icon-12A.svg',
    '12B': '/assets/route-bus-icons/bus-icon-12B.svg',
    '100': '/assets/route-bus-icons/bus-icon-100.svg',
    '101': '/assets/route-bus-icons/bus-icon-101.svg',
    '400': '/assets/route-bus-icons/bus-icon-400.svg',
};

const BusIcon: React.FC<BusIconProps> = ({ routeId, routeLabel }) => {
    const iconSrc = routeId ? ROUTE_ICON_MAP[routeId] ?? DEFAULT_ROUTE_ICON : DEFAULT_ROUTE_ICON;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
                src={iconSrc}
                alt=""
                aria-hidden="true"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                }}
            />
            <div style={{
                position: 'absolute',
                top: '13%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '62%',
                padding: '5px 4px',
                color: '#ffffff',
                fontSize: routeLabel.length > 4 ? '17px' : '22px',
                fontWeight: 800,
                lineHeight: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.75)',
            }}>
                {routeLabel}
            </div>
        </div>
    );
};

export default BusIcon;
