import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const backendTarget = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'HR System',
                short_name: 'HR',
                start_url: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: '/icon-192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: '/icon-512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html}']
            }
        })
    ],
    server: {
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true
            }
        }
    },
    build: {
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return null;
                    if (id.includes('recharts')) return 'charts-vendor';
                    if (id.includes('react')) return 'react-vendor';
                    return 'vendor';
                }
            }
        }
    },
    test: {
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                url: 'http://localhost/'
            }
        },
        setupFiles: './src/test/setup.js'
    }
});
