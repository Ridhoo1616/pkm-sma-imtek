-- ============================================================
--  Migrasi 029 - Menghapus pengaturan E-Learning / LMS
--  Halaman dan menunya dibuang; alamatnya tidak dipakai lagi.
-- ============================================================
DELETE FROM pengaturan WHERE nama_setting = 'tautan_elearning';
