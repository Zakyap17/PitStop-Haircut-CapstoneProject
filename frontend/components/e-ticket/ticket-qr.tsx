import { useMemo } from 'react'
import { buildQrMatrix, QR_QUIET_ZONE } from '@/lib/qr'

/**
 * QR code berisi kode reservasi (contoh "PS-8259"). Kasir memindainya untuk mencari reservasi.
 * Digambar sebagai SVG dari matriks modul, bukan dari HTML mentah, dan memakai warna terang di sekelilingnya
 * (zona tenang) agar tetap terbaca di tema gelap.
 */
export function TicketQr({ value, size = 168 }: { value: string; size?: number }) {
  const matrix = useMemo(() => buildQrMatrix(value), [value])
  const count = matrix.length
  const total = count + QR_QUIET_ZONE * 2

  const path = useMemo(
    () =>
      matrix
        .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h1v1h-1z` : '')))
        .join(''),
    [matrix, count],
  )

  return (
    <svg
      role="img"
      aria-label={`QR code reservasi ${value}`}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-xl"
    >
      <rect width={total} height={total} fill="#f4f1ea" />
      <path d={path} fill="#091c33" />
    </svg>
  )
}
