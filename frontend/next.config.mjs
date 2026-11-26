/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mengizinkan akses server dev dari HP/perangkat lain lewat IP jaringan lokal (mode dev saja).
  // Tanpa ini Next 16 memblokir permintaan aset dev dari origin selain localhost.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '100.*.*.*', '*.local'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Try-on AI bisa memakan puluhan detik; batas bawaan proxy rewrite terlalu pendek dan memutus permintaannya.
  experimental: {
    proxyTimeout: 120_000,
  },
  // Browser memanggil /api/... di alamat web ini; Next meneruskannya ke backend (BACKEND_URL).
  // Alamat backend tidak terlihat di browser, tidak ada masalah CORS, dan tidak ada mixed-content saat web memakai HTTPS.
  async rewrites() {
    const backend = (process.env.BACKEND_URL ?? 'http://localhost:4000').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }]
  },
}

export default nextConfig
