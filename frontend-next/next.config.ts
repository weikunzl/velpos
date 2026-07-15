import type { NextConfig } from 'next'

const backendHost = process.env.BACKEND_HOST || 'localhost'
const backendPort = process.env.BACKEND_PORT || '8083'

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://${backendHost}:${backendPort}/api/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `ws://${backendHost}:${backendPort}/ws/:path*`,
      },
    ]
  },
}

export default nextConfig
