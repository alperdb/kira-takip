import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent Turbopack from bundling native Node.js modules
  serverExternalPackages: ['pdfkit'],

  // Standalone mode: bundles Next.js + node_modules for Electron production
  output: 'standalone',

  // Disable "powered by Next.js" header
  poweredByHeader: false,

  // Remove X-Powered-By and other leaky headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options',        value: 'DENY'    },
      ],
    },
    {
      source: '/api/(.*)',
      headers: [
        { key: 'Content-Type', value: 'application/json; charset=utf-8' },
      ],
    },
  ],

  // Suppress the dev overlay "rendering..." indicator in production
  devIndicators: false,

  // Compiler tweaks
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
