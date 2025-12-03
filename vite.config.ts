import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/gtfs': {
                target: 'https://www.myridebarrie.ca/gtfs/GTFS_VehiclePositions.pb',
                changeOrigin: true,
                ignorePath: true, // This ensures we just hit the target URL directly
            },
        },
    },
})
