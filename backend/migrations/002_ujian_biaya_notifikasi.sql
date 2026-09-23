-- ============================================================
--  Migrasi 002: rincian biaya, bank soal dan ujian seleksi,
--               kartu peserta, serta catatan notifikasi
--
--  Aturan penulisan mengikuti 001_skema.sql:
--
--    1. Pilihan yang terbatas ditulis varchar beserta CHECK, bukan enum,
--       karena menambah satu pilihan pada enum PostgreSQL memerlukan
--       ALTER TYPE sedangkan pada CHECK cukup menggantinya.
--    2. Kolom updated_at diisi pemicu set_updated_at() yang sudah dibuat
--       migrasi 001, karena PostgreSQL tidak mengenal
--       ON UPDATE CURRENT_TIMESTAMP.
--    3. Seluruh nama ditulis huruf kecil.
-- ============================================================

-- ------------------------------------------------------------
--  1. Rincian biaya
--
--  Sebelumnya biaya hanya satu baris teks pada tabel pengaturan, sehingga
--  tidak bisa dirinci maupun dijumlahkan. Dipisah menjadi tabel sendiri agar
--  orang tua dapat melihat setiap pos beserta jumlahnya, dan agar totalnya
--  dihitung sistem, bukan diketik tangan.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biaya (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama       varchar(120) NOT NULL,
  -- Rupiah bulat. Disimpan bigint, bukan numeric, karena tidak ada sen.
  jumlah     bigint       NOT NULL DEFAULT 0 CHECK (jumlah >= 0),
  satuan     varchar(40)  NOT NULL DEFAULT 'sekali bayar',
  tahap      varchar(30)  NOT NULL DEFAULT 'Pendaftaran'
               CHECK (tahap IN ('Pendaftaran', 'Daftar Ulang',
                                'Rutin Bulanan', 'Lainnya')),
  keterangan text         NOT NULL DEFAULT '',
  wajib      boolean      NOT NULL DEFAULT true,
  urutan     integer      NOT NULL DEFAULT 0,
  aktif      boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER biaya_updated_at BEFORE UPDATE ON biaya
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_biaya_tampil ON biaya (aktif, tahap, urutan, id);

-- ------------------------------------------------------------
--  2. Bank soal
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soal (
  id             integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mata_pelajaran varchar(60)  NOT NULL,
  pertanyaan     text         NOT NULL,
  pilihan_a      text         NOT NULL,
  pilihan_b      text         NOT NULL,
  pilihan_c      text         NOT NULL DEFAULT '',
  pilihan_d      text         NOT NULL DEFAULT '',
  pilihan_e      text         NOT NULL DEFAULT '',
  jawaban        varchar(1)   NOT NULL CHECK (jawaban IN ('A','B','C','D','E')),
  pembahasan     text         NOT NULL DEFAULT '',
  aktif          boolean      NOT NULL DEFAULT true,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER soal_updated_at BEFORE UPDATE ON soal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_soal_pilih ON soal (aktif, mata_pelajaran, id);

-- ------------------------------------------------------------
--  3. Paket ujian
--
--  Satu paket adalah satu jadwal tes seleksi: kapan dibuka, berapa lama,
--  berapa soal yang diambil dari bank soal, dan nilai minimum kelulusannya.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paket_ujian (
  id             integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama           varchar(120) NOT NULL,
  tahun_ajaran   varchar(9)   NOT NULL,
  durasi_menit   integer      NOT NULL DEFAULT 60 CHECK (durasi_menit BETWEEN 5 AND 300),
  jumlah_soal    integer      NOT NULL DEFAULT 20 CHECK (jumlah_soal BETWEEN 1 AND 200),
  -- Soal diacak per peserta agar menyontek antar layar lebih sulit.
  acak_soal      boolean      NOT NULL DEFAULT true,
  mulai          timestamptz,
  selesai        timestamptz,
  nilai_minimum  integer      NOT NULL DEFAULT 60 CHECK (nilai_minimum BETWEEN 0 AND 100),
  keterangan     text         NOT NULL DEFAULT '',
  aktif          boolean      NOT NULL DEFAULT false,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CHECK (selesai IS NULL OR mulai IS NULL OR selesai > mulai)
);

CREATE TRIGGER paket_ujian_updated_at BEFORE UPDATE ON paket_ujian
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
--  4. Sesi ujian
--
--  Satu baris per pendaftar per paket. Batas waktunya disimpan sebagai waktu
--  mutlak saat sesi dimulai, bukan dihitung ulang setiap permintaan, supaya
--  peserta tidak bisa memperpanjang waktunya dengan memuat ulang halaman.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesi_ujian (
  id            integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pendaftar_id  integer      NOT NULL REFERENCES pendaftar (id) ON DELETE CASCADE,
  paket_id      integer      NOT NULL REFERENCES paket_ujian (id) ON DELETE CASCADE,
  mulai_pada    timestamptz  NOT NULL DEFAULT now(),
  batas_pada    timestamptz  NOT NULL,
  selesai_pada  timestamptz,
  jumlah_benar  integer      NOT NULL DEFAULT 0,
  jumlah_soal   integer      NOT NULL DEFAULT 0,
  skor          numeric(5,2) NOT NULL DEFAULT 0 CHECK (skor BETWEEN 0 AND 100),
  status        varchar(20)  NOT NULL DEFAULT 'Berjalan'
                  CHECK (status IN ('Berjalan', 'Selesai', 'Kedaluwarsa')),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (pendaftar_id, paket_id)
);

CREATE TRIGGER sesi_ujian_updated_at BEFORE UPDATE ON sesi_ujian
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sesi_pendaftar ON sesi_ujian (pendaftar_id, paket_id);

-- ------------------------------------------------------------
--  5. Soal di dalam satu sesi
--
--  Susunan soal dibekukan saat sesi dimulai. Kalau tidak, mengacak ulang di
--  setiap permintaan akan membuat nomor soal berpindah-pindah, dan jawaban
--  yang sudah diisi peserta menjadi salah tempat.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesi_soal (
  id       integer    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sesi_id  integer    NOT NULL REFERENCES sesi_ujian (id) ON DELETE CASCADE,
  soal_id  integer    NOT NULL REFERENCES soal (id) ON DELETE RESTRICT,
  urutan   integer    NOT NULL,
  jawaban  varchar(1) CHECK (jawaban IS NULL OR jawaban IN ('A','B','C','D','E')),
  benar    boolean,
  UNIQUE (sesi_id, soal_id),
  UNIQUE (sesi_id, urutan)
);

CREATE INDEX IF NOT EXISTS idx_sesi_soal_urut ON sesi_soal (sesi_id, urutan);

-- ------------------------------------------------------------
--  6. Catatan notifikasi
--
--  Tabel ini mencatat pesan yang perlu dikirim ke orang tua beserta
--  keadaannya. Pengirimannya sendiri ada dua jalur, lihat backend/notifikasi.go:
--  panitia menekan tombol dan pesannya terbuka di WhatsApp, atau dikirim
--  otomatis lewat gateway resmi bila alamatnya disetel.
--
--  Yang dicatat adalah pesan, bukan hanya penanda terkirim, supaya panitia
--  dapat melihat persis apa yang diterima orang tua bila ada sengketa.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifikasi (
  id            integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pendaftar_id  integer      REFERENCES pendaftar (id) ON DELETE CASCADE,
  kanal         varchar(20)  NOT NULL DEFAULT 'WhatsApp'
                  CHECK (kanal IN ('WhatsApp', 'Email')),
  tujuan        varchar(120) NOT NULL,
  jenis         varchar(40)  NOT NULL,
  pesan         text         NOT NULL,
  status        varchar(20)  NOT NULL DEFAULT 'Menunggu'
                  CHECK (status IN ('Menunggu', 'Terkirim', 'Gagal', 'Dibatalkan')),
  galat         text         NOT NULL DEFAULT '',
  dikirim_pada  timestamptz,
  dikirim_oleh  integer      REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER notifikasi_updated_at BEFORE UPDATE ON notifikasi
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_notifikasi_antre ON notifikasi (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifikasi_pendaftar ON notifikasi (pendaftar_id, created_at DESC);

-- ------------------------------------------------------------
--  7. Kolom tambahan pada pendaftar untuk kartu peserta ujian
--
--  Ruang dan nomor kursi diisi panitia. Keduanya boleh kosong, karena
--  sekolah yang pesertanya sedikit sering tidak membaginya per ruang.
-- ------------------------------------------------------------
ALTER TABLE pendaftar ADD COLUMN IF NOT EXISTS ruang_ujian varchar(40) NOT NULL DEFAULT '';
ALTER TABLE pendaftar ADD COLUMN IF NOT EXISTS kursi_ujian varchar(20) NOT NULL DEFAULT '';

-- ------------------------------------------------------------
--  8. Pengaturan baru
--
--  Naskah notifikasi memakai penanda dalam kurung kurawal yang diganti saat
--  pesan dibuat. Daftar penanda yang dikenal ada di backend/notifikasi.go.
-- ------------------------------------------------------------
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('ujian_aktif', '0',
   'Buka atau tutup tes seleksi online. Isi 1 untuk membuka.'),
  ('ujian_info',
   '[Keterangan tes seleksi: perangkat yang dipakai, tata cara, dan yang dilarang]',
   'Keterangan tes seleksi yang tampil di halaman Info PPDB'),
  ('biaya_catatan',
   '[Catatan tentang biaya, misalnya keringanan bagi yang membutuhkan]',
   'Catatan di bawah rincian biaya'),
  ('wa_notif_verifikasi',
   'Assalamualaikum, Bapak/Ibu orang tua {nama}. Berkas pendaftaran dengan nomor {no_registrasi} sudah kami verifikasi dan dinyatakan {status}. {catatan} Terima kasih. Panitia PPDB {sekolah}.',
   'Naskah notifikasi WhatsApp saat berkas diverifikasi'),
  ('wa_notif_ujian',
   'Assalamualaikum, Bapak/Ibu orang tua {nama}. Tes seleksi PPDB {sekolah} dijadwalkan {jadwal_ujian}. Nomor peserta {no_registrasi}. Kartu peserta dapat diunduh di halaman Cek Status. Terima kasih.',
   'Naskah notifikasi WhatsApp jadwal tes seleksi'),
  ('wa_notif_kelulusan',
   'Assalamualaikum, Bapak/Ibu orang tua {nama}. Hasil seleksi PPDB {sekolah} untuk nomor {no_registrasi}: {status}. {catatan} Rincian dapat dilihat di halaman Cek Status. Terima kasih.',
   'Naskah notifikasi WhatsApp pengumuman hasil seleksi')
ON CONFLICT (nama_setting) DO NOTHING;

-- ------------------------------------------------------------
--  9. Data awal rincian biaya
--
--  Jumlahnya sengaja nol dan namanya ditandai kurung siku, karena besaran
--  biaya hanya boleh berasal dari sekolah. Menuliskan angka karangan pada
--  halaman yang judulnya "Transparansi Biaya" justru merusak tujuannya.
-- ------------------------------------------------------------
INSERT INTO biaya (nama, jumlah, satuan, tahap, keterangan, wajib, urutan, aktif) VALUES
  ('Formulir pendaftaran', 0, 'sekali bayar', 'Pendaftaran',
   '[Isi besaran biaya formulir, atau nonaktifkan baris ini bila pendaftaran gratis]',
   true, 1, true),
  ('Daftar ulang', 0, 'sekali bayar', 'Daftar Ulang',
   '[Isi besaran biaya daftar ulang bagi yang dinyatakan diterima]',
   true, 2, true),
  ('Sumbangan Pembinaan Pendidikan (SPP)', 0, 'per bulan', 'Rutin Bulanan',
   '[Isi besaran SPP per bulan]',
   true, 3, true),
  ('Seragam dan atribut', 0, 'sekali bayar', 'Daftar Ulang',
   '[Isi besaran biaya seragam, atau nonaktifkan bila disediakan sekolah]',
   false, 4, true)
ON CONFLICT DO NOTHING;
