import React, { useEffect, useState, useRef, useCallback } from 'react';

const BODY_COLOR_PLACEHOLDER = '#ef52ef';
let svgCache: string | null = null;

interface BusIconProps {
    routeColor: string;
    routeLabel: string;
}

const BusIcon: React.FC<BusIconProps> = ({ routeColor, routeLabel }) => {
    const [svgLoaded, setSvgLoaded] = useState<boolean>(!!svgCache);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (svgCache) return;
        fetch('/assets/bus-icon.svg')
            .then(r => r.text())
            .then(text => {
                svgCache = text;
                setSvgLoaded(true);
            })
            .catch(() => {});
    }, []);

    // Use ref callback to safely inject our own local SVG asset with color swap.
    // This SVG is bundled in /public/assets/ — it is not untrusted external content.
    const injectSvg = useCallback(() => {
        if (!svgCache || !containerRef.current) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(
            svgCache.replace(new RegExp(BODY_COLOR_PLACEHOLDER, 'gi'), routeColor),
            'image/svg+xml'
        );
        const svg = doc.documentElement;
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        containerRef.current.replaceChildren(svg);
    }, [routeColor, svgLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        injectSvg();
    }, [injectSvg]);

    if (!svgLoaded) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: routeColor,
            }}>
                <span className="bus-route-number">{routeLabel}</span>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            <span className="bus-route-number">{routeLabel}</span>
        </div>
    );
};

export default BusIcon;
