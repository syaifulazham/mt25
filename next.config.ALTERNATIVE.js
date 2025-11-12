/** @type {import('next').NextConfig} */
// ALTERNATIVE CONFIG: Use this if SWC minification still causes memory issues
// To use: cp next.config.ALTERNATIVE.js next.config.js

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: false,
  
  // DISABLE MINIFICATION - Fastest build, larger bundle size
  swcMinify: false,
  
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      // Disable all minification to reduce memory
      config.optimization = {
        ...config.optimization,
        minimize: false, // <-- KEY: Disable minification
        moduleIds: 'deterministic',
        runtimeChunk: isServer ? undefined : 'single',
        splitChunks: isServer ? false : {
          chunks: 'all',
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
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

      config.cache = false;
      config.parallelism = 1;
      
      config.performance = {
        maxAssetSize: 1024000, // Increased since no minification
        maxEntrypointSize: 1024000,
        hints: false,
      };
    }

    return config;
  },
  
  publicRuntimeConfig: {
    staticFolder: '/uploads',
  },
  
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  
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
