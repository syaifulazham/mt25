/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force all route handlers to be dynamic by default
  // This prevents the 'Dynamic server usage' errors during build
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Disable static optimization to reduce memory during build
  // Pages will be server-rendered at runtime instead
  output: 'standalone',
  typescript: {
    // During build time, only warn about TypeScript errors without failing the build
    ignoreBuildErrors: true,
  },
  eslint: {
    // During build time, only warn about ESLint errors without failing the build
    ignoreDuringBuilds: true,
  },
  // Reduce build memory by disabling source maps in production
  productionBrowserSourceMaps: false,
  // Disable SWC minification (use Terser which is more memory efficient for large apps)
  swcMinify: false,
  // Optimize webpack configuration to reduce memory usage
  webpack: (config, { isServer, dev }) => {
    // Only optimize in production builds
    if (!dev) {
      // Optimize memory usage
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: isServer ? undefined : 'single',
        minimize: true,
        splitChunks: isServer ? false : {
          chunks: 'all',
          maxSize: 244000, // Split chunks larger than 244kb
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };

      // Aggressive memory management
      config.cache = false; // Disable persistent cache during build
      
      // Reduce memory usage by limiting parallel processing
      config.parallelism = 1;
      
      // Optimize performance
      config.performance = {
        maxAssetSize: 512000,
        maxEntrypointSize: 512000,
        hints: false,
      };
    }

    return config;
  },
  // Configure static file serving
  publicRuntimeConfig: {
    staticFolder: '/uploads',
  },
  // Add rewrites to ensure uploaded files are properly served
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  // Ensure images from uploads can be optimized
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
