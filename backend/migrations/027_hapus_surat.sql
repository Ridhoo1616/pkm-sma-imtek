-- ============================================================
--  Migrasi 027 - Menghapus modul Surat
--  Penerbitan surat (jenis, penomoran, penerbitan massal, PDF berkop)
--  dibuang. Pendaftar yang diterima kini melihat pesan selamat beserta
--  langkah daftar ulang langsung di halaman Cek Status.
-- ============================================================
DROP TABLE IF EXISTS surat;
DROP TABLE IF EXISTS jenis_surat;

UPDATE pengaturan SET keterangan = replace(keterangan,
  'kop surat dan sorotan', 'bukti pendaftaran dan sorotan')
 WHERE keterangan LIKE '%kop surat dan sorotan%';
