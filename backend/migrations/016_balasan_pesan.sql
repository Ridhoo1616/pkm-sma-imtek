-- ============================================================
--  Migrasi 016 - Membalas pesan masuk dari dalam panel
--
--  Sampai sekarang tombol "Balas lewat email" pada menu Pesan Masuk hanyalah
--  tautan mailto:, dan tautan mailto: tidak melakukan apa pun di komputer
--  yang tidak punya aplikasi email terpasang. Itu yang dilaporkan user:
--  tombolnya "tidak bisa diklik". Kini panitia mengarang balasannya di dalam
--  panel, dan server yang mengirimkan emailnya lewat SMTP yang sama dengan
--  notifikasi PPDB.
--
--  Dua hal yang ditambahkan:
--
--  1. pesan.dibalas_pada dan pesan.dibalas_oleh. Tanda "sudah dibaca" saja
--     tidak cukup: dibaca bukan dijawab, dan panitia yang bergantian jaga
--     perlu tahu pertanyaan mana yang masih menganggur. Sengaja kolom waktu,
--     bukan boolean, supaya terlihat juga kapan dan oleh siapa.
--
--  2. notifikasi.perihal. Balasan dicatat di tabel notifikasi seperti pesan
--     PPDB, supaya seluruh riwayat kirim berada di satu tempat dan dapat
--     ditunjukkan bila ada sengketa. Bedanya, perihal balasan diketik
--     panitia saat itu dan tidak ada pengaturannya, jadi harus ikut
--     tersimpan pada barisnya.
--
--     Notifikasi PPDB TIDAK mengisi kolom ini. Perihalnya dibaca dari
--     pengaturan pada saat dikirim, dan itu memang yang dikehendaki:
--     sekolah yang membetulkan perihalnya sesudah pesannya tersusun tetap
--     terpakai perbaikannya. Yang kosong berarti "ambil dari pengaturan".
--
--  Kolom jenis pada notifikasi tidak berpembatas CHECK, jadi jenis baru
--  'balasan_pesan' tidak memerlukan perubahan pembatas. Kolom pendaftar_id
--  memang boleh kosong, dan balasan pesan masuk tidak punya pendaftar.
-- ============================================================

ALTER TABLE pesan
  ADD COLUMN IF NOT EXISTS dibalas_pada timestamptz,
  ADD COLUMN IF NOT EXISTS dibalas_oleh integer REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE notifikasi
  ADD COLUMN IF NOT EXISTS perihal varchar(200) NOT NULL DEFAULT '';

COMMENT ON COLUMN pesan.dibalas_pada IS
  'Waktu panitia mengirim balasan dari panel. Kosong berarti belum dibalas.';
COMMENT ON COLUMN notifikasi.perihal IS
  'Perihal email yang diketik panitia. Kosong berarti dibaca dari pengaturan saat dikirim.';
