-- ============================================================
--  Migrasi 005 — Keunggulan sekolah untuk beranda
--
--  Beranda semula dibuka dengan kartu kuota PPDB: angka pendaftar, sisa
--  kuota, dan tanggal penutupan. Itu menjawab pertanyaan orang yang SUDAH
--  memutuskan mendaftar. Orang tua yang baru mencari sekolah menanyakan hal
--  lain lebih dulu — sekolahnya seperti apa, apa yang ditawarkan, sebagus
--  apa — dan judul PkM ini pun tentang PROMOSI, bukan tentang pendaftaran.
--  Karena itu beranda dibalik: profil sekolah di depan, PPDB menyusul.
--
--  Yang belum ada bahannya di basis data hanya satu: alasan memilih sekolah
--  ini. Satu pengaturan baru disiapkan untuk itu, satu baris satu poin,
--  mengikuti cara `misi` bekerja. Disimpan sebagai pengaturan, bukan tabel
--  tersendiri, karena isinya beberapa kalimat pendek tanpa gambar dan tanpa
--  urutan yang perlu digeser-geser.
--
--  Nilainya ditandai [kurung siku]: kalimat tentang mutu sekolah hanya
--  boleh datang dari sekolah. Selama masih bertanda itu, bagiannya TIDAK
--  tampil ke pengunjung, dan di panel admin bertanda "belum terisi".
-- ============================================================

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('keunggulan',
   '[Keunggulan pertama sekolah, misalnya soal kegiatan belajar]' || chr(10) ||
   '[Keunggulan kedua, misalnya soal pembinaan karakter]' || chr(10) ||
   '[Keunggulan ketiga, misalnya soal sarana atau ekstrakurikuler]',
   'Alasan memilih sekolah ini, satu baris satu poin. Tampil di beranda. Dikosongkan berarti bagiannya tidak tampil.')
ON CONFLICT (nama_setting) DO NOTHING;
