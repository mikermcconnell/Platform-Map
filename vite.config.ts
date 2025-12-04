import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        legacy({
            targets: ['chrome >= 38', 'safari >= 11'],
            additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
            polyfills: ['es.promise', 'es.symbol', 'es.array.iterator', 'es.object.assign'],
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
