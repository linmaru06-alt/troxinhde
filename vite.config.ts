import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Trọ Xinh - Nền Tảng Tìm Trọ An Tâm tại Hà Nội',
        short_name: 'Trọ Xinh',
        description: 'Tìm phòng trọ sinh viên đã kiểm duyệt 100% tại Hà Nội',
        theme_color: '#006d37',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=192&h=192&fit=crop',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=512&h=512&fit=crop',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase\.co\/rest/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/.*tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 7 },
            },
          },
        ],
      },
    }),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'zustand', 'react-helmet-async'],
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'clsx', 'tailwind-merge'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'cloudinary-vendor': ['@cloudinary/react', '@cloudinary/url-gen'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
