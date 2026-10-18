import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
