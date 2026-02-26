/**
 * Vercel Serverless Function: /api/alerts
 * Fetches GTFS Realtime ServiceAlerts Protobuf, decodes server-side, returns JSON
 */

const fetch = require('node-fetch');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const GTFS_RT_ALERTS_URL = 'https://www.myridebarrie.ca/gtfs/GTFS_ServiceAlerts.pb';

const ALLOWED_ORIGINS = [
    'https://platform-map.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

module.exports = async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=30');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const response = await fetch(GTFS_RT_ALERTS_URL, { timeout: 10000 });

        if (!response.ok) {
            throw new Error('GTFS-RT alerts fetch failed: ' + response.status);
        }

        const buffer = await response.buffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

        const alerts = [];
        const entities = feed.entity || [];

        entities.forEach(function (ent) {
            if (!ent.alert) return;

            const a = ent.alert;
            const routeIds = [];

            if (a.informedEntity) {
                a.informedEntity.forEach(function (ie) {
                    if (ie.routeId) routeIds.push(ie.routeId);
                });
            }

            var headerText = '';
            var descriptionText = '';

            if (a.headerText && a.headerText.translation) {
                var en = a.headerText.translation.find(function (t) { return t.language === 'en'; });
                headerText = (en && en.text) || (a.headerText.translation[0] && a.headerText.translation[0].text) || '';
            }

            if (a.descriptionText && a.descriptionText.translation) {
                var en2 = a.descriptionText.translation.find(function (t) { return t.language === 'en'; });
                descriptionText = (en2 && en2.text) || (a.descriptionText.translation[0] && a.descriptionText.translation[0].text) || '';
            }

            alerts.push({
                id: ent.id,
                header: headerText,
                description: descriptionText,
                route_ids: routeIds,
                cause: a.cause || null,
                effect: a.effect || null,
            });
        });

        res.status(200).json({
            generated_at: Date.now(),
            alerts: alerts,
        });
    } catch (error) {
        var errorMessage = error.message || 'Unknown error';
        console.error('[gtfs-rt-alerts] Fetch failed:', errorMessage);

        res.status(502).json({
            generated_at: Date.now(),
            alerts: [],
            error: 'Failed to fetch alert data',
        });
    }
};
