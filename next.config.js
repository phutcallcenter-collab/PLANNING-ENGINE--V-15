/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removido: output: 'export',
  reactStrictMode: true,
  
  // Ignorar warnings de ESLint que bloquean build en Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },

  // IMPORTANTE para PWA
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
