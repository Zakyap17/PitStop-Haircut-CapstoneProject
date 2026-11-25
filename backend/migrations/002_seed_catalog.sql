-- Data awal katalog (dipindahkan dari data statis di frontend). Ubah lewat admin atau migrasi baru, jangan edit file ini.

INSERT INTO settings (key, value, description) VALUES
  ('timezone',           'Asia/Jakarta', 'Zona waktu toko'),
  ('opens_at',           '10:00',        'Jam buka setiap hari'),
  ('closes_at',          '21:00',        'Jam tutup setiap hari; layanan harus selesai sebelum ini'),
  ('break_from',         '18:00',        'Mulai istirahat; kosongkan nilai (string kosong) kalau tidak ada istirahat'),
  ('break_to',           '19:00',        'Selesai istirahat'),
  ('booking_days_ahead', '7',            'Berapa hari ke depan (termasuk hari ini) yang bisa dipesan'),
  ('max_reschedules',    '2',            'Berapa kali jadwal satu reservasi boleh diubah pelanggan'),
  ('min_lead_minutes',   '0',            'Pemesanan minimal berapa menit sebelum jam mulai'),
  ('max_active_per_email','3',            'Batas reservasi aktif (belum lewat) per email, agar slot tidak diborong');

INSERT INTO services (id, name, description, price, duration_minutes, sort_order) VALUES
  ('haircut-dewasa', 'Haircut Dewasa',  'Konsultasi, potong, cuci, dan styling pomade.',  50000,  45, 1),
  ('haircut-anak',   'Haircut Anak',    'Potong di kursi mobil balap. Sabar, cepat, rapi.', 40000, 30, 2),
  ('premium-fade',   'Premium Fade',    'Skin / taper fade detail dengan foil shaver.',   65000,  60, 3),
  ('shaving-beard',  'Shaving & Beard', 'Handuk hangat, pisau cukur, line-up jenggot.',   35000,  30, 4),
  ('hair-coloring',  'Hair Coloring',   'Semir hitam, highlight, atau fashion color.',    120000, 90, 5),
  ('hair-spa-wash',  'Hair Spa & Wash', 'Keramas, pijat kepala, dan hair tonic.',         30000,  20, 6);

INSERT INTO barbers (id, name, role, specialty, experience_years, off_days, sort_order) VALUES
  ('rizky', 'Rizky', 'Head Kapster',   'Fade & Crop',      8, '{1}', 1),
  ('andi',  'Andi',  'Senior Kapster', 'Klasik & Korean',  6, '{3}', 2),
  ('bima',  'Bima',  'Kids Specialist','Potong Anak',      4, '{2}', 3),
  ('fajar', 'Fajar', 'Kapster',        'Beard & Shaving',  3, '{4}', 4);

INSERT INTO booking_slots (time) VALUES
  ('10:00'), ('11:00'), ('12:00'), ('13:00'), ('14:00'), ('15:00'), ('16:00'), ('17:00'), ('19:00'), ('20:00');

INSERT INTO haircuts (id, name, barber_id, category, rating, image_path, sort_order) VALUES
  ('skin-fade',           'Skin Fade',           'rizky', 'Dewasa',   9.1, '/images/cuts/skin-fade.png',           1),
  ('pompadour',           'Pompadour',           'andi',  'Klasik',   8.8, '/images/cuts/pompadour.png',           2),
  ('kids-undercut',       'Kids Undercut',       'bima',  'Anak',     9.4, '/images/cuts/kids-undercut.png',       3),
  ('french-crop',         'French Crop',         'rizky', 'Dewasa',   9.0, '/images/cuts/french-crop.png',         4),
  ('buzz-and-beard',      'Buzz & Beard',        'fajar', 'Grooming', 8.7, '/images/cuts/buzz-and-beard.png',      5),
  ('two-block',           'Two Block',           'andi',  'Korean',   8.9, '/images/cuts/two-block.png',           6),
  ('modern-mullet',       'Modern Mullet',       'bima',  'Trend',    8.6, '/images/cuts/modern-mullet.png',       7),
  ('low-taper-fade',      'Low Taper Fade',      'rizky', 'Dewasa',   9.2, '/images/cuts/low-taper-fade.png',      8),
  ('classic-side-part',   'Classic Side Part',   'andi',  'Klasik',   8.9, '/images/cuts/classic-side-part.png',   9),
  ('kids-faux-hawk',      'Kids Faux Hawk',      'bima',  'Anak',     9.3, '/images/cuts/kids-faux-hawk.png',      10),
  ('textured-quiff',      'Textured Quiff',      'rizky', 'Trend',    8.8, '/images/cuts/textured-quiff.png',      11),
  ('crew-cut',            'Crew Cut',            'fajar', 'Grooming', 8.5, '/images/cuts/crew-cut.png',            12),
  ('slick-back-undercut', 'Slick Back Undercut', 'andi',  'Klasik',   9.0, '/images/cuts/slick-back-undercut.png', 13),
  ('kids-textured-crop',  'Kids Textured Crop',  'bima',  'Anak',     9.1, '/images/cuts/kids-textured-crop.png',  14);

-- Testimoni sengaja tidak di-seed: isinya harus testimoni pelanggan asli (isi lewat admin atau migrasi baru).
