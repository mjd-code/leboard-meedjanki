import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "VaultGraph - Knowledge Network",
        short_name: "VaultGraph",
        description: "A powerful knowledge graph and vault management system for organizing your notes and ideas. Works offline with automatic sync.",
        theme_color: "#7c3aed",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["productivity", "utilities", "education"],
        prefer_related_applications: false,
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "apple touch icon"
          }
        ],
        shortcuts: [
          {
            name: "Open Vault Dashboard",
            short_name: "Vaults",
            description: "Open the vault management dashboard",
            url: "/vaults",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
          }
        ],
        screenshots: [
          {
            src: "screenshot-wide.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "VaultGraph Desktop View"
          },
          {
            src: "screenshot-narrow.png",
            sizes: "720x1280",
            type: "image/png",
            form_factor: "narrow",
            label: "VaultGraph Mobile View"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,json,md}"],
        globIgnores: ["**/node_modules/three/**"],
        
        // Enable navigation preload for faster page loads
        navigationPreload: true,
        
        // Clean up outdated caches
        cleanupOutdatedCaches: true,
        
        // Maximum size for cache entries (10MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        
        runtimeCaching: [
          // App Shell - Cache First with Network Fallback
          {
            urlPattern: /^\/$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "app-shell",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 3
            }
          },
          
          // Pages and Routes - Network First with Cache Fallback
          {
            urlPattern: /^\/(?:vaults|install|404)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 3
            }
          },
          
          // Static Assets (JS, CSS) - Stale While Revalidate
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          
          // Images - Cache First with long expiration
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Google Fonts Stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Google Fonts Webfonts
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // External CDN Resources
          {
            urlPattern: /^https:\/\/cdn\..*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // API/Data requests - Network First with Cache Fallback
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Vault Data - Network First with longer cache
          {
            urlPattern: /\.md$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "vault-files",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              networkTimeoutSeconds: 3,
              plugins: [
                {
                  cacheWillUpdate: async ({ response }: any) => {
                    // Only cache successful responses
                    if (response && response.status === 200) {
                      return response;
                    }
                    return null;
                  }
                }
              ]
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Exclude problematic three.js webgpu imports during build
        return id.includes('three/webgpu');
      },
    },
  },
  optimizeDeps: {
    exclude: ['three/webgpu'],
  },
}));
