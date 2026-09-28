-- ============================================================
--  Migrasi 018 - Pendaftar yang dimasukkan panitia
--
--  Sampai sekarang pendaftaran hanya lewat formulir publik, dan formulir itu
--  ditolak backend ketika PPDB ditutup. Akibatnya keadaan yang sangat lazim
--  tidak tertangani: ada calon yang datang langsung ke sekolah sesudah
--  pendaftaran ditutup, lalu kepala sekolah memutuskan menerimanya.
--
--  Satu-satunya jalan sebelum ini membuka kembali PPDB untuk SEMUA ORANG,
--  memasukkan satu data, lalu menutupnya lagi. Selama jendela itu terbuka,
--  siapa pun di internet dapat mendaftar.
--
--  dibuat_oleh mencatat petugas yang memasukkannya. KOSONG berarti pendaftar
--  mengisi formulir publik sendiri, dan itu keadaan sebagian besar barisnya;
--  karena itu kolomnya boleh kosong, bukan diberi nilai bawaan.
--
--  Yang TIDAK dicatat di sini: alasan penambahannya. Itu tempatnya
--  catatan_admin yang sudah ada, supaya tidak ada dua kolom yang isinya
--  kalimat bebas tentang satu pendaftar yang sama.
-- ============================================================

ALTER TABLE pendaftar
  ADD COLUMN IF NOT EXISTS dibuat_oleh integer REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN pendaftar.dibuat_oleh IS
  'Petugas yang memasukkan data ini dari panel. Kosong berarti pendaftar mengisi formulir publik sendiri.';

CREATE INDEX IF NOT EXISTS idx_pendaftar_dibuat_oleh
  ON pendaftar (dibuat_oleh) WHERE dibuat_oleh IS NOT NULL;
