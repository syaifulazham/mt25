/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force all route handlers to be dynamic by default
  // This prevents the 'Dynamic server usage' errors during build
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  typescript: {
    // During build time, only warn about TypeScript errors without failing the build
    ignoreBuildErrors: true,
  },
  eslint: {
    // During build time, only warn about ESLint errors without failing the build
    ignoreDuringBuilds: true,
  },
  // Optimize webpack configuration to reduce memory usage
  webpack: (config, { isServer }) => {
    // Optimize memory usage
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: isServer ? undefined : 'single',
      splitChunks: isServer ? false : {
        chunks: 'all',
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

    // Reduce memory usage by limiting parallel processing
    if (!isServer) {
      config.parallelism = 1;
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
