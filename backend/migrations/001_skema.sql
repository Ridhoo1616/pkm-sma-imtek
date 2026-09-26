-- ============================================================
--  BASIS DATA SISTEM INFORMASI PROFIL SEKOLAH & PPDB SMA IMTEK
--  Pengabdian Kepada Masyarakat (PkM) Universitas Pamulang
--  Program Studi: Teknik Informatika
--  Bidang PkM: Manajemen Komputer & Sistem
--
--  PostgreSQL 14 atau lebih baru.
--
--  Nama basis data TIDAK ditentukan di sini. Berkas ini dijalankan
--  oleh pelaksana migrasi backend Go pada basis data yang ditunjuk
--  variabel lingkungan DB_NAME, sehingga satu skema yang sama bisa
--  dipakai untuk basis data produksi maupun basis data uji.
--
--  Pilihan bentuk yang perlu diketahui:
--  - Kolom berpilihan tetap memakai VARCHAR + CHECK, bukan tipe ENUM
--    Postgres. Menambah satu pilihan pada tipe ENUM perlu ALTER TYPE,
--    sedangkan pada CHECK cukup mengganti batasannya.
--  - Kolom updated_at diurus trigger, karena Postgres tidak punya
--    padanan ON UPDATE CURRENT_TIMESTAMP milik MySQL.
--  - Seluruh nama tabel dan kolom huruf kecil, jadi tidak pernah
--    perlu tanda kutip ganda saat dipanggil.
-- ============================================================

-- ------------------------------------------------------------
--  Fungsi pembantu untuk kolom updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. Pengguna (admin / operator PPDB)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama       varchar(100) NOT NULL,
  username   varchar(50)  NOT NULL UNIQUE,
  password   varchar(255) NOT NULL,
  role       varchar(20)  NOT NULL DEFAULT 'operator'
               CHECK (role IN ('admin', 'operator')),
  last_login timestamptz  NULL,
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. Pengaturan situs dan PPDB (pasangan nama dan nilai)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pengaturan (
  nama_setting varchar(60)  NOT NULL PRIMARY KEY,
  nilai        text         NULL,
  keterangan   varchar(160) NULL
);

-- ------------------------------------------------------------
-- 3. Peminatan
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jurusan (
  id        integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kode      varchar(20)  NOT NULL UNIQUE,
  nama      varchar(100) NOT NULL,
  deskripsi text         NULL,
  kuota     integer      NOT NULL DEFAULT 0,
  icon      varchar(50)  NULL,
  aktif     boolean      NOT NULL DEFAULT true,
  urutan    integer      NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 4. Pendaftar PPDB
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pendaftar (
  id                integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  no_registrasi     varchar(25)  NOT NULL UNIQUE,
  tahun_ajaran      varchar(12)  NOT NULL,
  jalur             varchar(40)  NOT NULL DEFAULT 'Reguler'
                      CHECK (jalur IN ('Reguler', 'Prestasi', 'Afirmasi',
                                       'Perpindahan Tugas Orang Tua')),
  jurusan_id        integer      NULL REFERENCES jurusan(id) ON DELETE SET NULL,

  nama_lengkap      varchar(120) NOT NULL,
  nisn              varchar(20)  NULL,
  nik               varchar(20)  NULL,
  jenis_kelamin     varchar(1)   NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
  tempat_lahir      varchar(80)  NOT NULL,
  tanggal_lahir     date         NOT NULL,
  agama             varchar(30)  NOT NULL,
  anak_ke           varchar(10)  NULL,
  jumlah_saudara    varchar(10)  NULL,

  alamat            text         NOT NULL,
  kelurahan         varchar(80)  NULL,
  kecamatan         varchar(80)  NULL,
  kota              varchar(80)  NULL,
  provinsi          varchar(80)  NULL,
  kode_pos          varchar(10)  NULL,
  no_hp             varchar(25)  NOT NULL,
  email             varchar(120) NULL,

  asal_sekolah      varchar(140) NOT NULL,
  npsn_sekolah      varchar(20)  NULL,
  alamat_sekolah    varchar(200) NULL,
  tahun_lulus       varchar(8)   NULL,
  nilai_rata2       numeric(5,2) NULL,

  nama_ayah         varchar(120) NOT NULL,
  pekerjaan_ayah    varchar(80)  NULL,
  pendidikan_ayah   varchar(40)  NULL,
  nama_ibu          varchar(120) NOT NULL,
  pekerjaan_ibu     varchar(80)  NULL,
  pendidikan_ibu    varchar(40)  NULL,
  penghasilan       varchar(60)  NULL,
  no_hp_ortu        varchar(25)  NULL,
  nama_wali         varchar(120) NULL,

  file_foto         varchar(160) NULL,
  file_ijazah       varchar(160) NULL,
  file_kk           varchar(160) NULL,
  file_akta         varchar(160) NULL,
  file_raport       varchar(160) NULL,
  file_prestasi     varchar(160) NULL,

  -- Kanal promosi yang membawa pendaftar. Kolom inilah yang menjawab
  -- tujuan program: mengukur efektivitas promosi.
  sumber_informasi  varchar(60)  NULL,
  catatan_sumber    varchar(160) NULL,

  status            varchar(30)  NOT NULL DEFAULT 'Menunggu Verifikasi'
                      CHECK (status IN ('Menunggu Verifikasi', 'Terverifikasi',
                                        'Diterima', 'Cadangan', 'Ditolak')),
  catatan_admin     text         NULL,
  diverifikasi_oleh integer      NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now(),
  ip_pendaftar      varchar(45)  NULL
);

CREATE INDEX IF NOT EXISTS idx_pendaftar_status ON pendaftar (status);
CREATE INDEX IF NOT EXISTS idx_pendaftar_tahun  ON pendaftar (tahun_ajaran);
CREATE INDEX IF NOT EXISTS idx_pendaftar_sumber ON pendaftar (sumber_informasi);

-- Pendaftaran ganda ditolak basis data, bukan hanya oleh aplikasi.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pendaftar_orang
  ON pendaftar (lower(nama_lengkap), tanggal_lahir, tahun_ajaran);

DROP TRIGGER IF EXISTS pendaftar_updated_at ON pendaftar;
CREATE TRIGGER pendaftar_updated_at BEFORE UPDATE ON pendaftar
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 5. Berita dan pengumuman
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS berita (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul      varchar(200) NOT NULL,
  slug       varchar(220) NOT NULL UNIQUE,
  kategori   varchar(20)  NOT NULL DEFAULT 'Berita'
               CHECK (kategori IN ('Berita', 'Pengumuman', 'Prestasi', 'Kegiatan')),
  ringkasan  varchar(300) NULL,
  isi        text         NOT NULL,
  gambar     varchar(160) NULL,
  penulis    varchar(100) NULL,
  dibaca     integer      NOT NULL DEFAULT 0,
  publish    boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_berita_publish ON berita (publish, created_at);

DROP TRIGGER IF EXISTS berita_updated_at ON berita;
CREATE TRIGGER berita_updated_at BEFORE UPDATE ON berita
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 6. Galeri kegiatan
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS galeri (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul      varchar(160) NOT NULL,
  kategori   varchar(60)  NULL,
  gambar     varchar(160) NOT NULL,
  keterangan varchar(300) NULL,
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 7. Fasilitas sekolah
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fasilitas (
  id        integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama      varchar(120) NOT NULL,
  deskripsi text         NULL,
  gambar    varchar(160) NULL,
  icon      varchar(50)  NULL,
  urutan    integer      NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 8. Pesan dari formulir kontak
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pesan (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama       varchar(100) NOT NULL,
  email      varchar(120) NULL,
  no_hp      varchar(25)  NULL,
  subjek     varchar(160) NULL,
  isi        text         NOT NULL,
  dibaca     boolean      NOT NULL DEFAULT false,
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 9. Statistik kunjungan halaman
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statistik_kunjungan (
  id      integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tanggal date         NOT NULL,
  halaman varchar(120) NOT NULL,
  referer varchar(255) NULL,
  ip      varchar(45)  NULL,
  jumlah  integer      NOT NULL DEFAULT 1,
  UNIQUE (tanggal, halaman, ip)
);

CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal ON statistik_kunjungan (tanggal);

-- ============================================================
--  DATA AWAL
-- ============================================================

-- Akun admin bawaan: username admin, kata sandi admin123.
-- WAJIB diganti sebelum dipakai sungguhan, karena hash ini ada di
-- dalam repositori publik.
INSERT INTO users (nama, username, password, role) VALUES
('Administrator', 'admin', '$2y$10$fIk0V.BZhSYKfA.dhO1NjeaJ.Pnwxixga89t20/hKxzSq8vNPVq8e', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Nilai di dalam [kurung siku] berarti masih menunggu data dari pihak
-- sekolah. Aplikasi mengenali pola itu dan menandainya "belum terisi"
-- pada halaman Pengaturan, serta tidak menampilkannya ke pengunjung.
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
('nama_sekolah',     'SMA IMTEK',            'Nama sekolah'),
('nama_singkat',     'SI',                   'Singkatan untuk lambang di navigasi'),
('tagline',          '[Tagline atau semboyan sekolah]', 'Kalimat singkat di halaman depan'),
('npsn',             '20613766',             'NPSN sekolah'),
('akreditasi',       'B',                    'Peringkat akreditasi'),
('status_sekolah',   'Swasta',               'Status sekolah: Negeri atau Swasta'),
('yayasan',          '[Nama yayasan penyelenggara]', 'Yayasan penyelenggara'),
('kepala_sekolah',   '[Nama kepala sekolah]', 'Nama dan gelar kepala sekolah'),
('sambutan_kepsek',  '[Naskah sambutan kepala sekolah]', 'Sambutan di halaman Profil'),
('visi',             '[Rumusan visi sekolah]', 'Visi sekolah'),
('misi',             '[Rumusan misi sekolah, satu baris satu poin]', 'Misi sekolah (satu baris satu poin)'),
('sejarah',          '[Sejarah singkat sekolah]', 'Sejarah singkat'),

('alamat',           'Jl. Raya Pagedangan, Cicalengka, Kec. Pagedangan, Kab. Tangerang, Prov. Banten 15339', 'Alamat lengkap sekolah'),
('kelurahan',        'Cicalengka',           'Kelurahan atau desa'),
('kecamatan',        'Pagedangan',           'Kecamatan'),
('kota',             'Kabupaten Tangerang',  'Kabupaten atau kota'),
('provinsi',         'Banten',               'Provinsi'),
('kode_pos',         '15339',                'Kode pos'),
('telepon',          '021-55689125',         'Telepon sekolah'),
('email',            'smaimtekpagedangan@gmail.com', 'Surel sekolah'),
('whatsapp',         '',                     'Nomor WhatsApp panitia. Kosong berarti tombol WhatsApp disembunyikan'),
('jam_layanan',      '[Jam layanan sekolah]', 'Jam layanan, contoh: Senin sampai Jumat, 07.00 sampai 15.00 WIB'),
('peta_embed',       '',                     'Kode sematan iframe Google Maps'),

('instagram',        '',                     'Alamat lengkap Instagram'),
('facebook',         '',                     'Alamat lengkap Facebook'),
('youtube',          '',                     'Alamat lengkap YouTube'),
('tiktok',           '',                     'Alamat lengkap TikTok'),

('logo',             '',                     'Nama berkas logo sekolah'),
('foto_depan',       '',                     'Nama berkas foto halaman depan'),

('ppdb_status',      'buka',                 'buka atau tutup'),
('ppdb_tahun',       '2027/2028',            'Tahun ajaran PPDB yang aktif'),
('ppdb_mulai',       '2026-09-01',           'Tanggal mulai pendaftaran'),
('ppdb_selesai',     '2027-06-30',           'Tanggal tutup pendaftaran'),
('ppdb_pengumuman',  '2027-07-05',           'Tanggal pengumuman hasil'),
('ppdb_kuota',       '180',                  'Kuota penerimaan keseluruhan'),
('ppdb_biaya',       'Pendaftaran GRATIS (tanpa biaya)', 'Keterangan biaya pendaftaran'),
('ppdb_syarat',      '[Persyaratan tambahan dari sekolah, satu baris satu poin]', 'Persyaratan tambahan (satu baris satu poin)'),
('ppdb_alur',        '',                     'Alur pendaftaran versi sekolah. Kosong berarti memakai alur bawaan sistem')
ON CONFLICT (nama_setting) DO NOTHING;

INSERT INTO jurusan (kode, nama, deskripsi, kuota, icon, urutan) VALUES
('MIPA', 'Peminatan MIPA', '[Deskripsi peminatan MIPA dari sekolah]', 90, 'bi-calculator', 1),
('IPS',  'Peminatan IPS',  '[Deskripsi peminatan IPS dari sekolah]', 60, 'bi-globe-americas', 2),
('BHS',  'Peminatan Bahasa', '[Deskripsi peminatan Bahasa dari sekolah]', 30, 'bi-translate', 3)
ON CONFLICT (kode) DO NOTHING;

-- Fasilitas di bawah adalah daftar yang lazim ada di SMA. Sekolah dapat
-- menghapus yang tidak dimiliki dan menambah yang belum tercantum lewat
-- menu Fasilitas.
INSERT INTO fasilitas (nama, deskripsi, icon, urutan)
SELECT * FROM (VALUES
  ('Laboratorium Komputer', 'Lab komputer dengan koneksi internet untuk pembelajaran informatika dan literasi digital.', 'bi-pc-display', 1),
  ('Laboratorium IPA',      'Laboratorium Fisika, Kimia, dan Biologi dengan peralatan praktikum.', 'bi-eyedropper', 2),
  ('Perpustakaan',          'Koleksi buku pelajaran, referensi, dan bacaan umum dengan ruang baca.', 'bi-book', 3),
  ('Lapangan Olahraga',     'Lapangan serbaguna untuk basket, futsal, voli, dan kegiatan upacara.', 'bi-dribbble', 4),
  ('Musala',                'Sarana ibadah untuk kegiatan keagamaan dan pembinaan karakter.', 'bi-moon-stars', 5),
  ('Ruang Kelas',           'Ruang kelas berventilasi baik yang dilengkapi proyektor.', 'bi-easel', 6),
  ('Ruang UKS',             'Unit Kesehatan Sekolah untuk pertolongan pertama.', 'bi-heart-pulse', 7),
  ('Koperasi dan Kantin',   'Kantin sekolah dan koperasi yang menyediakan kebutuhan peserta didik.', 'bi-shop', 8)
) AS baru(nama, deskripsi, icon, urutan)
WHERE NOT EXISTS (SELECT 1 FROM fasilitas);

-- Dua berita awal di bawah menerangkan cara kerja sistem ini, bukan
-- kegiatan sekolah. Berita tentang kegiatan dan prestasi sengaja tidak
-- diisi, karena harus berasal dari sekolah sendiri.
INSERT INTO berita (judul, slug, kategori, ringkasan, isi, penulis, publish)
SELECT * FROM (VALUES
  ('Pendaftaran Peserta Didik Baru Tahun Ajaran 2027/2028 Resmi Dibuka',
   'pendaftaran-peserta-didik-baru-tahun-ajaran-2027-2028-resmi-dibuka',
   'Pengumuman',
   'Pendaftaran dibuka 1 September 2026 sampai 30 Juni 2027 dan seluruhnya dilakukan secara online.',
   'SMA IMTEK membuka Penerimaan Peserta Didik Baru untuk Tahun Ajaran 2027/2028. Seluruh tahapan dilakukan secara online, sehingga calon peserta didik tidak perlu datang ke sekolah untuk mengisi formulir.

Kuota keseluruhan tahun ini 180 kursi, terbagi menjadi 90 kursi Peminatan MIPA, 60 kursi Peminatan IPS, dan 30 kursi Peminatan Bahasa. Tersedia empat jalur pendaftaran: Reguler, Prestasi, Afirmasi, dan Perpindahan Tugas Orang Tua. Pendaftar jalur Prestasi wajib mengunggah sertifikat prestasinya.

Pendaftaran tidak dipungut biaya. Pengumuman hasil seleksi dijadwalkan pada 5 Juli 2027.',
   'Panitia PPDB', true),

  ('Cara Mendaftar PPDB Secara Online',
   'cara-mendaftar-ppdb-secara-online',
   'Berita',
   'Panduan langkah demi langkah mengisi formulir, mengunggah dokumen, dan memantau hasil verifikasi.',
   'Pendaftaran online dapat diselesaikan dalam waktu kurang dari lima belas menit, asalkan dokumennya sudah disiapkan lebih dulu.

Siapkan hasil pindai atau foto dari tiga dokumen wajib, yaitu foto 3x4, ijazah atau surat keterangan lulus, dan Kartu Keluarga. Akta kelahiran, rapor, dan sertifikat prestasi bersifat opsional. Setiap berkas dibatasi 2 MB.

Buka menu Daftar PPDB, lalu isi formulir yang terbagi menjadi lima langkah. Anda dapat berpindah antar langkah kapan saja sebelum mengirim.

Setelah formulir terkirim, sistem menerbitkan nomor registrasi. Simpan nomor tersebut. Nomor itu beserta tanggal lahir adalah kunci untuk memantau hasil verifikasi lewat menu Cek Status.',
   'Panitia PPDB', true)
) AS baru(judul, slug, kategori, ringkasan, isi, penulis, publish)
WHERE NOT EXISTS (SELECT 1 FROM berita);
