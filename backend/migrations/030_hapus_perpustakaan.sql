-- ============================================================
--  Migrasi 030 - Menghapus Perpustakaan Digital
--  Tabel koleksi dan keterangan halamannya dibuang. Berkas unggahan di
--  folder "pustaka" tidak ikut terhapus; hapus manual bila tidak diperlukan.
-- ============================================================
DROP TABLE IF EXISTS pustaka;
DELETE FROM pengaturan WHERE nama_setting = 'perpustakaan_keterangan';
