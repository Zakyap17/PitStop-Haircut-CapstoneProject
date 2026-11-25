const { processOutbox, scheduleReminders } = require('./outbox')

/**
 * Pekerja latar belakang: tiap beberapa detik membuat pengingat yang jatuh tempo lalu mengirim antrean pesan.
 * Satu putaran tidak tumpang tindih dengan putaran berikutnya. Mengembalikan fungsi untuk menghentikannya.
 */
function startNotificationWorker({ db, provider, clock = () => new Date(), webUrl, intervalMs = 5000, log = console.log }) {
  let running = false
  let stopped = false

  const tick = async () => {
    if (running || stopped) return
    running = true
    try {
      const reminders = await scheduleReminders({ db, clock, webUrl })
      if (reminders > 0) log(`[whatsapp] ${reminders} pengingat dijadwalkan`)
      const { sent, failed } = await processOutbox({ db, provider, clock })
      if (sent + failed > 0) log(`[whatsapp] terkirim ${sent}, gagal ${failed}`)
    } catch (error) {
      console.error('[whatsapp] worker error:', error.message)
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
