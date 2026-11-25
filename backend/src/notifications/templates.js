/** Isi pesan WhatsApp. Semua teks yang dilihat pelanggan ada di sini. */

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** "2026-11-26" -> "Kamis, 26 Nov 2026" */
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${DAYS[weekday]}, ${day} ${MONTHS[month - 1]} ${year}`
}

/** Rupiah dengan titik ribuan: 50000 -> "Rp 50.000" */
function formatRupiah(value) {
  return `Rp ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

const when = (reservation) => `${formatDate(reservation.date)} · ${reservation.time.replace(':', '.')} WIB`

function footer(reservation, settings, webUrl) {
  const lines = []
  if (settings.shopAddress) lines.push(`Alamat: ${settings.shopAddress}`)
  if (settings.shopMapsUrl) lines.push(`Peta: ${settings.shopMapsUrl}`)
  if (webUrl) lines.push(`Cek, ubah, atau batalkan: ${webUrl.replace(/\/$/, '')}/cek-reservasi?kode=${reservation.code} (siapkan emailmu)`)
  return lines.join('\n')
}

const TEMPLATES = {
  /** Invoice: dikirim saat reservasi dibuat. */
  created: (r, s, webUrl) =>
    [
      `*INVOICE RESERVASI*`,
      s.shopName,
      '',
      `Kode: *${r.code}*`,
      `Atas nama: ${r.customerName}`,
      `Layanan: ${r.serviceName} (${r.durationMinutes} menit)`,
      `Jadwal: ${when(r)}`,
      `Kapster: ${r.barberName}`,
      ...(r.hairstyle ? [`Gaya pilihan: ${r.hairstyle}`] : []),
      '',
      `Total biaya: *${formatRupiah(r.price)}*`,
      '',
      `Tunjukkan kode ini ke kasir. Check-in maksimal 10 menit sebelum jadwal.`,
      '',
      footer(r, s, webUrl),
    ].join('\n'),

  rescheduled: (r, s, webUrl) =>
    [
      `*JADWAL DIUBAH*`,
      s.shopName,
      '',
      `Kode: *${r.code}* (tetap sama)`,
      `Jadwal baru: ${when(r)}`,
      `Kapster: ${r.barberName}`,
      `Layanan: ${r.serviceName}`,
      '',
      `Jadwal lama sudah dibatalkan dan slotnya dibuka kembali.`,
      '',
      footer(r, s, webUrl),
    ].join('\n'),

  cancelled: (r, s, webUrl) =>
    [
      `*RESERVASI DIBATALKAN*`,
      s.shopName,
      '',
      `Kode: *${r.code}*`,
      `Jadwal yang dibatalkan: ${when(r)}`,
      '',
      `Slotmu sudah dilepas. Mau datang lagi? Buat reservasi baru kapan saja${webUrl ? `: ${webUrl.replace(/\/$/, '')}/#reservasi` : '.'}`,
    ].join('\n'),

  reminder: (r, s, webUrl) =>
    [
      `*PENGINGAT RESERVASI*`,
      s.shopName,
      '',
      `Halo ${r.customerName}, jadwal potongmu sebentar lagi:`,
      `${when(r)} · Kapster ${r.barberName}`,
      `Kode: *${r.code}*`,
      '',
      `Check-in maksimal 10 menit sebelum jadwal. Kalau berhalangan hadir, mohon batalkan atau ubah jadwal lewat tautan di bawah agar slotnya bisa dipakai orang lain.`,
      '',
      footer(r, s, webUrl),
    ].join('\n'),
}

function buildMessage(kind, reservation, settings, webUrl) {
  const build = TEMPLATES[kind]
  if (!build) throw new Error(`Jenis pesan tidak dikenal: ${kind}`)
  return build(reservation, settings, webUrl)
}

module.exports = { buildMessage, formatDate, formatRupiah }
