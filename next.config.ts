import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized body size (reduced from 100mb for better memory management)
  experimental: {
    proxyClientMaxBodySize: '50mb',
  },
  
  // Build optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  productionBrowserSourceMaps: false, // Reduce bundle size in production
  
  // Turbopack configuration (required when using webpack config)
  turbopack: {},
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  
  // Lazy compilation & optimization
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              filename: 'chunks/vendor.js',
              test: /node_modules/,
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Common chunk
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              filename: 'chunks/common.js',
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
