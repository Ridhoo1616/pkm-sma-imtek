-- ============================================================
--  Migrasi 010 — Satu NISN hanya untuk satu pendaftar per tahun ajaran
--
--  NISN adalah nomor induk siswa nasional: satu nomor untuk satu orang,
--  seumur hidup. Sampai migrasi ini, tabel pendaftar tidak menjaganya sama
--  sekali — tiga puluh kiriman dengan NISN yang sama akan tersimpan
--  seluruhnya, dan panitia baru menemukannya saat memverifikasi berkas satu
--  per satu.
--
--  Batasannya per TAHUN AJARAN, bukan menyeluruh, mengikuti batasan nama dan
--  tanggal lahir yang sudah ada: orang yang sama boleh mendaftar lagi pada
--  tahun ajaran berikutnya, misalnya karena tahun ini tidak diterima.
--
--  Indeksnya PARSIAL — hanya baris yang NISN-nya terisi. Baris lama dari masa
--  NISN masih opsional tidak boleh ikut bertabrakan hanya karena sama-sama
--  kosong.
--
--  DIBUNGKUS PEMERIKSAAN LEBIH DULU, dan itu disengaja. Migrasi dijalankan
--  saat server menyala; CREATE UNIQUE INDEX yang gagal karena datanya sudah
--  memuat NISN kembar akan menghentikan server dan membuat situsnya mati.
--  Itu persis yang terjadi pada migrasi 008, yang gagal karena keterangannya
--  melebihi panjang kolom. Jadi bila ada NISN kembar, indeksnya TIDAK dibuat
--  dan sebuah catatan ditulis ke log; pemeriksaan di aplikasi tetap menahan
--  kiriman baru yang NISN-nya sudah terpakai, dan panitia dapat merapikan
--  baris lamanya lebih dulu lalu menyalakan ulang server.
-- ============================================================

DO $$
DECLARE
  kembar integer;
BEGIN
  SELECT count(*) INTO kembar FROM (
    SELECT nisn, tahun_ajaran
      FROM pendaftar
     WHERE nisn IS NOT NULL AND nisn <> ''
     GROUP BY nisn, tahun_ajaran
    HAVING count(*) > 1
  ) k;

  IF kembar > 0 THEN
    RAISE NOTICE 'Indeks unik NISN dilewati: masih ada % pasang NISN kembar pada tabel pendaftar. Rapikan dahulu, lalu nyalakan ulang server.', kembar;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_pendaftar_nisn
      ON pendaftar (nisn, tahun_ajaran)
      WHERE nisn IS NOT NULL AND nisn <> '';
  END IF;
END $$;
