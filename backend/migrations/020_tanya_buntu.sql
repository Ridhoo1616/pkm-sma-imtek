-- ============================================================
--  Migrasi 020 - Pertanyaan yang tidak terjawab kotak Tanya cepat
--
--  Kotak "Tanya cepat" menjawab dari Tanya Jawab yang ditulis panitia dan
--  dari data sekolah. Bila tidak menemukan, ia mengaku tidak tahu — dan
--  sampai sekarang pengakuan itu hilang begitu saja.
--
--  Padahal di situlah keterangannya. Pertanyaan yang tidak terjawab adalah
--  daftar persis dari apa yang ingin diketahui orang tua tetapi belum
--  disediakan sekolah. Menebak-nebaknya dari kursi pengembang tidak pernah
--  seakurat membaca apa yang benar-benar diketik orang.
--
--  Yang disimpan HANYA teks pertanyaannya. Tidak ada alamat IP, tidak ada
--  pengenal peramban, tidak ada apa pun yang menunjuk orangnya. Panjangnya
--  dibatasi 300 aksara, sama dengan kolom pertanyaan pada tabel faq.
--
--  Pertanyaan yang sama digabung, bukan ditumpuk: yang menentukan prioritas
--  panitia bukan banyaknya baris melainkan berapa orang menanyakan hal yang
--  sama. Penggabungannya memakai bentuk baku pada kolom `kunci` — huruf
--  kecil tanpa tanda baca — sehingga "Kapan dibuka?" dan "kapan dibuka"
--  terhitung satu.
-- ============================================================

CREATE TABLE IF NOT EXISTS tanya_buntu (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kunci       varchar(300) NOT NULL UNIQUE,
  pertanyaan  varchar(300) NOT NULL,
  jumlah      integer      NOT NULL DEFAULT 1,
  ditangani   boolean      NOT NULL DEFAULT false,
  dibuat_pada timestamptz  NOT NULL DEFAULT now(),
  terakhir    timestamptz  NOT NULL DEFAULT now()
);

-- Panitia membuka daftar ini terurut menurut yang paling sering ditanyakan,
-- dan yang sudah ditangani disembunyikan.
CREATE INDEX IF NOT EXISTS tanya_buntu_urut
  ON tanya_buntu (ditangani, jumlah DESC, terakhir DESC);
