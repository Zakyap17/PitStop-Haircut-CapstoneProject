/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tidak memberi tahu pengunjung bahwa situs ini memakai Next.js (membantu penyerang memilih celah yang cocok).
  poweredByHeader: false,
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
  // Header keamanan untuk semua halaman.
  //  - frame-ancestors / X-Frame-Options: situs lain tidak boleh menampilkan Pit Stop di dalam iframe (clickjacking pada halaman login).
  //  - nosniff, Referrer-Policy: browser tidak menebak tipe berkas, dan alamat lengkap tidak bocor ke situs lain.
  //  - Permissions-Policy: kamera hanya untuk situs ini (fitur try-on), sensor lain dimatikan.
  //  - HSTS: setelah diakses lewat HTTPS, browser menolak kembali ke HTTP (diabaikan di http://localhost).
  //  CSP sengaja hanya memuat arahan yang tidak merusak skrip bawaan Next.js (script-src butuh nonce tersendiri).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
        ],
      },
    ]
  },
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
