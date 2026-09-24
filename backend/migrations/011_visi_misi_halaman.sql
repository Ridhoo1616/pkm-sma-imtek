-- ============================================================
--  Migrasi 011 — Visi dan misi milik halaman naskah
--
--  Halaman OSIS perlu memuat visi dan misi OSIS-nya sendiri, dan itu BUKAN
--  visi misi sekolah: yang di menu Pengaturan milik sekolah dan tampil pada
--  halaman Profil Sekolah. Memakai ulang yang itu berarti halaman OSIS
--  menampilkan rumusan yang bukan miliknya.
--
--  Kolomnya ditaruh di tabel halaman, bukan sebagai pengaturan bernama
--  `osis_visi` dan `osis_misi`, karena dua alasan:
--
--   1. Halaman naskah dapat ditambah sekolah sendiri dari panel admin. Bila
--      besok mereka membuat halaman Pramuka atau Rohis yang juga punya visi
--      misi, pengaturan bernama khusus OSIS tidak menolong sama sekali dan
--      kodenya harus diubah lagi. Sebagai kolom, halaman apa pun langsung
--      dapat memakainya.
--   2. Panitia mengisinya di tempat yang sama dengan naskah halamannya —
--      satu formulir, bukan berpindah ke menu Pengaturan untuk satu bagian
--      dari halaman yang sedang dikerjakannya.
--
--  Keduanya TIDAK wajib. Kosong berarti bagian visi dan misi tidak tampil
--  sama sekali pada halaman itu, dan itu keadaan yang benar bagi Kurikulum
--  maupun Pendidikan Karakter yang memang tidak punya rumusan sendiri.
--
--  Misi ditulis satu baris satu poin, mengikuti cara pengaturan `misi` dan
--  `keunggulan` yang sudah ada, supaya panitia tidak perlu mengingat dua cara
--  penulisan yang berbeda.
-- ============================================================

ALTER TABLE halaman ADD COLUMN IF NOT EXISTS visi text NOT NULL DEFAULT '';
ALTER TABLE halaman ADD COLUMN IF NOT EXISTS misi text NOT NULL DEFAULT '';

-- Penanda bagi halaman OSIS saja, supaya panitia melihat bagian itu ada dan
-- tahu bentuk isinya. Halaman lain dibiarkan kosong: bagiannya tidak tampil.
-- Ditulis dalam kurung siku mengikuti kebiasaan penanda pada pengaturan lain,
-- sehingga situs publiknya menampilkan keterangan "belum tersedia", bukan
-- kalimat karangan.
UPDATE halaman
   SET visi = '[Rumusan visi OSIS dari sekolah]',
       misi = '[Poin misi OSIS pertama]' || chr(10) ||
              '[Poin misi OSIS kedua]' || chr(10) ||
              '[Poin misi OSIS ketiga]'
 WHERE slug = 'osis' AND visi = '' AND misi = '';
