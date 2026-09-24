-- ============================================================
--  Migrasi 012 — Kategori galeri yang ditampilkan sebuah halaman naskah
--
--  Halaman OSIS perlu memuat foto dokumentasi kegiatan OSIS. Fotonya TIDAK
--  disimpan di tabel baru: tabel galeri sudah ada, sudah punya kolom
--  kategori, dan sudah punya menu unggahnya sendiri di panel admin. Membuat
--  tempat penyimpanan foto yang kedua berarti panitia harus mengingat foto
--  mana diunggah ke mana, dan halaman Galeri tidak akan memuat foto OSIS
--  padahal ia dokumentasi kegiatan sekolah juga.
--
--  Jadi yang ditambahkan di sini hanya PENUNJUKNYA: nama kategori galeri yang
--  fotonya ditampilkan pada halaman ini. Panitia mengunggah lewat menu Galeri
--  seperti biasa, memberi kategori yang sama, dan fotonya muncul di kedua
--  tempat.
--
--  Ditulis sebagai kolom, bukan dicocokkan diam-diam dengan judul halamannya,
--  karena pencocokan diam-diam tidak terlihat oleh siapa pun: panitia tidak
--  akan tahu bahwa kategori galeri harus dinamai persis sama dengan judul
--  halaman, dan kalau salah satu hurufnya berbeda tidak ada yang menerangkan
--  kenapa fotonya tidak muncul. Sebagai kolom, ia tampil sebagai isian di
--  formulir halaman beserta keterangannya.
--
--  Kosong berarti halaman itu tidak menampilkan galeri sama sekali.
-- ============================================================

ALTER TABLE halaman
  ADD COLUMN IF NOT EXISTS galeri_kategori varchar(60) NOT NULL DEFAULT '';

-- Halaman OSIS diarahkan ke kategori "OSIS". Kategorinya sendiri belum tentu
-- ada isinya, dan itu tidak apa-apa: bagiannya menampilkan keterangan bahwa
-- fotonya belum diunggah, beserta nama menu tempat mengunggahnya.
UPDATE halaman SET galeri_kategori = 'OSIS'
 WHERE slug = 'osis' AND galeri_kategori = '';
