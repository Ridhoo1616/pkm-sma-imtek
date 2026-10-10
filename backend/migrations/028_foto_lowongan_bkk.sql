-- ============================================================
--  Migrasi 028 - Foto pada lowongan BKK
--  Satu gambar (poster atau suasana kerja) per lowongan, opsional.
-- ============================================================
ALTER TABLE bkk_lowongan ADD COLUMN IF NOT EXISTS foto varchar(255);
