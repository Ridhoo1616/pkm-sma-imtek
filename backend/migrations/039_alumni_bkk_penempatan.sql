-- ============================================================
--  Migrasi 039 - Alumni dari daftar Penempatan di Aplikasi BKK (Kemnaker)
--  Tangkapan layar 26 Oktober 2026, halaman 1 (15 dari 18 baris; tiga baris
--  di halaman 2 belum diterima). Hanya nama, jabatan, dan perusahaan. Jenis
--  kelamin dan alamat perusahaan sengaja tidak dimasukkan; angkatan tidak
--  tercantum di sumbernya. Ilhan Manzis dan Tiara Mutiarani sudah ada dari
--  migrasi 037. Aman dijalankan ulang.
-- ============================================================
INSERT INTO bkk_alumni (nama, angkatan, jabatan, perusahaan, urutan)
SELECT v.nama, '', v.jabatan, v.perusahaan, v.urutan
FROM (VALUES
  ('Nova Ameliya Putri',        'Administrator Data',             'MGBB',                                      4),
  ('Rea Rahayu',                'Administrator Data',             'Kasetto',                                   5),
  ('Shyfa Andrea Fauziah',      'Karyawan',                       'Ribsgold',                                  6),
  ('Muhamad Ripaldo',           'Plating',                        'Tsuyura Carry',                             7),
  ('Saskia Amanda',             'SPG',                            'Selfietime',                                8),
  ('Muhamad Ilham Saprudin',    'Penjaga Keamanan',               'PT Mida Karya Abadi',                       9),
  ('Muhamad Alpiansah',         'Penjaga Keamanan',               'PT Mida Karya Abadi',                      10),
  ('Sintia Faradila',           'Chief Executive Officer/Direktur Eksekutif', 'PT Sinergi Integra Services',   11),
  ('Sela Amelia',               'Kasir Toko',                     'Della Collection',                         12),
  ('Fauzan Arif Al Ansori',     'Leader',                         'PT Kresna Aman Nusantara',                 13),
  ('Jagat Satria Pramudia',     'Kitchen (Helper)',               'KDRT - Kopitiam Djadoel Pak Erte (Maggiore)', 14),
  ('Muhamad Aldiyansyah',       'Helper',                         'Inti Artha Buana',                         15),
  ('Fajar Ardilah',             'Staff Karyawan',                 'PT Shipper x PT MGS',                      16)
) AS v(nama, jabatan, perusahaan, urutan)
WHERE NOT EXISTS (SELECT 1 FROM bkk_alumni a WHERE a.nama = v.nama);
