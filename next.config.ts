import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Docker 本番ビルド用（standalone モード）
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  serverExternalPackages: ['pg'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'media.valorant-api.com' },
    ],
  },
}

export default nextConfig
