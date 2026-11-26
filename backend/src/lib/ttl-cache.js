/**
 * Cache singkat di memori untuk data konfigurasi yang jarang berubah (pengaturan toko, jam slot).
 *
 * Hanya berlaku untuk database jauh (driver "pg", mis. Supabase), karena di sana tiap query adalah satu kali bolak-balik jaringan yang
 * bisa 0,2 sampai 3 detik. Database tertanam (dev dan tes) tidak memakai cache supaya perubahan langsung terlihat.
 * Data dari admin (pengaturan, jam slot) baru terlihat di web paling lama `ttlMs` kemudian. Data yang menyangkut uang atau jadwal
 * (harga layanan, ketersediaan kapster, booking) sengaja tidak di-cache.
 */
const stores = new WeakMap()

function cached(db, key, ttlMs, load) {
  if (db.driver !== 'pg') return load()
  let store = stores.get(db)
  if (!store) {
    store = new Map()
    stores.set(db, store)
  }
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expiresAt > now) return hit.promise
  // Yang gagal tidak disimpan, jadi permintaan berikutnya mencoba lagi.
  const promise = load().catch((error) => {
    if (store.get(key)?.promise === promise) store.delete(key)
    throw error
  })
  store.set(key, { promise, expiresAt: now + ttlMs })
  return promise
}

module.exports = { cached }
