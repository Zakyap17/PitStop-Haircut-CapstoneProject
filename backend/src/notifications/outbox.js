const { buildMessage } = require('./templates')
const { loadSettings } = require('../services/settings')
const { SELECT_RESERVATION, nowText, toDto } = require('../services/reservation-queries')

const MAX_ATTEMPTS = 5
/** Jeda sebelum percobaan ulang setelah gagal ke-1, ke-2, ... (detik). */
const BACKOFF_SECONDS = [30, 120, 600, 1800]
/** Pesan yang sedang dikirim "dipinjam" selama ini; kalau backend mati di tengah jalan, pesan dicoba lagi setelahnya. */
const LEASE_MINUTES = 3

/**
 * Menulis pesan ke antrean. Dipanggil di dalam transaksi yang sama dengan perubahan reservasinya,
 * jadi pesan hanya ada kalau reservasinya benar-benar tersimpan.
 */
async function enqueueMessage(tx, { reservationId, kind, phone, reservation, settings, webUrl, now }) {
  if (!phone) return false
  await tx.query(`INSERT INTO notifications (reservation_id, kind, recipient, message, next_attempt_at, created_at) VALUES ($1, $2, $3, $4, $5::timestamptz, $5::timestamptz)`, [
    reservationId,
    kind,
    phone,
    buildMessage(kind, reservation, settings, webUrl),
    now,
  ])
  return true
}

/** Mengambil satu pesan yang jatuh tempo dan menandainya "dipinjam" supaya tidak diambil dua kali. */
async function claimNext(db, now) {
  const { rows } = await db.query(
    `UPDATE notifications
        SET attempts = attempts + 1, next_attempt_at = $1::timestamptz + make_interval(mins => $2)
      WHERE id = (SELECT id FROM notifications
                   WHERE status = 'pending' AND next_attempt_at <= $1::timestamptz
                   ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id, recipient, message, attempts`,
    [now, LEASE_MINUTES],
  )
  return rows[0] ?? null
}

/** Mengirim semua pesan yang jatuh tempo (maksimal `limit`). Mengembalikan jumlah terkirim dan gagal. */
async function processOutbox({ db, provider, clock, limit = 20, log = console.error }) {
  let sent = 0
  let failed = 0
  for (let index = 0; index < limit; index++) {
    const now = clock().toISOString()
    const item = await claimNext(db, now)
    if (!item) break

    try {
      const result = await provider.send({ to: item.recipient, message: item.message })
      await db.query(`UPDATE notifications SET status = 'sent', sent_at = $2::timestamptz, provider_ref = $3, last_error = NULL WHERE id = $1`, [item.id, now, result?.ref ?? null])
      sent += 1
    } catch (error) {
      failed += 1
      const message = String(error.message ?? error).slice(0, 500)
      if (item.attempts >= MAX_ATTEMPTS) {
        await db.query(`UPDATE notifications SET status = 'failed', last_error = $2 WHERE id = $1`, [item.id, message])
        log(`[whatsapp] pesan #${item.id} gagal permanen setelah ${item.attempts} percobaan: ${message}`)
      } else {
        const wait = BACKOFF_SECONDS[Math.min(item.attempts - 1, BACKOFF_SECONDS.length - 1)]
        await db.query(`UPDATE notifications SET next_attempt_at = $2::timestamptz + make_interval(secs => $3), last_error = $4 WHERE id = $1`, [item.id, now, wait, message])
        log(`[whatsapp] pesan #${item.id} gagal (percobaan ${item.attempts}), dicoba lagi ${wait} detik lagi: ${message}`)
      }
    }
  }
  return { sent, failed }
}

/**
 * Membuat pesan pengingat untuk reservasi yang jadwalnya tinggal `reminder_minutes_before` menit lagi.
 * Tiap reservasi hanya sekali (reminder_sent_at), dan di-reset saat jadwal diubah.
 */
async function scheduleReminders({ db, clock, webUrl }) {
  const settings = await loadSettings(db)
  if (settings.reminderMinutesBefore <= 0) return 0

  const nowLocal = nowText(settings, clock)
  return db.transaction(async (tx) => {
    const claimed = await tx.query(
      `UPDATE reservations SET reminder_sent_at = $3::timestamptz
        WHERE id IN (SELECT id FROM reservations
                      WHERE status = 'confirmed' AND customer_phone IS NOT NULL AND reminder_sent_at IS NULL
                        AND starts_at > $1::timestamp AND starts_at <= $1::timestamp + make_interval(mins => $2)
                      FOR UPDATE SKIP LOCKED)
        RETURNING id`,
      [nowLocal, settings.reminderMinutesBefore, clock().toISOString()],
    )
    if (claimed.rows.length === 0) return 0

    const ids = claimed.rows.map((row) => row.id)
    const { rows } = await tx.query(`${SELECT_RESERVATION} WHERE r.id = ANY($1::uuid[])`, [ids])
    for (const row of rows) {
      await enqueueMessage(tx, { reservationId: row.id, kind: 'reminder', phone: row.customer_phone, reservation: toDto(row), settings, webUrl, now: clock().toISOString() })
    }
    return rows.length
  })
}

module.exports = { enqueueMessage, processOutbox, scheduleReminders, MAX_ATTEMPTS }
