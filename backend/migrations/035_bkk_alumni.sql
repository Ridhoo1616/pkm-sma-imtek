-- ============================================================
--  Migrasi 035 - Profil alumni yang sudah bekerja lewat BKK
--  Ditampilkan di halaman BKK sebagai bukti hasil penyaluran. Isinya data
--  pribadi alumni, jadi hanya diisi petugas dengan izin alumni yang
--  bersangkutan. Perusahaan ditulis bebas (bukan rujukan ke bkk_mitra)
--  karena alumni bisa bekerja di tempat yang bukan mitra.
-- ============================================================
CREATE TABLE IF NOT EXISTS bkk_alumni (
  id          serial       PRIMARY KEY,
  nama        varchar(120) NOT NULL,
  angkatan    varchar(9)   NOT NULL DEFAULT '',
  jabatan     varchar(120) NOT NULL DEFAULT '',
  perusahaan  varchar(160) NOT NULL DEFAULT '',
  kisah       text         NOT NULL DEFAULT '',
  foto        varchar(255),
  urutan      integer      NOT NULL DEFAULT 0,
  aktif       boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now()
);
