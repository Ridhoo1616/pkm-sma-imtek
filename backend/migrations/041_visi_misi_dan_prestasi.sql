-- ============================================================
--  Migrasi 041 - Visi, misi, dan prestasi dari sekolah (27 Oktober 2026)
--   - Visi dan misi diambil dari SK Kepala SMAS IMTEK
--     No. 002.01-SK/008-SMAS IMTEK/VI/2026 (berlaku 1 Juli 2026). Hanya
--     menimpa nilai yang masih penanda [kurung siku], supaya rumusan yang
--     sudah diisi lewat panel tidak tertimpa.
--   - Prestasi siswa dan lulusan yang diterima di perguruan tinggi, dari
--     pesan sekolah. Ditulis sebagai berita berkategori Prestasi, sebab
--     halaman Prestasi Siswa membaca berita itu. Satu berita per lomba;
--     tanpa foto dulu, fotonya menyusul dari sekolah. Aman dijalankan ulang.
-- ============================================================
UPDATE pengaturan
   SET nilai = 'Terwujudnya Lulusan sebagai Tumpuan Masyarakat, Cerdas dalam Berpikir, Terampil dalam Bertindak dan Berakhlakul Karimah.'
 WHERE nama_setting = 'visi' AND nilai LIKE '[%';

UPDATE pengaturan
   SET nilai = E'Membentuk murid yang mempunyai jiwa kepemimpinan, disiplin, peduli terhadap sesama dan lingkungan serta taat terhadap peraturan.\n'
               'Mewujudkan lingkungan belajar sebagai tempat pembiasaan positif melalui sinergi antar warga sekolah, masyarakat, orang tua/wali murid dan juga pemerintahan setempat.\n'
               'Membangun karakter murid yang terbuka terhadap perubahan, kritis, berjiwa pembelajar, percaya diri dan pantang menyerah.\n'
               'Mengikutsertakan murid dalam berbagai kompetisi baik akademik maupun non akademik dalam berbagai tingkatan.\n'
               'Menumbuhkan kemampuan interaksi dan komunikasi, kerja sama dan gotong royong, solidaritas dan toleransi, serta memiliki jiwa wirausaha.\n'
               'Memaksimalkan kegiatan ekstrakurikuler sebagai bagian dari pengembangan potensi bakat dan minat.\n'
               'Membangun insan akademik yang berjiwa wirausaha agar dapat hidup mandiri dan mampu menyesuaikan diri dalam perkembangan global.\n'
               'Membentuk murid yang memiliki sopan santun, jujur, taat agama, dan melindungi martabat diri, keluarga, sekolah serta masyarakatnya.\n'
               'Mewujudkan suasana sekolah yang kondusif untuk tumbuh dan berkembangnya keimanan dan ketakwaan bagi seluruh warga sekolah.\n'
               'Mewujudkan sekolah sebagai rumah kedua bagi murid menuju sekolah berkarakter.\n'
               'Mewujudkan pembelajaran bermakna yang mengutamakan karakteristik kebutuhan peserta didik, pendidik, tenaga kependidikan, keluarga dan masyarakat.\n'
               'Mewujudkan budaya sekolah yang baik sebagai tempat tumbuh kembangnya budi pekerti serta pembentukan karakter.\n'
               'Mewujudkan sistem pembinaan tenaga pendidik dan tenaga kependidikan yang terencana, terarah dan berkesinambungan.'
 WHERE nama_setting = 'misi' AND nilai LIKE '[%';

INSERT INTO berita (judul, slug, kategori, ringkasan, isi, publish)
SELECT v.judul, v.slug, 'Prestasi', v.ringkasan, v.isi, true
FROM (VALUES
  ('Sembilan Lulusan SMA IMTEK Diterima di Perguruan Tinggi',
   'sembilan-lulusan-sma-imtek-diterima-di-perguruan-tinggi',
   'Lima lewat SNBP, satu lewat jalur Mandiri ITB, dan tiga dengan beasiswa, di antaranya Universitas Indonesia dan ITB.',
   E'Sembilan lulusan SMA IMTEK dari kelas 12.1 dan 12.2 diterima di perguruan tinggi negeri maupun swasta.\n\n'
   'Naila Amalia Zulfa (12.2) - SNBP, Universitas Indonesia, Bahasa dan Kebudayaan Korea\n'
   'Rafif Muhamad Oktavia (12.2) - Mandiri, ITB, Teknik Pertambangan dan Perminyakan\n'
   'Astila Permata (12.1) - SNBP, UNTIRTA, Pendidikan Matematika\n'
   'Alifah Khairunisa (12.1) - SNBP, UIN Jakarta, Pendidikan Biologi\n'
   'Reisha Assyifa (12.2) - SNBP, UIN Serang, Informatika\n'
   'Ceava Maura Citra (12.2) - Beasiswa Jalur Rapor, Pradita University, Culinary Arts\n'
   'Tiara Noviana (12.2) - Beasiswa 100%, BSI University, Manajemen\n'
   'Mutiara Salwa Mufidah (12.1) - Beasiswa 100%, BSI University, Informatika\n'
   'Hanan Dzuan Zaki (12.1) - Beasiswa 75%, BSI University, Informatika'),

  ('Juara Umum 2 Kejuaraan Pencak Silat Students Sport 2026 Tingkat Nasional',
   'juara-umum-2-pencak-silat-students-sport-2026',
   'Tim pencak silat SMA IMTEK meraih Juara Umum 2 dan empat gelar Juara 1 kategori remaja putri.',
   E'Tim pencak silat SMA IMTEK meraih Juara Umum 2 pada Kejuaraan Pencak Silat Students Sport 2026 tingkat nasional.\n\n'
   'Juara 1 Tanding Remaja Putri Kelas B\n'
   'Juara 1 Tanding Remaja Putri Kelas C\n'
   'Juara 1 Tanding Remaja Putri Kelas Open\n'
   'Juara 1 Tunggal Full Remaja Putri'),

  ('Juara 2 Pencak Silat Remaja Tingkat Nasional',
   'juara-2-pencak-silat-remaja-tingkat-nasional',
   'Siswa SMA IMTEK meraih Juara 2 pencak silat remaja tingkat nasional.',
   'Siswa SMA IMTEK meraih Juara 2 pencak silat remaja tingkat nasional.'),

  ('Juara 2 FLS3N Tingkat Kabupaten',
   'juara-2-fls3n-tingkat-kabupaten',
   'SMA IMTEK meraih Juara 2 Festival Lomba Seni dan Sastra Siswa Nasional (FLS3N) tingkat kabupaten.',
   'SMA IMTEK meraih Juara 2 Festival Lomba Seni dan Sastra Siswa Nasional (FLS3N) tingkat kabupaten.'),

  ('Juara 1 dan Juara 2 Fashion Show CSR Sinar Mas Land',
   'juara-1-dan-2-fashion-show-csr-sinar-mas-land',
   'Siswa SMA IMTEK meraih Juara 1 dan Juara 2 lomba fashion show CSR Sinar Mas Land.',
   'Siswa SMA IMTEK meraih Juara 1 dan Juara 2 lomba fashion show yang diadakan CSR Sinar Mas Land.'),

  ('Juara 2 Paskibra LKBB Sadasna',
   'juara-2-paskibra-lkbb-sadasna',
   'Tim Paskibra SMA IMTEK meraih Juara 2 LKBB Sadasna.',
   'Tim Paskibra SMA IMTEK meraih Juara 2 Lomba Keterampilan Baris-Berbaris (LKBB) Sadasna.'),

  ('Juara 2 Tari Saman Ratoeh Jaroe Eight Six Club SMA 86 Jakarta',
   'juara-2-tari-saman-ratoeh-jaroe-sma-86-jakarta',
   'Tim tari saman SMA IMTEK meraih Juara 2 lomba Ratoeh Jaroe Eight Six Club SMA 86 Jakarta.',
   'Tim tari saman SMA IMTEK meraih Juara 2 lomba Ratoeh Jaroe pada Eight Six Club SMA 86 Jakarta.'),

  ('Empat Gelar Lomba Kepalangmerahan Tingkat Kecamatan',
   'empat-gelar-lomba-kepalangmerahan-tingkat-kecamatan',
   'PMR SMA IMTEK membawa pulang Juara 2 dan tiga gelar Juara Harapan pada lomba kepalangmerahan tingkat kecamatan.',
   E'PMR SMA IMTEK meraih empat gelar pada lomba kepalangmerahan tingkat kecamatan.\n\n'
   'Juara 2 Lomba Kepalangmerahan\n'
   'Juara Harapan 2 Pengetahuan Kepalangmerahan\n'
   'Juara Harapan 1 Lomba Pertolongan Pertama\n'
   'Juara Harapan 2 Lomba Pertolongan Pertama')
) AS v(judul, slug, ringkasan, isi)
WHERE NOT EXISTS (SELECT 1 FROM berita b WHERE b.slug = v.slug);
