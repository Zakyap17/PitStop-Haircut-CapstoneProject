const crypto = require('node:crypto')

/**
 * Klien Midtrans (Snap) tanpa SDK: membuat transaksi pembayaran, membaca status transaksi, dan memeriksa tanda tangan notifikasi.
 * Dokumentasi: https://docs.midtrans.com/ (Snap API, Get Transaction Status, HTTP Notification).
 *
 * Kunci server (MIDTRANS_SERVER_KEY) hanya dipakai di sini, di backend. Kunci sandbox berawalan "SB-Mid-server-".
 */
const URLS = {
  sandbox: { snap: 'https://app.sandbox.midtrans.com/snap/v1/transactions', api: 'https://api.sandbox.midtrans.com/v2' },
  production: { snap: 'https://app.midtrans.com/snap/v1/transactions', api: 'https://api.midtrans.com/v2' },
}

class MidtransError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'MidtransError'
    this.status = status
    this.body = body
  }
}

/** Tanda tangan notifikasi: SHA512(order_id + status_code + gross_amount + serverKey), heksadesimal. */
function signatureFor(serverKey, { order_id, status_code, gross_amount }) {
  return crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex')
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''))
  const right = Buffer.from(String(b ?? ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

/**
 * @param {{ serverKey: string, production?: boolean, fetchImpl?: typeof fetch, timeoutMs?: number }} options
 *   fetchImpl bisa diganti di tes supaya tidak memanggil jaringan.
 */
function createMidtrans({ serverKey, production = false, fetchImpl = fetch, timeoutMs = 15_000 }) {
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY kosong.')
  const urls = production ? URLS.production : URLS.sandbox
  const authorization = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`

  async function call(url, init = {}) {
    let response
    try {
      response = await fetchImpl(url, {
        ...init,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authorization, ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      throw new MidtransError(`Midtrans tidak terjangkau: ${error.message}`)
    }
    const body = await response.json().catch(() => null)
    return { httpStatus: response.status, body }
  }

  return {
    name: 'midtrans',
    sandbox: !production,

    /**
     * Membuat transaksi Snap. Mengembalikan token dan alamat halaman bayar (redirectUrl) tempat pelanggan memilih
     * QRIS, virtual account, atau e-wallet.
     */
    async createTransaction({ orderId, amount, customerName, customerPhone, itemName, expiryMinutes, finishUrl }) {
      const payload = {
        transaction_details: { order_id: orderId, gross_amount: Math.round(amount) },
        item_details: [{ id: 'dp', price: Math.round(amount), quantity: 1, name: String(itemName).slice(0, 50) }],
        customer_details: { first_name: String(customerName).slice(0, 50), phone: String(customerPhone ?? '').slice(0, 19) },
        expiry: { unit: 'minutes', duration: Math.max(1, Math.floor(expiryMinutes)) },
      }
      if (finishUrl) payload.callbacks = { finish: finishUrl }
      const { httpStatus, body } = await call(urls.snap, { method: 'POST', body: JSON.stringify(payload) })
      if (httpStatus >= 400 || !body?.token || !body?.redirect_url) {
        const detail = body?.error_messages?.join('; ') || body?.status_message || `HTTP ${httpStatus}`
        throw new MidtransError(`Midtrans menolak pembuatan transaksi: ${detail}`, { status: httpStatus, body })
      }
      return { token: body.token, redirectUrl: body.redirect_url }
    },

    /**
     * Status transaksi dari server Midtrans (sumber kebenaran). Mengembalikan null kalau transaksi itu belum ada di Midtrans
     * (pelanggan belum membuka halaman bayar), dan melempar galat untuk masalah lain.
     */
    async getStatus(orderId) {
      const { httpStatus, body } = await call(`${urls.api}/${encodeURIComponent(orderId)}/status`)
      if (String(body?.status_code) === '404' || httpStatus === 404) return null
      if (httpStatus >= 400 || !body?.transaction_status) {
        throw new MidtransError(`Midtrans gagal memberi status transaksi: ${body?.status_message ?? `HTTP ${httpStatus}`}`, { status: httpStatus, body })
      }
      return body
    },

    verifySignature(notification) {
      if (!notification || !notification.signature_key) return false
      return safeEqual(notification.signature_key, signatureFor(serverKey, notification))
    },
  }
}

/** Membuat klien dari environment, atau null kalau MIDTRANS_SERVER_KEY kosong (pembayaran online nonaktif). */
function createMidtransFromEnv(env = process.env) {
  const serverKey = (env.MIDTRANS_SERVER_KEY || '').trim()
  if (!serverKey) return null
  const production = env.MIDTRANS_IS_PRODUCTION === 'true'
  // Kunci sandbox lama berawalan "SB-Mid-server-"; kunci sandbox terbaru berawalan "Mid-server-" sama seperti kunci produksi,
  // jadi awalan tidak bisa dipakai untuk membedakannya. Yang pasti salah hanya kunci "SB-" di mode produksi.
  // Kunci dan lingkungan yang tidak cocok ditolak Midtrans sendiri (401), tidak ada uang yang bisa bergerak.
  if (production && serverKey.startsWith('SB-')) throw new Error('MIDTRANS_IS_PRODUCTION=true tetapi MIDTRANS_SERVER_KEY adalah kunci sandbox (berawalan SB-).')
  return createMidtrans({ serverKey, production })
}

module.exports = { createMidtrans, createMidtransFromEnv, signatureFor, MidtransError }
