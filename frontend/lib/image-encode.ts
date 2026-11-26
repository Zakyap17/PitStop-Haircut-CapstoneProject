/** Gambar siap kirim ke backend: tipe dan isi base64 (tanpa awalan "data:"). */
export type EncodedImage = { mimeType: string; base64: string }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gambar tidak bisa dibaca'))
    image.src = src
  })
}

/**
 * Memperkecil gambar (sisi terpanjang maksimal `maxSide` px) dan mengubahnya ke JPEG, supaya yang dikirim ke AI
 * hanya sekitar 100 sampai 500 KB. Foto HP 4000 px langsung dikirim akan lambat dan boros kuota.
 * `src` boleh object URL (foto pengguna) atau path gambar di folder public.
 */
export async function encodeImage(src: string, maxSide: number, quality = 0.88): Promise<EncodedImage> {
  const image = await loadImage(src)
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')
  // Latar putih untuk gambar PNG transparan, karena JPEG tidak punya transparansi.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { mimeType: 'image/jpeg', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}
