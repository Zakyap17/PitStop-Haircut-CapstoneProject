const { badRequest, conflict, notFound } = require('../lib/errors')
const { nowInZone, toMinutes, toTime } = require('../lib/time')
const { assertBookableDate, fitsShopHours, isBarberFree, loadBusyIntervals, loadService, loadSlotTimes } = require('./availability')
const { loadSettings } = require('./settings')

const CODE_PATTERN = /^PS-\d{4}$/
const MAX_CODE_ATTEMPTS = 5

/** "ps4821", " PS 4821 " dan "4821" semuanya menjadi "PS-4821" (sama dengan yang dilakukan frontend). */
function normalizeCode(input) {
  const compact = String(input ?? '').trim().toUpperCase().replace(/\s+/g, '')
  const match = compact.match(/^(?:PS-?)?(\d{4})$/)
  return match ? `PS-${match[1]}` : compact
}

function generateCode() {
  return `PS-${Math.floor(1000 + Math.random() * 9000)}`
}

const SELECT_RESERVATION = `
  SELECT r.code, r.service_id, r.service_name, r.duration_minutes, r.price,
         r.barber_id, b.name AS barber_name,
         to_char(r.starts_at, 'YYYY-MM-DD') AS date,
         to_char(r.starts_at, 'HH24:MI')    AS time,
         to_char(r.starts_at, 'YYYY-MM-DD HH24:MI') AS starts_text,
         r.customer_name, r.customer_email, r.hairstyle, r.status, r.reschedule_count, r.created_at
    FROM reservations r
    JOIN barbers b ON b.id = r.barber_id`

function toDto(row) {
  return {
    code: row.code,
    serviceId: row.service_id,
    serviceName: row.service_name,
    durationMinutes: row.duration_minutes,
    price: row.price,
    barberId: row.barber_id,
    barberName: row.barber_name,
    date: row.date,
    time: row.time,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    hairstyle: row.hairstyle ?? undefined,
    status: row.status,
    rescheduleCount: row.reschedule_count,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

/** Waktu sekarang di zona toko sebagai teks "YYYY-MM-DD HH:MM", bisa dibandingkan langsung dengan starts_text. */
function nowText(settings, clock) {
  const now = nowInZone(settings.timezone, clock())
  return `${now.date} ${toTime(now.minutes)}`
}

/** Kunci per kapster per hari: dua pemesanan serentak untuk kapster dan hari yang sama dijalankan bergantian. */
async function lockBarberDay(tx, barberId, date) {
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${barberId}:${date}`])
}

async function loadBarber(tx, barberId) {
  const { rows } = await tx.query('SELECT id, name, off_days FROM barbers WHERE id = $1 AND is_active', [barberId])
  if (rows.length === 0) throw notFound('Kapster tidak ditemukan.')
  return rows[0]
}

/** Memastikan kapster, tanggal, dan jam itu benar-benar kosong. Dipanggil di dalam transaksi setelah kunci diambil. */
async function assertSlotFree(tx, { settings, clock, barber, service, date, time, excludeCode = null }) {
  assertBookableDate(date, settings, clock)
  const slots = await loadSlotTimes(tx)
  if (!slots.includes(time)) throw badRequest('invalid_time', 'Jam yang dipilih tidak tersedia.')

  const startMinutes = toMinutes(time)
  const duration = service.duration_minutes
  if (!fitsShopHours({ startMinutes, duration, date, settings, clock })) {
    throw conflict('slot_unavailable', 'Jam ini tidak bisa dipesan untuk layanan tersebut (di luar jam buka, bertabrakan dengan istirahat, atau sudah lewat).')
  }
  const busy = await loadBusyIntervals(tx, date, excludeCode)
  if (!isBarberFree({ barber, date, startMinutes, duration, busy })) {
    throw conflict('slot_taken', `Kapster ${barber.name} sudah penuh atau libur di jam itu. Pilih jam atau kapster lain.`)
  }
  return { startMinutes, endMinutes: startMinutes + duration }
}

function isUniqueViolation(error, constraint) {
  return error && error.code === '23505' && (!constraint || String(error.constraint ?? '').includes(constraint))
}

async function createReservation({ db, clock }, input) {
  const settings = await loadSettings(db)
  const service = await loadService(db, input.serviceId)

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const barber = await loadBarber(tx, input.barberId)
        await lockBarberDay(tx, barber.id, input.date)
        const { startMinutes, endMinutes } = await assertSlotFree(tx, { settings, clock, barber, service, date: input.date, time: input.time })

        // Batas reservasi aktif per email agar slot tidak diborong.
        const active = await tx.query(
          `SELECT count(*)::int AS n FROM reservations
            WHERE lower(customer_email) = lower($1) AND status = 'confirmed'
              AND to_char(starts_at, 'YYYY-MM-DD HH24:MI') > $2`,
          [input.customerEmail, nowText(settings, clock)],
        )
        if (active.rows[0].n >= settings.maxActivePerEmail) {
          throw conflict('too_many_active', `Satu email maksimal punya ${settings.maxActivePerEmail} reservasi aktif. Selesaikan atau batalkan salah satunya dulu.`)
        }

        const code = generateCode()
        await tx.query(
          `INSERT INTO reservations
             (code, service_id, barber_id, service_name, duration_minutes, price,
              starts_at, ends_at, customer_name, customer_email, customer_phone, hairstyle)
           VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $8::timestamp, $9, $10, $11, $12)`,
          [
            code, service.id, barber.id, service.name, service.duration_minutes, service.price,
            `${input.date} ${toTime(startMinutes)}`, `${input.date} ${toTime(endMinutes)}`,
            input.customerName, input.customerEmail, input.customerPhone ?? null, input.hairstyle ?? null,
          ],
        )
        const { rows } = await tx.query(`${SELECT_RESERVATION} WHERE r.code = $1`, [code])
        return toDto(rows[0])
      })
    } catch (error) {
      // Kode kebetulan kembar: ulangi dengan kode baru. Selain itu, lempar apa adanya.
      if (isUniqueViolation(error, 'reservations_code') && attempt < MAX_CODE_ATTEMPTS) continue
      if (isUniqueViolation(error, 'reservations_barber_start_active')) {
        throw conflict('slot_taken', 'Slot ini baru saja diambil orang lain. Pilih jam atau kapster lain.')
      }
      throw error
    }
  }
  throw new Error('Gagal membuat kode reservasi unik.')
}

/** Mencari reservasi dengan kode dan email. Kode atau email yang salah sama-sama dijawab "tidak ditemukan". */
async function findOwnedReservation(client, { code, email }, { forUpdate = false } = {}) {
  const { rows } = await client.query(
    `${SELECT_RESERVATION} WHERE r.code = $1 AND lower(r.customer_email) = lower($2) ${forUpdate ? 'FOR UPDATE OF r' : ''}`,
    [normalizeCode(code), String(email ?? '').trim()],
  )
  if (rows.length === 0) throw notFound('Reservasi tidak ditemukan. Periksa kode dan emailnya.')
  return rows[0]
}

async function lookupReservation({ db }, { code, email }) {
  return toDto(await findOwnedReservation(db, { code, email }))
}

async function rescheduleReservation({ db, clock }, { code, email, barberId, date, time }) {
  const settings = await loadSettings(db)
  try {
    return await db.transaction(async (tx) => {
      const current = await findOwnedReservation(tx, { code, email }, { forUpdate: true })
      if (current.status !== 'confirmed') throw conflict('not_active', 'Reservasi ini sudah dibatalkan atau selesai, jadwalnya tidak bisa diubah.')
      if (current.starts_text <= nowText(settings, clock)) throw conflict('already_started', 'Jadwal reservasi ini sudah lewat dan tidak bisa diubah.')
      if (current.reschedule_count >= settings.maxReschedules) {
        throw conflict('reschedule_limit', `Jadwal hanya bisa diubah ${settings.maxReschedules} kali. Hubungi kasir kalau masih perlu mengubahnya.`)
      }
      if (barberId === current.barber_id && date === current.date && time === current.time) {
        throw badRequest('same_schedule', 'Pilih tanggal, jam, atau kapster yang berbeda dari jadwal sekarang.')
      }

      const barber = await loadBarber(tx, barberId)
      await lockBarberDay(tx, barber.id, date)
      // Pakai durasi yang tersimpan di reservasi, bukan durasi menu terbaru.
      const service = { duration_minutes: current.duration_minutes }
      const { startMinutes, endMinutes } = await assertSlotFree(tx, { settings, clock, barber, service, date, time, excludeCode: current.code })

      await tx.query(
        `UPDATE reservations
            SET barber_id = $2, starts_at = $3::timestamp, ends_at = $4::timestamp,
                reschedule_count = reschedule_count + 1, updated_at = now()
          WHERE code = $1`,
        [current.code, barber.id, `${date} ${toTime(startMinutes)}`, `${date} ${toTime(endMinutes)}`],
      )
      const { rows } = await tx.query(`${SELECT_RESERVATION} WHERE r.code = $1`, [current.code])
      return toDto(rows[0])
    })
  } catch (error) {
    if (isUniqueViolation(error, 'reservations_barber_start_active')) {
      throw conflict('slot_taken', 'Slot ini baru saja diambil orang lain. Pilih jam atau kapster lain.')
    }
    throw error
  }
}

async function cancelReservation({ db, clock }, { code, email }) {
  const settings = await loadSettings(db)
  return db.transaction(async (tx) => {
    const current = await findOwnedReservation(tx, { code, email }, { forUpdate: true })
    if (current.status === 'cancelled') return toDto(current) // membatalkan dua kali tidak apa-apa
    if (current.status !== 'confirmed') throw conflict('not_active', 'Reservasi ini sudah selesai dan tidak bisa dibatalkan.')
    if (current.starts_text <= nowText(settings, clock)) throw conflict('already_started', 'Jadwal reservasi ini sudah lewat dan tidak bisa dibatalkan.')

    await tx.query(`UPDATE reservations SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE code = $1`, [current.code])
    const { rows } = await tx.query(`${SELECT_RESERVATION} WHERE r.code = $1`, [current.code])
    return toDto(rows[0])
  })
}

module.exports = { normalizeCode, createReservation, lookupReservation, rescheduleReservation, cancelReservation, CODE_PATTERN }
