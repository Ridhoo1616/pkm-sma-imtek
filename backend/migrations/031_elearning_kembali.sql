-- ============================================================
--  Migrasi 031 - Menghidupkan kembali alamat E-Learning
--  Halaman E-Learning kembali sebagai pintu masuk ke layanan yang sudah
--  dipakai sekolah (Google Classroom, folder Google Drive). Baris yang
--  dibuang migrasi 029 ditanam lagi dalam keadaan kosong.
-- ============================================================
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('tautan_elearning', '',
   'Alamat e-learning sekolah, misalnya kelas Google Classroom atau folder Google Drive. Bila kosong, halamannya menerangkan layanan belum tersedia.')
ON CONFLICT (nama_setting) DO NOTHING;
