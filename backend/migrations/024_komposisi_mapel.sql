-- ------------------------------------------------------------
--  Migrasi 024: mata pelajaran baku dan komposisi soal per paket
--
--  Paket dulu mengambil soal acak dari seluruh bank soal, sehingga seorang
--  peserta bisa mendapat 20 soal Matematika semuanya. Komposisi menetapkan
--  jumlah soal tiap mata pelajaran. Paket tanpa komposisi tetap bekerja
--  seperti sebelumnya.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paket_komposisi (
  paket_id        integer     NOT NULL REFERENCES paket_ujian (id) ON DELETE CASCADE,
  mata_pelajaran  varchar(60) NOT NULL,
  jumlah          integer     NOT NULL CHECK (jumlah BETWEEN 1 AND 200),
  PRIMARY KEY (paket_id, mata_pelajaran)
);

-- Nama mata pelajaran yang dulu diketik bebas diseragamkan ke nama baku
-- (backend/mapel.go). Yang tidak dikenali dibiarkan; panitia memilihkan
-- nama bakunya saat soal itu diubah.
UPDATE soal SET mata_pelajaran = CASE
    WHEN lower(btrim(mata_pelajaran)) IN ('matematika', 'mtk', 'math') THEN 'Matematika'
    WHEN lower(btrim(mata_pelajaran)) IN ('bahasa indonesia', 'b. indonesia', 'b.indonesia', 'b indonesia', 'bindo') THEN 'Bahasa Indonesia'
    WHEN lower(btrim(mata_pelajaran)) IN ('bahasa inggris', 'b. inggris', 'b.inggris', 'b inggris', 'english') THEN 'Bahasa Inggris'
    WHEN lower(btrim(mata_pelajaran)) IN ('ipa', 'ilmu pengetahuan alam', 'sains') THEN 'IPA'
    WHEN lower(btrim(mata_pelajaran)) IN ('ips', 'ilmu pengetahuan sosial') THEN 'IPS'
    WHEN lower(btrim(mata_pelajaran)) IN ('pendidikan agama', 'agama', 'pai') THEN 'Pendidikan Agama'
    WHEN lower(btrim(mata_pelajaran)) IN ('pengetahuan umum', 'umum') THEN 'Pengetahuan Umum'
    WHEN lower(btrim(mata_pelajaran)) IN ('tes potensi akademik', 'tpa') THEN 'Tes Potensi Akademik'
    ELSE mata_pelajaran
  END;
