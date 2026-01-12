/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Disable ESLint during production builds (Cloud Build)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript checks during production builds (Cloud Build)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Experimental features for better Cloud Run compatibility
  experimental: {
    // Force dynamic rendering to avoid static generation issues
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/esbuild-linux-64/bin',
      ],
    },
  },
  // Skip static generation during build
  skipTrailingSlashRedirect: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
  },
}

module.exports = nextConfig
