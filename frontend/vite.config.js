import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Returns true if the request looks like a browser page navigation
 * (i.e. the browser is asking for HTML, not an API call from axios/fetch).
 * In Vite's proxy bypass(), returning '/index.html' serves the SPA shell
 * so React Router can handle the route on the client side.
 */
function isBrowserNavigation(req) {
  const accept = req.headers['accept'] || ''
  return accept.includes('text/html')
}

export default defineConfig({
  plugins: [react()],

  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
  },

  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },

  server: {
    port: 5173,

    proxy: {
      // ── /classify — instant classification endpoint ─────────────────────────
      '/classify': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // Browser hard-refresh of /classify → serve index.html so React Router handles it
          if (isBrowserNavigation(req)) return '/index.html'
        },
      },

      // ── /auth/* — login, register, refresh, logout, me ─────────────────────
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // /auth has no clashing frontend route, no bypass needed
      },

      // ── /cases/* — API calls only, NOT browser navigations ─────────────────
      // React Router owns /cases and /cases/:id as frontend routes.
      // We only want axios API calls (Accept: application/json) to go to the backend.
      '/cases': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // Browser hard-refresh of /cases or /cases/:id → serve index.html
          if (isBrowserNavigation(req)) return '/index.html'
        },
      },

      // ── /admin/* — API calls only ───────────────────────────────────────────
      // React Router owns /admin/investigators as a frontend route.
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // Browser hard-refresh of /admin/* → serve index.html
          if (isBrowserNavigation(req)) return '/index.html'
        },
      },

      // ── /dashboard/stats — API only ─────────────────────────────────────────
      // Only the specific stats endpoint is proxied; /dashboard itself is React Router.
      '/dashboard': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // Browser hard-refresh of /dashboard → serve index.html
          if (isBrowserNavigation(req)) return '/index.html'
          // Non-stats API calls that hit /dashboard also go to React Router
          if (!req.url.startsWith('/dashboard/stats')) return '/index.html'
          // /dashboard/stats API calls fall through to be proxied to the backend
        },
      },

      // ── /storage/* — static files served by FastAPI ─────────────────────────
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },

      // ── /health — backend health check ──────────────────────────────────────
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
