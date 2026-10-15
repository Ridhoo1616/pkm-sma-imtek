-- ============================================================
--  Migrasi 033 - BKK lewat grup WhatsApp
--  Penyaluran kerja sekolah berjalan lewat grup WhatsApp yang dipegang
--  petugas BKK, jadi halaman BKK cukup profil singkat, daftar mitra, dan
--  jalan masuk ke grup itu. Lowongan dan lamaran tidak lagi tampil di situs.
-- ============================================================
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('bkk_nomor_disnaker', '',
   'Nomor tanda daftar BKK dari Dinas Tenaga Kerja. Tampil pada profil halaman BKK.'),
  ('bkk_grup_wa', '',
   'Tautan undangan grup WhatsApp BKK (chat.whatsapp.com/...). Kosong berarti tombol gabung membuka chat petugas BKK.')
ON CONFLICT (nama_setting) DO NOTHING;
