import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo/favicon.ico', 'logo/apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Girish Creations',
        short_name: 'Girish Creations',
        description:
          'Girish Creations — a portfolio platform where people showcase their work, experience and projects.',
        theme_color: '#070820',
        background_color: '#070820',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/logo/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/logo/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell only; template images and the resume are
        // cached at runtime as they're requested.
        globPatterns: ['**/*.{js,css,html,woff2}', 'logo/*.{png,ico}'],
        globIgnores: ['assets/js/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // API calls must always hit the network, never the SPA fallback.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
          {
            urlPattern: ({ request, url, sameOrigin }) =>
              sameOrigin && (request.destination === 'image' || url.pathname.endsWith('.pdf')),
            handler: 'CacheFirst',
            options: { cacheName: 'static-media', expiration: { maxEntries: 150, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // Only imported by lazily-loaded admin routes, so Vite wouldn't discover
    // them at startup — it would re-bundle mid-session on first visit, and
    // the stale module URLs then fail with "504 Outdated Optimize Dep".
    include: [
      'sweetalert2',
      'react-select',
      'react-select/creatable',
      'react-data-table-component',
      'react-loading-skeleton',
      'xlsx',
      'jspdf',
      'dom-to-image-more',
    ],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
