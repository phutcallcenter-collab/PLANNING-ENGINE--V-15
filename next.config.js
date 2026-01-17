/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,

  // IMPORTANTE para PWA
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
