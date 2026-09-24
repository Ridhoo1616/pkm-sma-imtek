-- ============================================================
--  Migrasi 009 — Kelas yang diampu sebagai wali kelas
--
--  Halaman Tenaga Pendidik menampilkan deretan angka ringkas di atas daftar
--  gurunya, dan salah satunya jumlah wali kelas. Angka itu HARUS berasal dari
--  data, bukan ditebak dari tulisan pada kolom jabatan: mencocokkan kata
--  "wali kelas" di dalam jabatan akan meleset begitu sekolah menulisnya
--  dengan cara lain — "Walikelas", "Wali Kls X-1", atau menaruhnya di kolom
--  keterangan — dan angka yang salah pada halaman profil lebih buruk
--  daripada tidak ada angka.
--
--  Karena itu kolomnya sendiri. Isinya nama kelasnya, misalnya "X-1" atau
--  "XI IPA 2", bukan ya/tidak, sehingga satu isian sekaligus menjawab dua
--  hal: siapa yang menjadi wali kelas, dan kelas mana yang diampunya —
--  keduanya tampil pada kartu gurunya.
--
--  Kosong berarti yang bersangkutan bukan wali kelas. Itu keadaan yang wajar
--  bagi kepala sekolah, guru BK, dan seluruh tenaga kependidikan, jadi
--  kolomnya tidak wajib dan tidak punya nilai bawaan selain kosong.
-- ============================================================

ALTER TABLE tenaga_pendidik
  ADD COLUMN IF NOT EXISTS wali_kelas varchar(40) NOT NULL DEFAULT '';
