const { createApp } = require('../src/app')
const { createDb } = require('../src/db')
const { runMigrations } = require('../src/db/migrate')
const { expireUnpaidBookings, processOutbox, scanConfirmedBookings, scanSettledBookings, scheduleReminders } = require('../src/notifications/outbox')

/** 2026-11-25 adalah hari Rabu. 02:00 UTC = 09:00 WIB. */
const WEDNESDAY_9AM = '2026-11-25T02:00:00Z'

/** Menjalankan API di port acak dengan database PGlite baru dan jam yang bisa digeser. */
async function startTestServer({ now = WEDNESDAY_9AM, limits = { write: 1000, access: 1000 }, webUrl, tryOnProvider, tryOnGenerate, afterMigrate, whatsappProvider, otpRequired = false, midtrans } = {}) {
  const db = await createDb({ databaseUrl: '', dataDir: undefined })
  await runMigrations(db)
  // Tes boleh mengubah skema setelah migrasi, mis. meniru perubahan dari sisi internal (lihat schema-compat.test.js).
  if (afterMigrate) await afterMigrate(db)
  const clock = { current: new Date(now) }
  const app = createApp({ db, clock: () => clock.current, limits, webUrl, tryOnProvider, tryOnGenerate, whatsappProvider, otpRequired, midtrans })
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  const base = `http://127.0.0.1:${server.address().port}`

  async function request(method, path, body) {
    const response = await fetch(base + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: response.status, body: await response.json().catch(() => null) }
  }

  const context = () => ({ db, clock: () => clock.current, webUrl })

  return {
    db,
    clock,
    base,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    /** Geser jam server. Contoh: at('2026-11-25T04:30:00Z') = 11:30 WIB. */
    at: (iso) => {
      clock.current = new Date(iso)
    },
    /** Maju sekian menit dari jam server sekarang. */
    advance: (minutes) => {
      clock.current = new Date(clock.current.getTime() + minutes * 60_000)
    },
    /** Satu putaran worker (urutannya sama dengan worker sungguhan) dengan penyedia WhatsApp yang diberikan. */
    tick: async (provider) => {
      const expired = await expireUnpaidBookings(context())
      const confirmed = await scanConfirmedBookings(context())
      const invoices = await scanSettledBookings(context())
      const reminders = await scheduleReminders(context())
      const { sent, failed } = await processOutbox({ db, provider, clock: () => clock.current, log: () => {} })
      return { expired, confirmed, invoices, reminders, sent, failed }
    },
    /** Meniru admin: konfirmasi DP (pembayaran dibayar, booking dikonfirmasi). */
    confirmDp: async (code) => {
      await db.query(
        `UPDATE pembayaran SET status_pembayaran = 'dibayar', waktu_bayar = now()
          WHERE jenis_pembayaran = 'dp' AND id_booking = (SELECT id_booking FROM booking WHERE kode_booking = $1)`,
        [code],
      )
      await db.query(`UPDATE booking SET status_booking = 'dikonfirmasi' WHERE kode_booking = $1`, [code])
    },
    /** Meniru admin: catat pelunasan dan selesaikan booking. */
    settle: async (code) => {
      await db.query(
        `INSERT INTO pembayaran (id_booking, jenis_pembayaran, metode_pembayaran, nominal, status_pembayaran, waktu_bayar)
         SELECT id_booking, 'pelunasan', 'tunai', total_harga - nominal_dp, 'dibayar', now() FROM booking WHERE kode_booking = $1`,
        [code],
      )
      await db.query(`UPDATE booking SET status_booking = 'selesai' WHERE kode_booking = $1`, [code])
    },
    close: async () => {
      await new Promise((resolve) => server.close(resolve))
      await db.close()
    },
  }
}

let phoneCounter = 0
/** Nomor WhatsApp unik per pemanggilan, supaya batas booking aktif per nomor tidak ikut campur antar tes. */
const nextPhone = () => `0812000${String(++phoneCounter).padStart(4, '0')}`

const booking = (overrides = {}) => ({
  serviceId: 'haircut-dewasa',
  barberId: 'rizky',
  date: '2026-11-25',
  time: '14:00',
  customerName: 'Budi Santoso',
  customerPhone: nextPhone(),
  ...overrides,
})

module.exports = { startTestServer, booking, nextPhone, WEDNESDAY_9AM }
