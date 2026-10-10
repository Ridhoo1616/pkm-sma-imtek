-- ============================================================
--  Migrasi 026 - Menghapus tes seleksi online
--  PPDB hanya sampai pendaftaran dan keputusan diterima/ditolak.
--  Bank soal, paket ujian, sesi, dan kartu peserta tes dibuang.
-- ============================================================
DROP TABLE IF EXISTS sesi_soal;
DROP TABLE IF EXISTS sesi_ujian;
DROP TABLE IF EXISTS paket_komposisi;
DROP TABLE IF EXISTS paket_ujian;
DROP TABLE IF EXISTS soal;

ALTER TABLE pendaftar DROP COLUMN IF EXISTS ruang_ujian;
ALTER TABLE pendaftar DROP COLUMN IF EXISTS kursi_ujian;

DELETE FROM pengaturan WHERE nama_setting IN
  ('ujian_aktif', 'ujian_info', 'wa_notif_ujian', 'email_subjek_ujian');
DELETE FROM notifikasi WHERE jenis = 'ujian';

DELETE FROM faq WHERE kategori = 'Tes Seleksi'
   OR pertanyaan LIKE 'Apa itu kartu peserta%';
UPDATE faq SET jawaban = replace(jawaban,
  'Aturan yang sama berlaku untuk mengunduh bukti pendaftaran, kartu peserta, dan mengerjakan tes seleksi.',
  'Aturan yang sama berlaku untuk mengunduh bukti pendaftaran.')
 WHERE jawaban LIKE '%mengerjakan tes seleksi%';
UPDATE faq SET jawaban = replace(jawaban,
  'formulir pendaftaran dan tes seleksi', 'formulir pendaftaran')
 WHERE jawaban LIKE '%formulir pendaftaran dan tes seleksi%';
UPDATE pengaturan SET keterangan = replace(keterangan,
  'kop surat, kartu peserta, dan sorotan', 'kop surat dan sorotan')
 WHERE keterangan LIKE '%kop surat, kartu peserta, dan sorotan%';
