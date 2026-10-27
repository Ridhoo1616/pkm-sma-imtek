-- ============================================================
--  Migrasi 043 - Tujuan sekolah
--  Diambil dari lampiran SK Kepala SMAS IMTEK No. 002.01-SK/008-SMAS
--  IMTEK/VI/2026, bagian Tujuan Pendidikan. Ditampilkan di halaman Visi &
--  Misi, di bawah misi. Judul kelompok memakai "## " supaya tiap jangka
--  waktu menjadi bagian tersendiri.
--
--  Tujuan jangka menengah dan jangka panjang di dokumen sumber sama persis;
--  ditulis apa adanya sampai sekolah membetulkannya. Tabel SMART dan tabel
--  kegiatan per dimensi tidak dimasukkan: isinya rencana kerja internal.
--  Aman dijalankan ulang.
-- ============================================================
INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('tujuan', '[Tujuan sekolah]',
   'Tujuan sekolah di halaman Visi & Misi. Judul kelompok diawali "## ", lalu satu poin per baris')
ON CONFLICT (nama_setting) DO NOTHING;

UPDATE pengaturan
   SET nilai = E'Tujuan pendidikan SMA IMTEK ditetapkan berdasarkan visi dan misi: menyelenggarakan pendidikan yang berkualitas guna menghasilkan lulusan yang cerdas, terampil, dan berakhlak mulia sehingga dapat menjadi tumpuan masyarakat.\n\n'
               '## Jangka pendek (1 tahun)\n\n'
               'Membentuk insan bertakwa yang memegang teguh ajaran agama yang dianutnya melalui kegiatan intrakurikuler, kokurikuler, maupun ekstrakurikuler dengan pendekatan pembiasaan.\n'
               'Mengkreasikan pembelajaran yang berorientasi pada kebutuhan serta karakteristik peserta didik SMA IMTEK.\n'
               'Menghasilkan pembelajaran terencana yang sesuai dengan kemampuan sumber daya manusia dan sumber daya sekolah (sarana prasarana sekolah).\n'
               'Melaksanakan pembelajaran yang berpusat pada peserta didik (student centered).\n'
               'Mengintegrasikan Profil Pelajar Pancasila dalam seluruh aktivitas sekolah, baik intrakurikuler, kokurikuler, maupun ekstrakurikuler.\n'
               'Mengembangkan potensi akademik dan nonakademik peserta didik.\n'
               'Mengembangkan sarana dan prasarana pembelajaran berbasis teknologi informasi.\n\n'
               '## Jangka menengah (3 tahun)\n\n'
               'Membentuk insan bertakwa yang memegang teguh ajaran agama yang dianutnya dengan merefleksikannya dalam kehidupan sehari-hari.\n'
               'Mewujudkan pendidikan kecakapan hidup yang terencana, terarah, dan berkelanjutan.\n'
               'Mewujudkan sekolah sebagai tempat pengembangan bakat dan minat.\n'
               'Memenuhi kebutuhan sarana dan prasarana pendidikan sesuai dengan perkembangan teknologi.\n\n'
               '## Jangka panjang (5 tahun)\n\n'
               'Membentuk insan bertakwa yang memegang teguh ajaran agama yang dianutnya dengan merefleksikannya dalam kehidupan sehari-hari.\n'
               'Mewujudkan pendidikan kecakapan hidup yang terencana, terarah, dan berkelanjutan.\n'
               'Mewujudkan sekolah sebagai tempat pengembangan bakat dan minat.\n'
               'Memenuhi kebutuhan sarana dan prasarana pendidikan sesuai dengan perkembangan teknologi.'
 WHERE nama_setting = 'tujuan' AND nilai LIKE '[%';
