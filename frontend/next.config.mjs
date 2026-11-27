/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hasil build yang ringkas untuk image Docker (frontend/Dockerfile): server.js mandiri tanpa node_modules penuh.
  output: 'standalone',
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
    // Web internal bisa dilayani backend terpisah (INTERNAL_BACKEND_URL). Kosong = backend yang sama dengan customer (mode dev "all").
    const internal = (process.env.INTERNAL_BACKEND_URL ?? backend).replace(/\/$/, '')
    // Urutan penting: /api/internal harus dicocokkan lebih dulu daripada /api/* umum.
    return [
      { source: '/api/internal/:path*', destination: `${internal}/api/internal/:path*` },
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
    ]
  },
}

export default nextConfig
