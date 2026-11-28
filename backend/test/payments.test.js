const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createMidtrans, createMidtransFromEnv, signatureFor } = require('../src/payments/midtrans')
const { codeFromOrderId } = require('../src/services/payments')
const { createMemoryProvider } = require('../src/notifications/providers')
const { normalizePhone } = require('../src/lib/phone')
const { startTestServer, booking, nextPhone } = require('./helpers')

const SERVER_KEY = 'SB-Mid-server-TESTKEY'

/** Midtrans tiruan di level HTTP: mencatat permintaan dan menjawab sesuai isi `transactions`. */
function fakeMidtransFetch() {
  const calls = []
  const transactions = new Map() // order_id -> isi respons status
  const fail = { snap: null, status: null }
  const impl = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers, body })
    const reply = (status, json) => ({ status, json: async () => json })
    if (url.includes('/snap/v1/transactions')) {
      if (fail.snap) return reply(fail.snap, { error_messages: ['Access denied due to unauthorized transaction, please check client or server key'] })
      return reply(201, { token: `tok-${body.transaction_details.order_id}`, redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/tok-${body.transaction_details.order_id}` })
    }
    const orderId = decodeURIComponent(url.split('/v2/')[1].replace('/status', ''))
    if (fail.status) return reply(fail.status, { status_message: 'internal error' })
    const found = transactions.get(orderId)
    return found ? reply(200, found) : reply(404, { status_code: '404', status_message: "Transaction doesn't exist." })
  }
  return { impl, calls, transactions, fail }
}

/** Notifikasi bertanda tangan seperti yang dikirim Midtrans. */
function notification(fields) {
  const base = { order_id: fields.order_id, status_code: '200', gross_amount: '25000.00', transaction_status: 'settlement' }
  const body = { ...base, ...fields }
  return { ...body, signature_key: signatureFor(SERVER_KEY, body) }
}

/** Respons status dari server Midtrans untuk sebuah pembayaran. */
const settled = (orderId, extra = {}) => ({
  order_id: orderId,
  status_code: '200',
  transaction_status: 'settlement',
  payment_type: 'qris',
  gross_amount: '25000.00',
  transaction_time: '2026-11-25 09:05:00',
  fraud_status: 'accept',
  ...extra,
})

describe('klien Midtrans', () => {
  test('tanda tangan: sama dengan SHA512(order_id + status_code + gross_amount + serverKey)', () => {
    const crypto = require('node:crypto')
    const n = { order_id: 'PS-1234-abc', status_code: '200', gross_amount: '25000.00' }
    const expected = crypto.createHash('sha512').update('PS-1234-abc' + '200' + '25000.00' + SERVER_KEY).digest('hex')
    assert.equal(signatureFor(SERVER_KEY, n), expected)
    const client = createMidtrans({ serverKey: SERVER_KEY, fetchImpl: async () => ({}) })
    assert.equal(client.verifySignature({ ...n, signature_key: expected }), true)
    assert.equal(client.verifySignature({ ...n, signature_key: expected.replace(/.$/, '0') }), false)
    assert.equal(client.verifySignature({ ...n, gross_amount: '1.00', signature_key: expected }), false, 'nominal diubah')
    assert.equal(client.verifySignature({ ...n }), false, 'tanpa tanda tangan')
    assert.equal(client.verifySignature(null), false)
  })

  test('membuat transaksi: kunci server di header Basic, nominal bulat, batas bayar, dan alamat kembali', async () => {
    const fake = fakeMidtransFetch()
    const client = createMidtrans({ serverKey: SERVER_KEY, fetchImpl: fake.impl })
    const result = await client.createTransaction({
      orderId: 'PS-1234-abc',
      amount: 25000,
      customerName: 'Budi',
      customerPhone: '6281234567890',
      itemName: 'DP Premium Fade',
      expiryMinutes: 42.9,
      finishUrl: 'https://pitstop.example.com/e-ticket',
    })
    assert.equal(result.redirectUrl, 'https://app.sandbox.midtrans.com/snap/v4/redirection/tok-PS-1234-abc')
    const call = fake.calls[0]
    assert.equal(call.headers.Authorization, `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`)
    assert.deepEqual(call.body.transaction_details, { order_id: 'PS-1234-abc', gross_amount: 25000 })
    assert.deepEqual(call.body.expiry, { unit: 'minutes', duration: 42 })
    assert.equal(call.body.callbacks.finish, 'https://pitstop.example.com/e-ticket')
    assert.ok(call.url.startsWith('https://app.sandbox.midtrans.com/'), 'sandbox')
  })

  test('kunci salah: pesan galat dari Midtrans ikut terbawa, kunci tidak bocor', async () => {
    const fake = fakeMidtransFetch()
    fake.fail.snap = 401
    const client = createMidtrans({ serverKey: SERVER_KEY, fetchImpl: fake.impl })
    await assert.rejects(client.createTransaction({ orderId: 'x', amount: 1, customerName: 'a', itemName: 'b', expiryMinutes: 5 }), (error) => {
      assert.match(error.message, /unauthorized/i)
      assert.ok(!error.message.includes(SERVER_KEY))
      return true
    })
  })

  test('status: transaksi yang belum ada di Midtrans dijawab null, bukan galat', async () => {
    const fake = fakeMidtransFetch()
    const client = createMidtrans({ serverKey: SERVER_KEY, fetchImpl: fake.impl })
    assert.equal(await client.getStatus('PS-0000-zzz'), null)
    fake.fail.status = 500
    await assert.rejects(client.getStatus('PS-0000-zzz'), /gagal memberi status/)
  })

  test('dari environment: kosong = nonaktif, kunci produksi di mode sandbox ditolak', () => {
    assert.equal(createMidtransFromEnv({}), null)
    assert.equal(createMidtransFromEnv({ MIDTRANS_SERVER_KEY: SERVER_KEY }).sandbox, true)
    // Kunci sandbox terbaru tidak berawalan SB-, jadi tetap diterima dan dipakai di lingkungan sandbox.
    assert.equal(createMidtransFromEnv({ MIDTRANS_SERVER_KEY: 'Mid-server-abc' }).sandbox, true)
    assert.equal(createMidtransFromEnv({ MIDTRANS_SERVER_KEY: 'Mid-server-abc', MIDTRANS_IS_PRODUCTION: 'true' }).sandbox, false)
    assert.throws(() => createMidtransFromEnv({ MIDTRANS_SERVER_KEY: SERVER_KEY, MIDTRANS_IS_PRODUCTION: 'true' }), /kunci sandbox/)
  })

  test('kode booking diambil dari order id', () => {
    assert.equal(codeFromOrderId('PS-1234-lq3k9z'), 'PS-1234')
    assert.equal(codeFromOrderId('PS-1234'), 'PS')
  })
})

describe('pembayaran DP online', () => {
  let api
  let fake
  let provider
  const WEB_URL = 'https://pitstop.example.com'

  before(async () => {
    fake = fakeMidtransFetch()
    api = await startTestServer({
      webUrl: WEB_URL,
      midtrans: createMidtrans({ serverKey: SERVER_KEY, fetchImpl: fake.impl }),
      // Meniru tabel transaksi milik web internal (hanya ada di database bersama), supaya sinkronnya ikut teruji.
      afterMigrate: async (db) => {
        await db.exec(`CREATE TABLE transaksi (
          id_transaksi bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, kode_transaksi varchar(64) NOT NULL UNIQUE,
          jenis_transaksi varchar(24) NOT NULL, id_booking bigint UNIQUE REFERENCES booking(id_booking), id_customer bigint, id_capster bigint,
          total_tagihan numeric NOT NULL, total_dibayar numeric NOT NULL DEFAULT 0, status_transaksi varchar(32) NOT NULL DEFAULT 'belum',
          status_layanan varchar(32) NOT NULL DEFAULT 'menunggu', metode_pembayaran varchar(48), created_at timestamptz NOT NULL DEFAULT now())`)
      },
    })
    provider = createMemoryProvider()
  })
  after(async () => {
    await api.close()
  })

  /** Booking baru (menunggu DP) lalu mulai pembayaran online. */
  async function startPaid(overrides = {}) {
    const phone = nextPhone()
    const created = await api.post('/api/reservations', booking({ customerPhone: phone, ...overrides }))
    assert.equal(created.status, 201, JSON.stringify(created.body))
    const code = created.body.reservation.code
    const pay = await api.post(`/api/reservations/${code}/pay`, { phone })
    return { phone, code, pay, reservation: created.body.reservation }
  }
  const lookup = async (code, phone) => (await api.post('/api/reservations/lookup', { code, phone })).body.reservation
  const dpRow = async (code) =>
    (await api.db.query(`SELECT p.status_pembayaran AS status, p.metode_pembayaran AS method, p.ref_gateway AS ref, p.waktu_bayar FROM pembayaran p JOIN booking b ON b.id_booking = p.id_booking WHERE b.kode_booking = $1 AND p.jenis_pembayaran = 'dp'`, [code])).rows[0]

  test('config: online aktif kalau Midtrans terpasang', async () => {
    const response = await api.get('/api/payments/config')
    assert.deepEqual(response.body, { online: true, provider: 'midtrans', sandbox: true })
  })

  test('bayar online: transaksi dibuat dengan nominal DP dan batas bayar, order id disimpan', async () => {
    const { code, pay, reservation } = await startPaid({ time: '14:00' })
    assert.equal(pay.status, 201, JSON.stringify(pay.body))
    assert.ok(pay.body.redirectUrl.startsWith('https://app.sandbox.midtrans.com/'))
    assert.match(pay.body.orderId, new RegExp(`^${code}-[a-z0-9]+$`))
    const call = fake.calls.filter((c) => c.url.includes('/snap/')).at(-1)
    assert.equal(call.body.transaction_details.gross_amount, reservation.dp.nominal)
    assert.equal(call.body.callbacks.finish, `${WEB_URL}/e-ticket`)
    assert.equal(call.body.expiry.duration, pay.body.expiresInMinutes)
    assert.ok(pay.body.expiresInMinutes > 100 && pay.body.expiresInMinutes <= 120, `tahan 120 menit, sisa ${pay.body.expiresInMinutes}`)
    const row = await dpRow(code)
    assert.equal(row.method, 'midtrans')
    assert.equal(row.ref, pay.body.orderId)
    assert.equal(row.status, 'menunggu')
  })

  test('webhook settlement: DP dibayar, booking dikonfirmasi, bukti booking dikirim, transaksi internal tercatat', async () => {
    const { phone, code, pay } = await startPaid({ time: '15:00' })
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId))
    const hook = await api.post('/api/payments/midtrans/notification', notification({ order_id: pay.body.orderId }))
    assert.equal(hook.status, 200, JSON.stringify(hook.body))
    assert.equal(hook.body.result, 'paid')

    const after = await lookup(code, phone)
    assert.equal(after.status, 'dikonfirmasi')
    assert.equal(after.dp.status, 'dibayar')
    const row = await dpRow(code)
    assert.equal(row.method, 'midtrans:qris')
    assert.equal(new Date(row.waktu_bayar).toISOString(), '2026-11-25T02:05:00.000Z', 'waktu WIB dibaca benar (09:05 WIB = 02:05 UTC)')

    const trx = (await api.db.query(`SELECT total_dibayar::float8 AS paid, status_transaksi AS status, metode_pembayaran AS method FROM transaksi WHERE kode_transaksi = $1`, [`TRX-${code}`])).rows[0]
    assert.deepEqual(trx, { paid: after.dp.nominal, status: 'belum', method: 'QRIS' })

    await api.tick(provider)
    const proof = provider.sent.filter((m) => m.to === normalizePhone(phone) && /PS-\d+/.test(m.message))
    assert.ok(proof.length >= 1, 'bukti booking terkirim lewat worker setelah dikonfirmasi')
    const kinds = (await api.db.query(`SELECT jenis_pesan AS kind FROM notifikasi_whatsapp n JOIN booking b ON b.id_booking = n.id_booking WHERE b.kode_booking = $1`, [code])).rows.map((r) => r.kind)
    assert.ok(kinds.includes('bukti_booking'), kinds.join(','))
  })

  test('webhook dua kali: tidak diproses ulang, tidak ada transaksi ganda', async () => {
    const { code, pay } = await startPaid({ time: '16:00' })
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId))
    const body = notification({ order_id: pay.body.orderId })
    assert.equal((await api.post('/api/payments/midtrans/notification', body)).body.result, 'paid')
    assert.equal((await api.post('/api/payments/midtrans/notification', body)).body.result, 'already_paid')
    const count = (await api.db.query(`SELECT count(*)::int AS n FROM transaksi WHERE kode_transaksi = $1`, [`TRX-${code}`])).rows[0].n
    assert.equal(count, 1)
  })

  test('tanda tangan salah ditolak dan tidak mengubah apa pun', async () => {
    const { phone, code, pay } = await startPaid({ time: '17:00' })
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId))
    const forged = { ...notification({ order_id: pay.body.orderId }), signature_key: 'palsu' }
    const response = await api.post('/api/payments/midtrans/notification', forged)
    assert.equal(response.status, 403)
    assert.equal((await lookup(code, phone)).status, 'menunggu_pembayaran')
    const noSignature = await api.post('/api/payments/midtrans/notification', { order_id: pay.body.orderId, status_code: '200', gross_amount: '25000.00', transaction_status: 'settlement' })
    assert.equal(noSignature.status, 403)
  })

  test('isi notifikasi tidak dipercaya: yang menentukan status adalah bacaan dari server Midtrans', async () => {
    const { phone, code, pay } = await startPaid({ time: '19:00' })
    // Server Midtrans bilang masih pending, sedangkan "notifikasi" (bertanda tangan sah, tapi dimodifikasi) mengaku settlement.
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId, { transaction_status: 'pending', status_code: '201' }))
    const hook = await api.post('/api/payments/midtrans/notification', notification({ order_id: pay.body.orderId, transaction_status: 'settlement' }))
    assert.equal(hook.body.result, 'pending')
    assert.equal((await lookup(code, phone)).status, 'menunggu_pembayaran')
  })

  test('nominal tidak cocok dengan DP: tidak dikonfirmasi otomatis', async () => {
    const { phone, code, pay } = await startPaid({ time: '20:00' })
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId, { gross_amount: '5000.00' }))
    const hook = await api.post('/api/payments/midtrans/notification', notification({ order_id: pay.body.orderId, gross_amount: '5000.00' }))
    assert.equal(hook.body.result, 'amount_mismatch')
    assert.equal((await lookup(code, phone)).status, 'menunggu_pembayaran')
    assert.equal((await dpRow(code)).status, 'menunggu')
  })

  test('pending (virtual account dibuat) hanya mencatat metode; expire membiarkan pelanggan mencoba lagi', async () => {
    const { phone, code, pay } = await startPaid({ date: '2026-11-26', time: '10:00' })
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId, { transaction_status: 'pending', status_code: '201', payment_type: 'bank_transfer' }))
    assert.equal((await api.post('/api/payments/midtrans/notification', notification({ order_id: pay.body.orderId, status_code: '201' }))).body.result, 'pending')
    assert.equal((await dpRow(code)).method, 'midtrans:bank_transfer')

    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId, { transaction_status: 'expire', status_code: '407' }))
    assert.equal((await api.post('/api/payments/midtrans/notification', notification({ order_id: pay.body.orderId, status_code: '407' }))).body.result, 'ignored')
    assert.equal((await lookup(code, phone)).status, 'menunggu_pembayaran', 'booking tetap menunggu, slot masih ditahan')

    api.advance(1) // jam server maju sedikit supaya order id percobaan kedua berbeda
    const retry = await api.post(`/api/reservations/${code}/pay`, { phone })
    assert.equal(retry.status, 201)
    assert.notEqual(retry.body.orderId, pay.body.orderId)
  })

  test('sinkron saat pelanggan kembali dari halaman bayar (tanpa webhook)', async () => {
    const { phone, code, pay } = await startPaid({ date: '2026-11-26', time: '11:00' })
    const before = await api.post(`/api/reservations/${code}/pay/sync`, { phone })
    assert.equal(before.status, 200)
    assert.equal(before.body.result, 'ignored', 'Midtrans belum mengenal transaksinya')
    assert.equal(before.body.reservation.status, 'menunggu_pembayaran')

    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId))
    const synced = await api.post(`/api/reservations/${code}/pay/sync`, { phone })
    assert.equal(synced.body.result, 'paid')
    assert.equal(synced.body.reservation.status, 'dikonfirmasi')
    assert.equal(synced.body.reservation.dp.status, 'dibayar')
    assert.equal((await api.post(`/api/reservations/${code}/pay/sync`, { phone })).body.result, 'ignored', 'sudah dikonfirmasi: tidak ditanyakan lagi ke Midtrans')
  })

  test('akses dibatasi pemilik nomor, dan booking yang sudah dibayar tidak bisa dibayar lagi', async () => {
    const { phone, code, pay } = await startPaid({ date: '2026-11-26', time: '12:00' })
    const stranger = await api.post(`/api/reservations/${code}/pay`, { phone: nextPhone() })
    assert.equal(stranger.status, 404)
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId))
    await api.post('/api/payments/midtrans/notification', notification({ order_id: pay.body.orderId }))
    const again = await api.post(`/api/reservations/${code}/pay`, { phone })
    assert.equal(again.status, 409)
    assert.equal(again.body.error.code, 'not_awaiting_payment')
  })

  test('batas tahan hampir habis: tidak membuat transaksi', async () => {
    const { phone, code } = await startPaid({ date: '2026-11-26', time: '13:00' })
    api.advance(119) // 120 menit ditahan, sisa 1 menit
    const response = await api.post(`/api/reservations/${code}/pay`, { phone })
    assert.equal(response.status, 409)
    assert.equal(response.body.error.code, 'hold_expired')
  })

  test('Midtrans bermasalah: pelanggan mendapat pesan ramah, kunci tidak bocor', async () => {
    const phone = nextPhone()
    const created = await api.post('/api/reservations', booking({ customerPhone: phone, date: '2026-11-26', time: '14:00' }))
    fake.fail.snap = 401
    const response = await api.post(`/api/reservations/${created.body.reservation.code}/pay`, { phone })
    fake.fail.snap = null
    assert.equal(response.status, 502)
    assert.equal(response.body.error.code, 'payment_gateway_error')
    assert.ok(!JSON.stringify(response.body).includes(SERVER_KEY))
    assert.match(response.body.error.message, /transfer manual/)
  })

  test('uang masuk setelah booking dibatalkan: dicatat dibayar tetapi booking tidak dihidupkan lagi', async () => {
    const { phone, code, pay } = await startPaid({ date: '2026-11-26', time: '15:00' })
    await api.post(`/api/reservations/${code}/cancel`, { phone })
    fake.transactions.set(pay.body.orderId, settled(pay.body.orderId))
    const hook = await api.post('/api/payments/midtrans/notification', notification({ order_id: pay.body.orderId }))
    assert.equal(hook.body.result, 'paid_after_cancel')
    assert.equal((await lookup(code, phone)).status, 'dibatalkan')
  })
})

describe('tanpa Midtrans (kunci belum diisi)', () => {
  let api
  before(async () => {
    api = await startTestServer()
  })
  after(async () => {
    await api.close()
  })

  test('config online false dan rute bayar membalas 503 dengan arahan transfer manual', async () => {
    assert.deepEqual((await api.get('/api/payments/config')).body, { online: false, provider: null, sandbox: null })
    const phone = nextPhone()
    const created = await api.post('/api/reservations', booking({ customerPhone: phone }))
    const response = await api.post(`/api/reservations/${created.body.reservation.code}/pay`, { phone })
    assert.equal(response.status, 503)
    assert.match(response.body.error.message, /transfer manual/)
    assert.equal((await api.post('/api/payments/midtrans/notification', { order_id: 'x' })).status, 503)
  })
})
