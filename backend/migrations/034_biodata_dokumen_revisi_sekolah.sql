-- ============================================================
--  Migrasi 034 - Revisi biodata dan dokumen PPDB dari sekolah (Oktober 2026)
--  Biodata: ukuran baju, serta status ayah/ibu (Ada, almarhum(ah), atau
--  tidak ada) supaya data yatim, piatu, dan yatim piatu tercatat jelas.
--  Dokumen: foto 2x3, SKL, dan KTP orang tua ditambahkan. Kolom raport dan
--  prestasi TETAP ada agar berkas pendaftar lama tidak hilang; formulir
--  baru tidak lagi memintanya.
-- ============================================================
ALTER TABLE pendaftar
  ADD COLUMN IF NOT EXISTS ukuran_baju    varchar(5)   NULL,
  ADD COLUMN IF NOT EXISTS status_ayah    varchar(12)  NULL,
  ADD COLUMN IF NOT EXISTS status_ibu     varchar(12)  NULL,
  ADD COLUMN IF NOT EXISTS file_foto_2x3  varchar(160) NULL,
  ADD COLUMN IF NOT EXISTS file_skl       varchar(160) NULL,
  ADD COLUMN IF NOT EXISTS file_ktp_ortu  varchar(160) NULL;

-- Pendaftar lama tidak pernah ditanya statusnya. Yang namanya terisi dianggap
-- "Ada" supaya ekspor tidak menampilkan kolom kosong; panitia dapat
-- membetulkannya bila ada yang sebenarnya almarhum.
UPDATE pendaftar SET status_ayah = 'Ada' WHERE status_ayah IS NULL AND nama_ayah <> '';
UPDATE pendaftar SET status_ibu  = 'Ada' WHERE status_ibu  IS NULL AND nama_ibu  <> '';
