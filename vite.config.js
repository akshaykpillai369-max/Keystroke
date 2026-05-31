import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Keystroke/',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    VitePWA({
      injectRegister: 'none',
      includeAssets: ['icons/*.svg', 'icons/*.png', 'logo.png', 'favicon-32.png'],
      manifest: {
        name: 'Keystroke',
        short_name: 'Keystroke',
        description: 'Fast, private, offline notes.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      selfDestroying: true,
    }),
  ],
});
