import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        legacy({
            targets: ['chrome >= 58', 'safari >= 11'],
        }),
    ],
    server: {
        proxy: {
            '/api/gtfs': {
                target: 'https://www.myridebarrie.ca',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/gtfs/, '/gtfs/GTFS_VehiclePositions.pb'),
            },
        },
    },
})
