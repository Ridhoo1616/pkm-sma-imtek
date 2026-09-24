-- ============================================================
--  Migrasi 014 — Notifikasi lewat email, dan pesan daftar ulang
--
--  Sampai sekarang notifikasi hanya lewat WhatsApp. Kolom `kanal` pada tabel
--  notifikasi memang sudah mengizinkan 'Email' sejak awal, tetapi tidak ada
--  satu baris kode pun yang membuat maupun mengirimnya — dan alamat email
--  pendaftar dikumpulkan tanpa pernah dipakai.
--
--  Migrasi ini menyiapkan naskahnya. Dua hal yang ditambahkan:
--
--  1. JENIS BARU `daftar_ulang`, yang terpicu saat administrator menetapkan
--     status pendaftar menjadi Diterima. Ia menggantikan pesan `kelulusan`
--     untuk keadaan itu — bukan menambahnya — supaya pendaftar yang diterima
--     menerima SATU pesan yang sekaligus mengabarkan hasilnya dan menerangkan
--     langkah daftar ulangnya, bukan dua pesan berurutan yang setengah-
--     setengah. Pesan `kelulusan` tetap dipakai untuk Ditolak dan Cadangan.
--
--  2. PERIHAL EMAIL per jenis. Badan pesannya sama dengan yang dikirim lewat
--     WhatsApp — naskahnya sudah berupa kalimat utuh yang pantas dibaca di
--     kedua kanal — tetapi email menuntut baris perihal, dan perihal yang
--     baik berbeda per jenis pesannya.
--
--  Awalan `wa_notif_` pada kunci badan pesan DIPERTAHANKAN meski sekarang
--  dipakai kedua kanal. Menggantinya berarti memindahkan naskah yang sudah
--  diisi sekolah, dan risiko kehilangan naskah itu lebih besar daripada
--  untungnya nama yang lebih tepat. Ketidakcocokan namanya dicatat di sini
--  dan di README.
--
--  Rincian daftar ulang — jadwal, tempat, syarat — disimpan sebagai
--  pengaturan tersendiri, bukan dituliskan di dalam naskah pesannya. Dengan
--  begitu sekolah dapat mengubah jadwalnya tanpa menyentuh susunan kalimat,
--  dan rincian yang sama dapat dipakai juga di halaman publik nanti.
--
--  Seluruhnya diisi penanda [kurung siku]. Notifikasi yang naskahnya masih
--  penanda TIDAK disusun sama sekali — pendaftar tidak boleh menerima pesan
--  berisi kalimat contoh.
-- ============================================================

INSERT INTO pengaturan (nama_setting, nilai, keterangan) VALUES
  ('wa_notif_daftar_ulang',
   '[Naskah pesan diterima dan daftar ulang. Penanda yang tersedia: {nama}, {no_registrasi}, {sekolah}, {tahun_ajaran}, {daftar_ulang_jadwal}, {daftar_ulang_tempat}, {daftar_ulang_syarat}]',
   'Naskah pesan saat pendaftar diterima, berisi kabar diterima beserta langkah daftar ulang. Dipakai WhatsApp dan email.'),

  ('email_subjek_verifikasi', '[Perihal email verifikasi berkas]',
   'Baris perihal email untuk pesan verifikasi berkas.'),
  ('email_subjek_ujian', '[Perihal email jadwal tes seleksi]',
   'Baris perihal email untuk pesan jadwal tes seleksi.'),
  ('email_subjek_kelulusan', '[Perihal email hasil seleksi]',
   'Baris perihal email untuk pesan hasil seleksi.'),
  ('email_subjek_daftar_ulang', '[Perihal email diterima dan daftar ulang]',
   'Baris perihal email untuk pesan diterima beserta langkah daftar ulang.'),

  ('daftar_ulang_jadwal', '[Jadwal daftar ulang, misalnya 1-10 Juli 2027, pukul 08.00-14.00]',
   'Jadwal daftar ulang bagi pendaftar yang diterima.'),
  ('daftar_ulang_tempat', '[Tempat daftar ulang, misalnya Ruang Tata Usaha SMA IMTEK]',
   'Tempat daftar ulang bagi pendaftar yang diterima.'),
  ('daftar_ulang_syarat', '[Syarat daftar ulang, satu baris satu poin]',
   'Berkas dan syarat yang dibawa saat daftar ulang, satu baris satu poin.')
ON CONFLICT (nama_setting) DO NOTHING;
