-- ============================================================
--  Migrasi 025 - Nama sekolah berstatus swasta dan Bursa Kerja Khusus
--
--  1. Nama sekolah diberi penanda swastanya (permintaan sekolah): nama
--     ringkas "SMAS IMTEK" untuk bilah menu dan judul tab, nama lengkap
--     "SMA Swasta IMTEK" untuk kop surat, kartu peserta, dan sorotan
--     beranda. Nama ringkas hanya diganti bila masih bawaan; nama yang
--     sudah diubah sekolah lewat panel tidak ditimpa.
--
--  2. Bursa Kerja Khusus (BKK): penyaluran lulusan ke dunia kerja.
--       bkk_mitra     perusahaan atau instansi yang bekerja sama
--       bkk_lowongan  lowongan dari mitra, tampil di situs selama dibuka
--       bkk_lamaran   lamaran lulusan beserta tahap penyalurannya
--     Lamaran yang berstatus Diterima itulah lulusan yang tersalurkan.
-- ============================================================

UPDATE pengaturan SET nilai = 'SMAS IMTEK'
 WHERE nama_setting = 'nama_sekolah' AND nilai = 'SMA IMTEK';

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('nama_lengkap_sekolah', 'SMA Swasta IMTEK',
   'Nama resmi lengkap. Dipakai pada kop surat, kartu peserta, dan sorotan beranda.'),
  ('bkk_keterangan', '[Pengantar Bursa Kerja Khusus: tujuan, sasaran lulusan, dan penanggung jawabnya]',
   'Naskah pembuka halaman Bursa Kerja Khusus.'),
  ('bkk_kontak', '',
   'Nomor WhatsApp atau telepon petugas BKK. Kosong berarti memakai kontak sekolah.')
ON CONFLICT (nama_setting) DO NOTHING;

CREATE TABLE IF NOT EXISTS bkk_mitra (
  id              serial       PRIMARY KEY,
  nama            varchar(160) NOT NULL,
  bidang          varchar(120) NOT NULL DEFAULT '',
  alamat          text         NOT NULL DEFAULT '',
  kontak_nama     varchar(120) NOT NULL DEFAULT '',
  kontak_telepon  varchar(25)  NOT NULL DEFAULT '',
  kontak_email    varchar(120) NOT NULL DEFAULT '',
  situs           varchar(300) NOT NULL DEFAULT '',
  logo            varchar(255),
  aktif           boolean      NOT NULL DEFAULT true,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bkk_lowongan (
  id           serial       PRIMARY KEY,
  -- RESTRICT: mitra yang pernah membuka lowongan tidak dapat dihapus,
  -- sebab riwayat penyalurannya ikut hilang. Mitra cukup dinonaktifkan.
  mitra_id     integer      NOT NULL REFERENCES bkk_mitra (id) ON DELETE RESTRICT,
  posisi       varchar(160) NOT NULL,
  jenis        varchar(20)  NOT NULL DEFAULT 'Penuh Waktu'
               CHECK (jenis IN ('Penuh Waktu', 'Kontrak', 'Paruh Waktu', 'Magang')),
  lokasi       varchar(160) NOT NULL DEFAULT '',
  deskripsi    text         NOT NULL DEFAULT '',
  kualifikasi  text         NOT NULL DEFAULT '',
  gaji         varchar(100) NOT NULL DEFAULT '',
  kuota        integer      CHECK (kuota IS NULL OR kuota BETWEEN 1 AND 10000),
  batas_lamar  date,
  status       varchar(10)  NOT NULL DEFAULT 'draf'
               CHECK (status IN ('draf', 'buka', 'tutup')),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bkk_lowongan_mitra ON bkk_lowongan (mitra_id);

CREATE TABLE IF NOT EXISTS bkk_lamaran (
  id             serial       PRIMARY KEY,
  kode           varchar(20)  NOT NULL UNIQUE,
  lowongan_id    integer      NOT NULL REFERENCES bkk_lowongan (id) ON DELETE RESTRICT,
  nama           varchar(120) NOT NULL,
  nisn           varchar(10)  NOT NULL,
  tanggal_lahir  date         NOT NULL,
  jenis_kelamin  char(1)      NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
  tahun_lulus    integer      NOT NULL CHECK (tahun_lulus BETWEEN 1990 AND 2200),
  telepon        varchar(25)  NOT NULL,
  email          varchar(120) NOT NULL DEFAULT '',
  alamat         text         NOT NULL DEFAULT '',
  ringkasan      text         NOT NULL DEFAULT '',
  cv             varchar(255),
  status         varchar(12)  NOT NULL DEFAULT 'Diajukan'
                 CHECK (status IN ('Diajukan', 'Diteruskan', 'Wawancara', 'Diterima', 'Ditolak')),
  -- Catatan petugas ini DIBACA pelamar di halaman Cek Lamaran.
  catatan        text         NOT NULL DEFAULT '',
  sumber         varchar(8)   NOT NULL DEFAULT 'daring' CHECK (sumber IN ('daring', 'manual')),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  -- Satu lulusan satu lamaran per lowongan.
  UNIQUE (lowongan_id, nisn)
);
CREATE INDEX IF NOT EXISTS bkk_lamaran_status ON bkk_lamaran (status);
