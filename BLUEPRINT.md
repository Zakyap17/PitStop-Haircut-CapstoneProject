# PITSTOP HAIRCUT — PROJECT BLUEPRINT

> **Project:** Pitstop Barbershop Information System  
> **Project Type:** Capstone Design Project  
> **Institution:** Telkom University — Information Systems  
> **Status:** Development Planning  
> **Documentation Role:** Main project development reference

---

## 1. Project Overview

Pitstop Haircut merupakan sistem informasi berbasis web yang dikembangkan untuk mengoptimalkan proses reservasi, pengelolaan transaksi, penjadwalan Capster, serta monitoring operasional dan keuangan Pitstop Barbershop.

Pengembangan sistem ini bertujuan mengintegrasikan proses bisnis yang sebelumnya berjalan secara terpisah ke dalam satu ekosistem informasi terpusat.

Sistem dirancang untuk empat aktor utama:

1. Customer
2. Admin / Cashier
3. Capster
4. Owner

Pengembangan mencakup dua sisi aplikasi yang memiliki tanggung jawab berbeda:

- **Customer Website:** Informasi layanan, katalog model rambut, reservasi online, pembayaran DP, riwayat transaksi, dan invoice.
- **Internal Management System:** Pengelolaan booking, transaksi, jadwal pelayanan, data operasional, pengeluaran, serta dashboard analytics.

Customer Website dan Internal Management System dikembangkan dalam repository terpisah, tetapi harus menggunakan aturan bisnis dan struktur data yang konsisten.

## 2. Business Problems

Berdasarkan observasi dan analisis proses bisnis Pitstop Barbershop, terdapat beberapa permasalahan utama:

- Sekitar 85% pelanggan datang melalui mekanisme walk-in, sedangkan sekitar 15% melakukan reservasi melalui WhatsApp.
- Reservasi masih dicatat secara manual sehingga berpotensi menimbulkan benturan jadwal.
- Data reservasi, transaksi, dan operasional belum terintegrasi sepenuhnya.
- Owner membutuhkan akses informasi pendapatan, pengeluaran, jumlah pelanggan, dan performa Capster secara lebih terstruktur.
- Capster membutuhkan informasi jadwal dan antrean yang jelas.
- Pelanggan membutuhkan informasi layanan dan referensi model rambut sebelum menggunakan layanan.

## 3. Project Objectives

1. Mengintegrasikan proses reservasi, transaksi, dan penjadwalan Capster.
2. Mengurangi pencatatan manual dan duplikasi data.
3. Menyediakan sistem pembayaran reservasi melalui payment gateway.
4. Menyediakan sistem pencatatan transaksi untuk pelanggan booking maupun walk-in.
5. Menyediakan dashboard analytics untuk membantu Owner mengambil keputusan.
6. Menyediakan informasi operasional yang sesuai dengan kebutuhan setiap aktor.
7. Membangun sistem yang dapat diuji secara fungsional oleh stakeholder.

## 4. System Scope

### 4.1 Customer Website

Customer Website bertanggung jawab terhadap interaksi pelanggan dengan sistem.

Fitur utama:

- Informasi profil dan lokasi barbershop.
- Informasi layanan, harga, dan durasi.
- Galeri referensi model rambut.
- Informasi Capster.
- Reservasi online.
- Pemilihan tanggal dan jam pelayanan.
- Pemilihan layanan.
- Pemilihan Capster atau tanpa preferensi.
- Pemeriksaan ketersediaan jadwal.
- Identitas pelanggan menggunakan nama, WhatsApp, dan email.
- Pembayaran DP melalui payment gateway.
- Informasi dan status booking.
- Riwayat transaksi melalui verifikasi OTP nomor WhatsApp.
- Invoice digital dalam format PDF.
- Pengiriman invoice melalui email.

Customer tidak diwajibkan membuat akun atau melakukan login permanen.

### 4.2 Internal Management System

Internal Management System digunakan oleh Owner, Admin/Cashier, dan Capster.

**Owner**

- Dashboard analytics.
- Monitoring pendapatan dan pengeluaran.
- Monitoring transaksi dan booking.
- Monitoring performa Capster.
- Monitoring jumlah pelanggan.
- Pengelolaan akun Admin dan Capster.
- Pengelolaan data layanan dan harga.
- Pengelolaan galeri.
- Pengelolaan pengeluaran.
- Laporan operasional dan keuangan.
- Export laporan PDF dan CSV.

**Admin / Cashier**

- Dashboard operasional.
- Monitoring booking online.
- Melihat detail booking dan informasi pelanggan.
- Monitoring status pembayaran.
- Pencatatan transaksi walk-in.
- Pencatatan layanan yang diberikan.
- Pencatatan pembayaran dan pelunasan.
- Pembuatan invoice transaksi.

Admin/Cashier tidak memiliki kewenangan untuk membuat booking manual atau mengelola pengeluaran.

**Capster**

- Dashboard pribadi.
- Melihat jadwal dan booking yang ditugaskan.
- Melihat informasi pelanggan dan layanan.
- Memulai pelayanan.
- Menyelesaikan pelayanan.
- Menandai booking sebagai Tidak Hadir.
- Melihat riwayat pelayanan.
- Melihat pendapatan pribadi.

Capster tidak dapat mengakses laporan keuangan keseluruhan, nominal transaksi bisnis, maupun informasi pengeluaran.

## 5. Core Business Rules

### 5.1 Booking

- Customer dapat memilih satu atau beberapa layanan dalam satu booking.
- Satu booking hanya memiliki satu Capster.
- Seluruh layanan dalam satu booking ditangani oleh Capster yang sama.
- Customer dapat memilih Capster atau memilih tanpa preferensi.
- Jika tanpa preferensi, sistem menentukan Capster berdasarkan ketersediaan.
- Jadwal harus divalidasi untuk mencegah benturan.
- Booking online dikonfirmasi setelah pembayaran DP berhasil diverifikasi.
- Booking manual oleh Admin/Cashier tidak digunakan.
- Walk-in dicatat sebagai transaksi tanpa booking online.

### 5.2 Down Payment

- DP ditetapkan sebesar Rp25.000 per booking.
- DP merupakan pembayaran awal yang mengurangi sisa tagihan.
- Status pembayaran harus diverifikasi sebelum booking dinyatakan terkonfirmasi.
- Pembayaran akhir dilakukan setelah layanan selesai.

### 5.3 No-Show

- Capster memiliki kewenangan menandai booking sebagai Tidak Hadir.
- Status Tidak Hadir merupakan status booking, bukan status pelayanan.
- Jika pelanggan datang setelah ditandai Tidak Hadir tetapi masih pada hari yang sama, DP tetap diperhitungkan.
- Pelanggan tersebut masuk antrean dan menunggu hingga Capster tersedia.

### 5.4 Service Status

Status pelayanan yang dapat diperbarui Capster:

- Layanan Dimulai
- Layanan Selesai

Status booking dan status pelayanan harus dipisahkan.

### 5.5 Transaction

- Seluruh transaksi dicatat dalam sistem.
- Transaksi dapat berasal dari booking online maupun walk-in.
- Transaksi walk-in dapat dibuat tanpa booking.
- Admin/Cashier menangani pencatatan transaksi.
- Owner memiliki akses terhadap keseluruhan informasi transaksi.
- Invoice diterbitkan setelah pelunasan.

### 5.6 Customer Identity and History

- Identitas pelanggan menggunakan nama, nomor WhatsApp, dan email.
- Nomor WhatsApp digunakan sebagai identitas untuk menghubungkan riwayat transaksi.
- Akses riwayat transaksi menggunakan OTP.
- Invoice PDF dapat diunduh melalui website dan dikirimkan melalui email.

### 5.7 Capster Earnings

Perhitungan pendapatan Capster:

`Pendapatan Harian = Rp100.000 + (Rp10.000 × Jumlah Pelanggan Dilayani)`

Sistem menampilkan rekap pendapatan pribadi berdasarkan periode harian, mingguan, bulanan, dan tahunan.

Perhitungan tersebut merupakan informasi pendapatan Capster, bukan sistem payroll otomatis.

### 5.8 Expenses

- Seluruh pengeluaran usaha dicatat oleh Owner.
- Admin/Cashier tidak memiliki akses pengelolaan pengeluaran.
- Pengeluaran digunakan dalam perhitungan laba bersih.

`Laba Bersih = Total Pendapatan - Total Pengeluaran`

## 6. Main System Modules

| Module | Responsibility |
|---|---|
| Authentication & Authorization | Login internal dan pembatasan hak akses |
| Customer Management | Data identitas dan riwayat pelanggan |
| Service Management | Master layanan, harga, dan durasi |
| Booking Management | Reservasi dan status booking |
| Scheduling | Ketersediaan dan penjadwalan Capster |
| Queue Management | Pengelolaan antrean pelayanan |
| Service Management | Progres pelayanan |
| Transaction Management | Pencatatan transaksi |
| Payment Management | DP dan pelunasan |
| Invoice Management | Pembuatan dan distribusi invoice |
| Notification | Notifikasi WhatsApp |
| Gallery Management | Referensi model rambut |
| Expense Management | Pencatatan pengeluaran |
| Analytics & Reporting | Dashboard dan laporan |
| Audit Trail | Pencatatan aktivitas penting |

## 7. Database Design

Database dirancang menggunakan PostgreSQL dengan ERD sebagai acuan struktur data.

Entitas pada ERD:

1. Pengguna
2. Capster
3. Booking
4. Customer
5. OtpRiwayat
6. BookingLayanan
7. Layanan
8. RiwayatLayanan
9. JadwalCapster
10. AntreanKosong
11. Pembayaran
12. Invoice
13. NotifikasiWhatsapp
14. Pengeluaran
15. Galeri
16. PengaturanDP
17. JejakAudit
18. Laporan
19. ProfilUsaha

Prinsip database:

- Menggunakan primary key dan foreign key.
- Menjaga integritas relasi antarentitas.
- Menghindari duplikasi data.
- Menyimpan snapshot harga layanan ketika booking dibuat.
- Memisahkan status booking, pembayaran, dan pelayanan.
- Menyimpan riwayat perubahan status.
- Menyimpan referensi pembayaran dari payment gateway.
- Menyediakan data yang konsisten untuk kebutuhan analytics.

Database implementation harus mengikuti ERD yang telah disepakati. Setiap perubahan struktur wajib diperbarui pada dokumentasi database.

## 8. Development Approach

Pengembangan mengikuti tahapan SDLC yang terstruktur dengan evaluasi dan perbaikan prototype.

### Phase 1 — Requirement Analysis

- Observasi proses bisnis.
- Wawancara stakeholder.
- Identifikasi kebutuhan setiap aktor.
- Analisis proses As-Is dan To-Be.
- Penetapan functional requirements.
- Penetapan non-functional requirements.

**Deliverables:** BRD, PRD, functional requirements, non-functional requirements.

### Phase 2 — System Design

- BPMN.
- Use Case Diagram.
- Activity Diagram.
- Sequence Diagram.
- ERD.
- Database schema.
- API specification.
- UI/UX wireframe.
- System architecture.

**Deliverables:** Dokumen desain sistem dan prototype UI/UX.

### Phase 3 — Core Development

Pengembangan fondasi aplikasi:

- Project setup.
- Database connection.
- Authentication.
- Role-based access control.
- API foundation.
- Master data.
- Integrasi frontend dan backend.

**Deliverables:** Fondasi sistem yang dapat dijalankan.

### Phase 4 — Business Module Development

Implementasi modul berdasarkan prioritas:

1. User and access management.
2. Service management.
3. Customer management.
4. Booking management.
5. Scheduling and availability.
6. Payment and DP.
7. Transaction management.
8. Service progress and queue.
9. Invoice management.
10. Expense management.
11. Analytics and reporting.
12. Notifications and audit trail.

**Deliverables:** Modul utama dengan business logic yang berfungsi.

### Phase 5 — Integration

- Integrasi Customer Website dengan Internal Management System.
- Integrasi payment gateway.
- Integrasi OTP.
- Integrasi WhatsApp notification.
- Integrasi email invoice.
- Integrasi dashboard analytics.

**Deliverables:** Sistem terintegrasi.

### Phase 6 — Testing and Validation

- Unit testing.
- Integration testing.
- Black-box testing.
- Role and permission testing.
- Payment testing.
- Booking conflict testing.
- User Acceptance Testing (UAT).
- Usability evaluation.

**Deliverables:** Test report, bug list, dan hasil validasi stakeholder.

### Phase 7 — Deployment

- Production environment setup.
- Database deployment.
- Application deployment.
- Environment configuration.
- Security configuration.
- Backup configuration.
- User training.

**Deliverables:** Sistem yang dapat diakses untuk demonstrasi dan pengujian operasional.

### Phase 8 — Maintenance and Finalization

- Bug fixing.
- Performance improvement.
- Documentation update.
- User guide.
- Final project demonstration.
- Final technical report.

**Deliverables:** Final system, technical documentation, dan laporan proyek.

## 9. Development Priorities

Urutan prioritas pengembangan:

**Priority 1 — Core Foundation**
- Database.
- Authentication.
- Authorization.
- Master data.
- Customer management.

**Priority 2 — Core Business Process**
- Booking.
- Scheduling.
- Availability validation.
- DP payment.
- Transaction.
- Service progress.

**Priority 3 — Business Management**
- Invoice.
- Expenses.
- Capster earnings.
- Analytics.
- Reporting.

**Priority 4 — Supporting Integration**
- OTP.
- WhatsApp notifications.
- Email delivery.
- Payment gateway integration.
- Gallery.

**Priority 5 — Finalization**
- Testing.
- Bug fixing.
- Security review.
- Deployment.
- Documentation.

Prioritas tersebut merupakan urutan kerja yang disarankan, bukan ketergantungan mutlak. Integrasi yang diperlukan oleh core process tetap harus disiapkan sejak awal.

## 10. Non-Functional Requirements

Sistem harus memperhatikan:

- **Performance:** Respons aplikasi dan pemrosesan data harus memadai untuk operasional.
- **Security:** Password hashing, secure session, role-based access, input validation, dan perlindungan data pelanggan.
- **Reliability:** Transaksi dan pembayaran harus memiliki mekanisme validasi serta pencegahan pemrosesan ganda.
- **Availability:** Sistem harus dapat diakses pada jam operasional.
- **Usability:** Antarmuka harus mudah dipahami oleh Owner, Admin/Cashier, Capster, dan Customer.
- **Maintainability:** Kode modular, dokumentasi teknis, testing, dan database migration.
- **Scalability:** Struktur sistem harus memungkinkan penambahan fitur dan kapasitas di masa mendatang.

## 11. Important Development Constraints

- Sistem ditujukan untuk kebutuhan operasional UMKM.
- Biaya pengembangan dan infrastruktur harus diperhatikan.
- Sistem harus mendukung kebiasaan pelanggan walk-in.
- Antarmuka internal harus sederhana untuk staf.
- Data pribadi pelanggan harus dilindungi.
- Integrasi pihak ketiga harus dibuat modular.
- Fitur yang belum memiliki keputusan bisnis final tidak boleh diasumsikan sebagai aturan tetap.

## 12. Pending Decisions

Beberapa hal masih memerlukan keputusan sebelum implementasi final:

- Durasi toleransi keterlambatan sebelum booking dapat ditandai Tidak Hadir.
- Kebijakan DP untuk pembatalan dan booking yang tidak dilanjutkan.
- Batas waktu pembayaran DP.
- Jam operasional dan hari libur.
- Detail mekanisme loyalty program.
- Granularitas status pelayanan jika satu booking berisi beberapa layanan.
- Provider payment gateway.
- Provider OTP dan WhatsApp.
- Provider email.
- Detail kontrak API antara Customer Website dan Internal Management System.

Setiap keputusan baru harus dicatat dan disinkronkan ke BRD, PRD, ERD, serta implementasi.

## 13. Project Principles

Seluruh pengembangan harus mengikuti prinsip berikut:

1. Business rules menjadi sumber kebenaran utama.
2. Database harus konsisten dengan ERD.
3. Setiap aktor hanya dapat mengakses fitur sesuai kewenangannya.
4. Booking, payment, dan service progress harus memiliki status terpisah.
5. Customer Website dan Internal Management System harus menggunakan kontrak integrasi yang konsisten.
6. Setiap fitur harus memiliki skenario pengujian.
7. Perubahan requirement harus didokumentasikan.
8. Jangan mengimplementasikan fitur berdasarkan asumsi yang belum disepakati.

---

**Document Status:** Living Document

Dokumen ini menjadi referensi utama untuk arah pengembangan Pitstop Haircut. Perubahan requirement, business rules, arsitektur, dan prioritas harus diperbarui secara berkala agar seluruh bagian proyek tetap konsisten.