-- ============================================================
--  Migrasi 006 — Gambar untuk halaman Visi & Misi
--
--  Halaman Visi & Misi sudah memuat tiga kartu berikon yang menunjuk siapa
--  yang menjalankan rumusannya. Sekolah tetap boleh memasang satu gambar
--  yang lebih besar di sana — ilustrasi guru dan siswa, atau foto kegiatan —
--  dan pengaturan ini tempat nama berkasnya dicatat.
--
--  Nilainya dikosongkan, bukan diberi penanda [kurung siku], karena isinya
--  nama BERKAS: penanda kurung siku hanya dipakai untuk naskah yang ditunggu
--  dari sekolah. Selama kosong, halamannya menampilkan kerangka berukuran
--  sama beserta keterangan cara mengunggahnya, jadi tata letaknya sudah
--  final sebelum gambarnya ada.
--
--  Berkasnya diunggah lewat menu Pengaturan di panel admin, bukan diketik
--  namanya. Yang diterima hanya jpg dan png, dicocokkan sampai ke byte
--  penanda berkasnya di unggah.go. SVG sengaja TIDAK diterima: SVG adalah
--  XML yang boleh memuat <script>, jadi menerimanya berarti siapa pun yang
--  dapat masuk panel bisa menitipkan kode yang berjalan di peramban
--  pengunjung. Gambar vektor yang memang dipakai situs ini ditanam langsung
--  di dalam kode, seperti ikon-ikon pada komponen/Ikon.tsx.
-- ============================================================

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('visi_gambar', '',
   'Nama berkas gambar pada halaman Visi & Misi, diunggah lewat menu Pengaturan. Dikosongkan berarti halamannya menampilkan kerangka, bukan gambar.')
ON CONFLICT (nama_setting) DO NOTHING;
