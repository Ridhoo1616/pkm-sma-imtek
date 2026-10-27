-- ============================================================
--  Migrasi 042 - Sejarah, mata pelajaran, jam sekolah, seragam, dan
--  ekstrakurikuler dari bahan MPLS 2026-2027 (27 Oktober 2026)
--   - Sejarah dan yayasan mengisi penanda. Tahun berdiri dan luas bangunan
--     diganti mengikuti bahan MPLS (5 Oktober 2005, 4.937 m2) atas
--     keputusan user; hanya bila nilainya masih angka lama.
--   - Struktur mata pelajaran ditambahkan ke halaman Kurikulum, yang sejak
--     awal disiapkan untuk bagian itu (lihat templatHalaman.ts). JP Pendidikan
--     Agama Islam di bahan sumber tidak berjumlah (81 + 57 = 108), jadi yang
--     ditulis hanya totalnya.
--   - Jam sekolah dan seragam masuk keterangan halaman Jadwal Pelajaran.
--   - Ekstrakurikuler dari slide Pilihan Ekskul, ditambah Paskibra yang
--     tercantum sebagai ekskul binaan guru. Pembina diisi hanya bila
--     tercantum di slide tenaga pendidik.
--  Aman dijalankan ulang.
-- ============================================================
UPDATE pengaturan
   SET nilai = E'SMA IMTEK didirikan pada 5 Oktober 2005 di bawah naungan Yayasan Daarul Muttaqien.\n\n'
               'Sekolah berdiri di atas tanah seluas 17.149 m² dengan luas bangunan 4.937 m², di lingkungan bangunan yang sudah beroperasi sejak tahun 1987.'
 WHERE nama_setting = 'sejarah' AND nilai LIKE '[%';

UPDATE pengaturan SET nilai = 'Yayasan Daarul Muttaqien'
 WHERE nama_setting = 'yayasan' AND nilai LIKE '[%';

UPDATE pengaturan SET nilai = '2005'
 WHERE nama_setting = 'tahun_berdiri' AND nilai = '2007';

UPDATE pengaturan SET nilai = '4.937 m²'
 WHERE nama_setting = 'luas_bangunan' AND nilai = '6.102 m²';

UPDATE pengaturan
   SET nilai = E'## Jam sekolah\n\n'
               'Senin sampai Kamis: 07.00 - 14.50\nJumat: 07.00 - 11.00\n\n'
               '## Seragam\n\n'
               'Senin: putih dan abu-abu dengan rompi\n'
               'Selasa: batik sekolah dan abu-abu\n'
               'Rabu: Pramuka\n'
               'Kamis: batik nasional dan hitam\n'
               'Jumat: putih dan hitam'
 WHERE nama_setting = 'jadwal_keterangan' AND nilai LIKE '[%';

UPDATE halaman
   SET isi = isi || E'\n\n## Struktur mata pelajaran\n\n'
             'Mata pelajaran tahun pelajaran 2026/2027 beserta jumlah jam pelajaran (JP). Sebagian mata pelajaran memuat JP kokurikuler di samping JP intrakurikuler.\n\n'
             'Pendidikan Agama Islam: 108 JP\n'
             'Pendidikan Pancasila: 72 JP\n'
             'Bahasa Indonesia: 144 JP (108 intrakurikuler, 36 kokurikuler)\n'
             'Matematika: 144 JP (108 intrakurikuler, 36 kokurikuler)\n'
             'Fisika: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Kimia: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Biologi: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Sosiologi: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Ekonomi: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Sejarah: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Geografi: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Bahasa Inggris: 108 JP\n'
             'PJOK: 108 JP (81 intrakurikuler, 27 kokurikuler)\n'
             'Informatika: 72 JP\n'
             'Seni Budaya dan Prakarya: 72 JP\n'
             'BTQ: 72 JP\n'
             'Bahasa Korea: 72 JP'
 WHERE slug = 'kurikulum' AND isi NOT LIKE '%## Struktur mata pelajaran%';

UPDATE kegiatan_siswa SET deskripsi = 'Ekstrakurikuler wajib bagi seluruh siswa.'
 WHERE nama = 'Pramuka' AND deskripsi = '';

INSERT INTO kegiatan_siswa (nama, jenis, pembina, urutan)
SELECT v.nama, 'Ekstrakurikuler', v.pembina, v.urutan
FROM (VALUES
  ('Futsal',          'Haikal Kamil',             30),
  ('Voli',            'Haikal Kamil',             40),
  ('Basket',          '',                         50),
  ('Badminton',       'M. Najib Muhsin, S.Pd',    60),
  ('Softball',        '',                         70),
  ('Taekwondo',       '',                         80),
  ('Pencak Silat',    '',                         90),
  ('Marawis',         '',                        100),
  ('Pencinta Alam',   '',                        110),
  ('Tari Saman',      'Ajeng Zultriani P., S.Pd', 120),
  ('Paskibra',        'Ahmad Alfa R.',           130)
) AS v(nama, pembina, urutan)
WHERE NOT EXISTS (SELECT 1 FROM kegiatan_siswa k WHERE k.nama = v.nama);
