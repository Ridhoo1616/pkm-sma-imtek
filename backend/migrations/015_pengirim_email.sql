-- ============================================================
--  Migrasi 015 - Alamat pengirim email, dan perapian tanda pisah
--
--  Dua hal.
--
--  1. ALAMAT PENGIRIM EMAIL dapat diatur dari panel, tidak lagi hanya dari
--     berkas .env di server. Sekolah yang ingin pesannya tampak datang dari
--     ppdb@sekolah, bukan dari akun Gmail yang dipakai mengirim, tidak perlu
--     menyentuh server lagi.
--
--     SANDINYA TETAP DI .env, dan itu disengaja. Sandi aplikasi yang disimpan
--     di basis data akan ikut terbawa setiap kali basis datanya dicadangkan
--     atau disalin ke komputer lain, dan cadangan basis data beredar jauh
--     lebih bebas daripada berkas .env. Yang boleh diatur dari panel hanya
--     alamat dan nama pengirimnya.
--
--     Peringatan yang perlu diketahui panitia: Gmail MENOLAK alamat pengirim
--     yang bukan akun yang dipakai masuk, atau bukan alias yang sudah
--     diverifikasi di setelan Gmail. Mengisi alamat sembarangan membuat
--     pengirimannya gagal, dan galatnya tercatat pada daftar notifikasi.
--     Karena itu kosong berarti memakai alamat akunnya sendiri, yang selalu
--     diterima.
--
--  2. Tanda pisah panjang pada keterangan pengaturan `peta_koordinat`
--     diganti. Keterangan itu tampil sebagai teks bantuan di panel, jadi ia
--     termasuk tulisan yang dibaca panitia, dan tanda pisah panjang tidak
--     lagi dipakai di seluruh tulisan yang tampak.
--  Catatan: kolom `keterangan` pada tabel pengaturan hanya varchar(160).
--  Percobaan pertama migrasi ini GAGAL karena keterangan email_pengirim
--  163 karakter, dan kegagalannya menghentikan server. Persis kekeliruan yang
--  sama dengan migrasi 008. Keterangan panjang tempatnya di komentar berkas
--  ini, bukan di kolomnya.
-- ============================================================

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('email_pengirim', '',
   'Alamat email pengirim notifikasi. Kosong berarti memakai akun SMTP di .env. Gmail menolak alamat yang bukan akunnya atau alias terverifikasi.'),
  ('email_pengirim_nama', '',
   'Nama pengirim yang tampil di kotak masuk penerima, misalnya Panitia PPDB SMA IMTEK. Kosong berarti memakai SMTP_NAMA di berkas .env.')
ON CONFLICT (nama_setting) DO NOTHING;

UPDATE pengaturan
   SET keterangan = 'Koordinat lokasi sekolah, bentuk lintang,bujur. Contoh: -6.301234,106.612345. Dipakai tombol penunjuk arah di beranda. Kosong berarti memakai alamatnya.'
 WHERE nama_setting = 'peta_koordinat';
