import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Service-worker global used by the admin navigation handler below (this
// config is type-checked without the WebWorker lib).
declare const caches: { match(url: string, options: { ignoreSearch: boolean }): Promise<Response | undefined> }

// Mirrors the vercel.json rewrites locally: /admin routes are served
// admin.html (the admin app's manifest) instead of the index.html fallback.
const adminHtmlFallback = (): Plugin => {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = req.url?.split('?')[0] ?? ''
    if (req.headers.accept?.includes('text/html') && /^\/admin(\/[^.]*)?$/.test(path)) req.url = '/admin.html'
    next()
  }
  return {
    name: 'admin-html-fallback',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    adminHtmlFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo/favicon.ico', 'logo/apple-touch-icon-180x180.png'],
      // The site installs as two apps: index.html links
      // public/portfolio.webmanifest and admin.html (served for /admin/*)
      // links public/admin.webmanifest, so the plugin must not inject one.
      manifest: false,
      workbox: {
        // Precache the app shell only; template images and the resume are
        // cached at runtime as they're requested.
        globPatterns: ['**/*.{js,css,html,woff2}', 'logo/*.{png,ico}'],
        globIgnores: ['assets/js/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // API calls must always hit the network, never the SPA fallback, and
        // admin navigations get admin.html (handled below), not index.html.
        navigateFallbackDenylist: [/^\/api\//, /^\/admin(\/|$)/],
        runtimeCaching: [
          {
            urlPattern: ({ request, url, sameOrigin }) =>
              sameOrigin && request.mode === 'navigate' && /^\/admin(\/|$)/.test(url.pathname),
            // Same shell-first behaviour as the index.html fallback, but with
            // the admin page (precached with a revision query, hence ignoreSearch).
            handler: async ({ request }) =>
              (await caches.match('/admin.html', { ignoreSearch: true })) ?? fetch(request),
          },
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
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
    },
  },
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
