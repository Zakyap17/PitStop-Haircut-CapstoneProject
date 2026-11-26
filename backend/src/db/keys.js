/**
 * Kunci publik dan kolom opsional, ditulis sebagai potongan SQL yang bekerja di dua bentuk skema:
 *
 *  - Skema lama (migrasi 006 kita): layanan.slug, galeri.slug, capster.jabatan, capster.hari_libur ada.
 *  - Skema bersama sekarang di Supabase (setelah migrasi sisi internal): kolom-kolom itu tidak ada lagi,
 *    sedangkan capster.slug masih ada tetapi boleh kosong.
 *
 * Pola `to_jsonb(alias)->>'kolom'` membaca kolom kalau ada dan menghasilkan NULL kalau tidak ada, tanpa error. Kunci yang tidak
 * tersimpan diturunkan dari data yang selalu ada (nama layanan, nama file gambar, nama capster), dan hasilnya sama dengan slug
 * yang dipakai web ("Premium Fade" -> premium-fade, /images/cuts/buzz-and-beard.png -> buzz-and-beard).
 * Alias tabel selalu diberikan oleh pemanggil, mis. serviceKey('l').
 */
const slugify = (expression) => `trim(both '-' from regexp_replace(lower(${expression}), '[^a-z0-9]+', '-', 'g'))`

/** Kunci layanan di web (mis. "haircut-dewasa"). */
const serviceKey = (alias) => `COALESCE(NULLIF(to_jsonb(${alias})->>'slug', ''), ${slugify(`${alias}.nama_layanan`)})`

/** Kunci gaya rambut di galeri (mis. "skin-fade"), dari slug bila ada, kalau tidak dari nama file gambar, lalu dari judul. */
const galleryKey = (alias) =>
  `COALESCE(NULLIF(to_jsonb(${alias})->>'slug', ''), NULLIF(${slugify(String.raw`regexp_replace(${alias}.file_gambar, '^.*/|\.[A-Za-z0-9]+$', '', 'g')`)}, ''), ${slugify(`${alias}.judul`)})`

/** Kunci capster (mis. "rizky"). slug boleh kosong untuk capster baru, jadi diturunkan dari nama dan id. */
const capsterKey = (alias) => `COALESCE(NULLIF(${alias}.slug, ''), ${slugify(`${alias}.nama_capster`)} || '-' || ${alias}.id_capster)`

/** Jabatan capster; bawaan "Capster" kalau kolomnya tidak ada atau kosong. */
const capsterRole = (alias) => `COALESCE(NULLIF(to_jsonb(${alias})->>'jabatan', ''), 'Capster')`

/** Pengalaman (tahun); NULL kalau kolomnya tidak ada. */
const capsterExperience = (alias) => `(to_jsonb(${alias})->>'pengalaman_tahun')::int`

/** Hari libur mingguan (angka hari); larik kosong kalau kolomnya tidak ada. Libur per tanggal ada di jadwal_capster. */
const capsterOffDays = (alias) => `ARRAY(SELECT (jsonb_array_elements_text(to_jsonb(${alias})->'hari_libur'))::int)`

module.exports = { serviceKey, galleryKey, capsterKey, capsterRole, capsterExperience, capsterOffDays }
