-- ============================================================
--  Migrasi 023 - Surat keluar bernomor otomatis
--
--  Atas permintaan user: panitia menulis surat (surat keluar umum maupun
--  surat untuk pendaftar), tanggal suratnya diisi bebas, dan nomor urutnya
--  dibagikan sistem. Yang diatur sekolah sendiri adalah FORMAT nomornya.
--
--  jenis_surat
--    Setiap jenis punya urutan nomornya sendiri, format nomornya sendiri,
--    dan aturan kapan urutannya kembali ke 1 (atur_ulang): setiap tahun,
--    setiap bulan, atau tidak pernah. Semuanya pilihan sekolah.
--
--  surat
--    Satu baris satu surat yang sudah diberi nomor. `periode` menyimpan
--    rentang tempat nomor urutnya berlaku ('2026', '2026-09', atau '-'),
--    dihitung dari tanggal surat menurut atur_ulang jenisnya.
--    UNIQUE (jenis_id, periode, nomor_urut) adalah penjaga terakhir: dua
--    panitia yang menekan simpan bersamaan tidak akan pernah mendapat nomor
--    yang sama, sekalipun kuncinya di kode terlewat.
--
--  Tidak ada jenis surat bawaan. Nama, kode, format nomor, dan naskah surat
--  adalah milik sekolah, jadi tidak dikarang di sini.
-- ============================================================

CREATE TABLE IF NOT EXISTS jenis_surat (
  id                      SERIAL PRIMARY KEY,
  nama                    TEXT NOT NULL,
  kode                    TEXT NOT NULL DEFAULT '',
  format_nomor            TEXT NOT NULL,
  atur_ulang              TEXT NOT NULL DEFAULT 'tahunan'
                          CHECK (atur_ulang IN ('tahunan', 'bulanan', 'tidak')),
  untuk_pendaftar         BOOLEAN NOT NULL DEFAULT FALSE,
  tampil_di_cek_status    BOOLEAN NOT NULL DEFAULT FALSE,
  perihal_bawaan          TEXT NOT NULL DEFAULT '',
  tujuan_bawaan           TEXT NOT NULL DEFAULT '',
  isi_bawaan              TEXT NOT NULL DEFAULT '',
  penanda_tangan_nama     TEXT NOT NULL DEFAULT '',
  penanda_tangan_jabatan  TEXT NOT NULL DEFAULT '',
  penanda_tangan_nip      TEXT NOT NULL DEFAULT '',
  aktif                   BOOLEAN NOT NULL DEFAULT TRUE,
  urutan                  INTEGER NOT NULL DEFAULT 0,
  dibuat                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS surat (
  id             SERIAL PRIMARY KEY,
  jenis_id       INTEGER NOT NULL REFERENCES jenis_surat(id) ON DELETE RESTRICT,
  periode        TEXT NOT NULL,
  nomor_urut     INTEGER NOT NULL CHECK (nomor_urut > 0),
  nomor_surat    TEXT NOT NULL,
  tanggal_surat  DATE NOT NULL,
  perihal        TEXT NOT NULL DEFAULT '',
  tujuan         TEXT NOT NULL DEFAULT '',
  lampiran       TEXT NOT NULL DEFAULT '',
  isi            TEXT NOT NULL DEFAULT '',
  pendaftar_id   INTEGER REFERENCES pendaftar(id) ON DELETE SET NULL,
  dibatalkan     BOOLEAN NOT NULL DEFAULT FALSE,
  alasan_batal   TEXT NOT NULL DEFAULT '',
  dibuat_oleh    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  dibuat         TIMESTAMPTZ NOT NULL DEFAULT now(),
  diubah         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jenis_id, periode, nomor_urut)
);

CREATE INDEX IF NOT EXISTS idx_surat_pendaftar ON surat (pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_surat_jenis_tanggal ON surat (jenis_id, tanggal_surat DESC);
