import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Tryodo - Smartphone Marketplace',
        short_name: 'Tryodo',
        description: 'Your trusted marketplace for quality smartphones',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'fullscreen',
        scope: '/',
        start_url: '/',
        id: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icons/icon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'My Orders',
            url: '/my-orders',
            description: 'View your past orders'
          },
          {
            name: 'Cart',
            url: '/cart',
            description: 'View your shopping cart'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          },
          {
            urlPattern: ({ url }) => url.href.includes('/rest/v1/'),
            method: 'POST',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'supabase-post-queue',
                options: {
                  maxRetentionTime: 24 * 60 // 24 hours
                }
              }
            }
          },
          {
            urlPattern: ({ url }) => url.href.includes('/rest/v1/'),
            method: 'PATCH',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'supabase-patch-queue',
                options: {
                  maxRetentionTime: 24 * 60 // 24 hours
                }
              }
            }
          },
          {
            urlPattern: ({ url }) => url.href.includes('/rest/v1/'),
            method: 'DELETE',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'supabase-delete-queue',
                options: {
                  maxRetentionTime: 24 * 60 // 24 hours
                }
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'embla-carousel-react', 'embla-carousel', 'embla-carousel-reactive-utils']
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-alert-dialog'],
          supabase: ['@supabase/supabase-js'],
          lucide: ['lucide-react'],
          utils: ['clsx', 'tailwind-merge']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});
