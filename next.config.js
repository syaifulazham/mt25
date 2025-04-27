/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for better production deployment
  output: 'standalone',
  
  // Supported experimental options for Next.js 14.1.0
  experimental: {
    // Support for external packages in server components
    serverComponentsExternalPackages: ['@prisma/client'],
    // Disable optimized loading for compatibility
    disableOptimizedLoading: true,
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
  }
};

module.exports = nextConfig;
