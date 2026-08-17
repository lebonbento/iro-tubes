import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone-192.png', 'icone-512.png', 'icone-maskable.png', 'favicon.svg'],
      manifest: {
        name: 'IRO 色 — casse-tête de couleurs',
        short_name: 'IRO',
        description: 'Videz les tubes les uns dans les autres jusqu’à ce que chaque tube n’ait plus qu’une couleur.',
        lang: 'fr',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // SANS CETTE LIGNE, le service worker répond la page HTML à la place du
        // JSON sur /api/… : le classement casse en silence, et seulement une
        // fois l'app installée. Piège déjà payé sur HEBI.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
