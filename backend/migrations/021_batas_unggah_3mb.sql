-- ============================================================
--  Migrasi 021 - Batas unggahan dinaikkan dari 2 MB menjadi 3 MB
--
--  Batasnya sendiri berada di UPLOAD_MAX_BYTES, bukan di basis data. Yang
--  perlu diurus di sini naskah bawaan yang menyebut angkanya, dan naskah
--  itu sudah telanjur tersimpan sebagai baris: satu butir Tanya Jawab dan
--  satu berita panduan.
--
--  Dibiarkan begitu, kotak "Tanya cepat" akan menjawab "2 MB" dengan yakin
--  kepada orang tua yang bertanya, padahal backend sudah menerima 3 MB.
--  Keterangan yang salah pada ukuran berkas bukan perkara sepele: yang
--  membacanya justru orang yang fotonya kebesaran dan sedang mencari tahu
--  harus dikecilkan sampai berapa.
--
--  PENGGANTIANNYA BERSYARAT. Naskah ini milik sekolah dan boleh mereka
--  sunting; bila sudah disunting, tulisan mereka yang menang. Karena itu
--  setiap UPDATE hanya mengenai baris yang isinya MASIH PERSIS naskah
--  bawaan — dicocokkan dengan potongan kalimat utuhnya, bukan dengan
--  sekadar adanya angka "2 MB" di dalamnya.
-- ============================================================

UPDATE faq
   SET jawaban = replace(jawaban, 'Setiap berkas dibatasi 2 MB.',
                                  'Setiap berkas dibatasi 3 MB.'),
       updated_at = now()
 WHERE jawaban LIKE 'Setiap berkas dibatasi 2 MB. Bila foto dari kamera telepon%';

UPDATE berita
   SET isi = replace(isi, 'Setiap berkas dibatasi 2 MB.',
                          'Setiap berkas dibatasi 3 MB.')
 WHERE isi LIKE '%Akta kelahiran, rapor, dan sertifikat prestasi bersifat opsional. Setiap berkas dibatasi 2 MB.%';
