/**
 * Penyedia pengiriman WhatsApp. Semuanya punya satu bentuk: send({ to, message }) -> { ref }.
 * Gagal = melempar Error dengan pesan yang bisa dibaca (disimpan di notifications.last_error).
 *
 *  - console : tidak mengirim apa-apa, hanya mencetak pesan di log. Bawaan untuk dev, supaya tidak sengaja mengirim WA.
 *  - fonnte  : gateway Fonnte (https://docs.fonnte.com/api-send-message/). Butuh FONNTE_TOKEN dari dashboard Fonnte,
 *              dan perangkat WhatsApp di Fonnte harus berstatus connected.
 *  - memory  : menyimpan pesan di array, khusus untuk tes.
 */
const FONNTE_URL = 'https://api.fonnte.com/send'

function createConsoleProvider(log = console.log) {
  return {
    name: 'console',
    async send({ to, message }) {
      log(`[whatsapp:console] ke ${to}\n${message}\n`)
      return { ref: 'console' }
    },
  }
}

function createFonnteProvider({ token, timeoutMs = 15_000, fetchImpl = fetch }) {
  if (!token) throw new Error('FONNTE_TOKEN wajib diisi kalau WHATSAPP_PROVIDER=fonnte.')
  return {
    name: 'fonnte',
    async send({ to, message }) {
      // Nomor sudah format internasional (62...), jadi countryCode tidak dipakai untuk menambah awalan.
      const body = new FormData()
      body.set('target', to)
      body.set('message', message)

      let response
      try {
        response = await fetchImpl(FONNTE_URL, { method: 'POST', headers: { Authorization: token }, body, signal: AbortSignal.timeout(timeoutMs) })
      } catch (error) {
        throw new Error(`Fonnte tidak terjangkau: ${error.name === 'TimeoutError' ? 'waktu habis' : error.message}`)
      }

      const data = await response.json().catch(() => null)
      // Fonnte membalas { status: true, id: [...] } saat pesan diterima antreannya, dan { status: false, reason } saat ditolak.
      if (!response.ok || !data || data.status !== true) {
        throw new Error(`Fonnte menolak pesan: ${data?.reason ?? data?.detail ?? `HTTP ${response.status}`}`)
      }
      return { ref: Array.isArray(data.id) ? data.id.join(',') : data.id ? String(data.id) : null }
    },
  }
}

function createMemoryProvider() {
  const sent = []
  return {
    name: 'memory',
    sent,
    failNext: 0,
    async send({ to, message }) {
      if (this.failNext > 0) {
        this.failNext -= 1
        throw new Error('gagal sengaja (tes)')
      }
      sent.push({ to, message })
      return { ref: `mem-${sent.length}` }
    },
  }
}

/** Memilih penyedia dari environment: WHATSAPP_PROVIDER = console (bawaan) | fonnte. */
function createProviderFromEnv(env = process.env) {
  const name = (env.WHATSAPP_PROVIDER || 'console').toLowerCase()
  if (name === 'console') return createConsoleProvider()
  if (name === 'fonnte') return createFonnteProvider({ token: env.FONNTE_TOKEN })
  throw new Error(`WHATSAPP_PROVIDER tidak dikenal: "${name}". Pilih console atau fonnte.`)
}

module.exports = { createConsoleProvider, createFonnteProvider, createMemoryProvider, createProviderFromEnv }
