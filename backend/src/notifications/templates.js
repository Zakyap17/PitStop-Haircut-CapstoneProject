/**
 * Isi pesan WhatsApp. Semua teks yang dilihat pelanggan ada di sini.
 * Istilah mengikuti use case diagram: BUKTI BOOKING dikirim setelah DP dibayar, INVOICE setelah pelunasan.
 */

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

/** Waktu ISO -> "26 Nov 10.30 WIB" di zona waktu toko. */
function formatDeadline(iso, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const get = (type) => parts.find((part) => part.type === type).value
  return `${get('day')} ${MONTHS[Number(get('month')) - 1]} ${get('hour')}.${get('minute')} WIB`
}

const when = (r) => `${formatDate(r.date)} · ${r.time.replace(':', '.')} WIB`

function footer(r, s, webUrl) {
  const lines = []
  if (s.shopAddress) lines.push(`Alamat: ${s.shopAddress}`)
  if (s.shopMapsUrl) lines.push(`Peta: ${s.shopMapsUrl}`)
  if (webUrl) lines.push(`Cek booking: ${webUrl.replace(/\/$/, '')}/cek-reservasi?kode=${r.code} (siapkan nomor WhatsApp ini)`)
  return lines.join('\n')
}

const TEMPLATES = {
  /** Booking dibuat, menunggu DP. */
  instruksi_dp: (r, s, webUrl, extra) =>
    [
      `*BOOKING DITAHAN, MENUNGGU DP*`,
      s.shopName,
      '',
      `Kode: *${r.code}*`,
      `Atas nama: ${r.customerName}`,
      `Layanan: ${r.serviceName} (${r.durationMinutes} menit)`,
      `Jadwal: ${when(r)}`,
      `Kapster: ${r.barberName}`,
      '',
      `Total biaya: ${formatRupiah(r.price)}`,
      `*DP yang dibayar: ${formatRupiah(r.dp.nominal)}*`,
      ...(r.dp.payBefore ? [`Bayar sebelum: *${formatDeadline(r.dp.payBefore, extra.timezone)}* (lewat itu booking otomatis dibatalkan)`] : []),
      '',
      s.dpInstruksi ? `Cara bayar: ${s.dpInstruksi}` : `Cara bayar: hubungi kasir untuk informasi pembayaran DP.`,
      `Setelah DP dikonfirmasi admin, bukti booking dikirim ke WhatsApp ini.`,
      '',
      footer(r, s, webUrl),
    ].join('\n'),

  /** DP sudah dikonfirmasi. */
  bukti_booking: (r, s, webUrl) =>
    [
      `*BUKTI BOOKING*`,
      s.shopName,
      '',
      `Kode: *${r.code}*`,
      `Atas nama: ${r.customerName}`,
      `Layanan: ${r.serviceName} (${r.durationMinutes} menit)`,
      `Jadwal: ${when(r)}`,
      `Kapster: ${r.barberName}`,
      ...(r.hairstyle ? [`Gaya pilihan: ${r.hairstyle}`] : []),
      '',
      `Total biaya: ${formatRupiah(r.price)}`,
      ...(r.dp.nominal > 0 ? [`DP: ${formatRupiah(r.dp.nominal)} (sudah dibayar)`, `Sisa dibayar di kasir: *${formatRupiah(r.price - r.dp.nominal)}*`] : []),
      '',
      `Tunjukkan kode ini ke kasir. Check-in maksimal 10 menit sebelum jadwal.`,
      '',
      footer(r, s, webUrl),
    ].join('\n'),

  /** Pelunasan sudah dicatat. */
  invoice: (r, s, webUrl, extra) =>
    [
      `*INVOICE*`,
      s.shopName,
      '',
      `Nomor invoice: *${extra.invoiceNumber}*`,
      `Kode booking: ${r.code}`,
      `Atas nama: ${r.customerName}`,
      `Layanan: ${r.serviceName}`,
      `Tanggal: ${formatDate(r.date)}`,
      '',
      `Total tagihan: ${formatRupiah(r.price)}`,
      ...(r.dp.nominal > 0 ? [`DP: ${formatRupiah(r.dp.nominal)}`] : []),
      `Status: *LUNAS*`,
      '',
      `Terima kasih sudah mampir ke ${s.shopName}.`,
    ].join('\n'),

  jadwal_diubah: (r, s, webUrl) =>
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

  pembatalan: (r, s, webUrl) =>
    [
      `*BOOKING DIBATALKAN*`,
      s.shopName,
      '',
      `Kode: *${r.code}*`,
      `Jadwal yang dibatalkan: ${when(r)}`,
      ...(r.cancelReason ? [`Alasan: ${r.cancelReason}`] : []),
      '',
      `Slotmu sudah dilepas. Mau datang lagi? Buat booking baru kapan saja${webUrl ? `: ${webUrl.replace(/\/$/, '')}/#reservasi` : '.'}`,
    ].join('\n'),

  pengingat: (r, s, webUrl) =>
    [
      `*PENGINGAT BOOKING*`,
      s.shopName,
      '',
      `Halo ${r.customerName}, jadwal potongmu sebentar lagi:`,
      `${when(r)} · Kapster ${r.barberName}`,
      `Kode: *${r.code}*`,
      '',
      `Check-in maksimal 10 menit sebelum jadwal. Kalau berhalangan hadir, mohon hubungi kasir agar slotnya bisa dipakai orang lain.`,
      '',
      footer(r, s, webUrl),
    ].join('\n'),
}

function buildMessage(kind, reservation, settings, webUrl, extra = {}) {
  const build = TEMPLATES[kind]
  if (!build) throw new Error(`Jenis pesan tidak dikenal: ${kind}`)
  return build(reservation, settings, webUrl, { timezone: settings.timezone, ...extra })
}

module.exports = { buildMessage, formatDate, formatRupiah }
