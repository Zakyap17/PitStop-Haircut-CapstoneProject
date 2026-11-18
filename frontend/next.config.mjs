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
}

export default nextConfig
