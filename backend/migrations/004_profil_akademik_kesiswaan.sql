-- ============================================================
--  Migrasi 004: profil sekolah, akademik, dan kesiswaan
--
--  Menambah isi yang biasa ada pada situs sekolah menengah, dikelompokkan
--  menjadi tiga menu bertingkat. Yang sudah tersedia TIDAK diduplikasi:
--
--    Sejarah, Visi, Misi, Data Sekolah  -> sudah ada di tabel pengaturan
--    Sarana dan Prasarana               -> sudah ada di tabel fasilitas
--    Prestasi Siswa                     -> sudah ada di berita kategori Prestasi
--
--  Yang ditambahkan di sini hanya yang benar-benar belum ada.
--
--  Aturan penulisan mengikuti 001_skema.sql: varchar beserta CHECK bukan
--  enum, updated_at diisi pemicu set_updated_at(), nama huruf kecil.
-- ============================================================

-- ------------------------------------------------------------
--  1. Halaman isi bebas
--
--  Satu tabel untuk halaman yang isinya naskah panjang: Kurikulum, OSIS,
--  Pendidikan Karakter, dan halaman serupa yang mungkin ditambahkan sekolah
--  kemudian. Dibuat umum supaya sekolah tidak perlu menunggu kode diubah
--  setiap kali ingin menambah satu halaman profil.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS halaman (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug       varchar(120) NOT NULL UNIQUE,
  judul      varchar(180) NOT NULL,
  ringkasan  varchar(400) NOT NULL DEFAULT '',
  isi        text         NOT NULL DEFAULT '',
  gambar     varchar(255),
  kelompok   varchar(20)  NOT NULL DEFAULT 'Profil'
               CHECK (kelompok IN ('Profil', 'Akademik', 'Kesiswaan')),
  urutan     integer      NOT NULL DEFAULT 0,
  aktif      boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER halaman_updated_at BEFORE UPDATE ON halaman
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_halaman_tampil ON halaman (aktif, kelompok, urutan, id);

-- ------------------------------------------------------------
--  2. Tenaga pendidik dan kependidikan
--
--  Kategori dipisah karena halaman publiknya menampilkannya sebagai tiga
--  kelompok: pimpinan, guru, lalu tenaga kependidikan.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenaga_pendidik (
  id             integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama           varchar(120) NOT NULL,
  -- NIP tidak wajib: guru yayasan dan tenaga honorer belum tentu punya.
  nip            varchar(30)  NOT NULL DEFAULT '',
  jabatan        varchar(120) NOT NULL DEFAULT '',
  mata_pelajaran varchar(120) NOT NULL DEFAULT '',
  kategori       varchar(20)  NOT NULL DEFAULT 'Pendidik'
                   CHECK (kategori IN ('Pimpinan', 'Pendidik', 'Kependidikan')),
  foto           varchar(255),
  urutan         integer      NOT NULL DEFAULT 0,
  aktif          boolean      NOT NULL DEFAULT true,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER tenaga_pendidik_updated_at BEFORE UPDATE ON tenaga_pendidik
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenaga_tampil
  ON tenaga_pendidik (aktif, kategori, urutan, id);

-- ------------------------------------------------------------
--  3. Agenda, dipakai kalender akademik
--
--  Satu baris boleh berupa satu hari maupun satu rentang, karena kegiatan
--  sekolah bercampur keduanya: upacara satu hari, ujian satu minggu.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agenda (
  id          integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul       varchar(180) NOT NULL,
  mulai       date         NOT NULL,
  selesai     date,
  kategori    varchar(30)  NOT NULL DEFAULT 'Kegiatan'
                CHECK (kategori IN ('Kegiatan', 'Ujian', 'Libur',
                                    'PPDB', 'Rapat', 'Lainnya')),
  keterangan  text         NOT NULL DEFAULT '',
  aktif       boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CHECK (selesai IS NULL OR selesai >= mulai)
);

CREATE TRIGGER agenda_updated_at BEFORE UPDATE ON agenda
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_agenda_tampil ON agenda (aktif, mulai, id);

-- ------------------------------------------------------------
--  4. Kegiatan siswa: ekstrakurikuler dan OSIS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kegiatan_siswa (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama       varchar(120) NOT NULL,
  jenis      varchar(20)  NOT NULL DEFAULT 'Ekstrakurikuler'
               CHECK (jenis IN ('Ekstrakurikuler', 'OSIS', 'Pembinaan')),
  deskripsi  text         NOT NULL DEFAULT '',
  pembina    varchar(120) NOT NULL DEFAULT '',
  jadwal     varchar(160) NOT NULL DEFAULT '',
  gambar     varchar(255),
  urutan     integer      NOT NULL DEFAULT 0,
  aktif      boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER kegiatan_siswa_updated_at BEFORE UPDATE ON kegiatan_siswa
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_kegiatan_tampil
  ON kegiatan_siswa (aktif, jenis, urutan, id);

-- ------------------------------------------------------------
--  5. Perpustakaan digital
--
--  Katalog, bukan penyimpan berkas. Satu baris boleh menunjuk berkas yang
--  diunggah sekolah, boleh juga menunjuk tautan luar, karena banyak koleksi
--  digital sekolah sebenarnya berada di Google Drive atau di portal
--  Kemendikbud dan tidak perlu disalin ke sini.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pustaka (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul      varchar(200) NOT NULL,
  penulis    varchar(160) NOT NULL DEFAULT '',
  kategori   varchar(60)  NOT NULL DEFAULT 'Umum',
  tahun      integer      CHECK (tahun IS NULL OR tahun BETWEEN 1900 AND 2200),
  keterangan text         NOT NULL DEFAULT '',
  -- Salah satu dari keduanya diisi; diperiksa di lapisan aplikasi karena
  -- pesannya perlu menjelaskan pilihannya kepada panitia.
  tautan     varchar(500) NOT NULL DEFAULT '',
  berkas     varchar(255),
  urutan     integer      NOT NULL DEFAULT 0,
  aktif      boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER pustaka_updated_at BEFORE UPDATE ON pustaka
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pustaka_tampil ON pustaka (aktif, kategori, urutan, id);

-- ------------------------------------------------------------
--  6. Pengaturan baru
--
--  Tiga di antaranya adalah TAUTAN KELUAR, bukan sistem yang dibangun di
--  sini. E-learning dan perpustakaan daring sekolah umumnya sudah berjalan
--  di layanan lain; menuliskan tautannya lebih berguna daripada membangun
--  sistem kedua yang isinya kosong.
-- ------------------------------------------------------------
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('foto_kepsek', '',
   'Nama berkas foto kepala sekolah, diunggah lewat menu Pengaturan'),
  ('struktur_organisasi', '',
   'Nama berkas bagan struktur organisasi, diunggah lewat menu Pengaturan'),
  ('struktur_keterangan',
   '[Keterangan singkat tentang susunan organisasi sekolah]',
   'Keterangan di bawah bagan struktur organisasi'),
  ('tautan_elearning', '',
   'Alamat e-learning atau LMS sekolah, misalnya Google Classroom atau Moodle. Dikosongkan berarti menunya menjelaskan bahwa layanannya belum tersedia.'),
  ('tautan_jadwal', '',
   'Alamat atau berkas jadwal pelajaran. Dikosongkan berarti halamannya menjelaskan bahwa jadwalnya belum diunggah.'),
  ('jadwal_keterangan',
   '[Keterangan jadwal pelajaran: berlaku sejak kapan, dan siapa yang dapat dihubungi bila ada perubahan]',
   'Keterangan pada halaman Jadwal Pelajaran'),
  ('perpustakaan_keterangan',
   '[Keterangan singkat tentang layanan perpustakaan sekolah]',
   'Keterangan pada halaman Perpustakaan Digital')
ON CONFLICT (nama_setting) DO NOTHING;

-- ------------------------------------------------------------
--  7. Halaman awal
--
--  Judul dan kerangkanya disiapkan, isinya ditandai kurung siku karena
--  naskahnya hanya boleh berasal dari sekolah. Dengan begitu menunya sudah
--  lengkap sejak awal, dan panitia cukup mengisi naskahnya.
-- ------------------------------------------------------------
INSERT INTO halaman (slug, judul, ringkasan, isi, kelompok, urutan, aktif) VALUES
  ('kurikulum', 'Kurikulum',
   'Kurikulum yang dipakai sekolah beserta struktur mata pelajarannya.',
   '[Naskah kurikulum: kurikulum yang dipakai, struktur mata pelajaran tiap tingkat, jumlah jam belajar, dan penjelasan peminatan]',
   'Akademik', 1, true),
  ('osis', 'OSIS',
   'Organisasi Siswa Intra Sekolah: susunan pengurus dan program kerjanya.',
   '[Naskah OSIS: susunan pengurus, program kerja tahun ini, dan cara siswa ikut serta]',
   'Kesiswaan', 1, true),
  ('pendidikan-karakter', 'Pendidikan Karakter',
   'Pembinaan karakter dan kedisiplinan peserta didik.',
   '[Naskah pendidikan karakter: nilai yang ditanamkan, bentuk pembinaannya, dan tata tertib pokok]',
   'Kesiswaan', 2, true)
ON CONFLICT (slug) DO NOTHING;
