-- ============================================================
--  Migrasi 038 - Revisi isi dari sekolah (26 Oktober 2026)
--   - Peminatan IPS dinonaktifkan sementara (sedang diproses), bukan dihapus,
--     supaya data pendaftar yang sudah memilihnya utuh.
--   - Fasilitas "Laboratorium IPA" menjadi "Wifi gratis di setiap kelas".
--   - Halaman Pendidikan Karakter disembunyikan.
--   - Kurikulum yang dipakai: Kurikulum Merdeka (kini disebut Kurikulum
--     Nasional).
-- ============================================================
UPDATE jurusan SET aktif = false WHERE kode = 'IPS';

UPDATE fasilitas
   SET nama = 'Wifi gratis di setiap kelas',
       deskripsi = 'Jaringan wifi gratis tersedia di setiap ruang kelas untuk menunjang pembelajaran.',
       icon = 'bi-wifi'
 WHERE nama = 'Laboratorium IPA';

UPDATE halaman SET aktif = false WHERE slug = 'pendidikan-karakter';

UPDATE pengaturan
   SET nilai = 'Kurikulum Merdeka (Kurikulum Nasional)'
 WHERE nama_setting = 'kurikulum';

UPDATE halaman
   SET ringkasan = 'Kurikulum yang dipakai sekolah: Kurikulum Merdeka, kini disebut Kurikulum Nasional.',
       isi = E'## Kurikulum yang dipakai\n\nSMAS IMTEK memakai Kurikulum Merdeka, yang sekarang disebut Kurikulum Nasional.'
 WHERE slug = 'kurikulum' AND isi LIKE '[%]';
