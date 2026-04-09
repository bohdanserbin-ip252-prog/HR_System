import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true
            }
        }
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.js'
    }
});
