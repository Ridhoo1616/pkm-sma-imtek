-- ============================================================
--  Migrasi 003: tanya jawab (FAQ)
--
--  Aturan penulisan mengikuti 001_skema.sql: varchar beserta CHECK
--  bukan enum, updated_at diisi pemicu set_updated_at(), nama huruf kecil.
-- ============================================================

CREATE TABLE IF NOT EXISTS faq (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pertanyaan varchar(300) NOT NULL,
  jawaban    text         NOT NULL,
  kategori   varchar(30)  NOT NULL DEFAULT 'Umum'
               CHECK (kategori IN ('Umum', 'Pendaftaran', 'Berkas',
                                   'Biaya', 'Tes Seleksi', 'Pengumuman')),
  -- Pertanyaan yang ditandai sorot muncul lebih dulu dan diberi penanda,
  -- dipakai untuk yang paling sering ditanyakan orang tua.
  sorot      boolean      NOT NULL DEFAULT false,
  urutan     integer      NOT NULL DEFAULT 0,
  aktif      boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER faq_updated_at BEFORE UPDATE ON faq
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_faq_tampil ON faq (aktif, kategori, urutan, id);

-- ------------------------------------------------------------
--  Data awal
--
--  Seluruh jawaban di bawah ini hanya menerangkan cara kerja sistem dan
--  prosedurnya, yang memang sudah pasti. Angka dan tanggal milik sekolah
--  TIDAK dikarang di sini: jawabannya mengarahkan ke bagian yang datanya
--  diisi sekolah sendiri, atau ke panitia. Menuliskan besaran biaya atau
--  tanggal karangan pada halaman tanya jawab justru berbahaya, karena
--  orang tua memperlakukannya sebagai jawaban resmi.
-- ------------------------------------------------------------
INSERT INTO faq (pertanyaan, jawaban, kategori, sorot, urutan) VALUES
  ('Bagaimana cara mendaftar di sekolah ini?',
   'Seluruh pendaftaran dilakukan online lewat situs ini, tanpa perlu datang ke sekolah lebih dulu. Buka menu Daftar PPDB, isi formulir lima langkah, unggah dokumen yang diminta, lalu kirim. Anda akan langsung menerima nomor registrasi. Simpan nomor itu beserta tanggal lahir anak, karena keduanya adalah kunci untuk memantau hasil verifikasi di menu Cek Status.',
   'Pendaftaran', true, 1),

  ('Apakah pendaftaran bisa dilakukan lewat telepon seluler?',
   'Bisa. Seluruh halaman, termasuk formulir pendaftaran dan tes seleksi, dapat dibuka dari telepon. Untuk mengunggah dokumen, Anda dapat memotretnya langsung dengan kamera telepon selama hasilnya jelas terbaca.',
   'Pendaftaran', false, 2),

  ('Kapan pendaftaran dibuka dan ditutup?',
   'Tanggal pembukaan, penutupan, dan pengumuman tertera di bagian Jadwal pada halaman Info PPDB. Tanggal itu diisi panitia, jadi yang tampil di sana selalu yang terbaru. Bila pendaftaran sudah ditutup, tombol Daftar PPDB otomatis tidak dapat ditekan.',
   'Pendaftaran', true, 3),

  ('Dokumen apa saja yang harus diunggah?',
   'Daftar lengkapnya ada di bagian Dokumen yang Diminta pada halaman Info PPDB. Umumnya foto ukuran 3x4, ijazah atau surat keterangan lulus, Kartu Keluarga, akta kelahiran, dan rapor. Pendaftar jalur Prestasi wajib menambahkan sertifikat prestasinya.',
   'Berkas', true, 4),

  ('Berapa ukuran maksimal berkas yang dapat diunggah?',
   'Setiap berkas dibatasi 2 MB. Bila foto dari kamera telepon melebihi itu, kecilkan dulu resolusinya atau potret ulang dengan pengaturan kualitas yang lebih rendah. Format yang diterima JPG, PNG, dan PDF.',
   'Berkas', false, 5),

  ('Dokumen saya belum lengkap, apakah tetap bisa mendaftar?',
   'Dokumen yang ditandai wajib harus diunggah agar formulir dapat dikirim. Untuk dokumen yang belum tersedia, misalnya ijazah yang belum keluar dari SMP, hubungi panitia lewat halaman Kontak atau WhatsApp sebelum mengisi formulir, agar diberi arahan.',
   'Berkas', false, 6),

  ('Bagaimana saya tahu berkas saya sudah diverifikasi?',
   'Buka menu Cek Status, masukkan nomor registrasi beserta tanggal lahir anak. Di sana tertera status terkini beserta catatan panitia bila ada. Statusnya berubah begitu panitia selesai memeriksa, jadi tidak perlu menunggu pengumuman terpisah.',
   'Pendaftaran', true, 7),

  ('Apa arti setiap status pendaftaran?',
   'Menunggu Verifikasi berarti berkas Anda belum diperiksa panitia. Terverifikasi berarti berkas sudah lengkap dan benar. Diterima berarti Anda dinyatakan lulus seleksi. Cadangan berarti Anda masuk daftar tunggu bila ada yang mengundurkan diri. Ditolak berarti pendaftaran tidak dapat dilanjutkan, dan alasannya tertulis pada catatan panitia.',
   'Pengumuman', false, 8),

  ('Apakah nomor registrasi saya bisa dipakai orang lain untuk melihat data saya?',
   'Tidak. Nomor registrasi saja tidak cukup; tanggal lahir anak harus dimasukkan bersamaan. Aturan yang sama berlaku untuk mengunduh bukti pendaftaran, kartu peserta, dan mengerjakan tes seleksi.',
   'Umum', false, 9),

  ('Saya lupa nomor registrasi, bagaimana?',
   'Hubungi panitia lewat halaman Kontak atau tombol WhatsApp di pojok kanan bawah, sebutkan nama lengkap anak dan tanggal lahirnya. Panitia dapat mencarinya di panel. Jangan mendaftar ulang, karena pendaftaran dengan nama dan tanggal lahir yang sama akan ditolak sistem sebagai ganda.',
   'Pendaftaran', false, 10),

  ('Berapa biaya pendaftaran dan daftar ulang?',
   'Rinciannya ada di bagian Rincian Biaya pada halaman Info PPDB, lengkap dengan tahap pembayarannya dan totalnya. Pos yang besarannya belum ditetapkan sekolah ditandai di sana, bukan disembunyikan. Tidak ada biaya di luar daftar itu.',
   'Biaya', true, 11),

  ('Bagaimana cara membayarnya?',
   'Pembayaran belum dapat dilakukan lewat situs ini. Rincian biaya ditampilkan agar terbuka dan dapat diperiksa, sedangkan pembayarannya diatur sekolah, biasanya lewat transfer bank atau langsung di sekolah. Tanyakan cara dan nomor rekening resminya kepada panitia lewat halaman Kontak, dan jangan mentransfer ke rekening yang informasinya tidak berasal dari panitia.',
   'Biaya', true, 12),

  ('Ada pihak yang meminta pembayaran tambahan, apakah itu resmi?',
   'Tidak ada biaya di luar yang tertera pada Rincian Biaya. Bila ada pihak yang meminta pembayaran lain atas nama sekolah, jangan dibayar, dan laporkan kepada panitia lewat halaman Kontak beserta bukti percakapannya.',
   'Biaya', false, 13),

  ('Apakah ada keringanan biaya?',
   'Kebijakan keringanan ditetapkan sekolah, dan catatannya tertera di bawah Rincian Biaya bila ada. Untuk mengajukannya, hubungi panitia lewat halaman Kontak.',
   'Biaya', false, 14),

  ('Apa itu tes seleksi online, dan siapa yang harus mengikutinya?',
   'Tes seleksi dikerjakan langsung di peramban, tanpa memasang aplikasi apa pun. Yang dapat mengerjakannya adalah pendaftar yang berkasnya sudah diverifikasi panitia. Bila tes sedang dibuka, ajakan mengerjakannya muncul di halaman Cek Status Anda.',
   'Tes Seleksi', true, 15),

  ('Bagaimana bila jaringan saya terputus saat mengerjakan tes?',
   'Setiap jawaban langsung tersimpan begitu Anda memilihnya, jadi jawaban yang sudah masuk tidak hilang. Buka kembali halaman tes dan lanjutkan, selama waktunya belum habis.',
   'Tes Seleksi', true, 16),

  ('Apakah waktu tes bertambah bila halaman dimuat ulang?',
   'Tidak. Batas waktu dihitung server sejak sesi Anda dimulai, jadi memuat ulang halaman maupun berpindah perangkat tidak menambah waktu. Bila waktunya habis, sesi ditutup sendiri dan jawaban yang sudah terisi tetap dinilai.',
   'Tes Seleksi', false, 17),

  ('Bolehkah saya mengerjakan tes dua kali?',
   'Tidak. Setiap pendaftar mendapat satu sesi untuk satu jadwal tes. Membuka kembali halaman tes setelah selesai akan menampilkan nilai Anda, bukan memulai sesi baru.',
   'Tes Seleksi', false, 18),

  ('Apa itu kartu peserta, dan di mana saya mengunduhnya?',
   'Kartu peserta adalah berkas PDF berisi nomor peserta, identitas, ruang ujian, serta barcode dan kode QR untuk dipindai panitia saat presensi. Unduh dari halaman Cek Status setelah berkas Anda diverifikasi. Kartu itu wajib dibawa saat tes berlangsung.',
   'Tes Seleksi', false, 19),

  ('Kapan hasil seleksi diumumkan?',
   'Tanggal pengumuman tertera pada bagian Jadwal di halaman Info PPDB, dan juga pada halaman Cek Status Anda. Hasilnya dapat dilihat kapan saja lewat Cek Status tanpa menunggu pemberitahuan, karena statusnya berubah begitu panitia menetapkannya.',
   'Pengumuman', true, 20),

  ('Apakah nilai tes langsung menentukan saya diterima?',
   'Tidak sepenuhnya. Nilai tes adalah salah satu pertimbangan, bersama kelengkapan berkas, jalur pendaftaran, dan kuota peminatan yang dipilih. Keputusan akhir ditetapkan panitia dan tertera sebagai status pada halaman Cek Status.',
   'Pengumuman', false, 21),

  ('Saya dinyatakan Cadangan, apa yang harus saya lakukan?',
   'Status Cadangan berarti Anda masuk daftar tunggu. Bila ada pendaftar yang diterima mengundurkan diri, panitia menghubungi cadangan sesuai urutan. Pantau halaman Cek Status secara berkala, dan pastikan nomor telepon yang Anda cantumkan masih aktif.',
   'Pengumuman', false, 22),

  ('Bagaimana cara menghubungi panitia?',
   'Tersedia tiga jalur. Tombol WhatsApp di pojok kanan bawah setiap halaman untuk pertanyaan cepat, formulir pada halaman Kontak bila pertanyaannya panjang, serta telepon dan surel sekolah yang tertera di bagian atas dan bawah halaman.',
   'Umum', true, 23),

  ('Apakah data pribadi saya aman?',
   'Dokumen yang Anda unggah, seperti Kartu Keluarga dan akta kelahiran, hanya dapat dibuka petugas yang sudah masuk ke panel, dan tidak dapat diakses lewat tautan langsung. Data itu dipakai hanya untuk keperluan seleksi.',
   'Umum', false, 24)
ON CONFLICT DO NOTHING;

-- Pengaturan baru untuk pesan pengantar halaman tanya jawab.
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('faq_pengantar',
   'Belum menemukan jawabannya? Hubungi panitia lewat tombol WhatsApp di pojok kanan bawah, atau kirim pertanyaan dari halaman Kontak.',
   'Kalimat pengantar di halaman Tanya Jawab')
ON CONFLICT (nama_setting) DO NOTHING;
