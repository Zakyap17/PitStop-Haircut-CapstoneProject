const { expireUnpaidBookings, processOutbox, scanConfirmedBookings, scanSettledBookings, scheduleReminders } = require('./outbox')

/**
 * Pekerja latar belakang. Tiap beberapa detik, berurutan:
 *  1. membatalkan booking yang DP-nya kedaluwarsa,
 *  2. membuat pesan bukti booking untuk booking yang baru dikonfirmasi admin,
 *  3. menerbitkan invoice dan pesannya untuk pelunasan yang baru dicatat,
 *  4. membuat pengingat yang jatuh tempo,
 *  5. mengirim antrean pesan WhatsApp.
 * Satu putaran tidak tumpang tindih dengan putaran berikutnya. Mengembalikan fungsi untuk menghentikannya.
 */
function startNotificationWorker({ db, provider, clock = () => new Date(), webUrl, intervalMs = 5000, log = console.log }) {
  let running = false
  let stopped = false

  const tick = async () => {
    if (running || stopped) return
    running = true
    try {
      const context = { db, clock, webUrl }
      const expired = await expireUnpaidBookings(context)
      if (expired > 0) log(`[booking] ${expired} booking dibatalkan karena DP tidak dibayar`)
      const confirmed = await scanConfirmedBookings(context)
      const invoices = await scanSettledBookings(context)
      const reminders = await scheduleReminders(context)
      if (confirmed + invoices + reminders > 0) log(`[whatsapp] dijadwalkan: bukti booking ${confirmed}, invoice ${invoices}, pengingat ${reminders}`)
      const { sent, failed } = await processOutbox({ db, provider, clock })
      if (sent + failed > 0) log(`[whatsapp] terkirim ${sent}, gagal ${failed}`)
    } catch (error) {
      console.error('[worker] error:', error.message)
    } finally {
      running = false
    }
  }

  const timer = setInterval(tick, intervalMs)
  timer.unref?.()
  tick()
  return () => {
    stopped = true
    clearInterval(timer)
  }
}

module.exports = { startNotificationWorker }
