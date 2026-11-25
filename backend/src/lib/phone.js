/**
 * Nomor WhatsApp Indonesia. Diterima: 0812..., +62812..., 62812..., 812... (spasi, strip, dan titik diabaikan).
 * Hasilnya format internasional tanpa "+" (6281234567890), atau null kalau bukan nomor seluler Indonesia yang masuk akal.
 */
function normalizePhone(input) {
  let digits = String(input ?? '').replace(/[^\d]/g, '')
  if (digits.startsWith('62')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  // Nomor seluler Indonesia diawali 8 dan panjangnya 9 sampai 12 digit setelah kode negara.
  if (!/^8\d{8,11}$/.test(digits)) return null
  return `62${digits}`
}

/** "6281234567890" -> "0812••••890" untuk ditampilkan tanpa membuka seluruh nomor. */
function maskPhone(normalized) {
  if (!normalized) return null
  const local = `0${normalized.slice(2)}`
  return `${local.slice(0, 4)}••••${local.slice(-3)}`
}

module.exports = { normalizePhone, maskPhone }
