-- ============================================================
--  Migrasi 013 — Pencatatan kunjungan situs
--
--  Tabel statistik_kunjungan sudah ada sejak skema pertama, terbawa dari
--  versi PHP, TETAPI tidak pernah ditulis satu baris pun oleh aplikasi Go:
--  tidak ada satu kueri pun yang menyentuhnya, dan di pemasangan sekolah
--  isinya nol baris. Jadi angka kunjungan memang belum pernah ada, bukan
--  sekadar belum ditampilkan.
--
--  Migrasi ini menyiapkan tabelnya untuk dipakai, dengan dua perubahan.
--
--  1. Kolom `ip` diganti nama menjadi `penanda`, dan isinya BUKAN alamat IP
--     melainkan sidik ringkas: enam belas huruf pertama dari SHA-256 atas
--     gabungan rahasia server, alamat IP, dan tanggalnya. Gunanya hanya satu,
--     membedakan dua kunjungan dari orang yang sama pada hari yang sama, dan
--     untuk itu alamat IP aslinya tidak perlu disimpan.
--
--     Menyimpan alamat IP pengunjung berarti menyimpan data pribadi orang
--     yang sekadar membuka halaman sekolah — termasuk calon peserta didik dan
--     orang tuanya — padahal yang dibutuhkan sekolah cuma jumlahnya. Karena
--     tanggalnya ikut masuk ke dalam bahan sidiknya, sidik orang yang sama
--     pun berbeda dari hari ke hari, sehingga riwayat kunjungan seseorang
--     tidak dapat dirangkai dari tabel ini.
--
--     Namanya diganti, bukan dibiarkan `ip` dengan isi yang berbeda, supaya
--     siapa pun yang membaca skemanya nanti tidak menyangka tabel ini memuat
--     alamat IP.
--
--  2. Kolom `halaman` diisi NAMA BAGIAN SITUS, bukan alamat lengkapnya.
--     Alamat yang segmen keduanya berupa satu butir isi dipangkas —
--     "/berita/pendaftaran-ppdb-resmi-dibuka" menjadi "/berita" — sedangkan
--     halaman yang memang bernama dua segmen dibiarkan utuh, misalnya
--     "/profil/visi-misi". Dua sebabnya: daftar bagian yang paling dibuka
--     jadi berisi bagian situs, bukan judul berita satu per satu; dan jumlah
--     barisnya tidak tumbuh mengikuti banyaknya berita maupun banyaknya
--     alamat yang bisa dikarang orang.
--
--  Batasan UNIQUE (tanggal, halaman, penanda) yang sudah ada dipertahankan
--  apa adanya: itulah yang membuat satu orang per bagian per hari terhitung
--  satu pengunjung, sedangkan `jumlah` mencatat berapa kali ia membukanya.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'statistik_kunjungan' AND column_name = 'ip') THEN
    ALTER TABLE statistik_kunjungan RENAME COLUMN ip TO penanda;
  END IF;
END $$;

COMMENT ON COLUMN statistik_kunjungan.penanda IS
  'Sidik ringkas pengunjung: 16 huruf pertama SHA-256 atas rahasia server + alamat IP + tanggal. BUKAN alamat IP, dan tidak dapat dikembalikan menjadi alamat IP.';
COMMENT ON COLUMN statistik_kunjungan.halaman IS
  'Nama bagian situs, misalnya /berita atau /profil/visi-misi. Alamat rincian seperti /berita/{slug} dipangkas menjadi /berita.';
COMMENT ON COLUMN statistik_kunjungan.jumlah IS
  'Berapa kali penanda yang sama membuka halaman itu pada tanggal itu.';

-- Kunjungan selalu dibaca per rentang tanggal, dan tabelnya bertambah setiap
-- hari, jadi tanggalnya diberi indeks sendiri.
CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal ON statistik_kunjungan (tanggal);
