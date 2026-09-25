-- ============================================================
--  Migrasi 019 - Angka sekolah untuk beranda
--
--  Beranda menampilkan angka sekolah pada kartu sorotannya, dan sampai
--  sekarang isinya hanya yang dapat DIHITUNG dari basis data: jumlah
--  peminatan dan jumlah fasilitas. Permintaan user menambahkan jumlah siswa
--  dan jumlah guru.
--
--  Keduanya TIDAK DAPAT dihitung, dan itu sebabnya menjadi pengaturan:
--
--    - Sistem ini tidak punya tabel siswa. Yang ada tabel pendaftar, yaitu
--      calon peserta didik pada satu tahun ajaran, bukan seluruh siswa yang
--      sedang bersekolah. Menghitungnya dari sana akan menghasilkan angka
--      yang jauh lebih kecil dan salah.
--    - Tabel tenaga_pendidik memang ada, tetapi isinya daftar yang
--      DITAMPILKAN sekolah di halaman profil, bukan seluruh pegawainya.
--      Sekolah dengan tiga puluh guru bisa saja menampilkan sepuluh. Memakai
--      hitungan barisnya sebagai angka utama di beranda akan memamerkan
--      angka yang lebih kecil daripada kenyataannya.
--
--  Jumlah ekstrakurikuler TIDAK dijadikan pengaturan, sebab tabel
--  kegiatan_siswa memang daftar lengkapnya dan dapat dihitung langsung.
--
--  Ketiganya diisi penanda [kurung siku]. Angka yang masih penanda tidak
--  ditampilkan di beranda: halaman promosi tidak boleh memamerkan angka
--  kosong maupun angka contoh.
-- ============================================================

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('jumlah_siswa', '[Jumlah siswa aktif, contoh 540]',
   'Jumlah siswa yang sedang bersekolah. Tampil pada angka sekolah di beranda.'),
  ('jumlah_guru', '[Jumlah guru dan tenaga kependidikan, contoh 32]',
   'Jumlah guru beserta tenaga kependidikan. Tampil pada angka sekolah di beranda.'),
  ('jumlah_rombel', '[Jumlah rombongan belajar atau kelas, contoh 18]',
   'Jumlah rombongan belajar. Tampil pada angka sekolah di beranda.')
ON CONFLICT (nama_setting) DO NOTHING;
