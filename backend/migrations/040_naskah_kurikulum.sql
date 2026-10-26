-- ============================================================
--  Migrasi 040 - Naskah halaman Kurikulum dirapikan
--  Menggantikan kalimat satu baris dari migrasi 038. Hanya menyebut hal yang
--  sudah dinyatakan sekolah (memakai Kurikulum Merdeka) dan ketetapan
--  pemerintah (Kurikulum Merdeka sebagai kurikulum nasional, Permendikbudristek
--  No. 12 Tahun 2024); tidak ada klaim tentang kegiatan sekolah. Hanya menimpa
--  naskah yang masih berupa kalimat dari 038, jadi isian panitia aman.
-- ============================================================
UPDATE halaman
   SET ringkasan = 'SMAS IMTEK menerapkan Kurikulum Merdeka, kurikulum nasional untuk pendidikan menengah.',
       isi = E'## Kurikulum yang dipakai\n\nSMAS IMTEK menerapkan Kurikulum Merdeka, yang kini ditetapkan pemerintah sebagai Kurikulum Nasional untuk jenjang pendidikan menengah.\n\nKurikulum ini memberi ruang bagi pembelajaran yang lebih fleksibel dan berpusat pada peserta didik, dengan penguatan karakter dan kompetensi yang diperlukan untuk melanjutkan pendidikan maupun memasuki dunia kerja.'
 WHERE slug = 'kurikulum'
   AND isi = E'## Kurikulum yang dipakai\n\nSMAS IMTEK memakai Kurikulum Merdeka, yang sekarang disebut Kurikulum Nasional.';
