-- ============================================================
--  Migrasi 037 - Tiga alumni pertama yang sudah bekerja
--  Data dari formulir yang diisi alumni sendiri (26 Oktober 2026). Hanya
--  nama, angkatan, jabatan, dan perusahaan; surel, telepon, alamat rumah, dan
--  tanggal lahir mereka SENGAJA tidak dimasukkan karena repositori ini publik.
--  Aman dijalankan ulang: baris yang namanya sudah ada dilewati.
-- ============================================================
INSERT INTO bkk_alumni (nama, angkatan, jabatan, perusahaan, urutan)
SELECT v.nama, v.angkatan, v.jabatan, v.perusahaan, v.urutan
FROM (VALUES
  ('Ahmad Rafi Zulfahrissalam', '2025', 'Karyawan',     'Star Pack',                   1),
  ('Tiara Mutiarani',           '',     'Pelayan Toko', 'PT Indomarco Prismatama',     2),
  ('Ilhan Manzis',              '',     'Helper',       'PT Midi Utama Indonesia Tbk', 3)
) AS v(nama, angkatan, jabatan, perusahaan, urutan)
WHERE NOT EXISTS (SELECT 1 FROM bkk_alumni a WHERE a.nama = v.nama);
