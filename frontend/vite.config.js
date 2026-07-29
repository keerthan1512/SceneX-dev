import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Returns true if the request looks like a browser page navigation
 * (i.e. the browser is asking for HTML, not an API call from axios/fetch).
 * We let these fall through to historyApiFallback → index.html.
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

    // Serve index.html for any path that doesn't match a real file —
    // this is what makes React Router work on hard refresh / direct URL entry.
    historyApiFallback: true,

    proxy: {
      // ── /classify — instant classification endpoint ─────────────────────────
      '/classify': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          if (isBrowserNavigation(req)) return req.url
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
          if (isBrowserNavigation(req)) return req.url  // serve index.html
        },
      },

      // ── /admin/* — API calls only ───────────────────────────────────────────
      // React Router owns /admin/investigators as a frontend route.
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          if (isBrowserNavigation(req)) return req.url  // serve index.html
        },
      },

      // ── /dashboard/stats — API only ─────────────────────────────────────────
      // Only the specific stats endpoint is proxied; /dashboard itself is React Router.
      '/dashboard': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // Only proxy /dashboard/stats — let /dashboard fall through to React Router
          if (isBrowserNavigation(req)) return req.url
          if (!req.url.startsWith('/dashboard/stats')) return req.url
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
