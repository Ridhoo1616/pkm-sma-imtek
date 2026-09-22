-- ============================================================
--  DATABASE SISTEM INFORMASI PROFIL SEKOLAH & PPDB SMA IMTEK
--  Program Kreativitas Mahasiswa (PkM)
--  Bidang: Manajemen Komputer & Sistem
-- ============================================================

CREATE DATABASE IF NOT EXISTS `sma_imtek`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sma_imtek`;

-- ------------------------------------------------------------
-- 1. Pengguna (admin / operator PPDB)
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `nama`       VARCHAR(100)  NOT NULL,
  `username`   VARCHAR(50)   NOT NULL UNIQUE,
  `password`   VARCHAR(255)  NOT NULL,
  `role`       ENUM('admin','operator') NOT NULL DEFAULT 'operator',
  `last_login` DATETIME      NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. Pengaturan situs & PPDB (key-value)
-- ------------------------------------------------------------
CREATE TABLE `pengaturan` (
  `nama_setting` VARCHAR(60) NOT NULL PRIMARY KEY,
  `nilai`        TEXT        NULL,
  `keterangan`   VARCHAR(160) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. Peminatan / program studi
-- ------------------------------------------------------------
CREATE TABLE `jurusan` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `kode`      VARCHAR(20)  NOT NULL UNIQUE,
  `nama`      VARCHAR(100) NOT NULL,
  `deskripsi` TEXT         NULL,
  `kuota`     INT          NOT NULL DEFAULT 0,
  `icon`      VARCHAR(50)  NULL,
  `aktif`     TINYINT(1)   NOT NULL DEFAULT 1,
  `urutan`    INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. Pendaftar PPDB
-- ------------------------------------------------------------
CREATE TABLE `pendaftar` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `no_registrasi`   VARCHAR(25)  NOT NULL UNIQUE,
  `tahun_ajaran`    VARCHAR(12)  NOT NULL,
  `jalur`           ENUM('Reguler','Prestasi','Afirmasi','Perpindahan Tugas Orang Tua') NOT NULL DEFAULT 'Reguler',
  `jurusan_id`      INT          NULL,

  -- Data calon peserta didik
  `nama_lengkap`    VARCHAR(120) NOT NULL,
  `nisn`            VARCHAR(20)  NULL,
  `nik`             VARCHAR(20)  NULL,
  `jenis_kelamin`   ENUM('L','P') NOT NULL,
  `tempat_lahir`    VARCHAR(80)  NOT NULL,
  `tanggal_lahir`   DATE         NOT NULL,
  `agama`           VARCHAR(30)  NOT NULL,
  `anak_ke`         VARCHAR(10)  NULL,
  `jumlah_saudara`  VARCHAR(10)  NULL,
  `alamat`          TEXT         NOT NULL,
  `kelurahan`       VARCHAR(80)  NULL,
  `kecamatan`       VARCHAR(80)  NULL,
  `kota`            VARCHAR(80)  NULL,
  `provinsi`        VARCHAR(80)  NULL,
  `kode_pos`        VARCHAR(10)  NULL,
  `no_hp`           VARCHAR(25)  NOT NULL,
  `email`           VARCHAR(120) NULL,

  -- Asal sekolah
  `asal_sekolah`    VARCHAR(140) NOT NULL,
  `npsn_sekolah`    VARCHAR(20)  NULL,
  `alamat_sekolah`  VARCHAR(200) NULL,
  `tahun_lulus`     VARCHAR(8)   NULL,
  `nilai_rata2`     DECIMAL(5,2) NULL,

  -- Data orang tua / wali
  `nama_ayah`       VARCHAR(120) NOT NULL,
  `pekerjaan_ayah`  VARCHAR(80)  NULL,
  `pendidikan_ayah` VARCHAR(40)  NULL,
  `nama_ibu`        VARCHAR(120) NOT NULL,
  `pekerjaan_ibu`   VARCHAR(80)  NULL,
  `pendidikan_ibu`  VARCHAR(40)  NULL,
  `penghasilan`     VARCHAR(60)  NULL,
  `no_hp_ortu`      VARCHAR(25)  NULL,
  `nama_wali`       VARCHAR(120) NULL,

  -- Dokumen unggahan (nama file)
  `file_foto`       VARCHAR(160) NULL,
  `file_ijazah`     VARCHAR(160) NULL,
  `file_kk`         VARCHAR(160) NULL,
  `file_akta`       VARCHAR(160) NULL,
  `file_raport`     VARCHAR(160) NULL,
  `file_prestasi`   VARCHAR(160) NULL,

  -- Evaluasi efektivitas promosi
  `sumber_informasi` VARCHAR(60) NULL COMMENT 'Kanal promosi yang membawa pendaftar',
  `catatan_sumber`   VARCHAR(160) NULL,

  -- Status seleksi
  `status`          ENUM('Menunggu Verifikasi','Terverifikasi','Diterima','Cadangan','Ditolak') NOT NULL DEFAULT 'Menunggu Verifikasi',
  `catatan_admin`   TEXT         NULL,
  `diverifikasi_oleh` INT        NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ip_pendaftar`    VARCHAR(45)  NULL,

  INDEX `idx_status` (`status`),
  INDEX `idx_tahun`  (`tahun_ajaran`),
  INDEX `idx_sumber` (`sumber_informasi`),
  CONSTRAINT `fk_pendaftar_jurusan` FOREIGN KEY (`jurusan_id`) REFERENCES `jurusan`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. Berita / pengumuman
-- ------------------------------------------------------------
CREATE TABLE `berita` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `judul`      VARCHAR(200) NOT NULL,
  `slug`       VARCHAR(220) NOT NULL UNIQUE,
  `kategori`   ENUM('Berita','Pengumuman','Prestasi','Kegiatan') NOT NULL DEFAULT 'Berita',
  `ringkasan`  VARCHAR(300) NULL,
  `isi`        LONGTEXT     NOT NULL,
  `gambar`     VARCHAR(160) NULL,
  `penulis`    VARCHAR(100) NULL,
  `dibaca`     INT          NOT NULL DEFAULT 0,
  `publish`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_publish` (`publish`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. Galeri kegiatan
-- ------------------------------------------------------------
CREATE TABLE `galeri` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `judul`      VARCHAR(160) NOT NULL,
  `kategori`   VARCHAR(60)  NULL,
  `gambar`     VARCHAR(160) NOT NULL,
  `keterangan` VARCHAR(300) NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. Fasilitas sekolah
-- ------------------------------------------------------------
CREATE TABLE `fasilitas` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `nama`      VARCHAR(120) NOT NULL,
  `deskripsi` TEXT         NULL,
  `gambar`    VARCHAR(160) NULL,
  `icon`      VARCHAR(50)  NULL,
  `urutan`    INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 8. Pesan dari form kontak
-- ------------------------------------------------------------
CREATE TABLE `pesan` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `nama`       VARCHAR(100) NOT NULL,
  `email`      VARCHAR(120) NULL,
  `no_hp`      VARCHAR(25)  NULL,
  `subjek`     VARCHAR(160) NULL,
  `isi`        TEXT         NOT NULL,
  `dibaca`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 9. Statistik kunjungan (pengukuran jangkauan promosi)
-- ------------------------------------------------------------
CREATE TABLE `statistik_kunjungan` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal`   DATE         NOT NULL,
  `halaman`   VARCHAR(120) NOT NULL,
  `referer`   VARCHAR(255) NULL,
  `ip`        VARCHAR(45)  NULL,
  `jumlah`    INT          NOT NULL DEFAULT 1,
  UNIQUE KEY `uniq_kunjungan` (`tanggal`, `halaman`, `ip`),
  INDEX `idx_tanggal` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  DATA AWAL
-- ============================================================

-- Akun admin default -> username: admin | password: admin123
INSERT INTO `users` (`nama`, `username`, `password`, `role`) VALUES
('Administrator', 'admin', '$2y$10$fIk0V.BZhSYKfA.dhO1NjeaJ.Pnwxixga89t20/hKxzSq8vNPVq8e', 'admin');

INSERT INTO `pengaturan` (`nama_setting`, `nilai`, `keterangan`) VALUES
('nama_sekolah',    'SMA IMTEK',                                            'Nama sekolah'),
('tagline',         'Unggul dalam Prestasi, Berkarakter, dan Siap Teknologi','Tagline sekolah'),
('npsn',            '00000000',                                             'NPSN sekolah'),
('akreditasi',      'A',                                                    'Peringkat akreditasi'),
('kepala_sekolah',  'Nama Kepala Sekolah, S.Pd., M.Pd.',                    'Nama kepala sekolah'),
('sambutan',        'Selamat datang di website resmi SMA IMTEK. Kami berkomitmen menyelenggarakan pendidikan yang unggul, berkarakter, dan adaptif terhadap perkembangan teknologi.', 'Sambutan kepala sekolah'),
('sejarah',         'SMA IMTEK didirikan sebagai wujud komitmen dalam menyediakan layanan pendidikan menengah atas yang berkualitas bagi masyarakat sekitar.', 'Sejarah singkat'),
('visi',            'Menjadi sekolah menengah atas unggulan yang menghasilkan lulusan berprestasi, berakhlak mulia, dan menguasai teknologi.', 'Visi sekolah'),
('misi',            "Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan\nMenanamkan nilai keimanan, ketakwaan, dan akhlak mulia\nMengembangkan potensi akademik dan non-akademik peserta didik\nMembekali peserta didik dengan literasi digital dan teknologi\nMembangun budaya sekolah yang disiplin, peduli, dan berwawasan lingkungan", 'Misi sekolah (satu baris satu poin)'),
('alamat',          'Jl. Pendidikan No. 1, Kota, Provinsi',                  'Alamat sekolah'),
('kota',            'Kota',                                                 'Kota untuk kop bukti pendaftaran'),
('telepon',         '(021) 0000000',                                        'Telepon sekolah'),
('whatsapp',        '6281234567890',                                         'Nomor WhatsApp (format 62xxx)'),
('email',           'info@smaimtek.sch.id',                                  'Email sekolah'),
('instagram',       'https://instagram.com/smaimtek',                         'Link Instagram'),
('facebook',        'https://facebook.com/smaimtek',                          'Link Facebook'),
('youtube',         '',                                                      'Link YouTube'),
('tiktok',          '',                                                      'Link TikTok'),
('maps_embed',      '',                                                      'Kode src iframe Google Maps'),
('jam_operasional', 'Senin - Jumat, 07.00 - 15.00 WIB',                      'Jam layanan'),
('ppdb_status',     'buka',                                                  'buka / tutup'),
('ppdb_tahun',      '2027/2028',                                             'Tahun ajaran PPDB aktif'),
('ppdb_mulai',      '2026-09-01',                                            'Tanggal mulai pendaftaran'),
('ppdb_selesai',    '2027-06-30',                                            'Tanggal akhir pendaftaran'),
('ppdb_kuota',      '180',                                                   'Total kuota penerimaan'),
('ppdb_biaya',      'Pendaftaran GRATIS (tanpa biaya)',                       'Informasi biaya pendaftaran'),
('ppdb_syarat',     "Fotokopi ijazah/SKL SMP/MTs\nFotokopi rapor semester 1-5\nFotokopi Kartu Keluarga\nFotokopi Akta Kelahiran\nFoto berwarna ukuran 3x4\nSertifikat prestasi (bila ada, untuk jalur prestasi)", 'Syarat pendaftaran (satu baris satu poin)'),
('ppdb_pengumuman', '2027-07-05',                                            'Tanggal pengumuman hasil'),
('jml_siswa',       '540',                                                   'Jumlah siswa'),
('jml_guru',        '32',                                                    'Jumlah guru'),
('jml_alumni',      '1200',                                                  'Jumlah alumni'),
('jml_prestasi',    '45',                                                    'Jumlah prestasi');

INSERT INTO `jurusan` (`kode`, `nama`, `deskripsi`, `kuota`, `icon`, `urutan`) VALUES
('MIPA', 'Peminatan MIPA', 'Fokus pada Matematika, Fisika, Kimia, dan Biologi untuk peserta didik yang ingin melanjutkan ke bidang sains, teknologi, dan kesehatan.', 90, 'bi-calculator', 1),
('IPS',  'Peminatan IPS',  'Fokus pada Ekonomi, Sosiologi, Geografi, dan Sejarah untuk peserta didik yang tertarik pada bidang sosial, hukum, dan bisnis.', 60, 'bi-globe-americas', 2),
('BHS',  'Peminatan Bahasa', 'Fokus pada Bahasa dan Sastra Indonesia, Inggris, serta bahasa asing lainnya.', 30, 'bi-translate', 3);

INSERT INTO `fasilitas` (`nama`, `deskripsi`, `icon`, `urutan`) VALUES
('Laboratorium Komputer', 'Lab komputer dengan koneksi internet untuk pembelajaran informatika dan literasi digital.', 'bi-pc-display', 1),
('Laboratorium IPA',      'Laboratorium Fisika, Kimia, dan Biologi dengan peralatan praktikum yang memadai.', 'bi-eyedropper', 2),
('Perpustakaan',          'Koleksi buku pelajaran, referensi, dan bacaan umum dengan ruang baca yang nyaman.', 'bi-book', 3),
('Lapangan Olahraga',     'Lapangan serbaguna untuk basket, futsal, voli, dan kegiatan upacara.', 'bi-dribbble', 4),
('Musala',                'Sarana ibadah untuk kegiatan keagamaan dan pembinaan karakter.', 'bi-moon-stars', 5),
('Ruang Kelas Nyaman',    'Ruang kelas ber-ventilasi baik yang dilengkapi proyektor untuk pembelajaran interaktif.', 'bi-easel', 6),
('Ruang UKS',             'Unit Kesehatan Sekolah untuk pertolongan pertama dan layanan kesehatan siswa.', 'bi-heart-pulse', 7),
('Koperasi & Kantin',     'Kantin sehat dan koperasi sekolah yang menyediakan kebutuhan siswa.', 'bi-shop', 8);

INSERT INTO `berita` (`judul`, `slug`, `kategori`, `ringkasan`, `isi`, `penulis`, `publish`) VALUES
('PPDB SMA IMTEK Tahun Ajaran 2027/2028 Resmi Dibuka',
 'ppdb-sma-imtek-tahun-ajaran-2027-2028-resmi-dibuka',
 'Pengumuman',
 'Pendaftaran Peserta Didik Baru SMA IMTEK tahun ajaran 2027/2028 dibuka secara online melalui website resmi sekolah.',
 'SMA IMTEK resmi membuka Penerimaan Peserta Didik Baru (PPDB) untuk tahun ajaran 2027/2028. Tahun ini pendaftaran dapat dilakukan sepenuhnya secara online melalui website resmi sekolah, sehingga calon peserta didik tidak perlu datang ke sekolah untuk mengisi formulir.\n\nPendaftaran dibuka untuk tiga peminatan yaitu MIPA, IPS, dan Bahasa dengan total kuota 180 peserta didik. Tersedia empat jalur pendaftaran: Reguler, Prestasi, Afirmasi, dan Perpindahan Tugas Orang Tua.\n\nCalon peserta didik cukup mengisi formulir online, mengunggah dokumen persyaratan, lalu mencetak bukti pendaftaran. Status pendaftaran dapat dipantau kapan saja melalui menu Cek Status dengan memasukkan nomor registrasi dan tanggal lahir.',
 'Admin PPDB', 1),
('Alur Pendaftaran Online PPDB: Panduan Lengkap untuk Calon Siswa',
 'alur-pendaftaran-online-ppdb-panduan-lengkap',
 'Berita',
 'Panduan langkah demi langkah mendaftar PPDB SMA IMTEK secara online, mulai dari mengisi formulir hingga mencetak bukti pendaftaran.',
 'Proses pendaftaran online PPDB SMA IMTEK dirancang sederhana dan dapat diselesaikan dalam waktu kurang dari 15 menit.\n\nLangkah pertama, siapkan dokumen dalam bentuk hasil pindai atau foto: ijazah/SKL, rapor, Kartu Keluarga, akta kelahiran, dan foto 3x4. Pastikan setiap berkas berukuran maksimal 2 MB.\n\nLangkah kedua, buka menu PPDB Online lalu isi formulir pendaftaran yang terdiri dari data calon peserta didik, data asal sekolah, data orang tua, dan unggahan dokumen.\n\nLangkah ketiga, setelah formulir dikirim sistem akan menerbitkan nomor registrasi. Simpan nomor tersebut dan cetak bukti pendaftaran. Verifikasi oleh panitia dilakukan maksimal 3 hari kerja dan hasilnya dapat dilihat melalui menu Cek Status.',
 'Admin PPDB', 1),
('Siswa SMA IMTEK Raih Juara dalam Lomba Kompetensi Tingkat Kota',
 'siswa-sma-imtek-raih-juara-lomba-kompetensi-tingkat-kota',
 'Prestasi',
 'Peserta didik SMA IMTEK kembali menorehkan prestasi pada ajang lomba kompetensi tingkat kota tahun ini.',
 'Peserta didik SMA IMTEK berhasil meraih prestasi pada lomba kompetensi tingkat kota. Keberhasilan ini merupakan hasil pembinaan rutin melalui kegiatan ekstrakurikuler dan program pendampingan olimpiade yang dilaksanakan sekolah.\n\nKepala sekolah menyampaikan apresiasi kepada seluruh peserta didik dan guru pembina. Sekolah akan terus memperkuat program pembinaan prestasi agar semakin banyak peserta didik yang berkompetisi di tingkat yang lebih tinggi.',
 'Humas Sekolah', 1);
