const { badRequest, conflict, notFound } = require('../lib/errors')
const { normalizePhone } = require('../lib/phone')
const { toMinutes, toTime } = require('../lib/time')
const { enqueueMessage, expireInTx } = require('../notifications/outbox')
const {
  assertBookableDate,
  fitsShopHours,
  isCapsterFree,
  loadBusyIntervals,
  loadCapsterBySlug,
  loadCapsters,
  loadReservedMinutes,
  loadSchedules,
  loadService,
  loadSlotTimes,
} = require('./availability')
const { SELECT_BOOKING, minutesUntil, nowText, toDto } = require('./booking-queries')
const { loadSettings } = require('./settings')

const MAX_CODE_ATTEMPTS = 5
const SLOT_ERRORS = ['slot_taken', 'slot_unavailable', 'date_out_of_range', 'invalid_time']

/** "ps4821", " PS 4821 " dan "4821" semuanya menjadi "PS-4821" (sama dengan yang dilakukan frontend). */
function normalizeCode(input) {
  const compact = String(input ?? '').trim().toUpperCase().replace(/\s+/g, '')
  const match = compact.match(/^(?:PS-?)?(\d{4})$/)
  return match ? `PS-${match[1]}` : compact
}

const generateCode = () => `PS-${Math.floor(1000 + Math.random() * 9000)}`

function isUniqueViolation(error, constraint) {
  return error && error.code === '23505' && (!constraint || String(error.constraint ?? '').includes(constraint))
}

/** Kunci per capster per hari: dua pemesanan serentak untuk capster dan hari yang sama dijalankan bergantian. */
async function lockCapsterDay(tx, capsterId, date) {
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${capsterId}:${date}`])
}

/** Pengingat dilewati kalau jadwalnya sudah lebih dekat dari waktu pengingat (atau pengingat dimatikan). */
function reminderAlreadyDue(startsText, settings, clock) {
  return settings.reminderMinutesBefore <= 0 || minutesUntil(startsText, settings, clock) <= settings.reminderMinutesBefore
}

/** Nominal DP: persentase terbaru di pengaturan_dp dari total, atau nominal bawaan kalau belum diatur. Tidak lebih dari total. */
async function computeDp(tx, total, settings) {
  const { rows } = await tx.query(
    `SELECT persentase_dp::float8 AS persen FROM pengaturan_dp WHERE berlaku_sejak <= CURRENT_DATE ORDER BY berlaku_sejak DESC, id_pengaturan DESC LIMIT 1`,
  )
  const raw = rows.length > 0 ? Math.round((total * rows[0].persen) / 100) : settings.dpDefaultNominal
  return Math.min(raw, total)
}

/** Memastikan capster itu kosong di jam itu. Dipanggil di dalam transaksi setelah kunci diambil. Mengembalikan true/false. */
async function isFreeNow(tx, { settings, clock, capster, date, startMinutes, duration, excludeCode = null }) {
  const [schedules, busy] = await Promise.all([loadSchedules(tx, date), loadBusyIntervals(tx, date, { settings, clock, excludeCode })])
  return isCapsterFree({ capster, date, startMinutes, duration, busy, schedules })
}

/** Memeriksa jam mulai yang dipilih: tanggal, jam yang disediakan, dan jam buka toko. Mengembalikan menit mulai. */
async function assertSlotAllowed(tx, { settings, clock, date, time, duration }) {
  assertBookableDate(date, settings, clock)
  const slots = await loadSlotTimes(tx)
  if (!slots.includes(time)) throw badRequest('invalid_time', 'Jam yang dipilih tidak tersedia.')
  const startMinutes = toMinutes(time)
  if (!fitsShopHours({ startMinutes, duration, date, settings, clock })) {
    throw conflict('slot_unavailable', 'Jam ini tidak bisa dipesan untuk layanan tersebut (di luar jam buka, bertabrakan dengan istirahat, atau sudah lewat).')
  }
  return startMinutes
}

async function loadBooking(tx, id, settings) {
  const { rows } = await tx.query(`${SELECT_BOOKING} WHERE b.id_booking = $1`, [id])
  return { row: rows[0], dto: toDto(rows[0], settings) }
}

/** Mencari booking milik pemilik nomor WhatsApp itu. Kode atau nomor yang salah sama-sama dijawab "tidak ditemukan". */
async function findOwnedBooking(client, { code, phone }, { forUpdate = false } = {}) {
  const normalized = normalizePhone(phone)
  const notFoundError = notFound('Booking tidak ditemukan. Periksa kode dan nomor WhatsAppnya.')
  if (!normalized) throw notFoundError
  const { rows } = await client.query(
    `${SELECT_BOOKING} WHERE b.kode_booking = $1 AND cu.no_whatsapp = $2 ${forUpdate ? 'FOR UPDATE OF b' : ''}`,
    [normalizeCode(code), normalized],
  )
  if (rows.length === 0) throw notFoundError
  return rows[0]
}

/**
 * Membuat booking: customer dicari/dibuat dari nomor WhatsApp, booking berstatus menunggu_pembayaran menahan slot,
 * DP dicatat di pembayaran, dan pesan "instruksi DP" masuk antrean. barberId kosong atau "any" = tanpa preferensi
 * (dipilihkan capster yang kosong dengan booking paling sedikit hari itu).
 */
async function createBooking({ db, clock, webUrl }, input) {
  const settings = await loadSettings(db)
  const phone = normalizePhone(input.customerPhone)
  if (!phone) throw badRequest('invalid_phone', 'Nomor WhatsApp tidak valid. Contoh: 081234567890.')
  const service = await loadService(db, input.serviceId)
  // Waktu yang ditahan: durasi dibulatkan ke atas ke kelipatan satu slot (hair coloring 90 menit menahan 2 slot).
  const reserved = await loadReservedMinutes(db, service.duration)
  const wantsAny = !input.barberId || input.barberId === 'any'

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const startMinutes = await assertSlotAllowed(tx, { settings, clock, date: input.date, time: input.time, duration: reserved })
        const endMinutes = startMinutes + reserved

        const customer = (
          await tx.query(
            `INSERT INTO customer (nama_customer, no_whatsapp) VALUES ($1, $2)
             ON CONFLICT (no_whatsapp) DO UPDATE SET nama_customer = EXCLUDED.nama_customer RETURNING id_customer::int AS id`,
            [input.customerName, phone],
          )
        ).rows[0]

        const active = await tx.query(
          `SELECT count(*)::int AS n FROM booking
            WHERE id_customer = $1 AND status_booking IN ('menunggu_pembayaran', 'dikonfirmasi') AND (tanggal_booking + jam_mulai) > $2::timestamp`,
          [customer.id, nowText(settings, clock)],
        )
        if (active.rows[0].n >= settings.maxActivePerCustomer) {
          throw conflict('too_many_active', `Satu nomor WhatsApp maksimal punya ${settings.maxActivePerCustomer} booking aktif. Selesaikan atau batalkan salah satunya dulu.`)
        }

        let candidates
        if (wantsAny) {
          const load = await tx.query(
            `SELECT id_capster::int AS id, count(*)::int AS n FROM booking WHERE tanggal_booking = $1::date AND status_booking = ANY('{menunggu_pembayaran,dikonfirmasi,sedang_dilayani,selesai}') GROUP BY 1`,
            [input.date],
          )
          const counts = Object.fromEntries(load.rows.map((row) => [row.id, row.n]))
          candidates = (await loadCapsters(tx)).sort((a, b) => (counts[a.id] ?? 0) - (counts[b.id] ?? 0) || a.id - b.id)
        } else {
          candidates = [await loadCapsterBySlug(tx, input.barberId)]
        }

        let chosen = null
        for (const capster of candidates) {
          await lockCapsterDay(tx, capster.id, input.date)
          await expireInTx(tx, { settings, clock, webUrl, capsterId: capster.id, date: input.date })
          if (await isFreeNow(tx, { settings, clock, capster, date: input.date, startMinutes, duration: reserved })) {
            chosen = capster
            break
          }
        }
        if (!chosen) {
          throw conflict('slot_taken', wantsAny ? 'Semua kapster sudah penuh atau libur di jam itu. Pilih jam lain.' : `Kapster ${candidates[0].name} sudah penuh atau libur di jam itu. Pilih jam atau kapster lain.`)
        }

        const dp = await computeDp(tx, service.price, settings)
        const status = dp > 0 ? 'menunggu_pembayaran' : 'dikonfirmasi'
        const now = clock().toISOString()
        const startsText = `${input.date} ${toTime(startMinutes)}`
        const inserted = await tx.query(
          `INSERT INTO booking (kode_booking, id_customer, id_capster, tipe_booking, tanggal_booking, jam_mulai, jam_selesai,
                                status_booking, total_harga, nominal_dp, gaya_try_on, pengingat_terkirim_at, created_at, updated_at)
           VALUES ($1, $2, $3, 'online', $4::date, $5::time, $6::time, $7, $8, $9, $10, $11::timestamptz, $12::timestamptz, $12::timestamptz)
           RETURNING id_booking::int AS id`,
          [
            generateCode(), customer.id, chosen.id, input.date, toTime(startMinutes), toTime(endMinutes), status, service.price, dp, input.hairstyle ?? null,
            // Booking yang jadwalnya sudah dekat tidak perlu pengingat lagi.
            reminderAlreadyDue(startsText, settings, clock) ? now : null,
            now,
          ],
        )
        const bookingId = inserted.rows[0].id
        await tx.query(`INSERT INTO booking_layanan (id_booking, id_layanan, harga_satuan, subtotal) VALUES ($1, $2, $3, $3)`, [bookingId, service.id, service.price])
        if (dp > 0) {
          await tx.query(`INSERT INTO pembayaran (id_booking, jenis_pembayaran, metode_pembayaran, nominal, status_pembayaran) VALUES ($1, 'dp', 'manual', $2, 'menunggu')`, [bookingId, dp])
        }

        const { dto } = await loadBooking(tx, bookingId, settings)
        await enqueueMessage(tx, { bookingId, kind: status === 'dikonfirmasi' ? 'bukti_booking' : 'instruksi_dp', phone, reservation: dto, settings, webUrl, now })
        return (await loadBooking(tx, bookingId, settings)).dto // dimuat ulang agar status pesan WhatsApp ikut
      })
    } catch (error) {
      if (isUniqueViolation(error, 'kode_booking') && attempt < MAX_CODE_ATTEMPTS) continue // kode kebetulan kembar: ulangi
      if (isUniqueViolation(error, 'booking_capster_mulai_aktif')) throw conflict('slot_taken', 'Slot ini baru saja diambil orang lain. Pilih jam atau kapster lain.')
      throw error
    }
  }
  throw new Error('Gagal membuat kode booking unik.')
}

async function lookupBooking({ db }, { code, phone }) {
  const settings = await loadSettings(db)
  return toDto(await findOwnedBooking(db, { code, phone }), settings)
}

async function rescheduleBooking({ db, clock, webUrl }, { code, phone, barberId, date, time }) {
  const settings = await loadSettings(db)
  try {
    return await db.transaction(async (tx) => {
      const current = await findOwnedBooking(tx, { code, phone }, { forUpdate: true })
      if (!['menunggu_pembayaran', 'dikonfirmasi'].includes(current.status)) throw conflict('not_active', 'Booking ini sudah dibatalkan atau selesai, jadwalnya tidak bisa diubah.')
      if (current.starts_text <= nowText(settings, clock)) throw conflict('already_started', 'Jadwal booking ini sudah lewat dan tidak bisa diubah.')
      if (current.reschedule_count >= settings.maxReschedules) {
        throw conflict('reschedule_limit', `Jadwal hanya bisa diubah ${settings.maxReschedules} kali. Hubungi kasir kalau masih perlu mengubahnya.`)
      }
      if (barberId === current.capster_slug && date === current.date && time === current.time) {
        throw badRequest('same_schedule', 'Pilih tanggal, jam, atau kapster yang berbeda dari jadwal sekarang.')
      }

      const capster = await loadCapsterBySlug(tx, barberId)
      await lockCapsterDay(tx, capster.id, date)
      await expireInTx(tx, { settings, clock, webUrl, capsterId: capster.id, date })
      // Waktu yang ditahan dihitung dari durasi layanan pada booking ini (dibulatkan ke kelipatan slot). Booking lama yang
      // layanannya tidak terbaca memakai selang yang tersimpan.
      const reserved = await loadReservedMinutes(tx, current.service_minutes ?? current.duration)
      const startMinutes = await assertSlotAllowed(tx, { settings, clock, date, time, duration: reserved })
      if (!(await isFreeNow(tx, { settings, clock, capster, date, startMinutes, duration: reserved, excludeCode: current.code }))) {
        throw conflict('slot_taken', `Kapster ${capster.name} sudah penuh atau libur di jam itu. Pilih jam atau kapster lain.`)
      }

      const now = clock().toISOString()
      const startsText = `${date} ${toTime(startMinutes)}`
      await tx.query(
        `UPDATE booking SET id_capster = $2, tanggal_booking = $3::date, jam_mulai = $4::time, jam_selesai = $5::time,
                jumlah_ubah_jadwal = jumlah_ubah_jadwal + 1, pengingat_terkirim_at = $6::timestamptz, updated_at = $7::timestamptz
          WHERE id_booking = $1`,
        [current.id, capster.id, date, toTime(startMinutes), toTime(startMinutes + reserved), reminderAlreadyDue(startsText, settings, clock) ? now : null, now],
      )
      const { dto } = await loadBooking(tx, current.id, settings)
      await enqueueMessage(tx, { bookingId: current.id, kind: 'jadwal_diubah', phone: current.no_whatsapp, reservation: dto, settings, webUrl, now })
      return (await loadBooking(tx, current.id, settings)).dto
    })
  } catch (error) {
    if (isUniqueViolation(error, 'booking_capster_mulai_aktif')) throw conflict('slot_taken', 'Slot ini baru saja diambil orang lain. Pilih jam atau kapster lain.')
    throw error
  }
}

/**
 * Pelanggan hanya bisa membatalkan sendiri selama DP belum dibayar (use case: membatalkan booking saat membayar DP).
 * Setelah DP dibayar, pembatalan dan nasib DP-nya ditangani kasir.
 */
async function cancelBooking({ db, clock, webUrl }, { code, phone }) {
  const settings = await loadSettings(db)
  return db.transaction(async (tx) => {
    const current = await findOwnedBooking(tx, { code, phone }, { forUpdate: true })
    if (current.status === 'dibatalkan') return toDto(current, settings) // membatalkan dua kali tidak apa-apa
    if (current.status === 'dikonfirmasi') {
      throw conflict('dp_sudah_dibayar', 'DP sudah dibayar, jadi pembatalan dilakukan lewat kasir. Hubungi kasir untuk membatalkan atau mengubah jadwal.')
    }
    if (current.status !== 'menunggu_pembayaran') throw conflict('not_active', 'Booking ini sudah berjalan atau selesai dan tidak bisa dibatalkan.')
    if (current.starts_text <= nowText(settings, clock)) throw conflict('already_started', 'Jadwal booking ini sudah lewat dan tidak bisa dibatalkan.')

    const now = clock().toISOString()
    await tx.query(`UPDATE booking SET status_booking = 'dibatalkan', alasan_batal = 'Dibatalkan oleh pelanggan', updated_at = $2::timestamptz WHERE id_booking = $1`, [current.id, now])
    await tx.query(`UPDATE pembayaran SET status_pembayaran = 'gagal' WHERE id_booking = $1 AND jenis_pembayaran = 'dp' AND status_pembayaran = 'menunggu'`, [current.id])
    const { dto } = await loadBooking(tx, current.id, settings)
    await enqueueMessage(tx, { bookingId: current.id, kind: 'pembatalan', phone: current.no_whatsapp, reservation: { ...dto, cancelReason: 'Dibatalkan oleh pelanggan' }, settings, webUrl, now })
    return (await loadBooking(tx, current.id, settings)).dto
  })
}

module.exports = { normalizeCode, createBooking, lookupBooking, rescheduleBooking, cancelBooking, SLOT_ERRORS }
