import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    try {
        const gtfsUrl = 'https://www.myridebarrie.ca/gtfs/GTFS_VehiclePositions.pb';

        const axiosResponse = await axios.get(gtfsUrl, {
            responseType: 'arraybuffer',
        });

        // Set CORS headers
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        response.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );

        // Handle OPTIONS request
        if (request.method === 'OPTIONS') {
            response.status(200).end();
            return;
        }

        // Return the binary data
        response.setHeader('Content-Type', 'application/x-google-protobuf');
        response.send(axiosResponse.data);
    } catch (error) {
        console.error('Error fetching GTFS data:', error);
        response.status(500).json({ error: 'Failed to fetch GTFS data' });
    }
}
