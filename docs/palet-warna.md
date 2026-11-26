# Palet warna web customer Pit Stop

Palet resmi, disepakati 26 November 2026. Dua netral dan satu aksen, di atas latar navy halaman. Nilainya ada sebagai token di
`frontend/app/globals.css`; **jangan menulis kode warna manual di komponen**, pakai tokennya.

## Warna inti

| Nama | Kode | Token | Dipakai untuk |
|---|---|---|---|
| **Porcelain** | `#E8E8ED` | `--paper`, kelas `bg-paper` | Kotak interaktif (form, tiket, riwayat), teks di atas latar gelap |
| **Carbon** | `#17181D` | `--ink`, kelas `text-ink` | Teks di atas kertas, garis finish, modul QR |
| **Ultramarine** | `#004CFF` | `--primary` | Isian aksen: tombol utama (satu per layar), pilihan terpilih di kertas, stub tiket |
| Biru terang | `#7AA2FF` | `--accent` (di halaman gelap) | Teks dan garis biru di atas navy (tautan, kata kunci judul) |
| Navy halaman | `#091C33` | `--background` | Latar halaman. Selang-seling `#0D2540` (`.theme-alt`), kartu gelap `#14335A` |

Proporsi: netral (navy, Porcelain, Carbon) sekitar 90% layar, Ultramarine sekitar 10%.

## Dua skema di dalam halaman

- **Halaman gelap** (bawaan): latar navy, teks Porcelain, aksen biru terang `#7AA2FF`.
- **`.surface-paper`**: kotak Porcelain solid di atas halaman gelap. Di dalamnya semua token beralih ke skema terang (teks Carbon, aksen
  Ultramarine, garis kontrol `#6F7380`), jadi komponen yang memakai token otomatis terbaca. Dipakai untuk form reservasi, tiket ringkasan,
  Cek Booking, Ubah Jadwal, Riwayat, dan dialog OTP.
- **`.surface-dark`**: pulau gelap di dalam kotak kertas (mis. kartu kapster); mengembalikan skema gelap bawaan.

Permukaan selalu **solid**: tanpa transparansi, blur, atau glassmorphism di form dan tiket. Glass hanya boleh di landing yang memang mengejar estetika.

## Status (satu penanda kecil, bukan blok warna)

| Keadaan | Di atas kertas | Di atas gelap |
|---|---|---|
| Menunggu / perlu tindakan | teks `#92400E` di chip `amber-100`; panel DP `#FFF6E0` + garis `#F59E0B` | teks `amber-200` |
| Berhasil / terkonfirmasi | `#047857` | `#34D399` |
| Gagal / dibatalkan | `#B42318` | `#FF6B5A` |

## Kontras (WCAG), sudah diukur

| Pasangan | Rasio | Tingkat |
|---|---|---|
| Porcelain di atas Carbon, dan sebaliknya | 14,5:1 | AAA |
| Putih di atas Ultramarine (tombol) | 6,0:1 | AA |
| Ultramarine di atas Porcelain (teks, angka) | 4,9:1 | AA |
| Biru terang `#7AA2FF` di atas Carbon | 7,1:1 | AAA |
| Abu redup `#5B5F6B` di atas Porcelain | 5,2:1 | AA |
| Abu redup `#A0A3AD` di atas Carbon | 7,0:1 | AAA |
| Garis kontrol `#6F7380` di atas Porcelain | 3,1:1 | UI |

**Jangan** memakai Ultramarine murni `#004CFF` sebagai teks di atas gelap (hanya 2,9:1); pakai biru terang `#7AA2FF`.

## Aturan pakai

1. Satu tombol utama (biru) per layar. Aksi lain berupa tombol garis atau tautan.
2. Sorotan (nomor langkah, pilihan terpilih, garis aktif) memakai aksen biru, bukan warna lain.
3. Warna status baru muncul saat ada kejadian, bukan sebagai hiasan tetap.
4. Tema area admin (`.admin-theme`) terpisah dan tidak mengikuti dokumen ini.
