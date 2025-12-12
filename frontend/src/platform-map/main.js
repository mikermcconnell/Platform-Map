/**
 * Platform Map TV - Vanilla JS for LG TV Compatibility
 * 
 * Key constraints for LG TV (Chrome 38-era WebKit):
 * - NO arrow functions (use function())
 * - NO const/let (use var)
 * - NO async/await (use .then())
 * - NO template literals (use string concatenation)
 * - NO destructuring, spread, etc.
 * 
 * This file will be transpiled by Babel to ES5, but we write it
 * in a compatible style to minimize transformation issues.
 */

(function () {
    'use strict';

    // =====================================================
    // Status Display (for debugging on TV)
    // =====================================================
    var statusBox = document.createElement('div');
    statusBox.className = 'status-box';
    statusBox.innerHTML = 'Initializing...';
    document.body.appendChild(statusBox);

    function setStatus(msg, color) {
        statusBox.innerHTML = msg;
        statusBox.style.color = color || 'white';
    }

    function log(msg) {
        console.log('[PlatformMap] ' + msg);
        var debugConsole = document.getElementById('debug-console');
        if (debugConsole) {
            var line = document.createElement('div');
            line.textContent = new Date().toLocaleTimeString() + ' - ' + msg;
            debugConsole.appendChild(line);
            // Keep only last 20 lines
            while (debugConsole.childNodes.length > 20) {
                debugConsole.removeChild(debugConsole.firstChild);
            }
            debugConsole.scrollTop = debugConsole.scrollHeight;
        }
    }

    // =====================================================
    // Route Colors (matching original React app)
    // =====================================================
    var ROUTE_COLORS = {
        '2A': '#006837', '2B': '#006837',
        '7A': '#F58220', '7B': '#F58220',
        '8A': '#000000', '8B': '#000000',
        '10': '#662D91',
        '11': '#8DC63F',
        '12A': '#F49AC1', '12B': '#F49AC1',
        '100': '#BE1E2D',
        '101': '#2E3192',
        '400': '#00AEEF'
    };
    var DEFAULT_COLOR = '#0055A4';

    // =====================================================
    // Calibration Data (GPS to Screen %)
    // =====================================================
    var CALIBRATION_DATA = [
        { lat: 44.373837, lon: -79.689279, x: 54.18848167539267, y: 55.32381997804611 },  // Platform 3
        { lat: 44.374232, lon: -79.689392, x: 47.748691099476446, y: 37.43139407244786 }, // Platform 7
        { lat: 44.374245, lon: -79.689674, x: 43.97905759162304, y: 38.090010976948406 }, // Platform 6
        { lat: 44.374171, lon: -79.690445, x: 33.089005235602095, y: 43.02963776070253 }, // Platform 12
        { lat: 44.373515, lon: -79.691137, x: 23.24607329842932, y: 82.87596048298573 }   // Platform 14
    ];

    // =====================================================
    // Affine Transformation (Least Squares Solver)
    // =====================================================
    function solveAffine(points) {
        if (points.length < 3) return null;

        var n = points.length;
        var i, p, u, v, dx, dy;

        // Calculate centroids
        var sumLon = 0, sumLat = 0, sumX = 0, sumY = 0;
        for (i = 0; i < n; i++) {
            sumLon += points[i].lon;
            sumLat += points[i].lat;
            sumX += points[i].x;
            sumY += points[i].y;
        }
        var meanLon = sumLon / n;
        var meanLat = sumLat / n;
        var meanX = sumX / n;
        var meanY = sumY / n;

        // Accumulate sums using centered coordinates
        var sumU2 = 0, sumV2 = 0, sumUV = 0;
        var sumUX = 0, sumVX = 0, sumUY = 0, sumVY = 0;

        for (i = 0; i < n; i++) {
            p = points[i];
            u = p.lon - meanLon;
            v = p.lat - meanLat;
            dx = p.x - meanX;
            dy = p.y - meanY;

            sumU2 += u * u;
            sumV2 += v * v;
            sumUV += u * v;

            sumUX += u * dx;
            sumVX += v * dx;
            sumUY += u * dy;
            sumVY += v * dy;
        }

        // Solve 2x2 linear system
        var det = sumU2 * sumV2 - sumUV * sumUV;
        if (Math.abs(det) < 1e-20) {
            log('ERROR: Singular matrix in affine solver');
            return null;
        }

        var A = (sumV2 * sumUX - sumUV * sumVX) / det;
        var B = (sumU2 * sumVX - sumUV * sumUX) / det;
        var D = (sumV2 * sumUY - sumUV * sumVY) / det;
        var E = (sumU2 * sumVY - sumUV * sumUY) / det;

        // Calculate translation
        var C = meanX - A * meanLon - B * meanLat;
        var F = meanY - D * meanLon - E * meanLat;

        return { A: A, B: B, C: C, D: D, E: E, F: F };
    }

    // Pre-compute affine matrix
    var affineMatrix = solveAffine(CALIBRATION_DATA);
    if (affineMatrix) {
        log('Affine matrix computed successfully');
    } else {
        log('ERROR: Failed to compute affine matrix');
    }

    // =====================================================
    // GPS to Screen Position Conversion
    // =====================================================
    function getPixelPosition(lat, lon) {
        if (!affineMatrix) {
            return { left: '-100px', top: '-100px' };
        }
        var x = affineMatrix.A * lon + affineMatrix.B * lat + affineMatrix.C;
        var y = affineMatrix.D * lon + affineMatrix.E * lat + affineMatrix.F;
        return { left: x + '%', top: y + '%' };
    }

    // =====================================================
    // Map Update (DOM Manipulation)
    // =====================================================
    function updateMap(vehicles) {
        var layer = document.getElementById('bus-layer');
        if (!layer) {
            log('ERROR: bus-layer element not found');
            return;
        }

        // Clear existing markers
        layer.innerHTML = '';

        for (var i = 0; i < vehicles.length; i++) {
            var v = vehicles[i];
            var pos = getPixelPosition(v.lat, v.lon);
            var routeId = v.route_id || '';
            var color = ROUTE_COLORS[routeId] || DEFAULT_COLOR;

            // Direction text for Route 8
            var displayRouteId = routeId;
            if (routeId === '8A' || routeId === '8B') {
                if (v.direction_id === 0) {
                    displayRouteId = displayRouteId + ' NB';
                } else if (v.direction_id === 1) {
                    displayRouteId = displayRouteId + ' SB';
                }
            }

            // Create marker element
            var marker = document.createElement('div');
            marker.className = 'bus-marker';
            marker.style.left = pos.left;
            marker.style.top = pos.top;

            // Build inner HTML
            var html = '<div class="bus-icon-wrapper" style="border-color: ' + color + ';">';
            html += '<img src="./assets/bus_icon.jpg" class="bus-icon-image" alt="Bus">';
            html += '</div>';

            if (routeId) {
                html += '<div class="bus-label" style="background-color: ' + color + ';">';
                html += displayRouteId;
                html += '</div>';
            }

            marker.innerHTML = html;
            layer.appendChild(marker);
        }

        setStatus('Showing ' + vehicles.length + ' buses', 'lime');
        log('Rendered ' + vehicles.length + ' vehicles');
    }

    // =====================================================
    // Data Fetching (using .then() syntax for compatibility)
    // =====================================================
    var fetchCount = 0;
    var lastError = null;

    function doFetch() {
        fetchCount++;
        setStatus('Fetching... (#' + fetchCount + ')', 'yellow');
        log('Fetch #' + fetchCount + ' started');

        // Use cache-busting query param
        var url = '/api/vehicles?cb=' + Date.now();

        fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                lastError = null;
                var vehicles = data.vehicles || [];
                log('Received ' + vehicles.length + ' vehicles');
                updateMap(vehicles);
            })
            .catch(function (err) {
                lastError = err.message || 'Unknown error';
                setStatus('Error: ' + lastError, 'red');
                log('Fetch error: ' + lastError);
            });
    }

    // =====================================================
    // Initialization
    // =====================================================
    function init() {
        log('Platform Map TV initializing...');
        log('Viewport: ' + window.innerWidth + 'x' + window.innerHeight);
        log('User Agent: ' + navigator.userAgent.substring(0, 50) + '...');

        // Verify map image loads (handle race condition if already loaded)
        var mapImage = document.getElementById('map-image');
        if (mapImage) {
            if (mapImage.complete && mapImage.naturalWidth > 0) {
                log('Map image already loaded');
            } else if (mapImage.complete && mapImage.naturalWidth === 0) {
                log('ERROR: Map image failed to load');
                setStatus('Map image error', 'red');
            } else {
                mapImage.onload = function () {
                    log('Map image loaded');
                };
                mapImage.onerror = function () {
                    log('ERROR: Map image failed to load');
                    setStatus('Map image error', 'red');
                };
            }
        }

        // Start fetching data
        try {
            doFetch();
            setInterval(doFetch, 10000); // Poll every 10 seconds
            log('Polling started (10s interval)');
        } catch (e) {
            log('FATAL: ' + e.message);
            setStatus('Init error: ' + e.message, 'red');
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
