-- ============================================================
--  Migrasi 017 - Daftar rujukan sekolah asal
--
--  Sampai sekarang nama SMP asal diketik bebas. Yang diperiksa hanya
--  kewajaran tulisannya (lihat teksWajar pada validasi.go): huruf yang
--  berulang tiga kali, tanpa huruf hidup, dan sejenisnya. Itu menangkap
--  "aaaa" dan "asdasd", tetapi TIDAK menangkap "SMP Negeri 99 Antartika",
--  yang tulisannya wajar tetapi sekolahnya tidak ada.
--
--  Yang perlu diluruskan lebih dulu, sebab menentukan bentuk seluruh
--  rancangan ini: TIDAK ADA API RESMI yang dapat dipanggil untuk memastikan
--  sebuah sekolah benar-benar ada.
--
--    - Laman Referensi Kemendikbud (referensi.data.kemdikbud.go.id) memuat
--      seluruh NPSN, tetapi tidak menyediakan API yang boleh dipakai program
--      lain.
--    - Dapodik hanya terbuka bagi sekolah lewat akunnya sendiri.
--    - API pihak ketiga yang tidak resmi ada beberapa, dan seluruhnya tidak
--      dapat dijadikan tumpuan sistem penerimaan sekolah: ia bisa mati
--      kapan saja, tepat pada masa PPDB.
--
--  Karena itu rujukannya DISIMPAN SENDIRI di tabel ini, diisi sekolah dari
--  data resmi yang mereka unduh untuk wilayahnya. Sesudah terisi, nama yang
--  tidak ada di dalamnya tidak diterima begitu saja.
--
--  Selama tabel ini KOSONG, pemeriksaannya tidak berjalan sama sekali dan
--  formulirnya bekerja seperti sebelumnya. Itu disengaja: memaksa pencocokan
--  ke daftar yang belum diisi berarti menolak SELURUH pendaftar.
--
--  asal_sekolah_terdaftar mencatat hasil pencocokan pada saat mengirim,
--  bukan dihitung ulang belakangan, sebab daftar rujukannya bisa bertambah
--  sesudah pendaftarnya masuk dan panitia perlu tahu keadaan saat itu.
-- ============================================================

CREATE TABLE IF NOT EXISTS sekolah_referensi (
  npsn       char(8) PRIMARY KEY,
  nama       varchar(140) NOT NULL,
  bentuk     varchar(20)  NOT NULL DEFAULT '',
  status     varchar(10)  NOT NULL DEFAULT '',
  kecamatan  varchar(80)  NOT NULL DEFAULT '',
  kabupaten  varchar(80)  NOT NULL DEFAULT '',
  provinsi   varchar(80)  NOT NULL DEFAULT '',
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- Pencariannya ILIKE '%kata%', dan index di bawah TIDAK mempercepat pola
-- yang diawali persen. Ia tetap dibuat untuk pencocokan nama yang tepat saat
-- formulir dikirim, yang justru jalur yang harus cepat. Pencarian
-- ketik-sambil-cari tetap ringan karena daftarnya satu wilayah, ratusan
-- baris, bukan ratusan ribu.
CREATE INDEX IF NOT EXISTS idx_sekolah_referensi_nama
  ON sekolah_referensi (lower(nama));

COMMENT ON TABLE sekolah_referensi IS
  'Daftar sekolah asal dari data resmi Kemendikbud, diimpor sekolah lewat panel.';

ALTER TABLE pendaftar
  ADD COLUMN IF NOT EXISTS asal_sekolah_terdaftar boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN pendaftar.asal_sekolah_terdaftar IS
  'true bila sekolah asalnya cocok dengan daftar rujukan saat formulir dikirim.';
