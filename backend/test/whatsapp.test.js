const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { normalizePhone, maskPhone } = require('../src/lib/phone')
const { createFonnteProvider, createMemoryProvider } = require('../src/notifications/providers')
const { MAX_ATTEMPTS } = require('../src/notifications/outbox')
const { startTestServer, booking, nextPhone } = require('./helpers')

const WEB_URL = 'https://pitstop.example.com'
let api
let provider

const tick = () => api.tick(provider)
const outbox = async (where = '') =>
  (await api.db.query(`SELECT jenis_pesan AS kind, no_tujuan AS recipient, status_kirim AS status, percobaan AS attempts, error_terakhir AS error, pesan AS message FROM notifikasi_whatsapp ${where} ORDER BY id_notifikasi`)).rows
const sentTo = (phone) => provider.sent.filter((item) => item.to === phone)

before(async () => {
  api = await startTestServer({ webUrl: WEB_URL })
  provider = createMemoryProvider()
})
after(async () => {
  await api.close()
})

describe('nomor WhatsApp', () => {
  test('berbagai cara menulis nomor menjadi format internasional', () => {
    for (const input of ['081234567890', '0812-3456-7890', '+62 812 3456 7890', '6281234567890', '81234567890', '(0812) 3456.7890']) assert.equal(normalizePhone(input), '6281234567890', input)
  })
  test('menolak yang bukan nomor seluler Indonesia', () => {
    for (const input of ['', 'abc', '12345', '021-5551234', '0712345678', '08123', '0812345678901234567', null, undefined]) assert.equal(normalizePhone(input), null, String(input))
  })
  test('nomor disamarkan saat ditampilkan', () => {
    assert.equal(maskPhone('6281234567890'), '0812••••890')
    assert.equal(maskPhone(null), null)
  })
})

describe('alur pesan: instruksi DP, bukti booking, invoice', () => {
  const phone = '081211110001'
  const to = normalizePhone(phone)
  let code

  test('booking dibuat: pesan INSTRUKSI DP (bukan invoice) masuk antrean lalu terkirim', async () => {
    const created = await api.post('/api/reservations', booking({ time: '14:00', customerPhone: phone, customerName: 'Budi Santoso', hairstyle: 'Low Taper Fade' }))
    assert.equal(created.status, 201)
    code = created.body.reservation.code
    assert.deepEqual(created.body.reservation.whatsapp, { to: '0812••••001', status: 'pending' })

    const queued = await outbox(`WHERE no_tujuan = '${to}'`)
    assert.deepEqual(queued.map((row) => [row.kind, row.status]), [['instruksi_dp', 'menunggu']])

    await tick()
    const message = sentTo(to)[0].message
    for (const expected of ['BOOKING DITAHAN, MENUNGGU DP', `*${code}*`, 'Budi Santoso', 'Haircut Dewasa (45 menit)', 'Rabu, 25 Nov 2026 · 14.00 WIB', 'Kapster: Rizky', 'Total biaya: Rp 50.000', 'DP yang dibayar: Rp 25.000', 'Bayar sebelum: *25 Nov 11.00 WIB*', 'hubungi kasir', `${WEB_URL}/cek-reservasi?kode=${code}`]) {
      assert.ok(message.includes(expected), `harus memuat: ${expected}\n${message}`)
    }
    assert.ok(!message.includes('INVOICE'), 'invoice baru dikirim setelah pelunasan')
    const lookup = await api.post('/api/reservations/lookup', { code, phone })
    assert.deepEqual(lookup.body.reservation.whatsapp, { to: '0812••••001', status: 'sent' })
    assert.deepEqual(await tick(), { expired: 0, confirmed: 0, invoices: 0, reminders: 0, sent: 0, failed: 0 }, 'tidak dikirim dua kali')
  })

  test('cara bayar dari pengaturan ikut tampil di pesan', async () => {
    await api.db.query(`UPDATE settings SET value = 'Transfer BCA 123-456 a.n. Pit Stop' WHERE key = 'dp_instruksi'`)
    const created = await api.post('/api/reservations', booking({ date: '2026-11-26', time: '11:00', barberId: 'bima', customerPhone: '081211110002' }))
    await tick()
    assert.ok(sentTo(normalizePhone('081211110002'))[0].message.includes('Cara bayar: Transfer BCA 123-456 a.n. Pit Stop'))
    assert.equal(created.body.reservation.dp.instruction, 'Transfer BCA 123-456 a.n. Pit Stop')
    await api.db.query(`UPDATE settings SET value = '' WHERE key = 'dp_instruksi'`)
  })

  test('admin konfirmasi DP: BUKTI BOOKING dikirim sekali, dengan DP dan sisa pembayaran', async () => {
    await api.confirmDp(code)
    const run = await tick()
    assert.deepEqual([run.confirmed, run.sent], [1, 1])
    const message = sentTo(to).at(-1).message
    for (const expected of ['BUKTI BOOKING', `*${code}*`, 'Low Taper Fade', 'DP: Rp 25.000 (sudah dibayar)', 'Sisa dibayar di kasir: *Rp 25.000*']) assert.ok(message.includes(expected), expected)
    assert.deepEqual(await tick(), { expired: 0, confirmed: 0, invoices: 0, reminders: 0, sent: 0, failed: 0 }, 'bukti booking hanya sekali')
  })

  test('pelunasan dicatat admin: INVOICE terbit (satu per booking) dan dikirim', async () => {
    await api.settle(code)
    const run = await tick()
    assert.deepEqual([run.invoices, run.sent], [1, 1])
    const invoice = (await api.db.query(`SELECT i.nomor_invoice AS nomor, round(i.total_tagihan)::int AS total FROM invoice i JOIN booking b ON b.id_booking = i.id_booking WHERE b.kode_booking = $1`, [code])).rows[0]
    assert.match(invoice.nomor, /^INV-20261125-0001$/)
    assert.equal(invoice.total, 50000)
    const message = sentTo(to).at(-1).message
    for (const expected of ['*INVOICE*', 'INV-20261125-0001', `Kode booking: ${code}`, 'Total tagihan: Rp 50.000', 'DP: Rp 25.000', 'Status: *LUNAS*']) assert.ok(message.includes(expected), expected)
    assert.deepEqual(await tick(), { expired: 0, confirmed: 0, invoices: 0, reminders: 0, sent: 0, failed: 0 }, 'invoice hanya sekali')
    assert.equal((await api.db.query('SELECT count(*)::int AS n FROM invoice')).rows[0].n, 1)
  })

  test('batal oleh pelanggan mengirim kabar, dan batal kedua tidak mengirim ulang', async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-27', time: '13:00', barberId: 'andi', customerPhone: '081211110003' }))
    await tick()
    const cancel = () => api.post(`/api/reservations/${created.body.reservation.code}/cancel`, { phone: '081211110003' })
    assert.equal((await cancel()).status, 200)
    await tick()
    const to3 = normalizePhone('081211110003')
    assert.ok(sentTo(to3).at(-1).message.includes('BOOKING DIBATALKAN'))
    const count = sentTo(to3).length
    assert.equal((await cancel()).status, 200)
    await tick()
    assert.equal(sentTo(to3).length, count)
  })
})

describe('pengiriman gagal', () => {
  test('dicoba ulang dengan jeda, lalu terkirim saat penyedia pulih', async () => {
    const phone = '081211110010'
    const created = await api.post('/api/reservations', booking({ date: '2026-11-28', time: '15:00', barberId: 'rizky', customerPhone: phone }))
    const code = created.body.reservation.code
    provider.failNext = 2
    const sentBefore = provider.sent.length

    // antrean tes berisi pesan lain juga: kosongkan dulu dengan beberapa putaran, hitung hanya milik booking ini
    const mine = () => outbox(`WHERE pesan LIKE '%${code}%'`)
    assert.deepEqual((await tick()).failed >= 1, true)
    let row = (await mine())[0]
    assert.ok(row.status === 'menunggu' && row.attempts >= 1)
    assert.match(row.error ?? '', /gagal sengaja/)
    api.advance(1) // lewat jeda 30 detik
    await tick()
    api.advance(5) // lewat jeda 2 menit
    await tick()
    api.advance(5)
    await tick()
    row = (await mine())[0]
    assert.deepEqual([row.status, row.error], ['terkirim', null])
    assert.ok(provider.sent.length > sentBefore)
    api.at('2026-11-25T02:00:00Z')
  })

  test('terus gagal: ditandai gagal setelah batas percobaan, dan booking tetap berhasil', async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-28', time: '16:00', barberId: 'rizky', customerPhone: '081211110011' }))
    assert.equal(created.status, 201, 'WhatsApp bermasalah tidak menggagalkan booking')
    const code = created.body.reservation.code
    provider.failNext = 1000
    for (let round = 0; round < MAX_ATTEMPTS + 2; round++) {
      api.advance(120)
      await tick()
    }
    provider.failNext = 0
    const row = (await outbox(`WHERE pesan LIKE '%${code}%'`))[0]
    assert.deepEqual([row.status, row.attempts], ['gagal', MAX_ATTEMPTS])
    api.at('2026-11-25T02:00:00Z')
    const lookup = await api.post('/api/reservations/lookup', { code, phone: '081211110011' })
    assert.equal(lookup.body.reservation.whatsapp.status, 'failed')
  })
})

describe('pengingat', () => {
  let code
  const phone = '081211110020'
  before(async () => {
    api.at('2026-11-25T02:00:00Z')
    const created = await api.post('/api/reservations', booking({ date: '2026-11-29', time: '14:00', barberId: 'rizky', customerPhone: phone }))
    code = created.body.reservation.code
    await api.confirmDp(code)
    await tick()
  })

  test('dikirim sekali saat jadwal tinggal 2 jam, hanya untuk booking terkonfirmasi', async () => {
    api.at('2026-11-29T03:00:00Z') // Minggu 10:00 WIB, 4 jam sebelum 14:00
    assert.equal((await tick()).reminders, 0)
    api.at('2026-11-29T05:30:00Z') // 12:30 WIB, 1,5 jam sebelum
    const first = await tick()
    assert.equal(first.reminders >= 1, true)
    const reminder = sentTo(normalizePhone(phone)).at(-1).message
    for (const expected of ['PENGINGAT BOOKING', 'Halo Budi Santoso', code, '14.00 WIB']) assert.ok(reminder.includes(expected), expected)
    const count = sentTo(normalizePhone(phone)).length
    await tick()
    assert.equal(sentTo(normalizePhone(phone)).length, count, 'pengingat hanya sekali')
  })

  test('booking yang masih menunggu DP tidak diingatkan', async () => {
    api.at('2026-11-25T02:00:00Z')
    const created = await api.post('/api/reservations', booking({ date: '2026-11-25', time: '16:00', barberId: 'bima', customerPhone: '081211110021' }))
    assert.equal(created.status, 201)
    api.at('2026-11-25T07:00:00Z') // 14:00 WIB, 2 jam sebelum 16:00, DP belum dibayar
    api.advance(-1) // masih dalam batas hold? 07:00Z lewat hold 120 menit dari 02:00Z, jadi booking sudah kedaluwarsa
    await tick()
    const kinds = (await outbox(`WHERE no_tujuan = '${normalizePhone('081211110021')}'`)).map((row) => row.kind)
    assert.ok(!kinds.includes('pengingat'), kinds.join(','))
    api.at('2026-11-25T02:00:00Z')
  })

  test('mengubah jadwal mengatur ulang pengingat untuk jadwal baru', async () => {
    api.at('2026-11-29T05:40:00Z') // setelah pengingat pertama
    const changed = await api.post(`/api/reservations/${code}/reschedule`, { phone, barberId: 'rizky', date: '2026-12-01', time: '19:00' })
    assert.equal(changed.status, 200)
    await tick()
    api.at('2026-12-01T10:30:00Z') // 17:30 WIB, 1,5 jam sebelum 19:00
    const result = await tick()
    assert.equal(result.reminders >= 1, true, 'pengingat baru untuk jadwal baru')
    assert.ok(sentTo(normalizePhone(phone)).at(-1).message.includes('19.00 WIB'))
    api.at('2026-11-25T02:00:00Z')
  })
})

describe('penyedia Fonnte', () => {
  const okFetch = (capture) => async (url, init) => {
    capture.url = url
    capture.init = init
    return { ok: true, status: 200, json: async () => ({ status: true, id: ['123', '456'], process: 'pending' }) }
  }

  test('mengirim ke alamat dan format yang benar', async () => {
    const capture = {}
    const fonnte = createFonnteProvider({ token: 'TOKEN-RAHASIA', fetchImpl: okFetch(capture) })
    const result = await fonnte.send({ to: '6281234567890', message: 'halo' })
    assert.equal(capture.url, 'https://api.fonnte.com/send')
    assert.equal(capture.init.method, 'POST')
    assert.equal(capture.init.headers.Authorization, 'TOKEN-RAHASIA')
    assert.equal(capture.init.body.get('target'), '6281234567890')
    assert.equal(capture.init.body.get('message'), 'halo')
    assert.equal(result.ref, '123,456')
  })

  test('penolakan dan gangguan jaringan menjadi error yang jelas', async () => {
    const rejected = createFonnteProvider({ token: 't', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: false, reason: 'device disconnected' }) }) })
    await assert.rejects(rejected.send({ to: '62812', message: 'x' }), /Fonnte menolak pesan: device disconnected/)
    const down = createFonnteProvider({ token: 't', fetchImpl: async () => { throw new Error('ECONNREFUSED') } })
    await assert.rejects(down.send({ to: '62812', message: 'x' }), /Fonnte tidak terjangkau: ECONNREFUSED/)
    const html = createFonnteProvider({ token: 't', fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new Error('bukan json') } }) })
    await assert.rejects(html.send({ to: '62812', message: 'x' }), /HTTP 502/)
  })

  test('tanpa token ditolak sejak awal', () => {
    assert.throws(() => createFonnteProvider({ token: '' }), /FONNTE_TOKEN/)
  })
})
