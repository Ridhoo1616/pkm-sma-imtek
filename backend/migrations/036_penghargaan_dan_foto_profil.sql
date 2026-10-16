-- ============================================================
--  Migrasi 036 - Penghargaan sekolah dan dua foto profil (revisi sekolah)
--  Penghargaan: prestasi sekolah, OSIS, dan kegiatan di sekolah, tampil di
--  menu Profil Sekolah. Tabel sendiri, terpisah dari berita Prestasi, karena
--  yang dicatat di sini milik sekolah/OSIS sebagai lembaga, bukan capaian
--  individu siswa.
--  Foto: foto papan data sekolah dan foto visi misi, diunggah lewat
--  Pengaturan seperti foto kepala sekolah.
-- ============================================================
CREATE TABLE IF NOT EXISTS penghargaan (
  id          integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul       varchar(200) NOT NULL,
  kategori    varchar(20)  NOT NULL DEFAULT 'Prestasi Sekolah'
              CHECK (kategori IN ('Prestasi Sekolah', 'OSIS', 'Kegiatan Sekolah')),
  tingkat     varchar(60)  NOT NULL DEFAULT '',
  tahun       varchar(9)   NOT NULL DEFAULT '',
  keterangan  text         NOT NULL DEFAULT '',
  foto        varchar(255),
  urutan      integer      NOT NULL DEFAULT 0,
  aktif       boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('foto_data_sekolah', '',
   'Nama berkas foto papan data sekolah, diunggah lewat menu Pengaturan'),
  ('foto_visi_misi', '',
   'Nama berkas foto visi dan misi sekolah, diunggah lewat menu Pengaturan')
ON CONFLICT (nama_setting) DO NOTHING;

-- Kurikulum pindah dari menu Akademik ke Profil Sekolah (revisi sekolah).
-- Hanya pengelompokannya yang berubah; naskahnya tidak disentuh.
UPDATE halaman SET kelompok = 'Profil' WHERE slug = 'kurikulum';
