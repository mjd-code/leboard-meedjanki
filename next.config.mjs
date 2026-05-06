import withSerwistInit from "@serwist/next";
import path from "node:path";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['ais-dev-m2nfs5niqim3txwsi7am36-174887710382.asia-southeast1.run.app'],
  reactStrictMode: true,
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
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default withSerwist(nextConfig);
