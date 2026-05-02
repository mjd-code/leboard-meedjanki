import withSerwistInit from "@serwist/next";
import path from "node:path";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

// Bridge legacy VITE_* env vars to NEXT_PUBLIC_* so the browser bundle
// receives them. The .env file is auto-managed by Lovable Cloud and uses
// VITE_ names; Next.js only exposes NEXT_PUBLIC_* to the client.
const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPA_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const SUPA_PID =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID ??
  process.env.VITE_SUPABASE_PROJECT_ID ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: SUPA_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SUPA_KEY,
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: SUPA_PID,
  },
  // Phase 3: Production hardening
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Phase 1: Pin workspace root so Next stops warning about additional lockfiles
  outputFileTracingRoot: path.join(process.cwd()),
  // Phase 2: Turbopack configuration (replaces legacy webpack() block).
  // No custom loaders/aliases were defined previously, so this is a clean
  // baseline that satisfies Next 16's Turbopack validator.
  turbopack: {
    root: path.join(process.cwd()),
    rules: {
      // Example slot for future loaders, e.g. SVGR:
      // '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' },
    },
    resolveAlias: {
      '@': './src',
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }
    ],
  },
  typescript: { ignoreBuildErrors: false },
};

export default withSerwist(nextConfig);
