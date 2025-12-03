import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/gtfs': {
                target: 'https://www.myridebarrie.ca/gtfs',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/gtfs/, ''),
            },
        },
    },
})
