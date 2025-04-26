/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent static generation of API routes that use headers, cookies, etc.
  output: 'standalone',
  
  experimental: {
    // This prevents Next.js from statically generating API routes
    // that use dynamic server features like headers(), cookies(), etc.
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

module.exports = nextConfig;
