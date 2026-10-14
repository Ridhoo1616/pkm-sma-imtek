-- ============================================================
--  Migrasi 032 - Rincian data sekolah
--  Butir papan Identitas Sekolah yang belum punya tempat: nomor induk
--  lama (NSS, NIS, NSB), legalitas, kurikulum, wilayah, dan bangunan.
--  Semuanya tampil di halaman Data Sekolah; yang kosong tidak ditampilkan.
-- ============================================================
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('nss', '', 'Nomor Statistik Sekolah (NSS)'),
  ('nis_sekolah', '', 'Nomor Induk Sekolah (NIS), bukan nomor induk siswa'),
  ('nsb', '', 'Nomor Statistik Bangunan (NSB)'),
  ('sk_akreditasi', '', 'Nomor surat keputusan akreditasi'),
  ('penerbit_sk_akreditasi', '', 'Lembaga yang menerbitkan SK akreditasi'),
  ('tahun_berdiri', '', 'Tahun sekolah berdiri'),
  ('kurikulum', '', 'Kurikulum yang dipakai dalam kegiatan belajar mengajar'),
  ('daerah', '', 'Jenis daerah, misalnya Pedesaan atau Perkotaan'),
  ('gugus', '', 'Kelompok sekolah atau gugus'),
  ('status_bangunan', '', 'Status kepemilikan bangunan sekolah'),
  ('luas_bangunan', '', 'Luas bangunan sekolah beserta satuannya'),
  ('jarak_kecamatan', '', 'Jarak ke pusat kecamatan'),
  ('jarak_kabupaten', '', 'Jarak ke pusat kabupaten/kota'),
  ('anggota_rayon', '', 'Jumlah keanggotaan rayon')
ON CONFLICT (nama_setting) DO NOTHING;
