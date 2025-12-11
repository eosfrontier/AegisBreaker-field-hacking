import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AegisBreaker App',
        short_name: 'AegisBreaker',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        start_url: '/',
        display: 'standalone',
        theme_color: '#000000',
        background_color: '#ffffff',
      },
      // Optionally, you can customize the service worker behavior
      workbox: {
        // e.g. globPatterns to cache certain static files
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
