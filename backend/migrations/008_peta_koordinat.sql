-- ============================================================
--  Migrasi 008 — Koordinat lokasi sekolah
--
--  Beranda mendapat bagian peta yang memungkinkan pengunjung mengukur jarak
--  dan waktu tempuh dari rumahnya. Perhitungannya TIDAK dikerjakan situs ini,
--  dan itu keputusan yang disengaja:
--
--  Menghitung jarak jalan beserta estimasi waktu memerlukan layanan rute —
--  Google Directions API, Mapbox, atau sejenisnya — dan seluruhnya menuntut
--  kunci API yang ditagih per permintaan. Kunci itu tidak boleh diletakkan di
--  repositori publik, dan sekolah tidak punya anggaran langganan. Menghitung
--  sendiri dengan rumus jarak lurus juga bukan jalan keluar: jarak lurus 5 km
--  bisa berarti 12 km lewat jalan, dan angka yang menyesatkan lebih buruk
--  daripada tidak ada angka.
--
--  Jadi yang dikerjakan situs ini menyerahkan pengukurannya ke Google Maps
--  lewat tautan arah: Google yang memakai lokasi pengunjung, Google yang
--  menghitung rutenya, dan Google yang menampilkan jarak beserta waktu tempuh
--  per moda. Tidak ada kunci API, tidak ada biaya, dan lokasi pengunjung tidak
--  pernah melewati server sekolah.
--
--  Koordinat ini yang menjadi tujuan tautan itu. Bila dikosongkan, tujuannya
--  memakai alamat sekolah sebagai teks — tetap bekerja, hanya titiknya bisa
--  kurang tepat bila alamatnya tidak dikenali Google.
--
--  Cara mengisinya: buka Google Maps, klik kanan pada lokasi sekolah, klik
--  angka koordinat yang muncul untuk menyalinnya, lalu tempel di sini.
--  Catatan: kolom `keterangan` pada tabel pengaturan hanya varchar(160),
--  jadi keterangan panjang tempatnya di komentar berkas ini. Percobaan
--  pertama migrasi ini gagal karena keterangannya 190 karakter.
-- ============================================================

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('peta_koordinat', '',
   'Koordinat lokasi sekolah, bentuk lintang,bujur — misalnya -6.301234,106.612345. Dipakai tombol penunjuk arah di beranda. Kosong berarti memakai alamatnya.')
ON CONFLICT (nama_setting) DO NOTHING;
