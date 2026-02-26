import React, { useEffect, useState, useRef, useCallback } from 'react';

const BODY_COLOR_PLACEHOLDER = '#ef52ef';
const SVG_NS = 'http://www.w3.org/2000/svg';
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

    // Inject SVG with route color swap only.
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

        // Add route number text in the top shield area (above the bus)
        const text = doc.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', '218');
        text.setAttribute('y', '145');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-size', routeLabel.length > 3 ? '80' : '100');
        text.textContent = routeLabel;
        svg.appendChild(text);

        containerRef.current.replaceChildren(svg);
    }, [routeColor, routeLabel, svgLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
            }} />
        );
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    );
};

export default BusIcon;
