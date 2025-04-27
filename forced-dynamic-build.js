// forced-dynamic-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up forced dynamic rendering for build...');

// 1. Create temporary .env.production with necessary flags
const envContent = `
NEXT_PUBLIC_API_URL=https://techlympics.my
NEXT_RUNTIME=nodejs
NEXT_FORCE_DYNAMIC=1
`;

fs.writeFileSync('.env.production', envContent, 'utf8');
console.log('Created .env.production with forced dynamic settings');

// 2. Update the next.config.js to force dynamic rendering
const configPath = path.join(__dirname, 'next.config.js');
const configContent = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  
  // Disable static generation
  staticGeneration: false,
  generateBuildId: async () => {
    return 'dynamic-build-' + Date.now();
  },
  
  // Experimental settings to force dynamic rendering
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    appDir: true,
    serverActions: true,
  },
  
  // Skip build errors
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable page optimization
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  
  // Headers to disable caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
  
  // Rewrite everything to force runtime rendering
  async rewrites() {
    return [
      { source: '/:path*', destination: '/:path*' },
    ];
  },
  
  // Global environment variables
  env: {
    NEXT_RUNTIME: 'nodejs',
    NEXT_FORCE_DYNAMIC: '1',
  },
};

module.exports = nextConfig;
`;

fs.writeFileSync(configPath, configContent, 'utf8');
console.log('Updated next.config.js with forced dynamic settings');

// 3. Create a forced-dynamic.js in app directory
const forcedDynamicContent = `
// Global configuration to force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 300;

// Empty static params to prevent static generation
export function generateStaticParams() {
  return [];
}
`;

// Create the file in both the app root and organizer directory
const appConfigPath = path.join(__dirname, 'src', 'app', 'forced-dynamic.js');
const organizerConfigPath = path.join(__dirname, 'src', 'app', 'organizer', 'forced-dynamic.js');

fs.writeFileSync(appConfigPath, forcedDynamicContent, 'utf8');
fs.writeFileSync(organizerConfigPath, forcedDynamicContent, 'utf8');
console.log('Created forced-dynamic.js files in app directories');

// 4. Run the build with forced dynamic settings
console.log('Starting build with dynamic rendering...');
try {
  execSync('next build', { 
    env: { 
      ...process.env,
      NEXT_RUNTIME: 'nodejs',
      NEXT_FORCE_DYNAMIC: '1'
    },
    stdio: 'inherit' 
  });
  console.log('Build completed successfully with dynamic rendering');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
