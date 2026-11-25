const { createApp } = require('../src/app')
const { createDb } = require('../src/db')
const { runMigrations } = require('../src/db/migrate')

/** 2026-11-25 adalah hari Rabu. 02:00 UTC = 09:00 WIB. */
const WEDNESDAY_9AM = '2026-11-25T02:00:00Z'

/** Menjalankan API di port acak dengan database PGlite baru dan jam yang bisa digeser. */
async function startTestServer({ now = WEDNESDAY_9AM, limits = { write: 1000, access: 1000 }, webUrl } = {}) {
  const db = await createDb({ databaseUrl: '', dataDir: undefined })
  await runMigrations(db)
  const clock = { current: new Date(now) }
  const app = createApp({ db, clock: () => clock.current, limits, webUrl })
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
    close: async () => {
      await new Promise((resolve) => server.close(resolve))
      await db.close()
    },
  }
}

const booking = (overrides = {}) => ({
  serviceId: 'haircut-dewasa',
  barberId: 'rizky',
  date: '2026-11-25',
  time: '14:00',
  customerName: 'Budi Santoso',
  customerEmail: 'budi@example.com',
  customerPhone: '081234567890',
  ...overrides,
})

module.exports = { startTestServer, booking, WEDNESDAY_9AM }
