/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent static generation of API routes that use headers, cookies, etc.
  output: 'standalone',
  
  // Force all API routes to be dynamic
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // This is the most important part - it marks all API routes as dynamic
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
        has: [
          {
            type: 'header',
            key: 'x-nextjs-data',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
