import React, { useEffect, useState, useRef, useCallback } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';
let svgCache: string | null = null;
let svgLoadPromise: Promise<string> | null = null;
let svgLoadFailed = false;

interface BusIconProps {
    routeColor: string;
    routeLabel: string;
}

function replaceChildrenCompat(container: HTMLElement, child: Node) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(child);
}

function forEachNode<T extends Element>(nodes: NodeListOf<T>, callback: (node: T) => void) {
    for (let index = 0; index < nodes.length; index += 1) {
        callback(nodes[index]);
    }
}

const BusIcon: React.FC<BusIconProps> = ({ routeColor, routeLabel }) => {
    const [svgLoaded, setSvgLoaded] = useState<boolean>(!!svgCache);
    const [svgUnsupported, setSvgUnsupported] = useState(svgLoadFailed);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (svgCache) {
            setSvgLoaded(true);
            return;
        }

        if (svgLoadFailed) {
            setSvgUnsupported(true);
            return;
        }

        if (!svgLoadPromise) {
            svgLoadPromise = fetch('/assets/bus-icon.svg')
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Failed to load bus icon: ${response.status}`);
                    }
                    return response.text();
                })
                .then((text) => {
                    svgCache = text;
                    return text;
                })
                .catch((error) => {
                    svgLoadFailed = true;
                    svgLoadPromise = null;
                    throw error;
                });
        }

        let cancelled = false;

        svgLoadPromise
            .then(() => {
                if (cancelled) return;
                setSvgLoaded(true);
            })
            .catch((error) => {
                if (cancelled) return;
                console.warn('Falling back to raster bus icon.', error);
                setSvgUnsupported(true);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Inject SVG with route color swap only.
    // This SVG is bundled in /public/assets/ — it is not untrusted external content.
    const injectSvg = useCallback(() => {
        if (svgUnsupported || !svgCache || !containerRef.current || typeof DOMParser === 'undefined') {
            return;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgCache, 'image/svg+xml');
            const svg = doc.documentElement;
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');

            // Old LG WebKit builds do not support NodeList.forEach or replaceChildren.
            forEachNode(svg.querySelectorAll('.st21'), (el) => {
                (el as SVGElement).style.fill = routeColor;
            });

            // Add route number text in the top shield area (above the bus)
            const text = doc.createElementNS(SVG_NS, 'text');
            text.setAttribute('x', '218');
            text.setAttribute('y', '145');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('font-size', routeLabel.length > 3 ? '120' : '150');
            text.textContent = routeLabel;
            svg.appendChild(text);

            replaceChildrenCompat(containerRef.current, svg);
        } catch (error) {
            svgLoadFailed = true;
            console.warn('Falling back to raster bus icon.', error);
            setSvgUnsupported(true);
        }
    }, [routeColor, routeLabel, svgUnsupported]);

    useEffect(() => {
        injectSvg();
    }, [injectSvg]);

    if (!svgLoaded || svgUnsupported) {
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <img
                    src="/assets/Bus_Icon.jpeg"
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
                    top: '16%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    minWidth: '46%',
                    maxWidth: '78%',
                    padding: '5px 10px',
                    borderRadius: '999px',
                    backgroundColor: routeColor,
                    color: '#ffffff',
                    fontSize: routeLabel.length > 4 ? '18px' : '22px',
                    fontWeight: 700,
                    lineHeight: 1,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                }}>
                    {routeLabel}
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    );
};

export default BusIcon;
