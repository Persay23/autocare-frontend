import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon_io/favicon.ico', 'favicon_io/apple-touch-icon.png'],
      manifest: {
        name: 'AutoCare — Vehicle Maintenance',
        short_name: 'AutoCare',
        description: 'Track vehicle maintenance, costs, and AI-powered service predictions.',
        theme_color: '#07080f',
        background_color: '#07080f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon_io/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon_io/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'favicon_io/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The API lives on a different origin in production; never let the SW serve the SPA shell for it.
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      // Service worker stays OFF in dev (avoids stale-asset caching during `npm run dev`).
      // Test the PWA with `npm run build && npm run preview`. Flip to true to debug the SW in dev.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'app'),
    },
  },
})
