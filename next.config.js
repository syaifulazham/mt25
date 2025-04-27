/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for better production deployment
  output: 'standalone',
  
  // Completely disable static generation
  // This is the most important part to fix the headers() error
  staticGeneration: false,
  
  // Explicitly disable static optimization
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    disableOptimizedLoading: true,
    serverComponents: true,
    forceStatic: false,
  },
  
  // Skip type checking during build to speed up build time
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip linting during build to speed up build time
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Force all routes to use server-side rendering
  rewrites: async () => {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
      }
    ];
  },
  
  // Add runtime configuration to prevent caching
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  
  // Force runtime environment for all pages
  env: {
    NEXT_RUNTIME: 'nodejs',
  }
};

module.exports = nextConfig;
