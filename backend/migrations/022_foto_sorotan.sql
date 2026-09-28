-- ============================================================
--  Migrasi 022 - Foto sorotan beranda yang berganti-ganti
--
--  Sorotan beranda semula memakai satu foto saja (foto_depan). Atas
--  permintaan user, latarnya kini dapat berganti-ganti, jadi ditambah tiga
--  slot foto lagi. Pengaturan biasa, bukan tabel baru: jumlahnya kecil dan
--  tetap, dan unggahannya memakai jalur gambar pengaturan yang sudah ada.
--
--  Nilainya kosong. Slot kosong dilewati beranda; bila hanya foto_depan
--  yang terisi, sorotan tetap satu foto tanpa pergantian.
-- ============================================================

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('foto_depan_2', '', 'Foto sorotan beranda kedua. Berganti dengan foto halaman depan.'),
  ('foto_depan_3', '', 'Foto sorotan beranda ketiga. Berganti dengan foto halaman depan.'),
  ('foto_depan_4', '', 'Foto sorotan beranda keempat. Berganti dengan foto halaman depan.')
ON CONFLICT (nama_setting) DO NOTHING;
